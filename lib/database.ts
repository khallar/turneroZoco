import { Redis } from "@upstash/redis"

// Configuración de Redis con fallback a variables de entorno alternativas
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

interface BackupData {
  fecha: string
  estado: EstadoSistema
  timestamp: number
  version: string
}

// Constantes
const REDIS_KEYS = {
  ESTADO: "turnos:estado",
  BACKUP_PREFIX: "turnos:backup:",
  RESUMEN_HISTORICO: "turnos:resumen_historico",
  MUTEX: "turnos:mutex",
} as const

const MUTEX_TTL = 30000 // 30 segundos
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 segundo

// Función para obtener un mutex (lock) para operaciones críticas
async function acquireMutex(key: string, ttl: number = MUTEX_TTL): Promise<boolean> {
  try {
    const result = await redis.set(key, "locked", { px: ttl, nx: true })
    return result === "OK"
  } catch (error) {
    console.error("❌ Error al adquirir mutex:", error)
    return false
  }
}

// Función para liberar un mutex
async function releaseMutex(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error("❌ Error al liberar mutex:", error)
  }
}

// Función para reintentos con backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY,
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Intento ${attempt}/${maxRetries} falló:`, error)

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) // Backoff exponencial
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Función para validar y sanitizar el estado
function validarEstado(estado: any): EstadoSistema {
  const fechaHoy = new Date().toDateString()

  return {
    numeroActual: Math.max(1, Number.parseInt(estado?.numeroActual) || 1),
    ultimoNumero: Math.max(0, Number.parseInt(estado?.ultimoNumero) || 0),
    totalAtendidos: Math.max(0, Number.parseInt(estado?.totalAtendidos) || 0),
    numerosLlamados: Math.max(0, Number.parseInt(estado?.numerosLlamados) || 0),
    fechaInicio: estado?.fechaInicio || fechaHoy,
    ultimoReinicio: estado?.ultimoReinicio || new Date().toISOString(),
    tickets: Array.isArray(estado?.tickets) ? estado.tickets : [],
    lastSync: Date.now(),
  }
}

// Función principal para obtener el estado del sistema
export async function obtenerEstadoSistema(): Promise<EstadoSistema> {
  return retryOperation(async () => {
    console.log("📥 Obteniendo estado del sistema desde Redis...")

    try {
      const estadoRaw = await redis.get(REDIS_KEYS.ESTADO)

      if (!estadoRaw) {
        console.log("📝 No hay estado previo, creando estado inicial...")
        const estadoInicial = crearEstadoInicial()
        await guardarEstadoSistema(estadoInicial)
        return estadoInicial
      }

      const estado = validarEstado(estadoRaw)
      console.log("✅ Estado obtenido correctamente")
      return estado
    } catch (error) {
      console.error("❌ Error al obtener estado:", error)
      throw error
    }
  })
}

// Función para guardar el estado del sistema
export async function guardarEstadoSistema(estado: EstadoSistema): Promise<EstadoSistema> {
  return retryOperation(async () => {
    console.log("💾 Guardando estado del sistema...")

    try {
      const estadoValidado = validarEstado(estado)
      estadoValidado.lastSync = Date.now()

      await redis.set(REDIS_KEYS.ESTADO, JSON.stringify(estadoValidado))
      console.log("✅ Estado guardado correctamente")
      return estadoValidado
    } catch (error) {
      console.error("❌ Error al guardar estado:", error)
      throw error
    }
  })
}

// Función atómica para generar un ticket
export async function generarTicketAtomico(
  nombre: string,
): Promise<{ estado: EstadoSistema; ticketGenerado: TicketInfo }> {
  const mutexKey = REDIS_KEYS.MUTEX + ":generar_ticket"

  return retryOperation(async () => {
    console.log(`🎫 Iniciando generación de ticket para: ${nombre}`)

    // Paso 1: Adquirir mutex
    const mutexAdquirido = await acquireMutex(mutexKey, MUTEX_TTL)
    if (!mutexAdquirido) {
      throw new Error("Sistema ocupado, intente nuevamente")
    }

    try {
      // Paso 2: Obtener estado actual
      console.log("📥 Obteniendo estado actual...")
      const estadoActual = await obtenerEstadoSistema()

      // Paso 3: Crear nuevo ticket
      const nuevoNumero = estadoActual.ultimoNumero + 1
      const nuevoTicket: TicketInfo = {
        numero: nuevoNumero,
        nombre: nombre.trim(),
        fecha: new Date().toDateString(),
        timestamp: Date.now(),
      }

      console.log(`🎫 Creando ticket #${nuevoNumero} para ${nombre}`)

      // Paso 4: Actualizar estado
      const nuevoEstado: EstadoSistema = {
        ...estadoActual,
        ultimoNumero: nuevoNumero,
        tickets: [...estadoActual.tickets, nuevoTicket],
        lastSync: Date.now(),
      }

      // Paso 5: Guardar usando transacción Redis
      console.log("💾 Guardando estado actualizado...")
      const multi = redis.multi()
      multi.set(REDIS_KEYS.ESTADO, JSON.stringify(nuevoEstado))

      const results = await multi.exec()

      // Paso 6: Verificar que la transacción fue exitosa
      if (!results || results.length === 0 || results[0] !== "OK") {
        throw new Error("Error en la transacción de Redis")
      }

      console.log(`✅ Ticket #${nuevoNumero} generado exitosamente`)
      return {
        estado: nuevoEstado,
        ticketGenerado: nuevoTicket,
      }
    } finally {
      // Liberar mutex siempre
      await releaseMutex(mutexKey)
    }
  })
}

