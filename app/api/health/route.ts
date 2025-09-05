import { NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export async function GET() {
  try {
    const health = await checkUpstashHealth()

    return NextResponse.json({
      status: health.connected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      upstash: health,
      version: "5.3",
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
        version: "5.3",
      },
      { status: 500 },
    )
  }
}
