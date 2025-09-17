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

export default function HomePage() {
  const { estado, loading, error, generarTicket } = useSistemaEstado()
  const [showModal, setShowModal] = useState(false)
  const [ultimoTicket, setUltimoTicket] = useState<TicketInfo | null>(null)
  const [generandoTicket, setGenerandoTicket] = useState(false)

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Simple */}
      <div className="bg-white shadow-sm no-print">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <img src="/logo-rojo.png" alt="ZOCO" className="h-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema de Turnos</h1>
            <p className="text-gray-600">Tome su número y espere a ser llamado</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Información básica */}
        <div className="grid grid-cols-3 gap-4 mb-8 no-print">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-red-600">{estado.numeroActual}</div>
            <div className="text-sm text-gray-600">Próximo Número</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-blue-600">{estado.totalAtendidos}</div>
            <div className="text-sm text-gray-600">Total Emitidos</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-green-600">{estado.numerosLlamados}</div>
            <div className="text-sm text-gray-600">Atendidos</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generar Ticket */}
          <div className="bg-white rounded-lg shadow p-8 text-center no-print">
            <h2 className="text-2xl font-bold mb-6">Solicitar Turno</h2>
            <div className="text-8xl font-bold text-red-600 mb-6">
              {estado.numeroActual.toString().padStart(3, "0")}
            </div>
            <p className="text-gray-600 mb-8">
              Su próximo número será el <strong>{estado.numeroActual}</strong>
            </p>
            <Button
              onClick={() => setShowModal(true)}
              disabled={generandoTicket}
              size="lg"
              className="w-full text-xl py-4 bg-red-600 hover:bg-red-700"
            >
              {generandoTicket ? "Generando..." : "Tomar Número"}
            </Button>
          </div>

          {/* Ticket Generado */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-6 text-center no-print">Su Ticket</h2>
            {ultimoTicket ? (
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg mb-4">
                  <div className="text-6xl font-bold text-red-600 mb-4">
                    {ultimoTicket.numero.toString().padStart(3, "0")}
                  </div>
                  <div className="text-xl font-semibold text-gray-800 mb-2">{ultimoTicket.nombre}</div>
                  <div className="text-sm text-gray-500">{ultimoTicket.fecha}</div>
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">Conserve este ticket</p>
                    <p className="text-xs text-red-600 font-bold">ZOCO - Sistema de Atención</p>
                  </div>
                </div>
                <Button onClick={() => window.print()} variant="outline" className="w-full no-print">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Ticket
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-gray-500">Haga clic en "Tomar Número" para generar su ticket</p>
              </div>
            )}
          </div>
        </div>

        {/* Enlaces de navegación */}
        <div className="mt-8 text-center no-print">
          <div className="space-x-4">
            <a href="/empleados" className="text-blue-600 hover:underline">
              Panel de Empleados
            </a>
            <a href="/proximos" className="text-blue-600 hover:underline">
              Ver Próximos
            </a>
            <a href="/admin" className="text-blue-600 hover:underline">
              Administración
            </a>
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
