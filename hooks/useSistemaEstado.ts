"use client"

import { useState, useEffect, useCallback } from "react"

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

interface SistemaEstadoHook {
  estado: EstadoSistema
  tickets: TicketInfo[]
  loading: boolean
  error: string | null
  generarTicket: (nombre: string) => Promise<TicketInfo | null>
  llamarSiguiente: () => Promise<void>
  reiniciarSistema: () => Promise<void>
  refrescarEstado: () => Promise<void>
}

const estadoInicial: EstadoSistema = {
  numeroActual: 1,
  ultimoNumero: 0,
  totalAtendidos: 0,
  numerosLlamados: 0,
  fechaInicio: new Date().toISOString().split("T")[0],
  ultimoReinicio: new Date().toISOString(),
  lastSync: Date.now(),
}

export function useSistemaEstado(): SistemaEstadoHook {
  const [estado, setEstado] = useState<EstadoSistema>(estadoInicial)
  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refrescarEstado = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/sistema", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setEstado(data.estado)
      setTickets(data.tickets || [])
    } catch (err) {
      console.error("Error al refrescar estado:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  const generarTicket = useCallback(async (nombre: string): Promise<TicketInfo | null> => {
    try {
      setError(null)
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "generar_ticket",
          nombre: nombre.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Actualizar estado local
      if (data.nuevoTicket) {
        setTickets((prev) => [...prev, data.nuevoTicket])
        setEstado((prev) => ({
          ...prev,
          numeroActual: data.nuevoTicket.numero + 1,
          ultimoNumero: data.nuevoTicket.numero,
          totalAtendidos: prev.totalAtendidos + 1,
          lastSync: Date.now(),
        }))
        return data.nuevoTicket
      }

      return null
    } catch (err) {
      console.error("Error al generar ticket:", err)
      setError(err instanceof Error ? err.message : "Error al generar ticket")
      return null
    }
  }, [])

  const llamarSiguiente = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accion: "llamar_siguiente" }),
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Actualizar estado local
      setEstado((prev) => ({
        ...prev,
        numerosLlamados: prev.numerosLlamados + 1,
        lastSync: Date.now(),
      }))
    } catch (err) {
      console.error("Error al llamar siguiente:", err)
      setError(err instanceof Error ? err.message : "Error al llamar siguiente")
    }
  }, [])

  const reiniciarSistema = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accion: "reiniciar_sistema" }),
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Resetear estado local
      setEstado(estadoInicial)
      setTickets([])

      // Refrescar para obtener el estado actualizado
      await refrescarEstado()
    } catch (err) {
      console.error("Error al reiniciar sistema:", err)
      setError(err instanceof Error ? err.message : "Error al reiniciar sistema")
    } finally {
      setLoading(false)
    }
  }, [refrescarEstado])

  // Cargar estado inicial
  useEffect(() => {
    refrescarEstado()
  }, [refrescarEstado])

  // Auto-refresh cada 30 segundos para mantener sincronización
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !error) {
        refrescarEstado()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [loading, error, refrescarEstado])

  return {
    estado,
    tickets,
    loading,
    error,
    generarTicket,
    llamarSiguiente,
    reiniciarSistema,
    refrescarEstado,
  }
}
