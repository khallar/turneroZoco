"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Play, Users, ArrowLeft, Settings, Eye } from "lucide-react"

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
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
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-12">
          <img src="/logo-rojo.png" alt="ZOCO" className="h-24 md:h-32 mx-auto drop-shadow-lg" />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Panel Principal - Izquierda */}
            <div className="space-y-6">
              {/* Número Siguiente */}
              <div className="text-center">
                <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-green-200">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Próximo Número</h2>
                  <div className="text-9xl font-black text-green-600 mb-4">
                    {hayMasNumeros ? siguienteNumero.toString().padStart(3, "0") : "---"}
                  </div>
                  {hayMasNumeros && estado.tickets && (
                    <div className="bg-green-600 text-white font-bold py-3 px-6 rounded-xl text-xl mb-4">
                      {estado.tickets.find((t) => t.numero === siguienteNumero)?.nombre || "Cliente"}
                    </div>
                  )}
                  <div className="text-gray-500 text-lg">
                    {ticketsPendientes} {ticketsPendientes === 1 ? "persona" : "personas"} en espera
                  </div>
                </div>
              </div>

              {/* Botón Principal */}
              <div className="text-center">
                <Button
                  onClick={handleLlamarSiguiente}
                  disabled={!hayMasNumeros || procesando}
                  className={`px-16 py-8 text-4xl md:text-5xl font-bold rounded-3xl shadow-2xl transform hover:scale-105 transition-all duration-300 border-4 ${
                    hayMasNumeros
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-green-500 hover:border-green-600"
                      : "bg-gray-400 text-gray-600 border-gray-300 cursor-not-allowed"
                  }`}
                  style={{ minHeight: "120px", minWidth: "300px" }}
                >
                  {procesando ? (
                    <div className="flex items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      Llamando...
                    </div>
                  ) : hayMasNumeros ? (
                    <div className="flex items-center gap-4">
                      <Play className="h-12 w-12" />
                      LLAMAR SIGUIENTE
                    </div>
                  ) : (
                    "SIN TURNOS"
                  )}
                </Button>
              </div>

              {/* Frase de Motivación */}
              <div className="text-center">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <p className="text-gray-600 text-lg md:text-xl font-medium italic">{fraseAleatoria}</p>
                </div>
              </div>
            </div>

            {/* Lista de Próximos 20 - Derecha */}
            <div>
              <Card className="h-full">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-6 w-6" />
                    Próximos 20 en la Fila
                  </CardTitle>
                  <p className="text-blue-100 text-sm">Lista de turnos pendientes por llamar</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    {proximosTickets.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {proximosTickets.map((ticket, index) => (
                          <div
                            key={ticket.numero}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              index === 0
                                ? "bg-green-50 border-l-4 border-green-500"
                                : index === 1
                                  ? "bg-blue-50 border-l-4 border-blue-500"
                                  : index === 2
                                    ? "bg-yellow-50 border-l-4 border-yellow-500"
                                    : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                    index === 0
                                      ? "bg-green-500 text-white"
                                      : index === 1
                                        ? "bg-blue-500 text-white"
                                        : index === 2
                                          ? "bg-yellow-500 text-white"
                                          : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {ticket.numero.toString().padStart(3, "0")}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 capitalize">
                                    {ticket.nombre.length > 20 ? ticket.nombre.substring(0, 20) + "..." : ticket.nombre}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {index === 0 ? "🥇 Siguiente" : `Posición ${ticket.posicion}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    index === 0
                                      ? "bg-green-100 text-green-800"
                                      : index === 1
                                        ? "bg-blue-100 text-blue-800"
                                        : index === 2
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  +{ticket.posicion}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">¡Excelente trabajo!</h3>
                        <p className="text-gray-500">No hay más turnos pendientes</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Estadísticas Rápidas */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{estado.totalAtendidos}</div>
              <p className="text-sm text-gray-600">Total Emitidos</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg text-center">
              <div className="text-2xl font-bold text-green-600">{estado.numerosLlamados}</div>
              <p className="text-sm text-gray-600">Total Atendidos</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{ticketsPendientes}</div>
              <p className="text-sm text-gray-600">En Espera</p>
            </div>
          </div>

          {/* Navegación */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/"
              className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl text-center"
            >
              <div className="flex items-center justify-center gap-3">
                <ArrowLeft className="h-5 w-5" />
                <span>Volver a Inicio</span>
              </div>
            </a>

            <a
              href="/proximos"
              className="group bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl text-center"
            >
              <div className="flex items-center justify-center gap-3">
                <Eye className="h-5 w-5" />
                <span>Ver Próximos</span>
              </div>
            </a>

            <a
              href="/admin"
              className="group bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-xl text-center"
            >
              <div className="flex items-center justify-center gap-3">
                <Settings className="h-5 w-5" />
                <span>Panel Admin</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
