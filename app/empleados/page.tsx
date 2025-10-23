"use client"

import { useState } from "react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Play, Users, ArrowLeft, Eye } from "lucide-react"
import styles from "./page.module.css"

export const dynamic = "force-dynamic"

const frasesEmpleados = [
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

export default function EmpleadosPage() {
  const { estado, loading, error, llamarSiguiente } = useSistemaEstado()
  const [fraseAleatoria] = useState(() => frasesEmpleados[Math.floor(Math.random() * frasesEmpleados.length)])
  const [procesando, setProcesando] = useState(false)

  const handleLlamarSiguiente = async () => {
    setProcesando(true)
    try {
      await llamarSiguiente()
    } catch (error) {
      console.error("Error al llamar siguiente:", error)
    } finally {
      setProcesando(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
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
          <p className={styles.errorText}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.errorButton}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const siguienteNumero = estado.numerosLlamados + 1
  const hayMasNumeros = siguienteNumero <= estado.totalAtendidos
  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados

  // Generar lista de próximos 20 tickets
  const proximosTickets = []
  for (let i = 1; i <= 20; i++) {
    const numeroProximo = estado.numerosLlamados + i
    if (numeroProximo <= estado.totalAtendidos && estado.tickets) {
      const ticket = estado.tickets.find((t) => t.numero === numeroProximo)
      if (ticket) {
        proximosTickets.push({
          numero: numeroProximo,
          nombre: ticket.nombre,
          posicion: i,
          premio: ticket.premio,
        })
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Logo */}
        <div className={styles.header}>
          <img src="/logo-rojo.png" alt="ZOCO" className={styles.logo} />
        </div>

        <div className={styles.mainGrid}>
          {/* Panel Principal - Izquierda */}
          <div className={styles.leftPanel}>
            {/* Número Siguiente */}
            <div className={styles.numeroCard}>
              <h2 className={styles.numeroTitle}>Próximo Número</h2>
              <div className={styles.numeroDisplay}>
                {hayMasNumeros ? siguienteNumero.toString().padStart(3, "0") : "---"}
              </div>
              {hayMasNumeros && estado.tickets && (
                <div className={styles.nombreDisplay}>
                  {estado.tickets.find((t) => t.numero === siguienteNumero)?.nombre || "Cliente"}
                </div>
              )}
              <div className={styles.pendientesText}>
                {ticketsPendientes} {ticketsPendientes === 1 ? "persona" : "personas"} en espera
              </div>
            </div>

            {/* Botón Principal */}
            <div className={styles.buttonContainer}>
              <button
                onClick={handleLlamarSiguiente}
                disabled={!hayMasNumeros || procesando}
                className={`${styles.mainButton} ${hayMasNumeros ? styles.mainButtonActive : styles.mainButtonDisabled}`}
              >
                {procesando ? (
                  <>
                    <div className={styles.spinner} style={{ width: "2rem", height: "2rem", margin: 0 }}></div>
                    Llamando...
                  </>
                ) : hayMasNumeros ? (
                  <>
                    <Play className="h-10 w-10" />
                    LLAMAR SIGUIENTE
                  </>
                ) : (
                  "SIN TURNOS"
                )}
              </button>
            </div>

            {/* Frase de Motivación */}
            <div className={styles.fraseCard}>
              <p className={styles.fraseText}>{fraseAleatoria}</p>
            </div>
          </div>

          {/* Lista de Próximos 20 - Derecha */}
          <div className={styles.proximosCard}>
            <div className={styles.proximosHeader}>
              <div className={styles.proximosTitle}>
                <Users className="h-6 w-6" />
                Próximos 20 en la Fila
              </div>
              <p className={styles.proximosSubtitle}>Lista de turnos pendientes por llamar</p>
            </div>
            <div className={styles.proximosList}>
              {proximosTickets.length > 0 ? (
                <>
                  {proximosTickets.map((ticket, index) => (
                    <div
                      key={ticket.numero}
                      className={`${styles.proximoItem} ${
                        index === 0
                          ? styles.proximoItemFirst
                          : index === 1
                            ? styles.proximoItemSecond
                            : index === 2
                              ? styles.proximoItemThird
                              : ""
                      }`}
                    >
                      <div className={styles.proximoContent}>
                        <div className={styles.proximoLeft}>
                          <div
                            className={`${styles.proximoBadge} ${
                              index === 0
                                ? styles.proximoBadgeFirst
                                : index === 1
                                  ? styles.proximoBadgeSecond
                                  : index === 2
                                    ? styles.proximoBadgeThird
                                    : styles.proximoBadgeDefault
                            }`}
                          >
                            {ticket.numero.toString().padStart(3, "0")}
                          </div>
                          <div className={styles.proximoInfo}>
                            <p className={styles.proximoNombre}>
                              {ticket.nombre.length > 20 ? ticket.nombre.substring(0, 20) + "..." : ticket.nombre}
                              {ticket.premio?.ganador && <span title="¡Ticket con premio!">🎁</span>}
                            </p>
                            <p className={styles.proximoPosicion}>
                              {index === 0 ? "🥇 Siguiente" : `Posición ${ticket.posicion}`}
                              {ticket.premio?.ganador && (
                                <span style={{ marginLeft: "0.5rem", color: "#ea580c", fontWeight: "bold" }}>
                                  ¡CON PREMIO!
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className={styles.proximoRight}>
                          <div
                            className={`${styles.proximoTag} ${
                              index === 0
                                ? styles.proximoTagFirst
                                : index === 1
                                  ? styles.proximoTagSecond
                                  : index === 2
                                    ? styles.proximoTagThird
                                    : styles.proximoTagDefault
                            }`}
                          >
                            +{ticket.posicion}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className={styles.proximosEmpty}>
                  <div className={styles.proximosEmptyIcon}>🎉</div>
                  <h3 className={styles.proximosEmptyTitle}>¡Excelente trabajo!</h3>
                  <p className={styles.proximosEmptyText}>No hay más turnos pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={`${styles.statValue} ${styles.statValueBlue}`}>{estado.totalAtendidos}</div>
            <p className={styles.statLabel}>Total Emitidos</p>
          </div>
          <div className={styles.statBox}>
            <div className={`${styles.statValue} ${styles.statValueGreen}`}>{estado.numerosLlamados}</div>
            <p className={styles.statLabel}>Total Atendidos</p>
          </div>
          <div className={styles.statBox}>
            <div className={`${styles.statValue} ${styles.statValueOrange}`}>{ticketsPendientes}</div>
            <p className={styles.statLabel}>En Espera</p>
          </div>
        </div>

        {/* Navegación */}
        <div className={styles.navGrid}>
          <a href="/" className={styles.navLink}>
            <ArrowLeft className="h-5 w-5" />
            <span>Volver a Inicio</span>
          </a>

          <a href="/proximos" className={`${styles.navLink} ${styles.navLinkPurple}`}>
            <Eye className="h-5 w-5" />
            <span>Ver Próximos</span>
          </a>
        </div>
      </div>
    </div>
  )
}
