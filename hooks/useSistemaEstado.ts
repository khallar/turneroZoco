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

// Estado inicial para evitar undefined durante SSR
const estadoInicial: EstadoSistema = {
  numeroActual: 1,
  ultimoNumero: 0,
  totalAtendidos: 0,
  numerosLlamados: 0,
  fechaInicio: new Date().toDateString(),
  ultimoReinicio: new Date().toISOString(),
  tickets: [],
}

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

  // Función para obtener información de debug
  const cargarDebugInfo = useCallback(async () => {
    if (!isClient) return

    try {
      const response = await fetch("/api/debug")
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
        console.log("Debug info:", data)
      }
    } catch (error) {
      console.error("Error al cargar debug info:", error)
    }
  }, [isClient])

  // Cargar estado inicial
  const cargarEstado = useCallback(
    async (incluirEstadisticas = false) => {
      // Solo ejecutar en el cliente
      if (!isClient) return

      try {
        console.log("Cargando estado desde API...")

        const response = await fetch("/api/sistema", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Estado cargado:", data)

          setEstado(data)
          setError(null)
          setUltimaSincronizacion(new Date())

          // También guardar en localStorage como backup
          if (typeof window !== "undefined") {
            localStorage.setItem("sistemaAtencion", JSON.stringify(data))
          }

          // Si incluye estadísticas, cargarlas por separado
          if (incluirEstadisticas) {
            await cargarEstadisticas()
          }
        } else {
          const errorData = await response.json()
          console.error("Error en respuesta:", errorData)
          throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
        }
      } catch (err) {
        console.error("Error al cargar estado:", err)
        setError(`Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`)

        // Fallback a localStorage solo si hay error de conexión
        try {
          const estadoLocal = localStorage.getItem("sistemaAtencion")
          if (estadoLocal) {
            const data = JSON.parse(estadoLocal)

            // Migrar datos antiguos si no tienen campos requeridos
            if (!data.tickets) data.tickets = []
            if (!data.ultimoReinicio) data.ultimoReinicio = new Date().toISOString()

            setEstado(data)
            console.log("Usando datos de localStorage como fallback")
          }
        } catch (parseError) {
          console.error("Error al parsear localStorage:", parseError)
          setEstado(estadoInicial)
          if (typeof window !== "undefined") {
            localStorage.setItem("sistemaAtencion", JSON.stringify(estadoInicial))
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [isClient],
  )

  // Cargar estadísticas del día
  const cargarEstadisticas = useCallback(async () => {
    if (!isClient) return

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
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    }
  }, [isClient])

  // Guardar estado
  const guardarEstado = useCallback(
    async (nuevoEstado: EstadoSistema) => {
      // Solo ejecutar en el cliente
      if (!isClient) return

      try {
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

        if (response.ok) {
          const data = await response.json()
          setEstado(data)
          setError(null)
          setUltimaSincronizacion(new Date())

          // También guardar en localStorage como backup
          if (typeof window !== "undefined") {
            localStorage.setItem("sistemaAtencion", JSON.stringify(data))
          }
        } else {
          const errorData = await response.json()
          throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
        }
      } catch (err) {
        console.error("Error al guardar estado:", err)
        setError(`Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`)

        // Fallback a localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("sistemaAtencion", JSON.stringify(nuevoEstado))
        }
        setEstado(nuevoEstado)
      }
    },
    [isClient],
  )

  // Nueva función para generar ticket de forma atómica
  const generarTicket = useCallback(
    async (nombre: string) => {
      // Solo ejecutar en el cliente
      if (!isClient) return null

      try {
        console.log("Generando ticket para:", nombre)

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

        if (response.ok) {
          const data = await response.json()
          console.log("Ticket generado exitosamente:", data.ticketGenerado)

          setEstado(data)
          setError(null)
          setUltimaSincronizacion(new Date())

          // También guardar en localStorage como backup
          if (typeof window !== "undefined") {
            localStorage.setItem("sistemaAtencion", JSON.stringify(data))
          }

          return data.ticketGenerado
        } else {
          const errorData = await response.json()
          console.error("Error en respuesta al generar ticket:", errorData)
          throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
        }
      } catch (err) {
        console.error("Error al generar ticket:", err)
        setError(`Error al generar ticket: ${err instanceof Error ? err.message : "Error desconocido"}`)
        throw err
      }
    },
    [isClient],
  )

  // Función para obtener backups
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
      console.error("Error al obtener backups:", error)
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
        console.error("Error al obtener backup:", error)
      }
      return null
    },
    [isClient],
  )

  // Cargar estado al montar el componente
  useEffect(() => {
    if (isClient) {
      cargarDebugInfo()
      cargarEstado(true)
    }
  }, [cargarEstado, cargarDebugInfo, isClient])

  // Sincronizar cada 30 segundos para asegurar persistencia
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      cargarEstado(false) // Sin estadísticas para ser más rápido
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [cargarEstado, isClient])

  // Cargar estadísticas cada 2 minutos
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(cargarEstadisticas, 120000) // 2 minutos
    return () => clearInterval(interval)
  }, [cargarEstadisticas, isClient])

  // Verificar integridad de la numeración
  const verificarIntegridad = useCallback(() => {
    if (!isClient || !estado.tickets || estado.tickets.length === 0) return { ok: true }

    // Ordenar tickets por número
    const ticketsOrdenados = [...estado.tickets].sort((a, b) => a.numero - b.numero)

    // Verificar que no hay saltos
    let numeroAnterior = ticketsOrdenados[0].numero
    const saltos = []

    for (let i = 1; i < ticketsOrdenados.length; i++) {
      const numeroActual = ticketsOrdenados[i].numero
      if (numeroActual - numeroAnterior > 1) {
        // Hay un salto
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
