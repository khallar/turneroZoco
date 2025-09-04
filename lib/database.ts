import { Redis } from "@upstash/redis"

// Configuración de Redis con prioridad correcta de variables de entorno
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

// Interfaces
interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp?: number
}

interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string
  ultimoReinicio?: string
  tickets: TicketInfo[]
  lastSync?: number
}

interface ResumenDiario {
  fecha: string
  totalTickets: number
  ticketsAtendidos: number
  horaInicio: string
  horaFin: string
  promedioTiempoPorTicket: number
  ticketsPorHora: { [hora: string]: number }
  nombresUnicos: string[]
  ultimoNumero: number
}

// Constantes
const REDIS_KEY = "TURNOS_ZOCO"
const BACKUP_KEY_PREFIX = "BACKUP_TURNOS_ZOCO"
const RESUMEN_KEY_PREFIX = "RESUMEN_DIARIO_TURNOS_ZOCO"

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
let redisConfig: { url: string; token: string; name: string }

try {
  redisConfig = getRedisConfig()
} catch (error) {
  console.error("❌ Error al inicializar cliente Upstash Redis:", error)
}

// Prefijos para las claves de Redis - ACTUALIZADOS CON NUEVO NOMBRE
const STATE_KEY_PREFIX = "TURNOS_ZOCO:estado:" // TURNOS_ZOCO:estado:YYYY-MM-DD
const TICKETS_LIST_KEY_PREFIX = "TURNOS_ZOCO:tickets:" // TURNOS_ZOCO:tickets:YYYY-MM-DD
const BACKUP_KEY_PREFIX_OLD = "TURNOS_ZOCO:backup:" // TURNOS_ZOCO:backup:YYYY-MM-DD
const LOGS_KEY = "TURNOS_ZOCO:logs"
const COUNTER_KEY_PREFIX = "TURNOS_ZOCO:counter:" // Para el contador atómico de número de ticket

const ESTADO_KEY = "sistema:estado"
const BACKUP_PREFIX = "backup:diario:"
const RESUMEN_HISTORICO_KEY = "resumen:historico"

