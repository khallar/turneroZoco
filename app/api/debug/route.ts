import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const ESTADO_FILE = path.join(DATA_DIR, "estado.json")
const CONTADOR_FILE = path.join(DATA_DIR, "contador.json")
const BACKUP_DIR = path.join(DATA_DIR, "backups")

export async function GET() {
  try {
    // Información de debug
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PLATFORM: "File System",
      },
      fileSystem: {
        dataDir: DATA_DIR,
        estadoFile: ESTADO_FILE,
        contadorFile: CONTADOR_FILE,
        backupDir: BACKUP_DIR,
      },
    }

    // Probar acceso al sistema de archivos
    try {
      // Verificar si los directorios existen
      try {
        await fs.access(DATA_DIR)
        debug.fileSystem.dataDirExists = true
      } catch {
        debug.fileSystem.dataDirExists = false
      }

      try {
        await fs.access(BACKUP_DIR)
        debug.fileSystem.backupDirExists = true
      } catch {
        debug.fileSystem.backupDirExists = false
      }

      // Verificar archivos principales
      try {
        await fs.access(ESTADO_FILE)
        debug.fileSystem.estadoFileExists = true
        const stats = await fs.stat(ESTADO_FILE)
        debug.fileSystem.estadoFileSize = stats.size
        debug.fileSystem.estadoFileModified = stats.mtime.toISOString()
      } catch {
        debug.fileSystem.estadoFileExists = false
      }

      try {
        await fs.access(CONTADOR_FILE)
        debug.fileSystem.contadorFileExists = true
        const data = await fs.readFile(CONTADOR_FILE, "utf8")
        const contador = JSON.parse(data)
        debug.fileSystem.contadorActual = contador.contador
      } catch {
        debug.fileSystem.contadorFileExists = false
      }

      // Listar backups
      try {
        const files = await fs.readdir(BACKUP_DIR)
        const backupFiles = files.filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
        debug.fileSystem.backupsCount = backupFiles.length
        debug.fileSystem.backupFiles = backupFiles.slice(0, 5) // Mostrar solo los primeros 5
      } catch {
        debug.fileSystem.backupsCount = 0
      }

      debug.fileSystem.connection = "Exitosa"
    } catch (error) {
      debug.fileSystem.connection = `Error: ${error instanceof Error ? error.message : "Error desconocido"}`
    }

    return NextResponse.json(debug)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error en debug",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
