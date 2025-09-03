"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, Phone, Clock, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Wifi, WifiOff } from "lucide-react"

export default function PanelEmpleados() {
  const {
    estado,
    loading,
    error,
    llamarSiguiente,
    cargarEstado,
    obtenerProximosTurnos,
    ultimaSincronizacion,
    isClient,
    cacheStats,
  } = useSistemaEstado("empleados")

  const [llamandoSiguiente, setLlamandoSiguiente] = useState(false)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)

  // Verificar conexión
  useEffect(() => {
    if (!isClient) return

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => {
      setIsOnline(true)
      console.log("Conexión restaurada, actualizando datos...")
      cargarEstado(false, true)
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

  const manejarLlamarSiguiente = async () => {
    setLlamandoSiguiente(true)
    try {
      console.log("🔔 Llamando al siguiente número...")
      await llamarSiguiente()
      console.log("✅ Número llamado exitosamente")
    } catch (error) {
      console.error("❌ Error al llamar siguiente:", error)
      alert(`Error al llamar siguiente: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setLlamandoSiguiente(false)
    }
  }

  const actualizarDatosManual = async () => {
    setActualizandoDatos(true)
    try {
      console.log("Actualizando datos manualmente...")
      await cargarEstado(false, true) // Forzar actualización
    } catch (error) {
      console.error("Error al actualizar datos:", error)
    } finally {
      setActualizandoDatos(false)
    }
  }

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de empleados...</p>
        </div>
      </div>
    )
  }

  const proximosTurnos = obtenerProximosTurnos(8)
  const siguienteNumero = estado.numerosLlamados + 1
  const ticketsEnEspera = estado.totalAtendidos - estado.numerosLlamados

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Panel de Empleados</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
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
                    <span className="text-green-500">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
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
                  Actualizar
                </>
              )}
            </Button>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </a>
          </div>
        </div>

        {/* Debug info para tickets */}
        {estado?.tickets && (
          <div className="text-xs text-gray-500 mb-4 bg-gray-100 p-2 rounded">
            📊 Debug: {estado.tickets.length} tickets cargados | Total: {estado.totalAtendidos} | Llamados:{" "}
            {estado.numerosLlamados}
            {estado.tickets.length !== estado.totalAtendidos && (
              <span className="text-red-500 ml-2">⚠️ Inconsistencia detectada</span>
            )}
          </div>
        )}

        {/* Mensaje de error si existe */}
        {error && (
          <Card className="mb-6 bg-red-50 border-2 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600 text-center flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                ⚠️ {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Panel de control principal */}
          <Card className="lg:col-span-1 bg-white shadow-xl border-4 border-green-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Phone className="h-6 w-6" />
                Control de Turnos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Próximo número a llamar */}
                <div className="text-center">
                  <p className="text-lg text-gray-600 mb-2">Próximo a llamar:</p>
                  <div className="text-6xl font-bold text-green-600 mb-4">
                    #{siguienteNumero.toString().padStart(3, "0")}
                  </div>
                  {proximosTurnos.length > 0 && proximosTurnos[0] && (
                    <p className="text-xl text-gray-700 font-medium">{proximosTurnos[0].nombre}</p>
                  )}
                </div>

                {/* Botón principal */}
                <Button
                  onClick={manejarLlamarSiguiente}
                  disabled={llamandoSiguiente || ticketsEnEspera === 0}
                  size="lg"
                  className="w-full text-xl py-6 bg-green-600 hover:bg-green-700 shadow-lg transform transition-transform hover:scale-105"
                >
                  {llamandoSiguiente ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Llamando...
                    </>
                  ) : ticketsEnEspera === 0 ? (
                    <>
                      <CheckCircle className="mr-3 h-6 w-6" />
                      No hay turnos pendientes
                    </>
                  ) : (
                    <>
                      <Phone className="mr-3 h-6 w-6" />
                      Llamar Siguiente
                    </>
                  )}
                </Button>

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Emitidos</p>
                    <p className="text-2xl font-bold text-blue-600">{estado.totalAtendidos}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">En Espera</p>
                    <p className="text-2xl font-bold text-orange-600">{ticketsEnEspera}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de próximos turnos */}
          <Card className="lg:col-span-2 bg-white shadow-xl border-4 border-blue-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6" />
                Próximos Turnos ({proximosTurnos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {proximosTurnos.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-500">No hay turnos pendientes</p>
                  <p className="text-gray-400 mt-2">Todos los tickets han sido atendidos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proximosTurnos.map((turno, index) => (
                    <div
                      key={turno.numero}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        turno.esProximo
                          ? "bg-green-50 border-green-300 shadow-lg scale-105"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-2xl font-bold px-3 py-1 rounded-lg ${
                            turno.esProximo ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          #{turno.numero.toString().padStart(3, "0")}
                        </div>
                        <div>
                          <p className={`text-lg font-medium ${turno.esProximo ? "text-green-700" : "text-gray-700"}`}>
                            {turno.nombre}
                          </p>
                          <p className="text-sm text-gray-500">
                            {turno.esProximo ? "🔔 Próximo a llamar" : `Posición ${index + 1}`}
                          </p>
                        </div>
                      </div>
                      <div>{turno.esProximo && <Badge className="bg-green-500 text-white">SIGUIENTE</Badge>}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-blue-50 border-2 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{estado.totalAtendidos}</div>
              <p className="text-blue-700 font-medium">Tickets Emitidos Hoy</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-2 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{estado.numerosLlamados}</div>
              <p className="text-green-700 font-medium">Números Llamados</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-2 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{ticketsEnEspera}</div>
              <p className="text-orange-700 font-medium">En Espera</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Panel de Empleados - Sistema de Turnos | Cache: {cacheStats.totalEntries} entradas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
