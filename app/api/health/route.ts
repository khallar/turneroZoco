import { NextResponse } from "next/server"
import { verificarConexionDB } from "@/lib/database"

export async function GET() {
  try {
    const healthCheck = await verificarConexionDB()

    return NextResponse.json({
      status: healthCheck.connected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      details: healthCheck.details,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
