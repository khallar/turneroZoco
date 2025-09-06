import { NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET() {
  try {
    // Obtener información del sistema
    const [numeroActual, numeroLlamado, cola, historial, configuracion] = await Promise.all([
      redis.get("numero_actual"),
      redis.get("numero_llamado"),
      redis.lrange("cola_atencion", 0, -1),
      redis.lrange("historial_diario", 0, 50), // Últimos 50 registros
      redis.hgetall("configuracion_sistema"),
    ])

    const debug = {
      timestamp: new Date().toISOString(),
      redis_status: "connected",
      datos: {
        numero_actual: numeroActual,
        numero_llamado: numeroLlamado,
        cola_length: cola?.length || 0,
        cola_items: cola || [],
        historial_length: historial?.length || 0,
        historial_recent: historial?.slice(0, 10) || [],
        configuracion: configuracion || {},
      },
      estadisticas: {
        tickets_en_cola: cola?.length || 0,
        tickets_procesados_hoy: historial?.length || 0,
        ultimo_numero_generado: numeroActual || 0,
        ultimo_numero_llamado: numeroLlamado || 0,
      },
    }

    return NextResponse.json({
      success: true,
      debug,
    })
  } catch (error) {
    console.error("Error en debug:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        redis_status: "error",
      },
      { status: 500 },
    )
  }
}
