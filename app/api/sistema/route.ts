import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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
}

// Estado inicial
const estadoInicial: EstadoSistema = {
  numeroActual: 1,
  ultimoNumero: 0,
  totalAtendidos: 0,
  numerosLlamados: 0,
  fechaInicio: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }), // YYYY-MM-DD
  ultimoReinicio: new Date().toISOString(),
  tickets: [],
}

// Rutas de archivos
const DATA_DIR = path.join(process.cwd(), "data")
const ESTADO_FILE = path.join(DATA_DIR, "estado.json")
const CONTADOR_FILE = path.join(DATA_DIR, "contador.json")
const BACKUP_DIR = path.join(DATA_DIR, "backups")

// Asegurar que los directorios existan
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creando directorios:", error)
  }
}

// Función para leer datos del archivo
async function leerDatos(): Promise<EstadoSistema> {
  try {
    console.log("Leyendo datos del archivo...")
    await ensureDirectories()

    try {
      const data = await fs.readFile(ESTADO_FILE, "utf8")
      const estado = JSON.parse(data) as EstadoSistema

      console.log("Estado encontrado en archivo:", {
        numeroActual: estado.numeroActual,
        totalTickets: estado.tickets?.length || 0,
      })

      // Validar estructura de datos
      if (!estado.tickets) estado.tickets = []
      if (!estado.ultimoReinicio) estado.ultimoReinicio = new Date().toISOString()

      return estado
    } catch (fileError) {
      console.log("No se encontró archivo de estado, creando estado inicial")
      return { ...estadoInicial }
    }
  } catch (error) {
    console.error("Error al leer datos del archivo:", error)
    return { ...estadoInicial }
  }
}

// Función para escribir datos al archivo
async function escribirDatos(estado: EstadoSistema): Promise<void> {
  try {
    console.log("Escribiendo datos al archivo...", {
      numeroActual: estado.numeroActual,
      totalTickets: estado.tickets?.length || 0,
    })

    await ensureDirectories()
    await fs.writeFile(ESTADO_FILE, JSON.stringify(estado, null, 2), "utf8")

    console.log("Datos guardados exitosamente en archivo")
  } catch (error) {
    console.error("Error al escribir datos al archivo:", error)
    throw error
  }
}

// Función para verificar si debe reiniciarse
function debeReiniciarse(estado: EstadoSistema): boolean {
  // Obtener fecha actual en Argentina
  const ahora = new Date()
  const fechaActualArgentina = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))

  // Obtener solo la fecha (sin hora) como string para comparar
  const fechaHoyString = fechaActualArgentina.toISOString().split("T")[0] // YYYY-MM-DD

  // Comparar con la fecha de inicio del estado
  const fechaInicioString = estado.fechaInicio

  // Si las fechas son diferentes, necesita reiniciarse
  const esDiaDiferente = fechaHoyString !== fechaInicioString

  if (esDiaDiferente) {
    console.log(`Reinicio automático: fecha actual ${fechaHoyString} vs fecha inicio ${fechaInicioString}`)
    return true
  }

  return false
}

// Función para crear backup diario
async function crearBackupDiario(estado: EstadoSistema): Promise<void> {
  try {
    const fecha = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const backupFile = path.join(BACKUP_DIR, `backup-${fecha}.json`)

    // Guardar backup con estadísticas del día
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

    await ensureDirectories()
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2), "utf8")

    console.log(`Backup diario creado: ${backupFile}`)
  } catch (error) {
    console.error("Error al crear backup diario:", error)
  }
}

// Función para generar número de forma atómica
async function generarNumeroAtomico(): Promise<number> {
  try {
    await ensureDirectories()

    let contador = 1
    try {
      const data = await fs.readFile(CONTADOR_FILE, "utf8")
      contador = JSON.parse(data).contador || 1
    } catch (error) {
      // Archivo no existe, usar contador inicial
    }

    // Incrementar contador
    contador++

    // Guardar nuevo contador
    await fs.writeFile(CONTADOR_FILE, JSON.stringify({ contador }, null, 2), "utf8")

    console.log("Número generado atómicamente:", contador)
    return contador
  } catch (error) {
    console.error("Error al generar número atómico:", error)
    throw error
  }
}

