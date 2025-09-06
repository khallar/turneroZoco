"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, X } from "lucide-react"

interface TicketDisplayProps {
  numero: number
  nombre: string
  frase: string
  fecha: string
  esMobile?: boolean
  onClose: () => void
}

export default function TicketDisplay({ numero, nombre, frase, fecha, esMobile = false, onClose }: TicketDisplayProps) {
  const [mostrarAnimacion, setMostrarAnimacion] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarAnimacion(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const imprimirTicket = () => {
    const ventanaImpresion = window.open("", "_blank")
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <html>
          <head>
            <title>Ticket #${numero}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                background: white;
              }
              .ticket { 
                border: 2px solid #dc2626; 
                padding: 20px; 
                margin: 20px auto;
                max-width: 300px;
                border-radius: 10px;
              }
              .numero { 
                font-size: 48px; 
                font-weight: bold; 
                color: #dc2626; 
                margin: 10px 0;
              }
              .nombre { 
                font-size: 18px; 
                margin: 10px 0;
                font-weight: bold;
              }
              .fecha { 
                font-size: 14px; 
                color: #666; 
                margin: 10px 0;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="logo">ZOCO</div>
              <div>Su turno es:</div>
              <div class="numero">#${numero.toString().padStart(3, "0")}</div>
              <div class="nombre">${nombre}</div>
              <div class="fecha">${fecha}</div>
              <div style="margin-top: 20px; font-size: 12px; color: #666;">
                Conserve este ticket hasta ser atendido
              </div>
            </div>
          </body>
        </html>
      `)
      ventanaImpresion.document.close()
      ventanaImpresion.print()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-md bg-white ${mostrarAnimacion ? "animate-bounce" : ""}`}>
        <CardHeader className="bg-red-600 text-white relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-center text-2xl">¡Ticket Generado!</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <div className="text-6xl font-bold text-red-600 mb-4">#{numero.toString().padStart(3, "0")}</div>
            <div className="text-xl font-semibold text-gray-800 mb-2">{nombre}</div>
            <div className="text-sm text-gray-600 mb-4">{fecha}</div>
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <p className="text-blue-800 italic">{frase}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={imprimirTicket} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
              <Printer className="mr-2 h-5 w-5" />
              Imprimir Ticket
            </Button>

            <Button onClick={onClose} variant="outline" className="w-full bg-transparent" size="lg">
              Cerrar
            </Button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>Conserve este ticket hasta ser atendido</p>
            <p>Será llamado por su nombre o número</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { TicketDisplay }
