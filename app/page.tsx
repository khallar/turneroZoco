"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Clock, TrendingUp, Shield, Eye, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import TicketDisplay from "@/components/TicketDisplay"
import { NombreModal } from "@/components/NombreModal"

export default function PaginaPrincipal() {
  const {
    estado,
    estadisticas,
    loading,
    error,
    cargarEstado,
    generarTicket,
    ultimaSincronizacion,
    isClient,
    cacheStats,
  } = useSistemaEstado("principal")

  const [nombre, setNombre] = useState("")
  const [generandoTicket, setGenerandoTicket] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
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

  const manejarGenerarTicket = async (nombreTicket: string) => {
    if (generandoTicket) return

    setGenerandoTicket(true)
    try {
      await generarTicket(nombreTicket)
      setNombre("")
      setMostrarModal(false)

      // Mostrar confirmación
      const audio = new Audio("/notification.mp3")
      audio.play().catch(() => {
        // Ignorar errores de audio
      })
    } catch (error) {
      console.error("Error al generar ticket:", error)
      alert(`Error al generar ticket: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setGenerandoTicket(false)
    }
  }

  const abrirModal = () => {
    setMostrarModal(true)
  }

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando sistema de atención (Cache Optimizado)...</p>
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
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={() => cargarEstado(true, true)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar Conexión
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
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-24 md:h-32 mx-auto animate-bounce-gentle"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-2 text-shadow">
            Sistema de Atención al Cliente
          </h1>
          <p className="text-lg text-gray-600 mb-4">Gestión inteligente de turnos (Cache Optimizado)</p>

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
          <div className="flex justify-center gap-4 mb-8">
            <a
              href="/empleados"
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users className="mr-2 h-4 w-4" />
              Panel Empleados
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

        {/* Formulario de Generación de Tickets */}
        <Card className="mb-8 bg-gradient-to-r from-white to-blue-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2 text-blue-800">
              <Plus className="h-6 w-6" />
              Generar Nuevo Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="nombre" className="text-lg font-semibold text-gray-700">
                  Nombre del Cliente
                </Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Ingrese su nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && nombre.trim()) {
                      abrirModal()
                    }
                  }}
                  className="mt-2 text-lg p-4 border-2 border-blue-200 focus:border-blue-500"
                  disabled={generandoTicket}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={abrirModal}
                  disabled={!nombre.trim() || generandoTicket}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 h-14"
                >
                  {generandoTicket ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Generar Ticket
                    </>
                  )}
                </Button>
              </div>
            </div>

            {estado && (
              <div className="mt-4 text-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Próximo número: #{estado.numeroActual.toString().padStart(3, "0")}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Hoy</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.totalAtendidos || 0}</div>
              <p className="text-xs opacity-80">Emitidos en el día</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.numerosLlamados || 0}</div>
              <p className="text-xs opacity-80">Tickets procesados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Espera</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(estado?.totalAtendidos || 0) - (estado?.numerosLlamados || 0)}</div>
              <p className="text-xs opacity-80">Pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {estado?.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0}%
              </div>
              <p className="text-xs opacity-80">Tasa de atención</p>
            </CardContent>
          </Card>
        </div>

        {/* Display de Tickets */}
        {estado && <TicketDisplay estado={estado} className="animate-fade-in" />}

        {/* Modal de Confirmación */}
        <NombreModal
          isOpen={mostrarModal}
          onClose={() => setMostrarModal(false)}
          onConfirm={manejarGenerarTicket}
          nombre={nombre}
          proximoNumero={estado?.numeroActual || 1}
          isGenerating={generandoTicket}
        />

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 5.3 | Sistema Optimizado</p>
            <p>Actualización automática cada 120s | Cache inteligente habilitado</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
