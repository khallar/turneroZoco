import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const ESTADO_FILE = path.join(DATA_DIR, "estado.json")
const BACKUP_DIR = path.join(DATA_DIR, "backups")
const LOCK_FILE = path.join(DATA_DIR, "sistema.lock")

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
        backupDir: BACKUP_DIR,
        lockFile: LOCK_FILE,
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

      // Verificar archivo de lock
      try {
        await fs.access(LOCK_FILE)
        debug.fileSystem.lockFileExists = true
        const lockContent = await fs.readFile(LOCK_FILE, "utf8")
        debug.fileSystem.lockTimestamp = lockContent
      } catch {
        debug.fileSystem.lockFileExists = false
      }

      // Verificar archivos principales
      try {
        await fs.access(ESTADO_FILE)
        debug.fileSystem.estadoFileExists = true
        const stats = await fs.stat(ESTADO_FILE)
        debug.fileSystem.estadoFileSize = stats.size
        debug.fileSystem.estadoFileModified = stats.mtime.toISOString()

        // Leer contenido del archivo de estado
        const data = await fs.readFile(ESTADO_FILE, "utf8")
        const estado = JSON.parse(data)
        debug.fileSystem.estadoActual = {
          numeroActual: estado.numeroActual,
          ultimoNumero: estado.ultimoNumero,
          totalAtendidos: estado.totalAtendidos,
          numerosLlamados: estado.numerosLlamados,
          totalTickets: estado.tickets?.length || 0,
          fechaInicio: estado.fechaInicio,
          ultimoReinicio: estado.ultimoReinicio,
        }

        // Verificar integridad
        debug.fileSystem.integridad = {
          ticketsCountMatch: estado.tickets?.length === estado.totalAtendidos,
          numeroActualValido: estado.numeroActual > estado.ultimoNumero,
          numerosLlamadosValido: estado.numerosLlamados <= estado.totalAtendidos,
        }

        // Mostrar algunos tickets de ejemplo
        if (estado.tickets && estado.tickets.length > 0) {
          debug.fileSystem.ticketsEjemplo = estado.tickets.slice(0, 3).map((t) => ({
            numero: t.numero,
            nombre: t.nombre,
            fecha: t.fecha,
          }))
        }
      } catch (parseError) {
        debug.fileSystem.estadoFileExists = true
        debug.fileSystem.parseError = parseError instanceof Error ? parseError.message : "Error de parsing"
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
