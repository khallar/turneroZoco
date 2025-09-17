"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { X, Clock, Users } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

const frasesAleatorias = [
  "¡Bienvenido a ZOCO! Tu comodidad es nuestra prioridad",
  "Gracias por elegirnos, estamos aquí para atenderte",
  "Tu tiempo es valioso, nosotros lo respetamos",
  "¡Hola! Estamos listos para brindarte el mejor servicio",
  "Bienvenido, tu satisfacción es nuestro compromiso",
  "¡Gracias por visitarnos! Serás atendido muy pronto",
  "Tu experiencia con nosotros será excepcional",
  "¡Bienvenido! Estamos aquí para hacer tu día mejor",
  "Gracias por confiar en ZOCO para tus necesidades",
  "¡Hola! Prepárate para recibir un servicio de calidad",
]

export default function HomePage() {
  const { estado, loading, error, generarTicket } = useSistemaEstado()
  const [showModal, setShowModal] = useState(false)
  const [ultimoTicket, setUltimoTicket] = useState<TicketInfo | null>(null)
  const [showTicket, setShowTicket] = useState(false)
  const [generandoTicket, setGenerandoTicket] = useState(false)
  const [fraseAleatoria] = useState(() => frasesAleatorias[Math.floor(Math.random() * frasesAleatorias.length)])

  const handleGenerarTicket = async (nombre: string) => {
    setGenerandoTicket(true)
    try {
      const ticket = await generarTicket(nombre)
      if (ticket) {
        setUltimoTicket(ticket)
        setShowModal(false)
        setShowTicket(true)
      }
    } catch (error) {
      console.error("Error al generar ticket:", error)
    } finally {
      setGenerandoTicket(false)
    }
  }

  const cerrarTicket = () => {
    setShowTicket(false)
    setUltimoTicket(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
          <p className="text-2xl text-gray-700 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <div className="text-red-600 mb-6 text-8xl">⚠️</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">Error</h2>
          <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-xl rounded-2xl"
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header con estadísticas */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 mb-6">
            <div className="bg-white rounded-xl px-4 py-2 shadow-md">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-gray-700">{estado.totalAtendidos} tickets hoy</span>
              </div>
            </div>
            <div className="bg-white rounded-xl px-4 py-2 shadow-md">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-700">{ticketsPendientes} en espera</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-16">
          <img src="/logo-rojo.png" alt="ZOCO" className="h-32 md:h-40 mx-auto drop-shadow-lg" />
        </div>

        {/* Contenido Principal */}
        <div className="max-w-2xl mx-auto">
          {/* Botón Principal */}
          <div className="text-center mb-12">
            <Button
              onClick={() => setShowModal(true)}
              disabled={generandoTicket}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-16 py-8 text-4xl md:text-5xl font-bold rounded-3xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              style={{ minHeight: "120px", minWidth: "300px" }}
            >
              {generandoTicket ? (
                <div className="flex items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  Generando...
                </div>
              ) : (
                "SACAR NÚMERO"
              )}
            </Button>
          </div>

          {/* Frase de Bienvenida */}
          <div className="text-center mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-lg max-w-lg mx-auto">
              <p className="text-gray-700 text-lg md:text-xl font-medium">{fraseAleatoria}</p>
            </div>
          </div>

          {/* Enlaces de Navegación */}
          <div className="text-center">
            <div className="bg-white rounded-2xl p-4 shadow-lg inline-block">
              <div className="flex justify-center gap-6 text-sm">
                <a href="/empleados" className="text-gray-600 hover:text-red-600 transition-colors font-medium">
                  Empleados
                </a>
                <span className="text-gray-300">•</span>
                <a href="/proximos" className="text-gray-600 hover:text-red-600 transition-colors font-medium">
                  Próximos
                </a>
                <span className="text-gray-300">•</span>
                <a href="/admin" className="text-gray-600 hover:text-red-600 transition-colors font-medium">
                  Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Nombre */}
      <NombreModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleGenerarTicket}
        loading={generandoTicket}
      />

      {/* Modal de Ticket Generado */}
      {showTicket && ultimoTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 animate-scaleIn">
            {/* Botón Cerrar */}
            <button
              onClick={cerrarTicket}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors z-10"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Contenido del Ticket */}
            <div className="p-8 text-center">
              {/* Header */}
              <div className="mb-6">
                <img src="/logo-rojo.png" alt="ZOCO" className="h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">¡Tu Número!</h2>
              </div>

              {/* Número Principal */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-8 mb-6 text-white">
                <div className="text-7xl font-black mb-2">{ultimoTicket.numero.toString().padStart(3, "0")}</div>
                <div className="bg-white/20 rounded-xl py-2 px-4 text-xl font-bold">{ultimoTicket.nombre}</div>
              </div>

              {/* Información de Fecha y Hora */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="text-sm text-gray-600 mb-1">Generado el:</div>
                <div className="font-bold text-gray-800">
                  {new Date().toLocaleDateString("es-AR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="font-bold text-gray-800 text-lg">
                  {new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Instrucciones */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Por favor, <span className="font-semibold text-red-600">avance al centro del salón</span> para ser
                  llamado cuando llegue su turno
                </p>
              </div>

              {/* Botón de Cerrar */}
              <Button
                onClick={cerrarTicket}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 text-lg rounded-xl"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
