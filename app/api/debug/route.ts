import { NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET() {
  try {
    const fecha = new Date().toISOString().split("T")[0]

    // Obtener información de debug
    const [estado, tickets, historial, ping] = await Promise.all([
      redis.get(`sistema:estado:${fecha}`).catch((e) => ({ error: e.message })),
      redis.get(`sistema:tickets:${fecha}`).catch((e) => ({ error: e.message })),
      redis.get(`sistema:historial:${fecha}`).catch((e) => ({ error: e.message })),
      redis.ping().catch((e) => ({ error: e.message })),
    ])

    const debug = {
      timestamp: new Date().toISOString(),
      fecha,
      redis: {
        ping,
        connected: ping === "PONG",
      },
      data: {
        estado,
        tickets,
        historial,
      },
      env: {
        hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      },
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
