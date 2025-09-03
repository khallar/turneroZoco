import { NextResponse } from "next/server"
import { forzarBackupDiario, obtenerBackups } from "@/lib/database"

export async function GET() {
  try {
    console.log("📋 Verificando estado de backups automáticos...")

    const backups = await obtenerBackups()
    const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    })

    const backupHoy = backups.find((b) => b.fecha === fechaHoy)
    const backupAyer = backups.find((b) => b.fecha === fechaAyer)

    return NextResponse.json({
      success: true,
      backups: {
        total: backups.length,
        hoy: backupHoy ? "✅ Existe" : "❌ No existe",
        ayer: backupAyer ? "✅ Existe" : "❌ No existe",
        fechaHoy,
        fechaAyer,
        ultimosBackups: backups.slice(0, 5).map((b) => ({
          fecha: b.fecha,
          tickets: b.resumen?.totalTicketsEmitidos || 0,
          creado: b.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error("❌ Error al verificar backups automáticos:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al verificar backups",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    console.log("🔧 Forzando creación de backup automático...")

    const resultado = await forzarBackupDiario()

    return NextResponse.json(resultado, {
      status: resultado.success ? 200 : 400,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ Error al forzar backup automático:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al crear backup automático",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
