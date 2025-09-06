import { NextResponse } from "next/server"
import { redis } from "@/lib/database"

export async function GET() {
  try {
    console.log("🔍 Iniciando debug completo de Redis...")

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

    // Test 1: Ping básico
    try {
      const pingStart = Date.now()
      const pingResult = await redis.ping()
      const pingTime = Date.now() - pingStart
      debugInfo.tests.ping = {
        success: true,
        result: pingResult,
        responseTime: pingTime + "ms",
      }
      console.log("✅ Ping exitoso:", pingResult, `(${pingTime}ms)`)
    } catch (error) {
      debugInfo.tests.ping = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      console.error("❌ Ping falló:", error)
    }

    // Test 2: Set/Get básico
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
      console.log("✅ Set/Get exitoso:", { setTime, getTime, match: getValue === testValue })
    } catch (error) {
      debugInfo.tests.setGet = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      console.error("❌ Set/Get falló:", error)
    }

    // Test 3: Scan de claves del sistema
    try {
      const scanStart = Date.now()
      const keys = await redis.keys("TURNOS_ZOCO:*")
      const scanTime = Date.now() - scanStart

      debugInfo.tests.keysScan = {
        success: true,
        keysFound: Array.isArray(keys) ? keys.length : 0,
        responseTime: scanTime + "ms",
        sampleKeys: Array.isArray(keys) ? keys.slice(0, 10) : [],
        keysByType: {},
      }

      // Analizar tipos de claves
      if (Array.isArray(keys)) {
        const keysByType = {}
        keys.forEach((key) => {
          const parts = key.split(":")
          if (parts.length >= 3) {
            const type = parts[1] // estado, tickets, backup, etc.
            keysByType[type] = (keysByType[type] || 0) + 1
          }
        })
        debugInfo.tests.keysScan.keysByType = keysByType
      }

      console.log("✅ Scan exitoso:", {
        keysFound: Array.isArray(keys) ? keys.length : 0,
        scanTime,
      })
    } catch (error) {
      debugInfo.tests.keysScan = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      console.error("❌ Scan falló:", error)
    }

    // Test 4: Operaciones específicas del sistema
    try {
      const today = new Date().toISOString().split("T")[0]
      const estadoKey = `TURNOS_ZOCO:estado:${today}`
      const ticketsKey = `TURNOS_ZOCO:tickets:${today}`

      const systemStart = Date.now()
      const [estadoExists, ticketsExists, estadoValue] = await Promise.all([
        redis.exists(estadoKey),
        redis.exists(ticketsKey),
        redis.get(estadoKey),
      ])
      const systemTime = Date.now() - systemStart

      debugInfo.tests.systemKeys = {
        success: true,
        responseTime: systemTime + "ms",
        estadoExists: estadoExists === 1,
        ticketsExists: ticketsExists === 1,
        estadoValue: estadoValue ? "Presente" : "Ausente",
        todayKey: today,
      }
      console.log("✅ System keys check exitoso:", {
        estadoExists: estadoExists === 1,
        ticketsExists: ticketsExists === 1,
      })
    } catch (error) {
      debugInfo.tests.systemKeys = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      console.error("❌ System keys check falló:", error)
    }

    // Test 5: Operaciones de lista (para tickets)
    try {
      const listKey = "debug_list_" + Date.now()
      const listValues = ["item1", "item2", "item3"]

      const listStart = Date.now()
      await redis.rpush(listKey, ...listValues)
      const listItems = await redis.lrange(listKey, 0, -1)
      await redis.del(listKey)
      const listTime = Date.now() - listStart

      debugInfo.tests.listOperations = {
        success: Array.isArray(listItems) && listItems.length === listValues.length,
        responseTime: listTime + "ms",
        itemsAdded: listValues.length,
        itemsRetrieved: Array.isArray(listItems) ? listItems.length : 0,
        itemsMatch: JSON.stringify(listItems) === JSON.stringify(listValues),
      }
      console.log("✅ List operations exitoso:", {
        added: listValues.length,
        retrieved: Array.isArray(listItems) ? listItems.length : 0,
      })
    } catch (error) {
      debugInfo.tests.listOperations = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      console.error("❌ List operations falló:", error)
    }

    // Resumen general
    const successfulTests = Object.values(debugInfo.tests).filter((test) => test.success).length
    const totalTests = Object.keys(debugInfo.tests).length

    debugInfo.summary = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      overallHealth:
        successfulTests === totalTests
          ? "Excelente"
          : successfulTests >= totalTests * 0.8
            ? "Bueno"
            : successfulTests >= totalTests * 0.5
              ? "Regular"
              : "Crítico",
    }

    console.log("📊 Debug completado:", debugInfo.summary)

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("❌ Error crítico en debug:", error)
    return NextResponse.json(
      {
        error: "Error crítico en debug de Redis",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
