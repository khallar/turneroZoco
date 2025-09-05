import { type NextRequest, NextResponse } from "next/server"
import { crearBackup, obtenerBackups, obtenerBackup, guardarEstadoSistema } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accion = searchParams.get("accion")

    if (accion === "listar") {
      const backups = await obtenerBackups()
      return NextResponse.json({ backups })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en GET /api/backup:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion, fecha } = body

    if (accion === "crear") {
      const fechaBackup = await crearBackup()
      return NextResponse.json({
        success: true,
        fecha: fechaBackup,
        message: "Backup creado exitosamente",
      })
    }

    if (accion === "restaurar" && fecha) {
      const estadoBackup = await obtenerBackup(fecha)
      if (!estadoBackup) {
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
      }

      await guardarEstadoSistema(estadoBackup)
      return NextResponse.json({
        success: true,
        message: "Backup restaurado exitosamente",
      })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en POST /api/backup:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
