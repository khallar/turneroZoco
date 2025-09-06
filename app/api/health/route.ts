import { NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export async function GET() {
  try {
    const healthResult = await checkUpstashHealth()

    const statusCode = healthResult.status === "healthy" ? 200 : healthResult.status === "degraded" ? 206 : 503

    return NextResponse.json(healthResult, { status: statusCode })
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
