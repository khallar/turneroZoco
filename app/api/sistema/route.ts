import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/database"

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

// Función simplificada para obtener la fecha actual en Argentina
function getFechaHoy(): string {
  const ahora = new Date()
  const fechaArgentina = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
  return fechaArgentina.toISOString().split("T")[0]
}

// Función simplificada para verificar si debe reiniciarse
function debeReiniciarse(estado: EstadoSistema): boolean {
  const fechaHoy = getFechaHoy()
  return fechaHoy !== estado.fechaInicio
}

// Función simplificada para leer estado
async function leerEstadoSistema(): Promise<EstadoSistema> {
  try {
    const [numeroActual, ultimoNumero, totalAtendidos, numerosLlamados, fechaInicio, ultimoReinicio] =
      await Promise.all([
        redis.get("numero_actual"),
        redis.get("ultimo_numero"),
        redis.get("total_atendidos"),
        redis.get("numeros_llamados"),
        redis.get("fecha_inicio"),
        redis.get("ultimo_reinicio"),
      ])

    // Obtener tickets
    const ticketsData = await redis.lrange("tickets_diarios", 0, -1)
    const tickets = ticketsData.map((ticket) => JSON.parse(ticket as string))

    return {
      numeroActual: Number(numeroActual) || 1,
      ultimoNumero: Number(ultimoNumero) || 0,
      totalAtendidos: Number(totalAtendidos) || 0,
      numerosLlamados: Number(numerosLlamados) || 0,
      fechaInicio: (fechaInicio as string) || getFechaHoy(),
      ultimoReinicio: (ultimoReinicio as string) || new Date().toISOString(),
      tickets,
      lastSync: Date.now(),
    }
  } catch (error) {
    console.error("Error al leer estado:", error)
    // Retornar estado inicial en caso de error
    const fechaHoy = getFechaHoy()
    return {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: fechaHoy,
      ultimoReinicio: new Date().toISOString(),
      tickets: [],
      lastSync: Date.now(),
    }
  }
}

// Función simplificada para escribir estado
async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  const pipeline = redis.pipeline()

  pipeline.set("numero_actual", estado.numeroActual)
  pipeline.set("ultimo_numero", estado.ultimoNumero)
  pipeline.set("total_atendidos", estado.totalAtendidos)
  pipeline.set("numeros_llamados", estado.numerosLlamados)
  pipeline.set("fecha_inicio", estado.fechaInicio)
  pipeline.set("ultimo_reinicio", estado.ultimoReinicio)

  await pipeline.exec()
}

// Función simplificada para generar ticket
async function generarTicketSimplificado(nombre: string): Promise<TicketInfo> {
  const fechaHoy = getFechaHoy()
  const ahora = new Date()

  // Obtener el próximo número de forma atómica
  const numeroActual = await redis.incr("numero_actual")

  // Crear el ticket
  const ticket: TicketInfo = {
    numero: numeroActual,
    nombre: nombre.trim() || "Cliente ZOCO",
    fecha: fechaHoy,
    timestamp: ahora.getTime(),
  }

  // Guardar el ticket y actualizar contadores
  const pipeline = redis.pipeline()
  pipeline.lpush("tickets_diarios", JSON.stringify(ticket))
  pipeline.incr("total_atendidos")
  await pipeline.exec()

  return ticket
}

export async function GET() {
  try {
    console.log("📡 GET /api/sistema - Leyendo estado...")

    let estado = await leerEstadoSistema()

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("🔄 Reinicio automático necesario")

      const fechaHoy = getFechaHoy()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estado)
      // Limpiar tickets del día anterior
      await redis.del("tickets_diarios")
    }

    console.log("✅ Estado devuelto:", {
      numeroActual: estado.numeroActual,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets.length,
    })

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

export async function POST(request: NextRequest) {
  try {
    console.log("📨 POST /api/sistema")

    const body = await request.json()
    const { action, nombre, ...nuevoEstado } = body

    console.log("🎯 Acción:", action)

    let estado = await leerEstadoSistema()

    // Verificar reinicio antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("🔄 Reinicio automático durante POST")

      const fechaHoy = getFechaHoy()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estado)
      await redis.del("tickets_diarios")
    }

    // Generar ticket de forma simplificada
    if (action === "GENERAR_TICKET") {
      if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("🎫 Generando ticket para:", nombre)

      try {
        const nuevoTicket = await generarTicketSimplificado(nombre)

        // Leer estado actualizado
        const estadoActualizado = await leerEstadoSistema()

        console.log("✅ Ticket generado exitosamente")

        return NextResponse.json({
          ...estadoActualizado,
          ticketGenerado: nuevoTicket,
        })
      } catch (error) {
        console.error("❌ Error al generar ticket:", error)
        return NextResponse.json(
          {
            error: "Error al generar ticket",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Otras acciones administrativas
    if (action === "ELIMINAR_TODOS_REGISTROS") {
      const fechaHoy = getFechaHoy()
      const estadoLimpio: EstadoSistema = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estadoLimpio)
      await redis.del("tickets_diarios")

      return NextResponse.json({
        ...estadoLimpio,
        mensaje: "Todos los registros han sido eliminados exitosamente",
      })
    }

    if (action === "REINICIAR_CONTADOR_DIARIO") {
      const fechaHoy = getFechaHoy()
      const estadoReiniciado: EstadoSistema = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estadoReiniciado)
      await redis.del("tickets_diarios")

      return NextResponse.json({
        ...estadoReiniciado,
        mensaje: "Contador diario reiniciado exitosamente",
      })
    }

    // Actualización normal de estado
    if (typeof nuevoEstado.numeroActual === "number") {
      const estadoActualizado = {
        numeroActual: nuevoEstado.numeroActual,
        ultimoNumero: nuevoEstado.ultimoNumero || estado.ultimoNumero,
        totalAtendidos: nuevoEstado.totalAtendidos,
        numerosLlamados: nuevoEstado.numerosLlamados,
        fechaInicio: estado.fechaInicio,
        ultimoReinicio: estado.ultimoReinicio,
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estadoActualizado)
      const estadoFinal = await leerEstadoSistema()

      return NextResponse.json(estadoFinal)
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error en POST /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