// Función para llamar al siguiente número
export async function llamarSiguienteNumero(): Promise<EstadoSistema> {
  const mutexKey = REDIS_KEYS.MUTEX + ":llamar_siguiente"

  return retryOperation(async () => {
    console.log("📢 Llamando siguiente número...")

    const mutexAdquirido = await acquireMutex(mutexKey, MUTEX_TTL)
    if (!mutexAdquirido) {
      throw new Error("Sistema ocupado, intente nuevamente")
    }

    try {
      const estadoActual = await obtenerEstadoSistema()

      const nuevoEstado: EstadoSistema = {
        ...estadoActual,
        numeroActual: estadoActual.numeroActual + 1,
        numerosLlamados: estadoActual.numerosLlamados + 1,
        lastSync: Date.now(),
      }

      return await guardarEstadoSistema(nuevoEstado)
    } finally {
      await releaseMutex(mutexKey)
    }
  })
}

// Función para marcar como atendido
export async function marcarComoAtendido(): Promise<EstadoSistema> {
  const mutexKey = REDIS_KEYS.MUTEX + ":marcar_atendido"

  return retryOperation(async () => {
    console.log("✅ Marcando como atendido...")

    const mutexAdquirido = await acquireMutex(mutexKey, MUTEX_TTL)
    if (!mutexAdquirido) {
      throw new Error("Sistema ocupado, intente nuevamente")
    }

    try {
      const estadoActual = await obtenerEstadoSistema()

      const nuevoEstado: EstadoSistema = {
        ...estadoActual,
        totalAtendidos: estadoActual.totalAtendidos + 1,
        lastSync: Date.now(),
      }

      return await guardarEstadoSistema(nuevoEstado)
    } finally {
      await releaseMutex(mutexKey)
    }
  })
}

// Función para reiniciar el sistema
export async function reiniciarSistema(): Promise<EstadoSistema> {
  const mutexKey = REDIS_KEYS.MUTEX + ":reiniciar"

  return retryOperation(async () => {
    console.log("🔄 Reiniciando sistema...")

    const mutexAdquirido = await acquireMutex(mutexKey, MUTEX_TTL)
    if (!mutexAdquirido) {
      throw new Error("Sistema ocupado, intente nuevamente")
    }

    try {
      // Crear backup antes de reiniciar
      const estadoActual = await obtenerEstadoSistema()
      await crearBackupDiario(estadoActual)

      // Crear nuevo estado inicial
      const estadoInicial = crearEstadoInicial()
      return await guardarEstadoSistema(estadoInicial)
    } finally {
      await releaseMutex(mutexKey)
    }
  })
}

