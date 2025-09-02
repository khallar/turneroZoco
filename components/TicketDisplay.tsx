"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, TrendingUp, Zap } from "lucide-react"

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

interface TicketDisplayProps {
  estado: EstadoSistema
  className?: string
}

export default function TicketDisplay({ estado, className = "" }: TicketDisplayProps) {
  const [horaActual, setHoraActual] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calcular estadísticas básicas
  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados
  const eficiencia = estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0

  // Obtener próximos tickets
  const proximosTickets = estado.tickets.slice(estado.numerosLlamados, estado.numerosLlamados + 5)

  // Calcular tiempo promedio entre tickets
  let tiempoPromedioEntreTickets = 0
  if (estado.tickets.length > 1) {
    const tiempos = []
    for (let i = 1; i < estado.tickets.length; i++) {
      const diff = estado.tickets[i].timestamp - estado.tickets[i - 1].timestamp
      if (diff > 0) tiempos.push(diff)
    }
    if (tiempos.length > 0) {
      tiempoPromedioEntreTickets = tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000 / 60 // en minutos
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Ticket Actual */}
      <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">Ticket Actual</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-8xl font-bold mb-4 animate-pulse">
            {estado.numerosLlamados > 0 ? estado.tickets[estado.numerosLlamados - 1]?.numero || "---" : "---"}
          </div>
          <div className="text-xl mb-2">
            {estado.numerosLlamados > 0
              ? estado.tickets[estado.numerosLlamados - 1]?.nombre || "Sin nombre"
              : "Esperando..."}
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white">
            {horaActual.toLocaleTimeString("es-AR", {
              timeZone: "America/Argentina/Buenos_Aires",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </Badge>
        </CardContent>
      </Card>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emitidos</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{estado.totalAtendidos}</div>
            <p className="text-xs opacity-80">Tickets del día</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{estado.numerosLlamados}</div>
            <p className="text-xs opacity-80">Procesados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Espera</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ticketsPendientes}</div>
            <p className="text-xs opacity-80">Pendientes</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <Zap className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{eficiencia}%</div>
            <p className="text-xs opacity-80">Tasa atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Próximos en Cola
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximosTickets.length > 0 ? (
            <div className="space-y-3">
              {proximosTickets.map((ticket, index) => (
                <div
                  key={ticket.numero}
                  className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                    index === 0
                      ? "bg-yellow-50 border-yellow-400"
                      : index === 1
                        ? "bg-blue-50 border-blue-400"
                        : "bg-gray-50 border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`text-2xl font-bold ${
                        index === 0 ? "text-yellow-600" : index === 1 ? "text-blue-600" : "text-gray-600"
                      }`}
                    >
                      #{ticket.numero.toString().padStart(3, "0")}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{ticket.nombre}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(ticket.timestamp).toLocaleTimeString("es-AR", {
                          timeZone: "America/Argentina/Buenos_Aires",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  {index === 0 && <Badge className="bg-yellow-500 text-white">Siguiente</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay tickets en cola</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métricas Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {Math.round(tiempoPromedioEntreTickets * 10) / 10} min
            </div>
            <p className="text-sm text-gray-600">Entre tickets emitidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Último Reinicio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-gray-800 mb-2">
              {new Date(estado.ultimoReinicio).toLocaleDateString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
            <p className="text-sm text-gray-600">
              {new Date(estado.ultimoReinicio).toLocaleTimeString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
