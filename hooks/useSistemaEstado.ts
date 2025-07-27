"use client"

import { useState, useEffect, useCallback } from "react"

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
}

export function useSistemaEstado() {
  const [estado, setEstado] = useState<EstadoSistema>(estadoInicial)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Verificar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Función para obtener información de debug
  const cargarDebugInfo = useCallback(async () => {
    if (!isClient) return

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
        console.log("🐛 Debug info actualizada:", data)
      }
    } catch (error) {
      console.error("❌ Error al cargar debug info:", error)
    }
  }, [isClient])

  // Cargar estado inicial con reintentos
  const cargarEstado = useCallback(
    async (incluirEstadisticas = false, reintentos = 3) => {
      // Solo ejecutar en el cliente
      if (!isClient) return

      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`📥 Cargando estado desde API (intento ${intento}/${reintentos})...`)

          const response = await fetch("/api/sistema", {
            method: "GET",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          })

          if (response.status === 503) {
            console.log("⏳ Sistema ocupado, reintentando...")
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
            continue
          }

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Estado cargado desde servidor:", {
              numeroActual: data.numeroActual,
              ultimoNumero: data.ultimoNumero,
              totalAtendidos: data.totalAtendidos,
              numerosLlamados: data.numerosLlamados,
              totalTickets: data.tickets?.length || 0,
              fechaInicio: data.fechaInicio,
            })

            // Verificar integridad de los datos recibidos
            if (data.tickets && data.tickets.length !== data.totalAtendidos) {
              console.warn("⚠️ Inconsistencia detectada en datos recibidos")
            }

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())

            // También guardar en localStorage como backup
            if (typeof window !== "undefined") {
              localStorage.setItem("sistemaAtencion", JSON.stringify(data))
            }

            // Si incluye estadísticas, cargarlas por separado
            if (incluirEstadisticas) {
              await cargarEstadisticas()
            }

            // Cargar debug info después de cargar estado
            await cargarDebugInfo()

            return // Éxito, salir del bucle
          } else {
            const errorData = await response.json()
            console.error("❌ Error en respuesta:", errorData)
            throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
          }
        } catch (err) {
          console.error(`❌ Error al cargar estado (intento ${intento}):`, err)

          if (intento === reintentos) {
            // Último intento fallido
            setError(`Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`)

            // Fallback a localStorage solo si hay error de conexión
            try {
              const estadoLocal = localStorage.getItem("sistemaAtencion")
              if (estadoLocal) {
                const data = JSON.parse(estadoLocal)

                // Migrar datos antiguos si no tienen campos requeridos
                if (!data.tickets) data.tickets = []
                if (!data.ultimoReinicio) data.ultimoReinicio = new Date().toISOString()

                setEstado(data)
                console.log("⚠️ Usando datos de localStorage como fallback")
              }
            } catch (parseError) {
              console.error("❌ Error al parsear localStorage:", parseError)
              setEstado(estadoInicial)
              if (typeof window !== "undefined") {
                localStorage.setItem("sistemaAtencion", JSON.stringify(estadoInicial))
              }
            }
          } else {
            // Esperar antes del siguiente intento
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }

      setLoading(false)
    },
    [isClient, cargarDebugInfo],
  )

  // Cargar estadísticas del día
  const cargarEstadisticas = useCallback(async () => {
    if (!isClient) return

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
      }
    } catch (error) {
      console.error("❌ Error al cargar estadísticas:", error)
    }
  }, [isClient])

  // Guardar estado con reintentos
  const guardarEstado = useCallback(
    async (nuevoEstado: EstadoSistema, reintentos = 3) => {
      // Solo ejecutar en el cliente
      if (!isClient) return

      for (let intento = 1; intento <= reintentos; intento++) {
        try {
          console.log(`💾 Guardando estado (intento ${intento}/${reintentos}):`, {
            numeroActual: nuevoEstado.numeroActual,
            ultimoNumero: nuevoEstado.ultimoNumero,
            totalAtendidos: nuevoEstado.totalAtendidos,
            numerosLlamados: nuevoEstado.numerosLlamados,
          })

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
            console.log("✅ Estado guardado exitosamente:", {
              numeroActual: data.numeroActual,
              ultimoNumero: data.ultimoNumero,
              totalAtendidos: data.totalAtendidos,
              numerosLlamados: data.numerosLlamados,
            })

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())

            // También guardar en localStorage como backup
            if (typeof window !== "undefined") {
              localStorage.setItem("sistemaAtencion", JSON.stringify(data))
            }

            return // Éxito
          } else {
            const errorData = await response.json()
            throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
          }
        } catch (err) {
          console.error(`❌ Error al guardar estado (intento ${intento}):`, err)

          if (intento === reintentos) {
            // Último intento fallido
            setError(`Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`)

            // Fallback a localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("sistemaAtencion", JSON.stringify(nuevoEstado))
            }
            setEstado(nuevoEstado)
          } else {
            // Esperar antes del siguiente intento
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }
    },
    [isClient],
  )

  // Nueva función para generar ticket de forma atómica con reintentos
  const generarTicket = useCallback(
    async (nombre: string, reintentos = 3) => {
      // Solo ejecutar en el cliente
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
            console.log("✅ Ticket generado exitosamente:", data.ticketGenerado)
            console.log("📊 Estado actualizado:", {
              numeroActual: data.numeroActual,
              ultimoNumero: data.ultimoNumero,
              totalAtendidos: data.totalAtendidos,
              numerosLlamados: data.numerosLlamados,
            })

            setEstado(data)
            setError(null)
            setUltimaSincronizacion(new Date())

            // También guardar en localStorage como backup
            if (typeof window !== "undefined") {
              localStorage.setItem("sistemaAtencion", JSON.stringify(data))
            }

            // Actualizar debug info después de generar ticket
            await cargarDebugInfo()

            return data.ticketGenerado
          } else {
            const errorData = await response.json()
            console.error("❌ Error en respuesta al generar ticket:", errorData)
            throw new Error(`Error ${response.status}: ${errorData.error || "Error desconocido"}`)
          }
        } catch (err) {
          console.error(`❌ Error al generar ticket (intento ${intento}):`, err)

          if (intento === reintentos) {
            // Último intento fallido
            setError(`Error al generar ticket: ${err instanceof Error ? err.message : "Error desconocido"}`)
            throw err
          } else {
            // Esperar antes del siguiente intento
            await new Promise((resolve) => setTimeout(resolve, 1000 * intento))
          }
        }
      }

      return null
    },
    [isClient, cargarDebugInfo],
  )

  // Función para obtener backups
  const obtenerBackups = useCallback(async () => {
    if (!isClient) return []

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
        return data.backups || []
      }
    } catch (error) {
      console.error("❌ Error al obtener backups:", error)
    }
    return []
  }, [isClient])

  // Función para obtener backup específico
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
        }
      } catch (error) {
        console.error("❌ Error al obtener backup:", error)
      }
      return null
    },
    [isClient],
  )

  // Cargar estado al montar el componente
  useEffect(() => {
    if (isClient) {
      cargarEstado(true)
    }
  }, [cargarEstado, isClient])

  // Sincronizar cada 30 segundos para asegurar persistencia
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      cargarEstado(false) // Sin estadísticas para ser más rápido
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [cargarEstado, isClient])

  // Cargar estadísticas cada 2 minutos
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(cargarEstadisticas, 120000) // 2 minutos
    return () => clearInterval(interval)
  }, [cargarEstadisticas, isClient])

  // Verificar integridad de la numeración
  const verificarIntegridad = useCallback(() => {
    if (!isClient || !estado.tickets || estado.tickets.length === 0) return { ok: true }

    // Ordenar tickets por número
    const ticketsOrdenados = [...estado.tickets].sort((a, b) => a.numero - b.numero)

    // Verificar que no hay saltos
    let numeroAnterior = ticketsOrdenados[0].numero
    const saltos = []

    for (let i = 1; i < ticketsOrdenados.length; i++) {
      const numeroActual = ticketsOrdenados[i].numero
      if (numeroActual - numeroAnterior > 1) {
        // Hay un salto
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
  }
}