// Función para crear estado inicial
function crearEstadoInicial(): EstadoSistema {
  const fechaHoy = new Date().toDateString()
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

// Función para crear backup diario
export async function crearBackupDiario(estado?: EstadoSistema): Promise<void> {
  return retryOperation(async () => {
    console.log("💾 Creando backup diario...")

    try {
      const estadoActual = estado || (await obtenerEstadoSistema())
      const fechaHoy = new Date().toISOString().split("T")[0] // YYYY-MM-DD

      const backup: BackupData = {
        fecha: fechaHoy,
        estado: estadoActual,
        timestamp: Date.now(),
        version: "1.0",
      }

      const backupKey = REDIS_KEYS.BACKUP_PREFIX + fechaHoy
      await redis.set(backupKey, JSON.stringify(backup))

      console.log(`✅ Backup creado para ${fechaHoy}`)
    } catch (error) {
      console.error("❌ Error al crear backup:", error)
      throw error
    }
  })
}

// Función para obtener lista de backups
export async function obtenerListaBackups(): Promise<string[]> {
  return retryOperation(async () => {
    try {
      const keys = await redis.keys(REDIS_KEYS.BACKUP_PREFIX + "*")
      return keys
        .map((key) => key.replace(REDIS_KEYS.BACKUP_PREFIX, ""))
        .sort()
        .reverse()
    } catch (error) {
      console.error("❌ Error al obtener lista de backups:", error)
      return []
    }
  })
}

// Función para obtener backup específico
export async function obtenerBackup(fecha: string): Promise<BackupData | null> {
  return retryOperation(async () => {
    try {
      const backupKey = REDIS_KEYS.BACKUP_PREFIX + fecha
      const backup = await redis.get(backupKey)
      return backup ? (backup as BackupData) : null
    } catch (error) {
      console.error(`❌ Error al obtener backup ${fecha}:`, error)
      return null
    }
  })
}

// Función para restaurar desde backup
export async function restaurarDesdeBackup(fecha: string): Promise<EstadoSistema> {
  const mutexKey = REDIS_KEYS.MUTEX + ":restaurar"

  return retryOperation(async () => {
    console.log(`🔄 Restaurando desde backup ${fecha}...`)

    const mutexAdquirido = await acquireMutex(mutexKey, MUTEX_TTL)
    if (!mutexAdquirido) {
      throw new Error("Sistema ocupado, intente nuevamente")
    }

    try {
      const backup = await obtenerBackup(fecha)
      if (!backup) {
        throw new Error(`Backup no encontrado para la fecha ${fecha}`)
      }

      const estadoRestaurado = validarEstado(backup.estado)
      estadoRestaurado.lastSync = Date.now()

      return await guardarEstadoSistema(estadoRestaurado)
    } finally {
      await releaseMutex(mutexKey)
    }
  })
}

// Función para verificar salud de la base de datos
export async function verificarSaludDB(): Promise<{
  conectado: boolean
  latencia?: number
  error?: string
  detalles?: any
}> {
  try {
    const inicio = Date.now()

    // Hacer un ping simple
    await redis.ping()

    const latencia = Date.now() - inicio

    // Obtener información adicional
    const info = await redis.info()

    return {
      conectado: true,
      latencia,
      detalles: {
        servidor: "Upstash Redis",
        timestamp: new Date().toISOString(),
        info: typeof info === "string" ? info.split("\n").slice(0, 5).join("\n") : "Info no disponible",
      },
    }
  } catch (error) {
    return {
      conectado: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// Función para reparar inconsistencias
export async function repararInconsistencias(): Promise<{
  reparado: boolean
  cambios: string[]
  estadoFinal: EstadoSistema
}> {
  const mutexKey = REDIS_KEYS.MUTEX + ":reparar"

  return retryOperation(async () => {
    console.log("🔧 Iniciando reparación de inconsistencias...")

    const mutexAdquirido = await acquireMutex(mutexKey, MUTEX_TTL)
    if (!mutexAdquirido) {
      throw new Error("Sistema ocupado, intente nuevamente")
    }

    try {
      const estadoActual = await obtenerEstadoSistema()
      const cambios: string[] = []
      const estadoReparado = { ...estadoActual }

      // Verificar y reparar totalAtendidos vs tickets.length
      const ticketsReales = estadoReparado.tickets.length
      if (estadoReparado.totalAtendidos !== ticketsReales) {
        cambios.push(`totalAtendidos corregido: ${estadoReparado.totalAtendidos} → ${ticketsReales}`)
        estadoReparado.totalAtendidos = ticketsReales
      }

      // Verificar y reparar ultimoNumero
      if (estadoReparado.tickets.length > 0) {
        const maxNumero = Math.max(...estadoReparado.tickets.map((t) => t.numero))
        if (estadoReparado.ultimoNumero !== maxNumero) {
          cambios.push(`ultimoNumero corregido: ${estadoReparado.ultimoNumero} → ${maxNumero}`)
          estadoReparado.ultimoNumero = maxNumero
        }
      }

      // Verificar numeroActual
      if (estadoReparado.numeroActual > estadoReparado.ultimoNumero + 1) {
        const nuevoNumeroActual = estadoReparado.ultimoNumero + 1
        cambios.push(`numeroActual corregido: ${estadoReparado.numeroActual} → ${nuevoNumeroActual}`)
        estadoReparado.numeroActual = nuevoNumeroActual
      }

      // Verificar numerosLlamados
      const numerosLlamadosEsperados = Math.max(0, estadoReparado.numeroActual - 1)
      if (estadoReparado.numerosLlamados !== numerosLlamadosEsperados) {
        cambios.push(`numerosLlamados corregido: ${estadoReparado.numerosLlamados} → ${numerosLlamadosEsperados}`)
        estadoReparado.numerosLlamados = numerosLlamadosEsperados
      }

      // Guardar si hay cambios
      if (cambios.length > 0) {
        estadoReparado.lastSync = Date.now()
        await guardarEstadoSistema(estadoReparado)
        console.log(`✅ Reparación completada: ${cambios.length} cambios realizados`)
      } else {
        console.log("✅ No se encontraron inconsistencias")
      }

      return {
        reparado: cambios.length > 0,
        cambios,
        estadoFinal: estadoReparado,
      }
    } finally {
      await releaseMutex(mutexKey)
    }
  })
}

// Función para guardar resumen histórico
export async function guardarResumenHistorico(resumen: any): Promise<void> {
  return retryOperation(async () => {
    console.log("📊 Guardando resumen histórico...")

    try {
      await redis.set(REDIS_KEYS.RESUMEN_HISTORICO, JSON.stringify(resumen))
      console.log("✅ Resumen histórico guardado")
    } catch (error) {
      console.error("❌ Error al guardar resumen histórico:", error)
      throw error
    }
  })
}

// Función para obtener resumen histórico
export async function obtenerResumenHistorico(): Promise<any> {
  return retryOperation(async () => {
    try {
      const resumen = await redis.get(REDIS_KEYS.RESUMEN_HISTORICO)
      return resumen || null
    } catch (error) {
      console.error("❌ Error al obtener resumen histórico:", error)
      return null
    }
  })
}
