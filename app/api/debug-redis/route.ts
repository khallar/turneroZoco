import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Información de variables de entorno (sin mostrar valores sensibles)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      hasUpstashUrl: !!process.env.KV_REST_API_URL,
      hasUpstashToken: !!process.env.KV_REST_API_TOKEN,
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN,
      hasTurnosUrl: !!process.env.TURNOS_KV_REST_API_URL,
      hasTurnosToken: !!process.env.TURNOS_KV_REST_API_TOKEN,
      hasRedisUrl: !!process.env.REDIS_URL,
      hasRedisToken: !!process.env.REDIS_TOKEN,
    }

    // Información de configuración de Redis (parcial por seguridad)
    let redisInfo = null
    try {
      const configs = [
        {
          name: "UPSTASH_REDIS_REST",
          hasUrl: !!process.env.KV_REST_API_URL,
          hasToken: !!process.env.KV_REST_API_TOKEN,
          urlPrefix: process.env.KV_REST_API_URL?.substring(0, 30) + "..." || "N/A",
        },
        {
          name: "KV_REST_API",
          hasUrl: !!process.env.KV_REST_API_URL,
          hasToken: !!process.env.KV_REST_API_TOKEN,
          urlPrefix: process.env.KV_REST_API_URL?.substring(0, 30) + "..." || "N/A",
        },
        {
          name: "TURNOS_KV_REST_API",
          hasUrl: !!process.env.TURNOS_KV_REST_API_URL,
          hasToken: !!process.env.TURNOS_KV_REST_API_TOKEN,
          urlPrefix: process.env.TURNOS_KV_REST_API_URL?.substring(0, 30) + "..." || "N/A",
        },
      ]

      redisInfo = configs
    } catch (error) {
      redisInfo = { error: "Error al obtener información de Redis" }
    }

    // Test de conexión básico
    let connectionTest = null
    try {
      const { Redis } = await import("@upstash/redis")

      // Intentar con la configuración principal
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const redis = new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        })

        const testKey = `debug_test_${Date.now()}`
        const testValue = "debug_test_value"

        await redis.set(testKey, testValue, { ex: 10 })
        const result = await redis.get(testKey)
        await redis.del(testKey)

        connectionTest = {
          success: result === testValue,
          config: "UPSTASH_REDIS_REST",
          testPassed: result === testValue,
        }
      } else {
        connectionTest = {
          success: false,
          error: "No hay configuración válida de Redis",
        }
      }
    } catch (error) {
      connectionTest = {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: envInfo,
      redisConfigs: redisInfo,
      connectionTest,
      system: {
        version: "5.2",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en debug de Redis",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
