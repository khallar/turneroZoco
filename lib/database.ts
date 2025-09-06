import { Redis } from "@upstash/redis"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
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

// Función para obtener las variables de entorno correctas
function getRedisConfig() {
  // Intentar diferentes combinaciones de variables de entorno disponibles
  const configs = [
    {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      name: "UPSTASH_REDIS_REST (Principal)",
    },
    {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      name: "KV_REST_API",
    },
    {
      url: process.env.TURNOS_KV_REST_API_URL,
      token: process.env.TURNOS_KV_REST_API_TOKEN,
      name: "TURNOS_KV_REST_API",
    },
    {
      url: process.env.REDIS_URL?.replace("rediss://", "https://").replace(":6379", ""),
      token: process.env.REDIS_TOKEN,
      name: "REDIS_URL (Convertido)",
    },
  ]

  console.log("🔍 Detectando configuración de Upstash Redis...")

  for (const config of configs) {
    if (config.url && config.token) {
      console.log(`✅ Usando configuración Redis: ${config.name}`)
      console.log(`📡 URL: ${config.url.substring(0, 50)}...`)
      console.log(`🔑 Token: ${config.token.substring(0, 20)}...`)
      return { url: config.url, token: config.token, name: config.name }
    }
  }

  console.error("❌ No se encontraron variables de entorno válidas para Upstash Redis")
  console.log("🔍 Variables disponibles en el entorno:")
  console.log({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? "✓ Configurado" : "✗ No configurado",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? "✓ Configurado" : "✗ No configurado",
    KV_REST_API_URL: process.env.KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
    TURNOS_KV_REST_API_URL: process.env.TURNOS_KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
    TURNOS_KV_REST_API_TOKEN: process.env.TURNOS_KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
    REDIS_URL: process.env.REDIS_URL ? "✓ Configurado" : "✗ No configurado",
    REDIS_TOKEN: process.env.REDIS_TOKEN ? "✓ Configurado" : "✗ No configurado",
  })

  throw new Error("No se encontraron variables de entorno válidas para Upstash Redis")
}

// Inicializar cliente de Upstash Redis con configuración dinámica y retry
let redis: Redis
let redisConfig: { url: string; token: string; name: string }

try {
  redisConfig = getRedisConfig()
  redis = new Redis({
    url: redisConfig.url,
    token: redisConfig.token,
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.exp(retryCount) * 50, // Exponential backoff
    },
    automaticDeserialization: true,
  })
  console.log(`🔗 Cliente Upstash Redis inicializado exitosamente`)
  console.log(`📊 Configuración: ${redisConfig.name}`)
  console.log(
    `🌐 Región: ${redisConfig.url.includes("us1") ? "US East" : redisConfig.url.includes("eu1") ? "EU West" : "Global"}`,
  )
} catch (error) {
  console.error("❌ Error al inicializar cliente Upstash Redis:", error)
  // Crear un cliente mock para evitar errores de compilación
  redis = new Redis({
    url: "https://mock-redis.upstash.io",
    token: "mock-token",
  })
  redisConfig = { url: "mock", token: "mock", name: "Mock (Error de configuración)" }
}

// Prefijos para las claves de Redis - ACTUALIZADOS CON NUEVO NOMBRE
const STATE_KEY_PREFIX = "TURNOS_ZOCO:estado:" // TURNOS_ZOCO:estado:YYYY-MM-DD
const TICKETS_LIST_KEY_PREFIX = "TURNOS_ZOCO:tickets:" // TURNOS_ZOCO:tickets:YYYY-MM-DD
const BACKUP_KEY_PREFIX = "TURNOS_ZOCO:backup:" // TURNOS_ZOCO:backup:YYYY-MM-DD
const LOGS_KEY = "TURNOS_ZOCO:logs"
const COUNTER_KEY_PREFIX = "TURNOS_ZOCO:counter:" // Para el contador atómico de número de ticket

