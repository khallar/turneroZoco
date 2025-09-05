import { type NextRequest, NextResponse } from "next/server"

// Función para obtener backups desde Redis
async function obtenerBackupsDesdeRedis() {
  try {
    // Importar Redis dinámicamente para evitar errores de inicialización
    const { Redis } = await import("@upstash/redis")

    // Obtener configuración de Redis
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!redisUrl || !redisToken) {
      console.error("❌ Variables de entorno Redis no encontradas")
      return []
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.exp(retryCount) * 50,
      },
    })

    console.log("🔍 Buscando backups en Redis...")

    // Buscar todas las claves de backup
    const keys = await redis.keys("turnos_zoco:backup:*")
    console.log(`📦 Encontradas ${keys.length} claves de backup`)

    if (keys.length === 0) {
      return []
    }

    // Obtener todos los backups
    const backups = []
    for (const key of keys) {
      try {
        const backup = await redis.get(key)
        if (backup && typeof backup === "object") {
          // Extraer fecha de la clave
          const fecha = key.replace("turnos_zoco:backup:", "")

          // Crear resumen del backup
          const resumen = {
            fecha: fecha,
            totalTicketsEmitidos: backup.estado?.totalAtendidos || 0,
            totalTicketsAtendidos: backup.estado?.numerosLlamados || 0,
            ticketsPendientes: Math.max(
              0,
              (backup.estado?.totalAtendidos || 0) - (backup.estado?.numerosLlamados || 0),
            ),
            eficienciaDiaria:
              backup.estado?.totalAtendidos > 0
                ? Math.round((backup.estado.numerosLlamados / backup.estado.totalAtendidos) * 100)
                : 0,
            primerTicket: backup.estado?.tickets?.[0]?.numero || 0,
            ultimoTicket: backup.estado?.tickets?.[backup.estado.tickets.length - 1]?.numero || 0,
            tiempoPromedioEsperaReal: 0, // Calcular si es necesario
            horaPico: { hora: 14, cantidad: 0, porcentaje: 0 }, // Valor por defecto
            velocidadAtencion: 0,
            tiempoEntreTickets: 0,
            nombresComunes: [],
            distribucionPorHora: {},
          }

          // Calcular distribución por hora si hay tickets
          if (backup.estado?.tickets && Array.isArray(backup.estado.tickets)) {
            const distribucionPorHora = {}
            const nombresMap = {}

            backup.estado.tickets.forEach((ticket) => {
              // Distribución por hora
              const fecha = new Date(ticket.timestamp || ticket.fecha)
              const hora = fecha.getHours()
              distribucionPorHora[hora] = (distribucionPorHora[hora] || 0) + 1

              // Nombres comunes
              const nombre = ticket.nombre?.toLowerCase()?.trim()
              if (nombre && nombre !== "cliente zoco") {
                nombresMap[nombre] = (nombresMap[nombre] || 0) + 1
              }
            })

            resumen.distribucionPorHora = distribucionPorHora
            resumen.nombresComunes = Object.entries(nombresMap)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)

            // Encontrar hora pico
            const horaPicoEntry = Object.entries(distribucionPorHora).reduce(
              (max, [hora, cantidad]) => (cantidad > max.cantidad ? { hora: Number.parseInt(hora), cantidad } : max),
              { hora: 0, cantidad: 0 },
            )

            resumen.horaPico = {
              hora: horaPicoEntry.hora,
              cantidad: horaPicoEntry.cantidad,
              porcentaje:
                backup.estado.totalAtendidos > 0
                  ? Math.round((horaPicoEntry.cantidad / backup.estado.totalAtendidos) * 100)
                  : 0,
            }
          }

          backups.push({
            fecha: fecha,
            resumen: resumen,
            timestamp: backup.timestamp || Date.now(),
            version: backup.version || "1.0",
          })
        }
      } catch (error) {
        console.error(`❌ Error al procesar backup ${key}:`, error)
        // Continuar con el siguiente backup
      }
    }

    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    console.log(`✅ Procesados ${backups.length} backups exitosamente`)
    return backups
  } catch (error) {
    console.error("❌ Error al obtener backups desde Redis:", error)
    return []
  }
}

// Función para obtener un backup específico
async function obtenerBackupEspecifico(fecha: string) {
  try {
    const { Redis } = await import("@upstash/redis")

    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!redisUrl || !redisToken) {
      console.error("❌ Variables de entorno Redis no encontradas")
      return null
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.exp(retryCount) * 50,
      },
    })

    console.log(`🔍 Buscando backup para fecha: ${fecha}`)

    const backupKey = `turnos_zoco:backup:${fecha}`
    const backup = await redis.get(backupKey)

    if (!backup) {
      console.log(`❌ No se encontró backup para ${fecha}`)
      return null
    }

    console.log(`✅ Backup encontrado para ${fecha}`)
    return backup
  } catch (error) {
    console.error(`❌ Error al obtener backup específico para ${fecha}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")
    const accion = searchParams.get("accion")

    console.log(`📥 Solicitud de backup - Acción: ${accion}, Fecha: ${fecha}`)

    if (accion === "listar") {
      // Listar todos los backups disponibles
      try {
        const backups = await obtenerBackupsDesdeRedis()
        console.log(`📦 Devolviendo ${backups.length} backups`)

        return NextResponse.json({
          backups,
          total: backups.length,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("❌ Error al listar backups:", error)
        return NextResponse.json({
          backups: [],
          error: "Error al obtener lista de backups",
          details: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    if (fecha) {
      // Obtener backup específico
      try {
        const backup = await obtenerBackupEspecifico(fecha)

        if (backup) {
          console.log(`✅ Devolviendo backup para ${fecha}`)
          return NextResponse.json(backup)
        } else {
          console.log(`❌ Backup no encontrado para ${fecha}`)
          return NextResponse.json(
            {
              error: "Backup no encontrado",
              fecha: fecha,
            },
            { status: 404 },
          )
        }
      } catch (error) {
        console.error(`❌ Error al obtener backup para ${fecha}:`, error)
        return NextResponse.json(
          {
            error: "Error al obtener backup",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Parámetros inválidos",
        message: "Se requiere 'accion=listar' o 'fecha=YYYY-MM-DD'",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("❌ Error general en API de backup:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accion } = body

    console.log(`📥 Solicitud POST de backup - Acción: ${accion}`)

    if (accion === "limpiar_antiguos") {
      // Limpiar backups antiguos (más de 30 días)
      try {
        const { Redis } = await import("@upstash/redis")

        const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
        const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

        if (!redisUrl || !redisToken) {
          throw new Error("Variables de entorno Redis no encontradas")
        }

        const redis = new Redis({
          url: redisUrl,
          token: redisToken,
        })

        const keys = await redis.keys("turnos_zoco:backup:*")
        const now = Date.now()
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

        const keysToDelete = []
        for (const key of keys) {
          const datePart = key.replace("turnos_zoco:backup:", "")
          const keyDate = new Date(datePart).getTime()
          if (keyDate < thirtyDaysAgo) {
            keysToDelete.push(key)
          }
        }

        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete)
          console.log(`🗑️ Eliminados ${keysToDelete.length} backups antiguos`)
        }

        return NextResponse.json({
          mensaje: "Datos antiguos limpiados exitosamente",
          eliminados: keysToDelete.length,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("❌ Error al limpiar backups:", error)
        return NextResponse.json(
          {
            error: "Error al limpiar backups",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Acción no válida",
        accionesDisponibles: ["limpiar_antiguos"],
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("❌ Error en POST de backup:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
