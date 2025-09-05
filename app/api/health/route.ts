import { NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export async function GET() {
  try {
    const health = await checkUpstashHealth()

    const response = {
      status: health.status,
      timestamp: new Date().toISOString(),
      upstash: health,
      version: "5.2",
    }

    return NextResponse.json(response, {
      status: health.status === "healthy" ? 200 : 503,
    })
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
