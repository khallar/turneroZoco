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
  try {
    console.log("🎫 Generando ticket atómico para:", nombre, "en TURNOS_ZOCO (Upstash Redis)...")
    const fechaHoy = getTodayDateString()
    const estadoKey = STATE_KEY_PREFIX + fechaHoy
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
    const counterKey = COUNTER_KEY_PREFIX + fechaHoy

    // OPTIMIZACIÓN: Transacción 1 - Obtener el estado actual y el contador de ticket
    // Esto se hace en un solo viaje de ida y vuelta a Redis para minimizar latencia.
    const results = await redis
      .multi()
      .incr(counterKey) // Incrementa el contador diario de tickets (atómico)
      .get<EstadoSistema>(estadoKey) // Obtiene la metadata del estado actual
      .llen(ticketsListKey) // Obtiene el número total de tickets en la lista para verificar consistencia
      .exec()

    // Validar que tenemos los resultados esperados
    if (!Array.isArray(results) || results.length !== 3) {
      throw new Error("Respuesta inesperada de Redis MULTI/EXEC en generarTicketAtomico")
    }

    const [numeroAsignadoRaw, estadoRaw, totalTicketsEnLista] = results
    const numeroAsignado = typeof numeroAsignadoRaw === "number" ? numeroAsignadoRaw : 1
    const ticketsExistentes = typeof totalTicketsEnLista === "number" ? totalTicketsEnLista : 0

    console.log(
      `🔍 Verificación de consistencia: Número asignado: ${numeroAsignado}, Tickets en lista: ${ticketsExistentes}`,
    )

    let estadoActual: EstadoSistema
    if (estadoRaw && typeof estadoRaw === "object") {
      estadoActual = estadoRaw
      // Verificar y corregir inconsistencias
      if (estadoActual.totalAtendidos !== ticketsExistentes) {
        console.log(
          `⚠️ Inconsistencia detectada: Estado dice ${estadoActual.totalAtendidos}, lista tiene ${ticketsExistentes}`,
        )
        estadoActual.totalAtendidos = ticketsExistentes
      }
    } else {
      // Si el estado no existe (primer ticket del día), inicializarlo
      estadoActual = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: ticketsExistentes,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        lastSync: Date.now(),
      }
      // Establecer expiración extendida para la clave del contador si es nueva
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

    // Actualizar la metadata del estado en memoria con el nuevo ticket
    estadoActual.numeroActual = numeroAsignado + 1
    estadoActual.ultimoNumero = numeroAsignado
    estadoActual.totalAtendidos = ticketsExistentes + 1 // Usar el conteo real de la lista + 1
    estadoActual.lastSync = Date.now()

    // OPTIMIZACIÓN: Transacción 2 - Guardar el estado actualizado, añadir el nuevo ticket
    // a la lista de tickets del día y registrar el log. Todo en un solo viaje de ida y vuelta a Redis.
    const transactionResults = await redis
      .multi()
      .set(estadoKey, estadoActual, { ex: 48 * 60 * 60 }) // Guarda la metadata del estado actualizada con persistencia extendida
      .rpush(ticketsListKey, nuevoTicket) // Añade el nuevo ticket al final de la lista de tickets del día
      .expire(ticketsListKey, 48 * 60 * 60) // Asegurar persistencia extendida de la lista
      .expire(counterKey, 48 * 60 * 60) // Asegurar persistencia extendida del contador
      .lpush(
        LOGS_KEY,
        JSON.stringify({
          accion: "GENERAR_TICKET",
          detalles: { numero: numeroAsignado, nombre: nombre.trim(), totalEnSistema: estadoActual.totalAtendidos },
          timestamp_log: timestamp,
        }),
      )
      .ltrim(LOGS_KEY, 0, 1999) // Mantener solo los últimos 2000 logs
      .exec()

    // Crear backup inmediato del ticket para mayor seguridad
    const ticketBackupKey = `${ticketsListKey}:backup:${numeroAsignado}`
    await redis.set(ticketBackupKey, nuevoTicket, { ex: 72 * 60 * 60 }) // 72 horas para backup individual

    console.log(
      "✅ Ticket generado exitosamente en TURNOS_ZOCO (Upstash Redis) con persistencia mejorada:",
      nuevoTicket,
    )
    console.log(
      `📊 Estado actualizado: Total atendidos: ${estadoActual.totalAtendidos}, Último número: ${estadoActual.ultimoNumero}`,
    )

    return nuevoTicket
  } catch (error) {
    console.error("❌ Error al generar ticket en TURNOS_ZOCO (Upstash Redis):", error)
    throw error
  }
}

