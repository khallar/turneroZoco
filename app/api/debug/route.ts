import { type NextRequest, NextResponse } from "next/server"
import { leerEstadoSistema, verificarConexionDB } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    console.log("\n=== 📥 GET /api/debug - sistemaTurnosZOCO (Upstash Redis) ===")

    // Verificar conexión a la base de datos
    const conexionOK = await verificarConexionDB()
    if (!conexionOK) {
      return NextResponse.json({ error: "Error de conexión a sistemaTurnosZOCO (Upstash Redis)" }, { status: 503 })
    }

    const estado = await leerEstadoSistema()

    console.log("📤 Estado actual del sistema (DEBUG - Upstash Redis):", estado)

    return NextResponse.json(estado)
  } catch (error) {
    console.error("❌ Error en GET /api/debug (Upstash Redis):", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor - sistemaTurnosZOCO (Upstash Redis)",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
