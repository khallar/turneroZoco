import { NextResponse } from "next/server"
import {
  inicializarEstadoSistema,
  leerEstadoSistema,
  generarTicketAtomico,
  obtenerEstadisticas,
  marcarTicketComoLlamado,
  redis, // Importar la instancia de redis
  KEY_PREFIX_ESTADO, // Importar prefijos de clave
  KEY_PREFIX_TICKETS,
  KEY_PREFIX_ULTIMO_NUMERO_EMITIDO_TEMP,
} from "@/lib/database"

// GET: Obtener el estado actual del sistema y estadísticas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("stats") === "true"

    const estado = await leerEstadoSistema()
    let responseData: any = { estado }

    if (includeStats) {
      const estadisticas = await obtenerEstadisticas()
      responseData = { ...responseData, estadisticas }
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Error al obtener el estado del sistema:", error)
    return NextResponse.json(
      { message: "Error al obtener el estado del sistema", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// POST: Generar un nuevo ticket
export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()
    if (!nombre) {
      return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 })
    }

    const nuevoTicket = await generarTicketAtomico(nombre)

    if (!nuevoTicket) {
      throw new Error("No se pudo generar el ticket.")
    }

    return NextResponse.json({ message: "Ticket generado exitosamente", ticket: nuevoTicket }, { status: 201 })
  } catch (error) {
    console.error("Error al generar ticket:", error)
    return NextResponse.json({ message: "Error al generar ticket", error: (error as Error).message }, { status: 500 })
  }
}

// PUT: Actualizar el estado del sistema (ej. llamar siguiente número, reiniciar)
export async function PUT(request: Request) {
  try {
    const { action, payload } = await request.json()

    if (action === "callTicket") {
      const { numeroTicket, fechaInicioOperaciones } = payload
      if (!numeroTicket || !fechaInicioOperaciones) {
        return NextResponse.json(
          { message: "Número de ticket y fecha de inicio son requeridos para llamar." },
          { status: 400 },
        )
      }
      await marcarTicketComoLlamado(numeroTicket, fechaInicioOperaciones)
      const estadoActualizado = await leerEstadoSistema()
      return NextResponse.json(
        { message: `Ticket ${numeroTicket} marcado como llamado.`, estado: estadoActualizado },
        { status: 200 },
      )
    }

    // Para otras acciones como reiniciar el sistema
    if (action === "reset") {
      const nuevoEstado = await inicializarEstadoSistema()
      return NextResponse.json({ message: "Sistema reiniciado exitosamente", estado: nuevoEstado }, { status: 200 })
    }

    return NextResponse.json({ message: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error al actualizar el estado del sistema:", error)
    return NextResponse.json(
      { message: "Error al actualizar el estado del sistema", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE: Reiniciar el sistema (alias para PUT con acción reset)
export async function DELETE(request: Request) {
  try {
    // Al reiniciar, eliminamos todas las claves relacionadas con el estado y los tickets
    await redis.del(KEY_PREFIX_ESTADO)
    await redis.del(KEY_PREFIX_TICKETS)
    await redis.del(KEY_PREFIX_ULTIMO_NUMERO_EMITIDO_TEMP) // Asegurarse de limpiar el contador temporal

    const nuevoEstado = await inicializarEstadoSistema() // Re-inicializar para el nuevo día/sesión

    return NextResponse.json({ message: "Sistema reiniciado exitosamente", estado: nuevoEstado }, { status: 200 })
  } catch (error) {
    console.error("Error al reiniciar el sistema:", error)
    return NextResponse.json(
      { message: "Error al reiniciar el sistema", error: (error as Error).message },
      { status: 500 },
    )
  }
}
