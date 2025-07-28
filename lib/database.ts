import { Redis } from "@upstash/redis"

// Validar variables de entorno al inicio
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error("KV_REST_API_URL y KV_REST_API_TOKEN deben estar configuradas para Upstash Redis.")
}

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

// Prefijos de clave para Redis
export const KEY_PREFIX_ESTADO = "sistemaTurnosZOCO:estado"
export const KEY_PREFIX_TICKETS = "sistemaTurnosZOCO:tickets"
export const KEY_PREFIX_ULTIMO_NUMERO_EMITIDO_TEMP = "sistemaTurnosZOCO:ultimoNumeroEmitidoTemp"

export interface TicketInfo {
  numero: number
  nombre: string
  fecha: string // Fecha de emisión del ticket
  timestamp: number // Timestamp de emisión
  calledTimestamp?: number // Timestamp de cuando fue llamado
}

export interface SistemaEstado {
  numeroActual: number // Próximo número a emitir
  ultimoNumero: number // Último número emitido
  totalAtendidos: number // Total de tickets emitidos hoy
  numerosLlamados: number // Total de tickets llamados hoy
  fechaInicio: string // Fecha de inicio de operaciones del día (para reinicio diario)
  tickets: TicketInfo[] // Lista de todos los tickets emitidos hoy
}

export interface EstadisticasSistema {
  ticketsUltimaHora: number
  horaInicioOperaciones: string
  ultimaActividad: string
  promedioTiempoPorTicket: number
}

// Función para obtener la fecha actual en formato YYYY-MM-DD (hora de Argentina)
function getTodayDateArgentina(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }
  return now.toLocaleDateString("en-CA", options) // 'en-CA' para YYYY-MM-DD
}

// Inicializa el estado del sistema si no existe o si es un nuevo día
export async function inicializarEstadoSistema(): Promise<SistemaEstado> {
  const today = getTodayDateArgentina()
  let estado: SistemaEstado | null = null

  try {
    const estadoRaw = await redis.get<string>(KEY_PREFIX_ESTADO)
    if (estadoRaw) {
      estado = JSON.parse(estadoRaw) as SistemaEstado
    }
  } catch (e) {
    console.error("Error al parsear estado inicial de Redis:", e)
    // Si hay un error de parseo, tratamos como si no existiera el estado
    estado = null
  }

  if (!estado || estado.fechaInicio !== today) {
    console.log(`Reiniciando sistema para el día ${today}`)
    const nuevoEstado: SistemaEstado = {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: today,
      tickets: [],
    }
    await redis.set(KEY_PREFIX_ESTADO, JSON.stringify(nuevoEstado))
    await redis.del(KEY_PREFIX_TICKETS) // Limpiar tickets antiguos
    await redis.del(KEY_PREFIX_ULTIMO_NUMERO_EMITIDO_TEMP) // Limpiar contador temporal
    return nuevoEstado
  }

  // Asegurarse de que la lista de tickets esté sincronizada
  const ticketsRaw = await redis.lrange(KEY_PREFIX_TICKETS, 0, -1)
  const parsedTickets: TicketInfo[] = []
  for (const ticketStr of ticketsRaw) {
    try {
      const ticket = JSON.parse(ticketStr) as TicketInfo
      parsedTickets.push(ticket)
    } catch (e) {
      console.error("Error al parsear ticket de Redis:", ticketStr, e)
      // Omitir tickets malformados
    }
  }
  estado.tickets = parsedTickets
  estado.totalAtendidos = parsedTickets.length // Sincronizar totalAtendidos con la longitud real de tickets

  // Sincronizar numerosLlamados si es necesario (ej. si se reinició el servidor y se perdieron llamadas)
  const llamadosCount = parsedTickets.filter((t) => t.calledTimestamp).length
  if (estado.numerosLlamados > llamadosCount) {
    // Si el contador de llamados es mayor que los tickets con calledTimestamp, ajustarlo
    estado.numerosLlamados = llamadosCount
    await redis.set(KEY_PREFIX_ESTADO, JSON.stringify(estado)) // Guardar el estado ajustado
  } else if (estado.numerosLlamados < llamadosCount) {
    // Si hay más tickets llamados de los que el contador indica, actualizar el contador
    estado.numerosLlamados = llamadosCount
    await redis.set(KEY_PREFIX_ESTADO, JSON.stringify(estado)) // Guardar el estado ajustado
  }

  return estado
}

// Guarda el estado actual del sistema
export async function guardarEstadoSistema(estado: SistemaEstado): Promise<void> {
  await redis.set(KEY_PREFIX_ESTADO, JSON.stringify(estado))
}

