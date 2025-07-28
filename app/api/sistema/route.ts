import { NextResponse } from "next/server"
import {
  leerEstadoSistema,
  guardarEstadoSistema,
  generarTicketAtomico,
  obtenerEstadisticas,
  obtenerDebugInfo,
  redis, // Importar la instancia de redis
  KEY_PREFIX_ESTADO, // Importar prefijos de clave
} from "@/lib/database"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
  calledTimestamp?: number
}

interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string
  ultimoReinicio: string
  tickets: TicketInfo[] // Mantener aquí para la consistencia del tipo en la API
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
      console.log(`🔄 Reinicio automático necesario (Upstash Redis): ${fechaHoyString} vs ${fechaInicioString}`)
      return true
    }

    return false
  } catch (error) {
    console.error("❌ Error verificando reinicio (Upstash Redis):", error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("stats") === "true"
    const includeDebug = searchParams.get("debug") === "true"

    const estado = await leerEstadoSistema()
    const response: any = { estado }

    if (includeStats) {
      response.estadisticas = await obtenerEstadisticas()
    }
    if (includeDebug) {
      response.debugInfo = await obtenerDebugInfo()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error en GET /api/sistema:", error)
    return NextResponse.json(
      { error: "Error al obtener el estado del sistema", details: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()
    if (!nombre) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const nuevoTicket = await generarTicketAtomico(nombre)

    if (nuevoTicket) {
      return NextResponse.json({ success: true, ticket: nuevoTicket })
    } else {
      return NextResponse.json({ success: false, error: "No se pudo generar el ticket" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error en POST /api/sistema:", error)
    return NextResponse.json(
      { error: "Error al generar el ticket", details: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { action, numero, fechaInicio } = await request.json()

    if (action === "reset") {
      // Reiniciar el sistema
      const hoy = new Date().toISOString().split("T")[0]
      const nuevoEstado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: hoy,
        tickets: [],
      }
      await guardarEstadoSistema(nuevoEstado)
      // También resetear la clave temporal de incremento si existe
      await redis.set("ultimo_numero_emitido_temp", 0)
      return NextResponse.json({ success: true, message: "Sistema reiniciado" })
    } else if (action === "callTicket") {
      // Marcar un ticket como llamado
      if (typeof numero !== "number" || !fechaInicio) {
        return NextResponse.json(
          { error: "Número de ticket y fecha de inicio son requeridos para llamar" },
          { status: 400 },
        )
      }
      const estado = await leerEstadoSistema()
      const ticketIndex = estado.tickets.findIndex((t) => t.numero === numero)

      if (ticketIndex !== -1) {
        // Actualizar el timestamp de llamado
        estado.tickets[ticketIndex].calledTimestamp = Date.now()
        estado.numerosLlamados = Math.max(estado.numerosLlamados, numero) // Asegurar que numerosLlamados no retroceda
        await guardarEstadoSistema(estado)
        return NextResponse.json({ success: true, message: `Ticket ${numero} marcado como llamado` })
      } else {
        return NextResponse.json({ success: false, error: `Ticket ${numero} no encontrado` }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error en PUT /api/sistema:", error)
    return NextResponse.json(
      { error: "Error al actualizar el estado del sistema", details: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    // Eliminar la clave de estado principal
    await redis.del(KEY_PREFIX_ESTADO)
    // Eliminar la clave temporal de incremento
    await redis.del("ultimo_numero_emitido_temp")
    console.log("Todos los datos del sistema han sido eliminados de Redis.")
    return NextResponse.json({ success: true, message: "Todos los datos del sistema han sido eliminados." })
  } catch (error) {
    console.error("Error en DELETE /api/sistema:", error)
    return NextResponse.json(
      { error: "Error al eliminar los datos del sistema", details: (error as Error).message },
      { status: 500 },
    )
  }
}
