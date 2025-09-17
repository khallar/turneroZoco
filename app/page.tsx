"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NombreModal } from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Printer } from "lucide-react"

interface TicketInfo {
  numero: number
  nombre: string
  fecha: string
  timestamp: number
}

const frasesAleatorias = [
  "¡Bienvenido a ZOCO! Tu comodidad es nuestra prioridad",
  "Gracias por elegirnos, estamos aquí para atenderte",
  "Tu tiempo es valioso, nosotros lo respetamos",
  "¡Hola! Estamos listos para brindarte el mejor servicio",
  "Bienvenido, tu satisfacción es nuestro compromiso",
  "¡Gracias por visitarnos! Serás atendido muy pronto",
  "Tu experiencia con nosotros será excepcional",
  "¡Bienvenido! Estamos aquí para hacer tu día mejor",
  "Gracias por confiar en ZOCO para tus necesidades",
  "¡Hola! Prepárate para recibir un servicio de calidad",
]

export default function HomePage() {
  const { estado, loading, error, generarTicket } = useSistemaEstado()
  const [showModal, setShowModal] = useState(false)
  const [ultimoTicket, setUltimoTicket] = useState<TicketInfo | null>(null)
  const [generandoTicket, setGenerandoTicket] = useState(false)
  const [fraseAleatoria] = useState(() => frasesAleatorias[Math.floor(Math.random() * frasesAleatorias.length)])

  const handleGenerarTicket = async (nombre: string) => {
    setGenerandoTicket(true)
    try {
      const ticket = await generarTicket(nombre)
      if (ticket) {
        setUltimoTicket(ticket)
        setShowModal(false)
        setTimeout(() => {
          window.print()
        }, 500)
      }
    } catch (error) {
      console.error("Error al generar ticket:", error)
    } finally {
      setGenerandoTicket(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-16">
          <img src="/logo-rojo.png" alt="ZOCO" className="h-32 md:h-40 mx-auto drop-shadow-lg" />
        </div>

        {/* Contenido Principal */}
        <div className="max-w-2xl mx-auto">
          {/* Botón Principal */}
          <div className="text-center mb-8">
            <Button
              onClick={() => setShowModal(true)}
              disabled={generandoTicket}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-16 py-8 text-4xl md:text-5xl font-bold rounded-3xl shadow-2xl transform hover:scale-105 transition-all duration-300 border-4 border-red-500 hover:border-red-600"
              style={{ minHeight: "120px", minWidth: "300px" }}
            >
              {generandoTicket ? (
                <div className="flex items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  Generando...
                </div>
              ) : (
                "SACAR NÚMERO"
              )}
            </Button>
          </div>

          {/* Frase de Bienvenida */}
          <div className="text-center mb-12">
            <p className="text-gray-600 text-lg md:text-xl font-medium italic">{fraseAleatoria}</p>
          </div>

          {/* Ticket Generado */}
          {ultimoTicket && (
            <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border-4 border-red-200">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Tu Número</h3>
                <div className="border-4 border-dashed border-red-300 rounded-2xl p-8 mb-6">
                  <div className="text-8xl font-black text-red-600 mb-4">
                    {ultimoTicket.numero.toString().padStart(3, "0")}
                  </div>
                  <div className="bg-red-600 text-white font-bold py-3 px-6 rounded-xl text-xl mb-4">
                    {ultimoTicket.nombre}
                  </div>
                  <div className="text-gray-500 text-lg">{ultimoTicket.fecha}</div>
                  <div className="mt-6 pt-6 border-t-2 border-dashed border-red-300">
                    <p className="text-red-600 font-bold text-lg">ZOCO - Sistema de Atención</p>
                    <p className="text-gray-500">Conserve este ticket</p>
                  </div>
                </div>
                <Button
                  onClick={() => window.print()}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-xl rounded-2xl no-print"
                >
                  <Printer className="mr-3 h-6 w-6" />
                  Imprimir Ticket
                </Button>
              </div>
            </div>
          )}

          {/* Enlaces de Navegación - Minimalistas */}
          <div className="text-center no-print">
            <div className="flex justify-center gap-6 text-sm">
              <a href="/empleados" className="text-gray-500 hover:text-red-600 transition-colors font-medium">
                Empleados
              </a>
              <span className="text-gray-300">•</span>
              <a href="/proximos" className="text-gray-500 hover:text-red-600 transition-colors font-medium">
                Próximos
              </a>
              <span className="text-gray-300">•</span>
              <a href="/admin" className="text-gray-500 hover:text-red-600 transition-colors font-medium">
                Admin
              </a>
            </div>
          </div>
        </div>
      </div>

      <NombreModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleGenerarTicket}
        loading={generandoTicket}
      />
    </div>
  )
}
