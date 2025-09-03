import { type NextRequest, NextResponse } from "next/server"
import { forzarBackupDiario, leerEstadoSistema, crearBackupDiario, getTodayDateString } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion, fecha } = body

    console.log(`🔧 API Backup Automático - Acción: ${accion}, Fecha: ${fecha}`)

    if (accion === "verificar_y_crear") {
      // Verificar si existe backup para una fecha específica y crearlo si no existe
      const fechaTarget = fecha || getTodayDateString()

      try {
        const estado = await leerEstadoSistema()

        if (estado.totalAtendidos > 0) {
          await crearBackupDiario(estado)

          return NextResponse.json({
            success: true,
            message: `Backup verificado y creado para ${fechaTarget}`,
            datos: {
              fecha: fechaTarget,
              ticketsEmitidos: estado.totalAtendidos,
              ticketsAtendidos: estado.numerosLlamados,
              eficiencia:
                estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0,
            },
          })
        } else {
          return NextResponse.json({
            success: false,
            message: `No hay datos para crear backup en ${fechaTarget}`,
            datos: { fecha: fechaTarget, ticketsEmitidos: 0 },
          })
        }
      } catch (error) {
        console.error("❌ Error al verificar y crear backup:", error)
        return NextResponse.json(
          {
            success: false,
            message: `Error al procesar backup para ${fechaTarget}: ${error instanceof Error ? error.message : "Error desconocido"}`,
          },
          { status: 500 },
        )
      }
    }

    if (accion === "forzar_backup_hoy") {
      // Forzar creación de backup para el día actual
      try {
        const resultado = await forzarBackupDiario()
        return NextResponse.json(resultado, {
          status: resultado.success ? 200 : 400,
        })
      } catch (error) {
        console.error("❌ Error al forzar backup diario:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Error interno al forzar backup",
          },
          { status: 500 },
        )
      }
    }

    if (accion === "backup_fin_de_dia") {
      // Crear backup de fin de día (llamado automáticamente por cron o scheduler)
      try {
        const fechaHoy = getTodayDateString()
        const estado = await leerEstadoSistema()

        if (estado.totalAtendidos > 0) {
          await crearBackupDiario(estado)

          // Registrar en logs que se creó backup de fin de día
          console.log(`🌙 Backup de fin de día creado automáticamente para ${fechaHoy}`)

          return NextResponse.json({
            success: true,
            message: `Backup de fin de día creado para ${fechaHoy}`,
            tipo: "fin_de_dia",
            datos: {
              fecha: fechaHoy,
              ticketsEmitidos: estado.totalAtendidos,
              ticketsAtendidos: estado.numerosLlamados,
              horaCreacion: new Date().getHours(),
              automatico: true,
            },
          })
        } else {
          return NextResponse.json({
            success: false,
            message: `No hay actividad para respaldar en ${fechaHoy}`,
            tipo: "fin_de_dia",
          })
        }
      } catch (error) {
        console.error("❌ Error en backup de fin de día:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Error al crear backup de fin de día",
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Acción no válida",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("❌ Error en API de backup automático:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const verificar = searchParams.get("verificar") // 'hoy' o 'ayer'

    if (verificar === "hoy") {
      const resultado = await forzarBackupDiario()
      return NextResponse.json(resultado)
    }

    if (verificar === "ayer") {
      // Verificar si existe backup de ayer
      const ayer = new Date()
      ayer.setDate(ayer.getDate() - 1)
      const fechaAyer = ayer.toISOString().split("T")[0]

      try {
        const { obtenerBackup } = await import("@/lib/database")
        const backupAyer = await obtenerBackup(fechaAyer)

        return NextResponse.json({
          success: !!backupAyer,
          message: backupAyer ? `Backup existe para ${fechaAyer}` : `No existe backup para ${fechaAyer}`,
          fecha: fechaAyer,
          datos: backupAyer
            ? {
                ticketsEmitidos: backupAyer.resumen?.totalTicketsEmitidos || 0,
                ticketsAtendidos: backupAyer.resumen?.totalTicketsAtendidos || 0,
                eficiencia: backupAyer.resumen?.eficienciaDiaria || 0,
              }
            : null,
        })
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: `Error al verificar backup de ayer: ${error instanceof Error ? error.message : "Error desconocido"}`,
            fecha: fechaAyer,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Parámetro 'verificar' requerido (hoy|ayer)",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("❌ Error en GET de backup automático:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
