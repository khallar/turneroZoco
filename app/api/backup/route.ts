import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const BACKUP_DIR = path.join(DATA_DIR, "backups")

// Asegurar que los directorios existan
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creando directorios:", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha") // YYYY-MM-DD
    const accion = searchParams.get("accion") // 'listar' o 'obtener'

    await ensureDirectories()

    if (accion === "listar") {
      // Listar todos los backups disponibles
      try {
        const files = await fs.readdir(BACKUP_DIR)
        const backupFiles = files.filter((file) => file.startsWith("backup-") && file.endsWith(".json"))

        const backups = backupFiles
          .map((file) => {
            const fecha = file.replace("backup-", "").replace(".json", "")
            return {
              fecha,
              key: file,
            }
          })
          .sort((a, b) => b.fecha.localeCompare(a.fecha)) // Más recientes primero

        return NextResponse.json({ backups })
      } catch (error) {
        console.error("Error al listar backups:", error)
        return NextResponse.json({ backups: [] })
      }
    }

    if (fecha) {
      // Obtener backup específico
      const backupFile = path.join(BACKUP_DIR, `backup-${fecha}.json`)

      try {
        const data = await fs.readFile(backupFile, "utf8")
        const backup = JSON.parse(data)

        return NextResponse.json(backup)
      } catch (error) {
        console.error("Error al obtener backup:", error)
        return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
      }
    }

    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
  } catch (error) {
    console.error("Error en API de backup:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion } = body

    await ensureDirectories()

    if (accion === "limpiar_antiguos") {
      // Limpiar backups antiguos (más de 30 días)
      try {
        const files = await fs.readdir(BACKUP_DIR)
        const backupFiles = files.filter((file) => file.startsWith("backup-") && file.endsWith(".json"))

        const ahora = new Date()
        const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)

        let eliminados = 0
        for (const file of backupFiles) {
          const fecha = file.replace("backup-", "").replace(".json", "")
          const fechaBackup = new Date(fecha)

          if (fechaBackup < hace30Dias) {
            await fs.unlink(path.join(BACKUP_DIR, file))
            eliminados++
          }
        }

        return NextResponse.json({
          mensaje: `${eliminados} backups antiguos eliminados`,
          eliminados,
        })
      } catch (error) {
        console.error("Error al limpiar backups:", error)
        return NextResponse.json({ error: "Error al limpiar backups" }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en POST de backup:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
