import { Redis } from "@upstash/redis"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string // YYYY-MM-DD
  ultimoReinicio: string // ISO string
  tickets: TicketInfo[]
  lastSync?: number
}

// Inicializar cliente de Upstash Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Prefijos para las claves de Redis
const STATE_KEY_PREFIX = "sistemaTurnosZOCO:estado:" // sistemaTurnosZOCO:estado:YYYY-MM-DD
const BACKUP_KEY_PREFIX = "sistemaTurnosZOCO:backup:" // sistemaTurnosZOCO:backup:YYYY-MM-DD
const LOGS_KEY = "sistemaTurnosZOCO:logs"

// Función auxiliar para obtener la fecha actual en formato YYYY-MM-DD (Argentina)
function getTodayDateString(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }
  const formatter = new Intl.DateTimeFormat("en-CA", options) // en-CA para YYYY-MM-DD
  return formatter.format(now)
}

// Función para leer el estado actual del sistema
export async function leerEstadoSistema(): Promise<EstadoSistema> {
  try {
    console.log("📖 Leyendo estado desde Upstash Redis...")
    const fechaHoy = getTodayDateString()
    const estadoKey = STATE_KEY_PREFIX + fechaHoy

    const estadoGuardado = await redis.get<EstadoSistema>(estadoKey)

    let estado: EstadoSistema

    if (estadoGuardado) {
      estado = estadoGuardado
      console.log("✅ Estado cargado desde Upstash Redis:", {
        numeroActual: estado.numeroActual,
        totalAtendidos: estado.totalAtendidos,
        totalTickets: estado.tickets?.length || 0,
      })
    } else {
      // Crear estado inicial para el día si no existe
      console.log("⚠️ No se encontró estado para hoy, creando inicial en Upstash Redis...")
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }
      await escribirEstadoSistema(estado) // Guardar el estado inicial
    }

    return estado
  } catch (error) {
    console.error("❌ Error al leer estado del sistema desde Upstash Redis:", error)
    throw error
  }
}

// Función para escribir el estado del sistema
export async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  try {
    console.log("💾 Escribiendo estado a Upstash Redis...")
    const estadoKey = STATE_KEY_PREFIX + estado.fechaInicio
    estado.lastSync = Date.now() // Actualizar timestamp de sincronización

    await redis.set(estadoKey, estado)

    console.log("✅ Estado guardado exitosamente en Upstash Redis")
  } catch (error) {
    console.error("❌ Error al escribir estado en Upstash Redis:", error)
    throw error
  }
}

// Función para generar un nuevo ticket de forma atómica
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo> {
  try {
    console.log("🎫 Generando ticket atómico para:", nombre, "en Upstash Redis...")
    const fechaHoy = getTodayDateString()
    const estadoKey = STATE_KEY_PREFIX + fechaHoy

    // Usar MULTI/EXEC para asegurar atomicidad en la actualización del contador y el estado
    const result = await redis
      .multi()
      .incr(estadoKey + ":numeroActualCounter") // Incrementa un contador auxiliar para el número de ticket
      .get<EstadoSistema>(estadoKey) // Obtiene el estado actual
      .exec()

    const [numeroAsignadoRaw, estadoActualRaw] = result as [number, EstadoSistema | null]
    const numeroAsignado = numeroAsignadoRaw

    let estadoActual: EstadoSistema
    if (estadoActualRaw) {
      estadoActual = estadoActualRaw
    } else {
      // Si el estado no existe (primer ticket del día), inicializarlo
      estadoActual = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }
    }

    const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
    const timestamp = Date.now()

    const nuevoTicket: TicketInfo = {
      numero: numeroAsignado,
      nombre: nombre.trim(),
      fecha,
      timestamp,
    }

    // Actualizar el estado en memoria
    estadoActual.numeroActual = numeroAsignado + 1 // El siguiente número a emitir
    estadoActual.ultimoNumero = numeroAsignado // El último número emitido
    estadoActual.totalAtendidos = (estadoActual.totalAtendidos || 0) + 1 // Incrementa el total de tickets emitidos
    estadoActual.tickets = [...(estadoActual.tickets || []), nuevoTicket] // Agrega el nuevo ticket a la lista
    estadoActual.lastSync = Date.now() // Actualiza el timestamp de sincronización

    // Guardar el estado actualizado
    await redis.set(estadoKey, estadoActual)

    // Log de la acción (opcional, para auditoría)
    await redis.lpush(
      LOGS_KEY,
      JSON.stringify({
        accion: "GENERAR_TICKET",
        detalles: { numero: numeroAsignado, nombre: nombre.trim() },
        timestamp_log: timestamp,
      }),
    )

    console.log("✅ Ticket generado exitosamente en Upstash Redis:", nuevoTicket)

    return nuevoTicket
  } catch (error) {
    console.error("❌ Error al generar ticket en Upstash Redis:", error)
    throw error
  }
}

