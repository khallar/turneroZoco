import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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

// Rutas de archivos
const DATA_DIR = path.join(process.cwd(), "data")
const ESTADO_FILE = path.join(DATA_DIR, "estado.json")
const BACKUP_DIR = path.join(DATA_DIR, "backups")
const LOCK_FILE = path.join(DATA_DIR, "sistema.lock")

// Variable para controlar acceso concurrente
let operacionEnProceso = false

// Asegurar que los directorios existan
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  } catch (error) {
    console.error("❌ Error creando directorios:", error)
  }
}

// Función para crear un lock simple
async function adquirirLock(): Promise<boolean> {
  try {
    // Si ya hay una operación en proceso, esperar
    if (operacionEnProceso) {
      console.log("⏳ Esperando que termine operación en proceso...")
      let intentos = 0
      while (operacionEnProceso && intentos < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        intentos++
      }
      if (operacionEnProceso) {
        console.log("⚠️ Timeout esperando lock")
        return false
      }
    }

    operacionEnProceso = true
    await ensureDirectories()

    // Crear archivo de lock
    await fs.writeFile(LOCK_FILE, Date.now().toString(), "utf8")
    console.log("🔒 Lock adquirido")
    return true
  } catch (error) {
    console.error("❌ Error adquiriendo lock:", error)
    operacionEnProceso = false
    return false
  }
}

// Función para liberar el lock
async function liberarLock() {
  try {
    await fs.unlink(LOCK_FILE).catch(() => {})
    operacionEnProceso = false
    console.log("🔓 Lock liberado")
  } catch (error) {
    console.error("❌ Error liberando lock:", error)
    operacionEnProceso = false
  }
}

// Función para leer datos del archivo con lock
async function leerDatos(): Promise<EstadoSistema> {
  try {
    console.log("📖 Leyendo datos del archivo...")
    await ensureDirectories()

    try {
      const data = await fs.readFile(ESTADO_FILE, "utf8")
      const estado = JSON.parse(data) as EstadoSistema

      console.log("✅ Estado leído del archivo:", {
        numeroActual: estado.numeroActual,
        ultimoNumero: estado.ultimoNumero,
        totalAtendidos: estado.totalAtendidos,
        numerosLlamados: estado.numerosLlamados,
        totalTickets: estado.tickets?.length || 0,
        fechaInicio: estado.fechaInicio,
      })

      // Validar estructura de datos
      if (!estado.tickets) estado.tickets = []
      if (!estado.ultimoReinicio) estado.ultimoReinicio = new Date().toISOString()
      if (typeof estado.numeroActual !== "number") estado.numeroActual = 1
      if (typeof estado.ultimoNumero !== "number") estado.ultimoNumero = 0
      if (typeof estado.totalAtendidos !== "number") estado.totalAtendidos = 0
      if (typeof estado.numerosLlamados !== "number") estado.numerosLlamados = 0

      // Verificar integridad de los datos
      const ticketsCount = estado.tickets.length
      if (ticketsCount !== estado.totalAtendidos) {
        console.log("⚠️ Inconsistencia detectada: tickets.length !== totalAtendidos")
        estado.totalAtendidos = ticketsCount
      }

      return estado
    } catch (fileError) {
      console.log("⚠️ No se encontró archivo de estado, creando estado inicial")
      const estadoNuevo = { ...estadoInicial }
      await escribirDatos(estadoNuevo)
      return estadoNuevo
    }
  } catch (error) {
    console.error("❌ Error al leer datos del archivo:", error)
    return { ...estadoInicial }
  }
}

// Función para escribir datos al archivo con verificación
async function escribirDatos(estado: EstadoSistema): Promise<void> {
  try {
    console.log("💾 Escribiendo datos al archivo:", {
      numeroActual: estado.numeroActual,
      ultimoNumero: estado.ultimoNumero,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets?.length || 0,
    })

    await ensureDirectories()

    // Verificar integridad antes de guardar
    if (estado.tickets.length !== estado.totalAtendidos) {
      console.log("⚠️ Corrigiendo inconsistencia antes de guardar")
      estado.totalAtendidos = estado.tickets.length
    }

    // Escribir de forma atómica usando un archivo temporal
    const tempFile = ESTADO_FILE + ".tmp"
    const dataToWrite = JSON.stringify(estado, null, 2)

    await fs.writeFile(tempFile, dataToWrite, "utf8")
    await fs.rename(tempFile, ESTADO_FILE)

    // Verificar que se escribió correctamente
    const verificacion = await fs.readFile(ESTADO_FILE, "utf8")
    const estadoVerificado = JSON.parse(verificacion)

    if (estadoVerificado.numeroActual !== estado.numeroActual) {
      throw new Error("Error de verificación: el archivo no se guardó correctamente")
    }

    console.log("✅ Datos guardados y verificados exitosamente")
  } catch (error) {
    console.error("❌ Error al escribir datos al archivo:", error)
    throw error
  }
}

// Función para verificar si debe reiniciarse (más conservadora)
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

// Función para crear backup diario
async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    const fecha = estado.fechaInicio // Usar la fecha del estado, no la actual
    const backupFile = path.join(BACKUP_DIR, `backup-${fecha}.json`)

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

    await ensureDirectories()
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2), "utf8")
    console.log(`📦 Backup diario creado: ${backupFile}`)
  } catch (error) {
    console.error("❌ Error al crear backup diario:", error)
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
