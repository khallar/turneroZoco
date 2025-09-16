"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Clock, Users, TrendingUp, Calendar } from "lucide-react"

export default function ProximosPage() {
  const { estado, loading, error } = useSistemaEstado()
  const [horaActual, setHoraActual] = useState<string>("")

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString("es-AR"))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información de turnos...</p>
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
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calcular próximos números
  const numeroActualLlamado = estado.numerosLlamados
  const proximosNumeros = []

  for (let i = 1; i <= 5; i++) {
    const numeroProximo = numeroActualLlamado + i
    if (numeroProximo <= estado.totalAtendidos) {
      proximosNumeros.push(numeroProximo)
    }
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados
  const eficiencia = estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/logo-rojo.png" alt="ZOCO" className="h-12 w-auto" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Próximos Turnos</h1>
                <p className="text-gray-500">Información para clientes en espera</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{horaActual}</div>
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
        {/* Número actual siendo atendido */}
        <div className="mb-8">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold text-red-800 mb-4">Atendiendo Ahora</h2>
              <div className="text-8xl font-bold text-red-600 mb-4">
                {numeroActualLlamado > 0 ? numeroActualLlamado.toString().padStart(3, "0") : "---"}
              </div>
              <p className="text-red-700 text-lg">
                {numeroActualLlamado > 0 ? "Número en atención" : "Esperando primer cliente"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-sm font-medium text-gray-600">Total Hoy</p>
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
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progreso</p>
                  <p className="text-3xl font-bold text-purple-600">{eficiencia}%</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos números */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Próximos en la Fila</CardTitle>
          </CardHeader>
          <CardContent>
            {proximosNumeros.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {proximosNumeros.map((numero, index) => (
                  <div
                    key={numero}
                    className={`text-center p-6 rounded-lg border-2 ${
                      index === 0 ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`text-4xl font-bold mb-2 ${index === 0 ? "text-green-600" : "text-gray-600"}`}>
                      {numero.toString().padStart(3, "0")}
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index === 0 ? "Siguiente" : `+${index + 1}`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">¡No hay más turnos en espera!</h3>
                <p className="text-gray-500">Todos los números han sido atendidos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tiempo Estimado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo promedio por cliente:</span>
                  <span className="font-medium">3-5 minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimado para próximo:</span>
                  <span className="font-medium">{proximosNumeros.length > 0 ? "3-5 minutos" : "Inmediato"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sistema:</span>
                  <Badge variant="default">Activo</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última actualización:</span>
                  <span className="font-medium">{horaActual}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Versión:</span>
                  <span className="font-medium">5.2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
