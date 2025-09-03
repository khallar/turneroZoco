import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const REDIS_KEY = "TURNOS_ZOCO"

interface Ticket {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

interface EstadoSistema {
  numeroActual: number
  totalAtendidos: number
  numerosLlamados: number
  tickets: Ticket[]
  fechaActual: string
}

// Función para obtener la fecha actual en Argentina
function obtenerFechaArgentina(): string {
  return new Date()
    .toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-")
}

// Función para obtener el estado actual del sistema
async function obtenerEstadoSistema(): Promise<EstadoSistema> {
  try {
    const fechaHoy = obtenerFechaArgentina()
    const estadoRaw = await redis.get(REDIS_KEY)

    console.log("📊 Estado raw desde Redis:", estadoRaw)

    if (!estadoRaw) {
      console.log("🆕 Creando nuevo estado del sistema")
      const nuevoEstado: EstadoSistema = {
        numeroActual: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        tickets: [],
        fechaActual: fechaHoy,
      }
      await redis.set(REDIS_KEY, JSON.stringify(nuevoEstado))
      return nuevoEstado
    }

    const estado = JSON.parse(estadoRaw as string) as EstadoSistema

    // Verificar si cambió el día y reiniciar si es necesario
    if (estado.fechaActual !== fechaHoy) {
      console.log("📅 Nuevo día detectado, reiniciando sistema")
      const estadoReiniciado: EstadoSistema = {
        numeroActual: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        tickets: [],
        fechaActual: fechaHoy,
      }
      await redis.set(REDIS_KEY, JSON.stringify(estadoReiniciado))
      return estadoReiniciado
    }

    // Asegurar que tickets sea siempre un array
    if (!Array.isArray(estado.tickets)) {
      console.warn("⚠️ tickets no es un array, corrigiendo...")
      estado.tickets = []
    }

    console.log("✅ Estado cargado:", {
      numeroActual: estado.numeroActual,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      ticketsCount: estado.tickets.length,
      fechaActual: estado.fechaActual,
    })

    return estado
  } catch (error) {
    console.error("❌ Error al obtener estado:", error)
    throw new Error("Error al conectar con la base de datos")
  }
}

// Función para guardar el estado del sistema
async function guardarEstadoSistema(estado: EstadoSistema): Promise<void> {
  try {
    // Asegurar que tickets sea siempre un array antes de guardar
    if (!Array.isArray(estado.tickets)) {
      estado.tickets = []
    }

    await redis.set(REDIS_KEY, JSON.stringify(estado))
    console.log("💾 Estado guardado exitosamente")
  } catch (error) {
    console.error("❌ Error al guardar estado:", error)
    throw new Error("Error al guardar en la base de datos")
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 GET /api/sistema - Obteniendo estado")

    const estado = await obtenerEstadoSistema()

    // Validar consistencia de datos
    const ticketsValidos = Array.isArray(estado.tickets) ? estado.tickets : []

    const response = {
      numeroActual: estado.numeroActual || 0,
      totalAtendidos: estado.totalAtendidos || 0,
      numerosLlamados: estado.numerosLlamados || 0,
      tickets: ticketsValidos,
      fechaActual: estado.fechaActual || obtenerFechaArgentina(),
      timestamp: Date.now(),
    }

    console.log("📤 Enviando respuesta:", {
      numeroActual: response.numeroActual,
      totalAtendidos: response.totalAtendidos,
      numerosLlamados: response.numerosLlamados,
      ticketsCount: response.tickets.length,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, nombre } = body

    console.log("📝 POST /api/sistema - Acción:", action, "Nombre:", nombre)

    if (action === "GENERAR_TICKET") {
      // Validar nombre
      if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
        return NextResponse.json({ error: "El nombre es requerido y debe ser válido" }, { status: 400 })
      }

      if (nombre.trim().length < 2) {
        return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 })
      }

      const estado = await obtenerEstadoSistema()

      // Generar nuevo ticket
      const nuevoNumero = estado.totalAtendidos + 1
      const fechaHoy = obtenerFechaArgentina()

      const nuevoTicket: Ticket = {
        numero: nuevoNumero,
        nombre: nombre.trim(),
        fecha: fechaHoy,
        timestamp: Date.now(),
      }

      // Asegurar que tickets sea un array
      if (!Array.isArray(estado.tickets)) {
        estado.tickets = []
      }

      // Actualizar estado
      estado.numeroActual = nuevoNumero
      estado.totalAtendidos = nuevoNumero
      estado.tickets.push(nuevoTicket)
      estado.fechaActual = fechaHoy

      // Guardar estado actualizado
      await guardarEstadoSistema(estado)

      console.log("🎫 Ticket generado:", nuevoTicket)

      return NextResponse.json({
        success: true,
        ticketGenerado: nuevoTicket,
        numeroActual: estado.numeroActual,
        totalAtendidos: estado.totalAtendidos,
        numerosLlamados: estado.numerosLlamados,
      })
    }

    if (action === "LLAMAR_SIGUIENTE") {
      const estado = await obtenerEstadoSistema()

      const siguienteNumero = estado.numerosLlamados + 1

      if (siguienteNumero > estado.totalAtendidos) {
        return NextResponse.json({ error: "No hay más números para llamar" }, { status: 400 })
      }

      // Buscar el ticket correspondiente
      const ticketLlamado = Array.isArray(estado.tickets)
        ? estado.tickets.find((t) => t.numero === siguienteNumero)
        : null

      // Actualizar números llamados
      estado.numerosLlamados = siguienteNumero

      // Guardar estado actualizado
      await guardarEstadoSistema(estado)

      console.log("📢 Número llamado:", siguienteNumero, "Ticket:", ticketLlamado)

      return NextResponse.json({
        success: true,
        numeroLlamado: siguienteNumero,
        ticket: ticketLlamado,
        numerosLlamados: estado.numerosLlamados,
        totalAtendidos: estado.totalAtendidos,
      })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
