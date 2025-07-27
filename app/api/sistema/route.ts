import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string
  ultimoReinicio: string
  tickets: TicketInfo[]
}

// Estado inicial
const estadoInicial: EstadoSistema = {
  numeroActual: 1,
  ultimoNumero: 0,
  totalAtendidos: 0,
  numerosLlamados: 0,
  fechaInicio: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
  ultimoReinicio: new Date().toISOString(),
  tickets: [],
}

// Claves de Redis
const ESTADO_KEY = "sistema:estado"
const LOCK_KEY = "sistema:lock"
const BACKUP_PREFIX = "sistema:backup:"

// Función para adquirir lock usando Redis
async function adquirirLock(): Promise<boolean> {
  try {
    console.log("🔒 Intentando adquirir lock...")

    // Intentar establecer lock con TTL de 30 segundos
    const lockAdquirido = await kv.set(LOCK_KEY, Date.now(), {
      nx: true, // Solo establecer si no existe
      ex: 30, // Expira en 30 segundos
    })

    if (lockAdquirido === "OK") {
      console.log("✅ Lock adquirido exitosamente")
      return true
    }

    // Si no se pudo adquirir, esperar un poco y reintentar
    console.log("⏳ Lock ocupado, esperando...")
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Segundo intento
    const segundoIntento = await kv.set(LOCK_KEY, Date.now(), {
      nx: true,
      ex: 30,
    })

    if (segundoIntento === "OK") {
      console.log("✅ Lock adquirido en segundo intento")
      return true
    }

    console.log("❌ No se pudo adquirir lock después de reintentos")
    return false
  } catch (error) {
    console.error("❌ Error adquiriendo lock:", error)
    return false
  }
}

// Función para liberar lock
async function liberarLock() {
  try {
    await kv.del(LOCK_KEY)
    console.log("🔓 Lock liberado")
  } catch (error) {
    console.error("❌ Error liberando lock:", error)
  }
}

// Función para leer datos de Redis
async function leerDatos(): Promise<EstadoSistema> {
  try {
    console.log("📖 Leyendo datos de Redis...")

    const data = await kv.get<EstadoSistema>(ESTADO_KEY)

    if (data) {
      console.log("✅ Estado encontrado en Redis:", {
        numeroActual: data.numeroActual,
        ultimoNumero: data.ultimoNumero,
        totalAtendidos: data.totalAtendidos,
        numerosLlamados: data.numerosLlamados,
        totalTickets: data.tickets?.length || 0,
        fechaInicio: data.fechaInicio,
      })

      // Validar estructura de datos
      if (!data.tickets) data.tickets = []
      if (!data.ultimoReinicio) data.ultimoReinicio = new Date().toISOString()
      if (typeof data.numeroActual !== "number") data.numeroActual = 1
      if (typeof data.ultimoNumero !== "number") data.ultimoNumero = 0
      if (typeof data.totalAtendidos !== "number") data.totalAtendidos = 0
      if (typeof data.numerosLlamados !== "number") data.numerosLlamados = 0

      // Verificar integridad de los datos
      const ticketsCount = data.tickets.length
      if (ticketsCount !== data.totalAtendidos) {
        console.log("⚠️ Inconsistencia detectada: tickets.length !== totalAtendidos")
        data.totalAtendidos = ticketsCount
      }

      return data
    } else {
      console.log("⚠️ No se encontró estado en Redis, creando estado inicial")
      const estadoNuevo = { ...estadoInicial }
      await escribirDatos(estadoNuevo)
      return estadoNuevo
    }
  } catch (error) {
    console.error("❌ Error al leer datos de Redis:", error)
    return { ...estadoInicial }
  }
}

// Función para escribir datos a Redis
async function escribirDatos(estado: EstadoSistema): Promise<void> {
  try {
    console.log("💾 Escribiendo datos a Redis:", {
      numeroActual: estado.numeroActual,
      ultimoNumero: estado.ultimoNumero,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets?.length || 0,
    })

    // Verificar integridad antes de guardar
    if (estado.tickets.length !== estado.totalAtendidos) {
      console.log("⚠️ Corrigiendo inconsistencia antes de guardar")
      estado.totalAtendidos = estado.tickets.length
    }

    // Guardar en Redis con TTL de 7 días
    await kv.set(ESTADO_KEY, estado, { ex: 7 * 24 * 60 * 60 })

    // Verificar que se escribió correctamente
    const verificacion = await kv.get<EstadoSistema>(ESTADO_KEY)

    if (!verificacion || verificacion.numeroActual !== estado.numeroActual) {
      throw new Error("Error de verificación: el estado no se guardó correctamente en Redis")
    }

    console.log("✅ Datos guardados y verificados exitosamente en Redis")
  } catch (error) {
    console.error("❌ Error al escribir datos a Redis:", error)
    throw error
  }
}