// Función auxiliar para obtener la fecha actual en formato YYYY-MM-DD (Argentina)
export function getTodayDateString(): string {
  const ahora = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }
  const formatter = new Intl.DateTimeFormat("en-CA", options) // en-CA para YYYY-MM-DD
  return formatter.format(ahora)
}

// --- Core State Management ---

// Función helper para retry con backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  operationName = "operación",
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} - Intento ${attempt}/${maxRetries}`)
      const result = await operation()
      if (attempt > 1) {
        console.log(`✅ ${operationName} exitosa después de ${attempt} intentos`)
      }
      return result
    } catch (error) {
      lastError = error as Error
      console.error(`❌ ${operationName} falló en intento ${attempt}:`, error)

      if (attempt === maxRetries) {
        console.error(`💥 ${operationName} falló después de ${maxRetries} intentos`)
        throw lastError
      }

      // Backoff exponencial con jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
      console.log(`⏳ Esperando ${Math.round(delay)}ms antes del siguiente intento...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// leerEstadoSistema ahora devuelve el estado (metadata) Y los tickets
export async function leerEstadoSistema(): Promise<EstadoSistema & { tickets: TicketInfo[] }> {
  return retryOperation(
    async () => {
      console.log("📖 Leyendo estado y tickets desde TURNOS_ZOCO (Upstash Redis)...")
      const fechaHoy = getTodayDateString()
      const estadoKey = STATE_KEY_PREFIX + fechaHoy
      const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
      const counterKey = COUNTER_KEY_PREFIX + fechaHoy

      // Pipeline optimizado para reducir latencia
      const pipeline = redis.pipeline()
      pipeline.get(estadoKey)
      pipeline.lrange(ticketsListKey, 0, -1)
      pipeline.get(counterKey)
      pipeline.exists(estadoKey)
      pipeline.exists(ticketsListKey)

      const results = await pipeline.exec()

      if (!Array.isArray(results) || results.length !== 5) {
        throw new Error("Respuesta inesperada de Upstash Redis pipeline")
      }

      const [estadoRaw, ticketsRaw, contadorActual, estadoExists, ticketsExists] = results
      let estado: EstadoSistema
      const tickets: TicketInfo[] = Array.isArray(ticketsRaw) ? ticketsRaw : []
      const contador = typeof contadorActual === "number" ? contadorActual : 0

      console.log(`🔍 Datos leídos: ${tickets.length} tickets, contador: ${contador}`)
      console.log(`📊 Existencia: Estado: ${estadoExists ? "✓" : "✗"}, Tickets: ${ticketsExists ? "✓" : "✗"}`)

      if (estadoRaw && typeof estadoRaw === "object") {
        estado = estadoRaw

        // Verificar y corregir inconsistencias entre el estado y los datos reales
        const ticketsReales = tickets.length
        if (estado.totalAtendidos !== ticketsReales) {
          console.log(
            `⚠️ Corrigiendo inconsistencia: Estado decía ${estado.totalAtendidos}, pero hay ${ticketsReales} tickets`,
          )
          estado.totalAtendidos = ticketsReales

          // Si hay tickets, actualizar el último número basado en el último ticket real
          if (tickets.length > 0) {
            const ultimoTicketReal = tickets[tickets.length - 1]
            estado.ultimoNumero = ultimoTicketReal.numero
            estado.numeroActual = ultimoTicketReal.numero + 1
          }

          // Actualizar el estado corregido en Redis con persistencia extendida
          estado.lastSync = Date.now()
          await redis.set(estadoKey, estado, { ex: 48 * 60 * 60 }) // 48 horas de persistencia
          console.log("✅ Estado corregido y guardado con persistencia extendida")
        }

        // Asegurar persistencia de datos existentes
        if (ticketsExists && tickets.length > 0) {
          await redis.expire(ticketsListKey, 48 * 60 * 60) // 48 horas
        }
        if (contador > 0) {
          await redis.expire(counterKey, 48 * 60 * 60) // 48 horas
        }

        console.log("✅ Estado y tickets cargados desde TURNOS_ZOCO (Upstash Redis) con persistencia verificada.")
      } else {
        // Crear estado inicial para el día si no existe
        console.log("⚠️ No se encontró estado para hoy, creando inicial en TURNOS_ZOCO (Upstash Redis)...")

        // Si hay tickets pero no hay estado, reconstruir el estado basado en los tickets existentes
        let ultimoNumero = 0
        if (tickets.length > 0) {
          ultimoNumero = Math.max(...tickets.map((t) => t.numero))
          console.log(`🔧 Reconstruyendo estado: Encontrados ${tickets.length} tickets, último número: ${ultimoNumero}`)
        }

        estado = {
          numeroActual: ultimoNumero + 1,
          ultimoNumero: ultimoNumero,
          totalAtendidos: tickets.length,
          numerosLlamados: 0, // Esto se debe calcular o mantener por separado
          fechaInicio: fechaHoy,
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        // Guardar el estado inicial con persistencia extendida
        await redis.set(estadoKey, estado, { ex: 48 * 60 * 60 }) // 48 horas
        console.log("✅ Estado inicial creado con persistencia extendida")
      }

      console.log(
        `📊 Estado final: Total: ${estado.totalAtendidos}, Último: ${estado.ultimoNumero}, Próximo: ${estado.numeroActual}`,
      )
      return { ...estado, tickets }
    },
    3,
    1000,
    "Lectura de estado",
  )
}

// escribirEstadoSistema ahora solo escribe la metadata del estado
export async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  try {
    console.log("💾 Escribiendo estado (metadata) a TURNOS_ZOCO (Upstash Redis) con persistencia mejorada...")
    const estadoKey = STATE_KEY_PREFIX + estado.fechaInicio
    estado.lastSync = Date.now() // Actualizar timestamp de sincronización

    // OPTIMIZACIÓN: SET con persistencia extendida y backup automático
    // Establecer una expiración más larga para mayor persistencia (48 horas)
    await redis.set(estadoKey, estado, { ex: 48 * 60 * 60 }) // 48 horas

    // Crear una copia de respaldo con clave diferente para mayor seguridad
    const backupKey = `${estadoKey}:backup`
    await redis.set(backupKey, estado, { ex: 72 * 60 * 60 }) // 72 horas para backup

    console.log("✅ Estado (metadata) guardado exitosamente en TURNOS_ZOCO (Upstash Redis) con persistencia mejorada")
  } catch (error) {
    console.error("❌ Error al escribir estado en TURNOS_ZOCO (Upstash Redis):", error)
    throw error
  }
}

