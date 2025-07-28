import { Redis } from "@upstash/redis"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string // Fecha de emisión
  timestamp: number // Timestamp de emisión
  calledTimestamp?: number // Nuevo: Timestamp de cuando fue llamado
}

// EstadoSistema ahora NO contendrá el array 'tickets' directamente
interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string // YYYY-MM-DD
  ultimoReinicio: string // ISO string
  lastSync?: number
}

// Prefijos para las claves de Redis
const STATE_KEY_PREFIX = "sistemaTurnosZOCO:estado:" // sistemaTurnosZOCO:estado:YYYY-MM-DD
export const TICKETS_LIST_KEY_PREFIX = "sistemaTurnosZOCO:tickets:" // sistemaTurnosZOCO:tickets:YYYY-MM-DD
const BACKUP_KEY_PREFIX = "sistemaTurnosZOCO:backup:" // sistemaTurnosZOCO:backup:YYYY-MM-DD
const LOGS_KEY = "sistemaTurnosZOCO:logs"
export const COUNTER_KEY_PREFIX = "sistemaTurnosZOCO:counter:" // Para el contador atómico de número de ticket

// Validación de variables de entorno para producción
if (!process.env.KV_REST_API_URL) {
  throw new Error("KV_REST_API_URL no está configurada. Es necesaria para la conexión a Upstash Redis.")
}
if (!process.env.KV_REST_API_TOKEN) {
  throw new Error("KV_REST_API_TOKEN no está configurada. Es necesaria para la conexión a Upstash Redis.")
}

// Inicializar cliente de Upstash Redis
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

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

// --- Core State Management ---

// leerEstadoSistema ahora devuelve el estado (metadata) Y los tickets
export async function leerEstadoSistema(): Promise<EstadoSistema & { tickets: TicketInfo[] }> {
  try {
    console.log("📖 Leyendo estado y tickets desde Upstash Redis...")
    const fechaHoy = getTodayDateString()
    const estadoKey = STATE_KEY_PREFIX + fechaHoy
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaHoy

    // Usamos MULTI/EXEC para obtener el estado y la lista de tickets en una sola operación de red
    const [estadoRaw, rawTicketsStrings] = await redis
      .multi()
      .get<EstadoSistema>(estadoKey)
      .lrange<string>(ticketsListKey, 0, -1) // Solicitar cadenas de texto
      .exec()

    let estado: EstadoSistema
    let tickets: TicketInfo[] = []

    // Asegurarse de que rawTicketsStrings sea un array antes de mapear
    if (Array.isArray(rawTicketsStrings)) {
      tickets = rawTicketsStrings.map((ticketStr) => {
        try {
          // Manejar explícitamente nulls y la cadena literal "[object Object]"
          if (ticketStr === null || typeof ticketStr !== "string" || ticketStr === "[object Object]") {
            console.warn(
              `⚠️ Saltando cadena de ticket malformada o nula (tipo: ${typeof ticketStr}, valor: ${ticketStr}).`,
            )
            return { numero: 0, nombre: "Datos corruptos", fecha: new Date().toLocaleString(), timestamp: Date.now() }
          }
          return JSON.parse(ticketStr) as TicketInfo
        } catch (parseError) {
          console.error(`❌ Error al analizar la cadena del ticket: ${ticketStr}`, parseError)
          return { numero: 0, nombre: "Error de datos", fecha: new Date().toLocaleString(), timestamp: Date.now() }
        }
      })
    } else if (rawTicketsStrings === null) {
      // Si lrange devuelve null (la clave no existe), es una lista vacía
      tickets = []
    } else {
      // Este caso idealmente no debería ocurrir para lrange, pero maneja valores inesperados
      console.warn("⚠️ Resultado inesperado no-array para la lista de tickets:", rawTicketsStrings)
      tickets = []
    }

    if (estadoRaw) {
      estado = estadoRaw
      console.log("✅ Estado y tickets cargados desde Upstash Redis.")
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
        lastSync: Date.now(),
      }
      // No llamar a escribirEstadoSistema aquí para evitar recursión,
      // el llamador (GET /api/sistema) se encargará de escribirlo si es necesario.
    }

    return { ...estado, tickets }
  } catch (error) {
    console.error("❌ Error al leer estado del sistema desde Upstash Redis:", error)
    throw error
  }
}

