import { Redis } from "@upstash/redis"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

// EstadoSistema ahora NO contendrá el array 'tickets' directamente
interface EstadoSistemaOld {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string // YYYY-MM-DD
  ultimoReinicio: string // ISO string
  lastSync?: number
}

export interface EstadoSistema {
  ticketActual: number
  totalTickets: number
  fechaInicio: string
  activo: boolean
  nombreActual?: string
}

export interface BackupDiario {
  fecha: string
  ticketFinal: number
  totalTickets: number
  fechaInicio: string
  fechaFin: string
}

export interface ResumenHistorico {
  totalDias: number
  totalTicketsHistorico: number
  promedioTicketsPorDia: number
  mejorDia: {
    fecha: string
    tickets: number
  }
  peorDia: {
    fecha: string
    tickets: number
  }
  ultimaActualizacion: string
}

// Función para obtener las variables de entorno correctas
function getRedisConfig() {
  // Intentar diferentes combinaciones de variables de entorno disponibles
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
    KV_REST_API_URL: process.env.KV_REST_API_URL ? "✓ Configurado" : "✗ No configurado",
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "✓ Configurado" : "✗ No configurado",
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? "✓ Configurado" : "✗ No configurado",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? "✓ Configurado" : "✗ No configurado",
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

const ESTADO_KEY = "sistema:estado"
const BACKUP_PREFIX = "backup:diario:"
const RESUMEN_HISTORICO_KEY = "resumen:historico"

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

// Función helper para validar y parsear JSON de forma segura
function safeJsonParse(data: any, fallback: any = null): any {
  if (data === null || data === undefined) {
    return fallback
  }

  // Si ya es un objeto, devolverlo directamente
  if (typeof data === "object" && data !== null) {
    return data
  }

  // Si es una string, intentar parsear
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error("❌ Error al parsear JSON:", error, "Data:", data.substring(0, 100))
      return fallback
    }
  }

  return fallback
}

// Función helper para validar estructura de datos
function validateEstadoSistema(data: any): EstadoSistemaOld | null {
  if (!data || typeof data !== "object") {
    return null
  }

  // Verificar que tenga las propiedades requeridas
  const requiredFields = ["numeroActual", "ultimoNumero", "totalAtendidos", "numerosLlamados", "fechaInicio"]
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.log(`⚠️ Campo requerido faltante: ${field}`)
      return null
    }
  }

  // Validar tipos
  if (
    typeof data.numeroActual !== "number" ||
    typeof data.ultimoNumero !== "number" ||
    typeof data.totalAtendidos !== "number" ||
    typeof data.numerosLlamados !== "number" ||
    typeof data.fechaInicio !== "string"
  ) {
    console.log("⚠️ Tipos de datos inválidos en estado")
    return null
  }

  return data as EstadoSistemaOld
}

