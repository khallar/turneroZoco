import { type NextRequest, NextResponse } from "next/server"
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

// Inicializar cliente Redis
let redis: Redis
try {
  const redisConfig = getRedisConfig()
  redis = new Redis({
    url: redisConfig.url,
    token: redisConfig.token,
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.exp(retryCount) * 50,
    },
    automaticDeserialization: true,
  })
} catch (error) {
  console.error("❌ Error al inicializar cliente Redis:", error)
  redis = new Redis({
    url: "https://mock-redis.upstash.io",
    token: "mock-token",
  })
}

// Prefijos para las claves de Redis
const STATE_KEY_PREFIX = "TURNOS_ZOCO:estado:"
const TICKETS_LIST_KEY_PREFIX = "TURNOS_ZOCO:tickets:"
const BACKUP_KEY_PREFIX = "TURNOS_ZOCO:backup:"
const COUNTER_KEY_PREFIX = "TURNOS_ZOCO:counter:"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Iniciando diagnóstico de Redis...")

    // Escanear todas las claves con los prefijos del sistema
    const allKeys: string[] = []
    const prefixes = [STATE_KEY_PREFIX, TICKETS_LIST_KEY_PREFIX, BACKUP_KEY_PREFIX, COUNTER_KEY_PREFIX]

    for (const prefix of prefixes) {
      let cursor = 0
      do {
        const result = await redis.scan(cursor, {
          match: prefix + "*",
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
    }

    console.log(`🔍 Total de claves encontradas: ${allKeys.length}`)

    // Clasificar las claves por tipo
    const estadosDiarios = allKeys.filter((key) => key.startsWith(STATE_KEY_PREFIX))
    const listasTickets = allKeys.filter((key) => key.startsWith(TICKETS_LIST_KEY_PREFIX))
    const backups = allKeys.filter((key) => key.startsWith(BACKUP_KEY_PREFIX))
    const contadores = allKeys.filter((key) => key.startsWith(COUNTER_KEY_PREFIX))

    // Extraer fechas únicas
    const fechasEncontradas = new Set<string>()

    allKeys.forEach((key) => {
      // Extraer la fecha de la clave (formato YYYY-MM-DD al final)
      const parts = key.split(":")
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechasEncontradas.add(lastPart)
      }
    })

    // Obtener información detallada de algunos backups
    const backupDetails: any[] = []
    const backupKeys = backups.slice(0, 5) // Solo los primeros 5 para no sobrecargar

    if (backupKeys.length > 0) {
      const multi = redis.multi()
      for (const key of backupKeys) {
        multi.get(key)
      }
      const results = await multi.exec()

      if (Array.isArray(results)) {
        results.forEach((backup: any, index) => {
          if (backup && typeof backup === "object") {
            const fecha = backupKeys[index].replace(BACKUP_KEY_PREFIX, "")
            backupDetails.push({
              fecha,
              ticketsEmitidos: backup.resumen?.totalTicketsEmitidos || 0,
              ticketsAtendidos: backup.resumen?.totalTicketsAtendidos || 0,
              tieneTickets: !!(backup.tickets && backup.tickets.length > 0),
              cantidadTickets: backup.tickets ? backup.tickets.length : 0,
            })
          }
        })
      }
    }

    // Obtener información del día actual
    const fechaHoy = new Date().toISOString().split("T")[0]
    const estadoHoyKey = STATE_KEY_PREFIX + fechaHoy
    const ticketsHoyKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
    const contadorHoyKey = COUNTER_KEY_PREFIX + fechaHoy

    const [estadoHoy, ticketsHoy, contadorHoy] = await redis
      .multi()
      .get(estadoHoyKey)
      .llen(ticketsHoyKey)
      .get(contadorHoyKey)
      .exec()

    const diagnostico = {
      // Resumen general
      resumen: {
        totalClaves: allKeys.length,
        estadosDiarios: estadosDiarios.length,
        listasTickets: listasTickets.length,
        backups: backups.length,
        contadores: contadores.length,
        fechasUnicas: fechasEncontradas.size,
      },

      // Fechas encontradas
      fechasEncontradas: Array.from(fechasEncontradas).sort().reverse(),

      // Detalles de backups
      backupDetails,

      // Estado del día actual
      estadoHoy: {
        fecha: fechaHoy,
        tieneEstado: !!estadoHoy,
        cantidadTickets: typeof ticketsHoy === "number" ? ticketsHoy : 0,
        contador: typeof contadorHoy === "number" ? contadorHoy : 0,
        estadoDetalle:
          estadoHoy && typeof estadoHoy === "object"
            ? {
                totalAtendidos: estadoHoy.totalAtendidos || 0,
                numerosLlamados: estadoHoy.numerosLlamados || 0,
                numeroActual: estadoHoy.numeroActual || 0,
                ultimoNumero: estadoHoy.ultimoNumero || 0,
              }
            : null,
      },

      // Claves por tipo (para debugging)
      clavesPorTipo: {
        estados: estadosDiarios,
        tickets: listasTickets,
        backups: backups,
        contadores: contadores,
      },

      // Información de conexión
      conexion: {
        timestamp: new Date().toISOString(),
        configuracion: "Redis conectado exitosamente",
      },
    }

    console.log("✅ Diagnóstico completado:", {
      totalClaves: diagnostico.resumen.totalClaves,
      backups: diagnostico.resumen.backups,
      fechas: diagnostico.resumen.fechasUnicas,
    })

    return NextResponse.json(diagnostico)
  } catch (error) {
    console.error("❌ Error en diagnóstico de Redis:", error)
    return NextResponse.json(
      {
        error: "Error al diagnosticar Redis",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
