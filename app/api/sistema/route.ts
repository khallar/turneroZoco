import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

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

// Inicializar Redis con las variables de entorno de Upstash
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Estado inicial
const estadoInicial: EstadoSistema = {
  numeroActual: 1,
  ultimoNumero: 0,
  totalAtendidos: 0,
  numerosLlamados: 0,
  fechaInicio: new Date().toDateString(),
  ultimoReinicio: new Date().toISOString(),
  tickets: [],
}

// Claves de Redis
const REDIS_KEYS = {
  ESTADO: "sistema:estado",
  TICKETS: "sistema:tickets",
  BACKUP_PREFIX: "sistema:backup:",
  CONTADOR_ATOMICO: "sistema:contador",
}

// Función para leer datos de Redis
async function leerDatos(): Promise<EstadoSistema> {
  try {
    console.log("Leyendo datos de Redis...")

    // Intentar obtener el estado completo
    const estado = await redis.get<EstadoSistema>(REDIS_KEYS.ESTADO)

    if (estado) {
      console.log("Estado encontrado en Redis:", {
        numeroActual: estado.numeroActual,
        totalTickets: estado.tickets?.length || 0,
      })

      // Validar estructura de datos
      if (!estado.tickets) estado.tickets = []
      if (!estado.ultimoReinicio) estado.ultimoReinicio = new Date().toISOString()

      return estado
    } else {
      console.log("No se encontró estado en Redis, creando estado inicial")
      return { ...estadoInicial }
    }
  } catch (error) {
    console.error("Error al leer datos de Redis:", error)
    return { ...estadoInicial }
  }
}

// Función para escribir datos a Redis
async function escribirDatos(estado: EstadoSistema): Promise<void> {
  try {
    console.log("Escribiendo datos a Redis...", {
      numeroActual: estado.numeroActual,
      totalTickets: estado.tickets?.length || 0,
    })

    // Guardar estado completo
    await redis.set(REDIS_KEYS.ESTADO, estado)

    // También guardar tickets por separado para consultas rápidas
    await redis.set(REDIS_KEYS.TICKETS, estado.tickets)

    console.log("Datos guardados exitosamente en Redis")
  } catch (error) {
    console.error("Error al escribir datos a Redis:", error)
    throw error
  }
}

// Función para verificar si debe reiniciarse
function debeReiniciarse(estado: EstadoSistema): boolean {
  const ahora = new Date()
  const ultimoReinicio = new Date(estado.ultimoReinicio)

  // Obtener la fecha actual y la fecha del último reinicio (solo fecha, sin hora)
  const fechaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const fechaUltimoReinicio = new Date(
    ultimoReinicio.getFullYear(),
    ultimoReinicio.getMonth(),
    ultimoReinicio.getDate(),
  )

  // Solo reiniciar si es un día diferente al último reinicio
  const esDiaDiferente = fechaActual.getTime() > fechaUltimoReinicio.getTime()

  if (esDiaDiferente) {
    console.log("Reinicio automático: nuevo día detectado")
    return true
  }

  return false
}

// Función para crear backup diario en Redis
async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    const fecha = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const backupKey = `${REDIS_KEYS.BACKUP_PREFIX}${fecha}`

    // Guardar backup con estadísticas del día
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

    await redis.set(backupKey, backup)

    // Establecer expiración del backup a 30 días
    await redis.expire(backupKey, 30 * 24 * 60 * 60) // 30 días en segundos

    console.log(`Backup diario creado en Redis: ${backupKey}`)
  } catch (error) {
    console.error("Error al crear backup diario:", error)
  }
}

// Función para generar número de forma atómica
async function generarNumeroAtomico(): Promise<number> {
  try {
    // Usar INCR de Redis para operación atómica
    const numero = await redis.incr(REDIS_KEYS.CONTADOR_ATOMICO)
    console.log("Número generado atómicamente:", numero)
    return numero
  } catch (error) {
    console.error("Error al generar número atómico:", error)
    throw error
  }
}

// Función para inicializar contador si no existe
async function inicializarContador(numeroActual: number): Promise<void> {
  try {
    const contadorExiste = await redis.exists(REDIS_KEYS.CONTADOR_ATOMICO)
    if (!contadorExiste) {
      await redis.set(REDIS_KEYS.CONTADOR_ATOMICO, numeroActual - 1)
      console.log("Contador atómico inicializado en:", numeroActual - 1)
    }
  } catch (error) {
    console.error("Error al inicializar contador:", error)
  }
}

