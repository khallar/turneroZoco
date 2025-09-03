"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cacheManager } from "@/lib/cache-manager"

export interface Ticket {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

export interface EstadoSistema {
  numeroActual: number
  totalAtendidos: number
  numerosLlamados: number
  tickets: Ticket[]
  fechaActual: string
}

export interface Estadisticas {
  ticketsHoy: number
  promedioEspera: number
  ticketsAtendidos: number
}

export interface DebugInfo {
  environment?: {
    NODE_ENV?: string
    VERCEL_ENV?: string
  }
  upstash?: {
    connection?: {
      status: string
    }
  }
}

export function useSistemaEstado(pagina = "general") {
  const [estado, setEstado] = useState<EstadoSistema>({
    numeroActual: 0,
    totalAtendidos: 0,
    numerosLlamados: 0,
    tickets: [],
    fechaActual: new Date().toISOString().split("T")[0],
  })

  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    ticketsHoy: 0,
    promedioEspera: 0,
    ticketsAtendidos: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [isClient, setIsClient] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cacheKey = `sistema-estado-${pagina}`

  // Verificar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Función para cargar el estado desde la API
  const cargarEstado = useCallback(
    async (incluirEstadisticas = false, forzarActualizacion = false) => {
      if (!isClient) return

      try {
        console.log(`🔄 [${pagina}] Cargando estado del sistema...`)

        // Intentar obtener del cache primero (si no es forzado)
        if (!forzarActualizacion) {
          const estadoCache = cacheManager.get(cacheKey)
          if (estadoCache) {
            console.log(`📦 [${pagina}] Usando datos del cache`)
            setEstado(estadoCache.estado)
            if (estadoCache.estadisticas) {
              setEstadisticas(estadoCache.estadisticas)
            }
            setUltimaSincronizacion(new Date(estadoCache.timestamp))
            setError(null)
            setLoading(false)
            return
          }
        }

        // Si no hay cache o es forzado, hacer petición a la API
        console.log(`🌐 [${pagina}] Consultando API...`)
        const response = await fetch("/api/sistema", {
          method: "GET",
          headers: {
            "Cache-Control": forzarActualizacion ? "no-cache" : "max-age=30",
          },
        })

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }

        const data = await response.json()
        console.log(`✅ [${pagina}] Datos recibidos:`, {
          numeroActual: data.numeroActual,
          totalAtendidos: data.totalAtendidos,
          numerosLlamados: data.numerosLlamados,
          ticketsCount: data.tickets?.length || 0,
        })

        // Validar que tickets sea un array
        const ticketsValidados = Array.isArray(data.tickets) ? data.tickets : []
        if (!Array.isArray(data.tickets)) {
          console.warn(`⚠️ [${pagina}] tickets no es un array, usando array vacío`)
        }

        const nuevoEstado: EstadoSistema = {
          numeroActual: data.numeroActual || 0,
          totalAtendidos: data.totalAtendidos || 0,
          numerosLlamados: data.numerosLlamados || 0,
          tickets: ticketsValidados,
          fechaActual: data.fechaActual || new Date().toISOString().split("T")[0],
        }

        setEstado(nuevoEstado)

        // Cargar estadísticas si se solicita
        if (incluirEstadisticas) {
          try {
            const statsResponse = await fetch("/api/sistema?stats=true")
            if (statsResponse.ok) {
              const statsData = await statsResponse.json()
              const nuevasEstadisticas: Estadisticas = {
                ticketsHoy: statsData.ticketsHoy || 0,
                promedioEspera: statsData.promedioEspera || 0,
                ticketsAtendidos: statsData.ticketsAtendidos || 0,
              }
              setEstadisticas(nuevasEstadisticas)

              // Guardar en cache con estadísticas
              cacheManager.set(cacheKey, {
                estado: nuevoEstado,
                estadisticas: nuevasEstadisticas,
                timestamp: Date.now(),
              })
            }
          } catch (statsError) {
            console.warn(`⚠️ [${pagina}] Error al cargar estadísticas:`, statsError)
          }
        } else {
          // Guardar en cache sin estadísticas
          cacheManager.set(cacheKey, {
            estado: nuevoEstado,
            timestamp: Date.now(),
          })
        }

        setUltimaSincronizacion(new Date())
        setError(null)
      } catch (err) {
        console.error(`❌ [${pagina}] Error al cargar estado:`, err)
        setError(err instanceof Error ? err.message : "Error desconocido")

        // En caso de error, intentar usar cache como fallback
        const estadoCache = cacheManager.get(cacheKey)
        if (estadoCache) {
          console.log(`📦 [${pagina}] Usando cache como fallback`)
          setEstado(estadoCache.estado)
          if (estadoCache.estadisticas) {
            setEstadisticas(estadoCache.estadisticas)
          }
        }
      } finally {
        setLoading(false)
      }
    },
    [isClient, pagina, cacheKey],
  )

