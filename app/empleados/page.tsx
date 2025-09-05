"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import {
  Users,
  UserCheck,
  Clock,
  SkipForward,
  RotateCcw,
  Home,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
} from "lucide-react"

export default function EmpleadosPage() {
  const [mounted, setMounted] = useState(false)
  const [conectado, setConectado] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { estado, loading, error, cargarEstado, actualizarEstado, ultimaSincronizacion } = useSistemaEstado()

  useEffect(() => {
    setMounted(true)

    // Verificar conectividad
    const checkConnection = () => {
      setConectado(navigator.onLine)
    }

    checkConnection()
    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
    }
  }, [])

  // Auto-refresh cada 10 segundos si está habilitado
  useEffect(() => {
    if (!autoRefresh || !conectado) return

    const interval = setInterval(() => {
      cargarEstado()
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, conectado, cargarEstado])

  const llamarSiguiente = async () => {
    if (!estado) return

    const nuevoEstado = {
      ...estado,
      numerosLlamados: estado.numerosLlamados + 1,
    }

    await actualizarEstado(nuevoEstado)
  }

  const llamarAnterior = async () => {
    if (!estado || estado.numerosLlamados <= 0) return

    const nuevoEstado = {
      ...estado,
      numerosLlamados: estado.numerosLlamados - 1,
    }

    await actualizarEstado(nuevoEstado)
  }

  const saltarNumero = async () => {
    if (!estado) return

    const nuevoEstado = {
      ...estado,
      numerosLlamados: estado.numerosLlamados + 2,
    }

    await actualizarEstado(nuevoEstado)
  }

  const reiniciarContador = async () => {
    if (!confirm("¿Está seguro de reiniciar el contador? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REINICIAR_CONTADOR_DIARIO" }),
      })

      if (response.ok) {
        await cargarEstado()
        alert("Contador reiniciado exitosamente")
      } else {
        throw new Error("Error al reiniciar contador")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error al reiniciar contador")
    }
  }

  const actualizarManual = () => {
    if (conectado) {
      cargarEstado()
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de empleados...</p>
        </div>
      </div>
    )
  }

  const numeroActualLlamado = estado?.numerosLlamados || 0
  const siguienteNumero = numeroActualLlamado + 1
  const ticketsPendientes = (estado?.totalAtendidos || 0) - numeroActualLlamado

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Panel de Empleados ZOCO</h1>
                <p className="text-gray-600">Control de turnos y atención al cliente</p>
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
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-green-50 text-green-700" : ""}
              >
                {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Auto-refresh
              </Button>

              <Button variant="outline" size="sm" onClick={actualizarManual} disabled={!conectado}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>

              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </Button>
            </div>
          </div>

          {ultimaSincronizacion && (
            <div className="mt-4 text-sm text-gray-500">
              Última actualización: {ultimaSincronizacion.toLocaleTimeString("es-AR")}
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Número Actual */}
          <Card className="bg-gradient-to-br from-green-100 to-green-200 border-4 border-green-400 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <UserCheck className="h-8 w-8" />
                ATENDIENDO AHORA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="text-8xl font-black text-green-600 mb-4">
                {numeroActualLlamado.toString().padStart(3, "0")}
              </div>
              <div className="text-lg text-gray-700 mb-6">
                {numeroActualLlamado === 0 ? "Ningún cliente atendido aún" : `Cliente #${numeroActualLlamado}`}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={llamarSiguiente}
                  disabled={!conectado || siguienteNumero > (estado?.totalAtendidos || 0)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
                >
                  <ArrowUp className="mr-2 h-5 w-5" />
                  Llamar Siguiente (#{siguienteNumero.toString().padStart(3, "0")})
                </Button>

                <Button
                  onClick={llamarAnterior}
                  disabled={!conectado || numeroActualLlamado <= 0}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Volver Anterior
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Próximo Número */}
          <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-400 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Clock className="h-8 w-8" />
                PRÓXIMO TURNO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="text-8xl font-black text-blue-600 mb-4">
                {siguienteNumero.toString().padStart(3, "0")}
              </div>
              <div className="text-lg text-gray-700 mb-6">
                {siguienteNumero > (estado?.totalAtendidos || 0) ? "No hay más tickets" : `Siguiente en la fila`}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={saltarNumero}
                  disabled={!conectado || siguienteNumero + 1 > (estado?.totalAtendidos || 0)}
                  variant="outline"
                  className="w-full border-blue-400 text-blue-700"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Saltar Número
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-4 border-purple-400 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Users className="h-8 w-8" />
                ESTADÍSTICAS HOY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Tickets Emitidos:</span>
                  <span className="text-2xl font-bold text-purple-600">{estado?.totalAtendidos || 0}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Ya Atendidos:</span>
                  <span className="text-2xl font-bold text-green-600">{numeroActualLlamado}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Pendientes:</span>
                  <span className="text-2xl font-bold text-orange-600">{ticketsPendientes}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="font-medium text-gray-700">Progreso:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {estado?.totalAtendidos ? Math.round((numeroActualLlamado / estado.totalAtendidos) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button onClick={reiniciarContador} disabled={!conectado} variant="destructive" className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Día
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3">💡 Consejos de Uso</h3>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• Use "Llamar Siguiente" para avanzar al próximo cliente</li>
                <li>• "Volver Anterior" si necesita repetir un número</li>
                <li>• "Saltar Número" si un cliente no está presente</li>
                <li>• El auto-refresh mantiene los datos actualizados</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-300">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-blue-800 mb-3">📊 Estado del Sistema</h3>
              <div className="space-y-2 text-sm text-blue-700">
                <div>Fecha de inicio: {estado?.fechaInicio || "No disponible"}</div>
                <div>
                  Último reinicio:{" "}
                  {estado?.ultimoReinicio ? new Date(estado.ultimoReinicio).toLocaleString("es-AR") : "No disponible"}
                </div>
                <div>Conexión: {conectado ? "✅ Activa" : "❌ Desconectado"}</div>
                <div>Auto-refresh: {autoRefresh ? "✅ Activado" : "⏸️ Pausado"}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">Panel de Empleados ZOCO - Versión 5.3 | Develop by: Karim :)</p>
        </footer>
      </div>
    </div>
  )
}