// Función helper para validar tickets
function validateTickets(data: any): TicketInfo[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((ticket) => {
    return (
      ticket &&
      typeof ticket === "object" &&
      typeof ticket.numero === "number" &&
      typeof ticket.nombre === "string" &&
      (typeof ticket.fecha === "string" || typeof ticket.timestamp === "number")
    )
  })
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
export async function leerEstadoSistema(): Promise<EstadoSistemaOld & { tickets: TicketInfo[] }> {
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
      let estado: EstadoSistemaOld

      // Validar y parsear tickets de forma segura
      const ticketsParsed = safeJsonParse(ticketsRaw, [])
      const tickets: TicketInfo[] = validateTickets(ticketsParsed)
      const contador = typeof contadorActual === "number" ? contadorActual : 0

      console.log(`🔍 Datos leídos: ${tickets.length} tickets, contador: ${contador}`)
      console.log(`📊 Existencia: Estado: ${estadoExists ? "✓" : "✗"}, Tickets: ${ticketsExists ? "✓" : "✗"}`)

      // Validar y parsear estado de forma segura
      const estadoParsed = safeJsonParse(estadoRaw, null)
      const estadoValidado = validateEstadoSistema(estadoParsed)

      if (estadoValidado) {
        estado = estadoValidado

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
        console.log("⚠️ No se encontró estado válido para hoy, creando inicial en TURNOS_ZOCO (Upstash Redis)...")

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
export async function escribirEstadoSistema(estado: EstadoSistemaOld): Promise<void> {
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

// Función para generar un nuevo ticket de forma atómica - CORREGIDA
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo> {
  return retryOperation(
    async () => {
      console.log("🎫 Generando ticket atómico para:", nombre, "en TURNOS_ZOCO (Upstash Redis)...")
      const fechaHoy = getTodayDateString()
      const estadoKey = STATE_KEY_PREFIX + fechaHoy
      const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fechaHoy
      const counterKey = COUNTER_KEY_PREFIX + fechaHoy

      try {
        // PASO 1: Incrementar contador atómico
        console.log("🔢 Incrementando contador atómico...")
        const numeroAsignado = await redis.incr(counterKey)
        console.log(`✅ Número asignado: ${numeroAsignado}`)

        // PASO 2: Crear el ticket
        const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
        const timestamp = Date.now()

        const nuevoTicket: TicketInfo = {
          numero: numeroAsignado,
          nombre: nombre.trim(),
          fecha,
          timestamp,
        }

        console.log("🎫 Ticket creado:", nuevoTicket)

        // PASO 3: Obtener estado actual
        console.log("📖 Obteniendo estado actual...")
        const estadoRaw = await redis.get(estadoKey)
        const estadoParsed = safeJsonParse(estadoRaw, null)
        let estadoActual: EstadoSistemaOld

        const estadoValidado = validateEstadoSistema(estadoParsed)
        if (estadoValidado) {
          estadoActual = estadoValidado
        } else {
          // Si el estado no existe (primer ticket del día), inicializarlo
          console.log("🆕 Creando estado inicial para el día...")
          estadoActual = {
            numeroActual: 1,
            ultimoNumero: 0,
            totalAtendidos: 0,
            numerosLlamados: 0,
            fechaInicio: fechaHoy,
            ultimoReinicio: new Date().toISOString(),
            lastSync: Date.now(),
          }
        }

        // PASO 4: Actualizar estado
        console.log("📝 Actualizando estado...")
        estadoActual.numeroActual = numeroAsignado + 1
        estadoActual.ultimoNumero = numeroAsignado
        estadoActual.totalAtendidos = numeroAsignado // Usar el contador como fuente de verdad
        estadoActual.lastSync = Date.now()

        // PASO 5: Guardar todo en una transacción
        console.log("💾 Guardando en transacción...")
        const multi = redis.multi()
        multi.set(estadoKey, estadoActual, { ex: 48 * 60 * 60 }) // Estado actualizado
        multi.rpush(ticketsListKey, nuevoTicket) // Añadir ticket a la lista
        multi.expire(ticketsListKey, 48 * 60 * 60) // Asegurar persistencia
        multi.expire(counterKey, 48 * 60 * 60) // Asegurar persistencia del contador

        const transactionResult = await multi.exec()
        console.log("📊 Resultado de transacción:", transactionResult)

        if (!transactionResult || transactionResult.length !== 4) {
          throw new Error("Transacción falló o resultado inesperado")
        }

        // Verificar que todas las operaciones fueron exitosas
        const allSuccessful = transactionResult.every((result) => {
          if (typeof result === "string" && result === "OK") return true
          if (typeof result === "number" && result > 0) return true
          return false
        })

        if (!allSuccessful) {
          throw new Error("Algunas operaciones de la transacción fallaron")
        }

        console.log("✅ Ticket generado exitosamente:", nuevoTicket)
        return nuevoTicket
      } catch (error) {
        console.error("❌ Error en generarTicketAtomico:", error)
        throw error
      }
    },
    3, // Máximo 3 reintentos
    500, // Delay inicial de 500ms
    "Generación de ticket",
  )
}

// --- Backup & Admin Functions ---

// crearBackupDiario ahora espera el estado completo (metadata + tickets)
export async function crearBackupDiarioOld(estado: EstadoSistemaOld & { tickets: TicketInfo[] }): Promise<void> {
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
        // NUEVOS DATOS DE RESUMEN DETALLADO
        inicioOperaciones: estado.tickets[0]?.fecha || estado.fechaInicio,
        finOperaciones: estado.tickets[estado.tickets.length - 1]?.fecha || new Date().toISOString(),
        duracionOperaciones: metricas.duracionOperaciones,
        ticketsPorHora: Math.round((estado.totalAtendidos / Math.max(metricas.duracionOperaciones, 1)) * 10) / 10,
        clientesUnicos: metricas.nombresUnicos,
        clientesRecurrentes: metricas.clientesRecurrentes,
        promedioCaracteresPorNombre: metricas.promedioCaracteresPorNombre,
      },
      tickets: estado.tickets, // Incluye el array completo de tickets en el backup
      // DATOS DETALLADOS PARA DESCARGA Y ANÁLISIS
      datosDetallados: {
        ticketsPorHora: metricas.distribucionPorHora,
        analisisTemporal: {
          inicioOperaciones: estado.fechaInicio,
          finOperaciones: new Date().toISOString(),
          duracionTotal: metricas.duracionOperaciones,
          horasPico: metricas.horasPico,
          horasMinimas: metricas.horasMinimas,
          distribucionCompleta: metricas.distribucionPorHora,
        },
        estadisticasClientes: {
          nombresUnicos: metricas.nombresUnicos,
          clientesRecurrentes: metricas.clientesRecurrentes,
          promedioCaracteresPorNombre: metricas.promedioCaracteresPorNombre,
          top10Nombres: metricas.nombresComunes.slice(0, 10),
        },
        rendimiento: {
          tiempoPromedioEsperaReal: metricas.tiempoEsperaReal,
          velocidadAtencion: metricas.velocidadAtencion,
          eficienciaOperativa: metricas.eficienciaOperativa,
          tiempoEntreTickets: metricas.tiempoEntreTickets,
          proyeccionCumplida: metricas.proyeccionCumplida,
        },
        // NUEVOS ANÁLISIS AGREGADOS
        analisisComparativo: {
          vs_promedio_historico: 0, // Se calculará cuando tengamos más días
          tendencia_semanal: "estable",
          mejora_eficiencia: 0,
        },
        metadatos: {
          version_backup: "6.0",
          timestamp_creacion: Date.now(),
          dia_semana: new Date(estado.fechaInicio).toLocaleDateString("es-AR", { weekday: "long" }),
          mes: new Date(estado.fechaInicio).toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
          es_fin_de_semana: [0, 6].includes(new Date(estado.fechaInicio).getDay()),
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

export async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    const fecha = new Date().toISOString().split("T")[0]
    const backup: BackupDiario = {
      fecha,
      ticketFinal: estado.ticketActual,
      totalTickets: estado.totalTickets,
      fechaInicio: estado.fechaInicio,
      fechaFin: new Date().toISOString(),
    }

    await redis.set(`${BACKUP_PREFIX}${fecha}`, backup)
    console.log(`Backup creado para ${fecha}:`, backup)
  } catch (error) {
    console.error("Error al crear backup diario:", error)
    throw error
  }
}

// Nueva función para calcular métricas específicas para el backup
function calcularMetricasParaBackup(estado: EstadoSistemaOld & { tickets: TicketInfo[] }) {
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

// FUNCIÓN MEJORADA: obtenerBackups con mejor manejo de errores y más datos
export async function obtenerBackups(): Promise<any[]> {
  try {
    console.log("📋 Obteniendo lista de backups desde TURNOS_ZOCO (Upstash Redis)...")

    // MÉTODO 1: Intentar usar SCAN (más eficiente)
    let allKeys: string[] = []

    try {
      console.log("🔍 Intentando método SCAN...")
      let cursor = 0
      let scanAttempts = 0
      const maxScanAttempts = 10

      do {
        scanAttempts++
        console.log(`📡 SCAN intento ${scanAttempts}/${maxScanAttempts}, cursor: ${cursor}`)

        const result = await redis.scan(cursor, {
          match: BACKUP_KEY_PREFIX + "*",
          count: 50, // Reducir count para evitar timeouts
        })

        console.log("📊 Resultado SCAN:", typeof result, Array.isArray(result) ? result.length : "no array")

        if (Array.isArray(result) && result.length >= 2) {
          const newCursor = result[0]
          const keys = result[1]

          console.log(
            `🔍 Cursor: ${cursor} -> ${newCursor}, Keys encontradas: ${Array.isArray(keys) ? keys.length : 0}`,
          )

          cursor = typeof newCursor === "number" ? newCursor : Number.parseInt(String(newCursor)) || 0

          if (Array.isArray(keys)) {
            allKeys.push(...keys)
            console.log(`✅ Agregadas ${keys.length} claves, total: ${allKeys.length}`)
          }
        } else {
          console.log("⚠️ Resultado SCAN inesperado:", result)
          break
        }

        if (scanAttempts >= maxScanAttempts) {
          console.log("⚠️ Máximo de intentos SCAN alcanzado")
          break
        }
      } while (cursor !== 0)

      console.log(`✅ SCAN completado: ${allKeys.length} claves encontradas`)
    } catch (scanError) {
      console.error("❌ Error en SCAN, intentando método KEYS:", scanError)

      // MÉTODO 2: Fallback a KEYS si SCAN falla
      try {
        console.log("🔄 Usando método KEYS como fallback...")
        const keysResult = await redis.keys(BACKUP_KEY_PREFIX + "*")
        allKeys = Array.isArray(keysResult) ? keysResult : []
        console.log(`✅ KEYS completado: ${allKeys.length} claves encontradas`)
      } catch (keysError) {
        console.error("❌ Error en KEYS también:", keysError)

        // MÉTODO 3: Intentar fechas específicas si todo falla
        console.log("🔄 Intentando método de fechas específicas...")
        const today = new Date()
        const possibleKeys: string[] = []

        // Intentar los últimos 30 días
        for (let i = 0; i < 30; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateString = date.toISOString().split("T")[0] // YYYY-MM-DD
          possibleKeys.push(BACKUP_KEY_PREFIX + dateString)
        }

        console.log(`🔍 Verificando ${possibleKeys.length} fechas específicas...`)

        // Verificar cuáles existen
        const existsResults = await redis
          .pipeline()
          .exists(...possibleKeys)
          .exec()

        if (Array.isArray(existsResults)) {
          possibleKeys.forEach((key, index) => {
            if (existsResults[index] === 1) {
              allKeys.push(key)
            }
          })
        }

        console.log(`✅ Método fechas específicas: ${allKeys.length} claves encontradas`)
      }
    }

    if (allKeys.length === 0) {
      console.log("⚠️ No se encontraron backups con ningún método")
      return []
    }

    console.log(`🔍 Total de claves encontradas: ${allKeys.length}`)
    console.log("📋 Claves encontradas:", allKeys.slice(0, 5)) // Mostrar solo las primeras 5

    const backups: any[] = []

    // Procesar en lotes más pequeños para evitar timeouts
    const batchSize = 5 // Reducir de 10 a 5
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize)
      console.log(`📦 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(allKeys.length / batchSize)}`)
      console.log(`📋 Claves del lote:`, batch)

      try {
        // Usar pipeline para obtener múltiples valores
        const pipeline = redis.pipeline()
        for (const key of batch) {
          pipeline.get(key)
        }
        const results = await pipeline.exec()

        console.log(`📊 Resultados del lote:`, Array.isArray(results) ? results.length : "no array")

        if (Array.isArray(results)) {
          results.forEach((backup: any, index) => {
            try {
              const key = batch[index]
              const fecha = key.replace(BACKUP_KEY_PREFIX, "")

              console.log(`🔍 Procesando backup ${index + 1}/${results.length}:`, fecha)
              console.log(`📊 Tipo de backup:`, typeof backup, backup ? "existe" : "null")

              // Parsear backup de forma segura
              const backupParsed = safeJsonParse(backup, null)

              if (backupParsed && typeof backupParsed === "object") {
                // Validar que la fecha sea válida
                if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  const backupProcessed = {
                    fecha: backupParsed.fecha || fecha,
                    resumen: backupParsed.resumen || {
                      totalTicketsEmitidos: 0,
                      totalTicketsAtendidos: 0,
                      ticketsPendientes: 0,
                      eficienciaDiaria: 0,
                      primerTicket: 0,
                      ultimoTicket: 0,
                      tiempoPromedioEsperaReal: 0,
                      horaPico: { hora: 0, cantidad: 0, porcentaje: 0 },
                    },
                    createdAt:
                      backupParsed.resumen?.horaBackup ||
                      backupParsed.estadoFinal?.ultimoReinicio ||
                      new Date().toISOString(),
                    // Información de debugging
                    _debug: {
                      keyOriginal: key,
                      fechaExtraida: fecha,
                      tieneResumen: !!backupParsed.resumen,
                      tieneTickets: !!(backupParsed.tickets && backupParsed.tickets.length > 0),
                      cantidadTickets: backupParsed.tickets ? backupParsed.tickets.length : 0,
                    },
                  }

                  backups.push(backupProcessed)
                  console.log(`✅ Backup procesado: ${fecha} (${backupProcessed.resumen.totalTicketsEmitidos} tickets)`)
                } else {
                  console.log(`⚠️ Fecha inválida en clave: ${key}`)
                }
              } else {
                console.log(`⚠️ Backup inválido en posición ${index}, clave: ${key}`)
              }
            } catch (itemError) {
              console.error(`❌ Error procesando item ${index}:`, itemError)
            }
          })
        } else {
          console.error("❌ Resultados del pipeline no son un array:", results)
        }
      } catch (batchError) {
        console.error(`❌ Error procesando lote ${Math.floor(i / batchSize) + 1}:`, batchError)

        // Intentar procesar individualmente si el lote falla
        console.log("🔄 Intentando procesamiento individual...")
        for (const key of batch) {
          try {
            const backup = await redis.get(key)
            const fecha = key.replace(BACKUP_KEY_PREFIX, "")

            const backupParsed = safeJsonParse(backup, null)

            if (backupParsed && typeof backupParsed === "object" && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const backupProcessed = {
                fecha: backupParsed.fecha || fecha,
                resumen: backupParsed.resumen || {
                  totalTicketsEmitidos: 0,
                  totalTicketsAtendidos: 0,
                  ticketsPendientes: 0,
                  eficienciaDiaria: 0,
                  primerTicket: 0,
                  ultimoTicket: 0,
                  tiempoPromedioEsperaReal: 0,
                  horaPico: { hora: 0, cantidad: 0, porcentaje: 0 },
                },
                createdAt:
                  backupParsed.resumen?.horaBackup ||
                  backupParsed.estadoFinal?.ultimoReinicio ||
                  new Date().toISOString(),
                _debug: {
                  keyOriginal: key,
                  fechaExtraida: fecha,
                  tieneResumen: !!backupParsed.resumen,
                  tieneTickets: !!(backupParsed.tickets && backupParsed.tickets.length > 0),
                  cantidadTickets: backupParsed.tickets ? backupParsed.tickets.length : 0,
                  procesamientoIndividual: true,
                },
              }

              backups.push(backupProcessed)
              console.log(`✅ Backup individual procesado: ${fecha}`)
            }
          } catch (individualError) {
            console.error(`❌ Error procesando backup individual ${key}:`, individualError)
          }
        }
      }

      // Pequeña pausa entre lotes para evitar saturar la conexión
      if (i + batchSize < allKeys.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime()
      const fechaB = new Date(b.fecha).getTime()
      return fechaB - fechaA
    })

    console.log(`✅ Total de backups procesados exitosamente: ${backups.length}`)

    // Log de resumen para debugging
    if (backups.length > 0) {
      console.log("📊 Resumen de backups encontrados:")
      backups.slice(0, 5).forEach((backup) => {
        console.log(`  - ${backup.fecha}: ${backup.resumen.totalTicketsEmitidos} tickets emitidos`)
      })

      if (backups.length > 5) {
        console.log(`  ... y ${backups.length - 5} más`)
      }
    }

    // Limitar a los últimos 60 días para evitar problemas de memoria
    const result = backups.slice(0, 60)
    console.log(`📋 Devolviendo ${result.length} backups (limitado a 60 días)`)

    return result
  } catch (error) {
    console.error("❌ Error crítico al obtener backups desde TURNOS_ZOCO (Upstash Redis):")
    console.error("Error type:", typeof error)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack available")

    // Intentar extraer más información del error
    if (error && typeof error === "object") {
      console.error("Error object keys:", Object.keys(error))
      try {
        console.error("Error object:", JSON.stringify(error, null, 2))
      } catch (jsonError) {
        console.error("No se pudo serializar el error object")
      }
    }

    return []
  }
}

export async function obtenerBackupsPorFecha(fechaInicio: string, fechaFin: string): Promise<BackupDiario[]> {
  try {
    const keys = await redis.keys(`${BACKUP_PREFIX}*`)
    const backups: BackupDiario[] = []

    for (const key of keys) {
      const backup = (await redis.get(key)) as BackupDiario
      if (backup && backup.fecha >= fechaInicio && backup.fecha <= fechaFin) {
        backups.push(backup)
      }
    }

    return backups.sort((a, b) => a.fecha.localeCompare(b.fecha))
  } catch (error) {
    console.error("Error al obtener backups por fecha:", error)
    throw error
  }
}

export async function obtenerTodosLosBackups(): Promise<BackupDiario[]> {
  try {
    const keys = await redis.keys(`${BACKUP_PREFIX}*`)
    const backups: BackupDiario[] = []

    for (const key of keys) {
      const backup = (await redis.get(key)) as BackupDiario
      if (backup) {
        backups.push(backup)
      }
    }

    return backups.sort((a, b) => a.fecha.localeCompare(b.fecha))
  } catch (error) {
    console.error("Error al obtener todos los backups:", error)
    throw error
  }
}

export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    console.log(`📋 Obteniendo backup específico para fecha: ${fecha}`)
    const backupKey = BACKUP_KEY_PREFIX + fecha

    // OPTIMIZACIÓN: GET es una operación de lectura directa y eficiente.
    const backup = await redis.get(backupKey)

    if (backup) {
      console.log(`✅ Backup encontrado para ${fecha}`)
      // Parsear de forma segura
      const backupParsed = safeJsonParse(backup, null)
      return backupParsed
    } else {
      console.log(`⚠️ No se encontró backup para ${fecha}`)
      return null
    }
  } catch (error) {
    console.error("❌ Error al obtener backup desde TURNOS_ZOCO (Upstash Redis):", error)
    return null
  }
}

