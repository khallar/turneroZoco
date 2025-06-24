"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, Users, Clock, Wifi, WifiOff, AlertTriangle, Database, History, Bug } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import TicketDisplay from "@/components/TicketDisplay"
import NombreModal from "@/components/NombreModal"
import { SpeedInsights } from "@vercel/speed-insights/next"

const FRASES_ALEATORIAS = [
  "¡Gracias por visitarnos!",
  "Su paciencia es muy apreciada",
  "Estamos aquí para servirle",
  "¡Bienvenido a nuestro local!",
  "Pronto será atendido",
  "Gracias por elegirnos",
  "Su satisfacción es nuestra prioridad",
  "¡Que tenga un excelente día!",
  "Apreciamos su visita",
  "Estamos para ayudarle",
  "¡Hoy puede ser un gran día para decorar una torta o una fiesta! 🎉🍰 ", 
"Mientras esperás tu turno, pensá qué excusa vas a dar para llevarte todo.😉🛍️" , 
"Decorá tu día con colores, glaseado… y un poco de ZOCO. 🌈✨" , 
"Respirá hondo… estás en el lugar donde empiezan las fiestas.🎈💃" ,
"No sos vos, es tu casa que necesita más cotillón 🏡🎊",
"Tranquilo… en ZOCO los turnos son rápidos y las ideas, infinitas 🧠⚡",
"¡ZOCOnsejo del día! Nunca subestimes el poder de una buena servilleta temática. 🍽️🎁",
"Quedate tranquilo, ya te toca. Y sí, podés llevarte ese globo gigante. 🎈🛒",
"Un turno en ZOCO vale más que mil excusas para no festejar. 🥳💬",
"Estás a un paso de que tu casa parezca una fiesta sorpresa permanente. 🎁🎊",
]

