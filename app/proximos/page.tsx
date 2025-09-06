"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TicketDisplay } from "@/components/TicketDisplay"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Clock, Users, RefreshCw, TrendingUp } from "lucide-react"

export default function ProximosPage() {
  const { estado, tickets, loading, error, refrescarEstado } = useSistemaEstado()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Auto-refresh cada 3 segundos
    const interval = setInterval(() => {
      refrescarEstado()
      setCurrentTime(new Date())
    }, 3000)

    return () => clearInterval(interval)
  }, [refrescarEstado])

  // Obtener tickets pendientes (no atendidos)
  const ticketsPendientes = tickets.slice(estado.numerosLlamados)
  const proximosTickets = ticketsPendientes.slice(0, 8) // Mostrar los próximos 8

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-xl text-gray-700">Cargando turnos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <Users className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Sistema Temporalmente No Disponible</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      {/* Header */}
      <div className="bg-red-600 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-full">
                <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Próximos Turnos</h1>
                <p className="text-red-100">Sistema de Atención al Cliente - ZOCO</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {currentTime.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-red-200">
                {currentTime.toLocaleDateString("es-AR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Turnos</p>
                  <p className="text-3xl font-bold text-gray-900">{estado.totalAtendidos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Atendidos</p>
                  <p className="text-3xl font-bold text-gray-900">{estado.numerosLlamados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En Espera</p>
                  <p className="text-3xl font-bold text-gray-900">{estado.totalAtendidos - estado.numerosLlamados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-600 text-white shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-red-100">Turno Actual</p>
                <p className="text-4xl font-bold">#{estado.numeroActual - 1 || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Turnos */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center justify-between">
              <span className="text-2xl text-gray-800">Próximos en Atención</span>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {proximosTickets.length} turnos en cola
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {proximosTickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {proximosTickets.map((ticket, index) => (
                  <div key={ticket.numero} className="relative">
                    {index === 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-600 text-white z-10 animate-pulse">
                        Siguiente
                      </Badge>
                    )}
                    {index < 3 && (
                      <Badge variant="outline" className="absolute -top-2 -left-2 z-10">
                        #{index + 1}
                      </Badge>
                    )}
                    <TicketDisplay ticket={ticket} isCurrentTicket={index === 0} showAnimation={index === 0} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <Clock className="h-16 w-16 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">No hay turnos pendientes</h3>
                <p className="text-gray-500 text-lg">Todos los turnos han sido atendidos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Último reinicio:</span>
                  <span className="font-medium">{new Date(estado.ultimoReinicio).toLocaleString("es-AR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha de inicio:</span>
                  <span className="font-medium">{estado.fechaInicio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado del sistema:</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Operativo
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Tiempo Estimado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo promedio por turno:</span>
                  <span className="font-medium">3-5 minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo estimado de espera:</span>
                  <span className="font-medium">
                    {proximosTickets.length > 0 ? `${Math.max(1, proximosTickets.length * 4)} minutos` : "Sin espera"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Actualización automática:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Cada 3 segundos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
