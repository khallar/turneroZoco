"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { X, Clock, Users, Eye } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

const frasesAleatorias = [
  "Tu turno está tan seguro como el WiFi con contraseña difícil 🔒📶",
  "Confirmado: este turno no se mancha ⚽😂",
  "¡Agendado! Ya podés presumir de tu puntualidad 🕒✨",
  "Tu turno está más firme que Fernet con coca 🍹😎",
  "Listo, ya tenés turno… ¡y sin venderle el alma al diablo! 😈✅",
  "Turno confirmado, ahora podés volver a mirar memes tranquilo 📱🤣",
  "Este turno viene con garantía extendida de buena onda ✨",
  "Tu turno ya es parte de la historia universal (bueno, casi) 📚🌍",
  "¡Turno reservado! Ahora falta que te reserves vos la alarma ⏰😂",
  "Confirmado: este turno tiene más estilo que tu foto de perfil 📸🔥",
  "¡Turno confirmado! Ahora no tenés excusa para olvidarte 😉",
  "Tu yo del futuro te va a agradecer este turno 🙌",
  "Turno reservado ✅ … ahora a respirar tranquilo 🧘‍♂️",
  "¡Lo lograste! El turno es tuyo 🏆",
  "Tu agenda acaba de ponerse más interesante 📅✨",
  "¡Bravo! Te ganaste un turno sin hacer fila 🎉",
  "Confirmado: ya sos parte del club de los organizados 😎",
  "¡Listo el pollo, confirmado el turno! 🍗✅",
  "Este turno viene con cero calorías, 100% satisfacción 😜",
  "¡Excelente elección! Tu turno ya está guardado bajo llave 🔑",
]

export default function HomePage() {
  const { estado, loading, error, generarTicket, notificacionAutomatica } = useSistemaEstado()
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

  const irAProximos = () => {
    window.location.href = "/proximos"
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col">
      {/* 🤖 Notificación Automática */}
      {notificacionAutomatica && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-2xl border border-blue-400 animate-scaleIn">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🤖</div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Sistema Automático</h4>
                  <p className="text-xs leading-relaxed whitespace-pre-line">{notificacionAutomatica}</p>
                </div>
              </div>
              <button onClick={() => window.location.reload()} className="text-white/80 hover:text-white ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1">
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
            {/* Botón Principal - MÁS PEQUEÑO */}
            <div className="text-center mb-12">
              <Button
                onClick={() => setShowModal(true)}
                disabled={generandoTicket}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-6 text-2xl md:text-3xl font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
                style={{ minHeight: "80px", minWidth: "250px" }}
              >
                {generandoTicket ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
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
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-white/30 bg-white/20">
        <div className="text-sm text-gray-600">
          <p className="font-semibold">Develop by: Karim - V7.0 🤖 Backup Automático</p>
          <p className="text-xs mt-1">Sistema de Turnos ZOCO • {new Date().getFullYear()}</p>
        </div>
      </footer>

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
          <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-3xl shadow-2xl max-w-sm w-full mx-4 animate-scaleIn border-4 border-red-200 relative overflow-hidden">
            {/* Elementos decorativos de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full opacity-30 -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-100 rounded-full opacity-40 translate-y-12 -translate-x-12"></div>
            <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-red-50 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2"></div>

            {/* Botón Cerrar */}
            <button
              onClick={irAProximos}
              className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 transition-colors z-20 shadow-lg"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Contenido del Ticket */}
            <div className="p-6 text-center relative z-10">
              {/* Header con Logo - MEJORADO */}
              <div className="mb-4">
                <div className="backdrop-blur-sm rounded-2xl p-3 mb-3 shadow-lg border border-white/50 bg-destructive">
                  <img
                    src="/logo-rojo.png"
                    alt="ZOCO"
                    className="h-14 mx-auto object-contain"
                    style={{
                      filter: "brightness(1) saturate(1.2) contrast(1.1)",
                    }}
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-800">¡Tu Número de Atención!</h2>
              </div>

              {/* Número Principal con Logo de fondo - MEJORADO */}
              <div className="relative bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 mb-4 text-white shadow-xl overflow-hidden">
                {/* Logo de fondo sutil - MEJORADO */}
                <div className="absolute inset-0 flex items-center justify-center opacity-8">
                  <img
                    src="/logo-rojo.png"
                    alt="ZOCO Background"
                    className="h-24 object-contain filter brightness-0 invert opacity-20"
                  />
                </div>

                {/* Contenido principal */}
                <div className="relative z-10">
                  <div className="text-6xl font-black mb-3 drop-shadow-lg">
                    {ultimoTicket.numero.toString().padStart(3, "0")}
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl py-3 px-6 text-xl font-bold border border-white/30">
                    {ultimoTicket.nombre}
                  </div>
                </div>

                {/* Elementos decorativos en el número */}
                <div className="absolute top-2 right-2 w-8 h-8 bg-white/10 rounded-full"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 bg-white/10 rounded-full"></div>
              </div>

              {/* Información de Fecha y Hora */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 mb-4 shadow-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">📅 Generado el:</div>
                <div className="font-bold text-gray-800">
                  {new Date().toLocaleDateString("es-AR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="font-bold text-gray-800 text-lg">
                  🕐{" "}
                  {new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Instrucciones */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 mb-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  📍 Por favor, <span className="font-semibold text-red-600">avance al centro del salón</span> para ser
                  llamado cuando llegue su turno
                </p>
              </div>

              {/* Botón de Ir a Próximos - MODIFICADO */}
              <Button
                onClick={irAProximos}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 text-lg rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Ver mi Posición en la Fila
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