// escribirEstadoSistema ahora solo escribe la metadata del estado
export async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  try {
    console.log("💾 Escribiendo estado (metadata) a Upstash Redis...")
    const estadoKey = STATE_KEY_PREFIX + estado.fechaInicio
    estado.lastSync = Date.now() // Actualizar timestamp de sincronización

    await redis.set(estadoKey, estado)
    // Establecer una expiración para la clave de estado (ej. 25 horas)
    await redis.expire(estadoKey, 24 * 60 * 60 + 3600) // 25 horas
    console.log("✅ Estado (metadata) guardado exitosamente en Upstash Redis")
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
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
    const counterKey = COUNTER_KEY_PREFIX + fechaHoy

    // Transacción 1: Obtener el estado actual y el contador de ticket
    // Esto se hace en un solo viaje de ida y vuelta a Redis
    const [numeroAsignadoRaw, estadoRaw] = await redis
      .multi()
      .incr(counterKey) // Incrementa el contador diario de tickets
      .get<EstadoSistema>(estadoKey) // Obtiene la metadata del estado actual
      .exec()

    const numeroAsignado = numeroAsignadoRaw as number

    let estadoActual: EstadoSistema
    if (estadoRaw) {
      estadoActual = estadoRaw
    } else {
      // Si el estado no existe (primer ticket del día), inicializarlo
      estadoActual = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        lastSync: Date.now(),
      }
      // Establecer expiración para la clave del contador si es nueva
      await redis.expire(counterKey, 24 * 60 * 60 + 3600) // 25 horas
    }

    const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
    const timestamp = Date.now()

    const nuevoTicket: TicketInfo = {
      numero: numeroAsignado,
      nombre: nombre.trim(),
      fecha,
      timestamp,
      // calledTimestamp no se establece aquí, se establece cuando se llama
    }

    // Actualizar la metadata del estado en memoria
    estadoActual.numeroActual = numeroAsignado + 1
    estadoActual.ultimoNumero = numeroAsignado
    estadoActual.totalAtendidos = (estadoActual.totalAtendidos || 0) + 1
    estadoActual.lastSync = Date.now()

    // Transacción 2: Guardar el estado actualizado, añadir el nuevo ticket a la lista y registrar el log
    // Esto también se hace en un solo viaje de ida y vuelta a Redis
    await redis
      .multi()
      .set(estadoKey, estadoActual) // Guarda la metadata del estado actualizada
      .rpush(ticketsListKey, JSON.stringify(nuevoTicket)) // Añade el nuevo ticket al final de la lista de tickets del día (como string)
      .lpush(
        LOGS_KEY,
        JSON.stringify({
          accion: "GENERAR_TICKET",
          detalles: { numero: numeroAsignado, nombre: nombre.trim() },
          timestamp_log: timestamp,
        }),
      )
      .exec()

    // Establecer expiración para la lista de tickets si es nueva o para asegurar que expire
    await redis.expire(ticketsListKey, 24 * 60 * 60 + 3600) // 25 horas

    console.log("✅ Ticket generado exitosamente en Upstash Redis:", nuevoTicket)

    return nuevoTicket
  } catch (error) {
    console.error("❌ Error al generar ticket en Upstash Redis:", error)
    throw error
  }
}

// Nueva función para marcar un ticket como llamado
export async function marcarTicketComoLlamado(numeroTicket: number, fechaInicio: string): Promise<void> {
  try {
    console.log(`📞 Marcando ticket #${numeroTicket} como llamado en Upstash Redis...`)
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaInicio

    // 1. Obtener todos los tickets de la lista
    const rawTicketsStrings = await redis.lrange<string>(ticketsListKey, 0, -1)
    let tickets: TicketInfo[] = []

    if (Array.isArray(rawTicketsStrings)) {
      tickets = rawTicketsStrings.map((ticketStr) => {
        try {
          return JSON.parse(ticketStr) as TicketInfo
        } catch (parseError) {
          console.error(`❌ Error al analizar la cadena del ticket durante la actualización: ${ticketStr}`, parseError)
          return { numero: 0, nombre: "Error de datos", fecha: new Date().toLocaleString(), timestamp: Date.now() }
        }
      })
    }

    // 2. Encontrar y actualizar el ticket
    let updated = false
    const updatedTickets = tickets.map((ticket) => {
      if (ticket.numero === numeroTicket) {
        if (!ticket.calledTimestamp) {
          // Solo actualizar si no ha sido llamado ya
          ticket.calledTimestamp = Date.now()
          updated = true
          console.log(`✅ Ticket #${numeroTicket} actualizado con calledTimestamp: ${ticket.calledTimestamp}`)
        }
      }
      return ticket
    })

    if (updated) {
      // 3. Eliminar la lista antigua y guardar la nueva lista actualizada
      // Esto se hace en una transacción MULTI/EXEC para asegurar atomicidad
      const multi = redis.multi()
      multi.del(ticketsListKey) // Eliminar la clave de la lista
      if (updatedTickets.length > 0) {
        multi.rpush(ticketsListKey, ...updatedTickets.map((t) => JSON.stringify(t))) // Volver a añadir todos los tickets
      }
      await multi.exec()
      console.log(`💾 Lista de tickets actualizada en Upstash Redis para ticket #${numeroTicket}.`)
    } else {
      console.log(`ℹ️ Ticket #${numeroTicket} no encontrado o ya tenía calledTimestamp.`)
    }
  } catch (error) {
    console.error(`❌ Error al marcar ticket #${numeroTicket} como llamado en Upstash Redis:`, error)
    throw error
  }
}

