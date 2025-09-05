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
      retries: 2,
      backoff: (retryCount) => Math.exp(retryCount) * 100,
    },
    automaticDeserialization: false, // Cambiar a false para manejar manualmente
  })
  console.log(`🔗 Cliente Upstash Redis inicializado exitosamente`)
  console.log(`📊 Configuración: ${redisConfig.name}`)
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

// Función helper para parsear JSON de forma segura
function safeJsonParse(data: any): any {
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error("Error parsing JSON:", error, "Data:", data)
      return null
    }
  }
  return data
}

// Función helper para retry con backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 500,
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
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500
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

      // Operaciones individuales para mejor control de errores
      let estadoRaw: any = null
      let ticketsRaw: any[] = []
      let contadorActual = 0

      try {
        estadoRaw = await redis.get(estadoKey)
        estadoRaw = safeJsonParse(estadoRaw)
      } catch (error) {
        console.warn("Error leyendo estado:", error)
      }

      try {
        ticketsRaw = await redis.lrange(ticketsListKey, 0, -1)
        if (Array.isArray(ticketsRaw)) {
          ticketsRaw = ticketsRaw.map((ticket) => safeJsonParse(ticket)).filter(Boolean)
        } else {
          ticketsRaw = []
        }
      } catch (error) {
        console.warn("Error leyendo tickets:", error)
        ticketsRaw = []
      }

      try {
        const counterResult = await redis.get(counterKey)
        contadorActual =
          typeof counterResult === "number"
            ? counterResult
            : typeof counterResult === "string"
              ? Number.parseInt(counterResult) || 0
              : 0
      } catch (error) {
        console.warn("Error leyendo contador:", error)
      }

      const tickets: TicketInfo[] = Array.isArray(ticketsRaw) ? ticketsRaw : []

      console.log(`🔍 Datos leídos: ${tickets.length} tickets, contador: ${contadorActual}`)

      let estado: EstadoSistema

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

          // Actualizar el estado corregido en Redis
          estado.lastSync = Date.now()
          try {
            await redis.set(estadoKey, JSON.stringify(estado), { ex: 48 * 60 * 60 })
            console.log("✅ Estado corregido y guardado")
          } catch (error) {
            console.warn("Error guardando estado corregido:", error)
          }
        }

        console.log("✅ Estado y tickets cargados desde TURNOS_ZOCO (Upstash Redis)")
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
          numerosLlamados: 0,
          fechaInicio: fechaHoy,
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        // Guardar el estado inicial
        try {
          await redis.set(estadoKey, JSON.stringify(estado), { ex: 48 * 60 * 60 })
          console.log("✅ Estado inicial creado")
        } catch (error) {
          console.warn("Error guardando estado inicial:", error)
        }
      }

      console.log(
        `📊 Estado final: Total: ${estado.totalAtendidos}, Último: ${estado.ultimoNumero}, Próximo: ${estado.numeroActual}`,
      )
      return { ...estado, tickets }
    },
    2,
    500,
    "Lectura de estado",
  )
}

