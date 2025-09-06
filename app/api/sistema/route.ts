import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, escribirEstadoSistema, generarTicketAtomico, getTodayDateString } from "@/lib/database"

export async function GET() {
  try {
    console.log("📡 API GET /sistema - Leyendo estado del sistema...")

    const estadoCompleto = await leerEstadoSistema()

    console.log("✅ Estado leído exitosamente:", {
      totalTickets: estadoCompleto.tickets.length,
      numeroActual: estadoCompleto.numeroActual,
      totalAtendidos: estadoCompleto.totalAtendidos,
    })

    return NextResponse.json({
      success: true,
      estado: {
        numeroActual: estadoCompleto.numeroActual,
        ultimoNumero: estadoCompleto.ultimoNumero,
        totalAtendidos: estadoCompleto.totalAtendidos,
        numerosLlamados: estadoCompleto.numerosLlamados,
        fechaInicio: estadoCompleto.fechaInicio,
        ultimoReinicio: estadoCompleto.ultimoReinicio,
        lastSync: estadoCompleto.lastSync,
      },
      tickets: estadoCompleto.tickets,
    })
  } catch (error) {
    console.error("❌ Error al leer estado, intentando recuperación:", error)

    try {
      // Intentar crear un estado inicial si hay error
      const fechaHoy = getTodayDateString()
      const estadoInicial = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estadoInicial)

      return NextResponse.json({
        success: true,
        estado: estadoInicial,
        tickets: [],
        warning: "Estado inicializado debido a error de lectura",
      })
    } catch (recoveryError) {
      console.error("❌ Error en recuperación:", recoveryError)
      return NextResponse.json(
        {
          error: "Error crítico del sistema",
          details: error instanceof Error ? error.message : "Error desconocido",
        },
        { status: 500 },
      )
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion, nombre } = body

    console.log("📡 API POST /sistema - Acción:", accion)

    switch (accion) {
      case "generar_ticket": {
        if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
          return NextResponse.json(
            {
              error: "Nombre requerido para generar ticket",
            },
            { status: 400 },
          )
        }

        const nuevoTicket = await generarTicketAtomico(nombre.trim())

        console.log("✅ Ticket generado:", nuevoTicket)

        return NextResponse.json({
          success: true,
          nuevoTicket,
          message: `Ticket #${nuevoTicket.numero} generado para ${nuevoTicket.nombre}`,
        })
      }

      case "llamar_siguiente": {
        const estadoActual = await leerEstadoSistema()

        if (estadoActual.numerosLlamados >= estadoActual.totalAtendidos) {
          return NextResponse.json(
            {
              error: "No hay más tickets para llamar",
            },
            { status: 400 },
          )
        }

        const nuevoEstado = {
          ...estadoActual,
          numerosLlamados: estadoActual.numerosLlamados + 1,
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(nuevoEstado)

        console.log("✅ Siguiente ticket llamado. Números llamados:", nuevoEstado.numerosLlamados)

        return NextResponse.json({
          success: true,
          estado: nuevoEstado,
          message: `Ticket #${estadoActual.numerosLlamados + 1} llamado`,
        })
      }

      case "reiniciar_sistema": {
        const fechaHoy = getTodayDateString()
        const estadoReiniciado = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: fechaHoy,
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(estadoReiniciado)

        console.log("✅ Sistema reiniciado exitosamente")

        return NextResponse.json({
          success: true,
          estado: estadoReiniciado,
          message: "Sistema reiniciado exitosamente",
        })
      }

      default:
        return NextResponse.json(
          {
            error: "Acción no válida",
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("❌ Error en API POST /sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
