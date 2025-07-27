import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

const ESTADO_KEY = "sistema:estado:v2"
const BACKUP_PREFIX = "sistema:backup:"

export async function GET() {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PLATFORM: "Vercel KV (Redis) - Optimizado",
        VERCEL_ENV: process.env.VERCEL_ENV || "development",
      },
      redis: {
        url: process.env.KV_REST_API_URL ? "Configurado" : "No configurado",
        token: process.env.KV_REST_API_TOKEN ? "Configurado" : "No configurado",
      },
    }

    // Test de conexión mínimo
    try {
      const estado = await kv.get(ESTADO_KEY)
      debug.redis.connection = "Exitosa"

      if (estado) {
        debug.redis.estadoActual = {
          numeroActual: estado.numeroActual,
          ultimoNumero: estado.ultimoNumero,
          totalAtendidos: estado.totalAtendidos,
          numerosLlamados: estado.numerosLlamados,
          totalTickets: estado.tickets?.length || 0,
          fechaInicio: estado.fechaInicio,
          lastSync: estado.lastSync ? new Date(estado.lastSync).toISOString() : "N/A",
        }

        debug.redis.integridad = {
          ticketsCountMatch: estado.tickets?.length === estado.totalAtendidos,
          numeroActualValido: estado.numeroActual > estado.ultimoNumero,
          numerosLlamadosValido: estado.numerosLlamados <= estado.totalAtendidos,
        }
      } else {
        debug.redis.estadoActual = "No encontrado"
      }

      // Información de optimización
      debug.redis.optimizaciones = {
        cacheServidor: "Activo (30s TTL)",
        throttling: "Activo (5s mínimo entre requests)",
        backupsAsync: "Activo (no bloquean operaciones)",
        locksEliminados: "Sistema sin locks para reducir requests",
      }
    } catch (error) {
      debug.redis.connection = `Error: ${error instanceof Error ? error.message : "Error desconocido"}`

      // Verificar si es error de límite de requests
      if (error instanceof Error && error.message.includes("max requests limit")) {
        debug.redis.limitExceeded = true
        debug.redis.recommendation = "Sistema optimizado para usar localStorage como caché principal"
      }
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en debug",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
