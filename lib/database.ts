import { Redis } from "@upstash/redis"

// Definir prefijos de clave para evitar colisiones y organizar datos
const KEY_PREFIX_ESTADO = "sistemaTurnosZOCO:estado"
const KEY_PREFIX_TICKETS = "sistemaTurnosZOCO:tickets"

// Interfaz para el estado del sistema
export interface SistemaEstado {
  numeroActual: number // Próximo número a emitir
  ultimoNumero: number // Último número emitido
  totalAtendidos: number // Total de tickets emitidos hoy
  numerosLlamados: number // Cantidad de tickets que ya fueron llamados
  fechaInicio: string // Fecha de inicio de la jornada (para reinicio diario)
  tickets: TicketInfo[] // Lista de todos los tickets emitidos hoy
}

// Interfaz para la información de cada ticket
export interface TicketInfo {
  numero: number
  nombre: string
  fecha: string // Fecha de emisión del ticket
  timestamp: number // Timestamp de emisión (ms)
  calledTimestamp?: number // Timestamp de cuando el ticket fue llamado (opcional)
}

// Inicialización de Redis
// Asegúrate de que estas variables de entorno estén configuradas en Vercel
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Exportar la instancia de Redis y los prefijos para uso centralizado
export { redis, KEY_PREFIX_ESTADO, KEY_PREFIX_TICKETS }

// Función para leer el estado actual del sistema desde Redis
export async function leerEstadoSistema(): Promise<SistemaEstado> {
  try {
    const estadoRaw = await redis.get<SistemaEstado>(KEY_PREFIX_ESTADO)

    // Reiniciar si es un nuevo día o si no hay estado
    const hoy = new Date().toISOString().split("T")[0] // Formato YYYY-MM-DD
    if (!estadoRaw || estadoRaw.fechaInicio !== hoy) {
      console.log("Reiniciando sistema para el nuevo día o estado inicial.")
      const nuevoEstado: SistemaEstado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: hoy,
        tickets: [],
      }
      await guardarEstadoSistema(nuevoEstado)
      return nuevoEstado
    }

    // Asegurarse de que 'tickets' sea un array y parsear si es necesario
    let ticketsParsed: TicketInfo[] = []
    if (estadoRaw.tickets) {
      // Si los tickets se guardaron como strings JSON individuales en una lista,
      // necesitamos leerlos y parsearlos.
      // Asumimos que 'tickets' en estadoRaw ya es un array de TicketInfo o un array de strings JSON.
      // Si es un array de strings, lo parseamos.
      if (Array.isArray(estadoRaw.tickets) && typeof estadoRaw.tickets[0] === "string") {
        ticketsParsed = (estadoRaw.tickets as unknown as string[])
          .map((ticketStr) => {
            try {
              return JSON.parse(ticketStr) as TicketInfo
            } catch (e) {
              console.error("Error parsing ticket string:", ticketStr, e)
              return null // Retorna null para tickets malformados
            }
          })
          .filter(Boolean) as TicketInfo[] // Filtra los nulls
      } else {
        ticketsParsed = estadoRaw.tickets // Ya es un array de TicketInfo
      }
    }

    return { ...estadoRaw, tickets: ticketsParsed }
  } catch (error) {
    console.error("Error al leer el estado del sistema desde Redis:", error)
    // En caso de error, retornar un estado inicial para evitar que la app falle
    const hoy = new Date().toISOString().split("T")[0]
    return {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: hoy,
      tickets: [],
    }
  }
}

// Función para guardar el estado actual del sistema en Redis
export async function guardarEstadoSistema(estado: SistemaEstado): Promise<void> {
  try {
    // Asegurarse de que los tickets se guarden como strings JSON si es necesario
    const ticketsToSave = estado.tickets.map((ticket) => JSON.stringify(ticket))
    await redis.set(KEY_PREFIX_ESTADO, { ...estado, tickets: ticketsToSave })
    console.log("Estado del sistema guardado en Redis.")
  } catch (error) {
    console.error("Error al guardar el estado del sistema en Redis:", error)
    throw new Error("No se pudo guardar el estado del sistema.")
  }
}

