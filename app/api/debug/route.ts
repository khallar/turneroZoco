import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Inicializar Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function GET() {
  try {
    // Información de debug
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        KV_URL_EXISTS: !!process.env.KV_REST_API_URL,
        KV_TOKEN_EXISTS: !!process.env.KV_REST_API_TOKEN,
      },
      redis: {
        url: process.env.KV_REST_API_URL ? "Configurado" : "No configurado",
        token: process.env.KV_REST_API_TOKEN ? "Configurado" : "No configurado",
      },
    }

    // Probar conexión a Redis
    try {
      await redis.ping()
      debug.redis.connection = "Exitosa"

      // Obtener algunas claves para verificar
      const keys = await redis.keys("sistema:*")
      debug.redis.keys = keys

      // Obtener estado actual si existe
      const estado = await redis.get("sistema:estado")
      debug.redis.estado = estado ? "Existe" : "No existe"
    } catch (error) {
      debug.redis.connection = `Error: ${error instanceof Error ? error.message : "Error desconocido"}`
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en debug",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
