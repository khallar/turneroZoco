import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, crearBackupDiario, obtenerBackups } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("📦 Iniciando creación de backup manual...")

    // Leer el estado actual del sistema
    const estadoCompleto = await leerEstadoSistema()

    // Crear el backup
    await crearBackupDiario(estadoCompleto)

    console.log("✅ Backup manual creado exitosamente")

    return NextResponse.json({
      success: true,
      message: "Backup creado exitosamente",
      fecha: estadoCompleto.fechaInicio,
      totalTickets: estadoCompleto.totalAtendidos,
    })
  } catch (error) {
    console.error("❌ Error al crear backup manual:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear backup",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("📋 Obteniendo lista de backups...")

    const backups = await obtenerBackups()

    console.log(`✅ Obtenidos ${backups.length} backups`)

    return NextResponse.json({
      success: true,
      backups: backups,
      total: backups.length,
    })
  } catch (error) {
    console.error("❌ Error al obtener backups:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener backups",
        details: error instanceof Error ? error.message : "Error desconocido",
        backups: [],
      },
      { status: 500 },
    )
  }
}
