import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  crearBackupDiario,
  obtenerEstadisticas,
  verificarConexionDB,
  limpiarDatosAntiguos,
  getTodayDateString,
} from "@/lib/database"
import { invalidateCache } from "@/lib/cache-manager"

export async function GET(request: NextRequest) {
  try {
    console.log("📖 GET /api/sistema - Leyendo estado del sistema...")

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("stats") === "true"
    const forceRefresh = searchParams.get("refresh") === "true"

    if (forceRefresh) {
      console.log("🔄 Forzando actualización de datos...")
      invalidateCache()
    }

    const estadoCompleto = await leerEstadoSistema()

    let estadisticas = null
    if (includeStats) {
      estadisticas = await obtenerEstadisticas(estadoCompleto)
    }

    const response = {
      success: true,
      estado: {
        numeroActual: estadoCompleto.numeroActual,
        ultimoNumero: estadoCompleto.ultimoNumero,
        totalAtendidos: estadoCompleto.totalAtendidos,
        numerosLlamados: estadoCompleto.numerosLlamados,
        fechaInicio: estadoCompleto.fechaInicio,
        ultimoReinicio: estadoCompleto.ultimoReinicio,
        lastSync: estadoCompleto.lastSync,
        tickets: estadoCompleto.tickets,
      },
      estadisticas,
      timestamp: new Date().toISOString(),
    }

    console.log("✅ Estado leído exitosamente")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Error al leer estado:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al leer el estado del sistema",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, nombre } = body

    console.log(`🎯 POST /api/sistema - Acción: ${action}`)

    switch (action) {
      case "GENERAR_TICKET": {
        if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Nombre es requerido y debe ser una cadena válida",
            },
            { status: 400 },
          )
        }

        const nuevoTicket = await generarTicketAtomico(nombre.trim())
        invalidateCache()

        console.log("✅ Ticket generado:", nuevoTicket.numero)
        return NextResponse.json({
          success: true,
          ticket: nuevoTicket,
          timestamp: new Date().toISOString(),
        })
      }

      case "LLAMAR_SIGUIENTE": {
        const estadoCompleto = await leerEstadoSistema()

        if (estadoCompleto.numerosLlamados >= estadoCompleto.totalAtendidos) {
          return NextResponse.json(
            {
              success: false,
              error: "No hay más tickets para llamar",
            },
            { status: 400 },
          )
        }

        const nuevoEstado = {
          ...estadoCompleto,
          numerosLlamados: estadoCompleto.numerosLlamados + 1,
        }

        await escribirEstadoSistema(nuevoEstado)
        invalidateCache()

        const ticketLlamado = estadoCompleto.tickets[estadoCompleto.numerosLlamados]

        console.log("✅ Siguiente ticket llamado:", ticketLlamado?.numero)
        return NextResponse.json({
          success: true,
          ticketLlamado,
          numerosLlamados: nuevoEstado.numerosLlamados,
          timestamp: new Date().toISOString(),
        })
      }

      case "REINICIAR_CONTADOR_DIARIO": {
        console.log("🔄 Iniciando reinicio de contador diario...")

        // Leer estado actual antes de reiniciar
        const estadoActual = await leerEstadoSistema()

        // Crear backup del día actual antes de reiniciar
        if (estadoActual.totalAtendidos > 0) {
          console.log("📦 Creando backup antes del reinicio...")
          await crearBackupDiario(estadoActual)
        }

        // Crear nuevo estado para el día
        const fechaHoy = getTodayDateString()
        const nuevoEstado = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: fechaHoy,
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(nuevoEstado)
        invalidateCache()

        console.log("✅ Contador diario reiniciado exitosamente")
        return NextResponse.json({
          success: true,
          message: "Contador diario reiniciado exitosamente",
          nuevoEstado,
          backupCreado: estadoActual.totalAtendidos > 0,
          timestamp: new Date().toISOString(),
        })
      }

      case "ELIMINAR_TODOS_REGISTROS": {
        console.log("🗑️ Iniciando eliminación de todos los registros...")

        // Leer estado actual antes de eliminar
        const estadoActual = await leerEstadoSistema()

        // Crear backup antes de eliminar (si hay datos)
        if (estadoActual.totalAtendidos > 0) {
          console.log("📦 Creando backup antes de eliminar...")
          await crearBackupDiario(estadoActual)
        }

        // Limpiar datos antiguos y actuales
        await limpiarDatosAntiguos()

        // Crear estado completamente nuevo
        const fechaHoy = getTodayDateString()
        const estadoLimpio = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: fechaHoy,
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(estadoLimpio)
        invalidateCache()

        console.log("✅ Todos los registros eliminados exitosamente")
        return NextResponse.json({
          success: true,
          message: "Todos los registros han sido eliminados exitosamente",
          backupCreado: estadoActual.totalAtendidos > 0,
          timestamp: new Date().toISOString(),
        })
      }

      case "CREAR_BACKUP_MANUAL": {
        console.log("📦 Creando backup manual...")

        const estadoCompleto = await leerEstadoSistema()

        if (estadoCompleto.totalAtendidos === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "No hay datos para respaldar (0 tickets emitidos)",
            },
            { status: 400 },
          )
        }

        await crearBackupDiario(estadoCompleto)

        console.log("✅ Backup manual creado exitosamente")
        return NextResponse.json({
          success: true,
          message: "Backup creado exitosamente",
          fecha: estadoCompleto.fechaInicio,
          ticketsIncluidos: estadoCompleto.totalAtendidos,
          timestamp: new Date().toISOString(),
        })
      }

      case "VERIFICAR_CONEXION": {
        const resultado = await verificarConexionDB()
        return NextResponse.json({
          success: resultado.connected,
          ...resultado,
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Acción no reconocida: ${action}`,
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
