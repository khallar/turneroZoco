import { type NextRequest, NextResponse } from "next/server"
import { redis, verificarConexionDB } from "@/lib/database"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

export async function GET() {
  try {
    // Verificar conexión a la base de datos
    const conexionOk = await verificarConexionDB()
    if (!conexionOk) {
      console.warn("Advertencia: Conexión a Redis no verificada, continuando...")
    }

    // Obtener datos del sistema
    const [numeroActual, numeroLlamado, cola, historial, configuracion] = await Promise.all([
      redis.get("numero_actual").catch(() => 0),
      redis.get("numero_llamado").catch(() => 0),
      redis.lrange("cola_atencion", 0, -1).catch(() => []),
      redis.lrange("historial_diario", 0, -1).catch(() => []),
      redis.hgetall("configuracion_sistema").catch(() => ({})),
    ])

    // Parsear datos de la cola e historial
    const colaParsed = (cola || []).map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item
      } catch {
        return item
      }
    })

    const historialParsed = (historial || []).map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item
      } catch {
        return item
      }
    })

    const estado = {
      numeroActual: Number.parseInt(numeroActual as string) || 0,
      numeroLlamado: Number.parseInt(numeroLlamado as string) || 0,
      cola: colaParsed,
      historial: historialParsed,
      configuracion: configuracion || {},
    }

    return NextResponse.json({
      success: true,
      estado,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error al obtener estado del sistema:", error)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion, nombre } = body

    // Verificar conexión a la base de datos
    const conexionOk = await verificarConexionDB()
    if (!conexionOk) {
      console.warn("Advertencia: Conexión a Redis no verificada, continuando...")
    }

    switch (accion) {
      case "generar_ticket":
        return await generarTicket(nombre)

      case "llamar_siguiente":
        return await llamarSiguiente()

      case "reiniciar_sistema":
        return await reiniciarSistema()

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
    console.error("Error en POST /api/sistema:", error)
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

async function generarTicket(nombre?: string): Promise<NextResponse> {
  try {
    // Obtener el número actual y incrementarlo
    const numeroActual = await redis.get("numero_actual").catch(() => 0)
    const nuevoNumero = (Number.parseInt(numeroActual as string) || 0) + 1

    // Crear el ticket
    const ticket: TicketInfo = {
      numero: nuevoNumero,
      nombre: nombre || "",
      fecha: new Date().toLocaleDateString("es-ES"),
      timestamp: Date.now(),
    }

    // Guardar en Redis usando pipeline para atomicidad
    const pipeline = redis.pipeline()
    pipeline.set("numero_actual", nuevoNumero)
    pipeline.lpush("cola_atencion", JSON.stringify(ticket))

    await pipeline.exec()

    return NextResponse.json({
      success: true,
      ticket,
      mensaje: "Ticket generado exitosamente",
    })
  } catch (error) {
    console.error("Error al generar ticket:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al generar ticket",
      },
      { status: 500 },
    )
  }
}

async function llamarSiguiente(): Promise<NextResponse> {
  try {
    // Obtener el siguiente ticket de la cola
    const siguienteTicket = await redis.rpop("cola_atencion")

    if (!siguienteTicket) {
      return NextResponse.json(
        {
          success: false,
          error: "No hay tickets en la cola",
        },
        { status: 400 },
      )
    }

    const ticket = JSON.parse(siguienteTicket)

    // Actualizar número llamado y agregar al historial
    const pipeline = redis.pipeline()
    pipeline.set("numero_llamado", ticket.numero)
    pipeline.lpush("historial_diario", siguienteTicket)

    await pipeline.exec()

    return NextResponse.json({
      success: true,
      ticket,
      mensaje: "Siguiente ticket llamado exitosamente",
    })
  } catch (error) {
    console.error("Error al llamar siguiente:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al llamar siguiente ticket",
      },
      { status: 500 },
    )
  }
}

async function reiniciarSistema(): Promise<NextResponse> {
  try {
    // Limpiar todos los datos del sistema
    const pipeline = redis.pipeline()
    pipeline.set("numero_actual", 0)
    pipeline.set("numero_llamado", 0)
    pipeline.del("cola_atencion")
    pipeline.del("historial_diario")

    await pipeline.exec()

    return NextResponse.json({
      success: true,
      mensaje: "Sistema reiniciado exitosamente",
    })
  } catch (error) {
    console.error("Error al reiniciar sistema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al reiniciar sistema",
      },
      { status: 500 },
    )
  }
}
