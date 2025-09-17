"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { X, Sparkles, Clock, Users } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

const frasesAleatorias = [
  "¡Bienvenido a ZOCO! Tu comodidad es nuestra prioridad ✨",
  "Gracias por elegirnos, estamos aquí para atenderte 🌟",
  "Tu tiempo es valioso, nosotros lo respetamos ⏰",
  "¡Hola! Estamos listos para brindarte el mejor servicio 🚀",
  "Bienvenido, tu satisfacción es nuestro compromiso 💎",
  "¡Gracias por visitarnos! Serás atendido muy pronto 🎯",
  "Tu experiencia con nosotros será excepcional 🌈",
  "¡Bienvenido! Estamos aquí para hacer tu día mejor ☀️",
  "Gracias por confiar en ZOCO para tus necesidades 🤝",
  "¡Hola! Prepárate para recibir un servicio de calidad 👑",
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-red-200 mx-auto mb-6"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-red-600 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-2xl text-gray-700 font-medium">Cargando experiencia ZOCO...</p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full text-center backdrop-blur-sm border border-white/20">
          <div className="text-red-600 mb-6 text-8xl animate-pulse">⚠️</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">¡Ups! Algo salió mal</h2>
          <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 text-xl rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            <Sparkles className="mr-2 h-6 w-6" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header con estadísticas */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-white/40">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-red-600" />
                <span className="font-semibold text-gray-700">{estado.totalAtendidos} tickets hoy</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-white/40">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-700">{ticketsPendientes} en espera</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logo con efecto glassmorphism */}
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-3xl transform rotate-3 scale-105"></div>
            <div className="relative bg-white/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30">
              <img src="/logo-rojo.png" alt="ZOCO" className="h-32 md:h-40 mx-auto drop-shadow-2xl" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-2xl mx-auto">
          {/* Botón Principal con efectos modernos */}
          <div className="text-center mb-12">
            <div className="relative group">
              {/* Efecto de resplandor */}
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

              <Button
                onClick={() => setShowModal(true)}
                disabled={generandoTicket}
                className="relative bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white px-16 py-8 text-4xl md:text-5xl font-black rounded-3xl shadow-2xl transform hover:scale-105 transition-all duration-500 border-4 border-red-500/50 hover:border-red-400/70 backdrop-blur-sm"
                style={{ minHeight: "140px", minWidth: "320px" }}
              >
                {generandoTicket ? (
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/30"></div>
                      <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-white absolute top-0 left-0"></div>
                    </div>
                    <span className="bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">
                      Generando...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Sparkles className="h-12 w-12 animate-pulse" />
                    <span className="bg-gradient-to-r from-white to-red-100 bg-clip-text">SACAR NÚMERO</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Frase de Bienvenida con diseño moderno */}
          <div className="text-center mb-16">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/40 max-w-lg mx-auto">
              <p className="text-gray-700 text-lg md:text-xl font-medium leading-relaxed">{fraseAleatoria}</p>
            </div>
          </div>

          {/* Enlaces de Navegación modernos */}
          <div className="text-center">
            <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/30 inline-block">
              <div className="flex justify-center gap-8 text-sm">
                <a
                  href="/empleados"
                  className="group flex items-center gap-2 text-gray-600 hover:text-red-600 transition-all duration-300 font-medium hover:scale-105"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full group-hover:bg-red-500 transition-colors"></div>
                  Empleados
                </a>
                <div className="w-px h-6 bg-gray-300"></div>
                <a
                  href="/proximos"
                  className="group flex items-center gap-2 text-gray-600 hover:text-red-600 transition-all duration-300 font-medium hover:scale-105"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-red-500 transition-colors"></div>
                  Próximos
                </a>
                <div className="w-px h-6 bg-gray-300"></div>
                <a
                  href="/admin"
                  className="group flex items-center gap-2 text-gray-600 hover:text-red-600 transition-all duration-300 font-medium hover:scale-105"
                >
                  <div className="w-2 h-2 bg-purple-500 rounded-full group-hover:bg-red-500 transition-colors"></div>
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

      {/* Modal de Ticket Generado - SÚPER MODERNO */}
      {showTicket && ultimoTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative">
            {/* Efecto de resplandor del ticket */}
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-3xl blur-xl opacity-30 animate-pulse"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-scaleIn border border-white/20">
              {/* Header con gradiente */}
              <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>

                <div className="relative z-10 text-center">
                  <button
                    onClick={cerrarTicket}
                    className="absolute top-0 right-0 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all duration-300 backdrop-blur-sm"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>

                  <div className="mb-4">
                    <img src="/logo-rojo.png" alt="ZOCO" className="h-12 mx-auto filter brightness-0 invert" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">¡Tu Número Está Listo!</h2>
                  <div className="flex items-center justify-center gap-2 text-white/90">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">Ticket generado exitosamente</span>
                  </div>
                </div>
              </div>

              {/* Contenido del Ticket */}
              <div className="p-8">
                {/* Número Principal con efectos */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-8 text-white shadow-xl">
                      <div className="text-8xl font-black mb-3 bg-gradient-to-b from-white to-red-100 bg-clip-text text-transparent">
                        {ultimoTicket.numero.toString().padStart(3, "0")}
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl py-3 px-6 text-xl font-bold border border-white/30">
                        {ultimoTicket.nombre}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información de Fecha y Hora moderna */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 border border-gray-200/50">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Clock className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-semibold text-gray-600">Generado el:</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="font-bold text-gray-800 text-lg">
                      {new Date().toLocaleDateString("es-AR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="font-black text-2xl text-red-600">
                      {new Date().toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* Instrucciones con diseño moderno */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-red-500 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-500 rounded-full p-2 mt-1">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Por favor,{" "}
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                          avance al centro del salón
                        </span>{" "}
                        para ser llamado cuando llegue su turno
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón de Cerrar moderno */}
                <Button
                  onClick={cerrarTicket}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 text-lg rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 font-bold"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    ¡Perfecto, Entendido!
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
