"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Clock, RefreshCw, TrendingUp } from "lucide-react"

export default function ProximosPage() {
  const { estado, loading, error } = useSistemaEstado()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Actualizar la hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-lg text-gray-600">Cargando información...</p>
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
            <p className="text-sm text-gray-500">
              La página se actualizará automáticamente cuando se restablezca la conexión.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header con hora */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Próximos en Atención</h1>
          <div className="text-2xl text-gray-600 font-mono">{currentTime.toLocaleTimeString("es-ES")}</div>
          <p className="text-gray-500 mt-2">
            {currentTime.toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Número actual siendo atendido */}
        <Card className="mb-8 border-2 border-green-500 shadow-lg">
          <CardHeader className="bg-green-500 text-white">
            <CardTitle className="text-center text-2xl">Número Actual en Atención</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-9xl font-bold text-green-600 mb-4">
                {estado?.numeroLlamado ? estado.numeroLlamado.toString().padStart(3, "0") : "---"}
              </div>
              {estado?.numeroLlamado && estado.cola && estado.cola.length > 0 && (
                <div className="text-lg text-gray-600">Pase al mostrador de atención</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas y próximos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estadísticas del Día
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Personas en cola:</span>
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
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Último número:</span>
                <Badge variant="default" className="text-lg px-3 py-1">
                  {estado?.numeroActual || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Próximos 3 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Próximos en Ser Atendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estado?.cola && estado.cola.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {estado.cola.slice(0, 3).map((ticket, index) => {
                    const ticketData = typeof ticket === "string" ? JSON.parse(ticket) : ticket
                    return (
                      <div
                        key={index}
                        className={`
                          p-6 rounded-lg border-2 text-center transition-all
                          ${
                            index === 0
                              ? "border-yellow-400 bg-yellow-50 shadow-lg"
                              : index === 1
                                ? "border-blue-400 bg-blue-50"
                                : "border-gray-300 bg-gray-50"
                          }
                        `}
                      >
                        <div
                          className={`text-4xl font-bold mb-2 ${
                            index === 0 ? "text-yellow-600" : index === 1 ? "text-blue-600" : "text-gray-600"
                          }`}
                        >
                          {ticketData.numero.toString().padStart(3, "0")}
                        </div>
                        {ticketData.nombre && (
                          <div className="text-sm text-gray-600 mb-2 truncate">{ticketData.nombre}</div>
                        )}
                        <Badge
                          variant={index === 0 ? "default" : "secondary"}
                          className={index === 0 ? "bg-yellow-500" : ""}
                        >
                          {index === 0 ? "Siguiente" : `${index + 1}º en cola`}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No hay personas en la cola</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cola completa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cola Completa de Espera
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estado?.cola && estado.cola.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {estado.cola.map((ticket, index) => {
                  const ticketData = typeof ticket === "string" ? JSON.parse(ticket) : ticket
                  return (
                    <div
                      key={index}
                      className={`
                        p-3 rounded-lg border text-center transition-all
                        ${index < 3 ? "border-green-400 bg-green-50 shadow-md" : "border-gray-200 bg-white"}
                      `}
                    >
                      <div className={`text-xl font-bold ${index < 3 ? "text-green-600" : "text-gray-600"}`}>
                        {ticketData.numero.toString().padStart(3, "0")}
                      </div>
                      {ticketData.nombre && (
                        <div className="text-xs text-gray-500 mt-1 truncate">{ticketData.nombre}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">Posición {index + 1}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay personas esperando</p>
                <p className="text-gray-400">Los nuevos tickets aparecerán aquí automáticamente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm">Esta pantalla se actualiza automáticamente cada 3 segundos</p>
          <p className="text-xs mt-1">Sistema de Atención ZOCO - Versión 5.2</p>
        </div>
      </div>
    </div>
  )
}