// --- Backup & Admin Functions ---

// crearBackupDiario ahora espera el estado completo (metadata + tickets)
export async function crearBackupDiario(estado: EstadoSistema & { tickets: TicketInfo[] }): Promise<void> {
  try {
    console.log("📦 Creando backup diario en Upstash Redis...")

    const fecha = estado.fechaInicio
    const backupKey = BACKUP_KEY_PREFIX + fecha

    const backupData = {
      fecha,
      estadoFinal: {
        numeroActual: estado.numeroActual,
        ultimoNumero: estado.ultimoNumero,
        totalAtendidos: estado.totalAtendidos,
        numerosLlamados: estado.numerosLlamados,
        fechaInicio: estado.fechaInicio,
        ultimoReinicio: estado.ultimoReinicio,
        lastSync: estado.lastSync,
      },
      resumen: {
        totalTicketsEmitidos: estado.totalAtendidos,
        totalTicketsAtendidos: estado.numerosLlamados,
        ticketsPendientes: estado.totalAtendidos - estado.numerosLlamados,
        primerTicket: estado.tickets[0]?.numero || 0,
        ultimoTicket: estado.ultimoNumero,
        horaInicio: estado.fechaInicio,
        horaBackup: new Date().toISOString(),
      },
      tickets: estado.tickets, // Incluye el array completo de tickets en el backup
    }

    await redis.set(backupKey, backupData)
    await redis.expire(backupKey, 60 * 24 * 60 * 60) // 60 días de expiración para los backups

    console.log("✅ Backup diario creado exitosamente en Upstash Redis")
  } catch (error) {
    console.error("❌ Error al crear backup diario en Upstash Redis:", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

export async function obtenerBackups(): Promise<any[]> {
  try {
    const allKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    const backups: any[] = []

    // Obtener todos los backups en una sola operación MULTI/EXEC si es posible
    if (allKeys.length > 0) {
      const multi = redis.multi()
      for (const key of allKeys) {
        multi.get(key)
      }
      const results = await multi.exec()

      results.forEach((backup: any) => {
        if (backup && typeof backup === "object" && "resumen" in backup) {
          backups.push({
            fecha: backup.fecha,
            resumen: backup.resumen,
            createdAt: backup.horaBackup, // Usar la hora de backup como created_at
          })
        }
      })
    }

    backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    return backups.slice(0, 30) // Limitar a los últimos 30
  } catch (error) {
    console.error("❌ Error al obtener backups desde Upstash Redis:", error)
    return []
  }
}

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

// Función para limpiar datos antiguos (estados diarios, listas de tickets y backups)
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    console.log("🧹 Limpiando datos antiguos en Upstash Redis...")
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos

    // Limpiar estados diarios y listas de tickets antiguas
    const dailyStateKeys = await redis.keys(STATE_KEY_PREFIX + "*")
    const dailyTicketsKeys = await redis.keys(TICKETS_LIST_KEY_PREFIX + "*")
    const dailyCounterKeys = await redis.keys(COUNTER_KEY_PREFIX + "*")
    const allDailyKeys = [...dailyStateKeys, ...dailyTicketsKeys, ...dailyCounterKeys]

    for (const key of allDailyKeys) {
      const datePart = key.split(":").pop() // Extraer YYYY-MM-DD de la clave
      if (datePart) {
        const keyDate = new Date(datePart).getTime()
        if (keyDate < thirtyDaysAgo) {
          await redis.del(key)
          console.log(`🗑️ Eliminado dato diario antiguo: ${key}`)
        }
      }
    }

    // Limpiar backups antiguos
    const allBackupKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    for (const key of allBackupKeys) {
      const datePart = key.replace(BACKUP_KEY_PREFIX, "")
      const backupDate = new Date(datePart).getTime()
      if (backupDate < thirtyDaysAgo) {
        await redis.del(key)
        console.log(`🗑️ Eliminado backup antiguo: ${key}`)
      }
    }

    // Recortar logs (mantener los últimos 1000)
    await redis.ltrim(LOGS_KEY, 0, 999)

    // Registrar la acción de limpieza
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

export async function obtenerEstadisticas(estado: EstadoSistema & { tickets: TicketInfo[] }) {
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

export async function cerrarConexiones(): Promise<void> {
  console.log("🔌 No es necesario cerrar conexiones para Upstash Redis (HTTP)")
}
