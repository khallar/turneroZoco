import { type NextRequest, NextResponse } from "next/server"
import { obtenerBackups, obtenerBackup, verificarConexionDB } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    console.log("\n=== 📥 GET /api/backup - sistemaTurnosZOCO (Upstash Redis) ===")
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")

    // Verificar conexión a la base de datos
    const conexionOK = await verificarConexionDB()
    if (!conexionOK) {
      return NextResponse.json({ error: "Error de conexión a sistemaTurnosZOCO (Upstash Redis)" }, { status: 503 })
    }

    if (fecha) {
      console.log(`🔍 Obteniendo backup para la fecha: ${fecha} (Upstash Redis)`)
      const backup = await obtenerBackup(fecha)
      if (backup) {
        console.log("✅ Backup encontrado y devuelto (Upstash Redis).")
        return NextResponse.json(backup)
      } else {
        console.log("⚠️ Backup no encontrado para la fecha (Upstash Redis).")
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
      }
    } else {
      console.log("📋 Obteniendo lista de todos los backups (Upstash Redis)")
      const backups = await obtenerBackups()
      console.log(`✅ Se encontraron ${backups.length} backups (Upstash Redis).`)
      return NextResponse.json(backups)
    }
  } catch (error) {
    console.error("❌ Error en GET /api/backup (Upstash Redis):", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor - sistemaTurnosZOCO (Upstash Redis)",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
