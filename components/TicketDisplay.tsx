"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Share2, Download } from "lucide-react"

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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className={`w-full max-w-md bg-white ${className}`}>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="text-6xl font-bold text-red-600">{numero.toString().padStart(3, "0")}</div>
              <div className="text-xl font-semibold text-gray-800">{nombre}</div>
              <div className="text-sm text-gray-500">{fecha}</div>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button
                onClick={esMobile ? () => {} : generarImagenTicket}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Download className="mr-2 h-4 w-4" />
                {esMobile ? "Guardar Imagen" : "Descargar Ticket"}
              </Button>
              <Button onClick={compartirTicket} variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </Button>
            </div>
            <Button onClick={onClose} className="mt-4 w-full bg-transparent" variant="outline">
              Cerrar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Renderizado normal (no modal)
  return (
    <div className={`bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center ${className}`}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">NÚMERO DE ATENCIÓN</h3>
        <div className="text-6xl font-bold text-red-600 border-4 border-red-600 rounded-lg py-4">
          {numero.toString().padStart(3, "0")}
        </div>
        <div className="bg-green-600 text-white font-bold py-2 px-4 rounded">{nombre}</div>
        <div className="text-sm text-gray-500">{fecha}</div>
        <div className="border-t border-dashed border-gray-300 pt-4">
          <p className="text-xs text-gray-500">Conserve este ticket</p>
          <p className="text-xs text-gray-500">Será llamado por su número o nombre</p>
          <p className="text-xs text-red-600 font-bold mt-2">ZOCO - Sistema de Atención</p>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 justify-center mt-4">
          <Button onClick={generarImagenTicket} size="sm" className="bg-green-600 hover:bg-green-700">
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
          <Button onClick={compartirTicket} variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
          </Button>
        </div>
      )}
    </div>
  )
}
