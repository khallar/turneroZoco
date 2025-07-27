"use client"

import { useState, useEffect, useCallback } from "react"

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

interface Estadisticas {
  totalTicketsHoy: number
  ticketsAtendidos: number
  ticketsPendientes: number
  promedioTiempoPorTicket: number
  horaInicioOperaciones: string
  ultimaActividad: string
  ticketsUltimaHora: number
}

// Estado inicial
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

// Clave para localStorage
const STORAGE_KEY = "sistemaAtencion:v2"

export function useSistemaEstado() {
  const [estado, setEstado] = useState<EstadoSistema>(estadoInicial)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Verificar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Función para cargar desde localStorage
  const cargarDesdeLocalStorage = useCallback(() => {
    if (!isClient) return estadoInicial

    try {
      const estadoLocal = localStorage.getItem(STORAGE_KEY)
      if (estadoLocal) {
        const data = JSON.parse(estadoLocal)

        // Migrar datos antiguos si no tienen campos requeridos
        if (!data.tickets) data.tickets = []
        if (!data.ultimoReinicio) data.ultimoReinicio = new Date().toISOString()
        if (!data.lastSync) data.lastSync = Date.now()

        console.log("📱 Estado cargado desde localStorage:", {
          numeroActual: data.numeroActual,
          totalAtendidos: data.totalAtendidos,
          totalTickets: data.tickets?.length || 0,
        })

        return data
      }
    } catch (error) {
      console.error("❌ Error al cargar desde localStorage:", error)
    }

    return estadoInicial
  }, [isClient])

  // Función para guardar en localStorage
  const guardarEnLocalStorage = useCallback(
    (nuevoEstado: EstadoSistema) => {
      if (!isClient) return

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoEstado))
        console.log("💾 Estado guardado en localStorage")
      } catch (error) {
        console.error("❌ Error al guardar en localStorage:", error)
      }
    },
    [isClient],
  )

  // Función para obtener información de debug
  const cargarDebugInfo = useCallback(async () => {
    if (!isClient) return

    try {
      const response = await fetch("/api/debug", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
      }
    } catch (error) {
      console.error("❌ Error al cargar debug info:", error)
    }
  }, [isClient])

  // Función optimizada para cargar estado (con throttling)
  const cargarEstado = useCallback(
    async (incluirEstadisticas = false, reintentos = 2) => {
      if (!isClient) return

      // Throttling: no hacer requests muy frecuentes
      const ultimaRequest = localStorage.getItem("ultimaRequestAPI")
      const ahora = Date.now()

      if (ultimaRequest && ahora - Number.parseInt(ultimaRequest) < 5000) {
        console.log("🚫 Request throttled, usando localStorage")
        const estadoLocal = cargarDesdeLocalStorage()
        setEstado(estadoLocal)
        setLoading(false)
        return
      }

      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`📥 Cargando estado desde API (intento ${intento}/${reintentos})...`)

          const response = await fetch("/api/sistema", {
            method: "GET",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          })

          if (response.status === 503) {
            console.log("⏳ Sistema ocupado, usando localStorage")
            const estadoLocal = cargarDesdeLocalStorage()
            setEstado(estadoLocal)
            setLoading(false)
            return
          }

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Estado cargado desde servidor")

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())

            // Guardar en localStorage como backup
            guardarEnLocalStorage(data)

            // Marcar timestamp de última request
            localStorage.setItem("ultimaRequestAPI", ahora.toString())

            // Cargar estadísticas si se solicita
            if (incluirEstadisticas) {
              await cargarEstadisticas()
            }

            // Cargar debug info
            await cargarDebugInfo()

            setLoading(false)
            return
          } else {
            const errorData = await response.json()
            throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
          }
        } catch (err) {
          console.error(`❌ Error al cargar estado (intento ${intento}):`, err)

          if (intento === reintentos) {
            // Último intento fallido, usar localStorage
            setError(`Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`)

            const estadoLocal = cargarDesdeLocalStorage()
            setEstado(estadoLocal)
            setLoading(false)
          } else {
            // Esperar antes del siguiente intento
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }
    },
    [isClient, cargarDesdeLocalStorage, guardarEnLocalStorage, cargarDebugInfo],
  )

  // Función optimizada para cargar estadísticas (con throttling)
  const cargarEstadisticas = useCallback(async () => {
    if (!isClient) return

    // Throttling para estadísticas
    const ultimaStatsRequest = localStorage.getItem("ultimaStatsRequest")
    const ahora = Date.now()

    if (ultimaStatsRequest && ahora - Number.parseInt(ultimaStatsRequest) < 30000) {
      console.log("🚫 Stats request throttled")
      return
    }

    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        body: JSON.stringify({
          action: "OBTENER_ESTADISTICAS",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setEstadisticas(data.estadisticas)
        localStorage.setItem("ultimaStatsRequest", ahora.toString())
      }
    } catch (error) {
      console.error("❌ Error al cargar estadísticas:", error)
    }
  }, [isClient])

  // Función optimizada para guardar estado
  const guardarEstado = useCallback(
    async (nuevoEstado: EstadoSistema, reintentos = 2) => {
      if (!isClient) return

      // Guardar inmediatamente en localStorage
      guardarEnLocalStorage(nuevoEstado)
      setEstado(nuevoEstado)

      // Intentar sincronizar con servidor
      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`💾 Sincronizando con servidor (intento ${intento}/${reintentos})`)

          const response = await fetch("/api/sistema", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
            body: JSON.stringify(nuevoEstado),
          })

          if (response.status === 503) {
            console.log("⏳ Sistema ocupado, datos guardados localmente")
            return // Los datos ya están en localStorage
          }

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Estado sincronizado con servidor")

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())
            guardarEnLocalStorage(data)
            return
          } else {
            const errorData = await response.json()
            throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
          }
        } catch (err) {
          console.error(`❌ Error al sincronizar (intento ${intento}):`, err)

          if (intento === reintentos) {
            setError(`Error de sincronización: ${err instanceof Error ? err.message : "Error desconocido"}`)
            // Los datos siguen en localStorage
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }
    },
    [isClient, guardarEnLocalStorage],
  )

  // Función optimizada para generar ticket
  const generarTicket = useCallback(
    async (nombre: string, reintentos = 2) => {
      if (!isClient) return null

      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`🎫 Generando ticket para: ${nombre} (intento ${intento}/${reintentos})`)

          const response = await fetch("/api/sistema", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
            body: JSON.stringify({
              action: "GENERAR_TICKET",
              nombre,
            }),
          })

          if (response.status === 503) {
            console.log("⏳ Sistema ocupado, reintentando...")
            await new Promise((resolve) => setTimeout(resolve, 2000 * intento))
            continue
          }

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Ticket generado exitosamente")

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())
            guardarEnLocalStorage(data)
            await cargarDebugInfo()

            return data.ticketGenerado
          } else {
            const errorData = await response.json()
            throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
          }
        } catch (err) {
          console.error(`❌ Error al generar ticket (intento ${intento}):`, err)

          if (intento === reintentos) {
            setError(`Error al generar ticket: ${err instanceof Error ? err.message : "Error desconocido"}`)
            throw err
          } else {
            await new Promise((resolve) => setTimeout(resolve, 2000 * intento))
          }
        }
      }

      return null
    },
    [isClient, guardarEnLocalStorage, cargarDebugInfo],
  )

  // Función para obtener backups (con throttling)
  const obtenerBackups = useCallback(async () => {
    if (!isClient) return []

    try {
      const response = await fetch("/api/backup?accion=listar", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
      if (response.ok) {
        const data = await response.json()
        return data.backups || []
      }
    } catch (error) {
      console.error("❌ Error al obtener backups:", error)
    }
    return []
  }, [isClient])

  // Función para obtener backup específico
  const obtenerBackup = useCallback(
    async (fecha: string) => {
      if (!isClient) return null

      try {
        const response = await fetch(`/api/backup?fecha=${fecha}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
        if (response.ok) {
          const data = await response.json()
          return data
        }
      } catch (error) {
        console.error("❌ Error al obtener backup:", error)
      }
      return null
    },
    [isClient],
  )

  // Cargar estado inicial
  useEffect(() => {
    if (isClient) {
      // Cargar inmediatamente desde localStorage
      const estadoLocal = cargarDesdeLocalStorage()
      setEstado(estadoLocal)
      setLoading(false)

      // Luego intentar sincronizar con servidor (sin bloquear UI)
      cargarEstado(true).catch((err) => console.error("Error en sincronización inicial:", err))
    }
  }, [isClient, cargarDesdeLocalStorage, cargarEstado])

  // Sincronización periódica muy reducida (solo cada 2 minutos)
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      // Solo sincronizar si no hay error de límite de requests
      if (!error || !error.includes("max requests limit")) {
        cargarEstado(false).catch((err) => console.error("Error en sincronización periódica:", err))
      }
    }, 120000) // 2 minutos

    return () => clearInterval(interval)
  }, [cargarEstado, isClient, error])

  // Verificar integridad de la numeración
  const verificarIntegridad = useCallback(() => {
    if (!isClient || !estado.tickets || estado.tickets.length === 0) return { ok: true }

    const ticketsOrdenados = [...estado.tickets].sort((a, b) => a.numero - b.numero)
    let numeroAnterior = ticketsOrdenados[0].numero
    const saltos = []

    for (let i = 1; i < ticketsOrdenados.length; i++) {
      const numeroActual = ticketsOrdenados[i].numero
      if (numeroActual - numeroAnterior > 1) {
        saltos.push({
          desde: numeroAnterior,
          hasta: numeroActual,
          faltantes: numeroActual - numeroAnterior - 1,
        })
      }
      numeroAnterior = numeroActual
    }

    return {
      ok: saltos.length === 0,
      saltos,
      totalTickets: ticketsOrdenados.length,
      minimo: ticketsOrdenados[0].numero,
      maximo: ticketsOrdenados[ticketsOrdenados.length - 1].numero,
      esperados: ticketsOrdenados[ticketsOrdenados.length - 1].numero - ticketsOrdenados[0].numero + 1,
    }
  }, [estado.tickets, isClient])

  return {
    estado,
    estadisticas,
    loading,
    error,
    ultimaSincronizacion,
    debugInfo,
    guardarEstado,
    cargarEstado,
    generarTicket,
    verificarIntegridad,
    cargarEstadisticas,
    obtenerBackups,
    obtenerBackup,
    isClient,
  }
}