// Genera un nuevo ticket de forma atómica
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo | null> {
  const today = getTodayDateArgentina()

  // Usar una transacción para asegurar atomicidad
  const result = await redis
    .multi()
    .get(KEY_PREFIX_ESTADO)
    .get(KEY_PREFIX_ULTIMO_NUMERO_EMITIDO_TEMP) // Obtener el último número emitido temporal
    .exec()

  const [estadoRaw, ultimoNumeroEmitidoTempRaw] = result as [string | null, string | null]

  let estado: SistemaEstado
  try {
    estado = estadoRaw ? (JSON.parse(estadoRaw) as SistemaEstado) : await inicializarEstadoSistema()
  } catch (e) {
    console.error("Error al parsear estado en generarTicketAtomico:", e)
    throw new Error("Error interno al obtener el estado del sistema.")
  }

  // Si es un nuevo día, reiniciar el contador temporal
  if (estado.fechaInicio !== today) {
    estado = await inicializarEstadoSistema() // Esto ya reinicia el estado y el temp
  }

  let proximoNumero = estado.numeroActual
  if (ultimoNumeroEmitidoTempRaw) {
    const ultimoNumeroEmitidoTemp = Number.parseInt(ultimoNumeroEmitidoTempRaw, 10)
    if (!isNaN(ultimoNumeroEmitidoTemp) && ultimoNumeroEmitidoTemp >= proximoNumero) {
      proximoNumero = ultimoNumeroEmitidoTemp + 1
    }
  }

  const nuevoTicket: TicketInfo = {
    numero: proximoNumero,
    nombre: nombre,
    fecha: new Date().toISOString(), // Fecha y hora de emisión
    timestamp: Date.now(), // Timestamp numérico
  }

  estado.numeroActual = proximoNumero + 1
  estado.ultimoNumero = proximoNumero
  estado.totalAtendidos = estado.totalAtendidos + 1 // Incrementar total de tickets emitidos

  // Guardar el nuevo estado y el ticket en una transacción
  await redis
    .multi()
    .set(KEY_PREFIX_ESTADO, JSON.stringify(estado))
    .rpush(KEY_PREFIX_TICKETS, JSON.stringify(nuevoTicket)) // Guardar el ticket serializado
    .set(KEY_PREFIX_ULTIMO_NUMERO_EMITIDO_TEMP, proximoNumero) // Actualizar el contador temporal
    .exec()

  return nuevoTicket
}

// Lee el estado actual del sistema, incluyendo la lista de tickets
export async function leerEstadoSistema(): Promise<SistemaEstado> {
  const estadoRaw = await redis.get<string>(KEY_PREFIX_ESTADO)
  const ticketsRaw = await redis.lrange(KEY_PREFIX_TICKETS, 0, -1)

  let estado: SistemaEstado
  try {
    estado = estadoRaw ? (JSON.parse(estadoRaw) as SistemaEstado) : await inicializarEstadoSistema()
  } catch (e) {
    console.error("Error al parsear estado en leerEstadoSistema:", e)
    estado = await inicializarEstadoSistema() // Forzar inicialización si hay error de parseo
  }

  const parsedTickets: TicketInfo[] = []
  for (const ticketStr of ticketsRaw) {
    try {
      const ticket = JSON.parse(ticketStr) as TicketInfo
      parsedTickets.push(ticket)
    } catch (e) {
      console.error("Error al parsear ticket de Redis en leerEstadoSistema:", ticketStr, e)
      // Si un ticket está malformado, lo ignoramos para no romper la aplicación
    }
  }

  // Asegurarse de que los contadores reflejen la realidad de los tickets
  estado.tickets = parsedTickets.sort((a, b) => a.numero - b.numero)
  estado.totalAtendidos = estado.tickets.length
  estado.numerosLlamados = estado.tickets.filter((t) => t.calledTimestamp).length
  estado.ultimoNumero = estado.tickets.length > 0 ? Math.max(...estado.tickets.map((t) => t.numero)) : 0
  estado.numeroActual = estado.ultimoNumero + 1

  // Si la fecha de inicio del estado no coincide con la de hoy, reiniciar
  const today = getTodayDateArgentina()
  if (estado.fechaInicio !== today) {
    console.log("Fecha de inicio desactualizada, reiniciando estado...")
    return await inicializarEstadoSistema()
  }

  return estado
}

// Verifica la integridad de la numeración de tickets
export function verificarIntegridadNumeracion(tickets: TicketInfo[]): { esConsistente: boolean; faltantes: number[] } {
  if (!tickets || tickets.length === 0) {
    return { esConsistente: true, faltantes: [] }
  }

  const numeros = tickets.map((t) => t.numero).sort((a, b) => a - b)
  const faltantes: number[] = []

  for (let i = 0; i < numeros.length; i++) {
    if (i > 0 && numeros[i] !== numeros[i - 1] + 1) {
      for (let j = numeros[i - 1] + 1; j < numeros[i]; j++) {
        faltantes.push(j)
      }
    }
  }

  return { esConsistente: faltantes.length === 0, faltantes }
}

