import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, escribirEstadoSistema, generarTicketAtomico, verificarConexionDB } from "@/lib/database"

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
      console.log(`🔄 Reinicio automático necesario (TURNOS_ZOCO): ${fechaHoyString} vs ${fechaInicioString}`)
      return true
    }

    return false
  } catch (error) {
    console.error("❌ Error verificando reinicio (TURNOS_ZOCO):", error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("📖 GET /api/sistema - Obteniendo estado del sistema...")

    const estadoCompleto = await leerEstadoSistema()

    console.log("✅ Estado obtenido exitosamente:", {
      numeroActual: estadoCompleto.numeroActual,
      totalAtendidos: estadoCompleto.totalAtendidos,
      numerosLlamados: estadoCompleto.numerosLlamados,
      ticketsCount: estadoCompleto.tickets?.length || 0,
    })

    return NextResponse.json({
      success: true,
      estado: estadoCompleto,
    })
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener estado del sistema",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n=== 📨 POST /api/sistema - TURNOS_ZOCO (Upstash Redis) ===")

    const body = await request.json()
    const { action, nombre } = body

    console.log("📝 POST /api/sistema - Acción:", action)

    // Verificar conexión a la base de datos (no bloquear si falla)
    try {
      const conexionOK = await verificarConexionDB()
      if (!conexionOK) {
        console.log("⚠️ Advertencia: Problema de conexión detectado, pero continuando...")
      }
    } catch (connectionError) {
      console.error("❌ Error al verificar conexión, pero continuando:", connectionError)
    }

    switch (action) {
      case "generar_ticket": {
        console.log("🎫 Generando ticket para:", nombre)

        const ticket = await generarTicketAtomico(nombre || "Cliente ZOCO")

        console.log("✅ Ticket generado:", ticket)

        return NextResponse.json({
          success: true,
          ticket,
          message: "Ticket generado exitosamente",
        })
      }

      case "llamar_siguiente": {
        console.log("📢 Llamando siguiente número...")

        const estadoActual = await leerEstadoSistema()

        if (estadoActual.numerosLlamados >= estadoActual.totalAtendidos) {
          return NextResponse.json(
            {
              success: false,
              error: "No hay más números para llamar",
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

        console.log("✅ Siguiente número llamado:", nuevoEstado.numerosLlamados)

        return NextResponse.json({
          success: true,
          numeroLlamado: nuevoEstado.numerosLlamados,
          message: "Siguiente número llamado exitosamente",
        })
      }

      case "reiniciar": {
        console.log("🔄 Reiniciando contador...")

        const fechaHoy = new Date().toISOString().split("T")[0]
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
            success: false,
            error: "Acción no válida",
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
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
