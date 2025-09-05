"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Users, RefreshCw } from "lucide-react"
import { TicketDisplay } from "@/components/TicketDisplay"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import Image from "next/image"

interface Ticket {
  numero: number
  nombre: string
  timestamp: number
}

export default function ProximosTurnos() {
  const { obtenerTicketActual, obtenerTicketsEnEspera } = useSistemaEstado()

  const [ticketActual, setTicketActual] = useState<{ numero: number; nombre: string } | null>(null)
  const [proximosTickets, setProximosTickets] = useState<Ticket[]>([])
  const [ticketsEnEspera, setTicketsEnEspera] = useState(0)
  const [loading, setLoading] = useState(false)

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [actual, enEspera] = await Promise.all([obtenerTicketActual(), obtenerTicketsEnEspera()])

      setTicketActual(actual)
      setTicketsEnEspera(enEspera)

      // Simular próximos tickets (en una implementación real, esto vendría de la API)
      const tickets: Ticket[] = []
      for (let i = 1; i <= Math.min(enEspera, 10); i++) {
        tickets.push({
          numero: (actual?.numero || 0) + i,
          nombre: `Cliente ${i}`,
          timestamp: Date.now() - i * 60000,
        })
      }
      setProximosTickets(tickets)
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(cargarDatos, 3000)
    return () => clearInterval(interval)
  }, [])

  const formatearTiempoEspera = (timestamp: number) => {
    const minutos = Math.floor((Date.now() - timestamp) / 60000)
    if (minutos < 1) return "Recién llegado"
    if (minutos === 1) return "1 minuto"
    return `${minutos} minutos`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
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
                <h1 className="text-3xl font-bold text-green-800">Próximos Turnos</h1>
                <p className="text-green-600">Cola de espera en tiempo real</p>
              </div>
            </div>
          </div>
          <Button
            onClick={cargarDatos}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Users className="h-5 w-5" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <Badge variant="default" className="mb-2 bg-green-600">
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
            </div>
          </CardContent>
        </Card>

        {/* Ticket Actual */}
        {ticketActual && <TicketDisplay numero={ticketActual.numero} nombre={ticketActual.nombre} tipo="actual" />}

        {/* Lista de Próximos Tickets */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Clock className="h-5 w-5" />
              Próximos en la Cola
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {proximosTickets.length > 0 ? (
              <div className="space-y-3">
                {proximosTickets.map((ticket, index) => (
                  <div
                    key={ticket.numero}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index === 0 ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={index === 0 ? "default" : "outline"}
                        className={index === 0 ? "bg-yellow-600" : ""}
                      >
                        #{ticket.numero}
                      </Badge>
                      <div>
                        <p className="font-medium">{ticket.nombre}</p>
                        <p className="text-sm text-gray-500">Esperando: {formatearTiempoEspera(ticket.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{index === 0 ? "Siguiente" : `Posición ${index + 1}`}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay tickets en espera</h3>
                <p className="text-gray-500">Los nuevos tickets aparecerán aquí automáticamente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800">Información</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Tiempo Estimado de Espera</h4>
                <p className="text-gray-600">
                  {ticketsEnEspera > 0 ? `Aproximadamente ${ticketsEnEspera * 5} minutos` : "Sin espera"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Actualización</h4>
                <p className="text-gray-600">Esta pantalla se actualiza automáticamente cada 3 segundos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enlaces Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" asChild className="h-auto p-4 bg-transparent">
            <a href="/empleados" className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <div className="text-left">
                <h3 className="font-semibold">Panel de Empleados</h3>
                <p className="text-sm text-gray-600">Gestionar atención</p>
              </div>
            </a>
          </Button>
          <Button variant="outline" asChild className="h-auto p-4 bg-transparent">
            <a href="/admin" className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6" />
              <div className="text-left">
                <h3 className="font-semibold">Administración</h3>
                <p className="text-sm text-gray-600">Configurar sistema</p>
              </div>
            </a>
          </Button>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-green-600 py-4 border-t border-green-200">
          <p>Próximos Turnos ZOCO - Versión 5.3</p>
          <p>© 2024 Todos los derechos reservados</p>
        </footer>
      </div>
    </div>
  )
}
