import { NextResponse } from "next/server"
import { obtenerEstadoSistema } from "@/lib/database"

export async function GET() {
  try {
    const estado = await obtenerEstadoSistema()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      version: "5.3",
      estado: {
        ticketActual: estado.ticketActual,
        totalTickets: estado.tickets.length,
        ticketsPendientes: estado.tickets.filter((t) => !t.atendido).length,
        ticketsAtendidos: estado.tickets.filter((t) => t.atendido).length,
        empleados: estado.empleados.length,
        ticketLlamando: estado.ticketLlamando,
        ultimoTicketAtendido: estado.ultimoTicketAtendido,
      },
      tickets: estado.tickets.map((t) => ({
        numero: t.numero,
        nombre: t.nombre,
        atendido: t.atendido,
        empleado: t.empleado,
        timestamp: new Date(t.timestamp).toISOString(),
      })),
      empleados: estado.empleados,
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json(
      {
        error: "Debug failed",
        timestamp: new Date().toISOString(),
        version: "5.3",
      },
      { status: 500 },
    )
  }
}
