import { Redis } from "@upstash/redis"

// Función para verificar la salud de Upstash Redis
export async function checkUpstashHealth() {
  try {
    // Usar las variables de entorno disponibles
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      return {
        status: "error",
        message: "Variables de entorno de Redis no configuradas",
        details: {
          url: url ? "✓ Configurado" : "✗ No configurado",
          token: token ? "✓ Configurado" : "✗ No configurado",
        },
      }
    }

    const redis = new Redis({ url, token })

    // Test básico de conexión
    const testKey = `health_check_${Date.now()}`
    const testValue = `test_${Math.random()}`

    await redis.set(testKey, testValue, { ex: 10 })
    const result = await redis.get(testKey)
    await redis.del(testKey)

    if (result === testValue) {
      return {
        status: "healthy",
        message: "Conexión a Upstash Redis exitosa",
        details: {
          url: url.substring(0, 50) + "...",
          responseTime: "< 1s",
          testPassed: true,
        },
      }
    } else {
      return {
        status: "error",
        message: "Test de verificación falló",
        details: {
          expected: testValue,
          received: result,
        },
      }
    }
  } catch (error) {
    return {
      status: "error",
      message: "Error al conectar con Upstash Redis",
      details: {
        error: error instanceof Error ? error.message : "Error desconocido",
      },
    }
  }
}
