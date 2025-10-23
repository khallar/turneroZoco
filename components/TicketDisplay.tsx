"use client"

import { useState, useEffect } from "react"
import { Share2, Download } from "lucide-react"
import styles from "./TicketDisplay.module.css"

interface TicketDisplayProps {
  numero: number
  nombre: string
  fecha: string
  onClose?: () => void
  esMobile?: boolean
  className?: string
  showActions?: boolean
}

export default function TicketDisplay({
  numero,
  nombre,
  fecha,
  onClose,
  esMobile = false,
  className = "",
  showActions = false,
}: TicketDisplayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const generarImagenTicket = () => {
    if (typeof document === "undefined" || !mounted) return

    // Crear un canvas para generar la imagen del ticket
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Configurar el tamaño del canvas (ticket de 400x600px)
    canvas.width = 350
    canvas.height = 400

    // Fondo blanco
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Borde del ticket (dashed)
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 3
    ctx.setLineDash([10, 5])
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)
    ctx.setLineDash([]) // Reset dash

    // Título
    ctx.fillStyle = "#000000"
    ctx.font = "bold 24px Arial"
    ctx.textAlign = "center"
    ctx.fillText("NÚMERO DE ATENCIÓN", canvas.width / 2, 80)

    // Número grande
    ctx.fillStyle = "#2563eb"
    ctx.font = "bold 72px Arial"
    ctx.fillText(numero.toString().padStart(3, "0"), canvas.width / 2, 180)

    // Borde del número
    ctx.strokeStyle = "#2563eb"
    ctx.lineWidth = 4
    ctx.strokeRect(80, 120, 240, 80)

    // Nombre del cliente
    ctx.fillStyle = "#16a34a"
    ctx.font = "bold 20px Arial"
    ctx.fillRect(60, 220, 280, 40) // Fondo verde claro
    ctx.fillStyle = "#ffffff"
    ctx.fillText(nombre, canvas.width / 2, 245)

    // Fecha
    ctx.fillStyle = "#000000"
    ctx.font = "italic 16px Arial"
    ctx.fillText(fecha, canvas.width / 2, 300)

    // Línea separadora
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(60, 330)
    ctx.lineTo(340, 330)
    ctx.stroke()
    ctx.setLineDash([])

    // Información adicional
    ctx.fillStyle = "#666666"
    ctx.font = "12px Arial"
    ctx.fillText("Conserve este ticket", canvas.width / 2, 360)
    ctx.fillText("Será llamado por su número o nombre", canvas.width / 2, 380)

    // Logo/marca (texto simple)
    ctx.fillStyle = "#dc2626"
    ctx.font = "bold 16px Arial"
    ctx.fillText("ZOCO - Sistema de Atención", canvas.width / 2, 410)

    // Convertir canvas a blob y descargar
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `ticket-${numero.toString().padStart(3, "0")}-${nombre.replace(/\s+/g, "-")}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, "image/png")
  }

  const compartirTicket = async () => {
    if (typeof navigator === "undefined" || !mounted) return

    const texto = `Mi número de atención es: ${numero.toString().padStart(3, "0")}\nNombre: ${nombre}\nFecha: ${fecha}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket de Atención #${numero.toString().padStart(3, "0")}`,
          text: texto,
        })
      } catch (error) {
        console.log("Error al compartir:", error)
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(texto)
          alert("Información copiada al portapapeles")
        }
      } catch (error) {
        console.log("Error al copiar:", error)
      }
    }
  }

  if (!mounted) return null

  // Si es un modal (tiene onClose), renderizar como modal
  if (onClose) {
    return (
      <div className={styles.modal}>
        <div className={`${styles.card} ${className}`}>
          <div className={styles.cardContent}>
            <div className={styles.ticketInfo}>
              <div className={styles.numero}>{numero.toString().padStart(3, "0")}</div>
              <div className={styles.nombre}>{nombre}</div>
              <div className={styles.fecha}>{fecha}</div>
            </div>
            <div className={styles.actions}>
              <button
                onClick={esMobile ? () => {} : generarImagenTicket}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                <Download className="h-4 w-4" />
                {esMobile ? "Guardar Imagen" : "Descargar Ticket"}
              </button>
              <button onClick={compartirTicket} className={`${styles.button} ${styles.buttonOutline}`}>
                <Share2 className="h-4 w-4" />
                Compartir
              </button>
            </div>
            <button onClick={onClose} className={`${styles.button} ${styles.buttonClose}`}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Renderizado normal (no modal)
  return (
    <div className={`${styles.ticketStatic} ${className}`}>
      <div className={styles.ticketInfo}>
        <h3 className={styles.ticketTitle}>NÚMERO DE ATENCIÓN</h3>
        <div className={styles.numeroStatic}>{numero.toString().padStart(3, "0")}</div>
        <div className={styles.nombreBadge}>{nombre}</div>
        <div className={styles.fecha}>{fecha}</div>
        <div className={styles.divider}>
          <div className={styles.ticketFooter}>
            <p>Conserve este ticket</p>
            <p>Será llamado por su número o nombre</p>
            <p className={styles.ticketBrand}>ZOCO - Sistema de Atención</p>
          </div>
        </div>
      </div>

      {showActions && (
        <div className={styles.actions}>
          <button onClick={generarImagenTicket} className={`${styles.button} ${styles.buttonPrimary}`}>
            <Download className="h-4 w-4" />
            Descargar
          </button>
          <button onClick={compartirTicket} className={`${styles.button} ${styles.buttonOutline}`}>
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
        </div>
      )}
    </div>
  )
}
