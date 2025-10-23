"use client"

import { useState, useEffect } from "react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Clock, Users, Timer } from "lucide-react"

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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando próximos turnos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center mx-4">
          <div className="text-red-600 mb-4 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Error de Conexión</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
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
        })
      }
    }
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados
  const tiempoPromedio = calcularTiempoPromedio()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header con Logo */}
      <div className="pt-8 pb-6">
        <div className="text-center">
          <img src="/logo-rojo.png" alt="ZOCO" className="h-20 mx-auto mb-4 filter brightness-0 invert" />
          <h1 className="text-4xl font-bold text-white mb-2">Próximos Turnos</h1>
          <div className="flex justify-center items-center gap-8 text-white/80 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-lg font-medium">{horaActual}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-lg font-medium">{ticketsPendientes} en espera</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="text-lg font-medium">Promedio: {tiempoPromedio}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6">
        {/* Número Actual Siendo Atendido */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-3xl p-8 text-center shadow-2xl border border-red-400">
            <h2 className="text-2xl font-bold text-white mb-4">🔥 ATENDIENDO AHORA</h2>
            <div className="text-8xl font-black text-white mb-4 tracking-wider">
              {numeroActualLlamado > 0 ? numeroActualLlamado.toString().padStart(3, "0") : "---"}
            </div>
            {numeroActualLlamado > 0 && estado.tickets && (
              <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-white text-xl font-semibold">
                  {estado.tickets.find((t) => t.numero === numeroActualLlamado)?.nombre || "Cliente"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Próximos 5 Turnos */}
        <div className="space-y-4 mb-8">
          <h3 className="text-2xl font-bold text-white text-center mb-6">📋 Próximos en la Fila</h3>

          {proximosConNombres.length > 0 ? (
            <div className="space-y-3">
              {proximosConNombres.map((item, index) => (
                <div
                  key={item.numero}
                  className={`rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-105 ${
                    index === 0
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 border-2 border-green-400"
                      : index === 1
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-400"
                        : index === 2
                          ? "bg-gradient-to-r from-purple-500 to-purple-600 border-2 border-purple-400"
                          : "bg-gradient-to-r from-gray-600 to-gray-700 border-2 border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-2xl font-black text-white">
                          {item.numero.toString().padStart(3, "0")}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-xl font-bold capitalize">{item.nombre}</p>
                        <p className="text-white/80 text-sm">
                          {index === 0 ? "🥇 Siguiente" : `Posición ${item.posicion}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`px-4 py-2 rounded-full text-sm font-bold mb-2 ${
                          index === 0 ? "bg-white text-green-600" : "bg-white/20 text-white"
                        }`}
                      >
                        {index === 0 ? "SIGUIENTE" : `+${item.posicion}`}
                      </div>
                      <div className="text-white/70 text-xs flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        <span>
                          ≈ {Math.round(Number.parseFloat(tiempoPromedio.replace(/[^\d.]/g, "")) * item.posicion)} min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl p-12 text-center shadow-xl">
              <div className="text-8xl mb-6">🎉</div>
              <h3 className="text-3xl font-bold text-white mb-4">¡Excelente!</h3>
              <p className="text-white/80 text-xl">No hay más turnos en espera</p>
              <p className="text-white/60 text-lg mt-2">Todos los números han sido atendidos</p>
            </div>
          )}
        </div>

        {/* Información del Sistema */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{estado.totalAtendidos}</div>
              <p className="text-white/80 text-sm">Total Emitidos</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{estado.numerosLlamados}</div>
              <p className="text-white/80 text-sm">Total Atendidos</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{tiempoPromedio}</div>
              <p className="text-white/80 text-sm">Tiempo Promedio</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <p className="text-white/60 text-sm">Sistema Activo • Versión 5.2 • Actualizado: {horaActual}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-white/40 text-sm">Desarrollado por Karim • Sistema de Turnos ZOCO • V 7.1</p>
        </div>
      </div>
    </div>
  )
}
