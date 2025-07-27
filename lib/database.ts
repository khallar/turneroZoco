// Configuración de la base de datos SISTEMATURNOSBD
import { Pool } from "pg"

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

// Configuración del pool de conexiones
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Función para ejecutar queries con manejo de errores
async function executeQuery(query: string, params: any[] = []) {
  const client = await pool.connect()
  try {
    const result = await client.query(query, params)
    return result
  } catch (error) {
    console.error("❌ Error en query:", error)
    throw error
  } finally {
    client.release()
  }
}

// Función para leer el estado actual del sistema
export async function leerEstadoSistema(): Promise<EstadoSistema> {
  try {
    console.log("📖 Leyendo estado desde SISTEMATURNOSBD...")

    const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

    // Obtener estado principal
    const estadoQuery = `
      SELECT 
        numero_actual,
        ultimo_numero,
        total_atendidos,
        numeros_llamados,
        fecha_inicio,
        ultimo_reinicio,
        last_sync
      FROM sistema_estado 
      WHERE fecha_inicio = $1
      ORDER BY created_at DESC 
      LIMIT 1
    `

    const estadoResult = await executeQuery(estadoQuery, [fechaHoy])

    let estado: EstadoSistema

    if (estadoResult.rows.length > 0) {
      const row = estadoResult.rows[0]

      // Obtener tickets del día
      const ticketsQuery = `
        SELECT numero, nombre, fecha, timestamp_ticket
        FROM tickets 
        WHERE DATE(fecha_creacion) = $1
        ORDER BY numero ASC
      `

      const ticketsResult = await executeQuery(ticketsQuery, [fechaHoy])

      estado = {
        numeroActual: row.numero_actual,
        ultimoNumero: row.ultimo_numero,
        totalAtendidos: row.total_atendidos,
        numerosLlamados: row.numeros_llamados,
        fechaInicio: row.fecha_inicio,
        ultimoReinicio: row.ultimo_reinicio,
        tickets: ticketsResult.rows.map((ticket) => ({
          numero: ticket.numero,
          nombre: ticket.nombre,
          fecha: ticket.fecha,
          timestamp: ticket.timestamp_ticket,
        })),
        lastSync: row.last_sync,
      }

      console.log("✅ Estado cargado desde SISTEMATURNOSBD:", {
        numeroActual: estado.numeroActual,
        totalAtendidos: estado.totalAtendidos,
        totalTickets: estado.tickets.length,
      })
    } else {
      // Crear estado inicial para el día
      console.log("⚠️ No se encontró estado para hoy, creando inicial...")

      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: fechaHoy,
        ultimoReinicio: new Date().toISOString(),
        tickets: [],
        lastSync: Date.now(),
      }

      await escribirEstadoSistema(estado)
    }

    return estado
  } catch (error) {
    console.error("❌ Error al leer estado del sistema:", error)
    throw error
  }
}

// Función para escribir el estado del sistema
export async function escribirEstadoSistema(estado: EstadoSistema): Promise<void> {
  const client = await pool.connect()

  try {
    console.log("💾 Escribiendo estado a SISTEMATURNOSBD...")

    await client.query("BEGIN")

    const fechaHoy = estado.fechaInicio

    // Actualizar o insertar estado principal
    const upsertEstadoQuery = `
      INSERT INTO sistema_estado (
        numero_actual, ultimo_numero, total_atendidos, numeros_llamados,
        fecha_inicio, ultimo_reinicio, last_sync
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (fecha_inicio) 
      DO UPDATE SET
        numero_actual = EXCLUDED.numero_actual,
        ultimo_numero = EXCLUDED.ultimo_numero,
        total_atendidos = EXCLUDED.total_atendidos,
        numeros_llamados = EXCLUDED.numeros_llamados,
        ultimo_reinicio = EXCLUDED.ultimo_reinicio,
        last_sync = EXCLUDED.last_sync,
        updated_at = NOW()
    `

    await client.query(upsertEstadoQuery, [
      estado.numeroActual,
      estado.ultimoNumero,
      estado.totalAtendidos,
      estado.numerosLlamados,
      estado.fechaInicio,
      estado.ultimoReinicio,
      estado.lastSync || Date.now(),
    ])

    // Sincronizar tickets (insertar solo los nuevos)
    if (estado.tickets && estado.tickets.length > 0) {
      for (const ticket of estado.tickets) {
        const insertTicketQuery = `
          INSERT INTO tickets (numero, nombre, fecha, timestamp_ticket)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (numero, fecha_inicio) DO NOTHING
        `

        await client.query(insertTicketQuery, [ticket.numero, ticket.nombre, ticket.fecha, ticket.timestamp])
      }
    }

    await client.query("COMMIT")

    console.log("✅ Estado guardado exitosamente en SISTEMATURNOSBD")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Error al escribir estado:", error)
    throw error
  } finally {
    client.release()
  }
}

