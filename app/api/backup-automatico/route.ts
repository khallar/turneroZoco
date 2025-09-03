import { NextResponse } from "next/server"
import { forzarBackupDiario, obtenerBackups, leerEstadoSistema, getTodayDateString } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "verificar_estado") {
      // Verificar estado de backups
      const backups = await obtenerBackups()
      const fechaHoy = getTodayDateString()
      const fechaAyer = getYesterdayDateString()

      const backupHoy = backups.find((b) => b.fecha === fechaHoy)
      const backupAyer = backups.find((b) => b.fecha === fechaAyer)

      const estado = await leerEstadoSistema()

      return NextResponse.json({
        success: true,
        estado: {
          fechaActual: fechaHoy,
          ticketsHoy: estado.totalAtendidos,
          backupHoyExiste: !!backupHoy,
          backupAyerExiste: !!backupAyer,
          totalBackups: backups.length,
          ultimosBackups: backups.slice(0, 5).map((b) => ({
            fecha: b.fecha,
            tickets: b.resumen?.totalTicketsEmitidos || 0,
          })),
        },
      })
    }

    if (action === "forzar_backup") {
      const resultado = await forzarBackupDiario()
      return NextResponse.json(resultado, {
        status: resultado.success ? 200 : 400,
      })
    }

    return NextResponse.json(
      {
        error: "Acción no válida",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("❌ Error en backup automático:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }
  const formatter = new Intl.DateTimeFormat("en-CA", options)
  return formatter.format(yesterday)
}