export default function SistemaAtencion() {
  const {
    estado,
    estadisticas,
    loading,
    error,
    ultimaSincronizacion,
    debugInfo,
    generarTicket,
    verificarIntegridad,
    isClient,
  } = useSistemaEstado()

  const [horaActual, setHoraActual] = useState<Date | null>(null)
  const [tiempoHastaReinicio, setTiempoHastaReinicio] = useState("")
  const [ticketGenerado, setTicketGenerado] = useState<{
    numero: number
    nombre: string
    frase: string
    fecha: string
  } | null>(null)
  const [esMobile, setEsMobile] = useState(false)
  const [mostrarModalNombre, setMostrarModalNombre] = useState(false)
  const [generandoTicket, setGenerandoTicket] = useState(false)
  const [integridad, setIntegridad] = useState<any>(null)
  const [mostrarDebug, setMostrarDebug] = useState(false)
  const [fraseAleatoria, setFraseAleatoria] = useState("")

  // Seleccionar frase aleatoria al cargar
  useEffect(() => {
    if (isClient) {
      const fraseSeleccionada = FRASES_ALEATORIAS[Math.floor(Math.random() * FRASES_ALEATORIAS.length)]
      setFraseAleatoria(fraseSeleccionada)
    }
  }, [isClient])

  // Detectar si es móvil - solo en cliente
  useEffect(() => {
    if (!isClient) return

    const checkMobile = () => {
      setEsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      )
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [isClient])

  // Actualizar hora cada minuto - solo en cliente
  useEffect(() => {
    if (!isClient) return

    const actualizarHora = () => {
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
    }

    // Ejecutar inmediatamente
    actualizarHora()

    // Configurar intervalo
    const interval = setInterval(actualizarHora, 60000)
    return () => clearInterval(interval)
  }, [isClient])

  // Verificar integridad de la numeración
  useEffect(() => {
    if (isClient && estado.tickets && estado.tickets.length > 0) {
      const resultado = verificarIntegridad()
      setIntegridad(resultado)
    }
  }, [estado.tickets, verificarIntegridad, isClient])

  const iniciarGeneracionTicket = () => {
    // Solo abrir el modal, no asignar número todavía
    setMostrarModalNombre(true)
  }

  const confirmarTicket = async (nombre: string) => {
    try {
      setGenerandoTicket(true)

      // Generar ticket de forma atómica en el servidor
      const ticketCreado = await generarTicket(nombre)

      if (ticketCreado) {
        const fraseAleatoria = FRASES_ALEATORIAS[Math.floor(Math.random() * FRASES_ALEATORIAS.length)]

        // Cerrar modal y mostrar ticket
        setMostrarModalNombre(false)
        setTicketGenerado({
          numero: ticketCreado.numero,
          nombre: ticketCreado.nombre,
          frase: fraseAleatoria,
          fecha: ticketCreado.fecha,
        })
      }
    } catch (error) {
      console.error("Error al generar ticket:", error)
      alert(`Error al generar el ticket: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setGenerandoTicket(false)
    }
  }

  const cancelarTicket = () => {
    setMostrarModalNombre(false)
  }

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando sistema...</p>
          <p className="text-sm text-gray-500 mt-2">Conectando con Upstash Redis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con hora actual */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo ZOCO"
              className="h-32 md:h-40 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(11%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(100%) contrast(120%)",
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{fraseAleatoria || "¡Bienvenido a nuestro local!"}</h1>
          {/* Botón principal */}
          <div className="mb-6">
            <Button
              onClick={iniciarGeneracionTicket}
              size="lg"
              className="text-2xl px-16 py-8 h-auto bg-blue-600 hover:bg-blue-700 shadow-lg transform transition-transform hover:scale-105"
              disabled={generandoTicket}
            >
              <Printer className="mr-4 h-8 w-8" />
              {generandoTicket ? "GENERANDO..." : "SACAR NÚMERO"}
            </Button>
          </div>
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{horaActual ? horaActual.toLocaleTimeString("es-ES") : "--:--:--"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Reinicio a medianoche en: {tiempoHastaReinicio}</span>
            </div>
            <div className="flex items-center gap-1">
              {error ? (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">Error de conexión</span>
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Redis conectado</span>
                </>
              )}
            </div>
            {ultimaSincronizacion && (
              <div className="flex items-center gap-1">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-blue-500">Sync: {ultimaSincronizacion.toLocaleTimeString("es-ES")}</span>
              </div>
            )}
            <button
              onClick={() => setMostrarDebug(!mostrarDebug)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
            >
              <Bug className="h-4 w-4" />
              <span>Debug</span>
            </button>
          </div>
        </div>

        {/* Panel de debug */}
        {mostrarDebug && debugInfo && (
          <Card className="mb-6 bg-gray-50 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Información de Debug
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-2">
                <div>
                  <strong>Entorno:</strong> {debugInfo.environment?.NODE_ENV || "N/A"}
                </div>
                <div>
                  <strong>Redis URL:</strong> {debugInfo.redis?.url || "No configurado"}
                </div>
                <div>
                  <strong>Redis Token:</strong> {debugInfo.redis?.token || "No configurado"}
                </div>
                <div>
                  <strong>Conexión Redis:</strong>
                  <span className={debugInfo.redis?.connection === "Exitosa" ? "text-green-600" : "text-red-600"}>
                    {debugInfo.redis?.connection || "Desconocido"}
                  </span>
                </div>
                <div>
                  <strong>Estado en Redis:</strong> {debugInfo.redis?.estado || "N/A"}
                </div>
                <div>
                  <strong>Claves encontradas:</strong> {debugInfo.redis?.keys?.length || 0}
                </div>
                {error && (
                  <div className="text-red-600">
                    <strong>Error actual:</strong> {error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Indicador de persistencia */}
        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>
              {error
                ? "Modo offline - Datos en localStorage"
                : "Datos guardados en Upstash Redis - Persistencia garantizada"}
            </span>
          </div>
        </div>

        {/* Estadísticas principales */}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         
         
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Espera</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{estado.totalAtendidos - estado.numerosLlamados}</div>
              <p className="text-xs text-muted-foreground">Tickets pendientes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hoy</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{estado.totalAtendidos}</div>
              <p className="text-xs text-muted-foreground">Tickets emitidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas adicionales si están disponibles */}
        {estadisticas && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Estadísticas del Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tickets última hora</p>
                  <p className="text-2xl font-bold text-blue-600">{estadisticas.ticketsUltimaHora}</p>
                </div>
                <div>
                  <p className="text-gray-600">Inicio operaciones</p>
                  <p className="text-lg font-semibold text-green-600">{estadisticas.horaInicioOperaciones}</p>
                </div>
                <div>
                  <p className="text-gray-600">Última actividad</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {estadisticas.ultimaActividad !== "Sin actividad"
                      ? new Date(estadisticas.ultimaActividad).toLocaleTimeString("es-ES")
                      : "Sin actividad"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Promedio tiempo</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {estadisticas.promedioTiempoPorTicket.toFixed(1)} min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verificación de integridad */}
        {integridad && !integridad.ok && (
          <Card className="mb-8 border-yellow-300 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Verificación de Integridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-800">
                <p>Se detectaron {integridad.saltos.length} saltos en la numeración:</p>
                <ul className="list-disc pl-5 mt-2">
                  {integridad.saltos.map((salto: any, index: number) => (
                    <li key={index}>
                      Salto entre {salto.desde} y {salto.hasta} ({salto.faltantes} números faltantes)
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  Total de tickets: {integridad.totalTickets} | Rango: {integridad.minimo}-{integridad.maximo} |
                  Esperados: {integridad.esperados}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Instrucciones de Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-bold text-lg text-blue-600 mb-2">
                📱 <strong>Paso 1: Sacar Número</strong>
              </p>
              <p className="ml-4 mb-1">• Presione el botón azul "SACAR NÚMERO"</p>
              <p className="ml-4 text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                ↳ <strong>Ingrese su nombre:</strong> Aparecerá una ventana para escribir su nombre completo
              </p>
            </div>

            <div>
              <p className="font-bold text-lg text-green-600 mb-2">
                🏢 <strong>Paso 2: Dirigirse al Centro del Salón</strong>
              </p>
              <p className="ml-4">• Vaya al centro del salón y espere a ser llamado por su nombre o número</p>
            </div>

            <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
              <p className="font-bold text-green-800 mb-1">☁️ Persistencia en la Nube</p>
              <p className="text-sm text-green-700">
                Todos los números y nombres se guardan automáticamente en **Upstash Redis** en la nube. Los datos
                persisten durante todo el día hasta medianoche, con alta disponibilidad y sin pérdida de información.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de nombre */}
      {isClient && mostrarModalNombre && (
        <NombreModal
          isOpen={mostrarModalNombre}
          onConfirm={confirmarTicket}
          onCancel={cancelarTicket}
          generandoTicket={generandoTicket}
        />
      )}

      {/* Modal de ticket */}
      {isClient && ticketGenerado && (
        <TicketDisplay
          numero={ticketGenerado.numero}
          nombre={ticketGenerado.nombre}
          frase={ticketGenerado.frase}
          fecha={ticketGenerado.fecha}
          esMobile={esMobile}
          onClose={() => setTicketGenerado(null)}
        />
      )}
    </div>
  )
}
