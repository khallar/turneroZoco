"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { ArrowLeft, UserPlus, UserMinus, Phone, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function EmpleadosPage() {
  const { estado, agregarEmpleado, eliminarEmpleado, llamarSiguiente, marcarAtendido, loading, error } =
    useSistemaEstado()

  const [nuevoEmpleado, setNuevoEmpleado] = useState("")
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("")

  const handleAgregarEmpleado = async () => {
    if (nuevoEmpleado.trim()) {
      await agregarEmpleado(nuevoEmpleado.trim())
      setNuevoEmpleado("")
    }
  }

  const handleLlamarSiguiente = async () => {
    if (empleadoSeleccionado) {
      await llamarSiguiente(empleadoSeleccionado)
    }
  }

  const handleMarcarAtendido = async () => {
    if (estado?.ticketLlamando && empleadoSeleccionado) {
      await marcarAtendido(estado.ticketLlamando, empleadoSeleccionado)
    }
  }

  const ticketsPendientes = estado?.tickets.filter((t) => !t.atendido) || []

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
                <h1 className="text-xl font-bold text-gray-900">Panel de Empleados</h1>
                <p className="text-sm text-gray-600">ZOCO - Versión 5.3</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">Error: {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gestión de Empleados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-red-600" />
                Gestión de Empleados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nuevoEmpleado">Agregar Empleado</Label>
                <div className="flex space-x-2">
                  <Input
                    id="nuevoEmpleado"
                    value={nuevoEmpleado}
                    onChange={(e) => setNuevoEmpleado(e.target.value)}
                    placeholder="Nombre del empleado"
                    onKeyPress={(e) => e.key === "Enter" && nuevoEmpleado.trim() && handleAgregarEmpleado()}
                  />
                  <Button onClick={handleAgregarEmpleado} disabled={!nuevoEmpleado.trim()}>
                    Agregar
                  </Button>
                </div>
              </div>

              <div>
                <Label>Empleados Activos ({estado?.empleados.length || 0})</Label>
                <div className="space-y-2 mt-2">
                  {estado?.empleados.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay empleados registrados</p>
                  ) : (
                    estado?.empleados.map((empleado) => (
                      <div key={empleado} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{empleado}</span>
                        <Button variant="destructive" size="sm" onClick={() => eliminarEmpleado(empleado)}>
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Atención de Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-red-600" />
                Atención de Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="empleadoSelect">Seleccionar Empleado</Label>
                <select
                  id="empleadoSelect"
                  value={empleadoSeleccionado}
                  onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Seleccione un empleado</option>
                  {estado?.empleados.map((empleado) => (
                    <option key={empleado} value={empleado}>
                      {empleado}
                    </option>
                  ))}
                </select>
              </div>

              {estado?.ticketLlamando && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Ticket Actual</h3>
                  <p className="text-2xl font-bold text-blue-600">#{estado.ticketLlamando}</p>
                  <Button
                    onClick={handleMarcarAtendido}
                    disabled={!empleadoSeleccionado}
                    className="mt-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Atendido
                  </Button>
                </div>
              )}

              <Button
                onClick={handleLlamarSiguiente}
                disabled={!empleadoSeleccionado || ticketsPendientes.length === 0}
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Llamar Siguiente Ticket
              </Button>

              <div>
                <Label>Tickets en Espera ({ticketsPendientes.length})</Label>
                <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                  {ticketsPendientes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay tickets pendientes</p>
                  ) : (
                    ticketsPendientes.slice(0, 5).map((ticket) => (
                      <div key={ticket.numero} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">#{ticket.numero}</span>
                        <span className="text-sm text-gray-600">{ticket.nombre}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
