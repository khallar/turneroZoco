import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  crearBackupDiario,
  obtenerEstadisticas,
  verificarConexionDB,
  limpiarDatosAntiguos,
} from "@/lib/database"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string
  ultimoReinicio: string
  tickets: TicketInfo[]
  lastSync?: number
}

// Función para verificar si debe reiniciarse
function debeReiniciarse(estado: EstadoSistema): boolean {
  try {
    const ahora = new Date()
    const fechaActualArgentina = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
    const fechaHoyString = fechaActualArgentina.toISOString().split("T")[0]
    const fechaInicioString = estado.fechaInicio

    const esDiaDiferente = fechaHoyString !== fechaInicioString

    if (esDiaDiferente) {
      console.log(`🔄 Reinicio automático necesario: ${fechaHoyString} vs ${fechaInicioString}`)
      return true
    }

    return false
  } catch (error) {
    console.error("❌ Error verificando reinicio:", error)
    return false
  }
}

export async function GET() {
  try {
    console.log("\n=== 📥 GET /api/sistema - SISTEMATURNOSBD ===")

    // Verificar conexión a la base de datos
    const conexionOK = await verificarConexionDB()
    if (!conexionOK) {
      return NextResponse.json({ error: "Error de conexión a SISTEMATURNOSBD" }, { status: 503 })
    }

    let estado = await leerEstadoSistema()

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("🔄 Ejecutando reinicio automático")

      // Crear backup en background
      crearBackupDiario(estado).catch((err) => console.error("Error en backup:", err))

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estado)
    }

    console.log("📤 Estado devuelto desde SISTEMATURNOSBD:", {
      numeroActual: estado.numeroActual,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets?.length || 0,
    })

    return NextResponse.json(estado)
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor - SISTEMATURNOSBD",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n=== 📨 POST /api/sistema - SISTEMATURNOSBD ===")

    const body = await request.json()
    const { action, ...nuevoEstado } = body

    console.log("🎯 Acción recibida:", action)

    // Verificar conexión a la base de datos
    const conexionOK = await verificarConexionDB()
    if (!conexionOK) {
      return NextResponse.json({ error: "Error de conexión a SISTEMATURNOSBD" }, { status: 503 })
    }

    let estado = await leerEstadoSistema()

    // Verificar si debe reiniciarse antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("🔄 Reinicio automático durante POST")

      // Crear backup en background
      crearBackupDiario(estado).catch((err) => console.error("Error en backup:", err))

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }
    }

    // Acción especial para generar ticket de forma atómica
    if (action === "GENERAR_TICKET") {
      const { nombre } = body

      if (!nombre || typeof nombre !== "string") {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("🎫 Generando ticket para:", nombre)

      try {
        // Generar ticket de forma atómica en la base de datos
        const nuevoTicket = await generarTicketAtomico(nombre)

        // Leer el estado actualizado después de generar el ticket
        const estadoActualizado = await leerEstadoSistema()

        console.log("✅ Ticket generado exitosamente en SISTEMATURNOSBD")

        return NextResponse.json({
          ...estadoActualizado,
          ticketGenerado: nuevoTicket,
        })
      } catch (error) {
        console.error("❌ Error al generar ticket:", error)
        return NextResponse.json(
          {
            error: "Error al generar ticket en SISTEMATURNOSBD",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción para obtener estadísticas
    if (action === "OBTENER_ESTADISTICAS") {
      try {
        const estadisticas = await obtenerEstadisticas(estado)

        return NextResponse.json({
          ...estado,
          estadisticas,
        })
      } catch (error) {
        console.error("❌ Error al obtener estadísticas:", error)
        return NextResponse.json(
          {
            error: "Error al obtener estadísticas",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción administrativa: Eliminar todos los registros
    if (action === "ELIMINAR_TODOS_REGISTROS") {
      console.log("🗑️ Eliminando todos los registros...")

      try {
        // Crear backup antes de eliminar
        await crearBackupDiario(estado)

        const ahora = new Date()
        const estadoLimpio: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(estadoLimpio)
        console.log("✅ Todos los registros eliminados exitosamente")

        return NextResponse.json({
          ...estadoLimpio,
          mensaje: "Todos los registros han sido eliminados exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al eliminar registros:", error)
        return NextResponse.json(
          {
            error: "Error al eliminar registros",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción administrativa: Reiniciar contador diario
    if (action === "REINICIAR_CONTADOR_DIARIO") {
      console.log("🔄 Reiniciando contador diario...")

      try {
        // Crear backup antes de reiniciar
        await crearBackupDiario(estado)

        const ahora = new Date()
        const estadoReiniciado: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(estadoReiniciado)
        console.log("✅ Contador diario reiniciado exitosamente")

        return NextResponse.json({
          ...estadoReiniciado,
          mensaje: "Contador diario reiniciado exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al reiniciar contador:", error)
        return NextResponse.json(
          {
            error: "Error al reiniciar contador",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción de mantenimiento: Limpiar datos antiguos
    if (action === "LIMPIAR_DATOS_ANTIGUOS") {
      try {
        await limpiarDatosAntiguos()
        return NextResponse.json({
          mensaje: "Datos antiguos limpiados exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al limpiar datos antiguos:", error)
        return NextResponse.json(
          {
            error: "Error al limpiar datos antiguos",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Validar datos para actualizaciones normales
    if (
      typeof nuevoEstado.numeroActual !== "number" ||
      typeof nuevoEstado.totalAtendidos !== "number" ||
      typeof nuevoEstado.numerosLlamados !== "number" ||
      !Array.isArray(nuevoEstado.tickets)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    console.log("📝 Actualizando estado normal en SISTEMATURNOSBD")

    // Actualizar estado manteniendo fechas originales
    const estadoActualizado = {
      ...nuevoEstado,
      fechaInicio: estado.fechaInicio,
      ultimoReinicio: estado.ultimoReinicio,
      lastSync: Date.now(),
    }

    await escribirEstadoSistema(estadoActualizado)

    return NextResponse.json(estadoActualizado)
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor - SISTEMATURNOSBD",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
