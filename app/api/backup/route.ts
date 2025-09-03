import { type NextRequest, NextResponse } from "next/server"
import { obtenerBackups, obtenerBackup, limpiarDatosAntiguos } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha") // YYYY-MM-DD
    const accion = searchParams.get("accion") // 'listar' o 'obtener'
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)

    if (accion === "listar") {
      // Listar todos los backups disponibles con paginación
      try {
        const backupsResult = await obtenerBackups(page, limit)

        console.log(
          `📦 Backups encontrados en TURNOS_ZOCO (Upstash Redis): ${backupsResult.totalBackups} total, página ${page}`,
        )
        return NextResponse.json(backupsResult)
      } catch (error) {
        console.error("❌ Error al listar backups (TURNOS_ZOCO):", error)
        return NextResponse.json({
          backups: [],
          totalPages: 0,
          currentPage: page,
          totalBackups: 0,
          hasNextPage: false,
          hasPrevPage: false,
        })
      }
    }

    if (fecha) {
      // Obtener backup específico
      try {
        const backup = await obtenerBackup(fecha)

        if (backup) {
          return NextResponse.json(backup)
        } else {
          return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
        }
      } catch (error) {
        console.error("❌ Error al obtener backup (TURNOS_ZOCO):", error)
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
      }
    }

    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error en API de backup (TURNOS_ZOCO):", error)
    return NextResponse.json({ error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion } = body

    if (accion === "limpiar_antiguos") {
      // Limpiar backups antiguos (más de 90 días)
      try {
        await limpiarDatosAntiguos()

        console.log("🧹 Datos antiguos limpiados en TURNOS_ZOCO (Upstash Redis)")
        return NextResponse.json({
          mensaje: "Datos antiguos limpiados exitosamente",
        })
      } catch (error) {
        console.error("❌ Error al limpiar backups (TURNOS_ZOCO):", error)
        return NextResponse.json({ error: "Error al limpiar backups" }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error en POST de backup (TURNOS_ZOCO):", error)
    return NextResponse.json({ error: "Error interno del servidor - TURNOS_ZOCO (Upstash Redis)" }, { status: 500 })
  }
}
