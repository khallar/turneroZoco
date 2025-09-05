import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fecha = searchParams.get("fecha") || new Date().toISOString().split("T")[0]

    // Obtener todos los datos del día
    const [estado, tickets, historial] = await Promise.all([
      redis.get(`sistema:estado:${fecha}`),
      redis.get(`sistema:tickets:${fecha}`),
      redis.get(`sistema:historial:${fecha}`),
    ])

    const backup = {
      fecha,
      timestamp: new Date().toISOString(),
      estado: estado || { numeroActual: 0, proximoNumero: 1, activo: false },
      tickets: tickets || [],
      historial: historial || [],
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error("Error al crear backup:", error)
    return NextResponse.json({ error: "Error al crear backup" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const backup = await request.json()
    const fecha = backup.fecha || new Date().toISOString().split("T")[0]

    // Restaurar datos
    await Promise.all([
      redis.set(`sistema:estado:${fecha}`, backup.estado),
      redis.set(`sistema:tickets:${fecha}`, backup.tickets || []),
      redis.set(`sistema:historial:${fecha}`, backup.historial || []),
    ])

    return NextResponse.json({ success: true, message: "Backup restaurado correctamente" })
  } catch (error) {
    console.error("Error al restaurar backup:", error)
    return NextResponse.json({ error: "Error al restaurar backup" }, { status: 500 })
  }
}