  // Función para generar un nuevo ticket
  const generarTicket = useCallback(
    async (nombre: string) => {
      if (!isClient) return null

      try {
        console.log(`🎫 [${pagina}] Generando ticket para: ${nombre}`)

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
          const errorData = await response.json().catch(() => ({ error: "Error de conexión" }))
          throw new Error(errorData.error || `Error HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (!data.ticketGenerado) {
          throw new Error("No se recibió el ticket generado")
        }

        console.log(`✅ [${pagina}] Ticket generado:`, data.ticketGenerado)

        // Invalidar cache para forzar actualización
        cacheManager.delete(cacheKey)

        // Actualizar estado local inmediatamente
        setTimeout(() => {
          cargarEstado(false, true)
        }, 500)

        return data.ticketGenerado
      } catch (err) {
        console.error(`❌ [${pagina}] Error al generar ticket:`, err)
        throw err
      }
    },
    [isClient, pagina, cacheKey, cargarEstado],
  )

  // Función para llamar al siguiente número
  const llamarSiguiente = useCallback(async () => {
    if (!isClient) return null

    try {
      console.log(`📢 [${pagina}] Llamando siguiente número...`)

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
        const errorData = await response.json().catch(() => ({ error: "Error de conexión" }))
        throw new Error(errorData.error || `Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log(`✅ [${pagina}] Número llamado:`, data)

      // Invalidar cache y actualizar
      cacheManager.delete(cacheKey)
      await cargarEstado(false, true)

      return data
    } catch (err) {
      console.error(`❌ [${pagina}] Error al llamar siguiente:`, err)
      throw err
    }
  }, [isClient, pagina, cacheKey, cargarEstado])

  // Función para verificar integridad
  const verificarIntegridad = useCallback(() => {
    if (!Array.isArray(estado.tickets)) {
      return { valido: false, mensaje: "No hay tickets válidos" }
    }

    const numerosEsperados = Array.from({ length: estado.totalAtendidos }, (_, i) => i + 1)
    const numerosReales = estado.tickets.map((t) => t.numero).sort((a, b) => a - b)

    const faltantes = numerosEsperados.filter((num) => !numerosReales.includes(num))
    const duplicados = numerosReales.filter((num, index) => numerosReales.indexOf(num) !== index)

    return {
      valido: faltantes.length === 0 && duplicados.length === 0,
      faltantes,
      duplicados,
      mensaje:
        faltantes.length === 0 && duplicados.length === 0
          ? "Numeración íntegra"
          : `Problemas: ${faltantes.length} faltantes, ${duplicados.length} duplicados`,
    }
  }, [estado.tickets, estado.totalAtendidos])

  // Cargar debug info
  const cargarDebugInfo = useCallback(async () => {
    if (!isClient) return

    try {
      const response = await fetch("/api/debug")
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
      }
    } catch (err) {
      console.warn("No se pudo cargar debug info:", err)
    }
  }, [isClient])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (!isClient) return

    console.log(`🚀 [${pagina}] Inicializando hook...`)

    // Cargar estado inicial
    cargarEstado(pagina === "admin", false)

    // Cargar debug info
    cargarDebugInfo()

    // Configurar actualización automática cada 90 segundos
    intervalRef.current = setInterval(() => {
      console.log(`⏰ [${pagina}] Actualización automática...`)
      cargarEstado(false, false) // Usar cache si está disponible
    }, 90000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isClient, pagina, cargarEstado, cargarDebugInfo])

  // Función para obtener próximos turnos
  const obtenerProximosTurnos = useCallback(
    (cantidad = 10) => {
      if (!Array.isArray(estado.tickets)) {
        console.warn("No hay tickets válidos para calcular próximos turnos")
        return []
      }

      const siguienteNumero = estado.numerosLlamados + 1
      const proximosTurnos = []

      for (let i = 0; i < cantidad; i++) {
        const numeroTurno = siguienteNumero + i
        const ticket = estado.tickets.find((t) => t.numero === numeroTurno)

        if (ticket) {
          proximosTurnos.push({
            numero: numeroTurno,
            nombre: ticket.nombre,
            esProximo: i === 0,
          })
        } else if (numeroTurno <= estado.totalAtendidos) {
          // Si el número existe pero no encontramos el ticket, mostrar como "Sin nombre"
          proximosTurnos.push({
            numero: numeroTurno,
            nombre: "Sin nombre registrado",
            esProximo: i === 0,
          })
        }
      }

      return proximosTurnos
    },
    [estado.tickets, estado.numerosLlamados, estado.totalAtendidos],
  )

  return {
    estado,
    estadisticas,
    loading,
    error,
    ultimaSincronizacion,
    debugInfo,
    isClient,
    cacheStats: cacheManager.getStats(),
    // Funciones
    cargarEstado,
    generarTicket,
    llamarSiguiente,
    verificarIntegridad,
    obtenerProximosTurnos,
  }
}