// --- Backup & Admin Functions ---

// crearBackupDiario ahora espera el estado completo (metadata + tickets)
export async function crearBackupDiario(estado: EstadoSistema & { tickets: TicketInfo[] }): Promise<void> {
  try {
    console.log("📦 Creando backup diario mejorado en TURNOS_ZOCO (Upstash Redis)...")

    const fecha = estado.fechaInicio
    const backupKey = BACKUP_KEY_PREFIX + fecha

    // Calcular métricas avanzadas para el backup
    const metricas = calcularMetricasParaBackup(estado)

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
        // NUEVAS MÉTRICAS SOLICITADAS
        tiempoPromedioEsperaReal: metricas.tiempoEsperaReal,
        horaPico: metricas.horaPico,
        distribucionPorHora: metricas.distribucionPorHora,
        velocidadAtencion: metricas.velocidadAtencion,
        tiempoEntreTickets: metricas.tiempoEntreTickets,
        eficienciaDiaria:
          estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0,
        proyeccionCumplida: metricas.proyeccionCumplida,
        nombresComunes: metricas.nombresComunes,
      },
      tickets: estado.tickets, // Incluye el array completo de tickets en el backup
      // DATOS DETALLADOS PARA DESCARGA
      datosDetallados: {
        ticketsPorHora: metricas.distribucionPorHora,
        analisisTemporal: {
          inicioOperaciones: estado.fechaInicio,
          finOperaciones: new Date().toISOString(),
          duracionTotal: metricas.duracionOperaciones,
          horasPico: metricas.horasPico,
          horasMinimas: metricas.horasMinimas,
        },
        estadisticasClientes: {
          nombresUnicos: metricas.nombresUnicos,
          clientesRecurrentes: metricas.clientesRecurrentes,
          promedioCaracteresPorNombre: metricas.promedioCaracteresPorNombre,
        },
        rendimiento: {
          tiempoPromedioEsperaReal: metricas.tiempoEsperaReal,
          velocidadAtencion: metricas.velocidadAtencion,
          eficienciaOperativa: metricas.eficienciaOperativa,
          tiempoEntreTickets: metricas.tiempoEntreTickets,
        },
      },
    }

    // OPTIMIZACIÓN: SET con expiración para el backup.
    await redis.set(backupKey, backupData, { ex: 60 * 24 * 60 * 60 }) // 60 días de expiración para los backups
    console.log("✅ Backup diario mejorado creado exitosamente en TURNOS_ZOCO (Upstash Redis)")
  } catch (error) {
    console.error("❌ Error al crear backup diario en TURNOS_ZOCO (Upstash Redis):", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

// Nueva función para calcular métricas específicas para el backup
function calcularMetricasParaBackup(estado: EstadoSistema & { tickets: TicketInfo[] }) {
  if (!estado.tickets || estado.tickets.length === 0) {
    return {
      tiempoEsperaReal: 0,
      horaPico: { hora: 0, cantidad: 0, porcentaje: 0 },
      distribucionPorHora: {},
      velocidadAtencion: 0,
      tiempoEntreTickets: 0,
      proyeccionCumplida: 0,
      nombresComunes: [],
      duracionOperaciones: 0,
      horasPico: [],
      horasMinimas: [],
      nombresUnicos: 0,
      clientesRecurrentes: 0,
      promedioCaracteresPorNombre: 0,
      eficienciaOperativa: 0,
    }
  }

  const tickets = estado.tickets
  const ahora = new Date()
  const inicioOperaciones = new Date(estado.fechaInicio)
  const duracionOperaciones = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60 * 60) // en horas

  // 1. Distribución de tickets por hora del día
  const distribucionPorHora = {}
  tickets.forEach((ticket) => {
    const fecha = ticket.timestamp ? new Date(ticket.timestamp) : new Date(ticket.fecha)
    const hora = fecha.getHours()
    distribucionPorHora[hora] = (distribucionPorHora[hora] || 0) + 1
  })

  // 2. Hora pico con más detalles
  const horaPico = Object.entries(distribucionPorHora).reduce(
    (max, [hora, cantidad]) => {
      const porcentaje = Math.round((cantidad / estado.totalAtendidos) * 100)
      return cantidad > max.cantidad ? { hora: Number.parseInt(hora), cantidad, porcentaje } : max
    },
    { hora: 0, cantidad: 0, porcentaje: 0 },
  )

  // 3. Tiempo de espera real promedio mejorado
  let tiempoEsperaReal = 0
  if (estado.numerosLlamados > 0 && tickets.length > 0) {
    const ticketsAtendidos = tickets.slice(0, estado.numerosLlamados)
    const tiemposEspera = []

    ticketsAtendidos.forEach((ticket, index) => {
      const tiempoEmision = ticket.timestamp || new Date(ticket.fecha).getTime()
      const tiempoEstimadoLlamada =
        inicioOperaciones.getTime() + (index + 1) * (duracionOperaciones / estado.numerosLlamados) * 60 * 60 * 1000
      const espera = (tiempoEstimadoLlamada - tiempoEmision) / 1000 / 60 // en minutos
      if (espera > 0) tiemposEspera.push(espera)
    })

    if (tiemposEspera.length > 0) {
      tiempoEsperaReal = tiemposEspera.reduce((a, b) => a + b, 0) / tiemposEspera.length
    }
  }

  // 4. Velocidad de atención
  const tiempoOperacionMinutos = duracionOperaciones * 60
  const velocidadAtencion = tiempoOperacionMinutos > 0 ? estado.numerosLlamados / tiempoOperacionMinutos : 0

  // 5. Tiempo entre tickets
  let tiempoEntreTickets = 0
  if (tickets.length > 1) {
    const tiempos = []
    for (let i = 1; i < tickets.length; i++) {
      const timestamp1 = tickets[i - 1].timestamp || new Date(tickets[i - 1].fecha).getTime()
      const timestamp2 = tickets[i].timestamp || new Date(tickets[i].fecha).getTime()
      const diff = timestamp2 - timestamp1
      if (diff > 0) tiempos.push(diff)
    }
    if (tiempos.length > 0) {
      tiempoEntreTickets = tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000 / 60 // en minutos
    }
  }

  // 6. Análisis de nombres
  const nombresMap = {}
  let totalCaracteres = 0
  tickets.forEach((ticket) => {
    const nombre = ticket.nombre.toLowerCase().trim()
    if (nombre !== "cliente zoco") {
      nombresMap[nombre] = (nombresMap[nombre] || 0) + 1
      totalCaracteres += ticket.nombre.length
    }
  })

  const nombresComunes = Object.entries(nombresMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
      porcentaje: Math.round((cantidad / estado.totalAtendidos) * 100),
    }))

  const nombresUnicos = Object.keys(nombresMap).length
  const clientesRecurrentes = Object.values(nombresMap).filter((count) => count > 1).length
  const promedioCaracteresPorNombre = tickets.length > 0 ? Math.round(totalCaracteres / tickets.length) : 0

  // 7. Horas pico y mínimas
  const horasOrdenadas = Object.entries(distribucionPorHora).sort(([, a], [, b]) => b - a)

  const horasPico = horasOrdenadas.slice(0, 3).map(([hora, cantidad]) => ({
    hora: Number.parseInt(hora),
    cantidad,
    porcentaje: Math.round((cantidad / estado.totalAtendidos) * 100),
  }))

  const horasMinimas = horasOrdenadas.slice(-3).map(([hora, cantidad]) => ({
    hora: Number.parseInt(hora),
    cantidad,
    porcentaje: Math.round((cantidad / estado.totalAtendidos) * 100),
  }))

  // 8. Proyección cumplida
  const horaActual = ahora.getHours()
  const minutosTranscurridos = ahora.getHours() * 60 + ahora.getMinutes()
  const proyeccionDiaria =
    minutosTranscurridos > 0
      ? Math.round((estado.totalAtendidos / minutosTranscurridos) * (24 * 60))
      : estado.totalAtendidos
  const proyeccionCumplida = proyeccionDiaria > 0 ? Math.round((estado.totalAtendidos / proyeccionDiaria) * 100) : 100

  // 9. Eficiencia operativa
  const eficienciaOperativa =
    estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0

  return {
    tiempoEsperaReal: Math.round(tiempoEsperaReal * 10) / 10,
    horaPico,
    distribucionPorHora,
    velocidadAtencion: Math.round(velocidadAtencion * 100) / 100,
    tiempoEntreTickets: Math.round(tiempoEntreTickets * 10) / 10,
    proyeccionCumplida,
    nombresComunes,
    duracionOperaciones: Math.round(duracionOperaciones * 10) / 10,
    horasPico,
    horasMinimas,
    nombresUnicos,
    clientesRecurrentes,
    promedioCaracteresPorNombre,
    eficienciaOperativa,
  }
}