// Función para generar un nuevo ticket de forma atómica
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo | null> {
  try {
    // Usar una transacción para asegurar atomicidad
    const result = await redis
      .multi()
      .get(KEY_PREFIX_ESTADO)
      .incr("ultimo_numero_emitido_temp") // Usar una clave temporal para el número
      .exec()

    const [estadoRaw, nuevoNumeroTemp] = result as [SistemaEstado | null, number]

    if (!estadoRaw) {
      console.error("Estado del sistema no encontrado durante la generación atómica de ticket.")
      throw new Error("Estado del sistema no inicializado.")
    }

    // Reiniciar si es un nuevo día
    const hoy = new Date().toISOString().split("T")[0]
    let estadoActual: SistemaEstado
    let nuevoNumero = nuevoNumeroTemp // Usar let para nuevoNumero

    if (estadoRaw.fechaInicio !== hoy) {
      console.log("Reiniciando sistema para el nuevo día durante la generación de ticket.")
      estadoActual = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: hoy,
        tickets: [],
      }
      // Resetear la clave temporal también
      await redis.set("ultimo_numero_emitido_temp", 0)
      nuevoNumero = 1 // El primer número del día
    } else {
      // Asegurarse de que 'tickets' sea un array y parsear si es necesario
      let ticketsParsed: TicketInfo[] = []
      if (estadoRaw.tickets) {
        if (Array.isArray(estadoRaw.tickets) && typeof estadoRaw.tickets[0] === "string") {
          ticketsParsed = (estadoRaw.tickets as unknown as string[])
            .map((ticketStr) => {
              try {
                return JSON.parse(ticketStr) as TicketInfo
              } catch (e) {
                console.error("Error parsing ticket string during atomic generation:", ticketStr, e)
                return null
              }
            })
            .filter(Boolean) as TicketInfo[]
        } else {
          ticketsParsed = estadoRaw.tickets
        }
      }
      estadoActual = { ...estadoRaw, tickets: ticketsParsed }
    }

    const numeroTicket = nuevoNumero
    const fechaActual = new Date()
    const nuevoTicket: TicketInfo = {
      numero: numeroTicket,
      nombre: nombre,
      fecha: fechaActual.toISOString(),
      timestamp: fechaActual.getTime(),
    }

    estadoActual.ultimoNumero = numeroTicket
    estadoActual.totalAtendidos = estadoActual.tickets.length + 1 // Sumar el nuevo ticket
    estadoActual.numeroActual = numeroTicket + 1
    estadoActual.tickets.push(nuevoTicket)

    // Guardar el estado actualizado
    await guardarEstadoSistema(estadoActual)

    return nuevoTicket
  } catch (error) {
    console.error("Error en generarTicketAtomico:", error)
    throw error
  }
}

// Función para marcar un ticket como llamado
export async function marcarTicketComoLlamado(numeroTicket: number, fechaInicioJornada: string): Promise<boolean> {
  try {
    const estadoActual = await leerEstadoSistema()

    // Verificar si la jornada ha cambiado
    const hoy = new Date().toISOString().split("T")[0]
    if (estadoActual.fechaInicio !== hoy || estadoActual.fechaInicio !== fechaInicioJornada) {
      console.warn("Intento de marcar ticket en una jornada diferente o reiniciada. No se marcará.")
      return false
    }

    const ticketIndex = estadoActual.tickets.findIndex((t) => t.numero === numeroTicket)

    if (ticketIndex !== -1) {
      // Actualizar el timestamp de llamado
      estadoActual.tickets[ticketIndex].calledTimestamp = Date.now()
      await guardarEstadoSistema(estadoActual)
      console.log(`Ticket #${numeroTicket} marcado como llamado.`)
      return true
    } else {
      console.warn(`Ticket #${numeroTicket} no encontrado para marcar como llamado.`)
      return false
    }
  } catch (error) {
    console.error(`Error al marcar ticket #${numeroTicket} como llamado:`, error)
    return false
  }
}

