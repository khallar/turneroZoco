import { NextResponse } from "next/server"
import { verificarConexionDB, leerEstadoSistema, getTodayDateString } from "@/lib/database"

export async function GET() {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PLATFORM: "TURNOS_ZOCO (Upstash Redis)",
        VERCEL_ENV: process.env.VERCEL_ENV || "development",
        VERCEL_REGION: process.env.VERCEL_REGION || "unknown",
      },
      upstash: {
        availableVars: {
          KV_REST_API_URL: process.env.KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
          KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
          UPSTASH_REDIS_REST_URL: process.env.KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
          UPSTASH_REDIS_REST_TOKEN: process.env.KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
          TURNOS_KV_REST_API_URL: process.env.TURNOS_KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
          TURNOS_KV_REST_API_TOKEN: process.env.TURNOS_KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
          REDIS_URL: process.env.REDIS_URL ? "✓ Configurado" : "✗ No configurado",
        },
        type: "Upstash Redis",
        name: "TURNOS_ZOCO",
        keyPrefixes: {
          state: "TURNOS_ZOCO:estado:",
          tickets: "TURNOS_ZOCO:tickets:",
          backup: "TURNOS_ZOCO:backup:",
          counter: "TURNOS_ZOCO:counter:",
          logs: "TURNOS_ZOCO:logs",
        },
      },
    }

    // Test de conexión detallado
    try {
      const connectionTest = await verificarConexionDB()
      debug.upstash.connection = connectionTest.details

      if (connectionTest.connected) {
        // Obtener estado actual
        const estado = await leerEstadoSistema()

        debug.upstash.estadoActual = {
          numeroActual: estado.numeroActual,
          ultimoNumero: estado.ultimoNumero,
          totalAtendidos: estado.totalAtendidos,
          numerosLlamados: estado.numerosLlamados,
          totalTickets: estado.tickets?.length || 0,
          fechaInicio: estado.fechaInicio,
          lastSync: estado.lastSync ? new Date(estado.lastSync).toISOString() : "N/A",
        }

        // Verificar integridad
        debug.upstash.integridad = {
          ticketsCountMatch: estado.tickets?.length === estado.totalAtendidos,
          numeroActualValido: estado.numeroActual > estado.ultimoNumero,
          numerosLlamadosValido: estado.numerosLlamados <= estado.totalAtendidos,
          fechaValida: estado.fechaInicio === getTodayDateString(),
        }

        // Mostrar algunos tickets de ejemplo
        if (estado.tickets && estado.tickets.length > 0) {
          debug.upstash.ticketsEjemplo = estado.tickets.slice(-3).map((t) => ({
            numero: t.numero,
            nombre: t.nombre.substring(0, 20) + (t.nombre.length > 20 ? "..." : ""),
            fecha: t.fecha,
            timestamp: new Date(t.timestamp).toISOString(),
          }))
        }

        // Información de rendimiento
        debug.upstash.performance = {
          persistencia: "Automática con Upstash",
          durabilidad: "Alta (replicación automática)",
          escalabilidad: "Horizontal con Upstash",
          backupsAutomaticos: "Diarios con limpieza automática",
          transaccionesAtomicas: "Pipeline y MULTI/EXEC",
          compresion: "Automática",
          ssl: "TLS 1.2+",
        }
      } else {
        debug.upstash.estadoActual = "No se pudo conectar"
        debug.upstash.error = connectionTest.details
      }
    } catch (error) {
      debug.upstash.connection = {
        status: "Error",
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      }
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en debug - TURNOS_ZOCO (Upstash Redis)",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
