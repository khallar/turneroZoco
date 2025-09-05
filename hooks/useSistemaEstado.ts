"use client"

import { useState, useEffect, useCallback } from "react"
import { cacheManager } from "@/lib/cache-manager"

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

export function useSistemaEstado(pageContext?: string) {
  const [estado, setEstado] = useState<EstadoSistema | null>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Función para cargar estado desde la API con cache inteligente
  const cargarEstado = useCallback(
    async (forzarActualizacion = false, incluirEstadisticas = false) => {
      if (!isClient) return

      try {
        setError(null)

        // Clave de cache específica por contexto de página
        const cacheKey = `sistema_estado_${pageContext || "default"}`
        const cacheKeyStats = `sistema_estadisticas_${pageContext || "default"}`

        // Verificar cache primero (solo si no se fuerza actualización)
        if (!forzarActualizacion) {
          const estadoEnCache = cacheManager.get<EstadoSistema>(cacheKey)
          if (estadoEnCache) {
            console.log("📦 Usando estado desde cache")
            setEstado(estadoEnCache)
            setUltimaSincronizacion(new Date(estadoEnCache.lastSync || Date.now()))
            setLoading(false)

            // Si también necesitamos estadísticas, verificar cache
            if (incluirEstadisticas) {
              const estadisticasEnCache = cacheManager.get<Estadisticas>(cacheKeyStats)
              if (estadisticasEnCache) {
                console.log("📊 Usando estadísticas desde cache")
                setEstadisticas(estadisticasEnCache)
                return
              }
            } else {
              return
            }
          }
        }

        console.log("🌐 Cargando estado desde API...")
        setLoading(true)

        // Cargar estado base
        const response = await fetch("/api/sistema", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }

        const nuevoEstado: EstadoSistema = await response.json()

        // Validar estructura de datos
        if (!nuevoEstado || typeof nuevoEstado !== "object") {
          throw new Error("Respuesta inválida del servidor")
        }

        // Asegurar que tickets sea un array
        if (!Array.isArray(nuevoEstado.tickets)) {
          nuevoEstado.tickets = []
        }

        // Actualizar timestamp de sincronización
        nuevoEstado.lastSync = Date.now()

        setEstado(nuevoEstado)
        setUltimaSincronizacion(new Date())

        // Guardar en cache con TTL de 30 segundos para estado base
        cacheManager.set(cacheKey, nuevoEstado, 30000)

        // Cargar estadísticas si se solicitan
        if (incluirEstadisticas) {
          try {
            const statsResponse = await fetch("/api/sistema", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
              },
              body: JSON.stringify({ action: "OBTENER_ESTADISTICAS" }),
            })

            if (statsResponse.ok) {
              const statsData = await statsResponse.json()
              if (statsData.estadisticas) {
                setEstadisticas(statsData.estadisticas)
                // Cache de estadísticas con TTL de 60 segundos
                cacheManager.set(cacheKeyStats, statsData.estadisticas, 60000)
              }
            }
          } catch (statsError) {
            console.warn("Error al cargar estadísticas:", statsError)
            // No bloquear la carga del estado por error en estadísticas
          }
        }

        console.log("✅ Estado cargado exitosamente")
      } catch (err) {
        console.error("❌ Error al cargar estado:", err)
        setError(err instanceof Error ? err.message : "Error desconocido al cargar datos")
      } finally {
        setLoading(false)
      }
    },
    [isClient, pageContext],
  )

  // Función para actualizar estado
  const actualizarEstado = useCallback(
    async (nuevoEstado: Partial<EstadoSistema>) => {
      if (!isClient || !estado) return

      try {
        setError(null)

        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevoEstado),
        })

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }

        const estadoActualizado: EstadoSistema = await response.json()

        // Validar y limpiar datos
        if (!Array.isArray(estadoActualizado.tickets)) {
          estadoActualizado.tickets = []
        }

        estadoActualizado.lastSync = Date.now()

        setEstado(estadoActualizado)
        setUltimaSincronizacion(new Date())

        // Actualizar cache
        const cacheKey = `sistema_estado_${pageContext || "default"}`
        cacheManager.set(cacheKey, estadoActualizado, 30000)

        console.log("✅ Estado actualizado exitosamente")
      } catch (err) {
        console.error("❌ Error al actualizar estado:", err)
        setError(err instanceof Error ? err.message : "Error al actualizar datos")
        throw err
      }
    },
    [isClient, estado, pageContext],
  )

  // Función para generar ticket
  const generarTicket = useCallback(
    async (nombre: string) => {
      if (!isClient) return null

      try {
        setError(null)

        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "GENERAR_TICKET",
            nombre: nombre.trim(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || `Error HTTP: ${response.status}`)
        }

        const resultado = await response.json()

        // Validar respuesta
        if (!resultado.ticketGenerado) {
          throw new Error("No se recibió información del ticket generado")
        }

        // Actualizar estado local
        if (resultado.numeroActual !== undefined) {
          const estadoActualizado = {
            ...resultado,
            lastSync: Date.now(),
          }

          // Asegurar que tickets sea un array
          if (!Array.isArray(estadoActualizado.tickets)) {
            estadoActualizado.tickets = []
          }

          setEstado(estadoActualizado)
          setUltimaSincronizacion(new Date())

          // Actualizar cache
          const cacheKey = `sistema_estado_${pageContext || "default"}`
          cacheManager.set(cacheKey, estadoActualizado, 30000)
        }

        console.log("🎫 Ticket generado exitosamente:", resultado.ticketGenerado)
        return resultado.ticketGenerado
      } catch (err) {
        console.error("❌ Error al generar ticket:", err)
        setError(err instanceof Error ? err.message : "Error al generar ticket")
        throw err
      }
    },
    [isClient, pageContext],
  )

  // Cargar estado inicial
  useEffect(() => {
    if (isClient) {
      cargarEstado()
    }
  }, [isClient, cargarEstado])

  // Auto-refresh inteligente cada 60 segundos (solo si no hay cache válido)
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      const cacheKey = `sistema_estado_${pageContext || "default"}`
      const tieneCache = cacheManager.has(cacheKey)

      if (!tieneCache) {
        console.log("🔄 Auto-refresh: Cache expirado, recargando...")
        cargarEstado()
      } else {
        console.log("📦 Auto-refresh: Cache válido, omitiendo recarga")
      }
    }, 60000) // 60 segundos

    return () => clearInterval(interval)
  }, [isClient, cargarEstado, pageContext])

  // Obtener estadísticas del cache
  const cacheStats = cacheManager.getStats()

  return {
    estado,
    estadisticas,
    loading,
    error,
    cargarEstado,
    actualizarEstado,
    generarTicket,
    ultimaSincronizacion,
    isClient,
    cacheStats,
  }
}
