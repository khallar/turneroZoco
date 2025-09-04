import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  crearBackupDiario,
  obtenerEstadisticas,
  verificarConexionDB,
  limpiarDatosAntiguos,
  recuperarDatosPerdidos,
  obtenerResumenDiasAnteriores,
  guardarResumenHistorico,
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
  tickets: TicketInfo[]
  lastSync?: number
  activo?: boolean
  nombreActual?: string
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
          activo: true,
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
        activo: true,
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
      activo: estado.activo,
      nombreActual: estado.nombreActual,
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
    const { accion, datos } = body

    console.log("🎯 Acción recibida (TURNOS_ZOCO):", accion)

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
        activo: true,
      }
      // No es necesario escribir el estado aquí, se hará si la acción lo requiere
    }

    // Acción especial para generar ticket de forma atómica - OPTIMIZADA
    if (accion === "GENERAR_TICKET") {
      const { nombre } = datos

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

    // NUEVA ACCIÓN: Reparar inconsistencias
    if (accion === "REPARAR_INCONSISTENCIAS") {
      console.log("🔧 Reparando inconsistencias detectadas (TURNOS_ZOCO)...")

      try {
        // 1. Leer estado actual
        const estadoActual = await leerEstadoSistema()

        // 2. Verificar y corregir inconsistencias
        const estadoCorregido = { ...estadoActual }
        const cambiosRealizados = []

        // Verificar consistencia entre totalAtendidos y tickets.length
        if (estadoActual.totalAtendidos !== estadoActual.tickets.length) {
          console.log(`🔧 Corrigiendo totalAtendidos: ${estadoActual.totalAtendidos} -> ${estadoActual.tickets.length}`)
          estadoCorregido.totalAtendidos = estadoActual.tickets.length
          cambiosRealizados.push(`totalAtendidos corregido a ${estadoActual.tickets.length}`)
        }

        // Verificar que numeroActual sea correcto
        if (estadoActual.tickets.length > 0) {
          const ultimoTicketReal = estadoActual.tickets[estadoActual.tickets.length - 1]
          if (estadoCorregido.ultimoNumero !== ultimoTicketReal.numero) {
            console.log(`🔧 Corrigiendo ultimoNumero: ${estadoCorregido.ultimoNumero} -> ${ultimoTicketReal.numero}`)
            estadoCorregido.ultimoNumero = ultimoTicketReal.numero
            estadoCorregido.numeroActual = ultimoTicketReal.numero + 1
            cambiosRealizados.push(`ultimoNumero corregido a ${ultimoTicketReal.numero}`)
            cambiosRealizados.push(`numeroActual corregido a ${ultimoTicketReal.numero + 1}`)
          }
        }

        // Verificar que numerosLlamados no sea mayor que totalAtendidos
        if (estadoCorregido.numerosLlamados > estadoCorregido.totalAtendidos) {
          console.log(
            `🔧 Corrigiendo numerosLlamados: ${estadoCorregido.numerosLlamados} -> ${estadoCorregido.totalAtendidos}`,
          )
          estadoCorregido.numerosLlamados = estadoCorregido.totalAtendidos
          cambiosRealizados.push(`numerosLlamados corregido a ${estadoCorregido.totalAtendidos}`)
        }

        // Si hay cambios, guardar el estado corregido
        if (cambiosRealizados.length > 0) {
          estadoCorregido.lastSync = Date.now()
          await escribirEstadoSistema(estadoCorregido)
          console.log("✅ Inconsistencias reparadas exitosamente")

          return NextResponse.json({
            success: true,
            message: "Inconsistencias reparadas exitosamente",
            cambiosRealizados,
            estadoCorregido,
          })
        } else {
          console.log("✅ No se encontraron inconsistencias")
          return NextResponse.json({
            success: true,
            message: "No se encontraron inconsistencias",
            cambiosRealizados: [],
            estadoActual,
          })
        }
      } catch (error) {
        console.error("❌ Error al reparar inconsistencias (TURNOS_ZOCO):", error)
        return NextResponse.json(
          {
            error: "Error al reparar inconsistencias",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción para obtener estadísticas
    if (accion === "OBTENER_ESTADISTICAS") {
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
    if (accion === "ELIMINAR_TODOS_REGISTROS") {
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
          activo: true,
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
    if (accion === "REINICIAR_CONTADOR_DIARIO") {
      console.log("🔄 Reiniciando contador diario (TURNOS_ZOCO)...")

      try {
        // 1. Crear backup diario con el estado actual (incluyendo tickets)
        await crearBackupDiario(estado)

        // 2. Obtener y guardar el resumen histórico actualizado
        const resumenHistorico = await obtenerResumenDiasAnteriores()
        await guardarResumenHistorico(resumenHistorico)

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
          activo: true,
        }

        // Escribir el estado reiniciado (solo metadata)
        await escribirEstadoSistema(estadoReiniciado)
        console.log("✅ Contador diario reiniciado exitosamente (TURNOS_ZOCO)")

        // Devolver el estado reiniciado directamente, sin una nueva lectura de DB
        return NextResponse.json({
          success: true,
          message: "Contador reiniciado y backup creado exitosamente",
          estado: estadoReiniciado,
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
    if (accion === "LIMPIAR_DATOS_ANTIGUOS") {
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

    // Acción para pausar el sistema
    if (accion === "PAUSAR_SISTEMA") {
      console.log("⏸️ Pausando sistema (TURNOS_ZOCO)...")

      try {
        estado.activo = false
        await escribirEstadoSistema(estado)
        console.log("✅ Sistema pausado exitosamente (TURNOS_ZOCO)")

        return NextResponse.json({
          ...estado,
          mensaje: "Sistema pausado exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al pausar sistema (TURNOS_ZOCO):", error)
        return NextResponse.json(
          {
            error: "Error al pausar sistema",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción para reanudar el sistema
    if (accion === "REANUDAR_SISTEMA") {
      console.log("⏯️ Reanudando sistema (TURNOS_ZOCO)...")

      try {
        estado.activo = true
        await escribirEstadoSistema(estado)
        console.log("✅ Sistema reanudado exitosamente (TURNOS_ZOCO)")

        return NextResponse.json({
          ...estado,
          mensaje: "Sistema reanudado exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al reanudar sistema (TURNOS_ZOCO):", error)
        return NextResponse.json(
          {
            error: "Error al reanudar sistema",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción para actualizar el nombre actual
    if (accion === "ACTUALIZAR_NOMBRE") {
      const { nombre } = datos

      if (!nombre || typeof nombre !== "string") {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("📝 Actualizando nombre actual en TURNOS_ZOCO (Upstash Redis)")

      try {
        estado.nombreActual = nombre
        await escribirEstadoSistema(estado)
        console.log("✅ Nombre actualizado exitosamente (TURNOS_ZOCO)")

        return NextResponse.json({
          ...estado,
          mensaje: "Nombre actualizado exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al actualizar nombre (TURNOS_ZOCO):", error)
        return NextResponse.json(
          {
            error: "Error al actualizar nombre",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Validar datos para actualizaciones normales
    if (
      typeof datos.numeroActual !== "number" ||
      typeof datos.totalAtendidos !== "number" ||
      typeof datos.numerosLlamados !== "number"
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    console.log("📝 Actualizando estado normal en TURNOS_ZOCO (Upstash Redis)")

    // Actualizar estado manteniendo fechas originales
    const estadoActualizado = {
      numeroActual: datos.numeroActual,
      ultimoNumero: datos.ultimoNumero,
      totalAtendidos: datos.totalAtendidos,
      numerosLlamados: datos.numerosLlamados,
      fechaInicio: estado.fechaInicio, // Mantener la fecha de inicio original
      ultimoReinicio: estado.ultimoReinicio, // Mantener la fecha de último reinicio original
      lastSync: Date.now(),
      activo: estado.activo,
      nombreActual: estado.nombreActual,
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
