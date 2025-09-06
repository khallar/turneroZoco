import { NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export async function GET() {
  try {
    const healthStatus = await checkUpstashHealth()

    const statusCode = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 200 : 503

    return NextResponse.json(
      {
        service: "ZOCO Sistema de Atención",
        version: "5.2.0",
        ...healthStatus,
      },
      { status: statusCode },
    )
  } catch (error) {
    return NextResponse.json(
      {
        service: "ZOCO Sistema de Atención",
        version: "5.2.0",
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
