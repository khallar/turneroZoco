import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

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
    const redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.exp(retryCount) * 50,
      },
    })

    // Escanear todas las claves con prefijo TURNOS_ZOCO
    const allKeys: string[] = []
    let cursor = 0

    do {
      const result = await redis.scan(cursor, {
        match: "TURNOS_ZOCO:*",
        count: 100,
      })

      if (Array.isArray(result) && result.length >= 2) {
        cursor = result[0] as number
        const keys = result[1] as string[]
        allKeys.push(...keys)
      } else {
        break
      }
    } while (cursor !== 0)

    console.log(`🔍 Encontradas ${allKeys.length} claves con prefijo TURNOS_ZOCO`)

    // Categorizar las claves
    const estadosDiarios = allKeys.filter((key) => key.includes(":estado:")).length
    const listasTickets = allKeys.filter((key) => key.includes(":tickets:")).length
    const backups = allKeys.filter((key) => key.includes(":backup:")).length
    const contadores = allKeys.filter((key) => key.includes(":counter:")).length
    const logs = allKeys.filter((key) => key.includes(":logs")).length

    // Extraer fechas únicas
    const fechasEncontradas = new Set<string>()
    allKeys.forEach((key) => {
      const match = key.match(/(\d{4}-\d{2}-\d{2})/)
      if (match) {
        fechasEncontradas.add(match[1])
      }
    })

    // Obtener información detallada de algunas claves
    const detallesClaves = []
    for (const key of allKeys.slice(0, 20)) {
      // Limitar a 20 para evitar timeouts
      try {
        const tipo = await redis.type(key)
        let tamaño = 0

        if (tipo === "string") {
          const valor = await redis.get(key)
          tamaño = JSON.stringify(valor).length
        } else if (tipo === "list") {
          tamaño = await redis.llen(key)
        }

        detallesClaves.push({
          clave: key,
          tipo,
          tamaño,
        })
      } catch (error) {
        console.error(`Error al inspeccionar clave ${key}:`, error)
        detallesClaves.push({
          clave: key,
          tipo: "error",
          tamaño: 0,
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    // Verificar conectividad básica
    const pingResult = await redis.ping()

    const resultado = {
      success: true,
      conexion: {
        configuracion: redisConfig.name,
        ping: pingResult,
        timestamp: new Date().toISOString(),
      },
      resumen: {
        totalClaves: allKeys.length,
        estadosDiarios,
        listasTickets,
        backups,
        contadores,
        logs,
        fechasEncontradas: Array.from(fechasEncontradas).sort(),
      },
      detallesClaves: detallesClaves,
      clavesCompletas: allKeys.slice(0, 50), // Mostrar solo las primeras 50
      diagnostico: {
        hayDatos: allKeys.length > 0,
        hayBackups: backups > 0,
        hayEstados: estadosDiarios > 0,
        hayTickets: listasTickets > 0,
        fechasConDatos: Array.from(fechasEncontradas).length,
      },
    }

    console.log("✅ Inspección de Redis completada")
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("❌ Error al inspeccionar Redis:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al inspeccionar Redis",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
