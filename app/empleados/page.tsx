"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Users, Clock, ArrowLeft, CheckCircle, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import TicketDisplay from "@/components/TicketDisplay"

export default function PaginaEmpleados() {
  const { estado, estadisticas, loading, error, guardarEstado, cargarEstado, ultimaSincronizacion, cacheStats } =
    useSistemaEstado("empleados") // Especificar página empleados
  const [numeroEnAtencion, setNumeroEnAtencion] = useState(0)
  const [nombreEnAtencion, setNombreEnAtencion] = useState("")
  const [horaActual, setHoraActual] = useState(new Date())
  const [tiempoHastaReinicio, setTiempoHastaReinicio] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [ultimaActualizacionAutomatica, setUltimaActualizacionAutomatica] = useState<Date | null>(null)
  const [contadorActualizaciones, setContadorActualizaciones] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Verificar el estado de conexión después del montaje
  useEffect(() => {
    if (!isClient) return

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => {
      setIsOnline(true)
      // Cuando vuelve la conexión, actualizar inmediatamente
      console.log("Conexión restaurada (TURNOS_ZOCO), actualizando datos...")
      cargarEstado(true, true) // Forzar actualización
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

  // Actualizar hora y verificar reinicio automático
  useEffect(() => {
    const interval = setInterval(() => {
      const ahora = new Date()
      setHoraActual(ahora)
      setCurrentTime(ahora)

      // Calcular tiempo hasta las 12:00 AM del día siguiente
      const mañana = new Date(ahora)
      mañana.setDate(mañana.getDate() + 1)
      mañana.setHours(0, 0, 0, 0) // Exactamente medianoche

      const diferencia = mañana.getTime() - ahora.getTime()
      const horas = Math.floor(diferencia / (1000 * 60 * 60))
      const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))

      setTiempoHastaReinicio(`${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`)
    }, 60000)

    // Ejecutar inmediatamente
    const ahora = new Date()
    setHoraActual(ahora)
    setCurrentTime(ahora)
    const mañana = new Date(ahora)
    mañana.setDate(mañana.getDate() + 1)
    mañana.setHours(0, 0, 0, 0)
    const diferencia = mañana.getTime() - ahora.getTime()
    const horas = Math.floor(diferencia / (1000 * 60 * 60))
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
    setTiempoHastaReinicio(`${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`)

    return () => clearInterval(interval)
  }, [])

  const llamarSiguienteNumero = async () => {
    const proximoNumeroALlamar = estado.numerosLlamados + 1

    console.log("Intentando llamar número:", proximoNumeroALlamar)
    console.log("Total atendidos:", estado.totalAtendidos)
    console.log("Números ya llamados:", estado.numerosLlamados)

    if (proximoNumeroALlamar > estado.totalAtendidos) {
      alert("No hay más números en espera para llamar")
      return
    }

    // Buscar el ticket correspondiente
    const ticketALlamar = estado.tickets.find((ticket) => ticket.numero === proximoNumeroALlamar)
    console.log("Ticket encontrado:", ticketALlamar)

    const nuevoEstado = {
      ...estado,
      numerosLlamados: proximoNumeroALlamar,
    }

    await guardarEstado(nuevoEstado)
    setNumeroEnAtencion(proximoNumeroALlamar)
    setNombreEnAtencion(ticketALlamar?.nombre || "Cliente ZOCO")

    // Actualizar datos inmediatamente después de llamar (forzado)
    setTimeout(() => {
      cargarEstado(true, true)
    }, 500)
  }

  const actualizarDatosManual = async () => {
    setActualizandoDatos(true)
    try {
      console.log("Actualizando datos manualmente (TURNOS_ZOCO)...")
      await cargarEstado(true, true) // Forzar actualización con estadísticas
      setContadorActualizaciones((prev) => prev + 1)
    } catch (error) {
      console.error("Error al actualizar datos (TURNOS_ZOCO):", error)
    } finally {
      setActualizandoDatos(false)
    }
  }

  // Calcular estadísticas adicionales
  const calcularEstadisticasAvanzadas = () => {
    if (!estado.tickets || estado.tickets.length === 0) {
      return {
        eficiencia: 0,
        tiempoPromedioEspera: 0,
        ticketsPorHora: 0,
        horasPico: "Sin datos",
        porcentajeCompletado: 0,
        velocidadAtencion: 0,
        tiempoOperacion: 0,
      }
    }

    const ahora = new Date()
    const inicioOperaciones = new Date(estado.fechaInicio)
    const tiempoOperacion = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60 * 60) // en horas

    // Eficiencia: porcentaje de tickets atendidos vs emitidos
    const eficiencia = estado.totalAtendidos > 0 ? (estado.numerosLlamados / estado.totalAtendidos) * 100 : 0

    // Porcentaje completado
    const porcentajeCompletado = estado.totalAtendidos > 0 ? (estado.numerosLlamados / estado.totalAtendidos) * 100 : 0

    // Tickets por hora
    const ticketsPorHora = tiempoOperacion > 0 ? estado.totalAtendidos / tiempoOperacion : 0

    // Velocidad de atención (tickets atendidos por hora)
    const velocidadAtencion = tiempoOperacion > 0 ? estado.numerosLlamados / tiempoOperacion : 0

    // Tiempo promedio de espera estimado
    const tiempoPromedioEspera = estado.numerosLlamados > 0 ? (tiempoOperacion * 60) / estado.numerosLlamados : 0

    // Determinar horas pico basado en la actividad
    const horaActual = ahora.getHours()
    let horasPico = "Sin datos"
    if (estado.tickets.length > 10) {
      const ticketsPorHora = {}
      estado.tickets.forEach((ticket) => {
        const hora = new Date(ticket.fecha).getHours()
        ticketsPorHora[hora] = (ticketsPorHora[hora] || 0) + 1
      })
      const horaMasActiva = Object.keys(ticketsPorHora).reduce((a, b) =>
        ticketsPorHora[a] > ticketsPorHora[b] ? a : b,
      )
      horasPico = `${horaMasActiva}:00 - ${Number.parseInt(horaMasActiva) + 1}:00`
    }

    return {
      eficiencia: Math.round(eficiencia),
      tiempoPromedioEspera: Math.round(tiempoPromedioEspera),
      ticketsPorHora: Math.round(ticketsPorHora * 10) / 10,
      horasPico,
      porcentajeCompletado: Math.round(porcentajeCompletado),
      velocidadAtencion: Math.round(velocidadAtencion * 10) / 10,
      tiempoOperacion: Math.round(tiempoOperacion * 10) / 10,
    }
  }

  const estadisticasAvanzadas = calcularEstadisticasAvanzadas()

  const proximoNumeroALlamar = estado?.numerosLlamados + 1
  const numerosEnEspera = estado?.totalAtendidos - estado?.numerosLlamados
  const hayNumerosParaLlamar = proximoNumeroALlamar <= estado?.totalAtendidos

  // Obtener información del próximo ticket
  const proximoTicket = estado?.tickets?.find((ticket) => ticket.numero === proximoNumeroALlamar)

  const debugInfo = {
    estadoCompleto: estado,
    proximoNumeroCalculado: proximoNumeroALlamar,
    numerosEnEspera: numerosEnEspera,
    hayNumerosParaLlamar: hayNumerosParaLlamar,
    totalTicketsEnArray: estado?.tickets?.length || 0,
    ultimoTicketEnArray: estado?.tickets?.[estado.tickets.length - 1]?.numero || "N/A",
    cacheStats: cacheStats,
  }

  console.log("🔍 Debug info empleados:", debugInfo)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-base md:text-lg text-gray-600">Cargando panel de empleados (Cache Optimizado)...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-base md:text-lg text-red-600">Error: {error}</p>
        </div>
      </div>
    )
  }

  const ticketActual = estado?.tickets?.find((t) => t.numero === estado?.numeroActual)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-2 md:p-4">
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
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">Panel de Empleados</h1>
          <div className="text-xl text-gray-600">{currentTime.toLocaleString("es-ES")}</div>

          {/* Ticket Actual */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Atendiendo Ahora</h2>
            <div className="flex justify-center">
              <TicketDisplay
                numero={estado?.numeroActual}
                nombre={ticketActual?.nombre}
                className="transform scale-110"
              />
            </div>
          </div>

          {/* Próximos Tickets */}
          <div>
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Próximos en Cola</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {estado?.tickets
                .filter((t) => t.numero > estado?.numeroActual)
                .slice(0, 6)
                .map((ticket) => (
                  <TicketDisplay key={ticket.numero} numero={ticket.numero} nombre={ticket.nombre} />
                ))}
            </div>

            {estado?.tickets.filter((t) => t.numero > estado?.numeroActual).length === 0 && (
              <div className="text-center text-gray-500 text-xl">No hay tickets en cola</div>
            )}
          </div>

          {/* Estado del Sistema */}
          <div className="mt-8 text-center">
            <div
              className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${
                estado.activo ? "bg-green-500" : "bg-red-500"
              }`}
            >
              Sistema {estado.activo ? "Activo" : "Inactivo"}
            </div>
          </div>

          {/* Indicador de actualización automática optimizado */}
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
            <span className="text-xs text-gray-600">
              Auto-actualización optimizada cada 30s{" "}
              {contadorActualizaciones > 0 && `(${contadorActualizaciones} updates)`}
            </span>
            {/* Indicador de cache */}
            {cacheStats.totalEntries > 0 && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">📦 {cacheStats.totalEntries}</span>
            )}
          </div>

          {/* Botón de refresh manual */}
          <div className="flex justify-center mb-4">
            <Button
              onClick={actualizarDatosManual}
              disabled={actualizandoDatos}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
            >
              {actualizandoDatos ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar Ahora
                </>
              )}
            </Button>
          </div>
          <p className="text-sm md:text-lg text-gray-600 mb-3 md:mb-4 px-2">
            llamemos por el nombre y con una SONRISA :)
          </p>

          {/* Información de estado - compacta en móvil */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span>{horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Reinicio medianoche: {tiempoHastaReinicio}</span>
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
                  <span className="text-green-500">Online (Cache Optimizado)</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                  <span className="text-red-500">Offline</span>
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

          {/* Botones de navegación - stack en móvil */}
          <div className="flex justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
            >
              <ArrowLeft className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              Volver a Tickets
            </a>
          </div>
        </div>

        {/* Estadísticas principales - responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
          <Card className="p-2 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Emitidos</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-blue-600">{estado?.totalAtendidos}</div>
            </CardContent>
          </Card>

          <Card className="p-2 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Llamados</CardTitle>
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-green-600">{estado?.numerosLlamados}</div>
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

          <Card className="p-2 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Atendiendo</CardTitle>
              <Phone className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="text-xl md:text-3xl font-bold text-purple-600">
                {numeroEnAtencion > 0 ? numeroEnAtencion.toString().padStart(3, "0") : "---"}
              </div>
              {nombreEnAtencion && <p className="text-xs text-muted-foreground mt-1 truncate">{nombreEnAtencion}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
