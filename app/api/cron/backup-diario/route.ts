import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, crearBackupDiario } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60 // 60 segundos máximo

export async function GET(request: NextRequest) {
  try {
    console.log("🤖🤖🤖 CRON JOB EJECUTÁNDOSE 🤖🤖🤖")
    console.log("⏰ Hora de ejecución (UTC):", new Date().toUTCString())
    console.log(
      "⏰ Hora de ejecución (Argentina):",
      new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
    )

    // Verificar autenticación (opcional)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log("❌ Unauthorized: Token inválido")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      console.log("✅ Autenticación exitosa")
    } else {
      console.log("⚠️ CRON_SECRET no configurado - endpoint público")
    }

    // Obtener el estado completo del sistema
    console.log("📖 Leyendo estado del sistema...")
    const estadoCompleto = await leerEstadoSistema()

    console.log("📊 Estado leído:")
    console.log(`   - Total Tickets: ${estadoCompleto.totalAtendidos}`)
    console.log(`   - Fecha Inicio: ${estadoCompleto.fechaInicio}`)
    console.log(`   - Tickets Atendidos: ${estadoCompleto.numerosLlamados}`)

    // Solo crear backup si hay datos
    if (estadoCompleto.totalAtendidos > 0) {
      console.log("💾 Creando backup automático...")
      await crearBackupDiario(estadoCompleto)

      console.log("✅✅✅ BACKUP AUTOMÁTICO CREADO EXITOSAMENTE ✅✅✅")
      console.log(`📊 Tickets respaldados: ${estadoCompleto.totalAtendidos}`)
      console.log(`📅 Fecha del backup: ${estadoCompleto.fechaInicio}`)

      return NextResponse.json({
        success: true,
        message: "Backup diario creado exitosamente por CRON",
        fecha: estadoCompleto.fechaInicio,
        ticketsRespaldados: estadoCompleto.totalAtendidos,
        horaEjecucion: new Date().toISOString(),
        horaEjecucionArgentina: new Date().toLocaleString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
        }),
      })
    } else {
      console.log("ℹ️ No hay datos para respaldar (0 tickets)")

      return NextResponse.json({
        success: true,
        message: "No hay datos para respaldar",
        fecha: estadoCompleto.fechaInicio,
        ticketsRespaldados: 0,
        horaEjecucion: new Date().toISOString(),
        horaEjecucionArgentina: new Date().toLocaleString("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
        }),
      })
    }
  } catch (error) {
    console.error("❌❌❌ ERROR EN BACKUP AUTOMÁTICO ❌❌❌")
    console.error("Error details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack")

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

// Permitir POST también para pruebas manuales
export async function POST(request: NextRequest) {
  console.log("📨 POST recibido - redirigiendo a GET")
  return GET(request)
}
