"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { ArrowLeft, Clock, Users, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function ProximosPage() {
  const { estado, loading, error } = useSistemaEstado()

  const ticketsPendientes = estado?.tickets.filter((t) => !t.atendido) || []
  const ticketsAtendidos = estado?.tickets.filter((t) => t.atendido) || []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Próximos Turnos</h1>
                <p className="text-sm text-gray-600">ZOCO - Versión 5.3</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">Error: {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tickets Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-600" />
                En Espera ({ticketsPendientes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay tickets en espera</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {ticketsPendientes.map((ticket, index) => (
                    <div
                      key={ticket.numero}
                      className={`p-4 rounded-lg border-l-4 ${
                        index === 0 ? "bg-orange-50 border-orange-500" : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">#{ticket.numero}</h3>
                          <p className="text-gray-600">{ticket.nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{new Date(ticket.timestamp).toLocaleTimeString()}</p>
                          {index === 0 && (
                            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full mt-1">
                              Próximo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tickets Atendidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Atendidos Hoy ({ticketsAtendidos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsAtendidos.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay tickets atendidos</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {ticketsAtendidos
                    .sort((a, b) => (b.tiempoAtencion || 0) - (a.tiempoAtencion || 0))
                    .map((ticket) => (
                      <div key={ticket.numero} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-lg">#{ticket.numero}</h3>
                            <p className="text-gray-600">{ticket.nombre}</p>
                            <p className="text-sm text-green-600">Atendido por: {ticket.empleado}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {ticket.tiempoAtencion ? new Date(ticket.tiempoAtencion).toLocaleTimeString() : "N/A"}
                            </p>
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full mt-1">
                              Completado
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas Rápidas */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-2xl font-bold text-blue-600">{estado?.tickets.length || 0}</h3>
                <p className="text-sm text-gray-600">Total Generados</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h3 className="text-2xl font-bold text-orange-600">{ticketsPendientes.length}</h3>
                <p className="text-sm text-gray-600">En Espera</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-2xl font-bold text-green-600">{ticketsAtendidos.length}</h3>
                <p className="text-sm text-gray-600">Atendidos</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-2xl font-bold text-purple-600">{estado?.empleados.length || 0}</h3>
                <p className="text-sm text-gray-600">Empleados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
