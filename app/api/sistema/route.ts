import { type NextRequest, NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  verificarConexionDB,
  crearBackupDiario,
} from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

// Función para verificar si debe reiniciarse automáticamente
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

// NUEVA FUNCIÓN: Realizar backup y reinicio automático
async function realizarBackupYReinicioAutomatico(
  estadoActual: EstadoSistema & { tickets: TicketInfo[] },
): Promise<EstadoSistema> {
  console.log("🤖 Iniciando proceso automático de backup y reinicio diario...")

  try {
    // PASO 1: Crear backup automático del día anterior
    if (estadoActual.totalAtendidos > 0) {
      console.log("📦 Creando backup automático del día anterior...")
      await crearBackupDiario(estadoActual)
      console.log("✅ Backup automático creado exitosamente")
    } else {
      console.log("ℹ️ No hay datos para respaldar (0 tickets), omitiendo backup")
    }

    // PASO 2: Reiniciar para el nuevo día
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

    console.log("🎉 Proceso automático completado exitosamente:")
    console.log(`   📦 Backup creado: ${estadoActual.totalAtendidos > 0 ? "SÍ" : "NO"}`)
    console.log(`   🔄 Contador reiniciado para: ${fechaHoy}`)
    console.log(`   📊 Tickets respaldados: ${estadoActual.totalAtendidos}`)

    return estadoReiniciado
  } catch (error) {
    console.error("⚠️ Error en proceso automático, pero continuando con reinicio:", error)

    // Si falla el backup, continuar con el reinicio
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

    console.log("✅ Reinicio automático completado (backup falló)")
    return estadoReiniciado
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("📖 GET /api/sistema - Obteniendo estado del sistema...")

    const estadoCompleto = await leerEstadoSistema()

    // 🤖 VERIFICACIÓN AUTOMÁTICA: Comprobar si necesita reinicio diario
    if (debeReiniciarse(estadoCompleto)) {
      console.log("🤖 Detectado cambio de día - Ejecutando backup y reinicio automático...")

      const estadoReiniciado = await realizarBackupYReinicioAutomatico(estadoCompleto)

      console.log("✅ Proceso automático completado, devolviendo nuevo estado")

      return NextResponse.json({
        success: true,
        estado: { ...estadoReiniciado, tickets: [] }, // Nuevo día = sin tickets
        automaticReset: true,
        backupCreated: estadoCompleto.totalAtendidos > 0,
        previousDayTickets: estadoCompleto.totalAtendidos,
        message: "Nuevo día detectado - Backup automático creado y contador reiniciado",
      })
    }

    // Día normal - devolver estado actual
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

        // 🤖 VERIFICACIÓN AUTOMÁTICA antes de generar ticket
        const estadoActual = await leerEstadoSistema()
        if (debeReiniciarse(estadoActual)) {
          console.log("🤖 Detectado cambio de día antes de generar ticket - Ejecutando proceso automático...")
          await realizarBackupYReinicioAutomatico(estadoActual)
        }

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

        // 🤖 VERIFICACIÓN AUTOMÁTICA antes de llamar siguiente
        const estadoActual = await leerEstadoSistema()
        if (debeReiniciarse(estadoActual)) {
          console.log("🤖 Detectado cambio de día antes de llamar siguiente - Ejecutando proceso automático...")
          const estadoReiniciado = await realizarBackupYReinicioAutomatico(estadoActual)

          return NextResponse.json(
            {
              success: false,
              error: "No hay números para llamar - Nuevo día iniciado",
              automaticReset: true,
              message: "Se detectó un nuevo día. El sistema se ha reiniciado automáticamente.",
            },
            { status: 400 },
          )
        }

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
        console.log("🔄 Reinicio manual solicitado...")

        try {
          // PASO 1: Crear backup manual del día actual ANTES de reiniciar
          console.log("📦 Creando backup manual antes del reinicio...")

          const estadoActualCompleto = await leerEstadoSistema()

          // Solo crear backup si hay datos que respaldar
          if (estadoActualCompleto.totalAtendidos > 0) {
            await crearBackupDiario(estadoActualCompleto)
            console.log("✅ Backup manual creado exitosamente antes del reinicio")
          } else {
            console.log("ℹ️ No hay datos para respaldar (0 tickets), omitiendo backup")
          }

          // PASO 2: Proceder con el reinicio normal
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

          console.log("✅ Reinicio manual completado exitosamente con backup")

          return NextResponse.json({
            success: true,
            estado: estadoReiniciado,
            message: "Sistema reiniciado exitosamente. Backup manual creado.",
            backupCreado: estadoActualCompleto.totalAtendidos > 0,
            ticketsRespaldados: estadoActualCompleto.totalAtendidos,
            manualReset: true,
          })
        } catch (backupError) {
          console.error("⚠️ Error al crear backup manual, pero continuando con reinicio:", backupError)

          // Si falla el backup, continuar con el reinicio pero informar del error
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

          console.log("✅ Reinicio manual completado (backup falló)")

          return NextResponse.json({
            success: true,
            estado: estadoReiniciado,
            message: "Sistema reiniciado exitosamente. Advertencia: No se pudo crear el backup manual.",
            backupCreado: false,
            backupError: backupError instanceof Error ? backupError.message : "Error desconocido",
            manualReset: true,
          })
        }
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
