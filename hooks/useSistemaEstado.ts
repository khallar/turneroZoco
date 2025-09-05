"use client"

import { useState, useEffect, useCallback } from "react"

export interface Ticket {
  numero: number
  nombre?: string
  timestamp: string
}

export interface SistemaEstado {
  numeroActual: number
  proximoNumero: number
  activo: boolean
}

export function useSistemaEstado() {
  const [estado, setEstado] = useState<SistemaEstado>({
    numeroActual: 0,
    proximoNumero: 1,
    activo: false,
  })
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEstado = useCallback(async () => {
    try {
      const response = await fetch("/api/sistema")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setEstado(data.estado)
      setTickets(data.tickets || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching estado:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  const generarTicket = useCallback(
    async (nombre?: string) => {
      try {
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion: "generar_ticket",
            nombre,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        await fetchEstado()
        return data.ticket
      } catch (err) {
        console.error("Error generando ticket:", err)
        setError(err instanceof Error ? err.message : "Error generando ticket")
        throw err
      }
    },
    [fetchEstado],
  )

  const siguienteTicket = useCallback(async () => {
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "siguiente_ticket",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      await fetchEstado()
      return data
    } catch (err) {
      console.error("Error siguiente ticket:", err)
      setError(err instanceof Error ? err.message : "Error siguiente ticket")
      throw err
    }
  }, [fetchEstado])

  const toggleSistema = useCallback(async () => {
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "toggle_sistema",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      await fetchEstado()
      return data
    } catch (err) {
      console.error("Error toggle sistema:", err)
      setError(err instanceof Error ? err.message : "Error toggle sistema")
      throw err
    }
  }, [fetchEstado])

  const reiniciarSistema = useCallback(async () => {
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "reiniciar_sistema",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      await fetchEstado()
      return data
    } catch (err) {
      console.error("Error reiniciar sistema:", err)
      setError(err instanceof Error ? err.message : "Error reiniciar sistema")
      throw err
    }
  }, [fetchEstado])

  useEffect(() => {
    fetchEstado()

    // Actualizar cada 5 segundos
    const interval = setInterval(fetchEstado, 5000)

    return () => clearInterval(interval)
  }, [fetchEstado])

  return {
    estado,
    tickets,
    loading,
    error,
    generarTicket,
    siguienteTicket,
    toggleSistema,
    reiniciarSistema,
    refetch: fetchEstado,
  }
}
