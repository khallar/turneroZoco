"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cacheManager, CACHE_KEYS, cacheUtils } from "@/lib/cache-manager"

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

// Estado inicial para evitar undefined durante SSR
const estadoInicial: EstadoSistema = {
  numeroActual: 1,
  ultimoNumero: 0,
  totalAtendidos: 0,
  numerosLlamados: 0,
  fechaInicio: new Date().toDateString(),
  ultimoReinicio: new Date().toISOString(),
  tickets: [],
  lastSync: Date.now(),
}

// Configuración de intervalos optimizada por página
const INTERVALOS_ACTUALIZACION = {
  principal: 90000, // 90 segundos (era 60)
  empleados: 30000, // 30 segundos (era 15)
  proximos: 60000, // 60 segundos (era 30)
  admin: 120000, // 120 segundos (era variable)
} as const

export function useSistemaEstado(pagina: keyof typeof INTERVALOS_ACTUALIZACION = "principal") {
  const [estado, setEstado] = useState<EstadoSistema>(estadoInicial)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Referencias para evitar múltiples llamadas simultáneas
  const loadingRef = useRef(false)
  const lastFetchRef = useRef(0)

  // Verificar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Función optimizada para cargar información de debug (con cache)
  const cargarDebugInfo = useCallback(async () => {
    if (!isClient) return

    // Verificar cache primero
    const cachedDebug = cacheManager.get(CACHE_KEYS.DEBUG_INFO)
    if (cachedDebug) {
      setDebugInfo(cachedDebug)
      return
    }

    try {
      const response = await fetch("/api/debug", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
        // Cache por 5 minutos
        cacheManager.set(CACHE_KEYS.DEBUG_INFO, data, 300000)
      }
    } catch (error) {
      console.error("❌ Error al cargar debug info:", error)
    }
  }, [isClient])

  // Función optimizada para cargar estado desde la API con cache inteligente
  const cargarEstado = useCallback(
    async (incluirEstadisticas = false, forzarActualizacion = false) => {
      if (!isClient) return

      // Evitar múltiples llamadas simultáneas
      if (loadingRef.current && !forzarActualizacion) {
        console.log("⏳ Carga ya en progreso, saltando...")
        return
      }

      // Verificar cache si no es forzado
      if (!forzarActualizacion) {
        const estadoEnCache = cacheUtils.getEstadoSistema()
        const maxAge = INTERVALOS_ACTUALIZACION[pagina] * 0.8 // 80% del intervalo

        if (estadoEnCache && cacheUtils.isEstadoFresh(maxAge)) {
          console.log(`📦 Usando estado desde cache (página: ${pagina})`)
          setEstado(estadoEnCache)
          setError(null)
          setUltimaSincronizacion(new Date(estadoEnCache.lastSync || Date.now()))
          setLoading(false)

          // Cargar estadísticas desde cache si se solicita
          if (incluirEstadisticas) {
            const statsEnCache = cacheManager.get(CACHE_KEYS.ESTADISTICAS)
            if (statsEnCache) {
              setEstadisticas(statsEnCache)
            }
          }
          return
        }
      }

      // Verificar throttling (evitar llamadas muy frecuentes)
      const ahora = Date.now()
      const tiempoMinimo = pagina === "empleados" ? 15000 : 30000 // Mínimo entre llamadas
      if (ahora - lastFetchRef.current < tiempoMinimo && !forzarActualizacion) {
        console.log(
          `⏳ Throttling activo, esperando ${Math.round((tiempoMinimo - (ahora - lastFetchRef.current)) / 1000)}s más`,
        )
        return
      }

      loadingRef.current = true
      lastFetchRef.current = ahora

      if (forzarActualizacion) {
        setLoading(true)
      }

      try {
        console.log(`📥 Cargando estado desde API (página: ${pagina}, forzado: ${forzarActualizacion})...`)

        const response = await fetch("/api/sistema", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (response.status === 503) {
          console.log("⏳ Sistema ocupado, usando cache si está disponible...")
          const estadoEnCache = cacheUtils.getEstadoSistema()
          if (estadoEnCache) {
            setEstado(estadoEnCache)
            setError("Sistema ocupado - mostrando datos en cache")
            return
          }
          throw new Error("Sistema ocupado y sin cache disponible")
        }

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Estado cargado desde servidor (página: ${pagina})`)

          setEstado(data)
          setError(null)
          setUltimaSincronizacion(new Date())

          // Guardar en cache con TTL específico por página
          const ttl = INTERVALOS_ACTUALIZACION[pagina]
          cacheUtils.setEstadoSistema(data, ttl)

          // Cargar estadísticas si se solicita
          if (incluirEstadisticas) {
            await cargarEstadisticas()
          }

          // Cargar debug info solo si es necesario
          if (pagina === "admin") {
            await cargarDebugInfo()
          }
        } else {
          const responseText = await response.text()
          let errorDetails = "Error desconocido"
          try {
            const errorData = JSON.parse(responseText)
            errorDetails = errorData.error || errorData.details || "Error desconocido"
          } catch (jsonError) {
            errorDetails = responseText
          }
          throw new Error(`Error ${response.status}: ${errorDetails}`)
        }
      } catch (err) {
        console.error(`❌ Error al cargar estado (página: ${pagina}):`, err)
        setError(`Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`)

        // Intentar usar cache como fallback
        const estadoEnCache = cacheUtils.getEstadoSistema()
        if (estadoEnCache) {
          console.log("📦 Usando cache como fallback después del error")
          setEstado(estadoEnCache)
        }
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [isClient, pagina, cargarDebugInfo],
  )

  // Función optimizada para cargar estadísticas (con cache)
  const cargarEstadisticas = useCallback(async () => {
    if (!isClient) return

    // Verificar cache primero
    const statsEnCache = cacheManager.get(CACHE_KEYS.ESTADISTICAS)
    if (statsEnCache && cacheManager.isFresh(CACHE_KEYS.ESTADISTICAS, 60000)) {
      // 1 minuto
      setEstadisticas(statsEnCache)
      return
    }

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
        // Cache por 2 minutos
        cacheManager.set(CACHE_KEYS.ESTADISTICAS, data.estadisticas, 120000)
      } else {
        console.error(`❌ Error al cargar estadísticas: ${response.status}`)
      }
    } catch (error) {
      console.error("❌ Error al cargar estadísticas:", error)
    }
  }, [isClient])

  // Función optimizada para guardar estado
  const guardarEstado = useCallback(
    async (nuevoEstado: EstadoSistema, reintentos = 2) => {
      if (!isClient) return

      setEstado(nuevoEstado) // Actualizar UI inmediatamente

      // Actualizar cache inmediatamente
      cacheUtils.setEstadoSistema(nuevoEstado)

      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`💾 Sincronizando con servidor (intento ${intento}/${reintentos})`)

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

          if (response.status === 503) {
            console.log("⏳ Sistema ocupado, reintentando...")
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
            continue
          }

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Estado sincronizado con servidor")

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())

            // Actualizar cache con datos del servidor
            cacheUtils.setEstadoSistema(data)
            return
          } else {
            const responseText = await response.text()
            let errorDetails = "Error desconocido"
            try {
              const errorData = JSON.parse(responseText)
              errorDetails = errorData.error || errorData.details || "Error desconocido"
            } catch (jsonError) {
              errorDetails = responseText
            }
            throw new Error(`Error ${response.status}: ${errorDetails}`)
          }
        } catch (err) {
          console.error(`❌ Error al sincronizar (intento ${intento}):`, err)

          if (intento === reintentos) {
            setError(`Error de sincronización: ${err instanceof Error ? err.message : "Error desconocido"}`)
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }
    },
    [isClient],
  )

  // Función optimizada para generar ticket
  const generarTicket = useCallback(
    async (nombre: string, reintentos = 2) => {
      if (!isClient) return null

      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`🎫 Generando ticket para: ${nombre} (intento ${intento}/${reintentos})`)

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

          if (response.status === 503) {
            console.log("⏳ Sistema ocupado, reintentando...")
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
            continue
          }

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Ticket generado exitosamente")

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())

            // Actualizar cache inmediatamente
            cacheUtils.setEstadoSistema(data)

            // Invalidar cache de estadísticas para forzar recarga
            cacheManager.invalidate(CACHE_KEYS.ESTADISTICAS)

            return data.ticketGenerado
          } else {
            const responseText = await response.text()
            let errorDetails = "Error desconocido"
            try {
              const errorData = JSON.parse(responseText)
              errorDetails = errorData.error || errorData.details || "Error desconocido"
            } catch (jsonError) {
              errorDetails = responseText
            }
            throw new Error(`Error ${response.status}: ${errorDetails}`)
          }
        } catch (err) {
          console.error(`❌ Error al generar ticket (intento ${intento}):`, err)

          if (intento === reintentos) {
            setError(`Error al generar ticket: ${err instanceof Error ? err.message : "Error desconocido"}`)
            throw err
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }

      return null
    },
    [isClient],
  )

  // Función para obtener backups (con cache)
  const obtenerBackups = useCallback(async () => {
    if (!isClient) return []

    // Verificar cache primero
    const backupsEnCache = cacheManager.get(CACHE_KEYS.BACKUPS)
    if (backupsEnCache && cacheManager.isFresh(CACHE_KEYS.BACKUPS, 300000)) {
      // 5 minutos
      return backupsEnCache
    }

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
        const backups = data.backups || []
        // Cache por 10 minutos
        cacheManager.set(CACHE_KEYS.BACKUPS, backups, 600000)
        return backups
      } else {
        console.error(`❌ Error al obtener backups: ${response.status}`)
      }
    } catch (error) {
      console.error("❌ Error al obtener backups:", error)
    }
    return []
  }, [isClient])

  // Función para obtener backup específico (sin cache por ser específico)
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
        } else {
          console.error(`❌ Error al obtener backup específico: ${response.status}`)
        }
      } catch (error) {
        console.error("❌ Error al obtener backup:", error)
      }
      return null
    },
    [isClient],
  )

  // Cargar estado inicial al montar el componente
  useEffect(() => {
    if (isClient) {
      cargarEstado(true, true).catch((err) => console.error("Error en carga inicial:", err))
    }
  }, [isClient, cargarEstado])

  // Suscribirse a cambios en el cache para actualizaciones en tiempo real
  useEffect(() => {
    if (!isClient) return

    const unsubscribe = cacheUtils.subscribeToEstado((nuevoEstado) => {
      console.log("📡 Estado actualizado desde cache compartido")
      setEstado(nuevoEstado)
      setUltimaSincronizacion(new Date(nuevoEstado.lastSync || Date.now()))
    })

    return unsubscribe
  }, [isClient])

  // Sincronización periódica optimizada por página
  useEffect(() => {
    if (!isClient) return

    const intervalo = INTERVALOS_ACTUALIZACION[pagina]
    console.log(`⏰ Configurando sincronización para página '${pagina}' cada ${intervalo / 1000}s`)

    const interval = setInterval(() => {
      // Solo actualizar si no hay datos frescos en cache
      if (!cacheUtils.isEstadoFresh(intervalo * 0.9)) {
        // 90% del intervalo
        console.log(`🔄 Sincronización automática (${pagina})`)
        cargarEstado(pagina === "empleados" || pagina === "admin").catch((err) =>
          console.error("Error en sincronización periódica:", err),
        )
      } else {
        console.log(`⏭️ Saltando sincronización, cache fresco (${pagina})`)
      }
    }, intervalo)

    return () => clearInterval(interval)
  }, [cargarEstado, isClient, pagina])

  // Verificar integridad de la numeración
  const verificarIntegridad = useCallback(() => {
    if (!isClient || !estado.tickets || estado.tickets.length === 0) return { ok: true }

    const ticketsOrdenados = [...estado.tickets].sort((a, b) => a.numero - b.numero)
    let numeroAnterior = ticketsOrdenados[0].numero
    const saltos = []

    for (let i = 1; i < ticketsOrdenados.length; i++) {
      const numeroActual = ticketsOrdenados[i].numero
      if (numeroActual - numeroAnterior > 1) {
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
    // Nuevas utilidades de cache
    cacheStats: cacheManager.getStats(),
    invalidateCache: () => cacheManager.clear(),
  }
}
