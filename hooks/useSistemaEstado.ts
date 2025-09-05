"use client"

import { useState, useEffect, useCallback } from "react"

export interface Ticket {
  numero: number
  nombre: string
  timestamp: number
  atendido: boolean
  empleado?: string
  tiempoAtencion?: number
}

export interface SistemaEstado {
  ticketActual: number
  tickets: Ticket[]
  empleados: string[]
  ticketLlamando?: number
  ultimoTicketAtendido?: number
}

export function useSistemaEstado() {
  const [estado, setEstado] = useState<SistemaEstado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarEstado = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/sistema")
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setEstado(data)
    } catch (error) {
      console.error("Error al cargar estado:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  const generarTicket = useCallback(
    async (nombre: string) => {
      try {
        setError(null)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "generar_ticket", nombre }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        await cargarEstado()
      } catch (error) {
        console.error("Error al generar ticket:", error)
        setError(error instanceof Error ? error.message : "Error al generar ticket")
      }
    },
    [cargarEstado],
  )

  const llamarSiguiente = useCallback(
    async (empleado: string) => {
      try {
        setError(null)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "llamar_siguiente", empleado }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        await cargarEstado()
      } catch (error) {
        console.error("Error al llamar siguiente:", error)
        setError(error instanceof Error ? error.message : "Error al llamar siguiente")
      }
    },
    [cargarEstado],
  )

  const marcarAtendido = useCallback(
    async (numeroTicket: number, empleado: string) => {
      try {
        setError(null)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "marcar_atendido", numeroTicket, empleado }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        await cargarEstado()
      } catch (error) {
        console.error("Error al marcar atendido:", error)
        setError(error instanceof Error ? error.message : "Error al marcar atendido")
      }
    },
    [cargarEstado],
  )

  const agregarEmpleado = useCallback(
    async (nombre: string) => {
      try {
        setError(null)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "agregar_empleado", nombre }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        await cargarEstado()
      } catch (error) {
        console.error("Error al agregar empleado:", error)
        setError(error instanceof Error ? error.message : "Error al agregar empleado")
      }
    },
    [cargarEstado],
  )

  const eliminarEmpleado = useCallback(
    async (nombre: string) => {
      try {
        setError(null)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "eliminar_empleado", nombre }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        await cargarEstado()
      } catch (error) {
        console.error("Error al eliminar empleado:", error)
        setError(error instanceof Error ? error.message : "Error al eliminar empleado")
      }
    },
    [cargarEstado],
  )

  const reiniciarSistema = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "reiniciar" }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }

      await cargarEstado()
    } catch (error) {
      console.error("Error al reiniciar sistema:", error)
      setError(error instanceof Error ? error.message : "Error al reiniciar sistema")
    }
  }, [cargarEstado])

  useEffect(() => {
    cargarEstado()

    // Actualizar cada 5 segundos
    const interval = setInterval(cargarEstado, 5000)
    return () => clearInterval(interval)
  }, [cargarEstado])

  return {
    estado,
    loading,
    error,
    generarTicket,
    llamarSiguiente,
    marcarAtendido,
    agregarEmpleado,
    eliminarEmpleado,
    reiniciarSistema,
    cargarEstado,
  }
}