// Función auxiliar para retry con backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  operationName = "Operación",
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Intento ${attempt}/${maxRetries} falló (${operationName}):`, error)

      if (attempt === maxRetries) {
        throw lastError
      }

      // Backoff exponencial: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`⏳ Esperando ${delay}ms antes del siguiente intento (${operationName})...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

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
export async function generarTicketAtomicoOld(nombre: string): Promise<TicketInfo> {
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
    const backupKey = BACKUP_KEY_PREFIX_OLD + fecha

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

// Función para obtener el estado actual del sistema
export async function obtenerEstadoSistema(): Promise<EstadoSistema> {
  return retryOperation(async () => {
    console.log("📥 Obteniendo estado del sistema desde Redis...")

    const data = await redis.get(REDIS_KEY)

    if (!data) {
      console.log("🆕 No hay datos existentes, creando estado inicial...")
      const estadoInicial: EstadoSistema = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: new Date().toDateString(),
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await redis.set(REDIS_KEY, estadoInicial)
      console.log("✅ Estado inicial creado y guardado")
      return estadoInicial
    }

    // Validar y limpiar datos si es necesario
    const estado = data as EstadoSistema

    // Asegurar que todos los campos requeridos existan
    const estadoValidado: EstadoSistema = {
      numeroActual: typeof estado.numeroActual === "number" ? estado.numeroActual : 1,
      ultimoNumero: typeof estado.ultimoNumero === "number" ? estado.ultimoNumero : 0,
      totalAtendidos: typeof estado.totalAtendidos === "number" ? estado.totalAtendidos : 0,
      numerosLlamados: typeof estado.numerosLlamados === "number" ? estado.numerosLlamados : 0,
      fechaInicio: typeof estado.fechaInicio === "string" ? estado.fechaInicio : new Date().toDateString(),
      ultimoReinicio: estado.ultimoReinicio || new Date().toISOString(),
      tickets: Array.isArray(estado.tickets) ? estado.tickets : [],
      lastSync: Date.now(),
    }

    console.log("✅ Estado obtenido y validado desde Redis")
    return estadoValidado
  })
}

// Función para guardar el estado del sistema
export async function guardarEstadoSistema(estado: EstadoSistema): Promise<void> {
  return retryOperation(async () => {
    console.log("💾 Guardando estado del sistema en Redis...")

    // Validar estado antes de guardar
    const estadoValidado: EstadoSistema = {
      ...estado,
      lastSync: Date.now(),
      tickets: Array.isArray(estado.tickets) ? estado.tickets : [],
    }

    await redis.set(REDIS_KEY, estadoValidado)
    console.log("✅ Estado guardado exitosamente en Redis")
  })
}

// Función mejorada para generar ticket de forma atómica
export async function generarTicketAtomico(nombre: string): Promise<{
  ticketGenerado: TicketInfo
  estadoActualizado: EstadoSistema
}> {
  return retryOperation(
    async () => {
      console.log(`🎫 Iniciando generación atómica de ticket para: "${nombre}"`)

      // Paso 1: Obtener estado actual
      let estadoActual: EstadoSistema
      try {
        estadoActual = await obtenerEstadoSistema()
        console.log("📊 Estado actual obtenido:", {
          numeroActual: estadoActual.numeroActual,
          ultimoNumero: estadoActual.ultimoNumero,
          totalTickets: estadoActual.tickets.length,
        })
      } catch (error) {
        console.error("❌ Error al obtener estado actual:", error)
        throw new Error("No se pudo obtener el estado actual del sistema")
      }

      // Paso 2: Validar que el nombre no esté vacío
      const nombreLimpio = nombre.trim()
      if (!nombreLimpio) {
        throw new Error("El nombre no puede estar vacío")
      }

      // Paso 3: Crear el nuevo ticket
      const nuevoTicket: TicketInfo = {
        numero: estadoActual.numeroActual,
        nombre: nombreLimpio,
        fecha: new Date().toISOString(),
        timestamp: Date.now(),
      }

      console.log("🎫 Nuevo ticket creado:", nuevoTicket)

      // Paso 4: Preparar el estado actualizado
      const estadoActualizado: EstadoSistema = {
        ...estadoActual,
        numeroActual: estadoActual.numeroActual + 1,
        ultimoNumero: nuevoTicket.numero,
        tickets: [...estadoActual.tickets, nuevoTicket],
        lastSync: Date.now(),
      }

      // Paso 5: Usar transacción Redis para operación atómica
      try {
        console.log("🔄 Iniciando transacción Redis...")

        const multi = redis.multi()
        multi.set(REDIS_KEY, estadoActualizado)

        const results = await multi.exec()
        console.log("📊 Resultados de la transacción:", results)

        // Verificar que la transacción fue exitosa
        if (!results || results.length === 0) {
          throw new Error("La transacción Redis no devolvió resultados")
        }

        // Verificar que todas las operaciones fueron exitosas
        const allSuccessful = results.every((result) => {
          if (Array.isArray(result)) {
            return result[0] === null // null significa éxito en Redis
          }
          return result === "OK"
        })

        if (!allSuccessful) {
          console.error("❌ Algunas operaciones de la transacción fallaron:", results)
          throw new Error("Error en la transacción Redis")
        }

        console.log("✅ Transacción Redis completada exitosamente")
      } catch (error) {
        console.error("❌ Error en la transacción Redis:", error)
        throw new Error(`Error al guardar el ticket: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }

      // Paso 6: Verificar que el ticket se guardó correctamente
      try {
        const estadoVerificacion = await obtenerEstadoSistema()
        const ticketGuardado = estadoVerificacion.tickets.find((t) => t.numero === nuevoTicket.numero)

        if (!ticketGuardado) {
          throw new Error("El ticket no se encontró después de guardarlo")
        }

        console.log("✅ Ticket verificado correctamente en la base de datos")
      } catch (error) {
        console.error("❌ Error al verificar el ticket guardado:", error)
        throw new Error("Error al verificar que el ticket se guardó correctamente")
      }

      console.log(`✅ Ticket generado exitosamente: #${nuevoTicket.numero} para "${nuevoTicket.nombre}"`)

      return {
        ticketGenerado: nuevoTicket,
        estadoActualizado,
      }
    },
    3,
    1000,
  ) // 3 reintentos con 1 segundo de delay base
}

// Función para llamar al siguiente número
export async function llamarSiguienteNumero(): Promise<EstadoSistema> {
  return retryOperation(async () => {
    console.log("📢 Llamando al siguiente número...")

    const estadoActual = await obtenerEstadoSistema()

    if (estadoActual.tickets.length === 0) {
      throw new Error("No hay tickets pendientes para llamar")
    }

    // Encontrar el siguiente ticket no atendido
    const ticketsPendientes = estadoActual.tickets.filter((ticket) => ticket.numero > estadoActual.numerosLlamados)

    if (ticketsPendientes.length === 0) {
      throw new Error("No hay más tickets pendientes para llamar")
    }

    // Ordenar por número y tomar el primero
    const siguienteTicket = ticketsPendientes.sort((a, b) => a.numero - b.numero)[0]

    const estadoActualizado: EstadoSistema = {
      ...estadoActual,
      numerosLlamados: siguienteTicket.numero,
      lastSync: Date.now(),
    }

    await guardarEstadoSistema(estadoActualizado)

    console.log(`✅ Número ${siguienteTicket.numero} llamado exitosamente`)
    return estadoActualizado
  })
}

// Función para marcar un ticket como atendido
export async function marcarComoAtendido(numero: number): Promise<EstadoSistema> {
  return retryOperation(async () => {
    console.log(`✅ Marcando ticket #${numero} como atendido...`)

    const estadoActual = await obtenerEstadoSistema()

    const ticket = estadoActual.tickets.find((t) => t.numero === numero)
    if (!ticket) {
      throw new Error(`Ticket #${numero} no encontrado`)
    }

    const estadoActualizado: EstadoSistema = {
      ...estadoActual,
      totalAtendidos: estadoActual.totalAtendidos + 1,
      lastSync: Date.now(),
    }

    await guardarEstadoSistema(estadoActualizado)

    console.log(`✅ Ticket #${numero} marcado como atendido`)
    return estadoActualizado
  })
}

// Función para reiniciar el sistema
export async function reiniciarSistema(): Promise<EstadoSistema> {
  return retryOperation(async () => {
    console.log("🔄 Reiniciando sistema...")

    // Crear backup antes de reiniciar
    const estadoActual = await obtenerEstadoSistema()
    await crearBackupDiario(estadoActual)

    const estadoReiniciado: EstadoSistema = {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: new Date().toDateString(),
      ultimoReinicio: new Date().toISOString(),
      tickets: [],
      lastSync: Date.now(),
    }

    await guardarEstadoSistema(estadoReiniciado)

    console.log("✅ Sistema reiniciado exitosamente")
    return estadoReiniciado
  })
}

// Función para crear backup diario
export async function crearBackupDiario(estado?: EstadoSistema): Promise<void> {
  return retryOperation(async () => {
    console.log("💾 Creando backup diario...")

    const estadoActual = estado || (await obtenerEstadoSistema())
    const fecha = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const backupKey = `${BACKUP_KEY_PREFIX}:${fecha}`

    const backup = {
      ...estadoActual,
      fechaBackup: new Date().toISOString(),
      version: "5.1",
    }

    await redis.set(backupKey, backup)

    console.log(`✅ Backup diario creado: ${backupKey}`)
  })
}

// Función para obtener lista de backups
export async function obtenerListaBackups(): Promise<string[]> {
  return retryOperation(async () => {
    console.log("📋 Obteniendo lista de backups...")

    const keys = await redis.keys(`${BACKUP_KEY_PREFIX}:*`)
    const fechas = keys.map((key) => key.replace(`${BACKUP_KEY_PREFIX}:`, "")).sort((a, b) => b.localeCompare(a)) // Más recientes primero

    console.log(`✅ ${fechas.length} backups encontrados`)
    return fechas
  })
}

// Función para obtener backup específico
export async function obtenerBackup(fecha: string): Promise<EstadoSistema | null> {
  return retryOperation(async () => {
    console.log(`📥 Obteniendo backup para fecha: ${fecha}`)

    const backupKey = `${BACKUP_KEY_PREFIX}:${fecha}`
    const backup = await redis.get(backupKey)

    if (!backup) {
      console.log(`❌ No se encontró backup para la fecha: ${fecha}`)
      return null
    }

    console.log(`✅ Backup obtenido para fecha: ${fecha}`)
    return backup as EstadoSistema
  })
}

// Función para guardar resumen histórico
export async function guardarResumenHistorico(resumen: ResumenDiario): Promise<void> {
  return retryOperation(async () => {
    console.log(`💾 Guardando resumen histórico para: ${resumen.fecha}`)

    const resumenKey = `${RESUMEN_KEY_PREFIX}:${resumen.fecha}`
    await redis.set(resumenKey, resumen)

    console.log(`✅ Resumen histórico guardado: ${resumenKey}`)
  })
}

// Función para obtener resúmenes históricos
export async function obtenerResumenesHistoricos(): Promise<ResumenDiario[]> {
  return retryOperation(async () => {
    console.log("📋 Obteniendo resúmenes históricos...")

    const keys = await redis.keys(`${RESUMEN_KEY_PREFIX}:*`)
    const resumenes: ResumenDiario[] = []

    for (const key of keys) {
      try {
        const resumen = await redis.get(key)
        if (resumen) {
          resumenes.push(resumen as ResumenDiario)
        }
      } catch (error) {
        console.error(`❌ Error al obtener resumen ${key}:`, error)
      }
    }

    // Ordenar por fecha (más recientes primero)
    resumenes.sort((a, b) => b.fecha.localeCompare(a.fecha))

    console.log(`✅ ${resumenes.length} resúmenes históricos obtenidos`)
    return resumenes
  })
}

// Función para verificar la salud de la conexión
export async function verificarSaludConexion(): Promise<{
  status: "healthy" | "unhealthy"
  latency: number
  error?: string
}> {
  try {
    const start = Date.now()
    await redis.ping()
    const latency = Date.now() - start

    return {
      status: "healthy",
      latency,
    }
  } catch (error) {
    return {
      status: "unhealthy",
      latency: -1,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Función para reparar inconsistencias
export async function repararInconsistencias(): Promise<{
  reparacionesRealizadas: string[]
  estadoReparado: EstadoSistema
}> {
  return retryOperation(async () => {
    console.log("🔧 Iniciando reparación de inconsistencias...")

    const estado = await obtenerEstadoSistema()
    const reparaciones: string[] = []
    const estadoReparado = { ...estado }

    // Reparación 1: Verificar totalAtendidos vs tickets.length
    const ticketsReales = estadoReparado.tickets.length
    if (estadoReparado.totalAtendidos !== ticketsReales) {
      estadoReparado.totalAtendidos = ticketsReales
      reparaciones.push(`totalAtendidos corregido: ${estado.totalAtendidos} → ${ticketsReales}`)
    }

    // Reparación 2: Verificar ultimoNumero
    if (estadoReparado.tickets.length > 0) {
      const ultimoTicket = Math.max(...estadoReparado.tickets.map((t) => t.numero))
      if (estadoReparado.ultimoNumero !== ultimoTicket) {
        estadoReparado.ultimoNumero = ultimoTicket
        reparaciones.push(`ultimoNumero corregido: ${estado.ultimoNumero} → ${ultimoTicket}`)
      }

      // Reparación 3: Verificar numeroActual
      const siguienteNumero = ultimoTicket + 1
      if (estadoReparado.numeroActual !== siguienteNumero) {
        estadoReparado.numeroActual = siguienteNumero
        reparaciones.push(`numeroActual corregido: ${estado.numeroActual} → ${siguienteNumero}`)
      }
    }

    // Reparación 4: Verificar numerosLlamados
    if (estadoReparado.numerosLlamados > estadoReparado.ultimoNumero) {
      estadoReparado.numerosLlamados = estadoReparado.ultimoNumero
      reparaciones.push(`numerosLlamados corregido: ${estado.numerosLlamados} → ${estadoReparado.ultimoNumero}`)
    }

    // Reparación 5: Limpiar tickets duplicados
    const ticketsUnicos = estadoReparado.tickets.filter(
      (ticket, index, array) => array.findIndex((t) => t.numero === ticket.numero) === index,
    )

    if (ticketsUnicos.length !== estadoReparado.tickets.length) {
      estadoReparado.tickets = ticketsUnicos
      reparaciones.push(`Tickets duplicados eliminados: ${estadoReparado.tickets.length} → ${ticketsUnicos.length}`)
    }

    // Guardar estado reparado si hay cambios
    if (reparaciones.length > 0) {
      estadoReparado.lastSync = Date.now()
      await guardarEstadoSistema(estadoReparado)
      console.log(`✅ ${reparaciones.length} reparaciones realizadas`)
    } else {
      console.log("✅ No se encontraron inconsistencias")
    }

    return {
      reparacionesRealizadas: reparaciones,
      estadoReparado,
    }
  })
}

// Función para calcular métricas avanzadas para el backup
function calcularMetricasParaBackup(estado: EstadoSistemaOld & { tickets: TicketInfo[] }): any {
  // Implementación de calcularMetricasParaBackup aquí
  return {
    tiempoEsperaReal: 0,
    horaPico: "",
    distribucionPorHora: {},
    velocidadAtencion: 0,
    tiempoEntreTickets: 0,
    proyeccionCumplida: false,
    nombresUnicos: [],
    clientesRecurrentes: 0,
    promedioCaracteresPorNombre: 0,
    horasPico: [],
    horasMinimas: [],
    duracionOperaciones: 0,
    eficienciaOperativa: 0,
  }
}
