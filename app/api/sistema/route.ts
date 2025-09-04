import { type NextRequest, NextResponse } from "next/server"
import {
  obtenerEstadoSistema,
  generarTicketAtomico,
  llamarSiguienteNumero,
  marcarComoAtendido,
  reiniciarSistema,
  crearBackupDiario,
  repararInconsistencias,
  verificarSaludConexion,
} from "@/lib/database"

// Mutex simple para evitar operaciones concurrentes
let operacionEnProceso = false
const TIMEOUT_OPERACION = 30000 // 30 segundos

async function ejecutarConMutex<T>(operacion: () => Promise<T>): Promise<T> {
  // Verificar si hay una operación en proceso
  if (operacionEnProceso) {
    console.log("⏳ Operación en proceso, devolviendo 503...")
    throw new Error("Sistema ocupado - operación en proceso")
  }

  // Marcar operación como en proceso
  operacionEnProceso = true
  const timeoutId = setTimeout(() => {
    console.log("⚠️ Timeout de operación alcanzado, liberando mutex...")
    operacionEnProceso = false
  }, TIMEOUT_OPERACION)

  try {
    const resultado = await operacion()
    return resultado
  } finally {
    // Liberar mutex
    clearTimeout(timeoutId)
    operacionEnProceso = false
  }
}

