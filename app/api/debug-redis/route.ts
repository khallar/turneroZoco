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
    console.log("🔍 Iniciando diagnóstico de Redis...")

    const redisConfig = getRedisConfig()
    const redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.exp(retryCount) * 100,
      },
    })

    // Prefijos de claves
    const STATE_KEY_PREFIX = "TURNOS_ZOCO:estado:"
    const TICKETS_LIST_KEY_PREFIX = "TURNOS_ZOCO:tickets:"
    const BACKUP_KEY_PREFIX = "TURNOS_ZOCO:backup:"
    const COUNTER_KEY_PREFIX = "TURNOS_ZOCO:counter:"

    // Buscar todas las claves con cada prefijo
    const [estadosKeys, ticketsKeys, backupsKeys, contadoresKeys] = await Promise.all([
      redis.keys(STATE_KEY_PREFIX + "*"),
      redis.keys(TICKETS_LIST_KEY_PREFIX + "*"),
      redis.keys(BACKUP_KEY_PREFIX + "*"),
      redis.keys(COUNTER_KEY_PREFIX + "*"),
    ])

    console.log("📊 Claves encontradas:")
    console.log("- Estados:", estadosKeys.length)
    console.log("- Tickets:", ticketsKeys.length)
    console.log("- Backups:", backupsKeys.length)
    console.log("- Contadores:", contadoresKeys.length)

    // Extraer fechas de las claves
    const fechasEncontradas = new Set<string>()

    // Extraer fechas de estados
    estadosKeys.forEach((key) => {
      const fecha = key.replace(STATE_KEY_PREFIX, "")
      if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechasEncontradas.add(fecha)
      }
    })

    // Extraer fechas de tickets
    ticketsKeys.forEach((key) => {
      const fecha = key.replace(TICKETS_LIST_KEY_PREFIX, "")
      if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechasEncontradas.add(fecha)
      }
    })

    // Extraer fechas de backups
    backupsKeys.forEach((key) => {
      const fecha = key.replace(BACKUP_KEY_PREFIX, "")
      if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechasEncontradas.add(fecha)
      }
    })

    // Extraer fechas de contadores
    contadoresKeys.forEach((key) => {
      const fecha = key.replace(COUNTER_KEY_PREFIX, "")
      if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechasEncontradas.add(fecha)
      }
    })

    const fechasArray = Array.from(fechasEncontradas).sort().reverse()

    // Obtener información detallada de algunos backups
    const backupsDetalle = []
    for (const key of backupsKeys.slice(0, 5)) {
      try {
        const backup = await redis.get(key)
        if (backup && typeof backup === "object") {
          const fecha = key.replace(BACKUP_KEY_PREFIX, "")
          backupsDetalle.push({
            fecha,
            ticketsEmitidos: backup.resumen?.totalTicketsEmitidos || 0,
            ticketsAtendidos: backup.resumen?.totalTicketsAtendidos || 0,
            tieneTickets: !!(backup.tickets && backup.tickets.length > 0),
            cantidadTickets: backup.tickets ? backup.tickets.length : 0,
          })
        }
      } catch (error) {
        console.error(`Error al obtener backup ${key}:`, error)
      }
    }

    // Información del día actual
    const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    const estadoHoyKey = STATE_KEY_PREFIX + fechaHoy
    const ticketsHoyKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
    const contadorHoyKey = COUNTER_KEY_PREFIX + fechaHoy

    let estadoHoy = null
    let ticketsHoy = []
    let contadorHoy = 0

    try {
      const [estado, tickets, contador] = await Promise.all([
        redis.get(estadoHoyKey),
        redis.lrange(ticketsHoyKey, 0, -1),
        redis.get(contadorHoyKey),
      ])

      estadoHoy = estado
      ticketsHoy = Array.isArray(tickets) ? tickets : []
      contadorHoy = typeof contador === "number" ? contador : 0
    } catch (error) {
      console.error("Error al obtener datos del día actual:", error)
    }

    const diagnostico = {
      timestamp: new Date().toISOString(),
      configuracion: {
        nombre: redisConfig.name,
        endpoint: redisConfig.url.substring(0, 50) + "...",
        region: redisConfig.url.includes("us1") ? "US East" : redisConfig.url.includes("eu1") ? "EU West" : "Global",
      },
      resumen: {
        estadosDiarios: estadosKeys.length,
        listasTickets: ticketsKeys.length,
        backups: backupsKeys.length,
        contadores: contadoresKeys.length,
        totalClaves: estadosKeys.length + ticketsKeys.length + backupsKeys.length + contadoresKeys.length,
      },
      fechasEncontradas: fechasArray,
      backupsDetalle,
      diaActual: {
        fecha: fechaHoy,
        tieneEstado: !!estadoHoy,
        tieneTickets: ticketsHoy.length > 0,
        cantidadTickets: ticketsHoy.length,
        contador: contadorHoy,
        estadoDetalle: estadoHoy
          ? {
              numeroActual: estadoHoy.numeroActual,
              ultimoNumero: estadoHoy.ultimoNumero,
              totalAtendidos: estadoHoy.totalAtendidos,
              numerosLlamados: estadoHoy.numerosLlamados,
            }
          : null,
      },
      clavesEjemplo: {
        estados: estadosKeys.slice(0, 3),
        tickets: ticketsKeys.slice(0, 3),
        backups: backupsKeys.slice(0, 3),
        contadores: contadoresKeys.slice(0, 3),
      },
    }

    console.log("✅ Diagnóstico completado")
    return NextResponse.json(diagnostico)
  } catch (error) {
    console.error("❌ Error en diagnóstico de Redis:", error)
    return NextResponse.json(
      {
        error: "Error al diagnosticar Redis",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
