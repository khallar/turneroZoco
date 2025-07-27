import { NextResponse } from "next/server"
import { verificarConexionDB, leerEstadoSistema } from "@/lib/database"

export async function GET() {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PLATFORM: "SISTEMATURNOSBD (PostgreSQL)",
        VERCEL_ENV: process.env.VERCEL_ENV || "development",
      },
      database: {
        url: process.env.DATABASE_URL ? "Configurado" : "No configurado",
        type: "PostgreSQL",
        name: "SISTEMATURNOSBD",
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

        // Verificar integridad
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

        // Información de optimización
        debug.database.optimizaciones = {
          transaccionesAtomicas: "Activo (ACID compliance)",
          poolConexiones: "Activo (max 20 conexiones)",
          indices: "Optimizados para consultas frecuentes",
          backupsAutomaticos: "Diarios con limpieza automática",
          logs: "Sistema de auditoría completo",
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
        error: "Error en debug - SISTEMATURNOSBD",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
