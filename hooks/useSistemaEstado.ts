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
  tickets?: TicketInfo[]
}

export function useSistemaEstado() {
  const [estado, setEstado] = useState<EstadoSistema>({
    numeroActual: 1,
    ultimoNumero: 0,
    totalAtendidos: 0,
    numerosLlamados: 0,
    fechaInicio: new Date().toISOString().split("T")[0],
    ultimoReinicio: new Date().toISOString(),
    tickets: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notificacionAutomatica, setNotificacionAutomatica] = useState<string | null>(null)

  const cargarEstado = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/sistema")

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setEstado(data.estado)

        // 🤖 Mostrar notificación si hubo reinicio automático
        if (data.automaticReset) {
          const mensaje = data.backupCreated
            ? `🤖 Nuevo día detectado!\n📦 Backup automático creado (${data.previousDayTickets} tickets respaldados)\n🔄 Contador reiniciado automáticamente`
            : `🤖 Nuevo día detectado!\n🔄 Contador reiniciado automáticamente`

          setNotificacionAutomatica(mensaje)

          // Auto-ocultar notificación después de 8 segundos
          setTimeout(() => {
            setNotificacionAutomatica(null)
          }, 8000)
        }
      } else {
        throw new Error(data.error || "Error desconocido")
      }
    } catch (error) {
      console.error("Error al cargar estado:", error)
      setError(error instanceof Error ? error.message : "Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  const generarTicket = useCallback(
    async (nombre: string): Promise<TicketInfo | null> => {
      try {
        setError(null)
        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "generar_ticket",
            nombre: nombre.trim() || "Cliente ZOCO",
          }),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.success) {
          // Actualizar estado local
          await cargarEstado()
          return data.ticket
        } else {
          throw new Error(data.error || "Error al generar ticket")
        }
      } catch (error) {
        console.error("Error al generar ticket:", error)
        setError(error instanceof Error ? error.message : "Error al generar ticket")
        return null
      }
    },
    [cargarEstado],
  )

  const llamarSiguiente = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "llamar_siguiente",
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Actualizar estado local
        await cargarEstado()
        return true
      } else {
        // 🤖 Manejar reinicio automático
        if (data.automaticReset) {
          setNotificacionAutomatica(data.message || "Sistema reiniciado automáticamente")
          await cargarEstado()

          // Auto-ocultar notificación después de 6 segundos
          setTimeout(() => {
            setNotificacionAutomatica(null)
          }, 6000)
        }

        throw new Error(data.error || "Error al llamar siguiente")
      }
    } catch (error) {
      console.error("Error al llamar siguiente:", error)
      setError(error instanceof Error ? error.message : "Error al llamar siguiente")
      return false
    }
  }, [cargarEstado])

  const reiniciarContador = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reiniciar",
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Actualizar estado local
        await cargarEstado()
        return true
      } else {
        throw new Error(data.error || "Error al reiniciar contador")
      }
    } catch (error) {
      console.error("Error al reiniciar contador:", error)
      setError(error instanceof Error ? error.message : "Error al reiniciar contador")
      return false
    }
  }, [cargarEstado])

  // Función recargar que acepta parámetros opcionales para compatibilidad con admin
  const recargar = useCallback(
    async (force?: boolean, includeCache?: boolean) => {
      return await cargarEstado()
    },
    [cargarEstado],
  )

  // Cargar estado inicial
  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  // 🤖 Auto-refresh cada 30 segundos para detectar cambios automáticos
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        cargarEstado()
      }
    }, 30000) // Cada 30 segundos

    return () => clearInterval(interval)
  }, [loading, cargarEstado])

  return {
    estado,
    loading,
    error,
    generarTicket,
    llamarSiguiente,
    reiniciarContador,
    recargar,
    notificacionAutomatica, // 🤖 Nueva propiedad para notificaciones automáticas
  }
}
