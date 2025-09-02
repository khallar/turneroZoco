"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getCache, setCache, getCacheStats, invalidateCache } from "@/lib/cache-manager"

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

interface UseSistemaEstadoReturn {
  estado: EstadoSistema | null
  estadisticas: Estadisticas | null
  loading: boolean
  error: string | null
  cargarEstado: (includeStats?: boolean, forceRefresh?: boolean) => Promise<void>
  generarTicket: (nombre: string) => Promise<TicketInfo>
  llamarSiguiente: () => Promise<void>
  obtenerBackups: () => Promise<any[]>
  obtenerBackup: (fecha: string) => Promise<any>
  ultimaSincronizacion: Date | null
  isClient: boolean
  cacheStats: ReturnType<typeof getCacheStats>
  invalidateCache: () => void
}

export function useSistemaEstado(context = "default"): UseSistemaEstadoReturn {
  const [estado, setEstado] = useState<EstadoSistema | null>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  const cargarEstado = useCallback(
    async (includeStats = false, forceRefresh = false) => {
      if (!isClient) return

      try {
        setError(null)

        // Intentar obtener del cache primero
        const cacheKey = `sistema-estado-${includeStats ? "with-stats" : "basic"}`

        if (!forceRefresh) {
          const cachedData = getCache<{ estado: EstadoSistema; estadisticas?: Estadisticas }>(cacheKey)
          if (cachedData) {
            console.log(`📦 Usando datos del cache para ${context}`)
            setEstado(cachedData.estado)
            if (cachedData.estadisticas) {
              setEstadisticas(cachedData.estadisticas)
            }
            setUltimaSincronizacion(new Date())
            setLoading(false)
            return
          }
        }

        console.log(`🔄 Cargando estado desde API para ${context}...`)

        const params = new URLSearchParams()
        if (includeStats) params.append("stats", "true")
        if (forceRefresh) params.append("refresh", "true")

        const response = await fetch(`/api/sistema?${params.toString()}`, {
          method: "GET",
          headers: {
            "Cache-Control": forceRefresh ? "no-cache" : "max-age=60",
          },
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || "Error desconocido")
        }

        setEstado(data.estado)

        if (data.estadisticas) {
          setEstadisticas(data.estadisticas)
        }

        // Guardar en cache
        const cacheData = {
          estado: data.estado,
          ...(data.estadisticas && { estadisticas: data.estadisticas }),
        }
        setCache(cacheKey, cacheData, 120000) // 2 minutos de cache

        setUltimaSincronizacion(new Date())
        console.log(`✅ Estado cargado exitosamente para ${context}`)
      } catch (err) {
        console.error(`❌ Error al cargar estado para ${context}:`, err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    },
    [isClient, context],
  )

  const generarTicket = useCallback(
    async (nombre: string): Promise<TicketInfo> => {
      if (!isClient) throw new Error("No disponible en el servidor")

      try {
        console.log(`🎫 Generando ticket para: ${nombre}`)

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
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || "Error al generar ticket")
        }

        // Invalidar cache después de generar ticket
        invalidateCache("sistema-estado")

        // Recargar estado
        await cargarEstado(true, true)

        console.log(`✅ Ticket generado: #${data.ticket.numero}`)
        return data.ticket
      } catch (err) {
        console.error("❌ Error al generar ticket:", err)
        throw err
      }
    },
    [isClient, cargarEstado],
  )

  const llamarSiguiente = useCallback(async (): Promise<void> => {
    if (!isClient) throw new Error("No disponible en el servidor")

    try {
      console.log("📢 Llamando siguiente ticket...")

      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "LLAMAR_SIGUIENTE",
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Error al llamar siguiente ticket")
      }

      // Invalidar cache después de llamar siguiente
      invalidateCache("sistema-estado")

      // Recargar estado
      await cargarEstado(true, true)

      console.log(`✅ Ticket llamado: #${data.ticketLlamado?.numero}`)
    } catch (err) {
      console.error("❌ Error al llamar siguiente:", err)
      throw err
    }
  }, [isClient, cargarEstado])

  const obtenerBackups = useCallback(async (): Promise<any[]> => {
    if (!isClient) return []

    try {
      console.log("📋 Obteniendo lista de backups...")

      // Intentar cache primero
      const cacheKey = "backups-list"
      const cachedBackups = getCache<any[]>(cacheKey)
      if (cachedBackups) {
        console.log("📦 Usando backups del cache")
        return cachedBackups
      }

      const response = await fetch("/api/backup", {
        method: "GET",
        headers: {
          "Cache-Control": "max-age=300", // 5 minutos
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const backups = await response.json()

      // Guardar en cache por 5 minutos
      setCache(cacheKey, backups, 300000)

      console.log(`✅ ${backups.length} backups obtenidos`)
      return backups
    } catch (err) {
      console.error("❌ Error al obtener backups:", err)
      return []
    }
  }, [isClient])

  const obtenerBackup = useCallback(
    async (fecha: string): Promise<any> => {
      if (!isClient) return null

      try {
        console.log(`📋 Obteniendo backup para fecha: ${fecha}`)

        // Intentar cache primero
        const cacheKey = `backup-${fecha}`
        const cachedBackup = getCache<any>(cacheKey)
        if (cachedBackup) {
          console.log("📦 Usando backup del cache")
          return cachedBackup
        }

        const response = await fetch(`/api/backup?fecha=${encodeURIComponent(fecha)}`, {
          method: "GET",
          headers: {
            "Cache-Control": "max-age=3600", // 1 hora
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            return null
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const backup = await response.json()

        // Guardar en cache por 1 hora
        setCache(cacheKey, backup, 3600000)

        console.log(`✅ Backup obtenido para ${fecha}`)
        return backup
      } catch (err) {
        console.error(`❌ Error al obtener backup para ${fecha}:`, err)
        return null
      }
    },
    [isClient],
  )

  // Auto-actualización inteligente
  useEffect(() => {
    if (!isClient) return

    // Cargar estado inicial
    cargarEstado(true, false)

    // Configurar auto-actualización cada 2 minutos
    intervalRef.current = setInterval(() => {
      console.log(`🔄 Auto-actualización para ${context}`)
      cargarEstado(true, false) // No forzar refresh en auto-actualización
    }, 120000) // 2 minutos

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isClient, cargarEstado, context])

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    estado,
    estadisticas,
    loading,
    error,
    cargarEstado,
    generarTicket,
    llamarSiguiente,
    obtenerBackups,
    obtenerBackup,
    ultimaSincronizacion,
    isClient,
    cacheStats: getCacheStats(),
    invalidateCache: () => invalidateCache(),
  }
}
