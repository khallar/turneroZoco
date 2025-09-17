"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Play, RotateCcw, ArrowLeft } from "lucide-react"

export default function EmpleadosPage() {
  const { estado, loading, error, llamarSiguiente, reiniciarContador } = useSistemaEstado()
  const [horaActual, setHoraActual] = useState<string>("")

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString("es-AR"))
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
    if (confirm("¿Estás seguro de que quieres reiniciar el contador?")) {
      try {
        await reiniciarContador()
      } catch (error) {
        console.error("Error al reiniciar:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img src="/logo-rojo.png" alt="ZOCO" className="h-12" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel de Empleados</h1>
                <p className="text-gray-600">Control de turnos</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">{horaActual}</div>
              <div className="text-sm text-gray-500">{new Date().toLocaleDateString("es-AR")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Estadísticas simples */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-red-600">{estado.numeroActual}</div>
            <div className="text-sm text-gray-600">Número Actual</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-blue-600">{estado.totalAtendidos}</div>
            <div className="text-sm text-gray-600">Total Emitidos</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-green-600">{estado.numerosLlamados}</div>
            <div className="text-sm text-gray-600">Atendidos</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-orange-600">{estado.totalAtendidos - estado.numerosLlamados}</div>
            <div className="text-sm text-gray-600">En Espera</div>
          </div>
        </div>

        {/* Panel principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Llamar siguiente */}
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold mb-6">Llamar Siguiente</h2>
            <div className="text-8xl font-bold text-red-600 mb-6">
              {estado.numerosLlamados + 1 <= estado.totalAtendidos
                ? (estado.numerosLlamados + 1).toString().padStart(3, "0")
                : "---"}
            </div>
            <p className="text-gray-600 mb-8">
              {estado.numerosLlamados + 1 <= estado.totalAtendidos
                ? "Próximo número a llamar"
                : "No hay más números en espera"}
            </p>
            <Button
              onClick={handleLlamarSiguiente}
              disabled={estado.numerosLlamados >= estado.totalAtendidos}
              size="lg"
              className="w-full text-xl py-4 bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-5 w-5" />
              Llamar Siguiente
            </Button>
          </div>

          {/* Estado del sistema */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-6">Estado del Sistema</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Tickets pendientes:</span>
                <span className="font-bold">{estado.totalAtendidos - estado.numerosLlamados}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Último número:</span>
                <span className="font-bold">{estado.ultimoNumero || "Ninguno"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de inicio:</span>
                <span className="font-bold">{new Date(estado.fechaInicio).toLocaleDateString("es-AR")}</span>
              </div>
              <div className="pt-4 border-t">
                <Button onClick={handleReiniciar} variant="destructive" className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Contador
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="mt-8 text-center">
          <div className="space-x-4">
            <a href="/" className="inline-flex items-center text-blue-600 hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver a Inicio
            </a>
            <a href="/proximos" className="text-blue-600 hover:underline">
              Ver Próximos
            </a>
            <a href="/admin" className="text-blue-600 hover:underline">
              Administración
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
