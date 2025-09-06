import { redis } from "@/lib/database"

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  latency: number
  details: {
    ping: boolean
    read: boolean
    write: boolean
    connection: boolean
    errors: string[]
  }
}

export async function checkUpstashHealth(): Promise<HealthStatus> {
  const startTime = Date.now()
  const errors: string[] = []
  let ping = false
  let read = false
  let write = false
  let connection = false

  try {
    // Test 1: Ping
    try {
      await redis.ping()
      ping = true
      connection = true
    } catch (error) {
      errors.push(`Ping failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    // Test 2: Read operation
    try {
      await redis.get("health_check_test")
      read = true
    } catch (error) {
      errors.push(`Read failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    // Test 3: Write operation
    try {
      await redis.set("health_check_test", Date.now().toString(), { ex: 60 })
      write = true
    } catch (error) {
      errors.push(`Write failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  } catch (error) {
    errors.push(`Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  const latency = Date.now() - startTime

  let status: "healthy" | "degraded" | "unhealthy"
  if (ping && read && write) {
    status = "healthy"
  } else if (connection && (read || write)) {
    status = "degraded"
  } else {
    status = "unhealthy"
  }

  return {
    status,
    latency,
    details: {
      ping,
      read,
      write,
      connection,
      errors,
    },
  }
}
