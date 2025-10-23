import { type NextRequest, NextResponse } from "next/server"
import { obtenerPremiosDia, guardarPremiosDia, obtenerEstadisticasPremios } from "@/lib/premios"
import { getTodayDateString } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha") || getTodayDateString()
    const action = searchParams.get("action")

    if (action === "estadisticas") {
      const estadisticas = await obtenerEstadisticasPremios(fecha)
      return NextResponse.json({ success: true, estadisticas })
    }

    const config = await obtenerPremiosDia(fecha)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("Error en GET /api/premios:", error)
    return NextResponse.json({ success: false, error: "Error al obtener premios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config || !config.fecha) {
      return NextResponse.json({ success: false, error: "Configuración inválida" }, { status: 400 })
    }

    await guardarPremiosDia(config)

    return NextResponse.json({ success: true, message: "Premios guardados exitosamente" })
  } catch (error) {
    console.error("Error en POST /api/premios:", error)
    return NextResponse.json({ success: false, error: "Error al guardar premios" }, { status: 500 })
  }
}
