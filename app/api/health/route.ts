import { type NextRequest, NextResponse } from "next/server"
import { checkUpstashHealth } from "@/lib/upstash-health"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const health = await checkUpstashHealth()

    const response = {
      service: "Sistema de Turnos ZOCO",
      version: "5.2",
      ...health,
    }

    const status = health.status === "healthy" ? 200 : 503

    return NextResponse.json(response, { status })
  } catch (error) {
    return NextResponse.json(
      {
        service: "Sistema de Turnos ZOCO",
        version: "5.2",
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
