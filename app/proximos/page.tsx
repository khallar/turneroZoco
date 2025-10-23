"use client"

import { useState, useEffect } from "react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Clock, Users, Timer } from "lucide-react"
import styles from "./page.module.css"

export const dynamic = "force-dynamic"

export default function ProximosPage() {
  const { estado, loading, error } = useSistemaEstado()
  const [horaActual, setHoraActual] = useState<string>("")

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString("es-AR"))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calcular tiempo promedio de demora
  const calcularTiempoPromedio = () => {
    if (!estado.tickets || estado.tickets.length === 0 || estado.numerosLlamados === 0) {
      return "3-5 min"
    }

    const ahora = new Date()
    const inicioOperaciones = new Date(estado.fechaInicio)
    const tiempoOperacionMinutos = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60)

    if (tiempoOperacionMinutos <= 0 || estado.numerosLlamados === 0) {
      return "3-5 min"
    }

    const tiempoPromedioPorTicket = tiempoOperacionMinutos / estado.numerosLlamados

    if (tiempoPromedioPorTicket < 1) {
      return "< 1 min"
    } else if (tiempoPromedioPorTicket < 60) {
      return `${Math.round(tiempoPromedioPorTicket)} min`
    } else {
      const horas = Math.floor(tiempoPromedioPorTicket / 60)
      const minutos = Math.round(tiempoPromedioPorTicket % 60)
      return `${horas}h ${minutos}m`
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Cargando próximos turnos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Error de Conexión</h2>
          <p className={styles.errorText}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.errorButton}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Calcular próximos números con nombres
  const numeroActualLlamado = estado.numerosLlamados
  const proximosConNombres = []

  // Obtener los próximos 5 tickets con nombres
  for (let i = 1; i <= 5; i++) {
    const numeroProximo = numeroActualLlamado + i
    if (numeroProximo <= estado.totalAtendidos && estado.tickets) {
      const ticket = estado.tickets.find((t) => t.numero === numeroProximo)
      if (ticket) {
        proximosConNombres.push({
          numero: numeroProximo,
          nombre: ticket.nombre,
          posicion: i,
          premio: ticket.premio,
        })
      }
    }
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados
  const tiempoPromedio = calcularTiempoPromedio()

  return (
    <div className={styles.container}>
      {/* Header con Logo */}
      <div className={styles.header}>
        <div>
          <img src="/logo-rojo.png" alt="ZOCO" className={styles.logo} />
          <h1 className={styles.title}>Próximos Turnos</h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <Clock className="h-5 w-5" />
              <span className={styles.statText}>{horaActual}</span>
            </div>
            <div className={styles.statItem}>
              <Users className="h-5 w-5" />
              <span className={styles.statText}>{ticketsPendientes} en espera</span>
            </div>
            <div className={styles.statItem}>
              <Timer className="h-5 w-5" />
              <span className={styles.statText}>Promedio: {tiempoPromedio}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Número Actual Siendo Atendido */}
        <div className={styles.currentSection}>
          <div className={styles.currentCard}>
            <h2 className={styles.currentTitle}>🔥 ATENDIENDO AHORA</h2>
            <div className={styles.currentNumber}>
              {numeroActualLlamado > 0 ? numeroActualLlamado.toString().padStart(3, "0") : "---"}
            </div>
            {numeroActualLlamado > 0 && estado.tickets && (
              <div className={styles.currentName}>
                <p className={styles.currentNameText}>
                  {estado.tickets.find((t) => t.numero === numeroActualLlamado)?.nombre || "Cliente"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Próximos 5 Turnos */}
        <div className={styles.nextSection}>
          <h3 className={styles.nextTitle}>📋 Próximos en la Fila</h3>

          {proximosConNombres.length > 0 ? (
            <div className={styles.nextList}>
              {proximosConNombres.map((item, index) => (
                <div
                  key={item.numero}
                  className={`${styles.nextCard} ${
                    index === 0 ? styles.first : index === 1 ? styles.second : index === 2 ? styles.third : styles.other
                  } ${item.premio?.ganador ? styles.prizeCard : ""}`}
                >
                  <div className={styles.nextCardLeft}>
                    <div className={styles.nextCardNumber}>
                      <span className={styles.nextCardNumberText}>{item.numero.toString().padStart(3, "0")}</span>
                    </div>
                    <div>
                      <p className={styles.nextCardName}>
                        {item.nombre}
                        {item.premio?.ganador && (
                          <span className={styles.prizeIcon} title="¡Ticket con premio!">
                            🏆
                          </span>
                        )}
                      </p>
                      <p className={styles.nextCardPosition}>
                        {index === 0 ? "🥇 Siguiente" : `Posición ${item.posicion}`}
                        {item.premio?.ganador && <span className={styles.prizeLabel}>¡CON PREMIO!</span>}
                      </p>
                    </div>
                  </div>
                  <div className={styles.nextCardRight}>
                    <div className={`${styles.nextCardBadge} ${index === 0 ? styles.first : styles.other}`}>
                      {index === 0 ? "SIGUIENTE" : `+${item.posicion}`}
                    </div>
                    <div className={styles.nextCardTime}>
                      <Timer className="h-3 w-3" />
                      <span>
                        ≈ {Math.round(Number.parseFloat(tiempoPromedio.replace(/[^\d.]/g, "")) * item.posicion)} min
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎉</div>
              <h3 className={styles.emptyTitle}>¡Excelente!</h3>
              <p className={styles.emptyText}>No hay más turnos en espera</p>
              <p className={styles.emptySubtext}>Todos los números han sido atendidos</p>
            </div>
          )}
        </div>

        {/* Información del Sistema */}
        <div className={styles.infoCard}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoValue}>{estado.totalAtendidos}</div>
              <p className={styles.infoLabel}>Total Emitidos</p>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoValue}>{estado.numerosLlamados}</div>
              <p className={styles.infoLabel}>Total Atendidos</p>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoValue}>{tiempoPromedio}</div>
              <p className={styles.infoLabel}>Tiempo Promedio</p>
            </div>
          </div>
          <div className={styles.infoDivider}>
            <p className={styles.infoFooter}>Sistema Activo • Versión 5.2 • Actualizado: {horaActual}</p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>Desarrollado por Karim • Sistema de Turnos ZOCO • V 7.1</p>
        </div>
      </div>
    </div>
  )
}
