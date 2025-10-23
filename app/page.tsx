"use client"

import { useState } from "react"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { X, Clock, Users, Eye } from "lucide-react"
import styles from "./page.module.css"
import ticketStyles from "./ticket.module.css"

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
        <div className={ticketStyles.ticketOverlay}>
          <div className={ticketStyles.ticketCard}>
            {ultimoTicket.premio?.ganador && (
              <div className={ticketStyles.winnerOverlay}>
                <div className={ticketStyles.winnerGradient}></div>
                <div className={`${ticketStyles.winnerEmoji} ${ticketStyles.winnerEmoji1}`}>🎉</div>
                <div className={`${ticketStyles.winnerEmoji} ${ticketStyles.winnerEmoji2}`}>🎁</div>
                <div className={`${ticketStyles.winnerEmoji} ${ticketStyles.winnerEmoji3}`}>⭐</div>
                <div className={`${ticketStyles.winnerEmoji} ${ticketStyles.winnerEmoji4}`}>🎊</div>
              </div>
            )}

            <div className={`${ticketStyles.decorativeCircle} ${ticketStyles.decorativeCircle1}`}></div>
            <div className={`${ticketStyles.decorativeCircle} ${ticketStyles.decorativeCircle2}`}></div>
            <div className={`${ticketStyles.decorativeCircle} ${ticketStyles.decorativeCircle3}`}></div>

            <button onClick={irAProximos} className={ticketStyles.closeButton}>
              <X className={ticketStyles.closeIcon} />
            </button>

            <div className={ticketStyles.ticketContent}>
              {ultimoTicket.premio?.ganador && (
                <div className={ticketStyles.winnerBanner}>
                  <div className={ticketStyles.winnerBannerEmoji}>🎉 ¡FELICITACIONES! 🎉</div>
                  <div className={ticketStyles.winnerBannerTitle}>¡GANASTE UN PREMIO!</div>
                </div>
              )}

              <div className={ticketStyles.logoSection}>
                <div className={ticketStyles.logoWrapper}>
                  <img src="/logo-rojo.png" alt="ZOCO" className={ticketStyles.ticketLogo} />
                </div>
                <h2 className={ticketStyles.ticketTitle}>
                  {ultimoTicket.premio?.ganador ? "¡Tu Número Ganador!" : "¡Tu Número de Atención!"}
                </h2>
              </div>

              <div
                className={`${ticketStyles.numberDisplay} ${
                  ultimoTicket.premio?.ganador ? ticketStyles.numberDisplayWinner : ticketStyles.numberDisplayNormal
                }`}
              >
                <div className={ticketStyles.numberBackground}>
                  <img src="/logo-rojo.png" alt="ZOCO Background" className={ticketStyles.numberBackgroundLogo} />
                </div>

                <div className={ticketStyles.numberContent}>
                  <div className={ticketStyles.ticketNumber}>{ultimoTicket.numero.toString().padStart(3, "0")}</div>
                  <div className={ticketStyles.ticketName}>{ultimoTicket.nombre}</div>
                </div>

                <div className={`${ticketStyles.numberDecorative} ${ticketStyles.numberDecorative1}`}></div>
                <div className={`${ticketStyles.numberDecorative} ${ticketStyles.numberDecorative2}`}></div>
              </div>

              {ultimoTicket.premio?.ganador && ultimoTicket.premio.mensaje && (
                <div className={ticketStyles.prizeMessage}>
                  <div className={ticketStyles.prizeEmoji}>🎁</div>
                  <p className={ticketStyles.prizeText}>{ultimoTicket.premio.mensaje}</p>
                  <p className={ticketStyles.prizeSubtext}>Mostrá este ticket al empleado para reclamar tu premio</p>
                </div>
              )}

              <div className={ticketStyles.dateTimeInfo}>
                <div className={ticketStyles.dateLabel}>📅 Generado el:</div>
                <div className={ticketStyles.dateValue}>
                  {new Date().toLocaleDateString("es-AR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className={ticketStyles.timeValue}>
                  🕐{" "}
                  {new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              <div className={ticketStyles.instructions}>
                <p className={ticketStyles.instructionsText}>
                  📍 Por favor, <span className={ticketStyles.instructionsHighlight}>avance al centro del salón</span>{" "}
                  para ser llamado cuando llegue su turno
                </p>
              </div>

              <button onClick={irAProximos} className={ticketStyles.viewPositionButton}>
                <Eye className={ticketStyles.viewPositionIcon} />
                Ver mi Posición en la Fila
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
