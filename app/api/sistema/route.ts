import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  crearBackupDiario,
  forzarBackupDiario,
  getTodayDateString,
} from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "forzar_backup") {
      console.log("🔧 API: Forzando creación de backup diario...")
      const resultado = await forzarBackupDiario()

      return NextResponse.json(resultado, {
        status: resultado.success ? 200 : 400,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    // Acción por defecto: leer estado
    console.log("📖 API: Leyendo estado del sistema...")
    const estado = await leerEstadoSistema()

    return NextResponse.json(estado, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ API: Error al leer estado:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, nombre, numeroLlamado } = body

    console.log("🔄 API: Procesando acción:", action)

    switch (action) {
      case "GENERAR_TICKET":
        if (!nombre || typeof nombre !== "string") {
          return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
        }

        console.log("🎫 API: Generando nuevo ticket para:", nombre)
        const nuevoTicket = await generarTicketAtomico(nombre)

        return NextResponse.json({
          success: true,
          ticket: nuevoTicket,
          message: `Ticket #${nuevoTicket.numero} generado para ${nuevoTicket.nombre}`,
        })

      case "LLAMAR_NUMERO":
        if (typeof numeroLlamado !== "number") {
          return NextResponse.json({ error: "Número de ticket requerido" }, { status: 400 })
        }

        console.log("📢 API: Llamando número:", numeroLlamado)
        const estado = await leerEstadoSistema()

        // Actualizar contador de números llamados
        estado.numerosLlamados = Math.max(estado.numerosLlamados, numeroLlamado)
        await escribirEstadoSistema(estado)

        return NextResponse.json({
          success: true,
          numeroLlamado,
          message: `Número ${numeroLlamado} llamado exitosamente`,
        })

      case "REINICIAR_CONTADOR_DIARIO":
        console.log("🔄 API: Reiniciando contador diario...")

        // Crear backup del día actual antes de reiniciar
        const estadoActual = await leerEstadoSistema()
        if (estadoActual.totalAtendidos > 0) {
          console.log("📦 Creando backup antes de reiniciar...")
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

        return NextResponse.json({
          success: true,
          message: "Contador diario reiniciado exitosamente",
          nuevoEstado,
        })

      case "ELIMINAR_TODOS_REGISTROS":
        console.log("🗑️ API: Eliminando todos los registros...")

        // Crear backup final antes de eliminar
        const estadoFinal = await leerEstadoSistema()
        if (estadoFinal.totalAtendidos > 0) {
          console.log("📦 Creando backup final antes de eliminar...")
          await crearBackupDiario(estadoFinal)
        }

        // Reiniciar completamente
        const estadoLimpio = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: getTodayDateString(),
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        await escribirEstadoSistema(estadoLimpio)

        return NextResponse.json({
          success: true,
          message: "Todos los registros eliminados exitosamente",
          estadoLimpio,
        })

      case "FORZAR_BACKUP":
        console.log("🔧 API: Forzando creación de backup...")
        const resultadoBackup = await forzarBackupDiario()

        return NextResponse.json(resultadoBackup, {
          status: resultadoBackup.success ? 200 : 400,
        })

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  } catch (error) {
    console.error("❌ API: Error en POST:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