// Función para inicializar contador si no existe
async function inicializarContador(numeroActual: number): Promise<void> {
  try {
    await ensureDirectories()

    try {
      await fs.access(CONTADOR_FILE)
      // El archivo existe, no hacer nada
    } catch (error) {
      // El archivo no existe, crearlo
      await fs.writeFile(CONTADOR_FILE, JSON.stringify({ contador: numeroActual - 1 }, null, 2), "utf8")
      console.log("Contador atómico inicializado en:", numeroActual - 1)
    }
  } catch (error) {
    console.error("Error al inicializar contador:", error)
  }
}

export async function GET() {
  try {
    console.log("=== GET /api/sistema ===")

    let estado = await leerDatos()

    // Verificar si debe reiniciarse automáticamente
    if (debeReiniciarse(estado)) {
      console.log("Ejecutando reinicio automático a medianoche")

      // Crear backup del día anterior antes de reiniciar
      await crearBackupDiario(estado)

      // Reiniciar estado
      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }), // YYYY-MM-DD
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
      }

      // Reiniciar contador atómico
      await fs.unlink(CONTADOR_FILE).catch(() => {}) // Eliminar archivo de contador
      await inicializarContador(estado.numeroActual)

      // Guardar estado reiniciado
      await escribirDatos(estado)
    } else {
      // Asegurar que el contador esté sincronizado
      await inicializarContador(estado.numeroActual)
    }

    console.log("Estado devuelto:", {
      numeroActual: estado.numeroActual,
      totalTickets: estado.tickets?.length || 0,
    })

    return NextResponse.json(estado)
  } catch (error) {
    console.error("Error en GET /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== POST /api/sistema ===")

    const body = await request.json()
    const { action, ...nuevoEstado } = body

    console.log("Acción recibida:", action)

    let estado = await leerDatos()

    // Verificar si debe reiniciarse antes de cualquier operación
    if (debeReiniciarse(estado)) {
      console.log("Reinicio automático durante POST - nuevo día detectado")

      // Crear backup del día anterior
      await crearBackupDiario(estado)

      const ahora = new Date()
      estado = {
        numeroActual: 1,
        ultimoNumero: 0,
        totalAtendidos: 0,
        numerosLlamados: 0,
        fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }), // YYYY-MM-DD
        ultimoReinicio: ahora.toISOString(),
        tickets: [],
      }

      // Reiniciar contador atómico
      await fs.unlink(CONTADOR_FILE).catch(() => {})
      await inicializarContador(estado.numeroActual)
    }

    // Acción especial para generar ticket de forma atómica
    if (action === "GENERAR_TICKET") {
      const { nombre } = body

      if (!nombre || typeof nombre !== "string") {
        return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
      }

      console.log("Generando ticket para:", nombre)

      try {
        // Generar número de forma atómica
        const numeroAsignado = await generarNumeroAtomico()
        const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
        const timestamp = Date.now()

        const nuevoTicket: TicketInfo = {
          numero: numeroAsignado,
          nombre: nombre.trim(),
          fecha,
          timestamp,
        }

        console.log("Ticket generado:", nuevoTicket)

        console.log("Estado antes de actualizar:", {
          numeroActual: estado.numeroActual,
          totalAtendidos: estado.totalAtendidos,
          ticketsLength: estado.tickets.length,
        })

        // Actualizar estado
        estado = {
          ...estado,
          numeroActual: numeroAsignado + 1, // El próximo número a asignar
          ultimoNumero: numeroAsignado, // El que acabamos de asignar
          totalAtendidos: estado.totalAtendidos + 1,
          tickets: [...estado.tickets, nuevoTicket],
        }

        console.log("Estado después de actualizar:", {
          numeroActual: estado.numeroActual,
          totalAtendidos: estado.totalAtendidos,
          ticketsLength: estado.tickets.length,
          ultimoTicket: estado.tickets[estado.tickets.length - 1],
        })

        // Guardar inmediatamente en archivo
        await escribirDatos(estado)

        console.log("Estado actualizado y guardado")

        return NextResponse.json({
          ...estado,
          ticketGenerado: nuevoTicket, // Devolver el ticket generado
        })
      } catch (error) {
        console.error("Error al generar ticket atómico:", error)
        return NextResponse.json(
          {
            error: "Error al generar ticket",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción para obtener estadísticas del día
    if (action === "OBTENER_ESTADISTICAS") {
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

      return NextResponse.json({
        ...estado,
        estadisticas,
      })
    }

    // Acción administrativa: Eliminar todos los registros
    if (action === "ELIMINAR_TODOS_REGISTROS") {
      console.log("Eliminando todos los registros...")

      try {
        // Crear backup antes de eliminar
        await crearBackupDiario(estado)

        // Reiniciar completamente el estado
        const ahora = new Date()
        const estadoLimpio: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }), // YYYY-MM-DD
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
        }

        // Limpiar archivos
        await fs.unlink(ESTADO_FILE).catch(() => {})
        await fs.unlink(CONTADOR_FILE).catch(() => {})

        // Guardar estado limpio
        await escribirDatos(estadoLimpio)
        await inicializarContador(estadoLimpio.numeroActual)

        console.log("Todos los registros eliminados exitosamente")

        return NextResponse.json({
          ...estadoLimpio,
          mensaje: "Todos los registros han sido eliminados exitosamente",
        })
      } catch (error) {
        console.error("Error al eliminar registros:", error)
        return NextResponse.json(
          {
            error: "Error al eliminar registros",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Acción administrativa: Reiniciar contador diario
    if (action === "REINICIAR_CONTADOR_DIARIO") {
      console.log("Reiniciando contador diario...")

      try {
        // Crear backup del estado actual
        await crearBackupDiario(estado)

        // Reiniciar solo los contadores, mantener configuración
        const ahora = new Date()
        const estadoReiniciado: EstadoSistema = {
          numeroActual: 1,
          ultimoNumero: 0,
          totalAtendidos: 0,
          numerosLlamados: 0,
          fechaInicio: ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }), // YYYY-MM-DD
          ultimoReinicio: ahora.toISOString(),
          tickets: [],
        }

        // Reiniciar contador atómico
        await fs.unlink(CONTADOR_FILE).catch(() => {})
        await inicializarContador(estadoReiniciado.numeroActual)

        // Guardar estado reiniciado
        await escribirDatos(estadoReiniciado)

        console.log("Contador diario reiniciado exitosamente")

        return NextResponse.json({
          ...estadoReiniciado,
          mensaje: "Contador diario reiniciado exitosamente",
        })
      } catch (error) {
        console.error("Error al reiniciar contador:", error)
        return NextResponse.json(
          {
            error: "Error al reiniciar contador",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          { status: 500 },
        )
      }
    }

    // Validar que los datos sean correctos para actualizaciones normales
    if (
      typeof nuevoEstado.numeroActual !== "number" ||
      typeof nuevoEstado.totalAtendidos !== "number" ||
      typeof nuevoEstado.numerosLlamados !== "number" ||
      !Array.isArray(nuevoEstado.tickets)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    // Actualizar estado global manteniendo las fechas originales del día
    estado = {
      ...nuevoEstado,
      fechaInicio: estado.fechaInicio, // Mantener la fecha original del día
      ultimoReinicio: estado.ultimoReinicio, // Mantener el último reinicio
    }

    // Guardar en archivo
    await escribirDatos(estado)

    return NextResponse.json(estado)
  } catch (error) {
    console.error("Error en POST /api/sistema:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
