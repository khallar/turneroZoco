import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, crearBackupDiario } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    // Verificar que la petición viene de Vercel Cron (opcional, pero recomendado)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🤖 Iniciando backup automático diario programado...")
    console.log(
      "⏰ Hora de ejecución:",
      new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
    )

    // Obtener el estado completo del sistema
    const estadoCompleto = await leerEstadoSistema()

    // Solo crear backup si hay datos
    if (estadoCompleto.totalAtendidos > 0) {
      await crearBackupDiario(estadoCompleto)

      console.log("✅ Backup automático diario creado exitosamente")
      console.log(`📊 Tickets respaldados: ${estadoCompleto.totalAtendidos}`)
      console.log(`📅 Fecha del backup: ${estadoCompleto.fechaInicio}`)

      return NextResponse.json({
        success: true,
        message: "Backup diario creado exitosamente",
        fecha: estadoCompleto.fechaInicio,
        ticketsRespaldados: estadoCompleto.totalAtendidos,
        horaEjecucion: new Date().toISOString(),
      })
    } else {
      console.log("ℹ️ No hay datos para respaldar (0 tickets)")

      return NextResponse.json({
        success: true,
        message: "No hay datos para respaldar",
        fecha: estadoCompleto.fechaInicio,
        ticketsRespaldados: 0,
        horaEjecucion: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ Error en backup automático diario:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear backup automático",
        details: error instanceof Error ? error.message : "Error desconocido",
        horaEjecucion: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
