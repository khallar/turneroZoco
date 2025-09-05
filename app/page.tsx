"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketDisplay } from "@/components/TicketDisplay"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Clock, Ticket, Settings } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const { estado, generarTicket, loading, error } = useSistemaEstado()

  const [mostrarModal, setMostrarModal] = useState(false)
  const [nombre, setNombre] = useState("")

  const handleGenerarTicket = async () => {
    if (nombre.trim()) {
      await generarTicket(nombre.trim())
      setNombre("")
      setMostrarModal(false)
    }
  }

  const ticketsPendientes = estado?.tickets.filter((t) => !t.atendido) || []
  const ticketsAtendidos = estado?.tickets.filter((t) => t.atendido) || []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reintentar
          </Button>
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
              <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-10 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sistema de Turnos</h1>
                <p className="text-sm text-gray-600">ZOCO - Versión 5.3</p>
              </div>
            </div>
            <nav className="flex space-x-4">
              <Link href="/empleados">
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Empleados
                </Button>
              </Link>
              <Link href="/proximos">
                <Button variant="outline" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Próximos
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Display */}
            <TicketDisplay
              ticketLlamando={estado?.ticketLlamando}
              ultimoTicketAtendido={estado?.ultimoTicketAtendido}
            />

            {/* Generar Ticket */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="w-5 h-5 mr-2 text-red-600" />
                  Generar Nuevo Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre del Cliente</Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ingrese su nombre"
                      onKeyPress={(e) => e.key === "Enter" && nombre.trim() && handleGenerarTicket()}
                    />
                  </div>
                  <Button
                    onClick={handleGenerarTicket}
                    disabled={!nombre.trim()}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Generar Ticket #{(estado?.ticketActual || 0) + 1}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel Lateral */}
          <div className="space-y-6">
            {/* Estadísticas */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas del Día</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Tickets Generados:</span>
                  <span className="font-bold">{estado?.tickets.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tickets Atendidos:</span>
                  <span className="font-bold text-green-600">{ticketsAtendidos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>En Espera:</span>
                  <span className="font-bold text-orange-600">{ticketsPendientes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Empleados Activos:</span>
                  <span className="font-bold">{estado?.empleados.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tickets Pendientes */}
            <Card>
              <CardHeader>
                <CardTitle>Próximos en Cola</CardTitle>
              </CardHeader>
              <CardContent>
                {ticketsPendientes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay tickets pendientes</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {ticketsPendientes.slice(0, 10).map((ticket) => (
                      <div key={ticket.numero} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">#{ticket.numero}</span>
                        <span className="text-sm text-gray-600">{ticket.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <NombreModal
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        onSubmit={handleGenerarTicket}
        nombre={nombre}
        setNombre={setNombre}
      />
    </div>
  )
}
