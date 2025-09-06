"use client"

import { useState, useEffect, useCallback } from "react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

interface SistemaEstado {
  numeroActual: number
  numeroLlamado: number
  cola: TicketInfo[]
  historial: TicketInfo[]
  configuracion: Record<string, any>
}

export function useSistemaEstado() {
  const [estado, setEstado] = useState<SistemaEstado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEstado = useCallback(async () => {
    try {
      const response = await fetch("/api/sistema")
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()

      if (data.success) {
        setEstado(data.estado)
        setError(null)
      } else {
        throw new Error(data.error || "Error desconocido")
      }
    } catch (err) {
      console.error("Error al obtener estado:", err)
      setError(err instanceof Error ? err.message : "Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  const generarTicket = useCallback(
    async (nombre?: string): Promise<TicketInfo | null> => {
      try {
        setLoading(true)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion: "generar_ticket",
            nombre: nombre || "",
          }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.success) {
          await fetchEstado() // Actualizar estado después de generar ticket
          return data.ticket
        } else {
          throw new Error(data.error || "Error al generar ticket")
        }
      } catch (err) {
        console.error("Error al generar ticket:", err)
        setError(err instanceof Error ? err.message : "Error al generar ticket")
        return null
      } finally {
        setLoading(false)
      }
    },
    [fetchEstado],
  )

  const llamarSiguiente = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "llamar_siguiente",
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        await fetchEstado() // Actualizar estado después de llamar siguiente
        return true
      } else {
        throw new Error(data.error || "Error al llamar siguiente")
      }
    } catch (err) {
      console.error("Error al llamar siguiente:", err)
      setError(err instanceof Error ? err.message : "Error al llamar siguiente")
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchEstado])

  const reiniciarSistema = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
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
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        await fetchEstado() // Actualizar estado después de reiniciar
        return true
      } else {
        throw new Error(data.error || "Error al reiniciar sistema")
      }
    } catch (err) {
      console.error("Error al reiniciar sistema:", err)
      setError(err instanceof Error ? err.message : "Error al reiniciar sistema")
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchEstado])

  // Cargar estado inicial
  useEffect(() => {
    fetchEstado()
  }, [fetchEstado])

  // Actualización automática cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchEstado()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [fetchEstado, loading])

  return {
    estado,
    loading,
    error,
    generarTicket,
    llamarSiguiente,
    reiniciarSistema,
    refetch: fetchEstado,
  }
}