// Función para generar un nuevo ticket de forma atómica
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo> {
  return retryOperation(
    async () => {
      console.log("🎫 Generando ticket atómico para:", nombre, "en TURNOS_ZOCO (Upstash Redis)...")
      const fechaHoy = getTodayDateString()
      const estadoKey = STATE_KEY_PREFIX + fechaHoy
      const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
      const counterKey = COUNTER_KEY_PREFIX + fechaHoy

      // OPTIMIZACIÓN: Una sola transacción más simple y rápida
      const results = await redis
        .multi()
        .incr(counterKey) // Incrementa el contador diario de tickets (atómico)
        .get<EstadoSistema>(estadoKey) // Obtiene la metadata del estado actual
        .exec()

      if (!Array.isArray(results) || results.length !== 2) {
        throw new Error("Respuesta inesperada de Redis MULTI/EXEC en generarTicketAtomico")
      }

      const [numeroAsignadoRaw, estadoRaw] = results
      const numeroAsignado = typeof numeroAsignadoRaw === "number" ? numeroAsignadoRaw : 1

      console.log(`🔍 Número asignado: ${numeroAsignado}`)

      let estadoActual: EstadoSistema
      if (estadoRaw && typeof estadoRaw === "object") {
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
        await redis.expire(counterKey, 48 * 60 * 60) // 48 horas
      }

      const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
      const timestamp = Date.now()

      const nuevoTicket: TicketInfo = {
        numero: numeroAsignado,
        nombre: nombre.trim(),
        fecha,
        timestamp,
      }

      // Actualizar la metadata del estado
      estadoActual.numeroActual = numeroAsignado + 1
      estadoActual.ultimoNumero = numeroAsignado
      estadoActual.totalAtendidos = numeroAsignado // Usar el contador como fuente de verdad
      estadoActual.lastSync = Date.now()

      // OPTIMIZACIÓN: Transacción más simple - solo lo esencial
      await redis
        .multi()
        .set(estadoKey, estadoActual, { ex: 48 * 60 * 60 }) // Estado actualizado
        .rpush(ticketsListKey, nuevoTicket) // Añadir ticket a la lista
        .expire(ticketsListKey, 48 * 60 * 60) // Asegurar persistencia
        .expire(counterKey, 48 * 60 * 60) // Asegurar persistencia del contador
        .exec()

      console.log("✅ Ticket generado exitosamente:", nuevoTicket)
      return nuevoTicket
    },
    2, // Reducir reintentos de 3 a 2
    500, // Reducir delay inicial de 1000ms a 500ms
    "Generación de ticket",
  )
}