// escribirEstadoSistema ahora solo escribe la metadata del estado
export async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  try {
    console.log("💾 Escribiendo estado (metadata) a TURNOS_ZOCO (Upstash Redis)...")
    const estadoKey = STATE_KEY_PREFIX + estado.fechaInicio
    estado.lastSync = Date.now()

    await redis.set(estadoKey, JSON.stringify(estado), { ex: 48 * 60 * 60 })

    // Crear una copia de respaldo
    const backupKey = `${estadoKey}:backup`
    await redis.set(backupKey, JSON.stringify(estado), { ex: 72 * 60 * 60 })

    console.log("✅ Estado (metadata) guardado exitosamente en TURNOS_ZOCO (Upstash Redis)")
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

      // Incrementar contador atómicamente
      const numeroAsignado = await redis.incr(counterKey)
      console.log(`🔍 Número asignado: ${numeroAsignado}`)

      // Obtener estado actual
      let estadoRaw: any = null
      try {
        estadoRaw = await redis.get(estadoKey)
        estadoRaw = safeJsonParse(estadoRaw)
      } catch (error) {
        console.warn("Error leyendo estado durante generación:", error)
      }

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

        // Establecer expiración para la clave del contador
        try {
          await redis.expire(counterKey, 48 * 60 * 60)
        } catch (error) {
          console.warn("Error estableciendo expiración del contador:", error)
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

      // Actualizar la metadata del estado
      estadoActual.numeroActual = numeroAsignado + 1
      estadoActual.ultimoNumero = numeroAsignado
      estadoActual.totalAtendidos = numeroAsignado
      estadoActual.lastSync = Date.now()

      // Guardar estado y ticket
      try {
        await redis.set(estadoKey, JSON.stringify(estadoActual), { ex: 48 * 60 * 60 })
        await redis.rpush(ticketsListKey, JSON.stringify(nuevoTicket))
        await redis.expire(ticketsListKey, 48 * 60 * 60)
        await redis.expire(counterKey, 48 * 60 * 60)
      } catch (error) {
        console.error("Error guardando ticket:", error)
        throw error
      }

      console.log("✅ Ticket generado exitosamente:", nuevoTicket)
      return nuevoTicket
    },
    2,
    500,
    "Generación de ticket",
  )
}

// Resto de las funciones con manejo mejorado de errores...
export async function crearBackupDiario(estado: EstadoSistema & { tickets: TicketInfo[] }): Promise<void> {
  try {
    console.log("📦 Creando backup diario en TURNOS_ZOCO (Upstash Redis)...")

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
      tickets: estado.tickets,
    }

    await redis.set(backupKey, JSON.stringify(backupData), { ex: 60 * 24 * 60 * 60 })
    console.log("✅ Backup diario creado exitosamente en TURNOS_ZOCO (Upstash Redis)")
  } catch (error) {
    console.error("❌ Error al crear backup diario en TURNOS_ZOCO (Upstash Redis):", error)
  }
}

