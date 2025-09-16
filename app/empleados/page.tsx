"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Play, RotateCcw, Users, Clock, TrendingUp } from "lucide-react"

export default function EmpleadosPage() {
  const { estado, loading, error, llamarSiguiente, reiniciarContador } = useSistemaEstado()
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>("")

  useEffect(() => {
    const interval = setInterval(() => {
      setUltimaActualizacion(new Date().toLocaleTimeString("es-AR"))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleLlamarSiguiente = async () => {
    try {
      await llamarSiguiente()
    } catch (error) {
      console.error("Error al llamar siguiente:", error)
    }
  }

  const handleReiniciar = async () => {
    if (confirm("¿Estás seguro de que quieres reiniciar el contador? Esta acción no se puede deshacer.")) {
      try {
        await reiniciarContador()
      } catch (error) {
        console.error("Error al reiniciar:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de empleados...</p>
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img src="/logo-rojo.png" alt="ZOCO" className="h-10 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Panel de Empleados</h1>
                <p className="text-sm text-gray-500">Sistema de Gestión de Turnos</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Última actualización</div>
              <div className="text-sm font-medium">{ultimaActualizacion}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Número Actual</p>
                  <p className="text-3xl font-bold text-red-600">{estado.numeroActual}</p>
                </div>
                <Play className="h-8 w-8 text-red-600" />
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Atendidos</p>
                  <p className="text-3xl font-bold text-green-600">{estado.numerosLlamados}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eficiencia</p>
                  <p className="text-3xl font-bold text-purple-600">{eficiencia}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de control principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Llamar siguiente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Llamar Siguiente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-red-600 mb-4">
                  {estado.numerosLlamados + 1 <= estado.totalAtendidos
                    ? (estado.numerosLlamados + 1).toString().padStart(3, "0")
                    : "---"}
                </div>
                <p className="text-gray-600 mb-6">
                  {estado.numerosLlamados + 1 <= estado.totalAtendidos
                    ? "Próximo número a llamar"
                    : "No hay más números en espera"}
                </p>
                <Button
                  onClick={handleLlamarSiguiente}
                  disabled={estado.numerosLlamados >= estado.totalAtendidos}
                  size="lg"
                  className="w-full"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Llamar Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estado del sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Estado del Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tickets pendientes:</span>
                <Badge variant={ticketsPendientes > 0 ? "default" : "secondary"}>{ticketsPendientes}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Último número:</span>
                <Badge variant="outline">{estado.ultimoNumero || "Ninguno"}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fecha de inicio:</span>
                <span className="text-sm font-medium">{new Date(estado.fechaInicio).toLocaleDateString("es-AR")}</span>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleReiniciar} variant="destructive" size="sm" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar Contador
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Versión:</span>
                  <span className="ml-2">5.2</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Estado:</span>
                  <Badge variant="default" className="ml-2">
                    Activo
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Última sincronización:</span>
                  <span className="ml-2">{ultimaActualizacion}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
