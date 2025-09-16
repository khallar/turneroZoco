import { Redis } from "@upstash/redis"

// Función para verificar la salud de Upstash Redis
export async function checkUpstashHealth(): Promise<{
  status: "healthy" | "unhealthy"
  details: any
  timestamp: string
}> {
  try {
    // Obtener configuración de Redis
    const redisUrl = process.env.KV_REST_API_URL || process.env.KV_REST_API_URL
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN

    if (!redisUrl || !redisToken) {
      return {
        status: "unhealthy",
        details: {
          error: "Missing Redis configuration",
          hasUrl: !!redisUrl,
          hasToken: !!redisToken,
        },
        timestamp: new Date().toISOString(),
      }
    }

    // Crear cliente Redis
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    // Test de conectividad
    const startTime = Date.now()
    const testKey = `health_check_${Date.now()}`
    const testValue = "ping"

    // Realizar operaciones de prueba
    await redis.set(testKey, testValue, { ex: 10 }) // Expira en 10 segundos
    const result = await redis.get(testKey)
    await redis.del(testKey)

    const responseTime = Date.now() - startTime

    if (result === testValue) {
      return {
        status: "healthy",
        details: {
          responseTime: `${responseTime}ms`,
          operations: ["SET", "GET", "DEL"],
          endpoint: redisUrl.substring(0, 50) + "...",
          testPassed: true,
        },
        timestamp: new Date().toISOString(),
      }
    } else {
      return {
        status: "unhealthy",
        details: {
          error: "Test value mismatch",
          expected: testValue,
          received: result,
          responseTime: `${responseTime}ms`,
        },
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    return {
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : "Unknown",
      },
      timestamp: new Date().toISOString(),
    }
  }
}
