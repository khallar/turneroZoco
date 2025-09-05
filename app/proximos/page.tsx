"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Clock, Home, Wifi, WifiOff, RefreshCw, UserCheck, Calendar, Timer } from "lucide-react"

export default function ProximosPage() {
  const [mounted, setMounted] = useState(false)
  const [conectado, setConectado] = useState(true)
  const [horaActual, setHoraActual] = useState("")
  const [fechaActual, setFechaActual] = useState("")

  const { estado, cargarEstado } = useSistemaEstado()

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

    // Auto-refresh cada 30 segundos
    const refreshInterval = setInterval(() => {
      if (conectado) {
        cargarEstado()
      }
    }, 30000)

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
      clearInterval(timeInterval)
      clearInterval(refreshInterval)
    }
  }, [conectado, cargarEstado])

  const actualizarManual = () => {
    if (conectado) {
      cargarEstado()
    }
  }

  const generarProximosNumeros = () => {
    const proximos = []
    const numeroActual = estado.numeroActual || 1
    const ultimoNumero = estado.ultimoNumero || 0

    // Mostrar hasta 10 números siguientes o hasta el último generado
    for (let i = numeroActual; i <= Math.min(numeroActual + 9, ultimoNumero); i++) {
      proximos.push(i)
    }

    return proximos
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const proximosNumeros = generarProximosNumeros()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-purple-600 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Próximos Turnos ZOCO</h1>
              <p className="text-sm text-gray-600">Pantalla de visualización para clientes</p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={actualizarManual}
              disabled={!conectado}
              className="flex items-center gap-2 bg-transparent"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Inicio
            </Button>
          </div>
        </div>
      </div>

      {/* Información de fecha y hora */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8" />
            <div>
              <div className="text-2xl font-bold">{fechaActual}</div>
              <div className="text-purple-200">Fecha actual</div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            <Timer className="h-8 w-8" />
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">{horaActual}</div>
              <div className="text-purple-200">Hora actual</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Número actual siendo atendido */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-2xl border-4 border-green-500 h-full">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-6">
                <CardTitle className="text-2xl font-black flex items-center justify-center gap-3">
                  <UserCheck className="h-8 w-8" />
                  ATENDIENDO AHORA
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-100 to-blue-100 border-4 border-green-400 rounded-2xl p-6">
                    <div className="text-6xl font-black text-green-600 mb-4">
                      {(estado.numeroActual || 1).toString().padStart(3, "0")}
                    </div>
                    <div className="text-xl font-bold text-blue-700 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                      {estado.nombreActual || `Cliente ${(estado.numeroActual || 1).toString().padStart(3, "0")}`}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <p className="text-yellow-800 font-bold">🔔 Por favor, acérquese al mostrador</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de próximos números */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-2xl border-4 border-purple-500 h-full">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-center py-6">
                <CardTitle className="text-2xl font-black flex items-center justify-center gap-3">
                  <Users className="h-8 w-8" />
                  PRÓXIMOS TURNOS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {proximosNumeros.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {proximosNumeros.map((numero, index) => (
                      <div
                        key={numero}
                        className={`
                          text-center p-4 rounded-xl border-2 font-bold text-2xl
                          ${
                            index === 0
                              ? "bg-yellow-100 border-yellow-400 text-yellow-800 animate-pulse"
                              : index < 3
                                ? "bg-orange-100 border-orange-400 text-orange-800"
                                : "bg-blue-100 border-blue-400 text-blue-800"
                          }
                        `}
                      >
                        {numero.toString().padStart(3, "0")}
                        {index === 0 && <div className="text-xs mt-1 font-normal">SIGUIENTE</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-600">No hay turnos pendientes</p>
                    <p className="text-sm text-gray-500 mt-2">Los próximos números aparecerán aquí automáticamente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Estadísticas adicionales */}
        <div className="max-w-6xl mx-auto mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white shadow-lg border-2 border-blue-300">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{estado.ultimoNumero || 0}</div>
                <div className="text-sm text-gray-600">Último Ticket</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-2 border-green-300">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{estado.totalTickets || 0}</div>
                <div className="text-sm text-gray-600">Total Generados</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-2 border-orange-300">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(0, (estado.ultimoNumero || 0) - (estado.numeroActual || 1))}
                </div>
                <div className="text-sm text-gray-600">En Espera</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-2 border-purple-300">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">5-10</div>
                <div className="text-sm text-gray-600">Tiempo Promedio (min)</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="max-w-6xl mx-auto mt-6">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-bold text-blue-800 mb-2">📢 Información Importante</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Mantenga su ticket visible</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Esté atento a su número</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Tiempo estimado: 5-10 min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p className="text-sm">
          © 2024 Próximos Turnos ZOCO - Versión 5.3 | Pantalla actualizada automáticamente cada 30 segundos
        </p>
      </footer>
    </div>
  )
}
