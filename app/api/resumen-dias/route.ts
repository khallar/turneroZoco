import { type NextRequest, NextResponse } from "next/server"
import { obtenerResumenDiasAnteriores } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API: Solicitando resumen de días anteriores...")

    const resumen = await obtenerResumenDiasAnteriores()

    console.log("✅ API: Resumen generado exitosamente")
    console.log(`📊 Datos: ${resumen.resumenGeneral.totalDias} días, ${resumen.datosPorDia.length} registros`)

    return NextResponse.json(resumen, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ API: Error al generar resumen de días anteriores:", error)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido",
        resumenGeneral: {
          error: "Error al cargar datos",
          totalDias: 0,
          totalTicketsHistoricos: 0,
        },
        datosPorDia: [],
        tendencias: { error: "Error al calcular tendencias" },
        comparativas: { error: "Error al generar comparativas" },
      },
      { status: 500 },
    )
  }
}
