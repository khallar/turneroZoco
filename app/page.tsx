"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TicketDisplay } from "@/components/TicketDisplay"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Printer, Users, Clock, ArrowRight, Wifi, WifiOff, RefreshCw } from "lucide-react"

export default function PaginaPrincipal() {
  const { estado, loading, error, generarTicket, cargarEstado, ultimaSincronizacion, isClient, cacheStats } =
    useSistemaEstado("principal")

  const [nombre, setNombre] = useState("")
  const [ticketGenerado, setTicketGenerado] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [generandoTicket, setGenerandoTicket] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)

  // Verificar el estado de conexión después del montaje
  useEffect(() => {
    if (!isClient) return

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => {
      setIsOnline(true)
      console.log("Conexión restaurada, actualizando datos...")
      cargarEstado(false, true) // Forzar actualización sin estadísticas
    }
    const handleOffline = () => setIsOnline(false)

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [cargarEstado, isClient])

  // Actualizar hora cada minuto
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      setHoraActual(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [isClient])

  const confirmarTicket = async (nombreFinal: string) => {
    if (!nombreFinal.trim()) {
      alert("Por favor, ingresa un nombre válido")
      return
    }

    setGenerandoTicket(true)
    setMostrarModal(false)

    try {
      console.log("🎫 Intentando generar ticket para:", nombreFinal)
      const nuevoTicket = await generarTicket(nombreFinal.trim())

      if (!nuevoTicket) {
        throw new Error("No se recibió respuesta del servidor")
      }

      console.log("✅ Ticket generado exitosamente:", nuevoTicket)
      setTicketGenerado(nuevoTicket)
      setNombre("")

      // Actualizar el estado después de generar el ticket
      setTimeout(() => {
        cargarEstado(false, true) // Forzar actualización
      }, 1000)
    } catch (error) {
      console.error("❌ Error al generar ticket:", error)
      alert(`No se pudo crear el ticket: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setGenerandoTicket(false)
    }
  }

  const actualizarDatosManual = async () => {
    setActualizandoDatos(true)
    try {
      console.log("Actualizando datos manualmente...")
      await cargarEstado(false, true) // Forzar actualización sin estadísticas
    } catch (error) {
      console.error("Error al actualizar datos:", error)
    } finally {
      setActualizandoDatos(false)
    }
  }

  const manejarSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nombre.trim()) {
      setMostrarModal(true)
    } else {
      alert("Por favor, ingresa tu nombre")
    }
  }

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando sistema de turnos (Cache Optimizado)...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-32 md:h-40 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">Sistema de Atención</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-6">Saca tu número y espera tu turno</p>

          {/* Información de estado */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>
                Última actualización:{" "}
                {ultimaSincronizacion
                  ? ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Nunca"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Online (Cache Optimizado)</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">Offline</span>
                </>
              )}
            </div>
            {/* Indicador de cache */}
            {cacheStats.totalEntries > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  📦 Cache: {cacheStats.totalEntries} entradas
                </span>
              </div>
            )}
          </div>

          {/* Información de debug para tickets */}
          {estado?.tickets && (
            <div className="text-xs text-gray-500 mb-4">
              📊 Tickets cargados: {estado.tickets.length} | Total esperado: {estado.totalAtendidos}
              {estado.tickets.length !== estado.totalAtendidos && (
                <span className="text-red-500 ml-2">⚠️ Inconsistencia detectada</span>
              )}
            </div>
          )}

          {/* Botón de actualización manual */}
          <div className="flex justify-center mb-6">
            <Button
              onClick={actualizarDatosManual}
              disabled={actualizandoDatos}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actualizandoDatos ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar Datos
                </>
              )}
            </Button>
          </div>

          {/* Enlaces de navegación */}
          <div className="flex justify-center gap-4 mb-8">
            <a
              href="/empleados"
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Panel Empleados
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="/proximos"
              className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ver Próximos Turnos
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="/admin"
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Panel Admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Formulario para sacar ticket */}
          <Card className="bg-white shadow-xl border-4 border-blue-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6" />
                Sacar Nuevo Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={manejarSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre" className="text-lg font-medium">
                    Tu Nombre
                  </Label>
                  <Input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ingresa tu nombre completo"
                    className="text-lg p-3 mt-2"
                    disabled={generandoTicket}
                    maxLength={50}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-xl py-6 bg-blue-600 hover:bg-blue-700 shadow-lg transform transition-transform hover:scale-105"
                  disabled={generandoTicket || !nombre.trim()}
                >
                  {generandoTicket ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Generando Ticket...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-3 h-6 w-6" />
                      Sacar Mi Ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Estadísticas del día */}
          <Card className="bg-white shadow-xl border-4 border-green-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Estado del Día
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Tickets Emitidos:</span>
                  <span className="text-3xl font-bold text-blue-600">{estado?.totalAtendidos || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Ya Llamados:</span>
                  <span className="text-3xl font-bold text-green-600">{estado?.numerosLlamados || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">En Espera:</span>
                  <span className="text-3xl font-bold text-orange-600">
                    {(estado?.totalAtendidos || 0) - (estado?.numerosLlamados || 0)}
                  </span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between items-center">
                  <span className="text-lg text-gray-600">Próximo Número:</span>
                  <span className="text-3xl font-bold text-purple-600">
                    #{(estado?.numerosLlamados + 1 || 1).toString().padStart(3, "0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mostrar ticket generado */}
        {ticketGenerado && (
          <div className="mb-8">
            <TicketDisplay ticket={ticketGenerado} onClose={() => setTicketGenerado(null)} />
          </div>
        )}

        {/* Mensaje de error si existe */}
        {error && (
          <Card className="mb-6 bg-red-50 border-2 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600 text-center">⚠️ {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Modal de confirmación de nombre */}
        <NombreModal
          isOpen={mostrarModal}
          onClose={() => setMostrarModal(false)}
          onConfirm={confirmarTicket}
          nombreInicial={nombre}
        />

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 5.1 | Cache Optimizado - Menos consultas DB</p>
            <p className="mt-1">Sistema de turnos inteligente con cache compartido entre páginas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