// Función para obtener estadísticas del sistema
export async function obtenerEstadisticas(): Promise<any> {
  try {
    const estado = await leerEstadoSistema()
    const ahora = Date.now()
    const inicioOperaciones = new Date(estado.fechaInicio).getTime()

    // Tickets en la última hora
    const unaHoraAtras = ahora - 60 * 60 * 1000
    const ticketsUltimaHora = estado.tickets.filter((t) => t.timestamp > unaHoraAtras).length

    // Tiempo promedio por ticket atendido
    let totalTiempoAtencion = 0
    let ticketsAtendidosConTiempo = 0
    estado.tickets.forEach((ticket) => {
      if (ticket.timestamp && ticket.calledTimestamp) {
        totalTiempoAtencion += ticket.calledTimestamp - ticket.timestamp
        ticketsAtendidosConTiempo++
      }
    })
    const promedioTiempoPorTicket =
      ticketsAtendidosConTiempo > 0 ? totalTiempoAtencion / ticketsAtendidosConTiempo / (1000 * 60) : 0 // en minutos

    // Última actividad (timestamp del último ticket emitido o llamado)
    let ultimaActividad = "Sin actividad"
    if (estado.tickets.length > 0) {
      const lastTicket = estado.tickets[estado.tickets.length - 1]
      ultimaActividad = new Date(lastTicket.calledTimestamp || lastTicket.timestamp).toISOString()
    }

    return {
      ticketsUltimaHora,
      horaInicioOperaciones: new Date(inicioOperaciones).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
      }),
      ultimaActividad,
      promedioTiempoPorTicket,
    }
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)
    return {
      ticketsUltimaHora: 0,
      horaInicioOperaciones: "N/A",
      ultimaActividad: "N/A",
      promedioTiempoPorTicket: 0,
    }
  }
}

// Función para obtener información de debug
export async function obtenerDebugInfo(): Promise<any> {
  try {
    const estado = await leerEstadoSistema()
    const env = process.env

    let dbConnectionStatus = "Desconocido"
    try {
      // Intenta una operación simple para verificar la conexión
      await redis.ping()
      dbConnectionStatus = "Exitosa"
    } catch (e) {
      dbConnectionStatus = `Fallida: ${e instanceof Error ? e.message : String(e)}`
    }

    return {
      environment: {
        NODE_ENV: env.NODE_ENV,
        VERCEL_ENV: env.VERCEL_ENV,
        PLATFORM: env.VERCEL_ENV ? "Vercel" : "Local",
      },
      database: {
        url: env.KV_REST_API_URL ? "Configurado" : "No configurado",
        type: "Upstash Redis",
        name: "sistemaTurnosZOCO",
        connection: dbConnectionStatus,
        estadoActual: estado, // Mostrar el estado completo para debug
      },
    }
  } catch (error) {
    console.error("Error al obtener información de debug:", error)
    return {
      environment: {},
      database: {
        connection: `Error al obtener info: ${error instanceof Error ? error.message : String(error)}`,
      },
    }
  }
}

// Función para obtener backups
export async function obtenerBackups(): Promise<any[]> {
  try {
    const keys = await redis.keys("backup:*")
    const backups = []

    for (const key of keys) {
      const backup = await redis.get(key)
      if (backup) {
        backups.push({
          fecha: key.replace("backup:", ""),
          resumen: backup.resumen,
        })
      }
    }

    backups.sort((a, b) => (b.fecha > a.fecha ? 1 : -1)) // Ordenar por fecha descendente
    return backups
  } catch (error) {
    console.error("Error al obtener backups:", error)
    return []
  }
}

// Función para obtener backup específico
export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    const backup = await redis.get(`backup:${fecha}`)
    return backup || null
  } catch (error) {
    console.error("Error al obtener backup:", error)
    return null
  }
}

// Función para limpiar datos antiguos (más de 30 días)
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    const keys = await redis.keys("backup:*")
    const treintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000

    for (const key of keys) {
      const fechaBackupStr = key.replace("backup:", "")
      const [year, month, day] = fechaBackupStr.split("-").map(Number)
      const fechaBackup = new Date(year, month - 1, day).getTime() // Month is 0-indexed

      if (fechaBackup < treintaDiasAtras) {
        await redis.del(key)
        console.log(`Backup antiguo eliminado: ${key}`)
      }
    }
  } catch (error) {
    console.error("Error al limpiar datos antiguos:", error)
  }
}

// Función para verificar la conexión a la base de datos
export async function verificarConexionDB(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error("Error al verificar la conexión a la base de datos:", error)
    return false
  }
}