export async function obtenerBackups(): Promise<any[]> {
  try {
    console.log("📋 Obteniendo lista de backups desde TURNOS_ZOCO (Upstash Redis)...")

    const allKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    const backups: any[] = []

    console.log(`🔍 Encontradas ${allKeys.length} claves de backup`)

    for (const key of allKeys) {
      try {
        const backup = await redis.get(key)
        const parsedBackup = safeJsonParse(backup)

        if (parsedBackup && typeof parsedBackup === "object" && "resumen" in parsedBackup) {
          backups.push({
            fecha: parsedBackup.fecha,
            resumen: parsedBackup.resumen,
            createdAt: parsedBackup.resumen?.horaBackup || parsedBackup.fecha,
          })
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando backup ${key}:`, error)
      }
    }

    backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    console.log(`✅ Obtenidos ${backups.length} backups válidos`)
    return backups.slice(0, 30)
  } catch (error) {
    console.error("❌ Error al obtener backups desde TURNOS_ZOCO (Upstash Redis):", error)
    return []
  }
}

export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    console.log(`📋 Obteniendo backup para fecha: ${fecha}`)

    const backupKey = BACKUP_KEY_PREFIX + fecha
    const backup = await redis.get(backupKey)
    const parsedBackup = safeJsonParse(backup)

    if (parsedBackup) {
      console.log(`✅ Backup encontrado para ${fecha}`)
    } else {
      console.log(`⚠️ No se encontró backup para ${fecha}`)
    }

    return parsedBackup || null
  } catch (error) {
    console.error("❌ Error al obtener backup desde TURNOS_ZOCO (Upstash Redis):", error)
    return null
  }
}

export async function obtenerResumenDiasAnteriores(dias = 7): Promise<any[]> {
  try {
    console.log(`📊 Obteniendo resumen de los últimos ${dias} días...`)

    const resumenes: any[] = []
    const hoy = new Date()

    for (let i = 1; i <= dias; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() - i)
      const fechaStr = fecha.toISOString().split("T")[0]

      const backup = await obtenerBackup(fechaStr)
      if (backup && backup.resumen) {
        resumenes.push({
          fecha: fechaStr,
          ...backup.resumen,
          fechaFormateada: fecha.toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        })
      }
    }

    console.log(`✅ Obtenidos ${resumenes.length} resúmenes de días anteriores`)
    return resumenes
  } catch (error) {
    console.error("❌ Error al obtener resumen de días anteriores:", error)
    return []
  }
}

export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    console.log("🧹 Limpiando datos antiguos en TURNOS_ZOCO (Upstash Redis)...")
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    const dailyStateKeys = await redis.keys(STATE_KEY_PREFIX + "*")
    const dailyTicketsKeys = await redis.keys(TICKETS_LIST_KEY_PREFIX + "*")
    const dailyCounterKeys = await redis.keys(COUNTER_KEY_PREFIX + "*")
    const allDailyKeys = [...dailyStateKeys, ...dailyTicketsKeys, ...dailyCounterKeys]

    const keysToDelete = []
    for (const key of allDailyKeys) {
      const datePart = key.split(":").pop()
      if (datePart) {
        const keyDate = new Date(datePart).getTime()
        if (keyDate < thirtyDaysAgo) {
          keysToDelete.push(key)
        }
      }
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete)
      console.log(`🗑️ Eliminados ${keysToDelete.length} datos diarios antiguos.`)
    }

    const allBackupKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    const backupKeysToDelete = []
    for (const key of allBackupKeys) {
      const datePart = key.replace(BACKUP_KEY_PREFIX, "")
      const backupDate = new Date(datePart).getTime()
      if (backupDate < thirtyDaysAgo) {
        backupKeysToDelete.push(key)
      }
    }

    if (backupKeysToDelete.length > 0) {
      await redis.del(...backupKeysToDelete)
      console.log(`🗑️ Eliminados ${backupKeysToDelete.length} backups antiguos.`)
    }

    await redis.ltrim(LOGS_KEY, 0, 999)

    await redis.lpush(
      LOGS_KEY,
      JSON.stringify({
        accion: "LIMPIEZA_AUTOMATICA",
        detalles: { descripcion: "Limpieza de datos antiguos" },
        timestamp_log: Date.now(),
      }),
    )

    console.log("✅ Datos antiguos limpiados exitosamente en TURNOS_ZOCO (Upstash Redis)")
  } catch (error) {
    console.error("❌ Error al limpiar datos antiguos en TURNOS_ZOCO (Upstash Redis):", error)
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
    console.error("❌ Error al obtener estadísticas desde TURNOS_ZOCO (Upstash Redis):", error)
    throw error
  }
}

export async function verificarConexionDB(): Promise<{ connected: boolean; details: any }> {
  try {
    console.log("🔍 Verificando conexión a TURNOS_ZOCO (Upstash Redis)...")

    const startTime = Date.now()

    if (!redisConfig || redisConfig.name === "Mock (Error de configuración)") {
      return {
        connected: false,
        details: {
          error: "Configuración de Redis no válida",
          config: redisConfig?.name || "No configurado",
          timestamp: new Date().toISOString(),
        },
      }
    }

    try {
      const testKey = "TURNOS_ZOCO:health_check:" + Date.now()
      const testValue = "health_check_" + Math.random().toString(36).substring(7)

      console.log("🧪 Ejecutando test de conexión básico...")

      await redis.set(testKey, testValue, { ex: 30 })
      console.log("✅ SET exitoso")

      await new Promise((resolve) => setTimeout(resolve, 100))

      const result = await redis.get(testKey)
      console.log("✅ GET exitoso, resultado:", result)

      try {
        await redis.del(testKey)
        console.log("✅ DEL exitoso")
      } catch (delError) {
        console.log("⚠️ Error en DEL (no crítico):", delError)
      }

      const responseTime = Date.now() - startTime
      const isConnected = result === testValue

      const details = {
        connected: isConnected,
        responseTime: responseTime + "ms",
        config: redisConfig.name,
        endpoint: redisConfig.url.substring(0, 50) + "...",
        testResult: result === testValue ? "✅ Exitoso" : "❌ Fallido",
        testValue: testValue,
        receivedValue: result,
        timestamp: new Date().toISOString(),
      }

      if (isConnected) {
        console.log("✅ Conexión a TURNOS_ZOCO (Upstash Redis) verificada exitosamente")
        console.log(`⚡ Tiempo de respuesta: ${responseTime}ms`)
      } else {
        console.error("❌ Fallo en la verificación de conexión - valores no coinciden")
        console.error(`Esperado: ${testValue}, Recibido: ${result}`)

        try {
          const pingResult = await redis.ping()
          if (pingResult === "PONG") {
            console.log("✅ Ping exitoso como fallback")
            return {
              connected: true,
              details: {
                ...details,
                connected: true,
                testResult: "✅ Ping exitoso (fallback)",
                warning: "SET/GET test falló, pero ping exitoso",
              },
            }
          }
        } catch (pingError) {
          console.error("❌ Ping también falló:", pingError)
        }
      }

      return { connected: isConnected, details }
    } catch (operationError) {
      console.error("❌ Error en operaciones de Redis:", operationError)

      try {
        console.log("🔄 Intentando ping como fallback...")
        const pingResult = await redis.ping()

        console.log("✅ Ping exitoso:", pingResult)

        return {
          connected: true,
          details: {
            connected: true,
            responseTime: Date.now() - startTime + "ms",
            config: redisConfig.name,
            endpoint: redisConfig.url.substring(0, 50) + "...",
            testResult: "✅ Ping exitoso (fallback)",
            pingResult: pingResult,
            warning: "Operaciones SET/GET fallaron, pero ping exitoso",
            originalError: operationError instanceof Error ? operationError.message : String(operationError),
            timestamp: new Date().toISOString(),
          },
        }
      } catch (pingError) {
        console.error("❌ Ping también falló:", pingError)

        return {
          connected: false,
          details: {
            error: "Todas las operaciones de conexión fallaron",
            config: redisConfig.name,
            endpoint: redisConfig.url.substring(0, 50) + "...",
            operationError: operationError instanceof Error ? operationError.message : String(operationError),
            pingError: pingError instanceof Error ? pingError.message : String(pingError),
            timestamp: new Date().toISOString(),
          },
        }
      }
    }
  } catch (error) {
    console.error("❌ Error inesperado en verificarConexionDB:", error)
    return {
      connected: false,
      details: {
        error: "Error inesperado en verificación",
        message: error instanceof Error ? error.message : "Error desconocido",
        config: redisConfig?.name || "No configurado",
        timestamp: new Date().toISOString(),
      },
    }
  }
}

export async function cerrarConexiones(): Promise<void> {
  console.log("🔌 No es necesario cerrar conexiones para TURNOS_ZOCO (Upstash Redis - HTTP)")
}

export async function recuperarDatosPerdidos(fecha: string): Promise<EstadoSistema & { tickets: TicketInfo[] }> {
  try {
    console.log("🔧 Intentando recuperar datos perdidos para:", fecha)

    const estadoKey = STATE_KEY_PREFIX + fecha
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fecha
    const counterKey = COUNTER_KEY_PREFIX + fecha
    const backupKey = `${estadoKey}:backup`

    let estadoBackup: any = null
    let ticketsOriginales: any[] = []

    try {
      estadoBackup = await redis.get(backupKey)
      estadoBackup = safeJsonParse(estadoBackup)
    } catch (error) {
      console.warn("Error leyendo backup de estado:", error)
    }

    try {
      ticketsOriginales = await redis.lrange(ticketsListKey, 0, -1)
      if (Array.isArray(ticketsOriginales)) {
        ticketsOriginales = ticketsOriginales.map((ticket) => safeJsonParse(ticket)).filter(Boolean)
      } else {
        ticketsOriginales = []
      }
    } catch (error) {
      console.warn("Error leyendo tickets originales:", error)
      ticketsOriginales = []
    }

    if (estadoBackup && typeof estadoBackup === "object") {
      console.log("✅ Datos recuperados desde backup")
      const tickets = Array.isArray(ticketsOriginales) ? ticketsOriginales : []

      await redis.set(estadoKey, JSON.stringify(estadoBackup), { ex: 48 * 60 * 60 })

      return { ...estadoBackup, tickets }
    }

    throw new Error("No se pudieron recuperar los datos")
  } catch (error) {
    console.error("❌ Error al recuperar datos perdidos:", error)
    throw error
  }
}