// NUEVA FUNCIÓN: Obtener resumen consolidado de días anteriores
export async function obtenerResumenDiasAnterioresOld(): Promise<{
  resumenGeneral: any
  datosPorDia: any[]
  tendencias: any
  comparativas: any
}> {
  try {
    console.log("📊 Generando resumen consolidado de días anteriores...")

    const backups = await obtenerBackups()

    if (backups.length === 0) {
      return {
        resumenGeneral: {
          totalDias: 0,
          totalTicketsHistoricos: 0,
          promedioTicketsPorDia: 0,
          mejorDia: null,
          peorDia: null,
        },
        datosPorDia: [],
        tendencias: {
          tendenciaGeneral: "sin_datos",
          crecimientoSemanal: 0,
          eficienciaPromedio: 0,
        },
        comparativas: {
          diasMasActivos: [],
          horasPicoGlobales: {},
          clientesMasFrecuentes: [],
        },
      }
    }

    // RESUMEN GENERAL
    const totalDias = backups.length
    const totalTicketsHistoricos = backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0)
    const totalTicketsAtendidos = backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsAtendidos || 0), 0)
    const promedioTicketsPorDia = Math.round(totalTicketsHistoricos / totalDias)
    const promedioAtendidosPorDia = Math.round(totalTicketsAtendidos / totalDias)

    // Encontrar mejor y peor día
    const mejorDia = backups.reduce((mejor, backup) => {
      const emitidos = backup.resumen?.totalTicketsEmitidos || 0
      const mejorEmitidos = mejor?.resumen?.totalTicketsEmitidos || 0
      return emitidos > mejorEmitidos ? backup : mejor
    }, null)

    const peorDia = backups.reduce((peor, backup) => {
      const emitidos = backup.resumen?.totalTicketsEmitidos || 0
      const peorEmitidos = peor?.resumen?.totalTicketsEmitidos || Number.POSITIVE_INFINITY
      return emitidos < peorEmitidos ? backup : peor
    }, null)

    // ANÁLISIS DE TENDENCIAS
    const mitad = Math.floor(backups.length / 2)
    const diasRecientes = backups.slice(0, mitad) // Más recientes
    const diasAntiguos = backups.slice(mitad) // Más antiguos

    const promedioReciente =
      diasRecientes.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0) / diasRecientes.length
    const promedioAntiguo =
      diasAntiguos.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0) / diasAntiguos.length

    let tendenciaGeneral = "estable"
    let crecimientoSemanal = 0
    if (promedioReciente > promedioAntiguo * 1.1) {
      tendenciaGeneral = "creciente"
      crecimientoSemanal = Math.round(((promedioReciente - promedioAntiguo) / promedioAntiguo) * 100)
    } else if (promedioReciente < promedioAntiguo * 0.9) {
      tendenciaGeneral = "decreciente"
      crecimientoSemanal = Math.round(((promedioReciente - promedioAntiguo) / promedioAntiguo) * 100)
    }

    const eficienciaPromedio =
      totalTicketsHistoricos > 0 ? Math.round((totalTicketsAtendidos / totalTicketsHistoricos) * 100) : 0

    // ANÁLISIS POR DÍA DE LA SEMANA
    const datosPorDiaSemana = {}
    const datosPorMes = {}
    const horasPicoGlobales = {}
    const clientesGlobales = {}

    backups.forEach((backup) => {
      const fecha = new Date(backup.fecha)
      const diaSemana = fecha.toLocaleDateString("es-AR", { weekday: "long" })
      const mes = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" })

      // Análisis por día de la semana
      if (!datosPorDiaSemana[diaSemana]) {
        datosPorDiaSemana[diaSemana] = {
          totalTickets: 0,
          totalDias: 0,
          promedio: 0,
          eficienciaPromedio: 0,
        }
      }
      datosPorDiaSemana[diaSemana].totalTickets += backup.resumen?.totalTicketsEmitidos || 0
      datosPorDiaSemana[diaSemana].totalDias += 1
      datosPorDiaSemana[diaSemana].eficienciaPromedio += backup.resumen?.eficienciaDiaria || 0

      // Análisis por mes
      if (!datosPorMes[mes]) {
        datosPorMes[mes] = {
          totalTickets: 0,
          totalDias: 0,
          promedio: 0,
        }
      }
      datosPorMes[mes].totalTickets += backup.resumen?.totalTicketsEmitidos || 0
      datosPorMes[mes].totalDias += 1

      // Horas pico globales
      if (backup.resumen?.distribucionPorHora) {
        Object.entries(backup.resumen.distribucionPorHora).forEach(([hora, cantidad]) => {
          horasPicoGlobales[hora] = (horasPicoGlobales[hora] || 0) + cantidad
        })
      }

      // Clientes más frecuentes globalmente
      if (backup.resumen?.nombresComunes) {
        backup.resumen.nombresComunes.forEach((item) => {
          const nombre = typeof item === "object" ? item.nombre : item[0]
          const cantidad = typeof item === "object" ? item.cantidad : item[1]
          clientesGlobales[nombre] = (clientesGlobales[nombre] || 0) + cantidad
        })
      }
    })

    // Calcular promedios
    Object.keys(datosPorDiaSemana).forEach((dia) => {
      const data = datosPorDiaSemana[dia]
      data.promedio = Math.round(data.totalTickets / data.totalDias)
      data.eficienciaPromedio = Math.round(data.eficienciaPromedio / data.totalDias)
    })

    Object.keys(datosPorMes).forEach((mes) => {
      const data = datosPorMes[mes]
      data.promedio = Math.round(data.totalTickets / data.totalDias)
    })

    // Top clientes globales
    const clientesMasFrecuentes = Object.entries(clientesGlobales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        porcentaje: Math.round((cantidad / totalTicketsHistoricos) * 100),
      }))

    // Días más activos
    const diasMasActivos = [...backups]
      .sort((a, b) => (b.resumen?.totalTicketsEmitidos || 0) - (a.resumen?.totalTicketsEmitidos || 0))
      .slice(0, 10)
      .map((backup) => ({
        fecha: backup.fecha,
        diaSemana: new Date(backup.fecha).toLocaleDateString("es-AR", { weekday: "long" }),
        ticketsEmitidos: backup.resumen?.totalTicketsEmitidos || 0,
        ticketsAtendidos: backup.resumen?.totalTicketsAtendidos || 0,
        eficiencia: backup.resumen?.eficienciaDiaria || 0,
        horaPico: backup.resumen?.horaPico || { hora: 0, cantidad: 0 },
      }))

    const resumenGeneral = {
      totalDias,
      totalTicketsHistoricos,
      totalTicketsAtendidos,
      promedioTicketsPorDia,
      promedioAtendidosPorDia,
      eficienciaPromedioGeneral: eficienciaPromedio,
      mejorDia: mejorDia
        ? {
            fecha: mejorDia.fecha,
            ticketsEmitidos: mejorDia.resumen?.totalTicketsEmitidos || 0,
            eficiencia: mejorDia.resumen?.eficienciaDiaria || 0,
          }
        : null,
      peorDia: peorDia
        ? {
            fecha: peorDia.fecha,
            ticketsEmitidos: peorDia.resumen?.totalTicketsEmitidos || 0,
            eficiencia: peorDia.resumen?.eficienciaDiaria || 0,
          }
        : null,
      rangoFechas: {
        desde: backups[backups.length - 1]?.fecha || "N/A",
        hasta: backups[0]?.fecha || "N/A",
      },
    }

    const tendencias = {
      tendenciaGeneral,
      crecimientoSemanal,
      eficienciaPromedio,
      datosPorDiaSemana,
      datosPorMes,
      analisisTemporalGlobal: {
        promedioReciente: Math.round(promedioReciente),
        promedioAntiguo: Math.round(promedioAntiguo),
        diferencia: Math.round(promedioReciente - promedioAntiguo),
      },
    }

    const comparativas = {
      diasMasActivos,
      horasPicoGlobales: Object.entries(horasPicoGlobales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([hora, cantidad]) => ({
          hora: `${hora}:00`,
          cantidad,
          porcentaje: Math.round((cantidad / totalTicketsHistoricos) * 100),
        })),
      clientesMasFrecuentes,
    }

    const datosPorDia = backups.map((backup) => ({
      fecha: backup.fecha,
      diaSemana: new Date(backup.fecha).toLocaleDateString("es-AR", { weekday: "long" }),
      mes: new Date(backup.fecha).toLocaleDateString("es-AR", { month: "long" }),
      ticketsEmitidos: backup.resumen?.totalTicketsEmitidos || 0,
      ticketsAtendidos: backup.resumen?.totalTicketsAtendidos || 0,
      ticketsPendientes: backup.resumen?.ticketsPendientes || 0,
      eficiencia: backup.resumen?.eficienciaDiaria || 0,
      horaPico: backup.resumen?.horaPico || { hora: 0, cantidad: 0 },
      tiempoEsperaReal: backup.resumen?.tiempoPromedioEsperaReal || 0,
      velocidadAtencion: backup.resumen?.velocidadAtencion || 0,
      clientesUnicos: backup.resumen?.clientesUnicos || 0,
      duracionOperaciones: backup.resumen?.duracionOperaciones || 0,
      // Comparativa con promedio
      vsPromedio: {
        tickets: (backup.resumen?.totalTicketsEmitidos || 0) - promedioTicketsPorDia,
        eficiencia: (backup.resumen?.eficienciaDiaria || 0) - eficienciaPromedio,
      },
    }))

    console.log(`✅ Resumen consolidado generado: ${totalDias} días, ${totalTicketsHistoricos} tickets históricos`)

    return {
      resumenGeneral,
      datosPorDia,
      tendencias,
      comparativas,
    }
  } catch (error) {
    console.error("❌ Error al generar resumen de días anteriores:", error)
    return {
      resumenGeneral: { error: "Error al cargar datos" },
      datosPorDia: [],
      tendencias: { error: "Error al calcular tendencias" },
      comparativas: { error: "Error al generar comparativas" },
    }
  }
}