// --- Backup & Admin Functions ---

// crearBackupDiario ahora espera el estado completo (metadata + tickets)
export async function crearBackupDiario(estado: any): Promise<any> {
  try {
    const fechaHoy = getTodayDateString()
    const backup = {
      fecha: fechaHoy,
      estado: estado,
      timestamp: Date.now(),
    }

    await redis.set(`backup:${fechaHoy}`, JSON.stringify(backup))
    return backup
  } catch (error) {
    console.error("Error al crear backup:", error)
    throw error
  }
}

// Función para obtener backups
export async function obtenerBackupsPorFecha(): Promise<any[]> {
  try {
    const keys = await redis.keys("backup:*")
    const backups = []

    for (const key of keys) {
      const backup = await redis.get(key)
      if (backup) {
        backups.push(JSON.parse(backup as string))
      }
    }

    return backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  } catch (error) {
    console.error("Error al obtener backups:", error)
    return []
  }
}

// Función para obtener backup específico
export async function obtenerBackupCompleto(fecha: string): Promise<any> {
  try {
    const backup = await redis.get(`backup:${fecha}`)
    return backup ? JSON.parse(backup as string) : null
  } catch (error) {
    console.error("Error al obtener backup completo:", error)
    return null
  }
}

// Función para obtener estadísticas
export async function obtenerEstadisticas(estado: any): Promise<any> {
  return {
    ticketsAtendidos: estado.numerosLlamados || 0,
    promedioTiempoPorTicket: 3, // Valor fijo simplificado
    horasPico: "14:00 - 16:00",
    eficiencia: estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0,
  }
}

// Función para limpiar datos antiguos
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    const keys = await redis.keys("backup:*")
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 30) // 30 días atrás

    for (const key of keys) {
      const fecha = key.split(":")[1]
      if (new Date(fecha) < fechaLimite) {
        await redis.del(key)
      }
    }
  } catch (error) {
    console.error("Error al limpiar datos antiguos:", error)
  }
}

// Función para recuperar datos perdidos
export async function recuperarDatosPerdidos(fecha: string): Promise<any> {
  try {
    const backup = await obtenerBackupCompleto(fecha)
    return backup?.estado || null
  } catch (error) {
    console.error("Error al recuperar datos:", error)
    return null
  }
}

// Función para verificar conexión
export async function verificarConexionDB(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error("Error de conexión a Redis:", error)
    return false
  }
}

export async function cerrarConexiones(): Promise<void> {
  console.log("🔌 No es necesario cerrar conexiones para TURNOS_ZOCO (Upstash Redis - HTTP)")
}
