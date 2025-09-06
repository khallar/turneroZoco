"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TicketDisplay } from "@/components/TicketDisplay"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Clock, TrendingUp, RefreshCw } from "lucide-react"

export default function EmpleadosPage() {
  const { estado, tickets, loading, error, llamarSiguiente, reiniciarSistema, refrescarEstado } = useSistemaEstado()

  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refrescarEstado()
      }, 5000) // Refrescar cada 5 segundos

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refrescarEstado])

  const ticketActual = tickets.find((ticket) => ticket.numero === estado.numeroActual - 1)
  const proximosTickets = tickets.slice(estado.numeroActual - 1, estado.numeroActual + 4)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Users className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Error del Sistema</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refrescarEstado} className="w-full">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Empleados</h1>
              <p className="text-gray-600 mt-1">Sistema de gestión de turnos - ZOCO</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto-refresh
              </Button>
              <Button onClick={refrescarEstado} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{estado.totalAtendidos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Atendidos</p>
                  <p className="text-2xl font-bold text-gray-900">{estado.numerosLlamados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{estado.totalAtendidos - estado.numerosLlamados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Próximo: #{estado.numeroActual}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ticket Actual */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Ticket Actual</span>
                  <Button
                    onClick={llamarSiguiente}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={estado.numerosLlamados >= estado.totalAtendidos}
                  >
                    Llamar Siguiente
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketActual ? (
                  <TicketDisplay ticket={ticketActual} isCurrentTicket={true} showAnimation={true} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No hay tickets para atender</p>
                    <p className="text-sm">Los tickets aparecerán aquí cuando se generen</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Próximos Tickets */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Próximos en Cola</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {proximosTickets.length > 0 ? (
                    proximosTickets.map((ticket, index) => (
                      <div key={ticket.numero} className="relative">
                        {index === 0 && <Badge className="absolute -top-2 -right-2 bg-red-600">Siguiente</Badge>}
                        <TicketDisplay ticket={ticket} />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay tickets en cola</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controles de Administración */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Controles de Administración</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button onClick={reiniciarSistema} variant="destructive" className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reiniciar Sistema
                </Button>
                <Button onClick={() => window.open("/admin", "_blank")} variant="outline">
                  Panel de Administración
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
