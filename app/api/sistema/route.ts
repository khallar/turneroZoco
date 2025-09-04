import { type NextRequest, NextResponse } from "next/server"
import {
  obtenerEstadoSistema,
  guardarEstadoSistema,
  generarTicketAtomico,
  llamarSiguienteNumero,
  marcarComoAtendido,
  reiniciarSistema,
  verificarSaludDB,
  repararInconsistencias,
} from "@/lib/database"

// Mutex simple en memoria para evitar operaciones concurrentes
let operacionEnProceso = false
const TIMEOUT_OPERACION = 30000 // 30 segundos

async function ejecutarConMutex<T>(operacion: () => Promise<T>): Promise<T> {
  if (operacionEnProceso) {
    throw new Error("Sistema ocupado, intente nuevamente")
  }

  operacionEnProceso = true
  const timeoutId = setTimeout(() => {
    operacionEnProceso = false
    console.log("⚠️ Timeout de operación, liberando mutex")
  }, TIMEOUT_OPERACION)

  try {
    const resultado = await operacion()
    return resultado
  } finally {
    clearTimeout(timeoutId)
    operacionEnProceso = false
  }
}

// Función para calcular estadísticas
function calcularEstadisticas(estado: any) {
  const ahora = new Date()
  const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const unaHoraAtras = new Date(ahora.getTime() - 60 * 60 * 1000)

  // Filtrar tickets de hoy
  const ticketsHoy = estado.tickets.filter((ticket: any) => {
    const fechaTicket = new Date(ticket.fecha)
    return fechaTicket >= inicioDelDia
  })

  // Tickets de la última hora
  const ticketsUltimaHora = estado.tickets.filter((ticket: any) => {
    const timestampTicket = ticket.timestamp || 0
    return timestampTicket >= unaHoraAtras.getTime()
  })

  // Calcular promedio de tiempo por ticket (estimado)
  const tiempoTranscurrido = ahora.getTime() - inicioDelDia.getTime()
  const horasTranscurridas = Math.max(1, tiempoTranscurrido / (1000 * 60 * 60))
  const promedioTiempoPorTicket = estado.totalAtendidos > 0 ? horasTranscurridas / estado.totalAtendidos : 0

  return {
    totalTicketsHoy: ticketsHoy.length,
    ticketsAtendidos: estado.totalAtendidos,
    ticketsPendientes: Math.max(0, estado.ultimoNumero - estado.numeroActual + 1),
    promedioTiempoPorTicket: Math.round(promedioTiempoPorTicket * 60), // en minutos
    horaInicioOperaciones: estado.ultimoReinicio || new Date().toISOString(),
    ultimaActividad: new Date(estado.lastSync || Date.now()).toISOString(),
    ticketsUltimaHora: ticketsUltimaHora.length,
  }
}

// GET - Obtener estado actual
export async function GET() {
  try {
    console.log("📥 GET /api/sistema - Obteniendo estado...")

    if (operacionEnProceso) {
      return NextResponse.json({ error: "Sistema ocupado", details: "Hay una operación en proceso" }, { status: 503 })
    }

    const estado = await obtenerEstadoSistema()
    console.log("✅ Estado obtenido correctamente")

    return NextResponse.json(estado)
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

// POST - Manejar acciones del sistema
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📨 POST /api/sistema - Acción:", body.action || "GUARDAR_ESTADO")

    // Si no hay action, es una actualización de estado
    if (!body.action) {
      return await ejecutarConMutex(async () => {
        const estadoGuardado = await guardarEstadoSistema(body)
        console.log("✅ Estado guardado correctamente")
        return NextResponse.json(estadoGuardado)
      })
    }

    // Manejar acciones específicas
    switch (body.action) {
      case "GENERAR_TICKET": {
        if (!body.nombre || typeof body.nombre !== "string" || body.nombre.trim().length === 0) {
          return NextResponse.json(
            { error: "Nombre requerido", details: "El nombre no puede estar vacío" },
            { status: 400 },
          )
        }

        return await ejecutarConMutex(async () => {
          const resultado = await generarTicketAtomico(body.nombre.trim())
          console.log(`✅ Ticket generado: #${resultado.ticketGenerado.numero}`)

          return NextResponse.json({
            ...resultado.estado,
            ticketGenerado: resultado.ticketGenerado,
          })
        })
      }

      case "LLAMAR_SIGUIENTE": {
        return await ejecutarConMutex(async () => {
          const estado = await llamarSiguienteNumero()
          console.log(`✅ Siguiente número llamado: ${estado.numeroActual}`)
          return NextResponse.json(estado)
        })
      }

      case "MARCAR_ATENDIDO": {
        return await ejecutarConMutex(async () => {
          const estado = await marcarComoAtendido()
          console.log("✅ Marcado como atendido")
          return NextResponse.json(estado)
        })
      }

      case "REINICIAR_SISTEMA": {
        return await ejecutarConMutex(async () => {
          const estado = await reiniciarSistema()
          console.log("✅ Sistema reiniciado")
          return NextResponse.json(estado)
        })
      }

      case "OBTENER_ESTADISTICAS": {
        const estado = await obtenerEstadoSistema()
        const estadisticas = calcularEstadisticas(estado)
        console.log("✅ Estadísticas calculadas")
        return NextResponse.json({ estadisticas })
      }

      case "VERIFICAR_SALUD_DB": {
        const salud = await verificarSaludDB()
        console.log("✅ Salud de DB verificada:", salud.conectado ? "OK" : "ERROR")
        return NextResponse.json(salud)
      }

      case "REPARAR_INCONSISTENCIAS": {
        return await ejecutarConMutex(async () => {
          const resultado = await repararInconsistencias()
          console.log(`✅ Reparación completada: ${resultado.cambios.length} cambios`)
          return NextResponse.json(resultado)
        })
      }

      case "SINCRONIZAR_DB": {
        return await ejecutarConMutex(async () => {
          const estado = await obtenerEstadoSistema()
          console.log("✅ Sincronización forzada completada")
          return NextResponse.json(estado)
        })
      }

      default:
        return NextResponse.json(
          { error: "Acción no válida", details: `Acción '${body.action}' no reconocida` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)

    // Determinar el código de estado basado en el tipo de error
    let status = 500
    let errorMessage = "Error interno del servidor"

    if (error instanceof Error) {
      if (error.message.includes("ocupado")) {
        status = 503
        errorMessage = "Sistema ocupado"
      } else if (error.message.includes("requerido") || error.message.includes("vacío")) {
        status = 400
        errorMessage = "Datos inválidos"
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status },
    )
  }
}
