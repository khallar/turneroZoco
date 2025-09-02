import { NextResponse } from "next/server"
import { obtenerBackups, obtenerBackup } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")

    if (fecha) {
      // Obtener backup específico
      const backup = await obtenerBackup(fecha)
      if (!backup) {
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
      }
      return NextResponse.json(backup)
    } else {
      // Obtener lista de backups
      const backups = await obtenerBackups()
      return NextResponse.json(backups)
    }
  } catch (error) {
    console.error("Error en /api/backup:", error)
    return NextResponse.json(
      {
        error: "Error al obtener backups",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
