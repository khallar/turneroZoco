import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"

const ESTADO_KEY = "sistema:estado"
const LOCK_KEY = "sistema:lock"
const BACKUP_PREFIX = "sistema:backup:"

export async function GET() {
  try {
    // Información de debug
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PLATFORM: "Vercel KV (Redis)",
        VERCEL_ENV: process.env.VERCEL_ENV || "development",
      },
      redis: {
        url: process.env.KV_REST_API_URL ? "Configurado" : "No configurado",
        token: process.env.KV_REST_API_TOKEN ? "Configurado" : "No configurado",
      },
    }

    // Probar conexión a Redis
    try {
      // Test de conexión
      await kv.set("test:debug", "ok", { ex: 10 })
      const testResult = await kv.get("test:debug")
      await kv.del("test:debug")

      debug.redis.connection = testResult === "ok" ? "Exitosa" : "Fallida"

      // Obtener estado actual
      const estado = await kv.get(ESTADO_KEY)
      if (estado) {
        debug.redis.estadoActual = {
          numeroActual: estado.numeroActual,
          ultimoNumero: estado.ultimoNumero,
          totalAtendidos: estado.totalAtendidos,
          numerosLlamados: estado.numerosLlamados,
          totalTickets: estado.tickets?.length || 0,
          fechaInicio: estado.fechaInicio,
          ultimoReinicio: estado.ultimoReinicio,
        }

        // Verificar integridad
        debug.redis.integridad = {
          ticketsCountMatch: estado.tickets?.length === estado.totalAtendidos,
          numeroActualValido: estado.numeroActual > estado.ultimoNumero,
          numerosLlamadosValido: estado.numerosLlamados <= estado.totalAtendidos,
        }

        // Mostrar algunos tickets de ejemplo
        if (estado.tickets && estado.tickets.length > 0) {
          debug.redis.ticketsEjemplo = estado.tickets.slice(0, 3).map((t) => ({
            numero: t.numero,
            nombre: t.nombre,
            fecha: t.fecha,
          }))
        }
      } else {
        debug.redis.estadoActual = "No encontrado"
      }

      // Verificar lock
      const lockStatus = await kv.get(LOCK_KEY)
      debug.redis.lockStatus = lockStatus ? `Activo desde ${new Date(lockStatus).toISOString()}` : "Libre"

      // Contar backups
      const backupKeys = await kv.keys(`${BACKUP_PREFIX}*`)
      debug.redis.backupsCount = backupKeys.length
      debug.redis.backupKeys = backupKeys.slice(0, 5) // Mostrar solo los primeros 5

      // Información adicional de Redis
      debug.redis.keys = {
        estado: ESTADO_KEY,
        lock: LOCK_KEY,
        backupPrefix: BACKUP_PREFIX,
      }
    } catch (error) {
      debug.redis.connection = `Error: ${error instanceof Error ? error.message : "Error desconocido"}`
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
