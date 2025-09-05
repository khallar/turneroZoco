import { Redis } from "@upstash/redis"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import { drizzle } from "drizzle-orm/neon-http"
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core"
import { pgTable } from "drizzle-orm/pg-core"

// Interfaces
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
  fechaInicio: string
  ultimoReinicio: string
  tickets: TicketInfo[]
  lastSync?: number
}

// Define your database schema
export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull(),
  nombre: text("nombre").notNull(),
  fecha: timestamp("fecha").defaultNow(),
})

// Función para obtener las variables de entorno correctas
function getRedisConfig() {
  const configs = [
    {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      name: "KV_REST_API (Principal)",
    },
    {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      name: "UPSTASH_REDIS_REST",
    },
  ]

  console.log("🔍 Detectando configuración de Redis...")

  for (const config of configs) {
    if (config.url && config.token) {
      console.log(`✅ Usando configuración Redis: ${config.name}`)
      return { url: config.url, token: config.token, name: config.name }
    }
  }

  throw new Error("No se encontraron variables de entorno válidas para Redis")
}

// Inicializar cliente Redis
let redis: Redis
let redisConfig: { url: string; token: string; name: string }

try {
  redisConfig = getRedisConfig()
  redis = new Redis({
    url: redisConfig.url,
    token: redisConfig.token,
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.exp(retryCount) * 50,
    },
  })
  console.log(`🔗 Cliente Redis inicializado: ${redisConfig.name}`)
} catch (error) {
  console.error("❌ Error al inicializar Redis:", error)
  throw error
}

// Función para establecer una conexión a la base de datos
export const connectToDatabase = () => {
  const databaseUrl = process.env.DATABASE_URL!
  console.log("Connecting to database with URL:", databaseUrl)

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set")
  }

  const db: NeonHttpDatabase = drizzle(databaseUrl)
  return db
}

// Constantes
const REDIS_KEYS = {
  ESTADO: "turnos_zoco:estado",
  BACKUP_PREFIX: "turnos_zoco:backup:",
  MUTEX_PREFIX: "turnos_zoco:mutex:",
} as const

// Función auxiliar para obtener la fecha actual
function getTodayDateString(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }
  return new Intl.DateTimeFormat("en-CA", options).format(now)
}

// Función para validar el estado
function validarEstado(estado: any): EstadoSistema {
  const fechaHoy = getTodayDateString()

  return {
    numeroActual: Math.max(1, Number(estado?.numeroActual) || 1),
    ultimoNumero: Math.max(0, Number(estado?.ultimoNumero) || 0),
    totalAtendidos: Math.max(0, Number(estado?.totalAtendidos) || 0),
    numerosLlamados: Math.max(0, Number(estado?.numerosLlamados) || 0),
    fechaInicio: estado?.fechaInicio || fechaHoy,
    ultimoReinicio: estado?.ultimoReinicio || new Date().toISOString(),
    tickets: Array.isArray(estado?.tickets) ? estado.tickets : [],
    lastSync: Date.now(),
  }
}

// Función para crear estado inicial
function crearEstadoInicial(): EstadoSistema {
  const fechaHoy = getTodayDateString()
  return {
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

// Función para reintentos con backoff exponencial
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Intento ${attempt}/${maxRetries} falló:`, error)

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Función principal para obtener el estado del sistema
export async function leerEstadoSistema(): Promise<EstadoSistema & { tickets: TicketInfo[] }> {
  return retryOperation(async () => {
    console.log("📖 Leyendo estado del sistema...")

    try {
      const estadoRaw = await redis.get(REDIS_KEYS.ESTADO)

      if (!estadoRaw) {
        console.log("📝 No hay estado previo, creando estado inicial...")
        const estadoInicial = crearEstadoInicial()
        await escribirEstadoSistema(estadoInicial)
        return estadoInicial
      }

      const estado = validarEstado(estadoRaw)
      console.log("✅ Estado obtenido correctamente")
      return estado
    } catch (error) {
      console.error("❌ Error al leer estado:", error)
      throw error
    }
  })
}

// Función para escribir el estado del sistema
export async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  return retryOperation(async () => {
    console.log("💾 Escribiendo estado del sistema...")

    try {
      const estadoValidado = validarEstado(estado)
      estadoValidado.lastSync = Date.now()

      await redis.set(REDIS_KEYS.ESTADO, estadoValidado)
      console.log("✅ Estado guardado correctamente")
    } catch (error) {
      console.error("❌ Error al escribir estado:", error)
      throw error
    }
  })
}

// Función atómica para generar un ticket
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo> {
  return retryOperation(async () => {
    console.log(`🎫 Generando ticket para: ${nombre}`)

    try {
      // Obtener estado actual
      const estadoActual = await leerEstadoSistema()

      // Crear nuevo ticket
      const nuevoNumero = estadoActual.ultimoNumero + 1
      const nuevoTicket: TicketInfo = {
        numero: nuevoNumero,
        nombre: nombre.trim(),
        fecha: new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
        timestamp: Date.now(),
      }

      // Actualizar estado
      const nuevoEstado: EstadoSistema = {
        ...estadoActual,
        numeroActual: nuevoNumero + 1,
        ultimoNumero: nuevoNumero,
        totalAtendidos: nuevoNumero,
        tickets: [...estadoActual.tickets, nuevoTicket],
        lastSync: Date.now(),
      }

      // Guardar estado actualizado
      await escribirEstadoSistema(nuevoEstado)

      console.log(`✅ Ticket #${nuevoNumero} generado exitosamente`)
      return nuevoTicket
    } catch (error) {
      console.error("❌ Error al generar ticket:", error)
      throw error
    }
  })
}

