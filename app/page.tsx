"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NombreModal } from "@/components/NombreModal"
import { TicketDisplay } from "@/components/TicketDisplay"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Ticket, Users, Clock, AlertCircle, Wifi, WifiOff } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  frase: string
  fecha: string
}

const frases = [
  "¡Gracias por visitarnos! Su paciencia es muy apreciada.",
  "Estamos aquí para servirle de la mejor manera posible.",
  "Su tiempo es valioso, pronto será atendido.",
  "Bienvenido a ZOCO, donde su satisfacción es nuestra prioridad.",
  "Gracias por elegirnos, será atendido en breve.",
  "Su número será llamado pronto, gracias por esperar.",
  "Apreciamos su visita y su paciencia.",
  "En ZOCO valoramos su tiempo y confianza.",
  "Será atendido por nuestro equipo especializado.",
  "Gracias por ser parte de la familia ZOCO.",
]

export default function Home() {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)
  const [generandoTicket, setGenerandoTicket] = useState(false)
  const [esMobile, setEsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [conectado, setConectado] = useState(true)

  const { estado, guardarEstado, generarTicket: generarTicketAPI } = useSistemaEstado("principal")

  useEffect(() => {
    setMounted(true)
    // Detectar si es móvil
    const checkMobile = () => {
      setEsMobile(
        window.innerWidth <= 768 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      )
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    // Verificar conectividad
    const checkConnection = () => {
      setConectado(navigator.onLine)
    }

    checkConnection()
    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    return () => {
      window.removeEventListener("resize", checkMobile)
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
    }
  }, [])

  const generarTicket = async (nombre: string) => {
    if (!mounted) return

    setGenerandoTicket(true)

    try {
      console.log("🎫 Iniciando generación de ticket para:", nombre)

      // Usar la función del hook que maneja la API
      const ticketGenerado = await generarTicketAPI(nombre)

      if (ticketGenerado) {
        const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)]
        const fechaActual = new Date().toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })

        const nuevoTicket: TicketInfo = {
          numero: ticketGenerado.numero,
          nombre: ticketGenerado.nombre,
          frase: fraseAleatoria,
          fecha: fechaActual,
        }

        setTicketInfo(nuevoTicket)
        setMostrarModal(false)
        console.log("✅ Ticket generado exitosamente:", nuevoTicket)
      } else {
        throw new Error("No se pudo generar el ticket")
      }
    } catch (error) {
      console.error("❌ Error al generar ticket:", error)
      alert("Error al generar el ticket. Por favor, intente nuevamente.")
    } finally {
      setGenerandoTicket(false)
    }
  }

  const handleGenerarTicket = () => {
    if (!mounted) return
    setMostrarModal(true)
  }

  const cerrarTicket = () => {
    setTicketInfo(null)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex flex-col">
      {/* Header con estado de conexión */}
      <div className="bg-white shadow-lg border-b-4 border-red-600 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Sistema de Atención ZOCO</h1>
              <p className="text-sm text-gray-600">Genere su número de atención</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel principal de generación de tickets */}
          <Card className="bg-white shadow-2xl border-4 border-red-500 transform hover:scale-105 transition-transform duration-300">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white text-center py-8">
              <CardTitle className="text-3xl font-black flex items-center justify-center gap-3">
                <Ticket className="h-10 w-10" />
                GENERAR TICKET
              </CardTitle>
              <p className="text-red-100 text-lg mt-2">Obtenga su número de atención</p>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">¿Cómo funciona?</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        1
                      </div>
                      <span className="text-lg">Presione el botón "GENERAR TICKET"</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        2
                      </div>
                      <span className="text-lg">Escriba su nombre completo</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        3
                      </div>
                      <span className="text-lg">Guarde o comparta su ticket</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        4
                      </div>
                      <span className="text-lg">Espere a ser llamado</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGenerarTicket}
                  disabled={generandoTicket || !conectado}
                  className="w-full text-2xl py-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black shadow-lg transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generandoTicket ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
                      GENERANDO...
                    </>
                  ) : (
                    <>
                      <Ticket className="mr-3 h-8 w-8" />🎫 GENERAR TICKET
                    </>
                  )}
                </Button>

                {!conectado && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-bold">Sin conexión a internet</span>
                    </div>
                    <p className="text-red-600 text-sm mt-1">Verifique su conexión para generar tickets</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Panel de información del sistema */}
          <div className="space-y-6">
            <Card className="bg-white shadow-xl border-2 border-blue-300">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Estado del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{estado.ultimoNumero}</div>
                    <div className="text-sm text-gray-600">Último Número</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{estado.totalAtendidos}</div>
                    <div className="text-sm text-gray-600">Total Tickets</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-xl border-2 border-purple-300">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sistema operativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Tickets disponibles 24/7</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Atención personalizada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Tiempo promedio: 5-10 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {esMobile && (
              <Card className="bg-yellow-50 border-2 border-yellow-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold text-sm">Dispositivo Móvil Detectado</span>
                  </div>
                  <p className="text-yellow-700 text-xs mt-1">Podrá guardar su ticket como imagen en su galería</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p className="text-sm">
          © 2024 Sistema de Atención ZOCO - Versión 5.3 | Desarrollado para mejorar su experiencia
        </p>
      </footer>

      {/* Modales */}
      <NombreModal
        isOpen={mostrarModal}
        onConfirm={generarTicket}
        onCancel={() => {
          setMostrarModal(false)
          setGenerandoTicket(false)
        }}
        generandoTicket={generandoTicket}
      />

      {ticketInfo && (
        <TicketDisplay
          numero={ticketInfo.numero}
          nombre={ticketInfo.nombre}
          frase={ticketInfo.frase}
          fecha={ticketInfo.fecha}
          onClose={cerrarTicket}
          esMobile={esMobile}
        />
      )}
    </div>
  )
}
