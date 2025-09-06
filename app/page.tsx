"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TicketDisplay } from "@/components/TicketDisplay"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Clock, TrendingUp, RefreshCw, Plus, Monitor, Settings, Printer } from "lucide-react"

export default function HomePage() {
  const { estado, tickets, loading, error, generarTicket, refrescarEstado } = useSistemaEstado()

  const [showNombreModal, setShowNombreModal] = useState(false)
  const [ultimoTicketGenerado, setUltimoTicketGenerado] = useState<any>(null)

  const handleGenerarTicket = async (nombre: string) => {
    const nuevoTicket = await generarTicket(nombre)
    if (nuevoTicket) {
      setUltimoTicketGenerado(nuevoTicket)
      setShowNombreModal(false)
    }
  }

  const imprimirTicket = () => {
    if (ultimoTicketGenerado) {
      const ventanaImpresion = window.open("", "_blank")
      if (ventanaImpresion) {
        ventanaImpresion.document.write(`
          <html>
            <head>
              <title>Ticket #${ultimoTicketGenerado.numero}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px;
                  background: white;
                }
                .ticket { 
                  border: 2px solid #dc2626; 
                  padding: 20px; 
                  margin: 20px auto;
                  max-width: 300px;
                  border-radius: 10px;
                }
                .numero { 
                  font-size: 48px; 
                  font-weight: bold; 
                  color: #dc2626; 
                  margin: 10px 0;
                }
                .nombre { 
                  font-size: 18px; 
                  margin: 10px 0;
                  font-weight: bold;
                }
                .fecha { 
                  font-size: 14px; 
                  color: #666; 
                  margin: 10px 0;
                }
                .logo {
                  font-size: 24px;
                  font-weight: bold;
                  color: #dc2626;
                  margin-bottom: 20px;
                }
              </style>
            </head>
            <body>
              <div class="ticket">
                <div class="logo">ZOCO</div>
                <div>Su turno es:</div>
                <div class="numero">#${ultimoTicketGenerado.numero}</div>
                <div class="nombre">${ultimoTicketGenerado.nombre}</div>
                <div class="fecha">${ultimoTicketGenerado.fecha}</div>
                <div style="margin-top: 20px; font-size: 12px; color: #666;">
                  Conserve este ticket hasta ser atendido
                </div>
              </div>
            </body>
          </html>
        `)
        ventanaImpresion.document.close()
        ventanaImpresion.print()
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-xl text-gray-700">Cargando sistema...</p>
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
            <h2 className="text-2xl font-semibold mb-4">Sistema No Disponible</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={refrescarEstado} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
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
                <h1 className="text-3xl font-bold">Sistema de Turnos ZOCO</h1>
                <p className="text-red-100">Atención al Cliente</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => window.open("/empleados", "_blank")}
                variant="secondary"
                className="bg-white text-red-600 hover:bg-red-50"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Panel Empleados
              </Button>
              <Button
                onClick={() => window.open("/proximos", "_blank")}
                variant="secondary"
                className="bg-white text-red-600 hover:bg-red-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Próximos Turnos
              </Button>
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
                  <p className="text-sm font-medium text-gray-600">Total Turnos</p>
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
                <p className="text-sm font-medium text-red-100">Próximo Turno</p>
                <p className="text-4xl font-bold">#{estado.numeroActual}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generar Nuevo Turno */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800 flex items-center">
                <Plus className="h-6 w-6 mr-2 text-red-600" />
                Generar Nuevo Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <div className="bg-red-50 p-8 rounded-lg">
                  <div className="text-6xl font-bold text-red-600 mb-2">#{estado.numeroActual}</div>
                  <p className="text-gray-600">Su próximo número de turno</p>
                </div>

                <Button
                  onClick={() => setShowNombreModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 text-lg font-semibold"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Solicitar Turno
                </Button>

                {ultimoTicketGenerado && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-medium">¡Turno generado exitosamente!</p>
                        <p className="text-green-600">
                          Turno #{ultimoTicketGenerado.numero} - {ultimoTicketGenerado.nombre}
                        </p>
                      </div>
                      <Button
                        onClick={imprimirTicket}
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300 hover:bg-green-100 bg-transparent"
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Último Ticket Generado */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800">Último Turno Generado</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {ultimoTicketGenerado ? (
                <TicketDisplay ticket={ultimoTicketGenerado} />
              ) : tickets.length > 0 ? (
                <TicketDisplay ticket={tickets[tickets.length - 1]} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No hay turnos generados</p>
                  <p className="text-sm">Genere el primer turno del día</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enlaces Rápidos */}
        <div className="mt-8">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => window.open("/empleados", "_blank")}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Monitor className="h-6 w-6" />
                  <span>Panel de Empleados</span>
                </Button>

                <Button
                  onClick={() => window.open("/proximos", "_blank")}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Users className="h-6 w-6" />
                  <span>Próximos Turnos</span>
                </Button>

                <Button
                  onClick={() => window.open("/admin", "_blank")}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Settings className="h-6 w-6" />
                  <span>Administración</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información del Sistema */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estado:</span>
                  <Badge className="bg-green-100 text-green-800">Operativo</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{estado.fechaInicio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Último reinicio:</span>
                  <span className="font-medium text-sm">{new Date(estado.ultimoReinicio).toLocaleString("es-AR")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Estadísticas del Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Eficiencia:</span>
                  <span className="font-medium">
                    {estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo promedio:</span>
                  <span className="font-medium">3-5 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última actualización:</span>
                  <span className="font-medium text-sm">
                    {estado.lastSync ? new Date(estado.lastSync).toLocaleTimeString("es-AR") : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para nombre */}
      <NombreModal isOpen={showNombreModal} onClose={() => setShowNombreModal(false)} onSubmit={handleGenerarTicket} />
    </div>
  )
}
