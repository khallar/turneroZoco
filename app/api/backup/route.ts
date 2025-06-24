import { type NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

// Inicializar Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const REDIS_KEYS = {
  BACKUP_PREFIX: "sistema:backup:",
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha") // YYYY-MM-DD
    const accion = searchParams.get("accion") // 'listar' o 'obtener'

    if (accion === "listar") {
      // Listar todos los backups disponibles usando SCAN
      try {
        const keys = await redis.keys(`${REDIS_KEYS.BACKUP_PREFIX}*`)

        const backups = keys
          .map((key) => {
            const fecha = key.replace(REDIS_KEYS.BACKUP_PREFIX, "")
            return {
              fecha,
              key,
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
      const backupKey = `${REDIS_KEYS.BACKUP_PREFIX}${fecha}`

      try {
        const backup = await redis.get(backupKey)

        if (backup) {
          return NextResponse.json(backup)
        } else {
          return NextResponse.json({ error: "Backup no encontrado" }, { status: 404 })
        }
      } catch (error) {
        console.error("Error al obtener backup:", error)
        return NextResponse.json({ error: "Error al obtener backup" }, { status: 500 })
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

    if (accion === "limpiar_antiguos") {
      // Limpiar backups antiguos (más de 30 días)
      try {
        const keys = await redis.keys(`${REDIS_KEYS.BACKUP_PREFIX}*`)
        const ahora = new Date()
        const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)

        let eliminados = 0
        for (const key of keys) {
          const fecha = key.replace(REDIS_KEYS.BACKUP_PREFIX, "")
          const fechaBackup = new Date(fecha)

          if (fechaBackup < hace30Dias) {
            await redis.del(key)
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