export async function obtenerBackups(): Promise<any[]> {
  try {
    // NOTA: KEYS puede ser lento en bases de datos muy grandes.
    // Para un número limitado de backups (ej. 30-60 días), es aceptable.
    const allKeys = await redis.keys(BACKUP_KEY_PREFIX + "*")
    const backups: any[] = []

    // OPTIMIZACIÓN: Obtener todos los backups en una sola operación MULTI/EXEC si es posible
    if (allKeys.length > 0) {
      const multi = redis.multi()
      for (const key of allKeys) {
        multi.get(key)
      }
      const results = await multi.exec()

      if (Array.isArray(results)) {
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
    }

    backups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    return backups.slice(0, 30) // Limitar a los últimos 30
  } catch (error) {
    console.error("❌ Error al obtener backups desde TURNOS_ZOCO (Upstash Redis):", error)
    return []
  }
}

export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    const backupKey = BACKUP_KEY_PREFIX + fecha
    // OPTIMIZACIÓN: GET es una operación de lectura directa y eficiente.
    const backup = await redis.get(backupKey)
    return backup || null
  } catch (error) {
    console.error("❌ Error al obtener backup desde TURNOS_ZOCO (Upstash Redis):", error)
    return null
  }
}

// Función para limpiar datos antiguos (estados diarios, listas de tickets y backups)
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    console.log("🧹 Limpiando datos antiguos en TURNOS_ZOCO (Upstash Redis)...")
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos

    // NOTA: KEYS puede ser lento en bases de datos muy grandes.
    // Para la limpieza periódica de datos con prefijos específicos, es manejable.
    const dailyStateKeys = await redis.keys(STATE_KEY_PREFIX + "*")
    const dailyTicketsKeys = await redis.keys(TICKETS_LIST_KEY_PREFIX + "*")
    const dailyCounterKeys = await redis.keys(COUNTER_KEY_PREFIX + "*")
    const allDailyKeys = [...dailyStateKeys, ...dailyTicketsKeys, ...dailyCounterKeys]

    // OPTIMIZACIÓN: Usar DEL para eliminar múltiples claves.
    const keysToDelete = []
    for (const key of allDailyKeys) {
      const datePart = key.split(":").pop() // Extraer YYYY-MM-DD de la clave
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

    // Limpiar backups antiguos
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

    // OPTIMIZACIÓN: LTRIM para recortar la lista de logs de forma eficiente.
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

    console.log("✅ Datos antiguos limpiados exitosamente en TURNOS_ZOCO (Upstash Redis)")
  } catch (error) {
    console.error("❌ Error al limpiar datos antiguos en TURNOS_ZOCO (Upstash Redis):", error)
  }
}