// GET - Obtener estado actual
export async function GET() {
  try {
    console.log("📥 GET /api/sistema - Obteniendo estado actual...")

    const estado = await obtenerEstadoSistema()

    console.log("✅ Estado obtenido exitosamente")
    return NextResponse.json(estado, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ Error en GET /api/sistema:", error)

    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    return NextResponse.json(
      {
        error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// POST - Manejar acciones del sistema
export async function POST(request: NextRequest) {
  try {
    console.log("📤 POST /api/sistema - Procesando acción...")

    const body = await request.json()
    console.log("📋 Datos recibidos:", body)

    const { action, nombre, numero } = body

    // Verificar que se proporcione una acción
    if (!action) {
      console.error("❌ No se proporcionó acción")
      return NextResponse.json(
        {
          error: "Acción requerida",
          details: "Debe proporcionar un campo 'action' en el cuerpo de la petición",
        },
        { status: 400 },
      )
    }

    let resultado

    // Ejecutar acción con mutex para evitar concurrencia
    try {
      resultado = await ejecutarConMutex(async () => {
        switch (action) {
          case "GENERAR_TICKET": {
            console.log(`🎫 Generando ticket para: "${nombre}"`)

            if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
              throw new Error("Nombre requerido y debe ser una cadena no vacía")
            }

            const { ticketGenerado, estadoActualizado } = await generarTicketAtomico(nombre.trim())

            console.log(`✅ Ticket generado: #${ticketGenerado.numero}`)

            return {
              ...estadoActualizado,
              ticketGenerado,
              mensaje: `Ticket #${ticketGenerado.numero} generado para ${ticketGenerado.nombre}`,
            }
          }

          case "LLAMAR_SIGUIENTE": {
            console.log("📢 Llamando siguiente número...")
            const estadoActualizado = await llamarSiguienteNumero()
            console.log(`✅ Número ${estadoActualizado.numerosLlamados} llamado`)

            return {
              ...estadoActualizado,
              mensaje: `Número ${estadoActualizado.numerosLlamados} llamado`,
            }
          }

          case "MARCAR_ATENDIDO": {
            console.log(`✅ Marcando ticket #${numero} como atendido...`)

            if (!numero || typeof numero !== "number") {
              throw new Error("Número de ticket requerido y debe ser un número")
            }

            const estadoActualizado = await marcarComoAtendido(numero)
            console.log(`✅ Ticket #${numero} marcado como atendido`)

            return {
              ...estadoActualizado,
              mensaje: `Ticket #${numero} marcado como atendido`,
            }
          }

          case "REINICIAR_SISTEMA": {
            console.log("🔄 Reiniciando sistema...")
            const estadoReiniciado = await reiniciarSistema()
            console.log("✅ Sistema reiniciado")

            return {
              ...estadoReiniciado,
              mensaje: "Sistema reiniciado exitosamente",
            }
          }

          case "CREAR_BACKUP": {
            console.log("💾 Creando backup manual...")
            const estadoActual = await obtenerEstadoSistema()
            await crearBackupDiario(estadoActual)
            console.log("✅ Backup creado")

            return {
              ...estadoActual,
              mensaje: "Backup creado exitosamente",
            }
          }

          case "REPARAR_INCONSISTENCIAS": {
            console.log("🔧 Reparando inconsistencias...")
            const { reparacionesRealizadas, estadoReparado } = await repararInconsistencias()
            console.log(`✅ ${reparacionesRealizadas.length} reparaciones realizadas`)

            return {
              ...estadoReparado,
              reparacionesRealizadas,
              mensaje: `${reparacionesRealizadas.length} inconsistencias reparadas`,
            }
          }

          case "VERIFICAR_SALUD": {
            console.log("🏥 Verificando salud del sistema...")
            const saludConexion = await verificarSaludConexion()
            const estadoActual = await obtenerEstadoSistema()

            return {
              ...estadoActual,
              saludConexion,
              mensaje: `Sistema ${saludConexion.status === "healthy" ? "saludable" : "con problemas"}`,
            }
          }

          case "OBTENER_ESTADISTICAS": {
            console.log("📊 Calculando estadísticas...")
            const estadoActual = await obtenerEstadoSistema()

            const ahora = new Date()
            const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
            const ticketsHoy = estadoActual.tickets.filter((ticket) => {
              const fechaTicket = new Date(ticket.fecha)
              return fechaTicket >= inicioDelDia
            })

            const unaHoraAtras = new Date(ahora.getTime() - 60 * 60 * 1000)
            const ticketsUltimaHora = ticketsHoy.filter((ticket) => {
              const fechaTicket = new Date(ticket.fecha)
              return fechaTicket >= unaHoraAtras
            })

            const estadisticas = {
              totalTicketsHoy: ticketsHoy.length,
              ticketsAtendidos: estadoActual.totalAtendidos,
              ticketsPendientes: Math.max(0, estadoActual.ultimoNumero - estadoActual.numerosLlamados),
              promedioTiempoPorTicket: ticketsHoy.length > 0 ? Math.round(60 / (ticketsHoy.length / 8)) : 0, // Estimación
              horaInicioOperaciones: estadoActual.fechaInicio,
              ultimaActividad: ticketsHoy.length > 0 ? ticketsHoy[ticketsHoy.length - 1].fecha : "Sin actividad",
              ticketsUltimaHora: ticketsUltimaHora.length,
            }

            return {
              ...estadoActual,
              estadisticas,
              mensaje: "Estadísticas calculadas",
            }
          }

          default:
            throw new Error(`Acción no reconocida: ${action}`)
        }
      })
    } catch (mutexError) {
      if (mutexError instanceof Error && mutexError.message.includes("Sistema ocupado")) {
        console.log("⏳ Sistema ocupado, devolviendo 503...")
        return NextResponse.json(
          {
            error: "Sistema ocupado",
            details: "El sistema está procesando otra operación. Intente nuevamente en unos segundos.",
            timestamp: new Date().toISOString(),
          },
          { status: 503 },
        )
      }
      throw mutexError
    }

    console.log(`✅ Acción '${action}' completada exitosamente`)

    return NextResponse.json(resultado, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)

    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    // Determinar el código de estado apropiado
    let statusCode = 500
    if (errorMessage.includes("requerido") || errorMessage.includes("debe ser")) {
      statusCode = 400
    } else if (errorMessage.includes("no encontrado")) {
      statusCode = 404
    } else if (errorMessage.includes("ocupado")) {
      statusCode = 503
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)",
        details: errorMessage,
        timestamp: new Date().toISOString(),
        action: (await request.json().catch(() => ({})))?.action || "desconocida",
      },
      { status: statusCode },
    )
  }
}
