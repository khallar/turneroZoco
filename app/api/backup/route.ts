import { NextResponse } from "next/server"
import { leerEstadoSistema, crearBackupDiario, obtenerBackupsPorFecha, obtenerBackupCompleto } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")

    if (fecha) {
      // Obtener backup específico
      const backup = await obtenerBackupCompleto(fecha)
      if (!backup) {
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
      }
      return NextResponse.json(backup)
    } else {
      // Obtener lista de backups
      const backups = await obtenerBackupsPorFecha()
      return NextResponse.json(backups)
    }
  } catch (error) {
    console.error("Error en GET /api/backup:", error)
    return NextResponse.json(
      { error: "Error al obtener backups", details: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const estado = await leerEstadoSistema()
    const backup = await crearBackupDiario(estado)

    return NextResponse.json({
      success: true,
      backup,
      message: "Backup creado exitosamente",
    })
  } catch (error) {
    console.error("Error en POST /api/backup:", error)
    return NextResponse.json(
      { error: "Error al crear backup", details: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