// Marca un ticket como llamado
export async function marcarTicketComoLlamado(numeroTicket: number, fechaInicioOperaciones: string): Promise<void> {
  const estado = await leerEstadoSistema() // Obtener el estado más reciente
  const ticketIndex = estado.tickets.findIndex((t) => t.numero === numeroTicket)

  if (ticketIndex !== -1) {
    const ticket = estado.tickets[ticketIndex]
    if (!ticket.calledTimestamp) {
      // Solo actualizar si no ha sido llamado ya
      ticket.calledTimestamp = Date.now()
      estado.numerosLlamados = estado.numerosLlamados + 1 // Incrementar el contador de llamados

      // Guardar el estado actualizado y la lista de tickets
      await redis
        .multi()
        .set(KEY_PREFIX_ESTADO, JSON.stringify(estado))
        // Actualizar el ticket específico en la lista de Redis
        // Esto es un poco ineficiente para listas grandes, pero Upstash Redis no tiene un "LSET" por valor
        // La forma más robusta es reescribir la lista o usar un HASH para cada ticket
        // Por ahora, reescribimos la lista completa para simplicidad y consistencia
        .del(KEY_PREFIX_TICKETS)
        .rpush(KEY_PREFIX_TICKETS, ...estado.tickets.map((t) => JSON.stringify(t)))
        .exec()
    }
  } else {
    console.warn(`Ticket con número ${numeroTicket} no encontrado para marcar como llamado.`)
  }
}

// Obtiene estadísticas adicionales del sistema
export async function obtenerEstadisticas(): Promise<EstadisticasSistema> {
  const estado = await leerEstadoSistema()
  const now = Date.now()
  const unaHoraAtras = now - 60 * 60 * 1000 // Una hora en milisegundos

  const ticketsUltimaHora = estado.tickets.filter((ticket) => ticket.timestamp >= unaHoraAtras).length

  const horaInicioOperaciones = new Date(estado.fechaInicio).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })

  const ultimaActividadTicket = estado.tickets.reduce((latest: number, ticket) => {
    return Math.max(latest, ticket.timestamp, ticket.calledTimestamp || 0)
  }, 0)

  const ultimaActividad = ultimaActividadTicket > 0 ? new Date(ultimaActividadTicket).toISOString() : "Sin actividad"

  // Calcular promedio de tiempo por ticket (solo para tickets que ya fueron llamados)
  const ticketsCompletados = estado.tickets.filter((t) => t.calledTimestamp)
  let promedioTiempoPorTicket = 0
  if (ticketsCompletados.length > 0) {
    const totalTiempo = ticketsCompletados.reduce((sum, ticket) => {
      if (ticket.timestamp && ticket.calledTimestamp) {
        return sum + (ticket.calledTimestamp - ticket.timestamp)
      }
      return sum
    }, 0)
    promedioTiempoPorTicket = totalTiempo / ticketsCompletados.length / (1000 * 60) // Convertir a minutos
  }

  return {
    ticketsUltimaHora,
    horaInicioOperaciones,
    ultimaActividad,
    promedioTiempoPorTicket,
  }
}

export async function obtenerBackups(): Promise<any[]> {
  try {
    const keys = await redis.keys("backup:*")
    const backups = []

    for (const key of keys) {
      const fecha = key.split(":")[1] // Extraer la fecha de la clave
      backups.push({ fecha })
    }

    return backups.sort((a, b) => b.fecha.localeCompare(a.fecha)) // Ordenar por fecha descendente
  } catch (error) {
    console.error("Error al obtener backups:", error)
    return []
  }
}

export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    const key = `backup:${fecha}`
    const backupRaw = await redis.get<string>(key)

    if (backupRaw) {
      const backup = JSON.parse(backupRaw)
      return backup
    } else {
      return null
    }
  } catch (error) {
    console.error(`Error al obtener backup para la fecha ${fecha}:`, error)
    return null
  }
}

export async function limpiarDatosAntiguos(): Promise<void> {
  const treintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 días en milisegundos

  try {
    const keys = await redis.keys("backup:*")

    for (const key of keys) {
      const fechaStr = key.split(":")[1] // Extraer la fecha de la clave
      const fechaBackup = new Date(fechaStr)

      if (!isNaN(fechaBackup.getTime()) && fechaBackup.getTime() < treintaDiasAtras) {
        await redis.del(key)
        console.log(`Backup antiguo eliminado: ${key}`)
      }
    }
  } catch (error) {
    console.error("Error al limpiar backups antiguos:", error)
  }
}

export async function verificarConexionDB(): Promise<boolean> {
  try {
    // Comando simple para verificar la conexión
    await redis.ping()
    return true
  } catch (error) {
    console.error("Error al verificar la conexión a la base de datos:", error)
    return false
  }
}
