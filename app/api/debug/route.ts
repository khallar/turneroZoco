import { NextResponse } from "next/server"
import { checkUpstashHealth, testRedisOperations } from "@/lib/upstash-health"
import { verificarConexionDB } from "@/lib/database"

export async function GET() {
  try {
    console.log("🔍 Iniciando diagnóstico completo del sistema...")

    // Test de salud de Upstash
    const upstashHealth = await checkUpstashHealth()

    // Test de operaciones Redis
    const redisOps = await testRedisOperations()

    // Test de conexión de base de datos
    const dbConnection = await verificarConexionDB()

    // Información del entorno
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN,
      timestamp: new Date().toISOString(),
    }

    const diagnostico = {
      success: true,
      upstashHealth,
      redisOperations: redisOps,
      databaseConnection: dbConnection,
      environment: envInfo,
      summary: {
        allSystemsOperational: upstashHealth.connected && redisOps.success && dbConnection.connected,
        issues: [],
      },
    }

    // Identificar problemas
    if (!upstashHealth.connected) {
      diagnostico.summary.issues.push("Upstash connection failed")
    }
    if (!redisOps.success) {
      diagnostico.summary.issues.push("Redis operations failed")
    }
    if (!dbConnection.connected) {
      diagnostico.summary.issues.push("Database connection failed")
    }

    console.log("✅ Diagnóstico completado")
    return NextResponse.json(diagnostico)
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error durante el diagnóstico",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
