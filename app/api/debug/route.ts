import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, verificarConexionDB } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Iniciando debug del sistema...")

    // Verificar conexión a la base de datos
    const conexion = await verificarConexionDB()

    // Leer estado actual
    let estadoActual = null
    let errorEstado = null

    try {
      estadoActual = await leerEstadoSistema()
    } catch (error) {
      errorEstado = error instanceof Error ? error.message : "Error desconocido"
    }

    // Información del entorno
    const entorno = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      hasUpstashUrl: !!process.env.KV_REST_API_URL,
      hasUpstashToken: !!process.env.KV_REST_API_TOKEN,
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN,
      timestamp: new Date().toISOString(),
    }

    const debugInfo = {
      conexion,
      estadoActual,
      errorEstado,
      entorno,
      sistema: {
        version: "5.2",
        timestamp: new Date().toISOString(),
        runtime: process.env.VERCEL_ENV || "development",
      },
    }

    console.log("✅ Debug completado")

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("❌ Error en debug:", error)

    return NextResponse.json(
      {
        error: "Error en debug del sistema",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
