"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Play, RotateCcw } from "lucide-react"

const frasesEmpleados = [
  "¡Excelente trabajo! Sigamos brindando el mejor servicio",
  "Tu dedicación hace la diferencia en cada cliente",
  "Gracias por tu profesionalismo y compromiso",
  "¡Eres parte fundamental del éxito de ZOCO!",
  "Tu atención al cliente es excepcional",
  "Sigamos trabajando juntos por la excelencia",
  "¡Cada cliente atendido es una sonrisa más!",
  "Tu eficiencia y calidez nos distinguen",
  "Gracias por hacer de ZOCO un lugar especial",
  "¡Continuemos ofreciendo un servicio de calidad!",
]

export default function EmpleadosPage() {
  const { estado, loading, error, llamarSiguiente, reiniciarContador } = useSistemaEstado()
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

  const handleReiniciar = async () => {
    if (confirm("¿Reiniciar el contador del día?")) {
      setProcesando(true)
      try {
        await reiniciarContador()
      } catch (error) {
        console.error("Error al reiniciar:", error)
      } finally {
        setProcesando(false)
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-16">
          <img src="/logo-rojo.png" alt="ZOCO" className="h-32 md:h-40 mx-auto drop-shadow-lg" />
        </div>

        {/* Contenido Principal */}
        <div className="max-w-2xl mx-auto">
          {/* Número Siguiente */}
          <div className="text-center mb-8">
            <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border-4 border-green-200">
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
          <div className="text-center mb-8">
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
          <div className="text-center mb-12">
            <p className="text-gray-600 text-lg md:text-xl font-medium italic">{fraseAleatoria}</p>
          </div>

          {/* Botón Secundario - Reiniciar */}
          <div className="text-center mb-8">
            <Button
              onClick={handleReiniciar}
              disabled={procesando}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg rounded-2xl shadow-lg"
            >
              <RotateCcw className="mr-3 h-5 w-5" />
              Reiniciar Día
            </Button>
          </div>

          {/* Enlaces de Navegación - Minimalistas */}
          <div className="text-center">
            <div className="flex justify-center gap-6 text-sm">
              <a href="/" className="text-gray-500 hover:text-green-600 transition-colors font-medium">
                Inicio
              </a>
              <span className="text-gray-300">•</span>
              <a href="/proximos" className="text-gray-500 hover:text-green-600 transition-colors font-medium">
                Próximos
              </a>
              <span className="text-gray-300">•</span>
              <a href="/admin" className="text-gray-500 hover:text-green-600 transition-colors font-medium">
                Admin
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
