import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { redis } from "@/lib/database"

// Función para obtener las variables de entorno correctas
function getRedisConfig() {
  const configs = [
    {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      name: "UPSTASH_REDIS_REST (Principal)",
    },
    {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      name: "KV_REST_API",
    },
    {
      url: process.env.TURNOS_KV_REST_API_URL,
      token: process.env.TURNOS_KV_REST_API_TOKEN,
      name: "TURNOS_KV_REST_API",
    },
    {
      url: process.env.REDIS_URL?.replace("rediss://", "https://").replace(":6379", ""),
      token: process.env.REDIS_TOKEN,
      name: "REDIS_URL (Convertido)",
    },
  ]

  for (const config of configs) {
    if (config.url && config.token) {
      return { url: config.url, token: config.token, name: config.name }
    }
  }

  throw new Error("No se encontraron variables de entorno válidas para Upstash Redis")
}

export async function GET() {
  try {
    console.log("🔍 Iniciando inspección de Redis...")

    const redisConfig = getRedisConfig()

    // Test básico de conexión
    const pingResult = await redis.ping()

    // Test de escritura y lectura
    const testKey = `test:${Date.now()}`
    const testValue = { message: "test", timestamp: new Date().toISOString() }

    await redis.set(testKey, testValue, { ex: 60 }) // Expira en 60 segundos
    const readValue = await redis.get(testKey)

    // Limpiar el test
    await redis.del(testKey)

    const redisInstance = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.exp(retryCount) * 50,
      },
      automaticDeserialization: true,
    })

    // Buscar todas las claves relacionadas con TURNOS_ZOCO
    const prefijos = [
      "TURNOS_ZOCO:estado:",
      "TURNOS_ZOCO:tickets:",
      "TURNOS_ZOCO:backup:",
      "TURNOS_ZOCO:counter:",
      "TURNOS_ZOCO:logs",
    ]

    const resultados = {
      configuracion: redisConfig.name,
      timestamp: new Date().toISOString(),
      estadosDiarios: 0,
      listasTickets: 0,
      backups: 0,
      contadores: 0,
      logs: 0,
      fechasEncontradas: new Set<string>(),
      detallesClaves: [],
      totalClaves: 0,
    }

    // Usar SCAN para obtener todas las claves de forma eficiente
    let cursor = 0
    const todasLasClaves: string[] = []

    do {
      const result = await redisInstance.scan(cursor, {
        match: "TURNOS_ZOCO:*",
        count: 100,
      })

      if (Array.isArray(result) && result.length >= 2) {
        cursor = result[0] as number
        const keys = result[1] as string[]
        todasLasClaves.push(...keys)
      } else {
        break
      }
    } while (cursor !== 0)

    console.log(`🔍 Encontradas ${todasLasClaves.length} claves con prefijo TURNOS_ZOCO`)

    // Analizar cada clave
    for (const clave of todasLasClaves) {
      try {
        // Obtener información de la clave
        const tipo = await redisInstance.type(clave)
        let tamaño = 0

        if (tipo === "string") {
          const valor = await redisInstance.get(clave)
          tamaño = JSON.stringify(valor).length
        } else if (tipo === "list") {
          tamaño = await redisInstance.llen(clave)
        }

        // Clasificar por tipo
        if (clave.includes(":estado:")) {
          resultados.estadosDiarios++
          const fecha = clave.split(":estado:")[1]
          if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            resultados.fechasEncontradas.add(fecha)
          }
        } else if (clave.includes(":tickets:")) {
          resultados.listasTickets++
          const fecha = clave.split(":tickets:")[1]
          if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            resultados.fechasEncontradas.add(fecha)
          }
        } else if (clave.includes(":backup:")) {
          resultados.backups++
          const fecha = clave.split(":backup:")[1]
          if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            resultados.fechasEncontradas.add(fecha)
          }
        } else if (clave.includes(":counter:")) {
          resultados.contadores++
          const fecha = clave.split(":counter:")[1]
          if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            resultados.fechasEncontradas.add(fecha)
          }
        } else if (clave.includes(":logs")) {
          resultados.logs++
        }

        // Agregar detalles de la clave
        resultados.detallesClaves.push({
          clave,
          tipo,
          tamaño,
          categoria: clave.includes(":estado:")
            ? "Estado"
            : clave.includes(":tickets:")
              ? "Tickets"
              : clave.includes(":backup:")
                ? "Backup"
                : clave.includes(":counter:")
                  ? "Contador"
                  : "Logs",
        })
      } catch (error) {
        console.error(`Error analizando clave ${clave}:`, error)
      }
    }

    resultados.totalClaves = todasLasClaves.length
    resultados.fechasEncontradas = Array.from(resultados.fechasEncontradas).sort()

    console.log("📊 Resumen de inspección:")
    console.log(`  - Estados diarios: ${resultados.estadosDiarios}`)
    console.log(`  - Listas de tickets: ${resultados.listasTickets}`)
    console.log(`  - Backups: ${resultados.backups}`)
    console.log(`  - Contadores: ${resultados.contadores}`)
    console.log(`  - Fechas encontradas: ${resultados.fechasEncontradas.length}`)

    return NextResponse.json({
      ...resultados,
      status: "success",
      ping: pingResult,
      writeTest: testValue,
      readTest: readValue,
      match: JSON.stringify(testValue) === JSON.stringify(readValue),
    })
  } catch (error) {
    console.error("❌ Error en inspección de Redis:", error)
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
