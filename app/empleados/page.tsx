"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, UserCheck, Users, SkipForward, RotateCcw } from "lucide-react"
import { TicketDisplay } from "@/components/TicketDisplay"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import Image from "next/image"

export default function PanelEmpleados() {
  const { obtenerProximoTicket, marcarTicketComoAtendido, obtenerTicketsEnEspera, obtenerTicketActual, saltarTicket } =
    useSistemaEstado()

  const [ticketActual, setTicketActual] = useState<{ numero: number; nombre: string } | null>(null)
  const [proximoTicket, setProximoTicket] = useState<{ numero: number; nombre: string } | null>(null)
  const [ticketsEnEspera, setTicketsEnEspera] = useState(0)
  const [loading, setLoading] = useState(false)

  const cargarDatos = async () => {
    try {
      const [actual, proximo, enEspera] = await Promise.all([
        obtenerTicketActual(),
        obtenerProximoTicket(),
        obtenerTicketsEnEspera(),
      ])

      setTicketActual(actual)
      setProximoTicket(proximo)
      setTicketsEnEspera(enEspera)
    } catch (error) {
      console.error("Error al cargar datos:", error)
    }
  }

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(cargarDatos, 2000)
    return () => clearInterval(interval)
  }, [])

  const manejarLlamarSiguiente = async () => {
    if (!proximoTicket) return

    setLoading(true)
    try {
      await marcarTicketComoAtendido(proximoTicket.numero)
      await cargarDatos()
    } catch (error) {
      console.error("Error al llamar siguiente:", error)
    } finally {
      setLoading(false)
    }
  }

  const manejarSaltarTicket = async () => {
    if (!proximoTicket) return

    setLoading(true)
    try {
      await saltarTicket(proximoTicket.numero)
      await cargarDatos()
    } catch (error) {
      console.error("Error al saltar ticket:", error)
    } finally {
      setLoading(false)
    }
  }

  const manejarFinalizarAtencion = async () => {
    if (!ticketActual) return

    setLoading(true)
    try {
      // Marcar como completado y limpiar ticket actual
      setTicketActual(null)
      await cargarDatos()
    } catch (error) {
      console.error("Error al finalizar atención:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <a href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </a>
            </Button>
            <div className="flex items-center gap-3">
              <Image src="/logo-rojo.png" alt="Logo ZOCO" width={60} height={60} className="object-contain" />
              <div>
                <h1 className="text-3xl font-bold text-blue-800">Panel de Empleados</h1>
                <p className="text-blue-600">Gestión de atención al cliente</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Users className="h-5 w-5" />
              Estado de la Cola
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant="default" className="mb-2 bg-blue-600">
                  {ticketsEnEspera}
                </Badge>
                <p className="text-sm text-gray-600">Tickets en Espera</p>
              </div>
              <div className="text-center">
                <Badge variant={ticketActual ? "default" : "secondary"} className="mb-2">
                  {ticketActual ? `#${ticketActual.numero}` : "Ninguno"}
                </Badge>
                <p className="text-sm text-gray-600">Atendiendo Ahora</p>
              </div>
              <div className="text-center">
                <Badge variant={proximoTicket ? "outline" : "secondary"} className="mb-2">
                  {proximoTicket ? `#${proximoTicket.numero}` : "Ninguno"}
                </Badge>
                <p className="text-sm text-gray-600">Próximo Ticket</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Actual */}
        {ticketActual && (
          <div className="space-y-4">
            <TicketDisplay numero={ticketActual.numero} nombre={ticketActual.nombre} tipo="actual" />
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <Button
                  onClick={manejarFinalizarAtencion}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Finalizar Atención
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Próximo Ticket */}
        {proximoTicket && (
          <div className="space-y-4">
            <TicketDisplay numero={proximoTicket.numero} nombre={proximoTicket.nombre} tipo="proximo" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={manejarLlamarSiguiente}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading || !!ticketActual}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Llamar y Atender
              </Button>
              <Button
                onClick={manejarSaltarTicket}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent"
                disabled={loading}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Saltar Ticket
              </Button>
            </div>
          </div>
        )}

        {/* Sin tickets */}
        {!ticketActual && !proximoTicket && (
          <Card className="border-gray-200">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay tickets en espera</h3>
              <p className="text-gray-500">Los nuevos tickets aparecerán aquí automáticamente</p>
            </CardContent>
          </Card>
        )}

        {/* Acciones Rápidas */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-800">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" asChild>
                <a href="/proximos" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ver Todos los Próximos
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/admin" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Panel de Administración
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-blue-600 py-4 border-t border-blue-200">
          <p>Panel de Empleados ZOCO - Versión 5.3</p>
          <p>© 2024 Todos los derechos reservados</p>
        </footer>
      </div>
    </div>
  )
}
