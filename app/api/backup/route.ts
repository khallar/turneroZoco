import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET() {
  try {
    // Obtener todos los datos del sistema
    const [numeroActual, numeroLlamado, cola, historial, configuracion] = await Promise.all([
      redis.get("numero_actual"),
      redis.get("numero_llamado"),
      redis.lrange("cola_atencion", 0, -1),
      redis.lrange("historial_diario", 0, -1),
      redis.hgetall("configuracion_sistema"),
    ])

    const backup = {
      timestamp: new Date().toISOString(),
      fecha: new Date().toLocaleDateString("es-ES"),
      datos: {
        numero_actual: numeroActual || 0,
        numero_llamado: numeroLlamado || 0,
        cola_atencion: cola || [],
        historial_diario: historial || [],
        configuracion_sistema: configuracion || {},
      },
    }

    return NextResponse.json({
      success: true,
      backup,
      mensaje: "Backup generado exitosamente",
    })
  } catch (error) {
    console.error("Error al generar backup:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar backup",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { backup } = await request.json()

    if (!backup || !backup.datos) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos de backup inválidos",
        },
        { status: 400 },
      )
    }

    // Restaurar datos
    const pipeline = redis.pipeline()

    if (backup.datos.numero_actual !== undefined) {
      pipeline.set("numero_actual", backup.datos.numero_actual)
    }

    if (backup.datos.numero_llamado !== undefined) {
      pipeline.set("numero_llamado", backup.datos.numero_llamado)
    }

    if (backup.datos.cola_atencion && Array.isArray(backup.datos.cola_atencion)) {
      pipeline.del("cola_atencion")
      if (backup.datos.cola_atencion.length > 0) {
        pipeline.lpush("cola_atencion", ...backup.datos.cola_atencion)
      }
    }

    if (backup.datos.historial_diario && Array.isArray(backup.datos.historial_diario)) {
      pipeline.del("historial_diario")
      if (backup.datos.historial_diario.length > 0) {
        pipeline.lpush("historial_diario", ...backup.datos.historial_diario)
      }
    }

    if (backup.datos.configuracion_sistema && typeof backup.datos.configuracion_sistema === "object") {
      pipeline.del("configuracion_sistema")
      const config = backup.datos.configuracion_sistema
      for (const [key, value] of Object.entries(config)) {
        pipeline.hset("configuracion_sistema", key, value as string)
      }
    }

    await pipeline.exec()

    return NextResponse.json({
      success: true,
      mensaje: "Backup restaurado exitosamente",
    })
  } catch (error) {
    console.error("Error al restaurar backup:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al restaurar backup",
      },
      { status: 500 },
    )
  }
}
