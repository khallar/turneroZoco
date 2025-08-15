import { NextResponse } from "next/server"
import { performHealthCheck, getUpstashInfo } from "@/lib/upstash-health"
import { Redis } from "@upstash/redis"

// Crear cliente Redis para health check
let redis: Redis
try {
  const upstashUrl = process.env.KV_REST_API_URL || process.env.KV_REST_API_URL
  const upstashToken = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN

  if (upstashUrl && upstashToken) {
    redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.exp(retryCount) * 100,
      },
    })
    console.log("✅ Health Check Redis client initialized")
  } else {
    throw new Error("No Redis configuration found for health check")
  }
} catch (error) {
  console.error("Failed to initialize Redis for health check:", error)
}

export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        {
          status: "unhealthy",
          error: "Redis client not initialized",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }

    const [healthCheck, upstashInfo] = await Promise.all([performHealthCheck(redis), getUpstashInfo()])

    const response = {
      service: "TURNOS_ZOCO",
      database: "Upstash Redis",
      ...healthCheck,
      upstash: upstashInfo,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
      },
    }

    const statusCode = healthCheck.status === "healthy" ? 200 : healthCheck.status === "degraded" ? 200 : 503

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
