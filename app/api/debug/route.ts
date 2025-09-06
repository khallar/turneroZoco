import { NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET() {
  try {
    console.log("🔍 Iniciando debug de Redis...")

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        UPSTASH_REDIS_REST_URL: process.env.KV_REST_API_URL ? "Configurado" : "No configurado",
        UPSTASH_REDIS_REST_TOKEN: process.env.KV_REST_API_TOKEN ? "Configurado" : "No configurado",
        KV_REST_API_URL: process.env.KV_REST_API_URL ? "Configurado" : "No configurado",
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "Configurado" : "No configurado",
      },
      tests: {},
    }

    // Test 1: Ping
    try {
      const pingStart = Date.now()
      const pingResult = await redis.ping()
      const pingTime = Date.now() - pingStart
      debugInfo.tests.ping = {
        success: true,
        result: pingResult,
        responseTime: pingTime + "ms",
      }
    } catch (error) {
      debugInfo.tests.ping = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Test 2: Set/Get
    try {
      const testKey = "debug_test_" + Date.now()
      const testValue = "debug_value_" + Math.random()

      const setStart = Date.now()
      await redis.set(testKey, testValue, { ex: 30 })
      const setTime = Date.now() - setStart

      const getStart = Date.now()
      const getValue = await redis.get(testKey)
      const getTime = Date.now() - getStart

      await redis.del(testKey)

      debugInfo.tests.setGet = {
        success: getValue === testValue,
        setTime: setTime + "ms",
        getTime: getTime + "ms",
        valueMatch: getValue === testValue,
        expectedValue: testValue,
        actualValue: getValue,
      }
    } catch (error) {
      debugInfo.tests.setGet = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Test 3: Keys scan
    try {
      const scanStart = Date.now()
      const keys = await redis.keys("TURNOS_ZOCO:*")
      const scanTime = Date.now() - scanStart

      debugInfo.tests.keysScan = {
        success: true,
        keysFound: Array.isArray(keys) ? keys.length : 0,
        responseTime: scanTime + "ms",
        sampleKeys: Array.isArray(keys) ? keys.slice(0, 5) : [],
      }
    } catch (error) {
      debugInfo.tests.keysScan = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("Error en debug:", error)
    return NextResponse.json(
      {
        error: "Error en debug",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
