"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  ticketsAtendidos: number
  promedioTiempoPorTicket: number
  horasPico: string
  eficiencia: number
}

interface CacheStats {
  totalEntries: number
  entries: Array<{
    key: string
    age: number
    ttl: number
    fresh: boolean
  }>
  subscribers: number
}

export function useSistemaEstado(pagina = "general") {
  const [estado, setEstado] = useState<EstadoSistema>({
    numeroActual: 1,
    ultimoNumero: 0,
    totalAtendidos: 0,
    numerosLlamados: 0,
    fechaInicio: new Date().toLocaleDateString("en-CA"),
    ultimoReinicio: new Date().toISOString(),
    tickets: [],
  })

  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalEntries: 0,
    entries: [],
    subscribers: 0,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cacheSubscriptionRef = useRef<(() => void) | null>(null)

  // Marcar como cliente después del montaje
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Suscribirse a cambios del cache
  useEffect(() => {
    if (!isClient) return

    const updateCacheStats = () => {
      setCacheStats(cacheManager.getStats())
    }

    updateCacheStats()
    cacheSubscriptionRef.current = cacheManager.subscribe(updateCacheStats)

    return () => {
      if (cacheSubscriptionRef.current) {
        cacheSubscriptionRef.current()
      }
    }
  }, [isClient])

  const cargarEstado = useCallback(
    async (forzarActualizacion = false, incluirEstadisticas = false) => {
      if (!isClient) return

      try {
        const cacheKey = `sistema_estado_${pagina}`
        const cacheKeyStats = `sistema_estadisticas_${pagina}`

        // Intentar obtener del cache primero
        if (!forzarActualizacion) {
          const estadoCache = cacheManager.get<EstadoSistema>(cacheKey)
          if (estadoCache) {
            setEstado(estadoCache)
            setUltimaSincronizacion(new Date())
            setLoading(false)
            setError(null)

            if (incluirEstadisticas) {
              const statsCache = cacheManager.get<Estadisticas>(cacheKeyStats)
              if (statsCache) {
                setEstadisticas(statsCache)
              }
            }
            return estadoCache
          }
        }

        console.log(`🔄 Cargando estado desde API (${pagina})...`)
        setError(null)

        const response = await fetch("/api/sistema", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setEstado(data)
        setUltimaSincronizacion(new Date())
        setLoading(false)

        // Guardar en cache con TTL específico por página
        const ttl = pagina === "principal" ? 90 : pagina === "empleados" ? 30 : 60
        cacheManager.set(cacheKey, data, ttl)

        // Cargar estadísticas si se solicita
        if (incluirEstadisticas) {
          try {
            const statsResponse = await fetch("/api/sistema", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "OBTENER_ESTADISTICAS" }),
            })

            if (statsResponse.ok) {
              const statsData = await statsResponse.json()
              if (statsData.estadisticas) {
                setEstadisticas(statsData.estadisticas)
                cacheManager.set(cacheKeyStats, statsData.estadisticas, ttl)
              }
            }
          } catch (statsError) {
            console.warn("Error al cargar estadísticas:", statsError)
          }
        }

        return data
      } catch (error) {
        console.error(`Error al cargar estado (${pagina}):`, error)
        setError(error instanceof Error ? error.message : "Error desconocido")
        setLoading(false)
        return null
      }
    },
    [isClient, pagina],
  )

  const guardarEstado = useCallback(
    async (nuevoEstado: EstadoSistema) => {
      if (!isClient) return false

      try {
        console.log("💾 Guardando estado...")
        setError(null)

        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevoEstado),
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setEstado(data)
        setUltimaSincronizacion(new Date())

        // Invalidar cache para forzar actualización
        cacheManager.invalidate("sistema_estado")

        return true
      } catch (error) {
        console.error("Error al guardar estado:", error)
        setError(error instanceof Error ? error.message : "Error al guardar")
        return false
      }
    },
    [isClient],
  )

  const generarTicket = useCallback(
    async (nombre: string) => {
      if (!isClient) return null

      try {
        console.log("🎫 Generando ticket para:", nombre)
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
          throw new Error(errorData.error || `Error ${response.status}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // Actualizar estado local
        if (data.ticketGenerado) {
          setEstado(data)
          setUltimaSincronizacion(new Date())

          // Invalidar cache para que otras páginas se actualicen
          cacheManager.invalidate("sistema_estado")

          return data.ticketGenerado
        }

        return null
      } catch (error) {
        console.error("Error al generar ticket:", error)
        setError(error instanceof Error ? error.message : "Error al generar ticket")
        throw error
      }
    },
    [isClient],
  )

  const verificarIntegridad = useCallback(() => {
    if (!estado.tickets || estado.tickets.length === 0) {
      return { valido: true, errores: [] }
    }

    const errores: string[] = []
    const numerosVistos = new Set<number>()

    // Verificar duplicados y secuencia
    estado.tickets.forEach((ticket, index) => {
      if (numerosVistos.has(ticket.numero)) {
        errores.push(`Número duplicado: ${ticket.numero}`)
      }
      numerosVistos.add(ticket.numero)

      if (index > 0 && ticket.numero !== estado.tickets[index - 1].numero + 1) {
        errores.push(`Salto en secuencia: ${estado.tickets[index - 1].numero} -> ${ticket.numero}`)
      }
    })

    // Verificar consistencia con contadores
    if (estado.tickets.length !== estado.totalAtendidos) {
      errores.push(`Inconsistencia: ${estado.tickets.length} tickets vs ${estado.totalAtendidos} total`)
    }

    return {
      valido: errores.length === 0,
      errores,
      totalTickets: estado.tickets.length,
      ultimoNumero: estado.tickets[estado.tickets.length - 1]?.numero || 0,
    }
  }, [estado])

  const obtenerBackups = useCallback(async () => {
    if (!isClient) return []

    try {
      const response = await fetch("/api/backup")
      if (response.ok) {
        const data = await response.json()
        return data
      }
      return []
    } catch (error) {
      console.error("Error al obtener backups:", error)
      return []
    }
  }, [isClient])

  const obtenerBackup = useCallback(
    async (fecha: string) => {
      if (!isClient) return null

      try {
        const response = await fetch(`/api/backup?fecha=${fecha}`)
        if (response.ok) {
          const data = await response.json()
          return data
        }
        return null
      } catch (error) {
        console.error("Error al obtener backup:", error)
        return null
      }
    },
    [isClient],
  )

  const invalidateCache = useCallback(() => {
    cacheManager.invalidate("sistema_")
  }, [])

  // Auto-actualización inteligente
  useEffect(() => {
    if (!isClient) return

    const configurarAutoActualizacion = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Intervalos diferentes por página
      const intervalos = {
        principal: 90000, // 90 segundos
        empleados: 30000, // 30 segundos
        proximos: 60000, // 60 segundos
        admin: 120000, // 120 segundos
      }

      const intervalo = intervalos[pagina] || 60000

      intervalRef.current = setInterval(() => {
        cargarEstado(false, pagina === "admin")
      }, intervalo)
    }

    // Cargar estado inicial
    cargarEstado(false, pagina === "admin").then(() => {
      configurarAutoActualizacion()
    })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isClient, pagina, cargarEstado])

  // Cargar debug info
  useEffect(() => {
    if (!isClient || pagina !== "principal") return

    const cargarDebugInfo = async () => {
      try {
        const response = await fetch("/api/debug")
        if (response.ok) {
          const data = await response.json()
          setDebugInfo(data)
        }
      } catch (error) {
        console.error("Error al cargar debug info:", error)
      }
    }

    cargarDebugInfo()
  }, [isClient, pagina])

  return {
    estado,
    estadisticas,
    loading,
    error,
    ultimaSincronizacion,
    debugInfo,
    isClient,
    cacheStats,
    cargarEstado,
    guardarEstado,
    generarTicket,
    verificarIntegridad,
    obtenerBackups,
    obtenerBackup,
    invalidateCache,
  }
}
