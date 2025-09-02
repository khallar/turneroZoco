"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  ArrowRight,
  ArrowLeft,
  Clock,
  TrendingUp,
  Zap,
  Eye,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

export default function PaginaEmpleados() {
  const {
    estado,
    estadisticas,
    loading,
    error,
    cargarEstado,
    llamarSiguiente,
    ultimaSincronizacion,
    isClient,
    cacheStats,
  } = useSistemaEstado("empleados")

  const [procesando, setProcesando] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  useEffect(() => {
    if (isClient) {
      cargarEstado(true, true)
    }
  }, [isClient])

  // Actualizar hora cada segundo
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      setHoraActual(new Date())
    }, 1000)

    setHoraActual(new Date())
    return () => clearInterval(interval)
  }, [isClient])

  const manejarLlamarSiguiente = async () => {
    if (procesando) return

    setProcesando(true)
    try {
      await llamarSiguiente()
      setMostrarConfirmacion(false)
    } catch (error) {
      console.error("Error al llamar siguiente:", error)
      alert("Error al llamar el siguiente ticket")
    } finally {
      setProcesando(false)
    }
  }

  const confirmarLlamarSiguiente = () => {
    if (estado?.numerosLlamados >= estado?.totalAtendidos) {
      alert("No hay más tickets para llamar")
      return
    }
    setMostrarConfirmacion(true)
  }

  // Calcular métricas para empleados
  const calcularMetricasEmpleados = () => {
    if (!estado?.tickets || estado.tickets.length === 0) {
      return {
        ticketsPorHora: 0,
        tiempoPromedioAtencion: 0,
        eficienciaActual: 0,
        ticketsRestantes: 0,
        tiempoEstimadoFinalizacion: "N/A",
      }
    }

    const ahora = new Date()
    const inicioOperaciones = new Date(estado.fechaInicio)
    const tiempoOperacionHoras = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60 * 60)

    const ticketsPorHora = tiempoOperacionHoras > 0 ? estado.numerosLlamados / tiempoOperacionHoras : 0
    const tiempoPromedioAtencion = estado.numerosLlamados > 0 ? (tiempoOperacionHoras * 60) / estado.numerosLlamados : 0
    const eficienciaActual = estado.totalAtendidos > 0 ? (estado.numerosLlamados / estado.totalAtendidos) * 100 : 0
    const ticketsRestantes = estado.totalAtendidos - estado.numerosLlamados

    let tiempoEstimadoFinalizacion = "N/A"
    if (ticketsPorHora > 0 && ticketsRestantes > 0) {
      const horasRestantes = ticketsRestantes / ticketsPorHora
      const finalizacion = new Date(ahora.getTime() + horasRestantes * 60 * 60 * 1000)
      tiempoEstimadoFinalizacion = finalizacion.toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    return {
      ticketsPorHora: Math.round(ticketsPorHora * 10) / 10,
      tiempoPromedioAtencion: Math.round(tiempoPromedioAtencion * 10) / 10,
      eficienciaActual: Math.round(eficienciaActual),
      ticketsRestantes,
      tiempoEstimadoFinalizacion,
    }
  }

  const metricas = calcularMetricasEmpleados()

  // Obtener próximos tickets
  const proximosTickets = estado?.tickets?.slice(estado.numerosLlamados, estado.numerosLlamados + 10) || []
  const ticketActual = estado?.numerosLlamados > 0 ? estado.tickets[estado.numerosLlamados - 1] : null
  const siguienteTicket = proximosTickets[0] || null

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de empleados (Cache Optimizado)...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error de Conexión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">No se pudo cargar el sistema de atención.</p>
            <Button onClick={() => cargarEstado(true, true)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-24 md:h-32 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Users className="h-8 w-8 md:h-12 md:w-12 text-green-600" />
            Panel de Empleados
          </h1>
          <p className="text-lg text-gray-600 mb-4">Gestión de atención al cliente (Cache Optimizado)</p>

          {/* Información de estado */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>
                Última sync:{" "}
                {ultimaSincronizacion
                  ? ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Nunca"}
              </span>
            </div>
            {cacheStats.totalEntries > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  📦 Cache: {cacheStats.totalEntries} entradas
                </span>
              </div>
            )}
          </div>

          {/* Botones de navegación */}
          <div className="flex justify-center gap-4">
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Tickets
            </a>
            <a
              href="/proximos"
              className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Próximos
            </a>
            <a
              href="/admin"
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Shield className="mr-2 h-4 w-4" />
              Administración
            </a>
          </div>
        </div>

        {/* Ticket Actual y Controles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Ticket Actual */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">Ticket Actual</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-8xl font-bold mb-4 animate-pulse">
                {ticketActual ? ticketActual.numero.toString().padStart(3, "0") : "---"}
              </div>
              <div className="text-xl mb-4">{ticketActual ? ticketActual.nombre : "Esperando primer ticket..."}</div>
              {ticketActual && (
                <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white">
                  Llamado:{" "}
                  {new Date(ticketActual.timestamp).toLocaleTimeString("es-AR", {
                    timeZone: "America/Argentina/Buenos_Aires",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Siguiente Ticket y Controles */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">Siguiente Ticket</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-6xl font-bold mb-4">
                {siguienteTicket ? siguienteTicket.numero.toString().padStart(3, "0") : "---"}
              </div>
              <div className="text-lg mb-6">{siguienteTicket ? siguienteTicket.nombre : "No hay más tickets"}</div>

              <Button
                onClick={confirmarLlamarSiguiente}
                disabled={procesando || !siguienteTicket}
                className="w-full bg-white text-blue-600 hover:bg-gray-100 text-xl py-4 font-bold"
              >
                {procesando ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-3 h-6 w-6" />
                    Llamar Siguiente
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas de Rendimiento */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.numerosLlamados}</div>
              <p className="text-xs opacity-80">de {estado?.totalAtendidos} total</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restantes</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metricas.ticketsRestantes}</div>
              <p className="text-xs opacity-80">En cola</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Velocidad</CardTitle>
              <Zap className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metricas.ticketsPorHora}</div>
              <p className="text-xs opacity-80">Tickets/hora</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metricas.eficienciaActual}%</div>
              <p className="text-xs opacity-80">Procesados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalización</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.tiempoEstimadoFinalizacion}</div>
              <p className="text-xs opacity-80">Estimada</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Próximos Tickets */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Próximos 10 Tickets en Cola
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosTickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proximosTickets.map((ticket, index) => (
                  <div
                    key={ticket.numero}
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 transition-all duration-200 ${
                      index === 0
                        ? "bg-yellow-50 border-yellow-400 shadow-md"
                        : index === 1
                          ? "bg-blue-50 border-blue-400"
                          : index === 2
                            ? "bg-green-50 border-green-400"
                            : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`text-3xl font-bold ${
                          index === 0
                            ? "text-yellow-600"
                            : index === 1
                              ? "text-blue-600"
                              : index === 2
                                ? "text-green-600"
                                : "text-gray-600"
                        }`}
                      >
                        #{ticket.numero.toString().padStart(3, "0")}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-lg">{ticket.nombre}</div>
                        <div className="text-sm text-gray-500">
                          Emitido:{" "}
                          {new Date(ticket.timestamp).toLocaleTimeString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {index === 0 && <Badge className="bg-yellow-500 text-white mb-2">SIGUIENTE</Badge>}
                      <div className="text-sm text-gray-500">Posición: {index + 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No hay tickets en cola</p>
                <p className="text-sm">Todos los tickets han sido atendidos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Confirmación */}
        {mostrarConfirmacion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Confirmar Llamada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-green-600 mb-2">
                    #{siguienteTicket?.numero.toString().padStart(3, "0")}
                  </div>
                  <div className="text-xl font-semibold text-gray-800 mb-2">{siguienteTicket?.nombre}</div>
                  <div className="text-sm text-gray-500">¿Llamar a este ticket?</div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setMostrarConfirmacion(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={procesando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={manejarLlamarSiguiente}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={procesando}
                  >
                    {procesando ? "Llamando..." : "Confirmar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Panel de Empleados v5.3</p>
            <p>Actualización automática cada 120s | Sistema optimizado con cache</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
