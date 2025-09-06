"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Volume2, VolumeX, RefreshCw, Users, Clock, TrendingUp } from "lucide-react"

export default function EmpleadosPage() {
  const { estado, llamarSiguiente, loading, error } = useSistemaEstado()
  const [sonidoActivado, setSonidoActivado] = useState(true)
  const [ultimoLlamado, setUltimoLlamado] = useState<number | null>(null)

  // Reproducir sonido cuando se llama a un nuevo número
  useEffect(() => {
    if (sonidoActivado && estado?.numeroLlamado && estado.numeroLlamado !== ultimoLlamado) {
      reproducirSonido()
      setUltimoLlamado(estado.numeroLlamado)
    }
  }, [estado?.numeroLlamado, sonidoActivado, ultimoLlamado])

  const reproducirSonido = () => {
    try {
      // Crear un sonido simple usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log("No se pudo reproducir el sonido:", error)
    }
  }

  const handleLlamarSiguiente = async () => {
    try {
      await llamarSiguiente()
    } catch (error) {
      console.error("Error al llamar siguiente:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600">Cargando panel de empleados...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Panel de Empleados</h1>
          <p className="text-gray-600">Sistema de Gestión de Cola de Atención</p>
        </div>

        {/* Controles principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Número actual llamado */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Número Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-8xl font-bold text-blue-600 mb-4">
                  {estado?.numeroLlamado ? estado.numeroLlamado.toString().padStart(3, "0") : "---"}
                </div>
                <p className="text-gray-600 mb-6">Número siendo atendido</p>
                <Button
                  onClick={handleLlamarSiguiente}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-xl"
                  disabled={!estado?.cola || estado.cola.length === 0}
                >
                  Llamar Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Controles de sonido y estadísticas */}
          <div className="space-y-6">
            {/* Control de sonido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuración</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setSonidoActivado(!sonidoActivado)}
                  variant={sonidoActivado ? "default" : "outline"}
                  className="w-full"
                >
                  {sonidoActivado ? (
                    <>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Sonido Activado
                    </>
                  ) : (
                    <>
                      <VolumeX className="mr-2 h-4 w-4" />
                      Sonido Desactivado
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Estadísticas rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">En cola:</span>
                  <Badge variant="secondary">{estado?.cola?.length || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Atendidos hoy:</span>
                  <Badge variant="secondary">{estado?.historial?.length || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Último generado:</span>
                  <Badge variant="outline">{estado?.numeroActual || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cola de espera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cola de Espera ({estado?.cola?.length || 0} personas)
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
                            ? "border-green-500 bg-green-50 shadow-lg"
                            : "border-gray-200 bg-white hover:border-blue-300"
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
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay personas en la cola</p>
                <p className="text-gray-400">Los nuevos tickets aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial reciente */}
        {estado?.historial && estado.historial.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Últimos Atendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {estado.historial.slice(0, 6).map((ticket, index) => {
                  const ticketData = typeof ticket === "string" ? JSON.parse(ticket) : ticket
                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                      <div className="text-xl font-semibold text-gray-600">
                        {ticketData.numero.toString().padStart(3, "0")}
                      </div>
                      {ticketData.nombre && <div className="text-xs text-gray-500 truncate">{ticketData.nombre}</div>}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
