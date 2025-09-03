import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "actualizar_llamados") {
    // Código para actualizar llamados
    return NextResponse.json({ message: "Llamados actualizados" })
  }

  // Manejar acción de forzar backup
  if (action === "forzar_backup") {
    try {
      const { forzarBackupDiario } = await import("@/lib/database")
      const resultado = await forzarBackupDiario()

      return NextResponse.json(resultado, {
        status: resultado.success ? 200 : 400,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    } catch (error) {
      console.error("❌ Error al forzar backup:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error interno al crear backup",
        },
        { status: 500 },
      )
    }
  }

  // ** rest of code here **
  return NextResponse.json({ message: "Acción no reconocida" })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  if (action === "GENERAR_TICKET") {
    // Código para generar ticket
    const nuevoTicket = true // Simulación de ticket generado

    // Después de generar el ticket exitosamente, verificar si necesita backup
    if (nuevoTicket) {
      // Verificar backup automático en background (no bloquear respuesta)
      import("@/lib/database")
        .then(({ verificarYCrearBackupAutomatico }) => {
          verificarYCrearBackupAutomatico?.().catch((error) => {
            console.error("⚠️ Error en verificación de backup automático:", error)
          })
        })
        .catch(() => {
          // Ignorar errores de importación
        })
    }

    return NextResponse.json({ message: "Ticket generado exitosamente" })
  }

  // ** rest of code here **
  return NextResponse.json({ message: "Acción no reconocida" })
}
