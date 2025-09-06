import { redis } from "./database"

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded"
  latency: number
  timestamp: string
  details: {
    connection: boolean
    operations: {
      set: boolean
      get: boolean
      delete: boolean
    }
    error?: string
  }
}

export async function checkUpstashHealth(): Promise<HealthStatus> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  const healthCheck: HealthStatus = {
    status: "unhealthy",
    latency: 0,
    timestamp,
    details: {
      connection: false,
      operations: {
        set: false,
        get: false,
        delete: false,
      },
    },
  }

  try {
    // Test basic connection with PING
    await redis.ping()
    healthCheck.details.connection = true

    // Test SET operation
    const testKey = `health_check_${Date.now()}`
    const testValue = "test_value"

    await redis.set(testKey, testValue, { ex: 10 }) // Expire in 10 seconds
    healthCheck.details.operations.set = true

    // Test GET operation
    const retrievedValue = await redis.get(testKey)
    if (retrievedValue === testValue) {
      healthCheck.details.operations.get = true
    }

    // Test DELETE operation
    await redis.del(testKey)
    healthCheck.details.operations.delete = true

    // Calculate latency
    healthCheck.latency = Date.now() - startTime

    // Determine overall status
    const allOperationsSuccessful =
      healthCheck.details.connection &&
      healthCheck.details.operations.set &&
      healthCheck.details.operations.get &&
      healthCheck.details.operations.delete

    if (allOperationsSuccessful) {
      healthCheck.status = healthCheck.latency > 1000 ? "degraded" : "healthy"
    } else {
      healthCheck.status = "degraded"
    }
  } catch (error) {
    healthCheck.latency = Date.now() - startTime
    healthCheck.details.error = error instanceof Error ? error.message : "Unknown error"
    healthCheck.status = "unhealthy"
  }

  return healthCheck
}

export async function getRedisInfo() {
  try {
    const info = await redis.info()
    return {
      success: true,
      info: info,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
