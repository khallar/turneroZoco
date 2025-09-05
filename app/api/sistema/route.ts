import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/database"

interface SistemaEstado {
  numeroActual: number
  proximoNumero: number
  activo: boolean
}

interface Ticket {
  numero: number
  nombre?: string
  timestamp: string
}

const ESTADO_INICIAL: SistemaEstado = {
  numeroActual: 0,
  proximoNumero: 1,
  activo: false,
}

async function obtenerFechaActual(): Promise<string> {
  return new Date().toISOString().split("T")[0]
}

async function leerEstado(): Promise<SistemaEstado> {
  try {
    const fecha = await obtenerFechaActual()
    const estado = await redis.get(`sistema:estado:${fecha}`)
    return estado || ESTADO_INICIAL
  } catch (error) {
    console.error("❌ Error al leer estado:", error)
    return ESTADO_INICIAL
  }
}

async function guardarEstado(estado: SistemaEstado): Promise<void> {
  try {
    const fecha = await obtenerFechaActual()
    await redis.set(`sistema:estado:${fecha}`, estado)
  } catch (error) {
    console.error("❌ Error al guardar estado:", error)
    throw error
  }
}

async function leerTickets(): Promise<Ticket[]> {
  try {
    const fecha = await obtenerFechaActual()
    const tickets = await redis.get(`sistema:tickets:${fecha}`)
    return tickets || []
  } catch (error) {
    console.error("❌ Error al leer tickets:", error)
    return []
  }
}

async function guardarTickets(tickets: Ticket[]): Promise<void> {
  try {
    const fecha = await obtenerFechaActual()
    await redis.set(`sistema:tickets:${fecha}`, tickets)
  } catch (error) {
    console.error("❌ Error al guardar tickets:", error)
    throw error
  }
}

export async function GET() {
  try {
    const [estado, tickets] = await Promise.all([leerEstado(), leerTickets()])

    return NextResponse.json({
      estado,
      tickets,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        estado: ESTADO_INICIAL,
        tickets: [],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion, nombre } = body

    const estado = await leerEstado()
    const tickets = await leerTickets()

    switch (accion) {
      case "generar_ticket": {
        if (!estado.activo) {
          return NextResponse.json({ error: "El sistema está desactivado" }, { status: 400 })
        }

        const nuevoTicket: Ticket = {
          numero: estado.proximoNumero,
          nombre: nombre || undefined,
          timestamp: new Date().toISOString(),
        }

        tickets.push(nuevoTicket)
        estado.proximoNumero += 1

        await Promise.all([guardarEstado(estado), guardarTickets(tickets)])

        return NextResponse.json({
          success: true,
          ticket: nuevoTicket,
          estado,
        })
      }

      case "siguiente_ticket": {
        if (tickets.length === 0) {
          return NextResponse.json({ error: "No hay tickets en cola" }, { status: 400 })
        }

        const siguienteTicket = tickets.find((t) => t.numero > estado.numeroActual)
        if (!siguienteTicket) {
          return NextResponse.json({ error: "No hay más tickets en cola" }, { status: 400 })
        }

        estado.numeroActual = siguienteTicket.numero
        await guardarEstado(estado)

        return NextResponse.json({
          success: true,
          ticketActual: siguienteTicket,
          estado,
        })
      }

      case "toggle_sistema": {
        estado.activo = !estado.activo
        await guardarEstado(estado)

        return NextResponse.json({
          success: true,
          estado,
          message: `Sistema ${estado.activo ? "activado" : "desactivado"}`,
        })
      }

      case "reiniciar_sistema": {
        const nuevoEstado = { ...ESTADO_INICIAL }
        const nuevosTickets: Ticket[] = []

        await Promise.all([guardarEstado(nuevoEstado), guardarTickets(nuevosTickets)])

        return NextResponse.json({
          success: true,
          estado: nuevoEstado,
          tickets: nuevosTickets,
          message: "Sistema reiniciado correctamente",
        })
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
