import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  crearBackupDiario,
  verificarConexionDB,
  recuperarDatosPerdidos, // Nueva función
  generarNuevoTicket,
  llamarSiguienteTicket,
  marcarTicketAtendido,
  agregarEmpleado,
  eliminarEmpleado,
  reiniciarSistema,
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
    const { accion, nombre, empleado, numeroTicket } = body

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

    switch (accion) {
      case "generar_ticket":
        if (!nombre) {
          return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
        }
        const ticket = await generarNuevoTicket(nombre)
        return NextResponse.json({ ticket })

      case "llamar_siguiente":
        if (!empleado) {
          return NextResponse.json({ error: "Empleado requerido" }, { status: 400 })
        }
        const ticketLlamado = await llamarSiguienteTicket(empleado)
        return NextResponse.json({ ticket: ticketLlamado })

      case "marcar_atendido":
        if (!numeroTicket || !empleado) {
          return NextResponse.json({ error: "Número de ticket y empleado requeridos" }, { status: 400 })
        }
        await marcarTicketAtendido(numeroTicket, empleado)
        return NextResponse.json({ success: true })

      case "agregar_empleado":
        if (!nombre) {
          return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
        }
        await agregarEmpleado(nombre)
        return NextResponse.json({ success: true })

      case "eliminar_empleado":
        if (!nombre) {
          return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
        }
        await eliminarEmpleado(nombre)
        return NextResponse.json({ success: true })

      case "reiniciar":
        await reiniciarSistema()
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  } catch (error) {
    console.error("❌ Error en POST /api/sistema (TURNOS_ZOCO):", error)
    return NextResponse.json({ error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)" }, { status: 500 })
  }
}
