"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TicketDisplay } from "@/components/TicketDisplay"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Clock, RefreshCw, Settings, UserPlus, Ticket, Monitor, BarChart3 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

export default function HomePage() {
  const { estado, generarTicket, loading, error } = useSistemaEstado()
  const [ticketGenerado, setTicketGenerado] = useState<TicketInfo | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [esMobile, setEsMobile] = useState(false)

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setEsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleGenerarTicket = async (nombre?: string) => {
    const ticket = await generarTicket(nombre)
    if (ticket) {
      setTicketGenerado(ticket)
    }
  }

  const handleGenerarConNombre = () => {
    setMostrarModal(true)
  }

  const handleConfirmarNombre = async (nombre: string) => {
    setMostrarModal(false)
    await handleGenerarTicket(nombre)
  }

  if (loading && !estado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-lg text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error de Conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/logo-rojo.png" alt="ZOCO Logo" width={60} height={60} className="rounded-lg" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">ZOCO</h1>
                <p className="text-sm text-gray-600">Sistema de Atención</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/empleados">
                <Button variant="outline" size="sm">
                  <Monitor className="mr-2 h-4 w-4" />
                  Empleados
                </Button>
              </Link>
              <Link href="/proximos">
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Próximos
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Sección principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Generación de tickets */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Generar Nuevo Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-red-600 mb-4">
                  {estado?.numeroActual ? (estado.numeroActual + 1).toString().padStart(3, "0") : "001"}
                </div>
                <p className="text-gray-600 mb-6">Próximo número disponible</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleGenerarTicket()}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white py-6 text-lg"
                  disabled={loading}
                >
                  <Ticket className="mr-2 h-5 w-5" />
                  Generar Ticket
                </Button>

                <Button
                  onClick={handleGenerarConNombre}
                  size="lg"
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 py-6 text-lg bg-transparent"
                  disabled={loading}
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Con Nombre
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>Conserve su ticket hasta ser atendido</p>
                <p>Será llamado por su número o nombre</p>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estado Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Número actual:</span>
                <Badge variant="default" className="text-lg px-3 py-1">
                  {estado?.numeroLlamado || "---"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">En cola:</span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {estado?.cola?.length || 0}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Atendidos hoy:</span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {estado?.historial?.length || 0}
                </Badge>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500 text-center">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Tiempo estimado: {estado?.cola ? Math.ceil(estado.cola.length * 3) : 0} min
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cola de espera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personas en Cola ({estado?.cola?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estado?.cola && estado.cola.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {estado.cola.slice(0, 12).map((ticket, index) => {
                  const ticketData = typeof ticket === "string" ? JSON.parse(ticket) : ticket
                  return (
                    <div
                      key={index}
                      className={`
                        p-4 rounded-lg border-2 text-center transition-all
                        ${
                          index === 0
                            ? "border-green-500 bg-green-50 shadow-lg animate-pulse-custom"
                            : "border-gray-200 bg-white hover:border-red-300"
                        }
                      `}
                    >
                      <div className={`text-2xl font-bold ${index === 0 ? "text-green-600" : "text-gray-700"}`}>
                        {ticketData.numero.toString().padStart(3, "0")}
                      </div>
                      {ticketData.nombre && (
                        <div className="text-sm text-gray-600 mt-1 truncate">{ticketData.nombre}</div>
                      )}
                      {index === 0 && <Badge className="mt-2 bg-green-600">Siguiente</Badge>}
                    </div>
                  )
                })}
                {estado.cola.length > 12 && (
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 text-center">
                    <div className="text-lg text-gray-500">+{estado.cola.length - 12}</div>
                    <div className="text-xs text-gray-400">más en cola</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay personas en la cola</p>
                <p className="text-gray-400">¡Genera tu ticket ahora!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información del sistema */}
        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm">Sistema de Atención ZOCO - Versión 5.2</p>
          <p className="text-xs mt-1">Actualización automática cada 3 segundos</p>
        </div>
      </div>

      {/* Modales */}
      {mostrarModal && <NombreModal onConfirm={handleConfirmarNombre} onCancel={() => setMostrarModal(false)} />}

      {ticketGenerado && (
        <TicketDisplay
          numero={ticketGenerado.numero}
          nombre={ticketGenerado.nombre}
          fecha={ticketGenerado.fecha}
          onClose={() => setTicketGenerado(null)}
          esMobile={esMobile}
        />
      )}
    </div>
  )
}