// Función para verificar si debe reiniciarse
function debeReiniciarse(estado: EstadoSistema): boolean {
  try {
    const ahora = new Date()
    const fechaActualArgentina = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
    const fechaHoyString = fechaActualArgentina.toISOString().split("T")[0]
    const fechaInicioString = estado.fechaInicio

    console.log("🕐 Verificando reinicio:", {
      fechaHoy: fechaHoyString,
      fechaInicio: fechaInicioString,
      esIgual: fechaHoyString === fechaInicioString,
    })

    const esDiaDiferente = fechaHoyString !== fechaInicioString

    if (esDiaDiferente) {
      console.log(`🔄 Reinicio automático necesario: ${fechaHoyString} vs ${fechaInicioString}`)
      return true
    }

    return false
  } catch (error) {
    console.error("❌ Error verificando reinicio:", error)
    return false
  }
}

// Función para crear backup diario en Redis
async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    const fecha = estado.fechaInicio
    const backupKey = `${BACKUP_PREFIX}${fecha}`

    const backup = {
      fecha,
      estadoFinal: estado,
      resumen: {
        totalTicketsEmitidos: estado.totalAtendidos,
        totalTicketsAtendidos: estado.numerosLlamados,
        ticketsPendientes: estado.totalAtendidos - estado.numerosLlamados,
        primerTicket: estado.tickets[0]?.numero || 0,
        ultimoTicket: estado.ultimoNumero,
        horaInicio: estado.fechaInicio,
        horaBackup: new Date().toISOString(),
      },
      tickets: estado.tickets,
    }

    // Guardar backup con TTL de 30 días
    await kv.set(backupKey, backup, { ex: 30 * 24 * 60 * 60 })
    console.log(`📦 Backup diario creado en Redis: ${backupKey}`)
  } catch (error) {
    console.error("❌ Error al crear backup diario:", error)
  }
}

// Función para obtener información de conexión Redis
async function obtenerInfoRedis() {
  try {
    // Intentar una operación simple para verificar conexión
    await kv.set("test:connection", "ok", { ex: 10 })
    const test = await kv.get("test:connection")
    await kv.del("test:connection")

    return {
      conectado: test === "ok",
      url: process.env.KV_REST_API_URL ? "Configurado" : "No configurado",
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      conectado: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      timestamp: new Date().toISOString(),
    }
  }
}

export async function GET() {
  const lockAdquirido = await adquirirLock()
  if (!lockAdquirido) {
    return NextResponse.json({ error: "Sistema ocupado, intente nuevamente" }, { status: 503 })
  }

  try {
    console.log("\n=== 📥 GET /api/sistema ===")

    let estado = await leerDatos()

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("🔄 Ejecutando reinicio automático")
      await crearBackupDiario(estado)

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
      }

      await escribirDatos(estado)
    }

    console.log("📤 Estado devuelto:", {
      numeroActual: estado.numeroActual,
      ultimoNumero: estado.ultimoNumero,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets?.length || 0,
    })

    return NextResponse.json(estado)
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  } finally {
    await liberarLock()
  }
}

