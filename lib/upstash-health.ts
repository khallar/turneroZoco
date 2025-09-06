import { redis } from "@/lib/database"

export interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded"
  latency: number
  timestamp: string
  details: {
    ping: boolean
    read: boolean
    write: boolean
    errors: string[]
  }
}

export async function checkUpstashHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let pingSuccess = false
  let readSuccess = false
  let writeSuccess = false

  try {
    // Test 1: Ping
    try {
      const pingResult = await redis.ping()
      pingSuccess = pingResult === "PONG"
      if (!pingSuccess) {
        errors.push(`Ping failed: expected PONG, got ${pingResult}`)
      }
    } catch (error) {
      errors.push(`Ping error: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Test 2: Write
    const testKey = `health_check_${Date.now()}`
    const testValue = `test_${Math.random()}`

    try {
      await redis.set(testKey, testValue, { ex: 60 })
      writeSuccess = true
    } catch (error) {
      errors.push(`Write error: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Test 3: Read
    if (writeSuccess) {
      try {
        const readValue = await redis.get(testKey)
        readSuccess = readValue === testValue
        if (!readSuccess) {
          errors.push(`Read failed: expected ${testValue}, got ${readValue}`)
        }

        // Cleanup
        try {
          await redis.del(testKey)
        } catch (cleanupError) {
          // Non-critical error
        }
      } catch (error) {
        errors.push(`Read error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    const latency = Date.now() - startTime

    let status: "healthy" | "unhealthy" | "degraded"
    if (pingSuccess && readSuccess && writeSuccess) {
      status = "healthy"
    } else if (pingSuccess) {
      status = "degraded"
    } else {
      status = "unhealthy"
    }

    return {
      status,
      latency,
      timestamp: new Date().toISOString(),
      details: {
        ping: pingSuccess,
        read: readSuccess,
        write: writeSuccess,
        errors,
      },
    }
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: {
        ping: false,
        read: false,
        write: false,
        errors: [`Critical error: ${error instanceof Error ? error.message : String(error)}`],
      },
    }
  }
}
