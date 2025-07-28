import { NextResponse } from "next/server"
import {
  leerEstadoSistema,
  escribirEstadoSistema,
  generarTicketAtomico,
  crearBackupDiario,
  obtenerEstadisticas,
  verificarConexionDB,
  redis, // Importar la instancia de redis centralizada
} from "@/lib/database"

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
  lastSync?: number
}

// Función para verificar si debe reiniciarse
function debeReiniciarse(estado: EstadoSistema): boolean {
  try {
    const ahora = new Date()
    const fechaActualArgentina = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
    const fechaHoyString = fechaActualArgentina.toISOString().split("T")[0]
    const fechaInicioString = estado.fechaInicio

    const esDiaDiferente = fechaHoyString !== fechaInicioString

    if (esDiaDiferente) {
      console.log(`🔄 Reinicio automático necesario (Upstash Redis): ${fechaHoyString} vs ${fechaInicioString}`)
      return true
    }

    return false
  } catch (error) {
    console.error("❌ Error verificando reinicio (Upstash Redis):", error)
    return false
  }
}

// GET /api/sistema
// Obtiene el estado actual del sistema de turnos y los tickets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("stats") === "true"

    const { tickets, ...estado } = await leerEstadoSistema()

    // Si el estado es nuevo (primer GET del día), lo guardamos
    if (!estado.lastSync) {
      await escribirEstadoSistema(estado)
    }

    let responseData: any = { estado, tickets }

    if (includeStats) {
      const estadisticas = await obtenerEstadisticas({ ...estado, tickets })
      responseData = { ...responseData, estadisticas }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error en GET /api/sistema:", error)
    return NextResponse.json({ error: "Error al obtener el estado del sistema" }, { status: 500 })
  }
}

// POST /api/sistema
// Genera un nuevo ticket
export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()
    if (!nombre) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const nuevoTicket = await generarTicketAtomico(nombre)

    return NextResponse.json({ success: true, ticket: nuevoTicket })
  } catch (error) {
    console.error("Error en POST /api/sistema:", error)
    return NextResponse.json({ error: "Error al generar el ticket" }, { status: 500 })
  }
}

// PUT /api/sistema
// Actualiza el estado del sistema (ej. llamar siguiente número)
export async function PUT(request: Request) {
  try {
    const nuevoEstado = await request.json()
    await escribirEstadoSistema(nuevoEstado)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en PUT /api/sistema:", error)
    return NextResponse.json({ error: "Error al actualizar el estado del sistema" }, { status: 500 })
  }
}

// DELETE /api/sistema
// Reinicia el sistema de turnos y crea un backup
export async function DELETE(request: Request) {
  try {
    // Leer el estado actual y los tickets antes de reiniciar para el backup
    const { tickets, ...estadoActual } = await leerEstadoSistema()

    // Crear backup diario con el estado completo (metadata + tickets)
    await crearBackupDiario({ ...estadoActual, tickets })

    // Reiniciar el contador atómico de tickets para el día actual
    const fechaHoy = estadoActual.fechaInicio // Usar la fecha del estado actual
    const counterKey = `sistemaTurnosZOCO:counter:${fechaHoy}`
    await redis.set(counterKey, 0) // Reiniciar el contador a 0

    // Eliminar la lista de tickets del día actual
    const ticketsListKey = `sistemaTurnosZOCO:tickets:${fechaHoy}`
    await redis.del(ticketsListKey)

    // Reiniciar el estado principal
    const estadoReiniciado = {
      numeroActual: 1,
      ultimoNumero: 0,
      totalAtendidos: 0,
      numerosLlamados: 0,
      fechaInicio: fechaHoy, // Mantener la fecha actual
      ultimoReinicio: new Date().toISOString(),
      lastSync: Date.now(),
    }
    await escribirEstadoSistema(estadoReiniciado)

    return NextResponse.json({ success: true, message: "Sistema reiniciado y backup creado." })
  } catch (error) {
    console.error("Error en DELETE /api/sistema:", error)
    return NextResponse.json({ error: "Error al reiniciar el sistema" }, { status: 500 })
  }
}

// HEAD /api/sistema
// Verifica la conexión a la base de datos
export async function HEAD() {
  try {
    const isConnected = await verificarConexionDB()
    if (isConnected) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 }) // Service Unavailable
    }
  } catch (error) {
    console.error("Error en HEAD /api/sistema:", error)
    return new NextResponse(null, { status: 500 })
  }
}
