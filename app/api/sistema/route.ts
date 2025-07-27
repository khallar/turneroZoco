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
  lastSync?: number // Timestamp de última sincronización
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
  lastSync: Date.now(),
}

// Claves de Redis - reducidas al mínimo
const ESTADO_KEY = "sistema:estado:v2"
const BACKUP_PREFIX = "sistema:backup:"

// Cache en memoria del servidor (para reducir calls a Redis)
let serverCache: EstadoSistema | null = null
let lastCacheUpdate = 0
const CACHE_TTL = 30000 // 30 segundos de caché en servidor

// Función simplificada para leer datos (con caché)
async function leerDatos(forzarRedis = false): Promise<EstadoSistema> {
  try {
    // Usar caché del servidor si es reciente y no se fuerza Redis
    if (!forzarRedis && serverCache && Date.now() - lastCacheUpdate < CACHE_TTL) {
      console.log("📋 Usando caché del servidor")
      return { ...serverCache }
    }

    console.log("📖 Leyendo datos de Redis...")

    const data = await kv.get<EstadoSistema>(ESTADO_KEY)

    if (data) {
      console.log("✅ Estado encontrado en Redis:", {
        numeroActual: data.numeroActual,
        totalAtendidos: data.totalAtendidos,
        numerosLlamados: data.numerosLlamados,
        totalTickets: data.tickets?.length || 0,
      })

      // Validar y limpiar datos
      if (!data.tickets) data.tickets = []
      if (!data.ultimoReinicio) data.ultimoReinicio = new Date().toISOString()
      if (typeof data.numeroActual !== "number") data.numeroActual = 1
      if (typeof data.ultimoNumero !== "number") data.ultimoNumero = 0
      if (typeof data.totalAtendidos !== "number") data.totalAtendidos = 0
      if (typeof data.numerosLlamados !== "number") data.numerosLlamados = 0

      // Verificar integridad
      if (data.tickets.length !== data.totalAtendidos) {
        console.log("⚠️ Corrigiendo inconsistencia")
        data.totalAtendidos = data.tickets.length
      }

      data.lastSync = Date.now()

      // Actualizar caché del servidor
      serverCache = { ...data }
      lastCacheUpdate = Date.now()

      return data
    } else {
      console.log("⚠️ No se encontró estado en Redis, creando inicial")
      const estadoNuevo = { ...estadoInicial }
      await escribirDatos(estadoNuevo, true) // Forzar escritura inicial
      return estadoNuevo
    }
  } catch (error) {
    console.error("❌ Error al leer datos de Redis:", error)

    // Si hay caché del servidor, usarlo como fallback
    if (serverCache) {
      console.log("🔄 Usando caché del servidor como fallback")
      return { ...serverCache }
    }

    return { ...estadoInicial }
  }
}

// Función optimizada para escribir datos (solo cuando hay cambios)
async function escribirDatos(estado: EstadoSistema, forzar = false): Promise<void> {
  try {
    // Verificar si realmente hay cambios comparando con caché
    if (!forzar && serverCache) {
      const haycambios =
        serverCache.numeroActual !== estado.numeroActual ||
        serverCache.totalAtendidos !== estado.totalAtendidos ||
        serverCache.numerosLlamados !== estado.numerosLlamados ||
        serverCache.tickets.length !== estado.tickets.length

      if (!haycambios) {
        console.log("📝 No hay cambios, omitiendo escritura a Redis")
        return
      }
    }

    console.log("💾 Escribiendo datos a Redis:", {
      numeroActual: estado.numeroActual,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets?.length || 0,
    })

    // Verificar integridad antes de guardar
    if (estado.tickets.length !== estado.totalAtendidos) {
      console.log("⚠️ Corrigiendo inconsistencia antes de guardar")
      estado.totalAtendidos = estado.tickets.length
    }

    estado.lastSync = Date.now()

    // Guardar en Redis con TTL de 7 días
    await kv.set(ESTADO_KEY, estado, { ex: 7 * 24 * 60 * 60 })

    // Actualizar caché del servidor
    serverCache = { ...estado }
    lastCacheUpdate = Date.now()

    console.log("✅ Datos guardados exitosamente en Redis")
  } catch (error) {
    console.error("❌ Error al escribir datos a Redis:", error)

    // Si falla Redis, al menos actualizar caché del servidor
    serverCache = { ...estado }
    lastCacheUpdate = Date.now()

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

// Función optimizada para crear backup (solo una vez por día)
async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    const fecha = estado.fechaInicio
    const backupKey = `${BACKUP_PREFIX}${fecha}`

    // Verificar si ya existe el backup para evitar duplicados
    const backupExistente = await kv.exists(backupKey)
    if (backupExistente) {
      console.log(`📦 Backup ya existe para ${fecha}, omitiendo`)
      return
    }

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
    console.log(`📦 Backup diario creado: ${backupKey}`)
  } catch (error) {
    console.error("❌ Error al crear backup diario:", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

export async function GET() {
  try {
    console.log("\n=== 📥 GET /api/sistema ===")

    let estado = await leerDatos()

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("🔄 Ejecutando reinicio automático")

      // Crear backup en background (no bloquear)
      crearBackupDiario(estado).catch((err) => console.error("Error en backup:", err))

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirDatos(estado, true) // Forzar escritura del reinicio
    }

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
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n=== 📨 POST /api/sistema ===")

    const body = await request.json()
    const { action, ...nuevoEstado } = body

    console.log("🎯 Acción recibida:", action)

    let estado = await leerDatos()

    // Verificar si debe reiniciarse antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("🔄 Reinicio automático durante POST")

      // Crear backup en background
      crearBackupDiario(estado).catch((err) => console.error("Error en backup:", err))

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
        lastSync: Date.now(),
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

        // Actualizar estado de forma atómica
        const estadoActualizado: EstadoSistema = {
          ...estado,
          numeroActual: numeroAsignado + 1,
          ultimoNumero: numeroAsignado,
          totalAtendidos: estado.totalAtendidos + 1,
          tickets: [...estado.tickets, nuevoTicket],
          lastSync: Date.now(),
        }

        // Guardar inmediatamente
        await escribirDatos(estadoActualizado, true) // Forzar escritura para tickets

        console.log("✅ Ticket generado exitosamente")

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

    // Acción para obtener estadísticas (sin escribir a Redis)
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
        // Crear backup en background
        crearBackupDiario(estado).catch((err) => console.error("Error en backup:", err))

        const ahora = new Date()
        const estadoLimpio: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
          lastSync: Date.now(),
        }

        await escribirDatos(estadoLimpio, true)
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
        // Crear backup en background
        crearBackupDiario(estado).catch((err) => console.error("Error en backup:", err))

        const ahora = new Date()
        const estadoReiniciado: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
          lastSync: Date.now(),
        }

        await escribirDatos(estadoReiniciado, true)
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

    // Validar datos para actualizaciones normales
    if (
      typeof nuevoEstado.numeroActual !== "number" ||
      typeof nuevoEstado.totalAtendidos !== "number" ||
      typeof nuevoEstado.numerosLlamados !== "number" ||
      !Array.isArray(nuevoEstado.tickets)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    console.log("📝 Actualizando estado normal")

    // Actualizar estado manteniendo fechas originales
    const estadoActualizado = {
      ...nuevoEstado,
      fechaInicio: estado.fechaInicio,
      ultimoReinicio: estado.ultimoReinicio,
      lastSync: Date.now(),
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
  }
}
