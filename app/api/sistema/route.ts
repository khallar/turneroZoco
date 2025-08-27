import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  crearBackupDiario,
  obtenerEstadisticas,
  verificarConexionDB,
  limpiarDatosAntiguos,
  recuperarDatosPerdidos, // Nueva función
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

export async function GET() {
  try {
    console.log("\n=== 📥 GET /api/sistema - TURNOS_ZOCO (Upstash Redis) ===")

    // Verificar conexión a la base de datos (no bloquear si falla)
    try {
      const conexionOK = await verificarConexionDB()
      if (!conexionOK) {
        console.log("⚠️ Advertencia: Problema de conexión detectado, pero continuando...")
      }
    } catch (connectionError) {
      console.error("❌ Error al verificar conexión, pero continuando:", connectionError)
    }

    let estado
    try {
      estado = await leerEstadoSistema() // Esto ya devuelve el estado con los tickets
    } catch (readError) {
      console.error("❌ Error al leer estado, intentando recuperación:", readError)

      // Intentar recuperar datos del día actual
      const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
      try {
        estado = await recuperarDatosPerdidos(fechaHoy)
        console.log("✅ Datos recuperados exitosamente")
      } catch (recoveryError) {
        console.error("❌ No se pudieron recuperar los datos, creando estado inicial:", recoveryError)

        // Crear estado completamente nuevo como último recurso
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
      }
    }

    // Log detallado del estado leído
    console.log(
      `📊 Estado leído: Total atendidos: ${estado.totalAtendidos}, Tickets en array: ${estado.tickets.length}, Último número: ${estado.ultimoNumero}`,
    )

    // Verificación adicional de integridad
    if (estado.totalAtendidos !== estado.tickets.length) {
      console.log(
        `⚠️ ALERTA: Inconsistencia detectada en GET - Estado: ${estado.totalAtendidos}, Array: ${estado.tickets.length}`,
      )
    }

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("🔄 Ejecutando reinicio automático (TURNOS_ZOCO)")

      // Crear backup en background con el estado actual (incluyendo tickets)
      crearBackupDiario(estado).catch((err) => console.error("Error en backup (TURNOS_ZOCO):", err))

      const ahora = new Date()
      const fechaHoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      // Escribir el estado inicial del nuevo día con persistencia mejorada
      await escribirEstadoSistema(estado)
    }

    console.log("📤 Estado devuelto desde TURNOS_ZOCO (Upstash Redis):", {
      numeroActual: estado.numeroActual,
      totalAtendidos: estado.totalAtendidos,
      numerosLlamados: estado.numerosLlamados,
      totalTickets: estado.tickets?.length || 0,
      ultimoNumero: estado.ultimoNumero,
    })

    return NextResponse.json(estado)
  } catch (error) {
    console.error("❌ Error en GET /api/sistema (TURNOS_ZOCO):", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)",
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
    const { action, ...nuevoEstado } = body

    console.log("🎯 Acción recibida (TURNOS_ZOCO):", action)

    // Verificar conexión a la base de datos (no bloquear si falla)
    try {
      const conexionOK = await verificarConexionDB()
      if (!conexionOK) {
        console.log("⚠️ Advertencia: Problema de conexión detectado, pero continuando...")
      }
    } catch (connectionError) {
      console.error("❌ Error al verificar conexión, pero continuando:", connectionError)
    }

    let estado = await leerEstadoSistema() // Leer estado una vez al inicio del POST (incluye tickets)

    // Verificar si debe reiniciarse antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("🔄 Reinicio automático durante POST (TURNOS_ZOCO)")

      // Crear backup en background con el estado actual (incluyendo tickets)
      crearBackupDiario(estado).catch((err) => console.error("Error en backup (TURNOS_ZOCO):", err))

      const ahora = new Date()
      const fechaHoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }
      // No es necesario escribir el estado aquí, se hará si la acción lo requiere
    }

    // Acción especial para generar ticket de forma atómica - OPTIMIZADA
    if (action === "GENERAR_TICKET") {
      const { nombre } = body

      if (!nombre || typeof nombre !== "string") {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("🎫 Generando ticket para:", nombre, "(TURNOS_ZOCO)")

      try {
        // Generar ticket de forma atómica en la base de datos
        const nuevoTicket = await generarTicketAtomico(nombre)

        // Después de generar el ticket, leer el estado actualizado
        const estadoActualizado = await leerEstadoSistema()

        console.log("✅ Ticket generado exitosamente en TURNOS_ZOCO (Upstash Redis)")

        return NextResponse.json({
          ...estadoActualizado,
          ticketGenerado: nuevoTicket,
        })
      } catch (error) {
        console.error("❌ Error al generar ticket (TURNOS_ZOCO):", error)

        // Respuesta de error más específica
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"

        if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
          return NextResponse.json(
            {
              error: "Timeout al generar ticket - conexión lenta",
              details: "La operación tardó demasiado. Por favor, intente nuevamente.",
            },
            { status: 408 },
          )
        }

        return NextResponse.json(
          {
            error: "Error al generar ticket en TURNOS_ZOCO (Upstash Redis)",
            details: errorMessage,
          },
          { status: 500 },
        )
      }
    }

    // Acción para obtener estadísticas
    if (action === "OBTENER_ESTADISTICAS") {
      try {
        const estadisticas = await obtenerEstadisticas(estado) // 'estado' ya incluye tickets

        return NextResponse.json({
          ...estado,
          estadisticas,
        })
      } catch (error) {
        console.error("❌ Error al obtener estadísticas (TURNOS_ZOCO):", error)
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
      console.log("🗑️ Eliminando todos los registros (TURNOS_ZOCO)...")

      try {
        // Crear backup antes de eliminar con el estado actual (incluyendo tickets)
        await crearBackupDiario(estado)

        const ahora = new Date()
        const fechaHoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
        const estadoLimpio: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: fechaHoy,
          ultimoReinicio: ahora.toISOString(),
          tickets: [], // Reiniciar tickets para el estado de retorno
          lastSync: Date.now(),
        }

        // Escribir el estado limpio (solo metadata)
        await escribirEstadoSistema(estadoLimpio)
        console.log("✅ Todos los registros eliminados exitosamente (TURNOS_ZOCO)")

        // Devolver el estado limpio directamente, sin una nueva lectura de DB
        return NextResponse.json({
          ...estadoLimpio,
          mensaje: "Todos los registros han sido eliminados exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al eliminar registros (TURNOS_ZOCO):", error)
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
      console.log("🔄 Reiniciando contador diario (TURNOS_ZOCO)...")

      try {
        // Crear backup antes de reiniciar con el estado actual (incluyendo tickets)
        await crearBackupDiario(estado)

        const ahora = new Date()
        const fechaHoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
        const estadoReiniciado: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: fechaHoy,
          ultimoReinicio: ahora.toISOString(),
          tickets: [], // Reiniciar tickets para el estado de retorno
          lastSync: Date.now(),
        }

        // Escribir el estado reiniciado (solo metadata)
        await escribirEstadoSistema(estadoReiniciado)
        console.log("✅ Contador diario reiniciado exitosamente (TURNOS_ZOCO)")

        // Devolver el estado reiniciado directamente, sin una nueva lectura de DB
        return NextResponse.json({
          ...estadoReiniciado,
          mensaje: "Contador diario reiniciado exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al reiniciar contador (TURNOS_ZOCO):", error)
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
        console.error("❌ Error al limpiar datos antiguos (TURNOS_ZOCO):", error)
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
    // Nota: nuevoEstado.tickets ya no se usa para la escritura directa del estado principal
    if (
      typeof nuevoEstado.numeroActual !== "number" ||
      typeof nuevoEstado.totalAtendidos !== "number" ||
      typeof nuevoEstado.numerosLlamados !== "number"
      // !Array.isArray(nuevoEstado.tickets) // Ya no se valida aquí
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    console.log("📝 Actualizando estado normal en TURNOS_ZOCO (Upstash Redis)")

    // Actualizar estado manteniendo fechas originales
    const estadoActualizado = {
      numeroActual: nuevoEstado.numeroActual,
      ultimoNumero: nuevoEstado.ultimoNumero,
      totalAtendidos: nuevoEstado.totalAtendidos,
      numerosLlamados: nuevoEstado.numerosLlamados,
      fechaInicio: estado.fechaInicio, // Mantener la fecha de inicio original
      ultimoReinicio: estado.ultimoReinicio, // Mantener la fecha de último reinicio original
      lastSync: Date.now(),
    }

    // Escribir solo la metadata del estado
    await escribirEstadoSistema(estadoActualizado)

    // Devolver el estado completo (metadata + tickets) después de la actualización
    const estadoFinal = await leerEstadoSistema()
    return NextResponse.json(estadoFinal)
  } catch (error) {
    console.error("❌ Error en POST /api/sistema (TURNOS_ZOCO):", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
