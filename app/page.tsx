"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, UserPlus, Settings, Monitor } from "lucide-react"
import { NombreModal } from "@/components/NombreModal"
import { TicketDisplay } from "@/components/TicketDisplay"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import Image from "next/image"

export default function SistemaAtencion() {
  const [nombre, setNombre] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [ticketGenerado, setTicketGenerado] = useState<{ numero: number; nombre: string } | null>(null)
  const { estado, actualizarEstado, generarTicket, obtenerProximoTicket, obtenerTicketsEnEspera, obtenerTicketActual } =
    useSistemaEstado()

  const [ticketsEnEspera, setTicketsEnEspera] = useState(0)
  const [ticketActual, setTicketActual] = useState<{ numero: number; nombre: string } | null>(null)

  useEffect(() => {
    const cargarDatos = async () => {
      const enEspera = await obtenerTicketsEnEspera()
      const actual = await obtenerTicketActual()
      setTicketsEnEspera(enEspera)
      setTicketActual(actual)
    }

    cargarDatos()
    const interval = setInterval(cargarDatos, 2000)
    return () => clearInterval(interval)
  }, [obtenerTicketsEnEspera, obtenerTicketActual])

  const manejarGenerarTicket = async () => {
    if (!nombre.trim()) {
      setShowModal(true)
      return
    }

    try {
      const ticket = await generarTicket(nombre.trim())
      setTicketGenerado(ticket)
      setNombre("")

      // Actualizar contador
      const enEspera = await obtenerTicketsEnEspera()
      setTicketsEnEspera(enEspera)
    } catch (error) {
      console.error("Error al generar ticket:", error)
    }
  }

  const manejarNombreConfirmado = async (nombreConfirmado: string) => {
    try {
      const ticket = await generarTicket(nombreConfirmado)
      setTicketGenerado(ticket)
      setShowModal(false)

      // Actualizar contador
      const enEspera = await obtenerTicketsEnEspera()
      setTicketsEnEspera(enEspera)
    } catch (error) {
      console.error("Error al generar ticket:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Image src="/logo-rojo.png" alt="Logo ZOCO" width={120} height={120} className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-red-800">Sistema de Atención ZOCO</h1>
          <p className="text-red-600">Gestión inteligente de turnos</p>
        </div>

        {/* Estado del Sistema */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Monitor className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant={estado === "abierto" ? "default" : "secondary"} className="mb-2">
                  {estado === "abierto" ? "Abierto" : "Cerrado"}
                </Badge>
                <p className="text-sm text-gray-600">Sistema</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {ticketsEnEspera}
                </Badge>
                <p className="text-sm text-gray-600">En Espera</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">
                  {ticketActual ? `#${ticketActual.numero}` : "Ninguno"}
                </Badge>
                <p className="text-sm text-gray-600">Atendiendo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Actual */}
        {ticketActual && <TicketDisplay numero={ticketActual.numero} nombre={ticketActual.nombre} tipo="actual" />}

        {/* Generar Ticket */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <UserPlus className="h-5 w-5" />
              Solicitar Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre (opcional)</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese su nombre"
                className="border-red-200 focus:border-red-400"
                onKeyPress={(e) => e.key === "Enter" && manejarGenerarTicket()}
              />
            </div>
            <Button
              onClick={manejarGenerarTicket}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={estado === "cerrado"}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Generar Ticket
            </Button>
            {estado === "cerrado" && (
              <p className="text-sm text-red-600 text-center">
                El sistema está cerrado. No se pueden generar nuevos tickets.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ticket Generado */}
        {ticketGenerado && (
          <TicketDisplay numero={ticketGenerado.numero} nombre={ticketGenerado.nombre} tipo="generado" />
        )}

        {/* Enlaces de Administración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <a href="/empleados" className="flex items-center gap-3 text-red-700 hover:text-red-800">
                <Users className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Panel Empleados</h3>
                  <p className="text-sm text-gray-600">Gestionar atención</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card className="border-red-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <a href="/proximos" className="flex items-center gap-3 text-red-700 hover:text-red-800">
                <Clock className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Próximos Turnos</h3>
                  <p className="text-sm text-gray-600">Ver cola de espera</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card className="border-red-200 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <a href="/admin" className="flex items-center gap-3 text-red-700 hover:text-red-800">
                <Settings className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Administración</h3>
                  <p className="text-sm text-gray-600">Configurar sistema</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-red-600 py-4 border-t border-red-200">
          <p>Sistema de Atención ZOCO - Versión 5.3</p>
          <p>© 2024 Todos los derechos reservados</p>
        </footer>
      </div>

      {/* Modal para nombre */}
      <NombreModal isOpen={showModal} onClose={() => setShowModal(false)} onConfirm={manejarNombreConfirmado} />
    </div>
  )
}
