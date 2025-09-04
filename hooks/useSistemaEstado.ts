"use client"

import { useCallback, useState } from "react"

interface SistemaEstado {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  tickets: string[]
}

const useSistemaEstado = () => {
  const [estado, setEstado] = useState<SistemaEstado>({
    numeroActual: 0,
    ultimoNumero: 0,
    totalAtendidos: 0,
    tickets: [],
  })

  const [error, setError] = useState<string | null>(null)

  const invalidateCache = useCallback(() => {
    // Implementación de invalidación de cache
    console.log("Cache invalidado")
  }, [])

  const generarTicket = useCallback(
    async (nombre: string) => {
      try {
        console.log("🎫 Iniciando generación de ticket para:", nombre)

        const response = await fetch("/api/sistema", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion: "GENERAR_TICKET",
            datos: { nombre },
          }),
        })

        console.log("📡 Respuesta del servidor:", response.status, response.statusText)

        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
          } catch (parseError) {
            console.error("❌ Error al parsear respuesta de error:", parseError)
            throw new Error(`Error ${response.status}: ${response.statusText}`)
          }

          console.error("❌ Error del servidor:", errorData)

          // Lanzar error con información detallada
          const errorMessage = errorData.details || errorData.error || `Error ${response.status}`
          throw new Error(`Error ${response.status}: ${errorMessage}`)
        }

        const data = await response.json()
        console.log("✅ Ticket generado exitosamente:", data.ticketGenerado)

        if (data.ticketGenerado) {
          // Actualizar estado local con los nuevos datos
          setEstado((prev) => ({
            ...prev,
            numeroActual: data.numeroActual,
            ultimoNumero: data.ultimoNumero,
            totalAtendidos: data.totalAtendidos,
            tickets: data.tickets || prev.tickets,
          }))

          // Invalidar cache para forzar actualización
          invalidateCache()

          return data.ticketGenerado
        } else {
          throw new Error("No se recibió información del ticket generado")
        }
      } catch (error) {
        console.error("❌ Error en generarTicket:", error)
        setError(error instanceof Error ? error.message : "Error desconocido al generar ticket")
        throw error
      }
    },
    [invalidateCache],
  )

  // ** rest of code here **/

  return { estado, error, generarTicket }
}

export default useSistemaEstado
