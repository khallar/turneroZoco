"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import NombreModal from "@/components/NombreModal"
import TicketDisplay from "@/components/TicketDisplay"
import {
  Users,
  Clock,
  Settings,
  Eye,
  Ticket,
  RefreshCw,
  Wifi,
  WifiOff,
  Calendar,
  Timer,
  TrendingUp,
} from "lucide-react"

interface TicketGenerado {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

export default function PaginaPrincipal() {
  const [mounted, setMounted] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [ticketGenerado, setTicketGenerado] = useState<TicketGenerado | null>(null)
  const [conectado, setConectado] = useState(true)
  const [horaActual, setHoraActual] = useState("")
  const [fechaActual, setFechaActual] = useState("")

  const { estado, loading, error, generarTicket, cargarEstado, ultimaSincronizacion, cacheStats } =
    useSistemaEstado("main")

  useEffect(() => {
    setMounted(true)

    // Verificar conectividad
    const checkConnection = () => {
      setConectado(navigator.onLine)
    }

    checkConnection()
    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    // Actualizar hora cada segundo
    const updateTime = () => {
      const now = new Date()
      setHoraActual(now.toLocaleTimeString("es-ES"))
      setFechaActual(
        now.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )
    }

    updateTime()
    const timeInterval = setInterval(updateTime, 1000)

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
      clearInterval(timeInterval)
    }
  }, [])

  const manejarGenerarTicket = async (nombre: string) => {
    try {
      const ticket = await generarTicket(nombre)
      if (ticket) {
        setTicketGenerado(ticket)
        setMostrarModal(false)
      }
    } catch (error) {
      console.error("Error al generar ticket:", error)
      alert("Error al generar el ticket. Por favor, intente nuevamente.")
    }
  }

  const actualizarManual = () => {
    if (conectado) {
      cargarEstado(true)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando sistema de turnos...</p>
          {cacheStats.totalEntries > 0 && (
            <p className="text-sm text-gray-500 mt-2">Cache: {cacheStats.totalEntries} entradas</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo-rojo.png"
                alt="Logo ZOCO"
                className="h-16 w-auto"
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(11%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(100%) contrast(120%)",
                }}
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Sistema de Turnos ZOCO</h1>
                <p className="text-gray-600">Gestión inteligente de atención al cliente</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {conectado ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Wifi className="h-5 w-5" />
                  <span className="text-sm font-medium">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <WifiOff className="h-5 w-5" />
                  <span className="text-sm font-medium">Sin conexión</span>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={actualizarManual} disabled={!conectado}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Información de fecha y hora */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{fechaActual}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>{horaActual}</span>
              {ultimaSincronizacion && (
                <span className="ml-4 text-xs text-gray-500">
                  Última sync: {ultimaSincronizacion.toLocaleTimeString("es-AR")}
                </span>
              )}
            </div>
          </div>

          {/* Indicador de cache */}
          {cacheStats.totalEntries > 0 && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                📦 Cache activo: {cacheStats.totalEntries} entradas
              </Badge>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600 text-center">⚠️ {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Generar Ticket */}
          <Card className="bg-gradient-to-br from-green-100 to-emerald-200 border-4 border-green-400 shadow-xl card-hover">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Ticket className="h-8 w-8" />
                SACAR TURNO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl font-black text-green-600 mb-2">
                  #{(estado?.numeroActual || 1).toString().padStart(3, "0")}
                </div>
                <p className="text-lg text-gray-700">Próximo número disponible</p>
              </div>

              <Button
                onClick={() => setMostrarModal(true)}
                disabled={!conectado}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xl py-4 btn-hover-effect"
                size="lg"
              >
                <Ticket className="mr-3 h-6 w-6" />
                Generar Ticket
              </Button>

              <p className="text-sm text-gray-600 mt-4">Haga clic para obtener su número de turno</p>
            </CardContent>
          </Card>

          {/* Estado Actual */}
          <Card className="bg-gradient-to-br from-blue-100 to-cyan-200 border-4 border-blue-400 shadow-xl card-hover">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Users className="h-8 w-8" />
                ESTADO ACTUAL
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Último Ticket:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    #{(estado?.ultimoNumero || 0).toString().padStart(3, "0")}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Total Emitidos:</span>
                  <span className="text-2xl font-bold text-green-600">{estado?.totalAtendidos || 0}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Atendidos:</span>
                  <span className="text-2xl font-bold text-purple-600">{estado?.numerosLlamados || 0}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">En Espera:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {(estado?.totalAtendidos || 0) - (estado?.numerosLlamados || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="bg-gradient-to-br from-purple-100 to-pink-200 border-4 border-purple-400 shadow-xl card-hover">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <TrendingUp className="h-8 w-8" />
                ACCIONES
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <a
                  href="/proximos"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 btn-hover-effect"
                >
                  <Eye className="h-5 w-5" />
                  Ver Próximos Turnos
                </a>

                <a
                  href="/empleados"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 btn-hover-effect"
                >
                  <Users className="h-5 w-5" />
                  Panel Empleados
                </a>

                <a
                  href="/admin"
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 btn-hover-effect"
                >
                  <Settings className="h-5 w-5" />
                  Administración
                </a>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Eficiencia hoy:</span>
                  <span className="font-bold text-purple-600">
                    {estado?.totalAtendidos
                      ? Math.round(((estado.numerosLlamados || 0) / estado.totalAtendidos) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información del Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Información del Día
              </h3>
              <div className="space-y-2 text-sm text-yellow-700">
                <div>Inicio de operaciones: {estado?.fechaInicio || "No disponible"}</div>
                <div>
                  Último reinicio:{" "}
                  {estado?.ultimoReinicio ? new Date(estado.ultimoReinicio).toLocaleString("es-AR") : "No disponible"}
                </div>
                <div>Estado del sistema: {conectado ? "✅ Operativo" : "❌ Desconectado"}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-300">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Rendimiento
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <div>
                  Tiempo promedio:{" "}
                  {estado?.tickets && estado.tickets.length > 1
                    ? `${Math.round(
                        (estado.tickets[estado.tickets.length - 1].timestamp - estado.tickets[0].timestamp) /
                          estado.tickets.length /
                          1000 /
                          60,
                      )} min`
                    : "Calculando..."}
                </div>
                <div>
                  Tickets por hora:{" "}
                  {estado?.tickets ? estado.tickets.filter((t) => Date.now() - t.timestamp < 60 * 60 * 1000).length : 0}
                </div>
                <div>Cache optimizado: {cacheStats.totalEntries > 0 ? "✅ Activo" : "⏸️ Inactivo"}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Sistema de Turnos ZOCO - Versión 5.3 | Develop by: Karim :) | Cache Inteligente Activado
          </p>
        </footer>
      </div>

      {/* Modales */}
      {mostrarModal && <NombreModal onConfirm={manejarGenerarTicket} onCancel={() => setMostrarModal(false)} />}

      {ticketGenerado && (
        <TicketDisplay
          numero={ticketGenerado.numero}
          nombre={ticketGenerado.nombre}
          fecha={ticketGenerado.fecha}
          onClose={() => setTicketGenerado(null)}
        />
      )}
    </div>
  )
}
