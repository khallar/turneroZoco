"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, Bug, Wifi, WifiOff } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import TicketDisplay from "@/components/TicketDisplay"
import NombreModal from "@/components/NombreModal"

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
  "Mientras esperás tu turno, pensá qué excusa vas a dar para llevarte todo.😉🛍️",
  "Decorá tu día con colores, glaseado… y un poco de ZOCO. 🌈✨",
  "Respirá hondo… estás en el lugar donde empiezan las fiestas.🎈💃",
  "No sos vos, es tu casa que necesita más cotillón 🏡🎊",
  "Tranquilo… en ZOCO los turnos son rápidos y las ideas, infinitas 🧠⚡",
  "¡ZOCOnsejo del día! Nunca subestimes el poder de una buena servilleta temática. 🍽️🎁",
  "Quedate tranquilo, ya te toca. Y sí, podés llevarte ese globo gigante. 🎈🛒",
  "Un turno en ZOCO vale más que mil excusas para no festejar. 🥳💬",
  "Estás a un paso de que tu casa parezca una fiesta sorpresa permanente. 🎁🎊",
  "¡Ya casi es tu turno! Prepará la sonrisa 😁",
  "Turno en mano, paciencia en el corazón 🧘‍♂️",
  "¿Ansias? Tranqui, lo bueno se hace esperar ⏳",
  "¡Gracias por venir! Ya te atendemos 💕",
  "Turnito sacado, ahora a mirar memes 😜",
  "¡Sos el próximo protagonista! 🎬",
  "Mientras esperás… pensá en algo rico 🍫",
  "Tu número tiene suerte, lo presiento 🍀",
  "Esto no es el bingo… ¡pero podés ganar buena onda! 🎟️",
  "Estamos a full, pero ya te toca 💪",
  "Gracias por bancarnos con onda 🙌",
  "¡Zoco no se toma vacaciones! Vos tampoco del buen humor 😄",
  "Te prometemos atención con una sonrisa 😃",
  "Mientras esperás, pensá qué más te podés llevar 👀",
  "Esto es más rápido que sacar una selfie 📸",
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
    cargarEstado,
    isClient,
    cacheStats, // Nueva utilidad de cache
  } = useSistemaEstado("principal") // Especificar que es la página principal

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
  const [isOnline, setIsOnline] = useState(true)

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

  // Verificar conexión
  useEffect(() => {
    if (!isClient) return

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => setIsOnline(true)
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

      console.log("=== GENERANDO TICKET SIMPLIFICADO ===")
      console.log("Nombre:", nombre)

      // Generar ticket de forma simplificada
      const ticketCreado = await generarTicket(nombre)

      if (ticketCreado) {
        console.log("Ticket creado exitosamente:", ticketCreado)

        const fraseAleatoria = FRASES_ALEATORIAS[Math.floor(Math.random() * FRASES_ALEATORIAS.length)]

        // Cerrar modal y mostrar ticket inmediatamente
        setMostrarModalNombre(false)
        setTicketGenerado({
          numero: ticketCreado.numero,
          nombre: ticketCreado.nombre,
          frase: fraseAleatoria,
          fecha: ticketCreado.fecha,
        })
      } else {
        console.error("No se pudo crear el ticket")
        alert("Error: No se pudo generar el ticket. Por favor, intente nuevamente.")
      }
    } catch (error) {
      console.error("Error al generar ticket:", error)
      alert("Error al generar el ticket. Por favor, intente nuevamente.")
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
          <p className="text-sm text-gray-500 mt-2">Conectando con TURNOS_ZOCO (Upstash Redis)...</p>
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
        </div>

        {/* Panel de debug optimizado */}
        {mostrarDebug && debugInfo && (
          <Card className="mb-6 bg-gray-50 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Información de Debug - TURNOS_ZOCO (Cache Optimizado)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-2">
                <div>
                  <strong>Entorno:</strong> {debugInfo.environment?.NODE_ENV || "N/A"} (
                  {debugInfo.environment?.VERCEL_ENV || "local"})
                </div>
                <div>
                  <strong>Cache Stats:</strong> {cacheStats.totalEntries} entradas, {cacheStats.subscribers}{" "}
                  suscriptores
                </div>
                <div>
                  <strong>Cache Entries:</strong>
                  <ul className="ml-4 mt-1">
                    {cacheStats.entries.map((entry) => (
                      <li key={entry.key} className={entry.fresh ? "text-green-600" : "text-orange-600"}>
                        {entry.key}: {entry.age}s/{entry.ttl}s {entry.fresh ? "✓" : "⚠️"}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>DB Conexión:</strong>
                  <span
                    className={debugInfo.upstash?.connection?.status === "healthy" ? "text-green-600" : "text-red-600"}
                  >
                    {debugInfo.upstash?.connection?.status || "Desconocido"}
                  </span>
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

            <div>
              <p className="font-bold text-lg text-purple-600 mb-2">
                👀 <strong>Paso 3: Ver Próximos Turnos</strong>
              </p>
              <p className="ml-4 mb-2">• Puede ver los próximos turnos en la nueva página dedicada</p>
              <a
                href="/proximos"
                className="ml-4 inline-block bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Ver Próximos Turnos
              </a>
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

      {/* Footer con información adicional optimizada */}
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <div className="flex justify-center items-center gap-4 mb-2">
          <div>
            Hora actual:{" "}
            {horaActual
              ? horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
              : "Cargando..."}
          </div>
          <div>Reinicio del sistema en: {tiempoHastaReinicio}</div>
          {ultimaSincronizacion && (
            <div>
              Última sincronización:{" "}
              {ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
            </div>
          )}
          <div className="flex items-center gap-1">
            {isOnline && !error ? (
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
        <button onClick={() => setMostrarDebug(!mostrarDebug)} className="hover:text-gray-700">
          Mostrar Debug & Cache Stats
        </button>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 5.3 | Cache Optimizado - Menos consultas DB</p>
            <p>Actualización inteligente cada 90s | Cache compartido entre páginas</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
