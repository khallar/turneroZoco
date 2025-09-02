import { NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export async function GET() {
  try {
    const healthCheck = await checkUpstashHealth()

    const status = healthCheck.connected ? 200 : 503

    return NextResponse.json(
      {
        status: healthCheck.connected ? "healthy" : "unhealthy",
        ...healthCheck,
      },
      { status },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