export async function obtenerResumenDiasAnteriores(): Promise<ResumenHistorico> {
  try {
    const backups = await obtenerTodosLosBackups()

    if (backups.length === 0) {
      return {
        totalDias: 0,
        totalTicketsHistorico: 0,
        promedioTicketsPorDia: 0,
        mejorDia: { fecha: "", tickets: 0 },
        peorDia: { fecha: "", tickets: 0 },
        ultimaActualizacion: new Date().toISOString(),
      }
    }

    const totalTicketsHistorico = backups.reduce((sum, backup) => sum + backup.totalTickets, 0)
    const promedioTicketsPorDia = Math.round(totalTicketsHistorico / backups.length)

    const mejorDia = backups.reduce((mejor, actual) => (actual.totalTickets > mejor.totalTickets ? actual : mejor))

    const peorDia = backups.reduce((peor, actual) => (actual.totalTickets < peor.totalTickets ? actual : peor))

    return {
      totalDias: backups.length,
      totalTicketsHistorico,
      promedioTicketsPorDia,
      mejorDia: {
        fecha: mejorDia.fecha,
        tickets: mejorDia.totalTickets,
      },
      peorDia: {
        fecha: peorDia.fecha,
        tickets: peorDia.totalTickets,
      },
      ultimaActualizacion: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error al obtener resumen de días anteriores:", error)
    throw error
  }
}

// NUEVA FUNCIÓN: Guardar resumen consolidado de días anteriores
export async function guardarResumenHistoricoOld(resumen: any): Promise<void> {
  try {
    console.log("💾 Guardando resumen histórico en TURNOS_ZOCO (Upstash Redis)...")

    const resumenKey = "TURNOS_ZOCO:resumen_historico" // Clave para el resumen histórico

    // OPTIMIZACIÓN: SET con expiración para el resumen.
    await redis.set(resumenKey, resumen, { ex: 60 * 24 * 60 * 60 }) // 60 días de expiración para el resumen

    console.log("✅ Resumen histórico guardado exitosamente en TURNOS_ZOCO (Upstash Redis)")
  } catch (error) {
    console.error("❌ Error al guardar resumen histórico en TURNOS_ZOCO (Upstash Redis):", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

export async function guardarResumenHistorico(resumen: ResumenHistorico): Promise<void> {
  try {
    await redis.set(RESUMEN_HISTORICO_KEY, resumen)
    console.log("Resumen histórico guardado:", resumen)
  } catch (error) {
    console.error("Error al guardar resumen histórico:", error)
    throw error
  }
}

export async function obtenerResumenHistoricoGuardado(): Promise<ResumenHistorico | null> {
  try {
    const resumen = await redis.get(RESUMEN_HISTORICO_KEY)
    return resumen as ResumenHistorico | null
  } catch (error) {
    console.error("Error al obtener resumen histórico guardado:", error)
    throw error
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

export async function obtenerEstadisticas(estado: EstadoSistemaOld & { tickets: TicketInfo[] }) {
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

export async function obtenerEstadoSistema(): Promise<EstadoSistema> {
  try {
    const estado = await redis.get(ESTADO_KEY)
    if (!estado) {
      const estadoInicial: EstadoSistema = {
        ticketActual: 1,
        totalTickets: 0,
        fechaInicio: new Date().toISOString(),
        activo: true,
      }
      await redis.set(ESTADO_KEY, estadoInicial)
      return estadoInicial
    }
    return estado as EstadoSistema
  } catch (error) {
    console.error("Error al obtener estado del sistema:", error)
    throw error
  }
}

export async function actualizarEstadoSistema(estado: EstadoSistema): Promise<void> {
  try {
    await redis.set(ESTADO_KEY, estado)
  } catch (error) {
    console.error("Error al actualizar estado del sistema:", error)
    throw error
  }
}

export async function cerrarConexiones(): Promise<void> {
  console.log("🔌 No es necesario cerrar conexiones para TURNOS_ZOCO (Upstash Redis - HTTP)")
}

// Nueva función para recuperar datos en caso de pérdida - MEJORADA CON VALIDACIÓN
export async function recuperarDatosPerdidos(fecha: string): Promise<EstadoSistemaOld & { tickets: TicketInfo[] }> {
  try {
    console.log("🔧 Intentando recuperar datos perdidos para:", fecha)

    const estadoKey = STATE_KEY_PREFIX + fecha
    const ticketsListKey = TICKETS_LIST_KEY_PREFIX + fecha
    const counterKey = COUNTER_KEY_PREFIX + fecha
    const backupKey = `${estadoKey}:backup`

    // Intentar recuperar desde backup con validación mejorada
    const pipeline = redis.pipeline()
    pipeline.get(backupKey)
    pipeline.lrange(ticketsListKey, 0, -1)
    pipeline.get(counterKey)

    const [estadoBackupRaw, ticketsOriginalesRaw, contadorRaw] = await pipeline.exec()

    // Parsear y validar datos de forma segura
    const estadoBackupParsed = safeJsonParse(estadoBackupRaw, null)
    const estadoBackup = validateEstadoSistema(estadoBackupParsed)

    const ticketsOriginalesParsed = safeJsonParse(ticketsOriginalesRaw, [])
    const ticketsOriginales = validateTickets(ticketsOriginalesParsed)

    const contador = typeof contadorRaw === "number" ? contadorRaw : 0

    console.log(
      `🔍 Datos de recuperación: Estado backup: ${!!estadoBackup}, Tickets: ${ticketsOriginales.length}, Contador: ${contador}`,
    )

    if (estadoBackup) {
      console.log("✅ Datos recuperados desde backup validado")

      // Restaurar datos principales desde backup con validación
      await redis.set(estadoKey, estadoBackup, { ex: 48 * 60 * 60 })

      return { ...estadoBackup, tickets: ticketsOriginales }
    }

    // Si no hay backup válido, intentar reconstruir desde tickets individuales
    console.log("🔧 Intentando reconstruir desde tickets individuales...")

    try {
      const ticketKeys = await redis.keys(`${ticketsListKey}:backup:*`)

      if (ticketKeys.length > 0) {
        console.log(`🔍 Encontradas ${ticketKeys.length} claves de tickets individuales`)

        const multi = redis.multi()
        for (const key of ticketKeys) {
          multi.get(key)
        }
        const ticketsIndividualesRaw = await multi.exec()

        const ticketsRecuperados: TicketInfo[] = []

        if (Array.isArray(ticketsIndividualesRaw)) {
          ticketsIndividualesRaw.forEach((ticketRaw) => {
            const ticketParsed = safeJsonParse(ticketRaw, null)
            if (
              ticketParsed &&
              typeof ticketParsed === "object" &&
              typeof ticketParsed.numero === "number" &&
              typeof ticketParsed.nombre === "string"
            ) {
              ticketsRecuperados.push(ticketParsed)
            }
          })
        }

        // Ordenar tickets por número
        ticketsRecuperados.sort((a, b) => a.numero - b.numero)

        if (ticketsRecuperados.length > 0) {
          const ultimoNumero = Math.max(...ticketsRecuperados.map((t) => t.numero))
          const estadoReconstruido: EstadoSistemaOld = {
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

          console.log("✅ Datos reconstruidos exitosamente desde tickets individuales")
          return { ...estadoReconstruido, tickets: ticketsRecuperados }
        }
      }
    } catch (reconstructError) {
      console.error("❌ Error en reconstrucción desde tickets individuales:", reconstructError)
    }

    // Si llegamos aquí, no se pudieron recuperar los datos
    console.log("⚠️ No se pudieron recuperar datos, creando estado inicial limpio")

    const estadoInicial: EstadoSistemaOld = {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: fecha,
      ultimoReinicio: new Date().toISOString(),
      lastSync: Date.now(),
    }

    // Guardar estado inicial
    await redis.set(estadoKey, estadoInicial, { ex: 48 * 60 * 60 })

    console.log("✅ Estado inicial creado para recuperación")
    return { ...estadoInicial, tickets: [] }
  } catch (error) {
    console.error("❌ Error crítico al recuperar datos perdidos:", error)

    // Como último recurso, crear un estado completamente nuevo
    const estadoEmergencia: EstadoSistemaOld = {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: fecha,
      ultimoReinicio: new Date().toISOString(),
      lastSync: Date.now(),
    }

    console.log("🆘 Creando estado de emergencia")
    return { ...estadoEmergencia, tickets: [] }
  }
}
