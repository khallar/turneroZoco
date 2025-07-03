"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Phone,
  Users,
  Clock,
  ArrowLeft,
  CheckCircle,
  Wifi,
  WifiOff,
  User,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Timer,
  Activity,
} from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

export default function PaginaEmpleados() {
  const { estado, estadisticas, loading, error, guardarEstado, cargarEstado, ultimaSincronizacion } = useSistemaEstado()
  const [numeroEnAtencion, setNumeroEnAtencion] = useState(0)
  const [nombreEnAtencion, setNombreEnAtencion] = useState("")
  const [horaActual, setHoraActual] = useState(new Date())
  const [tiempoHastaReinicio, setTiempoHastaReinicio] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [ultimaActualizacionAutomatica, setUltimaActualizacionAutomatica] = useState<Date | null>(null)
  const [contadorActualizaciones, setContadorActualizaciones] = useState(0)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Actualizar datos automáticamente cada 5 segundos (reducido de 10)
  useEffect(() => {
    if (!isClient) return

    const actualizarAutomaticamente = async () => {
      try {
        console.log("Actualizando datos automáticamente...")
        setUltimaActualizacionAutomatica(new Date())
        setContadorActualizaciones((prev) => prev + 1)
        await cargarEstado(true) // Con estadísticas para el panel de empleados
      } catch (error) {
        console.error("Error en actualización automática:", error)
      }
    }

    // Ejecutar inmediatamente al montar
    actualizarAutomaticamente()

    // Configurar intervalo más frecuente
    const interval = setInterval(actualizarAutomaticamente, 5000) // 5 segundos

    return () => clearInterval(interval)
  }, [cargarEstado, isClient])

  // Actualizar datos cuando hay cambios en el estado (para detectar nuevos tickets más rápido)
  useEffect(() => {
    if (!isClient) return

    // Si hay tickets nuevos y no hay números para llamar, forzar actualización
    const proximoNumeroALlamar = estado?.numerosLlamados + 1
    const hayNumerosParaLlamar = proximoNumeroALlamar <= (estado?.totalAtendidos || 0)

    if (!hayNumerosParaLlamar && (estado?.totalAtendidos || 0) > 0) {
      console.log("Detectados posibles tickets nuevos, forzando actualización...")
      cargarEstado(true)
    }
  }, [estado?.totalAtendidos, estado?.numerosLlamados, cargarEstado, isClient])

  // Verificar el estado de conexión después del montaje
  useEffect(() => {
    if (!isClient) return

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => {
      setIsOnline(true)
      // Cuando vuelve la conexión, actualizar inmediatamente
      console.log("Conexión restaurada, actualizando datos...")
      cargarEstado(true)
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

    if (proximoNumeroALlamar > estado.totalAtendidos) {
      alert("No hay más números en espera para llamar")
      return
    }

    // Buscar el ticket correspondiente
    const ticketALlamar = estado.tickets.find((ticket) => ticket.numero === proximoNumeroALlamar)

    const nuevoEstado = {
      ...estado,
      numerosLlamados: proximoNumeroALlamar,
    }

    await guardarEstado(nuevoEstado)
    setNumeroEnAtencion(proximoNumeroALlamar)
    setNombreEnAtencion(ticketALlamar?.nombre || "Cliente ZOCO")

    // Actualizar datos inmediatamente después de llamar
    setTimeout(() => {
      cargarEstado(true)
    }, 500)
  }

  const actualizarDatosManual = async () => {
    setActualizandoDatos(true)
    try {
      console.log("Actualizando datos manualmente...")
      await cargarEstado(true) // Con estadísticas
      setContadorActualizaciones((prev) => prev + 1)
    } catch (error) {
      console.error("Error al actualizar datos:", error)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-base md:text-lg text-gray-600">Cargando panel de empleados...</p>
        </div>
      </div>
    )
  }

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

          {/* Indicador de actualización automática */}
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
            <span className="text-xs text-gray-600">
              Auto-actualización cada 5s {contadorActualizaciones > 0 && `(${contadorActualizaciones} updates)`}
            </span>
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
                  <span className="text-green-500">Online</span>
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

        {/* Próximo número a llamar - optimizado para móvil */}
        <Card className="mb-4 md:mb-8">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-center text-lg md:text-2xl flex items-center justify-center gap-2">
              Próximo a Llamar
              {!hayNumerosParaLlamar && (estado?.totalAtendidos || 0) > 0 && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center p-3 md:p-6">
            {hayNumerosParaLlamar ? (
              <div className="mb-4 md:mb-6">
                {/* Número grande - responsive */}
                <div className="text-4xl sm:text-6xl md:text-8xl font-bold text-green-600 mb-3 md:mb-4 border-4 border-green-600 rounded-lg py-4 md:py-8 mx-auto max-w-xs md:max-w-md">
                  {proximoNumeroALlamar.toString().padStart(3, "0")}
                </div>

                {/* Nombre del cliente - responsive */}
                {proximoTicket && (
                  <div className="mb-3 md:mb-4">
                    <div className="flex items-center justify-center gap-2 text-lg md:text-2xl font-bold text-blue-600 bg-blue-50 p-3 md:p-4 rounded-lg max-w-sm md:max-w-md mx-auto">
                      <User className="h-4 w-4 md:h-6 md:w-6 flex-shrink-0" />
                      <span className="truncate">{proximoTicket.nombre}</span>
                    </div>
                  </div>
                )}

                {/* Botón de llamar - más grande en móvil */}
                <Button
                  onClick={llamarSiguienteNumero}
                  size="lg"
                  className="text-lg md:text-2xl px-8 md:px-16 py-4 md:py-8 h-auto bg-green-600 hover:bg-green-700 shadow-lg transform transition-transform hover:scale-105 w-full sm:w-auto"
                >
                  <Phone className="mr-2 md:mr-4 h-5 w-5 md:h-8 md:w-8" />
                  <span className="truncate">
                    LLAMAR {proximoTicket ? proximoTicket.nombre.split(" ")[0] : "NÚMERO"}
                  </span>
                </Button>
              </div>
            ) : (
              <div className="py-8 md:py-12">
                <div className="text-4xl md:text-6xl text-gray-400 mb-4">---</div>
                <p className="text-lg md:text-xl text-gray-500 mb-4">
                  {(estado?.totalAtendidos || 0) === 0
                    ? "No hay números emitidos"
                    : "Todos los números han sido llamados"}
                </p>
                <p className="text-sm md:text-base text-gray-400">
                  {(estado?.totalAtendidos || 0) === 0 ? "Esperando nuevos tickets..." : "Esperando más tickets..."}
                </p>
                {(estado?.totalAtendidos || 0) > 0 && (
                  <Button
                    onClick={actualizarDatosManual}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                    disabled={actualizandoDatos}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verificar Nuevos Tickets
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen del día - stack en móvil */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 mb-4 md:mb-8">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3 p-3 md:p-6 pt-0">
              <div className="flex justify-between text-sm md:text-base">
                <span>Tickets emitidos hoy:</span>
                <span className="font-bold text-blue-600">{estado?.totalAtendidos}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span>Números ya llamados:</span>
                <span className="font-bold text-green-600">{estado?.numerosLlamados}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span>Números en espera:</span>
                <span className="font-bold text-orange-600">{numerosEnEspera}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span>Próximo a emitir:</span>
                <span className="font-bold text-purple-600">{estado?.numeroActual?.toString().padStart(3, "0")}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Últimos Llamados</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="space-y-2">
                {Array.from({ length: Math.min(5, estado?.numerosLlamados || 0) }, (_, i) => {
                  const numero = (estado?.numerosLlamados || 0) - i
                  const ticket = estado?.tickets?.find((t) => t.numero === numero)
                  return (
                    <div key={numero} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-bold">#{numero.toString().padStart(3, "0")}</span>
                        {ticket && (
                          <div className="text-xs md:text-sm text-blue-600 font-medium truncate">{ticket.nombre}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {i === 0 ? "Atendiendo" : "Atendido"}
                      </span>
                    </div>
                  )
                })}
                {(estado?.numerosLlamados || 0) === 0 && (
                  <p className="text-gray-500 text-center py-4 text-sm">Aún no se han llamado números</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instrucciones - compactas en móvil */}
        <Card className="border-green-200 bg-green-50 mb-6">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-green-800 text-base md:text-lg">📋 Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs md:text-sm p-3 md:p-6 pt-0">
            <div className="bg-white p-2 md:p-3 rounded border-l-4 border-green-400">
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>
                  <strong>Llamar:</strong> Presione el botón verde para llamar al siguiente cliente
                </li>
                <li>
                  <strong>Información:</strong> Ve número, nombre y estado de cada ticket
                </li>
                <li>
                  <strong>Persistencia:</strong> Los números se mantienen hasta las 12:00 AM
                </li>
                <li>
                  <strong>Actualización:</strong> Se actualiza automáticamente cada 5 segundos
                </li>
                <li>
                  <strong>Manual:</strong> Use "Actualizar Ahora" si no ve tickets nuevos
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas Avanzadas del Día */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2 text-indigo-800">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />📊 Estadísticas Avanzadas del Día
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Eficiencia */}
              <div className="bg-white p-3 md:p-4 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs md:text-sm font-medium text-gray-600">Eficiencia</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-green-600">{estadisticasAvanzadas.eficiencia}%</div>
                <p className="text-xs text-gray-500">Tickets atendidos vs emitidos</p>
              </div>

              {/* Velocidad de Atención */}
              <div className="bg-white p-3 md:p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-xs md:text-sm font-medium text-gray-600">Velocidad</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-blue-600">
                  {estadisticasAvanzadas.velocidadAtencion}
                </div>
                <p className="text-xs text-gray-500">Tickets/hora atendidos</p>
              </div>

              {/* Tiempo Promedio */}
              <div className="bg-white p-3 md:p-4 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-orange-600" />
                  <span className="text-xs md:text-sm font-medium text-gray-600">Tiempo Promedio</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-orange-600">
                  {estadisticasAvanzadas.tiempoPromedioEspera}
                </div>
                <p className="text-xs text-gray-500">Minutos por ticket</p>
              </div>

              {/* Productividad */}
              <div className="bg-white p-3 md:p-4 rounded-lg border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="text-xs md:text-sm font-medium text-gray-600">Productividad</span>
                </div>
                <div className="text-xl md:text-2xl font-bold text-purple-600">
                  {estadisticasAvanzadas.ticketsPorHora}
                </div>
                <p className="text-xs text-gray-500">Tickets/hora emitidos</p>
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">⏰ Tiempo de Operación</h4>
                <p className="text-lg font-bold text-indigo-600">{estadisticasAvanzadas.tiempoOperacion} horas</p>
                <p className="text-xs text-gray-500">Desde inicio del día</p>
              </div>

              <div className="bg-white p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">📈 Progreso del Día</h4>
                <p className="text-lg font-bold text-indigo-600">{estadisticasAvanzadas.porcentajeCompletado}%</p>
                <p className="text-xs text-gray-500">Tickets completados</p>
              </div>

              <div className="bg-white p-3 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">🕐 Horas Pico</h4>
                <p className="text-lg font-bold text-indigo-600">{estadisticasAvanzadas.horasPico}</p>
                <p className="text-xs text-gray-500">Mayor actividad</p>
              </div>
            </div>

            {/* Estadísticas de la API si están disponibles */}
            {estadisticas && (
              <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">📊 Datos del Servidor</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Última hora:</span>
                    <p className="font-bold text-blue-600">{estadisticas.ticketsUltimaHora} tickets</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio:</span>
                    <p className="font-bold text-green-600">{estadisticas.horaInicioOperaciones}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Última actividad:</span>
                    <p className="font-bold text-orange-600">
                      {estadisticas.ultimaActividad !== "Sin actividad"
                        ? new Date(estadisticas.ultimaActividad).toLocaleTimeString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                          })
                        : "Sin actividad"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Promedio servidor:</span>
                    <p className="font-bold text-purple-600">{estadisticas.promedioTiempoPorTicket.toFixed(1)} min</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center mt-8 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p>Develop by: Karim :) | Versión 4.0</p>
        </div>
      </footer>
    </div>
  )
}
