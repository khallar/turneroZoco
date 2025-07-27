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

export function useSistemaEstado() {
  const [estado, setEstado] = useState<EstadoSistema>({
    numeroActual: 1,
    ultimoNumero: 0,
    totalAtendidos: 0,
    numerosLlamados: 0,
    fechaInicio: "",
    ultimoReinicio: "",
    tickets: [],
  })
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)

  const cargarEstado = useCallback(async (withStats = false) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/sistema", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store", // Asegura que siempre se obtengan los datos más recientes
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar el estado del sistema")
      }

      const data: EstadoSistema & { estadisticas?: Estadisticas } = await response.json()
      setEstado(data)
      if (withStats && data.estadisticas) {
        setEstadisticas(data.estadisticas)
      }
      setUltimaSincronizacion(new Date())
    } catch (err) {
      console.error("Error en useSistemaEstado (cargarEstado):", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const guardarEstado = useCallback(async (nuevoEstado: EstadoSistema) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "ACTUALIZAR_ESTADO", ...nuevoEstado }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar el estado del sistema")
      }

      const data: EstadoSistema = await response.json()
      setEstado(data)
      setUltimaSincronizacion(new Date())
    } catch (err) {
      console.error("Error en useSistemaEstado (guardarEstado):", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const generarTicket = useCallback(async (nombre: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "GENERAR_TICKET", nombre }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al generar ticket")
      }

      const data: EstadoSistema & { ticketGenerado: TicketInfo } = await response.json()
      setEstado(data)
      setUltimaSincronizacion(new Date())
      return data.ticketGenerado
    } catch (err) {
      console.error("Error en useSistemaEstado (generarTicket):", err)
      setError(err instanceof Error ? err.message : String(err))
      throw err // Re-throw para que el componente que llama pueda manejarlo
    } finally {
      setLoading(false)
    }
  }, [])

  const eliminarTodosRegistros = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "ELIMINAR_TODOS_REGISTROS" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar registros")
      }

      const data: EstadoSistema = await response.json()
      setEstado(data)
      setEstadisticas(null) // Limpiar estadísticas también
      setUltimaSincronizacion(new Date())
    } catch (err) {
      console.error("Error en useSistemaEstado (eliminarTodosRegistros):", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const reiniciarContadorDiario = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "REINICIAR_CONTADOR_DIARIO" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al reiniciar contador")
      }

      const data: EstadoSistema = await response.json()
      setEstado(data)
      setEstadisticas(null) // Limpiar estadísticas también
      setUltimaSincronizacion(new Date())
    } catch (err) {
      console.error("Error en useSistemaEstado (reiniciarContadorDiario):", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const limpiarDatosAntiguos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "LIMPIAR_DATOS_ANTIGUOS" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al limpiar datos antiguos")
      }

      // No se espera un estado de retorno, solo un mensaje de éxito
      setUltimaSincronizacion(new Date())
      console.log("Datos antiguos limpiados exitosamente.")
    } catch (err) {
      console.error("Error en useSistemaEstado (limpiarDatosAntiguos):", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarEstado(true)
  }, [cargarEstado])

  return {
    estado,
    estadisticas,
    loading,
    error,
    guardarEstado,
    cargarEstado,
    generarTicket,
    eliminarTodosRegistros,
    reiniciarContadorDiario,
    limpiarDatosAntiguos,
    ultimaSincronizacion,
  }
}