// Función para generar un nuevo ticket de forma atómica
export async function generarTicketAtomico(nombre: string): Promise<TicketInfo> {
  const client = await pool.connect()

  try {
    console.log("🎫 Generando ticket atómico para:", nombre)

    await client.query("BEGIN")

    const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

    // Obtener y actualizar el número actual de forma atómica
    const updateQuery = `
      UPDATE sistema_estado 
      SET 
        numero_actual = numero_actual + 1,
        ultimo_numero = numero_actual,
        total_atendidos = total_atendidos + 1,
        last_sync = $2,
        updated_at = NOW()
      WHERE fecha_inicio = $1
      RETURNING numero_actual - 1 as numero_asignado, numero_actual, ultimo_numero, total_atendidos
    `

    const updateResult = await client.query(updateQuery, [fechaHoy, Date.now()])

    if (updateResult.rows.length === 0) {
      throw new Error("No se pudo actualizar el estado del sistema")
    }

    const { numero_asignado } = updateResult.rows[0]
    const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
    const timestamp = Date.now()

    // Insertar el nuevo ticket
    const insertTicketQuery = `
      INSERT INTO tickets (numero, nombre, fecha, timestamp_ticket)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    await client.query(insertTicketQuery, [numero_asignado, nombre.trim(), fecha, timestamp])

    // Log de la acción
    const logQuery = `
      INSERT INTO sistema_logs (accion, detalles, timestamp_log)
      VALUES ($1, $2, $3)
    `

    await client.query(logQuery, [
      "GENERAR_TICKET",
      JSON.stringify({ numero: numero_asignado, nombre: nombre.trim() }),
      timestamp,
    ])

    await client.query("COMMIT")

    const nuevoTicket: TicketInfo = {
      numero: numero_asignado,
      nombre: nombre.trim(),
      fecha,
      timestamp,
    }

    console.log("✅ Ticket generado exitosamente:", nuevoTicket)

    return nuevoTicket
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Error al generar ticket:", error)
    throw error
  } finally {
    client.release()
  }
}

// Función para crear backup diario
export async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    console.log("📦 Creando backup diario...")

    const fecha = estado.fechaInicio

    const backup = {
      fecha,
      estadoFinal: estado,
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

    const insertBackupQuery = `
      INSERT INTO backups_diarios (fecha_backup, estado_final, resumen, tickets_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (fecha_backup) DO UPDATE SET
        estado_final = EXCLUDED.estado_final,
        resumen = EXCLUDED.resumen,
        tickets_data = EXCLUDED.tickets_data
    `

    await executeQuery(insertBackupQuery, [
      fecha,
      JSON.stringify(backup.estadoFinal),
      JSON.stringify(backup.resumen),
      JSON.stringify(backup.tickets),
    ])

    console.log("✅ Backup diario creado exitosamente")
  } catch (error) {
    console.error("❌ Error al crear backup diario:", error)
    // No lanzar error para no bloquear otras operaciones
  }
}

// Función para obtener backups
export async function obtenerBackups(): Promise<any[]> {
  try {
    const query = `
      SELECT fecha_backup, resumen, created_at
      FROM backups_diarios
      ORDER BY fecha_backup DESC
      LIMIT 30
    `

    const result = await executeQuery(query)

    return result.rows.map((row) => ({
      fecha: row.fecha_backup,
      resumen: row.resumen,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error("❌ Error al obtener backups:", error)
    return []
  }
}

// Función para obtener backup específico
export async function obtenerBackup(fecha: string): Promise<any | null> {
  try {
    const query = `
      SELECT fecha_backup, estado_final, resumen, tickets_data, created_at
      FROM backups_diarios
      WHERE fecha_backup = $1
    `

    const result = await executeQuery(query, [fecha])

    if (result.rows.length > 0) {
      const row = result.rows[0]
      return {
        fecha: row.fecha_backup,
        estadoFinal: row.estado_final,
        resumen: row.resumen,
        tickets: row.tickets_data,
        createdAt: row.created_at,
      }
    }

    return null
  } catch (error) {
    console.error("❌ Error al obtener backup:", error)
    return null
  }
}

// Función para limpiar datos antiguos
export async function limpiarDatosAntiguos(): Promise<void> {
  try {
    console.log("🧹 Limpiando datos antiguos...")

    await executeQuery("SELECT limpiar_datos_antiguos()")

    console.log("✅ Datos antiguos limpiados exitosamente")
  } catch (error) {
    console.error("❌ Error al limpiar datos antiguos:", error)
  }
}

// Función para obtener estadísticas
export async function obtenerEstadisticas(estado: EstadoSistema) {
  try {
    const estadisticas = {
      totalTicketsHoy: estado.totalAtendidos,
      ticketsAtendidos: estado.numerosLlamados,
      ticketsPendientes: estado.totalAtendidos - estado.numerosLlamados,
      promedioTiempoPorTicket:
        estado.tickets.length > 1
          ? (estado.tickets[estado.tickets.length - 1].timestamp - estado.tickets[0].timestamp) /
            estado.tickets.length /
            1000 /
            60
          : 0,
      horaInicioOperaciones: estado.fechaInicio,
      ultimaActividad: estado.tickets[estado.tickets.length - 1]?.fecha || "Sin actividad",
      ticketsUltimaHora: estado.tickets.filter((t) => Date.now() - t.timestamp < 60 * 60 * 1000).length,
    }

    return estadisticas
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error)
    throw error
  }
}

// Función para verificar conexión a la base de datos
export async function verificarConexionDB(): Promise<boolean> {
  try {
    const result = await executeQuery("SELECT NOW() as timestamp, version() as version")
    console.log("✅ Conexión a SISTEMATURNOSBD exitosa:", result.rows[0])
    return true
  } catch (error) {
    console.error("❌ Error de conexión a SISTEMATURNOSBD:", error)
    return false
  }
}

// Cerrar pool de conexiones (para cleanup)
export async function cerrarConexiones(): Promise<void> {
  await pool.end()
  console.log("🔌 Pool de conexiones cerrado")
}