// Función para crear backup diario
export async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    console.log("📦 Creando backup diario en Upstash Redis...")

    const fecha = estado.fechaInicio
    const backupKey = BACKUP_KEY_PREFIX + fecha

    const backupData = {
      fecha,
      estadoFinal: estado,
      resumen: {
        totalTicketsEmitidos: estado.totalAtendidos,
        totalTicketsAtendidos: estado.numerosLlamados,
        ticketsPendientes: estado.totalAtendidos - estado.numerosLlamados,
        primerTicket: estado.tickets[0]?.numero || 0,
        ultimoTicket: estado.ultimoNumero,
        horaInicio: estado.fechaInicio,
        horaBackup: new Date().toISOString(),
      },
      tickets: estado.tickets,
    }

    await redis.set(backupKey, backupData)
    // Opcional: Establecer una expiración para los backups, por ejemplo, 60 días
    await redis.expire(backupKey, 60 * 24 * 60 * 60) // 60 días en segundos

    console.log("✅ Backup diario creado exitosamente en Upstash Redis")
  } catch (error) {
    console.error("❌ Error al crear backup diario en Upstash Redis:", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

// Función para obtener backups
export async function obtenerBackups(): Promise<any[]> {
  try {
    // Upstash Redis no tiene un comando KEYS que sea eficiente para producción.
    // En un sistema real, se mantendría una lista de claves de backup.
    // Para este ejemplo, simularemos con un rango de fechas o un patrón simple.
    // Si el número de backups es pequeño, KEYS puede ser aceptable.
    const allKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    const backups: any[] = []

    for (const key of allKeys) {
      const backup = await redis.get(key)
      if (backup && typeof backup === "object" && "resumen" in backup) {
        backups.push({
          fecha: backup.fecha,
          resumen: backup.resumen,
          createdAt: backup.horaBackup, // Usar la hora de backup como created_at
        })
      }
    }

    // Ordenar por fecha descendente
    backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    return backups.slice(0, 30) // Limitar a los últimos 30
  } catch (error) {
    console.error("❌ Error al obtener backups desde Upstash Redis:", error)
    return []
  }
}

// Función para obtener backup específico
export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    const backupKey = BACKUP_KEY_PREFIX + fecha
    const backup = await redis.get(backupKey)
    return backup || null
  } catch (error) {
    console.error("❌ Error al obtener backup desde Upstash Redis:", error)
    return null
  }
}

// Función para limpiar datos antiguos (backups y logs)
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    console.log("🧹 Limpiando datos antiguos en Upstash Redis...")
    const allBackupKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos

    for (const key of allBackupKeys) {
      const datePart = key.replace(BACKUP_KEY_PREFIX, "")
      const backupDate = new Date(datePart).getTime()
      if (backupDate < thirtyDaysAgo) {
        await redis.del(key)
        console.log(`🗑️ Eliminado backup antiguo: ${key}`)
      }
    }

    // Limpiar logs antiguos (ejemplo: mantener solo los últimos 1000 logs)
    await redis.ltrim(LOGS_KEY, 0, 999) // Mantener los 1000 logs más recientes

    // Log de limpieza
    await redis.lpush(
      LOGS_KEY,
      JSON.stringify({
        accion: "LIMPIEZA_AUTOMATICA",
        detalles: { descripcion: "Limpieza de datos antiguos" },
        timestamp_log: Date.now(),
      }),
    )

    console.log("✅ Datos antiguos limpiados exitosamente en Upstash Redis")
  } catch (error) {
    console.error("❌ Error al limpiar datos antiguos en Upstash Redis:", error)
  }
}

// Función para obtener estadísticas
export async function obtenerEstadisticas(estado: EstadoSistema) {
  try {
    const estadisticas = {
      totalTicketsHoy: estado.totalAtendidos,
      ticketsAtendidos: estado.numerosLlamados,
      ticketsPendientes: estado.totalAtendidos - estado.numerosLlamados,
      promedioTiempoPorTicket:
        estado.tickets && estado.tickets.length > 1
          ? (estado.tickets[estado.tickets.length - 1].timestamp - estado.tickets[0].timestamp) /
            estado.tickets.length /
            1000 /
            60
          : 0,
      horaInicioOperaciones: estado.fechaInicio,
      ultimaActividad:
        estado.tickets && estado.tickets.length > 0
          ? estado.tickets[estado.tickets.length - 1]?.fecha
          : "Sin actividad",
      ticketsUltimaHora: estado.tickets
        ? estado.tickets.filter((t) => Date.now() - t.timestamp < 60 * 60 * 1000).length
        : 0,
    }

    return estadisticas
  } catch (error) {
    console.error("❌ Error al obtener estadísticas desde Upstash Redis:", error)
    throw error
  }
}

// Función para verificar conexión a la base de datos
export async function verificarConexionDB(): Promise<boolean> {
  try {
    const pong = await redis.ping()
    console.log("✅ Conexión a Upstash Redis exitosa:", pong)
    return pong === "PONG"
  } catch (error) {
    console.error("❌ Error de conexión a Upstash Redis:", error)
    return false
  }
}

// No es necesario cerrar conexiones explícitamente con Upstash Redis (es HTTP)
export async function cerrarConexiones(): Promise<void> {
  console.log("🔌 No es necesario cerrar conexiones para Upstash Redis (HTTP)")
}