export async function GET() {
  try {
    console.log("=== GET /api/sistema ===")

    let estado = await leerDatos()

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("Ejecutando reinicio automático a medianoche")

      // Crear backup del día anterior antes de reiniciar
      await crearBackupDiario(estado)

      // Reiniciar estado
      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toDateString(),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
      }

      // Reiniciar contador atómico
      await redis.del(REDIS_KEYS.CONTADOR_ATOMICO)
      await inicializarContador(estado.numeroActual)

      // Guardar estado reiniciado
      await escribirDatos(estado)
    } else {
      // Asegurar que el contador esté sincronizado
      await inicializarContador(estado.numeroActual)
    }

    console.log("Estado devuelto:", {
      numeroActual: estado.numeroActual,
      totalTickets: estado.tickets?.length || 0,
    })

    return NextResponse.json(estado)
  } catch (error) {
    console.error("Error en GET /api/sistema:", error)
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
    console.log("=== POST /api/sistema ===")

    const body = await request.json()
    const { action, ...nuevoEstado } = body

    console.log("Acción recibida:", action)

    let estado = await leerDatos()

    // Verificar si debe reiniciarse antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("Reinicio automático durante POST - nuevo día detectado")

      // Crear backup del día anterior
      await crearBackupDiario(estado)

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toDateString(),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
      }

      // Reiniciar contador atómico
      await redis.del(REDIS_KEYS.CONTADOR_ATOMICO)
      await inicializarContador(estado.numeroActual)
    }

    // Acción especial para generar ticket de forma atómica
    if (action === "GENERAR_TICKET") {
      const { nombre } = body

      if (!nombre || typeof nombre !== "string") {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("Generando ticket para:", nombre)

      try {
        // Generar número de forma atómica usando Redis INCR
        const numeroAsignado = await generarNumeroAtomico()
        const fecha = new Date().toLocaleString("es-ES")
        const timestamp = Date.now()

        const nuevoTicket: TicketInfo = {
          numero: numeroAsignado,
          nombre: nombre.trim(),
          fecha,
          timestamp,
        }

        console.log("Ticket generado:", nuevoTicket)

        // Actualizar estado
        estado = {
          ...estado,
          numeroActual: numeroAsignado + 1, // El próximo número a asignar
          ultimoNumero: numeroAsignado, // El que acabamos de asignar
          totalAtendidos: estado.totalAtendidos + 1,
          tickets: [...estado.tickets, nuevoTicket],
        }

        // Guardar inmediatamente en Redis
        await escribirDatos(estado)

        console.log("Estado actualizado y guardado")

        return NextResponse.json({
          ...estado,
          ticketGenerado: nuevoTicket, // Devolver el ticket generado
        })
      } catch (error) {
        console.error("Error al generar ticket atómico:", error)
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
      console.log("Eliminando todos los registros...")

      try {
        // Crear backup antes de eliminar
        await crearBackupDiario(estado)

        // Reiniciar completamente el estado
        const ahora = new Date()
        const estadoLimpio: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toDateString(),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
        }

        // Limpiar Redis completamente
        await redis.del(REDIS_KEYS.ESTADO)
        await redis.del(REDIS_KEYS.TICKETS)
        await redis.del(REDIS_KEYS.CONTADOR_ATOMICO)

        // Guardar estado limpio
        await escribirDatos(estadoLimpio)
        await inicializarContador(estadoLimpio.numeroActual)

        console.log("Todos los registros eliminados exitosamente")

        return NextResponse.json({
          ...estadoLimpio,
          mensaje: "Todos los registros han sido eliminados exitosamente",
        })
      } catch (error) {
        console.error("Error al eliminar registros:", error)
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
      console.log("Reiniciando contador diario...")

      try {
        // Crear backup del estado actual
        await crearBackupDiario(estado)

        // Reiniciar solo los contadores, mantener configuración
        const ahora = new Date()
        const estadoReiniciado: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toDateString(),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
        }

        // Reiniciar contador atómico
        await redis.del(REDIS_KEYS.CONTADOR_ATOMICO)
        await inicializarContador(estadoReiniciado.numeroActual)

        // Guardar estado reiniciado
        await escribirDatos(estadoReiniciado)

        console.log("Contador diario reiniciado exitosamente")

        return NextResponse.json({
          ...estadoReiniciado,
          mensaje: "Contador diario reiniciado exitosamente",
        })
      } catch (error) {
        console.error("Error al reiniciar contador:", error)
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

    // Actualizar estado global manteniendo las fechas originales del día
    estado = {
      ...nuevoEstado,
      fechaInicio: estado.fechaInicio, // Mantener la fecha original del día
      ultimoReinicio: estado.ultimoReinicio, // Mantener el último reinicio
    }

    // Guardar en Redis
    await escribirDatos(estado)

    return NextResponse.json(estado)
  } catch (error) {
    console.error("Error en POST /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