// Función para crear backup diario
export async function crearBackupDiario(estado: EstadoSistema & { tickets: TicketInfo[] }): Promise<void> {
  return retryOperation(async () => {
    console.log("💾 Creando backup diario...")

    try {
      const fechaHoy = getTodayDateString()
      const backupKey = REDIS_KEYS.BACKUP_PREFIX + fechaHoy

      const backupData = {
        fecha: fechaHoy,
        estado: estado,
        timestamp: Date.now(),
        version: "1.0",
      }

      await redis.set(backupKey, backupData, { ex: 60 * 24 * 60 * 60 }) // 60 días
      console.log(`✅ Backup creado para ${fechaHoy}`)
    } catch (error) {
      console.error("❌ Error al crear backup:", error)
      // No lanzar error para no bloquear otras operaciones
    }
  })
}

// Función para obtener estadísticas
export async function obtenerEstadisticas(estado: EstadoSistema & { tickets: TicketInfo[] }) {
  try {
    const ahora = new Date()
    const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const unaHoraAtras = new Date(ahora.getTime() - 60 * 60 * 1000)

    // Filtrar tickets de hoy
    const ticketsHoy = estado.tickets.filter((ticket) => {
      const fechaTicket = new Date(ticket.timestamp || ticket.fecha)
      return fechaTicket >= inicioDelDia
    })

    // Tickets de la última hora
    const ticketsUltimaHora = estado.tickets.filter((ticket) => {
      const timestampTicket = ticket.timestamp || 0
      return timestampTicket >= unaHoraAtras.getTime()
    })

    const estadisticas = {
      totalTicketsHoy: ticketsHoy.length,
      ticketsAtendidos: estado.numerosLlamados,
      ticketsPendientes: Math.max(0, estado.totalAtendidos - estado.numerosLlamados),
      promedioTiempoPorTicket:
        ticketsHoy.length > 1
          ? Math.round(
              (ticketsHoy[ticketsHoy.length - 1].timestamp - ticketsHoy[0].timestamp) / ticketsHoy.length / 1000 / 60,
            )
          : 0,
      horaInicioOperaciones: estado.fechaInicio,
      ultimaActividad: ticketsHoy.length > 0 ? ticketsHoy[ticketsHoy.length - 1].fecha : "Sin actividad",
      ticketsUltimaHora: ticketsUltimaHora.length,
    }

    return estadisticas
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error)
    throw error
  }
}

// Función para verificar conexión a la base de datos
export async function verificarConexionDB(): Promise<{ connected: boolean; details: any }> {
  try {
    console.log("🔍 Verificando conexión a Redis...")

    const startTime = Date.now()
    const testKey = "turnos_zoco:health_check:" + Date.now()
    const testValue = "health_check_" + Math.random()

    // Test básico
    await redis.set(testKey, testValue, { ex: 30 })
    const result = await redis.get(testKey)
    await redis.del(testKey)

    const responseTime = Date.now() - startTime
    const isConnected = result === testValue

    const details = {
      connected: isConnected,
      responseTime: responseTime + "ms",
      config: redisConfig.name,
      endpoint: redisConfig.url,
      testResult: result === testValue ? "✅ Exitoso" : "❌ Fallido",
      timestamp: new Date().toISOString(),
    }

    if (isConnected) {
      console.log("✅ Conexión a Redis verificada exitosamente")
    } else {
      console.error("❌ Fallo en la verificación de conexión")
    }

    return { connected: isConnected, details }
  } catch (error) {
    console.error("❌ Error al verificar conexión:", error)
    return {
      connected: false,
      details: {
        error: "Error de conexión",
        message: error instanceof Error ? error.message : "Error desconocido",
        config: redisConfig?.name || "No configurado",
        timestamp: new Date().toISOString(),
      },
    }
  }
}

// Función para limpiar datos antiguos
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    console.log("🧹 Limpiando datos antiguos...")

    const keys = await redis.keys(REDIS_KEYS.BACKUP_PREFIX + "*")
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const keysToDelete = []
    for (const key of keys) {
      const datePart = key.replace(REDIS_KEYS.BACKUP_PREFIX, "")
      const keyDate = new Date(datePart).getTime()
      if (keyDate < thirtyDaysAgo) {
        keysToDelete.push(key)
      }
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete)
      console.log(`🗑️ Eliminados ${keysToDelete.length} backups antiguos`)
    }

    console.log("✅ Limpieza completada")
  } catch (error) {
    console.error("❌ Error al limpiar datos antiguos:", error)
  }
}

// Función para recuperar datos perdidos
export async function recuperarDatosPerdidos(fecha: string): Promise<EstadoSistema & { tickets: TicketInfo[] }> {
  try {
    console.log("🔧 Intentando recuperar datos para:", fecha)

    const backupKey = REDIS_KEYS.BACKUP_PREFIX + fecha
    const backup = await redis.get(backupKey)

    if (backup && typeof backup === "object" && "estado" in backup) {
      console.log("✅ Datos recuperados desde backup")
      return validarEstado(backup.estado)
    }

    console.log("⚠️ No se pudieron recuperar datos, creando estado inicial")
    const estadoInicial = crearEstadoInicial()
    estadoInicial.fechaInicio = fecha
    return estadoInicial
  } catch (error) {
    console.error("❌ Error al recuperar datos:", error)
    const estadoEmergencia = crearEstadoInicial()
    estadoEmergencia.fechaInicio = fecha
    return estadoEmergencia
  }
}
