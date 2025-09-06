import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, crearBackupDiario, obtenerBackups, obtenerBackup } from "@/lib/database"

export async function GET(request: NextRequest) {
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
    console.error("Error en API backup:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const estado = await leerEstadoSistema()
    await crearBackupDiario(estado)

    return NextResponse.json({
      success: true,
      message: "Backup creado exitosamente",
      fecha: estado.fechaInicio,
    })
  } catch (error) {
    console.error("Error creando backup:", error)
    return NextResponse.json({ error: "Error al crear backup" }, { status: 500 })
  }
}
