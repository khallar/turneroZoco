"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { X, Clock, Users, Eye } from "lucide-react"
import styles from "./page.module.css"

export const dynamic = "force-dynamic"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
  premio?: {
    ganador: boolean
    mensaje?: string
  }
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
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Error</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.errorButton}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados

  return (
    <div className={styles.pageContainer}>
      {/* Notificación Automática */}
      {notificacionAutomatica && (
        <div className={styles.notification}>
          <div className={styles.notificationCard}>
            <div className={styles.notificationContent}>
              <div className={styles.notificationInner}>
                <div className={styles.notificationIcon}>🤖</div>
                <div>
                  <h4 className={styles.notificationTitle}>Sistema Automático</h4>
                  <p className={styles.notificationText}>{notificacionAutomatica}</p>
                </div>
              </div>
              <button onClick={() => window.location.reload()} className={styles.closeButton}>
                <X style={{ height: "1rem", width: "1rem" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.contentWrapper}>
        <div className="container" style={{ padding: "2rem 1rem" }}>
          {/* Header con estadísticas */}
          <div className={styles.header}>
            <div className={styles.statsContainer}>
              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <Users style={{ height: "1rem", width: "1rem", color: "#dc2626" }} />
                  <span className={styles.statLabel}>{estado.totalAtendidos} tickets hoy</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statContent}>
                  <Clock style={{ height: "1rem", width: "1rem", color: "#ea580c" }} />
                  <span className={styles.statLabel}>{ticketsPendientes} en espera</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className={styles.logoContainer}>
            <img src="/logo-rojo.png" alt="ZOCO" className={styles.logo} />
          </div>

          {/* Contenido Principal */}
          <div className={styles.mainContent}>
            {/* Botón Principal */}
            <div className={styles.buttonContainer}>
              <button onClick={() => setShowModal(true)} disabled={generandoTicket} className={styles.primaryButton}>
                {generandoTicket ? (
                  <div className={styles.buttonLoading}>
                    <div className={styles.spinner}></div>
                    Generando...
                  </div>
                ) : (
                  "SACAR NÚMERO"
                )}
              </button>
            </div>

            {/* Frase de Bienvenida */}
            <div className={styles.phraseContainer}>
              <div className={styles.phraseCard}>
                <p className={styles.phraseText}>{fraseAleatoria}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerText}>
          <p className={styles.footerTitle}>Develop by: Karim - V7.1 🤖 Backup Automático</p>
          <p className={styles.footerSubtitle}>Sistema de Turnos ZOCO • {new Date().getFullYear()}</p>
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
            {ultimoTicket.premio?.ganador && (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-200 via-orange-200 to-red-200 opacity-30 animate-pulse"></div>
                <div className="absolute top-10 left-10 text-6xl animate-bounce">🎉</div>
                <div className="absolute top-20 right-10 text-6xl animate-bounce delay-100">🎁</div>
                <div className="absolute bottom-20 left-20 text-6xl animate-bounce delay-200">⭐</div>
                <div className="absolute bottom-10 right-20 text-6xl animate-bounce delay-300">🎊</div>
              </div>
            )}

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
              {ultimoTicket.premio?.ganador && (
                <div className="mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white p-4 rounded-2xl shadow-xl animate-pulse">
                  <div className="text-4xl mb-2">🎉 ¡FELICITACIONES! 🎉</div>
                  <div className="text-lg font-bold">¡GANASTE UN PREMIO!</div>
                </div>
              )}

              {/* Header con Logo */}
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
                <h2 className="text-xl font-bold text-gray-800">
                  {ultimoTicket.premio?.ganador ? "¡Tu Número Ganador!" : "¡Tu Número de Atención!"}
                </h2>
              </div>

              {/* Número Principal con Logo de fondo */}
              <div
                className={`relative rounded-2xl p-6 mb-4 text-white shadow-xl overflow-hidden ${
                  ultimoTicket.premio?.ganador
                    ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"
                    : "bg-gradient-to-r from-red-500 to-red-600"
                }`}
              >
                {/* Logo de fondo sutil */}
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

              {ultimoTicket.premio?.ganador && ultimoTicket.premio.mensaje && (
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-xl p-4 mb-4 shadow-lg">
                  <div className="text-2xl mb-2">🎁</div>
                  <p className="text-lg font-bold text-gray-800">{ultimoTicket.premio.mensaje}</p>
                  <p className="text-sm text-gray-600 mt-2">Mostrá este ticket al empleado para reclamar tu premio</p>
                </div>
              )}

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

              {/* Botón de Ir a Próximos */}
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
