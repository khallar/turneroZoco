"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import TicketDisplay from "@/components/TicketDisplay"
import NombreModal from "@/components/NombreModal"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Printer, Users, Monitor, Settings } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { estado, tickets, loading, error, generarTicket } = useSistemaEstado()
  const [showNombreModal, setShowNombreModal] = useState(false)
  const [ultimoTicket, setUltimoTicket] = useState<any>(null)

  const handleGenerarTicket = async (nombre?: string) => {
    try {
      const ticket = await generarTicket(nombre)
      setUltimoTicket(ticket)
      setShowNombreModal(false)
    } catch (err) {
      console.error("Error al generar ticket:", err)
    }
  }

  const imprimirTicket = () => {
    if (ultimoTicket) {
      const ventanaImpresion = window.open("", "_blank")
      if (ventanaImpresion) {
        ventanaImpresion.document.write(`
          <html>
            <head>
              <title>Ticket ${ultimoTicket.numero}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px;
                  margin: 0;
                }
                .ticket {
                  border: 2px solid #000;
                  padding: 20px;
                  margin: 20px auto;
                  width: 300px;
                  background: white;
                }
                .numero {
                  font-size: 48px;
                  font-weight: bold;
                  color: #dc2626;
                  margin: 20px 0;
                }
                .nombre {
                  font-size: 24px;
                  font-weight: bold;
                  margin: 10px 0;
                }
                .fecha {
                  font-size: 14px;
                  color: #666;
                  margin-top: 20px;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .ticket { margin: 0; border: 2px solid #000; }
                }
              </style>
            </head>
            <body>
              <div class="ticket">
                <img src="/logo-rojo.png" alt="Logo" style="height: 60px; margin-bottom: 20px;">
                <h2>TICKET DE TURNO</h2>
                <div class="numero">${ultimoTicket.numero.toString().padStart(3, "0")}</div>
                ${ultimoTicket.nombre ? `<div class="nombre">${ultimoTicket.nombre}</div>` : ""}
                <div class="fecha">${new Date(ultimoTicket.timestamp).toLocaleString("es-ES")}</div>
                <p style="margin-top: 20px; font-size: 12px;">
                  Conserve este ticket hasta ser atendido
                </p>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }
              </script>
            </body>
          </html>
        `)
        ventanaImpresion.document.close()
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl font-semibold text-gray-600">Cargando sistema...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-600 mb-4">Error del Sistema</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    )
  }

  const ticketActual = tickets.find((t) => t.numero === estado.numeroActual)
  const proximosTickets = tickets.filter((t) => t.numero > estado.numeroActual).slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/logo-rojo.png" alt="Logo" className="h-12" />
            <h1 className="text-2xl font-bold text-gray-800">Sistema de Turnos</h1>
          </div>
          <div className="flex space-x-2">
            <Link href="/empleados">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Empleados
              </Button>
            </Link>
            <Link href="/proximos">
              <Button variant="outline" size="sm">
                <Monitor className="w-4 h-4 mr-2" />
                Próximos
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel de Generación de Tickets */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Generar Nuevo Ticket</h2>

            <div className="space-y-6">
              <Button
                onClick={() => handleGenerarTicket()}
                className="w-full h-16 text-xl font-semibold bg-red-600 hover:bg-red-700"
                disabled={!estado.activo}
              >
                Generar Ticket Rápido
              </Button>

              <div className="text-center text-gray-500">o</div>

              <Button
                onClick={() => setShowNombreModal(true)}
                variant="outline"
                className="w-full h-16 text-xl font-semibold border-red-600 text-red-600 hover:bg-red-50"
                disabled={!estado.activo}
              >
                Generar con Nombre
              </Button>

              {!estado.activo && <div className="text-center text-red-600 font-semibold">Sistema desactivado</div>}
            </div>

            {ultimoTicket && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-center">Último Ticket Generado</h3>
                <div className="flex justify-center mb-4">
                  <TicketDisplay
                    numero={ultimoTicket.numero}
                    nombre={ultimoTicket.nombre}
                    className="transform scale-75"
                  />
                </div>
                <Button onClick={imprimirTicket} className="w-full bg-transparent" variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Ticket
                </Button>
              </div>
            )}
          </div>

          {/* Panel de Estado Actual */}
          <div className="space-y-6">
            {/* Ticket Actual */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Atendiendo Ahora</h2>
              <div className="flex justify-center">
                <TicketDisplay numero={estado.numeroActual} nombre={ticketActual?.nombre} />
              </div>
            </div>

            {/* Próximos Tickets */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-center mb-4 text-gray-800">Próximos en Cola</h3>
              <div className="space-y-3">
                {proximosTickets.map((ticket) => (
                  <div key={ticket.numero} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-2xl font-bold text-red-600">{ticket.numero.toString().padStart(3, "0")}</span>
                    {ticket.nombre && <span className="text-lg font-semibold text-gray-700">{ticket.nombre}</span>}
                  </div>
                ))}
                {proximosTickets.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No hay tickets en cola</div>
                )}
              </div>
            </div>

            {/* Estado del Sistema */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div
                className={`inline-block px-6 py-3 rounded-full text-white font-semibold text-lg ${
                  estado.activo ? "bg-green-500" : "bg-red-500"
                }`}
              >
                Sistema {estado.activo ? "Activo" : "Inactivo"}
              </div>
              <div className="mt-4 text-gray-600">
                Próximo número:{" "}
                <span className="font-bold text-2xl text-red-600">
                  {estado.proximoNumero.toString().padStart(3, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NombreModal isOpen={showNombreModal} onClose={() => setShowNombreModal(false)} onConfirm={handleGenerarTicket} />
    </div>
  )
}
