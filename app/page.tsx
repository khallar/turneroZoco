"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Users, Clock, ArrowRight, Wifi, WifiOff } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { NombreModal } from "@/components/NombreModal"
import { TicketDisplay } from "@/components/TicketDisplay"

export default function PaginaPrincipal() {
  const { estado, loading, error, generarTicket, cargarEstado, ultimaSincronizacion } = useSistemaEstado()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ticketGenerado, setTicketGenerado] = useState<{ numero: number; nombre: string } | null>(null)
  const [horaActual, setHoraActual] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [ultimaActualizacionAutomatica, setUltimaActualizacionAutomatica] = useState<Date | null>(null)
  const [contadorActualizaciones, setContadorActualizaciones] = useState(0)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Actualizar datos automáticamente cada 10 segundos
  useEffect(() => {
    if (!isClient) return

    const actualizarAutomaticamente = async () => {
      try {
        console.log("Actualizando datos automáticamente (cliente - Upstash Redis)...")
        setUltimaActualizacionAutomatica(new Date())
        setContadorActualizaciones((prev) => prev + 1)
        await cargarEstado()
      } catch (error) {
        console.error("Error en actualización automática de cliente (Upstash Redis):", error)
      }
    }

    // Ejecutar inmediatamente al montar
    actualizarAutomaticamente()

    // Configurar intervalo
    const interval = setInterval(actualizarAutomaticamente, 10000) // 10 segundos

    return () => clearInterval(interval)
  }, [cargarEstado, isClient])

  // Verificar el estado de conexión después del montaje
  useEffect(() => {
    if (!isClient) return

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => {
      setIsOnline(true)
      // Cuando vuelve la conexión, actualizar inmediatamente
      console.log("Conexión restaurada (Upstash Redis), actualizando datos...")
      cargarEstado()
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

  // Actualizar hora
  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleGenerarTicket = async (nombre: string) => {
    try {
      const nuevoTicket = await generarTicket(nombre)
      setTicketGenerado(nuevoTicket)
      // Forzar una recarga completa del estado después de generar un ticket
      // para asegurar que el cliente vea el nuevo ticket en la lista
      await cargarEstado()
    } catch (err) {
      alert(`Error al generar ticket: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const proximoNumeroALlamar = estado?.numerosLlamados + 1
  const numerosEnEspera = estado?.totalAtendidos - estado?.numerosLlamados

  // Filtrar tickets para mostrar solo los 5 más recientes y los 5 próximos
  const ticketsRecientes =
    estado?.tickets
      ?.filter((ticket) => ticket.numero <= estado.numerosLlamados)
      .slice(-5)
      .reverse() || []

  const ticketsEnEspera = estado?.tickets?.filter((ticket) => ticket.numero > estado.numerosLlamados).slice(0, 5) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-base md:text-lg text-gray-600">Cargando sistema de atención (Upstash Redis)...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header optimizado para móvil */}
        <div className="text-center mb-4 md:mb-8">
          <div className="mb-3 md:mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-16 md:h-24 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">Sistema de Atención ZOCO</h1>
          <p className="text-sm md:text-lg text-gray-600 mb-3 md:mb-4 px-2">
            ¡Bienvenido! Obtén tu número para ser atendido.
          </p>

          {/* Información de estado - compacta en móvil */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span>{horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>
                Última sync:{" "}
                {ultimaSincronizacion
                  ? ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Nunca"}
              </span>
              {actualizandoDatos && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 ml-1"></div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <span className="text-green-500">Online (Upstash Redis)</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                  <span className="text-red-500">Offline (Upstash Redis)</span>
                </>
              )}
            </div>
            {ultimaActualizacionAutomatica && (
              <div className="flex items-center gap-1">
                <span className="text-blue-600">
                  Última auto:{" "}
                  {ultimaActualizacionAutomatica.toLocaleTimeString("es-AR", {
                    timeZone: "America/Argentina/Buenos_Aires",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Botón de navegación a empleados */}
          <div className="flex justify-center">
            <a
              href="/empleados"
              className="inline-flex items-center justify-center px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base"
            >
              Panel de Empleados <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
            </a>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Tarjetas de estado principal - responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-8">
          <Card className="p-2 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Tu Número</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-blue-600">
                {ticketGenerado ? ticketGenerado.numero.toString().padStart(3, "0") : "---"}
              </div>
              {ticketGenerado && <p className="text-xs text-muted-foreground mt-1 truncate">{ticketGenerado.nombre}</p>}
            </CardContent>
          </Card>

          <Card className="p-2 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Atendiendo Ahora</CardTitle>
              <Phone className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-green-600">
                {estado?.numerosLlamados > 0 ? estado.numerosLlamados.toString().padStart(3, "0") : "---"}
              </div>
              {estado?.numerosLlamados > 0 && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {estado.tickets?.find((t) => t.numero === estado.numerosLlamados)?.nombre || "Cliente ZOCO"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="p-2 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">En Espera</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-orange-600">{numerosEnEspera}</div>
            </CardContent>
          </Card>
        </div>

        {/* Botón para obtener número */}
        <div className="text-center mb-4 md:mb-8">
          <Button
            onClick={() => setIsModalOpen(true)}
            size="lg"
            className="text-lg md:text-2xl px-8 md:px-16 py-4 md:py-8 h-auto bg-blue-600 hover:bg-blue-700 shadow-lg transform transition-transform hover:scale-105 w-full sm:w-auto"
          >
            <Phone className="mr-2 md:mr-4 h-5 w-5 md:h-8 md:w-8" />
            Obtener Número
          </Button>
        </div>

        {/* Tu número actual */}
        {ticketGenerado && (
          <Card className="mb-4 md:mb-8 border-blue-300 bg-blue-50">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-center text-lg md:text-2xl text-blue-800">Tu Número</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-3 md:p-6">
              <div className="text-5xl sm:text-7xl md:text-9xl font-bold text-blue-600 mb-3 md:mb-4 border-4 border-blue-600 rounded-lg py-4 md:py-8 mx-auto max-w-xs md:max-w-md">
                {ticketGenerado.numero.toString().padStart(3, "0")}
              </div>
              <p className="text-lg md:text-2xl font-semibold text-gray-700 mb-2">¡Hola, {ticketGenerado.nombre}!</p>
              <p className="text-md md:text-xl text-gray-600">
                Por favor, espera tu turno. El número actual en atención es:
              </p>
              <p className="text-3xl md:text-5xl font-bold text-green-600 mt-2">
                {estado?.numerosLlamados > 0 ? estado.numerosLlamados.toString().padStart(3, "0") : "---"}
              </p>
              {estado?.numerosLlamados > 0 && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {estado.tickets?.find((t) => t.numero === estado.numerosLlamados)?.nombre || "Cliente ZOCO"}
                </p>
              )}
              <p className="text-sm md:text-base text-gray-500 mt-4">Hay {numerosEnEspera} personas antes que tú.</p>
            </CardContent>
          </Card>
        )}

        {/* Listas de tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Últimos Llamados</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ticketsRecientes.length > 0 ? (
                  ticketsRecientes.map((ticket) => (
                    <TicketDisplay
                      key={ticket.numero}
                      numero={ticket.numero}
                      nombre={ticket.nombre}
                      isCurrent={ticket.numero === estado?.numerosLlamados}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">Aún no se han llamado números.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Próximos en Espera</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ticketsEnEspera.length > 0 ? (
                  ticketsEnEspera.map((ticket) => (
                    <TicketDisplay
                      key={ticket.numero}
                      numero={ticket.numero}
                      nombre={ticket.nombre}
                      isCurrent={false}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm">No hay tickets en espera.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <NombreModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleGenerarTicket} />

      {/* Footer */}
      <footer className="text-center mt-8 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p>Develop by: Karim :) | Versión 5.0</p>
        </div>
      </footer>
    </div>
  )
}
