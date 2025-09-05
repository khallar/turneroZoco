import { redis } from "./database"

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy"
  responseTime: number
  details: {
    ping: boolean
    read: boolean
    write: boolean
    delete: boolean
    pipeline: boolean
    region?: string
    timestamp: string
  }
  errors: string[]
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const details = {
    ping: false,
    read: false,
    write: false,
    delete: false,
    pipeline: false,
    timestamp: new Date().toISOString(),
  }

  try {
    // Test 1: Ping
    try {
      await redis.ping()
      details.ping = true
      console.log("✅ Upstash Ping: OK")
    } catch (error) {
      errors.push(`Ping failed: ${error}`)
      console.log("❌ Upstash Ping: FAILED")
    }

    // Test 2: Write operation
    const testKey = `TURNOS_ZOCO:health:${Date.now()}`
    const testValue = `health_${Math.random()}`

    try {
      await redis.set(testKey, testValue, { ex: 60 })
      details.write = true
      console.log("✅ Upstash Write: OK")
    } catch (error) {
      errors.push(`Write failed: ${error}`)
      console.log("❌ Upstash Write: FAILED")
    }

    // Test 3: Read operation
    try {
      const result = await redis.get(testKey)
      if (result === testValue) {
        details.read = true
        console.log("✅ Upstash Read: OK")
      } else {
        errors.push(`Read mismatch: expected ${testValue}, got ${result}`)
        console.log("❌ Upstash Read: MISMATCH")
      }
    } catch (error) {
      errors.push(`Read failed: ${error}`)
      console.log("❌ Upstash Read: FAILED")
    }

    // Test 4: Delete operation
    try {
      await redis.del(testKey)
      details.delete = true
      console.log("✅ Upstash Delete: OK")
    } catch (error) {
      errors.push(`Delete failed: ${error}`)
      console.log("❌ Upstash Delete: FAILED")
    }

    // Test 5: Pipeline operation
    try {
      const pipeline = redis.pipeline()
      pipeline.set(`${testKey}:pipeline`, "test")
      pipeline.get(`${testKey}:pipeline`)
      pipeline.del(`${testKey}:pipeline`)

      const results = await pipeline.exec()
      if (Array.isArray(results) && results.length === 3) {
        details.pipeline = true
        console.log("✅ Upstash Pipeline: OK")
      } else {
        errors.push("Pipeline returned unexpected results")
        console.log("❌ Upstash Pipeline: UNEXPECTED RESULTS")
      }
    } catch (error) {
      errors.push(`Pipeline failed: ${error}`)
      console.log("❌ Upstash Pipeline: FAILED")
    }
  } catch (error) {
    errors.push(`Health check failed: ${error}`)
  }

  const responseTime = Date.now() - startTime
  const healthyChecks = Object.values(details).filter((v) => v === true).length
  const totalChecks = Object.keys(details).length - 1 // Exclude timestamp

  let status: "healthy" | "degraded" | "unhealthy"
  if (healthyChecks === totalChecks) {
    status = "healthy"
  } else if (healthyChecks >= totalChecks * 0.6) {
    status = "degraded"
  } else {
    status = "unhealthy"
  }

  console.log(`🏥 Health Check Complete: ${status.toUpperCase()} (${healthyChecks}/${totalChecks} checks passed)`)
  console.log(`⚡ Response time: ${responseTime}ms`)

  return {
    status,
    responseTime,
    details,
    errors,
  }
}

export async function checkUpstashHealth(): Promise<{
  status: "healthy" | "unhealthy"
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()

    // Test básico de ping
    await redis.ping()

    const latency = Date.now() - start

    return {
      status: "healthy",
      latency,
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function getUpstashInfo(): Promise<{
  region: string
  endpoint: string
  ssl: boolean
  version: string
}> {
  try {
    // Extraer información de la URL de conexión
    const url = process.env.KV_REST_API_URL || process.env.KV_REST_API_URL || ""

    let region = "unknown"
    if (url.includes("us1-")) region = "US East (Virginia)"
    else if (url.includes("us2-")) region = "US West (Oregon)"
    else if (url.includes("eu1-")) region = "EU West (Ireland)"
    else if (url.includes("eu2-")) region = "EU Central (Frankfurt)"
    else if (url.includes("ap1-")) region = "Asia Pacific (Singapore)"

    return {
      region,
      endpoint: url.replace(/^https?:\/\//, "").split("/")[0],
      ssl: url.startsWith("https://"),
      version: "REST API v1",
    }
  } catch (error) {
    return {
      region: "unknown",
      endpoint: "unknown",
      ssl: false,
      version: "unknown",
    }
  }
}
