import { NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export async function GET() {
  try {
    const healthStatus = await checkUpstashHealth()

    const statusCode = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 200 : 503

    return NextResponse.json(healthStatus, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        latency: 0,
        details: {
          ping: false,
          read: false,
          write: false,
          connection: false,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      },
      { status: 503 },
    )
  }
}
