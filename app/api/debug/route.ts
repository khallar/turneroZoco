import { NextResponse } from "next/server"
import { verificarConexionDB, leerEstadoSistema } from "@/lib/database"

export async function GET() {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PLATFORM: "sistemaTurnosZOCO (Upstash Redis)", // Actualizado
        VERCEL_ENV: process.env.VERCEL_ENV || "development",
      },
      database: {
        availableVars: {
          UPSTASH_REDIS_REST_URL: process.env.KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
          UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? "✓ Configurado" : "✗ No configurado",
          TURNOS_KV_REST_API_URL: process.env.TURNOS_KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
          TURNOS_KV_REST_API_TOKEN: process.env.TURNOS_KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
          KV_REST_API_URL: process.env.KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
          KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
        },
        type: "Upstash Redis", // Actualizado
        name: "sistemaTurnosZOCO",
      },
    }

    // Test de conexión a la base de datos
    try {
      const conexionOK = await verificarConexionDB()
      debug.database.connection = conexionOK ? "Exitosa" : "Fallida"

      if (conexionOK) {
        // Obtener estado actual
        const estado = await leerEstadoSistema()

        debug.database.estadoActual = {
          numeroActual: estado.numeroActual,
          ultimoNumero: estado.ultimoNumero,
          totalAtendidos: estado.totalAtendidos,
          numerosLlamados: estado.numerosLlamados,
          totalTickets: estado.tickets?.length || 0,
          fechaInicio: estado.fechaInicio,
          lastSync: estado.lastSync ? new Date(estado.lastSync).toISOString() : "N/A",
        }

        // Verificar integridad (adaptado para Redis)
        debug.database.integridad = {
          ticketsCountMatch: estado.tickets?.length === estado.totalAtendidos,
          numeroActualValido: estado.numeroActual > estado.ultimoNumero,
          numerosLlamadosValido: estado.numerosLlamados <= estado.totalAtendidos,
        }

        // Mostrar algunos tickets de ejemplo
        if (estado.tickets && estado.tickets.length > 0) {
          debug.database.ticketsEjemplo = estado.tickets.slice(0, 3).map((t) => ({
            numero: t.numero,
            nombre: t.nombre,
            fecha: t.fecha,
          }))
        }

        // Información de optimización (adaptado para Redis)
        debug.database.optimizaciones = {
          transaccionesAtomicas: "Activo (MULTI/EXEC para contadores)",
          persistencia: "En memoria con persistencia de Upstash",
          escalabilidad: "Horizontal con Upstash",
          backupsAutomaticos: "Diarios con limpieza automática (en Redis)",
          logs: "Sistema de auditoría básico (en Redis)",
        }
      } else {
        debug.database.estadoActual = "No se pudo conectar"
      }
    } catch (error) {
      debug.database.connection = `Error: ${error instanceof Error ? error.message : "Error desconocido"}`
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en debug - sistemaTurnosZOCO (Upstash Redis)",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
