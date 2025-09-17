"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import TicketDisplay from "@/components/TicketDisplay"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Printer, Users, Clock, TrendingUp } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

export default function HomePage() {
  const { estado, loading, error, generarTicket } = useSistemaEstado()
  const [showModal, setShowModal] = useState(false)
  const [ultimoTicket, setUltimoTicket] = useState<TicketInfo | null>(null)
  const [generandoTicket, setGenerandoTicket] = useState(false)

  const handleGenerarTicket = async (nombre: string) => {
    setGenerandoTicket(true)
    try {
      const ticket = await generarTicket(nombre)
      if (ticket) {
        setUltimoTicket(ticket)
        setShowModal(false)

        // Auto-imprimir después de un breve delay
        setTimeout(() => {
          window.print()
        }, 500)
      }
    } catch (error) {
      console.error("Error al generar ticket:", error)
    } finally {
      setGenerandoTicket(false)
    }
  }

  const handleImprimirTicket = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sistema de turnos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Error de Conexión</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados
  const eficiencia = estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/logo-rojo.png" alt="ZOCO" className="h-12 w-auto" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sistema de Turnos</h1>
                <p className="text-gray-500">Tome su número y espere a ser llamado</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{new Date().toLocaleTimeString("es-AR")}</div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString("es-AR", {
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 no-print">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Próximo Número</p>
                  <p className="text-3xl font-bold text-red-600">{estado.numeroActual}</p>
                </div>
                <Users className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Espera</p>
                  <p className="text-3xl font-bold text-orange-600">{ticketsPendientes}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Atendidos Hoy</p>
                  <p className="text-3xl font-bold text-green-600">{estado.numerosLlamados}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Emitidos</p>
                  <p className="text-3xl font-bold text-blue-600">{estado.totalAtendidos}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generar ticket */}
          <Card className="no-print">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Solicitar Turno</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="text-6xl font-bold text-red-600 mb-4">
                {estado.numeroActual.toString().padStart(3, "0")}
              </div>
              <p className="text-gray-600 text-lg mb-6">
                Su próximo número será el <strong>{estado.numeroActual}</strong>
              </p>
              <Button
                onClick={() => setShowModal(true)}
                disabled={generandoTicket}
                size="lg"
                className="w-full text-lg py-6"
              >
                {generandoTicket ? "Generando..." : "Tomar Número"}
              </Button>

              {ticketsPendientes > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-orange-800">
                    <strong>{ticketsPendientes}</strong> personas esperando
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    Tiempo estimado: {ticketsPendientes * 3}-{ticketsPendientes * 5} minutos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Último ticket generado */}
          <Card>
            <CardHeader className="no-print">
              <CardTitle className="text-2xl text-center">Su Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              {ultimoTicket ? (
                <div className="space-y-4">
                  <TicketDisplay
                    numero={ultimoTicket.numero}
                    nombre={ultimoTicket.nombre}
                    fecha={ultimoTicket.fecha}
                    showActions={true}
                  />
                  <div className="text-center no-print">
                    <Button onClick={handleImprimirTicket} variant="outline" className="w-full bg-transparent">
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir Ticket
                    </Button>
                  </div>

                  {/* Información para impresión */}
                  <div className="print-only hidden text-center mt-4">
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600">Conserve este ticket hasta ser atendido</p>
                      <p className="text-xs text-gray-500 mt-2">Sistema de Turnos ZOCO - v5.2</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎫</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay ticket generado</h3>
                  <p className="text-gray-500">Haga clic en "Tomar Número" para generar su ticket</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <div className="mt-8 no-print">
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Estado del sistema:</span>
                  <span className="ml-2 text-green-600">● Activo</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Eficiencia hoy:</span>
                  <span className="ml-2">{eficiencia}%</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Versión:</span>
                  <span className="ml-2">5.2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para nombre */}
      <NombreModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleGenerarTicket}
        loading={generandoTicket}
      />
    </div>
  )
}
