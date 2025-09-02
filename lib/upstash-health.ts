import { Redis } from "@upstash/redis"

interface HealthCheckResult {
  connected: boolean
  latency?: number
  error?: string
  timestamp: string
  config?: string
}

// Función para obtener configuración de Redis
function getRedisConfig() {
  const configs = [
    {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      name: "UPSTASH_REDIS_REST",
    },
    {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      name: "KV_REST_API",
    },
  ]

  for (const config of configs) {
    if (config.url && config.token) {
      return config
    }
  }

  throw new Error("No Redis configuration found")
}

export async function checkUpstashHealth(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString()

  try {
    const config = getRedisConfig()
    const redis = new Redis({
      url: config.url,
      token: config.token,
    })

    const startTime = Date.now()

    // Test básico de conectividad
    const pingResult = await redis.ping()

    const latency = Date.now() - startTime

    if (pingResult === "PONG") {
      return {
        connected: true,
        latency,
        timestamp,
        config: config.name,
      }
    } else {
      return {
        connected: false,
        error: `Unexpected ping response: ${pingResult}`,
        timestamp,
        config: config.name,
      }
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp,
    }
  }
}

export async function testRedisOperations(): Promise<{
  success: boolean
  operations: Record<string, boolean>
  error?: string
}> {
  try {
    const config = getRedisConfig()
    const redis = new Redis({
      url: config.url,
      token: config.token,
    })

    const testKey = `health_check_${Date.now()}`
    const testValue = "test_value"

    const operations = {
      ping: false,
      set: false,
      get: false,
      del: false,
    }

    // Test PING
    const pingResult = await redis.ping()
    operations.ping = pingResult === "PONG"

    // Test SET
    await redis.set(testKey, testValue, { ex: 60 })
    operations.set = true

    // Test GET
    const getValue = await redis.get(testKey)
    operations.get = getValue === testValue

    // Test DEL
    await redis.del(testKey)
    operations.del = true

    return {
      success: Object.values(operations).every(Boolean),
      operations,
    }
  } catch (error) {
    return {
      success: false,
      operations: {
        ping: false,
        set: false,
        get: false,
        del: false,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
