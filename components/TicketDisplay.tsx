"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Share2, Download } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

interface TicketDisplayProps {
  ticket: TicketInfo
  isCurrentTicket?: boolean
  showAnimation?: boolean
  onClose?: () => void
  esMobile?: boolean
}

export default function TicketDisplay({
  ticket,
  isCurrentTicket = false,
  showAnimation = false,
  onClose,
  esMobile,
}: TicketDisplayProps) {
  const [mostrarTicket, setMostrarTicket] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setMostrarTicket(true)
  }, [])

  const generarImagenTicket = () => {
    if (typeof document === "undefined" || !mounted) return

    // Crear un canvas para generar la imagen del ticket
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Configurar el tamaño del canvas (ticket de 400x600px)
    canvas.width = 400
    canvas.height = 600

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
    ctx.fillText(ticket.numero.toString().padStart(3, "0"), canvas.width / 2, 180)

    // Borde del número
    ctx.strokeStyle = "#2563eb"
    ctx.lineWidth = 4
    ctx.strokeRect(80, 120, 240, 80)

    // Nombre del cliente
    if (ticket.nombre) {
      ctx.fillStyle = "#16a34a"
      ctx.font = "bold 20px Arial"
      ctx.fillRect(60, 220, 280, 40) // Fondo verde claro
      ctx.fillStyle = "#ffffff"
      ctx.fillText(ticket.nombre, canvas.width / 2, 245)
    }

    // Línea separadora
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(60, 280)
    ctx.lineTo(340, 280)
    ctx.stroke()
    ctx.setLineDash([])

    // Información adicional
    ctx.fillStyle = "#666666"
    ctx.font = "12px Arial"
    if (ticket.fecha) {
      ctx.fillText(`Fecha: ${ticket.fecha}`, canvas.width / 2, 310)
    }
    ctx.fillText("Conserve este ticket", canvas.width / 2, 330)
    ctx.fillText("Será llamado por su número o nombre", canvas.width / 2, 350)

    // Logo/marca (texto simple)
    ctx.fillStyle = "#dc2626"
    ctx.font = "bold 16px Arial"
    ctx.fillText("ZOCO - Sistema de Atención", canvas.width / 2, 380)

    // Convertir canvas a blob y descargar
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `ticket-${ticket.numero.toString().padStart(3, "0")}-${ticket.nombre.replace(/\s+/g, "-")}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, "image/png")
  }

  const guardarTicketMobile = () => {
    if (typeof window === "undefined" || !mounted) return

    // En móvil, crear una ventana con la imagen para que puedan guardarla
    const ticketWindow = window.open("", "_blank", "width=400,height=700")
    if (ticketWindow) {
      ticketWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${ticket.numero}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 20px;
                background: white;
                text-align: center;
              }
              .ticket {
                border: 2px dashed #333;
                padding: 20px;
                max-width: 300px;
                margin: 0 auto;
                background: white;
              }
              .numero {
                font-size: 48px;
                font-weight: bold;
                color: #2563eb;
                border: 3px solid #2563eb;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
              }
              .nombre {
                font-size: 18px;
                font-weight: bold;
                color: #16a34a;
                margin: 15px 0;
                padding: 10px;
                background: #f0f9ff;
                border-radius: 5px;
              }
              .frase {
                font-size: 14px;
                font-style: italic;
                margin: 15px 0;
              }
              .info {
                font-size: 10px;
                margin: 5px 0;
              }
              hr {
                border: 1px dashed #666;
                margin: 15px 0;
              }
              .acciones {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
              }
              .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
              }
              .btn-save {
                background: #16a34a;
                color: white;
              }
              .btn-share {
                background: #2563eb;
                color: white;
              }
              .btn-close {
                background: #dc2626;
                color: white;
              }
              .instrucciones {
                margin-top: 20px;
                padding: 15px;
                background: #fef3c7;
                border-radius: 8px;
                border: 2px solid #f59e0b;
              }
              .instrucciones h3 {
                color: #92400e;
                margin-top: 0;
              }
              .instrucciones p {
                color: #92400e;
                font-size: 12px;
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="ticket" id="ticket">
              <h2>NÚMERO DE ATENCIÓN</h2>
              <div class="numero">${ticket.numero.toString().padStart(3, "0")}</div>
              ${ticket.nombre ? `<div class="nombre">${ticket.nombre}</div>` : ""}
              <hr>
              ${ticket.fecha ? `<p class="info">Fecha: ${ticket.fecha}</p>` : ""}
              <p class="info">Conserve este ticket</p>
              <p class="info">Será llamado por su número o nombre</p>
              <p class="info">ZOCO - Sistema de Atención</p>
            </div>
            
            <div class="instrucciones">
              <h3>📱 Cómo guardar su ticket:</h3>
              <p>• Mantenga presionada la imagen del ticket</p>
              <p>• Seleccione "Guardar imagen" o "Descargar"</p>
              <p>• La imagen se guardará en su galería</p>
            </div>
            
            <div class="acciones">
              <button class="btn btn-save" onclick="guardarImagen()">💾 Guardar Imagen</button>
              <button class="btn btn-share" onclick="compartir()">📤 Compartir</button>
              <button class="btn btn-close" onclick="window.close()">❌ Cerrar</button>
            </div>
            
            <script>
              function guardarImagen() {
                // Crear canvas para generar imagen
                const ticket = document.getElementById('ticket');
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = 400;
                canvas.height = 600;
                
                // Fondo blanco
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Borde
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 5]);
                ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
                ctx.setLineDash([]);
                
                // Título
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('NÚMERO DE ATENCIÓN', canvas.width / 2, 80);
                
                // Número
                ctx.fillStyle = '#2563eb';
                ctx.font = 'bold 72px Arial';
                ctx.fillText('${ticket.numero.toString().padStart(3, "0")}', canvas.width / 2, 180);
                
                // Borde del número
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 4;
                ctx.strokeRect(80, 120, 240, 80);
                
                // Nombre
                ${
                  ticket.nombre
                    ? `
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(60, 220, 280, 40);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Arial';
                ctx.fillText('${ticket.nombre}', canvas.width / 2, 245);
                `
                    : ""
                }
                
                // Info
                ctx.fillStyle = '#666666';
                ctx.font = '12px Arial';
                ${ticket.fecha ? `ctx.fillText('Fecha: ${ticket.fecha}', canvas.width / 2, 350);` : ""}
                ctx.fillText('Conserve este ticket', canvas.width / 2, 370);
                ctx.fillText('Será llamado por su número o nombre', canvas.width / 2, 390);
                ctx.fillText('ZOCO - Sistema de Atención', canvas.width / 2, 420);
                
                // Descargar
                canvas.toBlob((blob) => {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'ticket-${ticket.numero.toString().padStart(3, "0")}-${ticket.nombre.replace(/\s+/g, "-")}.png';
                  link.click();
                  URL.revokeObjectURL(url);
                });
              }
              
              function compartir() {
                if (navigator.share) {
                  navigator.share({
                    title: 'Ticket de Atención #${ticket.numero.toString().padStart(3, "0")}',
                    text: 'Mi número de atención es: ${ticket.numero.toString().padStart(3, "0")}\\n${ticket.nombre ? `Nombre: ${ticket.nombre}\\n` : ""}',
                    url: window.location.href
                  });
                } else {
                  const texto = 'Mi número de atención es: ${ticket.numero.toString().padStart(3, "0")}\\n${ticket.nombre ? `Nombre: ${ticket.nombre}\\n` : ""}';
                  navigator.clipboard.writeText(texto).then(() => {
                    alert('Información copiada al portapapeles');
                  });
                }
              }
            </script>
          </body>
        </html>
      `)
      ticketWindow.document.close()
    }
  }

  const compartirTicket = async () => {
    if (typeof navigator === "undefined" || !mounted) return

    const texto = `Mi número de atención es: ${ticket.numero.toString().padStart(3, "0")}\n${ticket.nombre ? `Nombre: ${ticket.nombre}\n` : ""}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket de Atención #${ticket.numero.toString().padStart(3, "0")}`,
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

  if (!mostrarTicket || !mounted) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card
        className={`
        ${isCurrentTicket ? "bg-red-600 text-white border-red-700 shadow-lg" : "bg-white border-gray-200"}
        ${showAnimation ? "animate-pulse" : ""}
        transition-all duration-300
        w-full max-w-sm
      `}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Ticket Generado</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="bg-white border-2 border-dashed border-gray-400 p-6 text-center font-mono mb-4">
            <h3 className="text-lg font-bold mb-4">NÚMERO DE ATENCIÓN</h3>
            <div className={`text-6xl font-bold ${isCurrentTicket ? "text-white" : "text-red-600"}`}>
              {ticket.numero.toString().padStart(3, "0")}
            </div>
            <div className={`text-lg font-medium ${isCurrentTicket ? "text-red-100" : "text-gray-700"}`}>
              {ticket.nombre}
            </div>
            <div className={`text-sm ${isCurrentTicket ? "text-red-200" : "text-gray-500"}`}>{ticket.fecha}</div>
            <hr className="border-dashed border-gray-400 my-3" />
            <p className="text-xs">Conserve este ticket</p>
            <p className="text-xs">Será llamado por su número o nombre</p>
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              onClick={esMobile ? guardarTicketMobile : generarImagenTicket}
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

          {esMobile && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                💡 <strong>Tip:</strong> Después de presionar "Guardar Imagen", mantenga presionada la imagen del ticket
                y seleccione "Guardar imagen" para guardarlo en su galería.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
