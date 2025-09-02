"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, ArrowLeft, Clock, Eye, Shield, RefreshCw, AlertCircle, CheckCircle, Timer, Zap } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

export default function PaginaProximos() {
  const { estado, estadisticas, loading, error, cargarEstado, ultimaSincronizacion, isClient, cacheStats } =
    useSistemaEstado("proximos")

  const [horaActual, setHoraActual] = useState(new Date())

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

  // Calcular métricas de espera
  const calcularMetricasEspera = () => {
    if (!estado?.tickets || estado.tickets.length === 0) {
      return {
        tiempoEsperaPromedio: 0,
        ticketsAdelante: 0,
        tiempoEstimadoEspera: "N/A",
        velocidadAtencion: 0,
      }
    }

    const ahora = new Date()
    const inicioOperaciones = new Date(estado.fechaInicio)
    const tiempoOperacionMinutos = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60)

    const velocidadAtencion = tiempoOperacionMinutos > 0 ? estado.numerosLlamados / tiempoOperacionMinutos : 0
    const ticketsAdelante = estado.totalAtendidos - estado.numerosLlamados

    let tiempoEstimadoEspera = "N/A"
    if (velocidadAtencion > 0 && ticketsAdelante > 0) {
      const minutosEspera = ticketsAdelante / velocidadAtencion
      if (minutosEspera < 60) {
        tiempoEstimadoEspera = `${Math.round(minutosEspera)} min`
      } else {
        const horas = Math.floor(minutosEspera / 60)
        const minutos = Math.round(minutosEspera % 60)
        tiempoEstimadoEspera = `${horas}h ${minutos}m`
      }
    }

    // Calcular tiempo promedio entre tickets
    let tiempoEsperaPromedio = 0
    if (estado.tickets.length > 1) {
      const tiempos = []
      for (let i = 1; i < estado.tickets.length; i++) {
        const diff = estado.tickets[i].timestamp - estado.tickets[i - 1].timestamp
        if (diff > 0) tiempos.push(diff)
      }
      if (tiempos.length > 0) {
        tiempoEsperaPromedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000 / 60 // en minutos
      }
    }

    return {
      tiempoEsperaPromedio: Math.round(tiempoEsperaPromedio * 10) / 10,
      ticketsAdelante,
      tiempoEstimadoEspera,
      velocidadAtencion: Math.round(velocidadAtencion * 60 * 10) / 10, // tickets por hora
    }
  }

  const metricas = calcularMetricasEspera()

  // Obtener tickets pendientes y atendidos
  const ticketsPendientes = estado?.tickets?.slice(estado.numerosLlamados) || []
  const ticketsAtendidos = estado?.tickets?.slice(0, estado.numerosLlamados) || []
  const ticketActual = ticketsAtendidos[ticketsAtendidos.length - 1] || null

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando vista de próximos (Cache Optimizado)...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
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
            <Eye className="h-8 w-8 md:h-12 md:w-12 text-purple-600" />
            Próximos Tickets
          </h1>
          <p className="text-lg text-gray-600 mb-4">Vista pública de tickets en espera (Cache Optimizado)</p>

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
              href="/empleados"
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users className="mr-2 h-4 w-4" />
              Panel Empleados
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

        {/* Ticket Actual */}
        <Card className="mb-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Atendiendo Ahora</CardTitle>
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

        {/* Estadísticas de Espera */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Cola</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metricas.ticketsAdelante}</div>
              <p className="text-xs opacity-80">Tickets esperando</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Estimado</CardTitle>
              <Timer className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.tiempoEstimadoEspera}</div>
              <p className="text-xs opacity-80">Espera aproximada</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Velocidad</CardTitle>
              <Zap className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metricas.velocidadAtencion}</div>
              <p className="text-xs opacity-80">Tickets/hora</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.numerosLlamados}</div>
              <p className="text-xs opacity-80">de {estado?.totalAtendidos} total</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Próximos Tickets */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Próximos en Cola ({ticketsPendientes.length} tickets)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsPendientes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ticketsPendientes.slice(0, 15).map((ticket, index) => {
                  const posicion = index + 1
                  const esProximo = index < 3
                  const tiempoEspera =
                    metricas.velocidadAtencion > 0
                      ? Math.round((posicion / (metricas.velocidadAtencion / 60)) * 10) / 10
                      : 0

                  return (
                    <div
                      key={ticket.numero}
                      className={`p-4 rounded-lg border-l-4 transition-all duration-200 ${
                        index === 0
                          ? "bg-yellow-50 border-yellow-400 shadow-lg"
                          : index === 1
                            ? "bg-blue-50 border-blue-400 shadow-md"
                            : index === 2
                              ? "bg-green-50 border-green-400 shadow-md"
                              : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
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
                        <div className="text-right">
                          {index === 0 && <Badge className="bg-yellow-500 text-white mb-1">SIGUIENTE</Badge>}
                          {index === 1 && <Badge className="bg-blue-500 text-white mb-1">2º TURNO</Badge>}
                          {index === 2 && <Badge className="bg-green-500 text-white mb-1">3º TURNO</Badge>}
                          <div className="text-sm text-gray-500">Posición: {posicion}</div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="font-semibold text-gray-800 text-lg mb-1">{ticket.nombre}</div>
                        <div className="text-sm text-gray-500">
                          Emitido:{" "}
                          {new Date(ticket.timestamp).toLocaleTimeString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {esProximo && tiempoEspera > 0 && (
                        <div className="bg-white p-2 rounded border">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">
                              Espera estimada: <strong>{tiempoEspera} min</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No hay tickets en cola</p>
                <p className="text-sm">Todos los tickets han sido atendidos</p>
              </div>
            )}

            {ticketsPendientes.length > 15 && (
              <div className="mt-6 text-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  +{ticketsPendientes.length - 15} tickets más en cola
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets Atendidos Recientes */}
        {ticketsAtendidos.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Últimos Atendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ticketsAtendidos
                  .slice(-6)
                  .reverse()
                  .map((ticket, index) => (
                    <div key={ticket.numero} className="p-3 rounded-lg bg-green-50 border-l-4 border-green-400">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-green-600">
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
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Vista Próximos v5.3</p>
            <p>Actualización automática cada 120s | Sistema optimizado con cache</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
