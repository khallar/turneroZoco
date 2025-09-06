import { NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET() {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      upstash: {
        connection: {
          status: "checking...",
        },
      },
    }

    // Test Redis connection
    try {
      const pingResult = await redis.ping()
      debugInfo.upstash.connection = {
        status: "healthy",
        ping: pingResult,
      }
    } catch (error) {
      debugInfo.upstash.connection = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug endpoint error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