export async function POST(request: NextRequest) {
  const lockAdquirido = await adquirirLock()
  if (!lockAdquirido) {
    return NextResponse.json({ error: "Sistema ocupado, intente nuevamente" }, { status: 503 })
  }

  try {
    console.log("\n=== 📨 POST /api/sistema ===")

    const body = await request.json()
    const { action, ...nuevoEstado } = body

    console.log("🎯 Acción recibida:", action)

    let estado = await leerDatos()

    // Verificar si debe reiniciarse antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("🔄 Reinicio automático durante POST")
      await crearBackupDiario(estado)

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
      }
    }

    // Acción especial para generar ticket de forma atómica
    if (action === "GENERAR_TICKET") {
      const { nombre } = body

      if (!nombre || typeof nombre !== "string") {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("🎫 Generando ticket para:", nombre)

      try {
        // Usar el numeroActual del estado como el número a asignar
        const numeroAsignado = estado.numeroActual
        const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
        const timestamp = Date.now()

        const nuevoTicket: TicketInfo = {
          numero: numeroAsignado,
          nombre: nombre.trim(),
          fecha,
          timestamp,
        }

        console.log("🎫 Ticket a crear:", nuevoTicket)
        console.log("📊 Estado ANTES de actualizar:", {
          numeroActual: estado.numeroActual,
          ultimoNumero: estado.ultimoNumero,
          totalAtendidos: estado.totalAtendidos,
          numerosLlamados: estado.numerosLlamados,
          ticketsLength: estado.tickets.length,
        })

        // Actualizar estado de forma atómica
        const estadoActualizado: EstadoSistema = {
          ...estado,
          numeroActual: numeroAsignado + 1, // CRÍTICO: Incrementar para el próximo ticket
          ultimoNumero: numeroAsignado, // El que acabamos de asignar
          totalAtendidos: estado.totalAtendidos + 1,
          tickets: [...estado.tickets, nuevoTicket],
        }

        console.log("📊 Estado DESPUÉS de actualizar:", {
          numeroActual: estadoActualizado.numeroActual,
          ultimoNumero: estadoActualizado.ultimoNumero,
          totalAtendidos: estadoActualizado.totalAtendidos,
          numerosLlamados: estadoActualizado.numerosLlamados,
          ticketsLength: estadoActualizado.tickets.length,
        })

        // Guardar inmediatamente de forma atómica
        await escribirDatos(estadoActualizado)

        // Verificar que se guardó correctamente leyendo de nuevo
        const estadoVerificado = await leerDatos()
        console.log("🔍 Verificación post-guardado:", {
          numeroActual: estadoVerificado.numeroActual,
          ultimoNumero: estadoVerificado.ultimoNumero,
          totalAtendidos: estadoVerificado.totalAtendidos,
          ticketsLength: estadoVerificado.tickets.length,
        })

        if (estadoVerificado.numeroActual !== estadoActualizado.numeroActual) {
          throw new Error("Error de consistencia: el estado no se guardó correctamente")
        }

        console.log("✅ Ticket generado y verificado exitosamente")

        return NextResponse.json({
          ...estadoActualizado,
          ticketGenerado: nuevoTicket,
        })
      } catch (error) {
        console.error("❌ Error al generar ticket:", error)
        return NextResponse.json(
          {
            error: "Error al generar ticket",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción para obtener estadísticas del día
    if (action === "OBTENER_ESTADISTICAS") {
      const estadisticas = {
        totalTicketsHoy: estado.totalAtendidos,
        ticketsAtendidos: estado.numerosLlamados,
        ticketsPendientes: estado.totalAtendidos - estado.numerosLlamados,
        promedioTiempoPorTicket:
          estado.tickets.length > 1
            ? (estado.tickets[estado.tickets.length - 1].timestamp - estado.tickets[0].timestamp) /
              estado.tickets.length /
              1000 /
              60
            : 0,
        horaInicioOperaciones: estado.fechaInicio,
        ultimaActividad: estado.tickets[estado.tickets.length - 1]?.fecha || "Sin actividad",
        ticketsUltimaHora: estado.tickets.filter((t) => Date.now() - t.timestamp < 60 * 60 * 1000).length,
      }

      return NextResponse.json({
        ...estado,
        estadisticas,
      })
    }

    // Acción administrativa: Eliminar todos los registros
    if (action === "ELIMINAR_TODOS_REGISTROS") {
      console.log("🗑️ Eliminando todos los registros...")

      try {
        await crearBackupDiario(estado)

        const ahora = new Date()
        const estadoLimpio: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
        }

        await escribirDatos(estadoLimpio)
        console.log("✅ Todos los registros eliminados exitosamente")

        return NextResponse.json({
          ...estadoLimpio,
          mensaje: "Todos los registros han sido eliminados exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al eliminar registros:", error)
        return NextResponse.json(
          {
            error: "Error al eliminar registros",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción administrativa: Reiniciar contador diario
    if (action === "REINICIAR_CONTADOR_DIARIO") {
      console.log("🔄 Reiniciando contador diario...")

      try {
        await crearBackupDiario(estado)

        const ahora = new Date()
        const estadoReiniciado: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
        }

        await escribirDatos(estadoReiniciado)
        console.log("✅ Contador diario reiniciado exitosamente")

        return NextResponse.json({
          ...estadoReiniciado,
          mensaje: "Contador diario reiniciado exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al reiniciar contador:", error)
        return NextResponse.json(
          {
            error: "Error al reiniciar contador",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Validar que los datos sean correctos para actualizaciones normales
    if (
      typeof nuevoEstado.numeroActual !== "number" ||
      typeof nuevoEstado.totalAtendidos !== "number" ||
      typeof nuevoEstado.numerosLlamados !== "number" ||
      !Array.isArray(nuevoEstado.tickets)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    console.log("📝 Actualizando estado normal:", {
      numeroActualAntes: estado.numeroActual,
      numeroActualNuevo: nuevoEstado.numeroActual,
      numerosLlamadosAntes: estado.numerosLlamados,
      numerosLlamadosNuevo: nuevoEstado.numerosLlamados,
    })

    // Actualizar estado global manteniendo las fechas originales del día
    const estadoActualizado = {
      ...nuevoEstado,
      fechaInicio: estado.fechaInicio, // Mantener la fecha original del día
      ultimoReinicio: estado.ultimoReinicio, // Mantener el último reinicio
    }

    await escribirDatos(estadoActualizado)

    return NextResponse.json(estadoActualizado)
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  } finally {
    await liberarLock()
  }
}