export async function obtenerEstadisticas(estado: EstadoSistema & { tickets: TicketInfo[] }) {
  try {
    // Esta función procesa datos ya obtenidos de Redis, por lo que su eficiencia
    // depende de la eficiencia de 'leerEstadoSistema'.
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

    // Verificar configuración primero
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

    // Test básico con manejo de errores mejorado
    try {
      const testKey = "TURNOS_ZOCO:health_check:" + Date.now()
      const testValue = "health_check_" + Math.random()

      console.log("🧪 Ejecutando test de conexión básico...")

      // Intentar operación SET con timeout
      await Promise.race([
        redis.set(testKey, testValue, { ex: 30 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout en SET")), 10000)),
      ])

      console.log("✅ SET exitoso")

      // Intentar operación GET con timeout
      const result = await Promise.race([
        redis.get(testKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout en GET")), 10000)),
      ])

      console.log("✅ GET exitoso, resultado:", result)

      // Limpiar
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
        endpoint: redisConfig.url,
        region: redisConfig.url.includes("us1") ? "US East" : redisConfig.url.includes("eu1") ? "EU West" : "Global",
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
      }

      return { connected: isConnected, details }
    } catch (operationError) {
      console.error("❌ Error en operaciones de Redis:", operationError)

      // Intentar ping como fallback
      try {
        console.log("🔄 Intentando ping como fallback...")
        const pingResult = await Promise.race([
          redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout en PING")), 5000)),
        ])

        console.log("✅ Ping exitoso:", pingResult)

        return {
          connected: true,
          details: {
            connected: true,
            responseTime: Date.now() - startTime + "ms",
            config: redisConfig.name,
            endpoint: redisConfig.url,
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
            endpoint: redisConfig.url,
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

// Nueva función para recuperar datos en caso de pérdida
export async function recuperarDatosPerdidos(fecha: string): Promise<EstadoSistema & { tickets: TicketInfo[] }> {
  try {
    console.log("🔧 Intentando recuperar datos perdidos para:", fecha)

    const estadoKey = STATE_KEY_PREFIX + fecha
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fecha
    const counterKey = COUNTER_KEY_PREFIX + fecha
    const backupKey = `${estadoKey}:backup`

    // Intentar recuperar desde backup
    const [estadoBackup, ticketsOriginales, contador] = await redis
      .multi()
      .get<EstadoSistema>(backupKey)
      .lrange<TicketInfo>(ticketsListKey, 0, -1)
      .get(counterKey)
      .exec()

    if (estadoBackup && typeof estadoBackup === "object") {
      console.log("✅ Datos recuperados desde backup")
      const tickets = Array.isArray(ticketsOriginales) ? ticketsOriginales : []

      // Restaurar datos principales desde backup
      await redis.set(estadoKey, estadoBackup, { ex: 48 * 60 * 60 })

      return { ...estadoBackup, tickets }
    }

    // Si no hay backup, intentar reconstruir desde tickets individuales
    const ticketKeys = await redis.keys(`${ticketsListKey}:backup:*`)
    if (ticketKeys.length > 0) {
      console.log("🔧 Reconstruyendo desde tickets individuales...")

      const multi = redis.multi()
      for (const key of ticketKeys) {
        multi.get(key)
      }
      const ticketsIndividuales = await multi.exec()

      const ticketsRecuperados: TicketInfo[] = ticketsIndividuales
        .filter((ticket): ticket is TicketInfo => ticket && typeof ticket === "object")
        .sort((a, b) => a.numero - b.numero)

      if (ticketsRecuperados.length > 0) {
        const ultimoNumero = Math.max(...ticketsRecuperados.map((t) => t.numero))
        const estadoReconstruido: EstadoSistema = {
          numeroActual: ultimoNumero + 1,
          ultimoNumero: ultimoNumero,
          totalAtendidos: ticketsRecuperados.length,
          numerosLlamados: 0,
          fechaInicio: fecha,
          ultimoReinicio: new Date().toISOString(),
          lastSync: Date.now(),
        }

        // Restaurar lista de tickets
        await redis.del(ticketsListKey)
        if (ticketsRecuperados.length > 0) {
          await redis.rpush(ticketsListKey, ...ticketsRecuperados)
          await redis.expire(ticketsListKey, 48 * 60 * 60)
        }

        // Restaurar estado
        await redis.set(estadoKey, estadoReconstruido, { ex: 48 * 60 * 60 })
        await redis.set(counterKey, ultimoNumero, { ex: 48 * 60 * 60 })

        console.log("✅ Datos reconstruidos exitosamente")
        return { ...estadoReconstruido, tickets: ticketsRecuperados }
      }
    }

    throw new Error("No se pudieron recuperar los datos")
  } catch (error) {
    console.error("❌ Error al recuperar datos perdidos:", error)
    throw error
  }
}
