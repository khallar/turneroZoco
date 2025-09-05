"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users, Timer, RefreshCw, ArrowLeft } from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Button } from "@/components/ui/button"

const FRASES_ALEATORIAS = [
  "¡Gracias por visitarnos!",
  "Su paciencia es muy apreciada",
  "Estamos aquí para servirle",
  "¡Bienvenido a nuestro local!",
  "Pronto será atendido",
  "Gracias por elegirnos",
  "Su satisfacción es nuestra prioridad",
  "¡Que tenga un excelente día!",
  "Apreciamos su visita",
  "Estamos para ayudarle",
  "¡Hoy puede ser un gran día para decorar una torta o una fiesta! 🎉🍰 ",
  "Mientras esperás tu turno, pensá qué excusa vas a dar para llevarte todo.😉🛍️",
  "Decorá tu día con colores, glaseado… y un poco de ZOCO. 🌈✨",
  "Respirá hondo… estás en el lugar donde empiezan las fiestas.🎈💃",
  "No sos vos, es tu casa que necesita más cotillón 🏡🎊",
  "Tranquilo… en ZOCO los turnos son rápidos y las ideas, infinitas 🧠⚡",
  "¡ZOCOnsejo del día! Nunca subestimes el poder de una buena servilleta temática. 🍽️🎁",
  "Quedate tranquilo, ya te toca. Y sí, podés llevarte ese globo gigante. 🎈🛒",
  "Un turno en ZOCO vale más que mil excusas para no festejar. 🥳💬",
  "Estás a un paso de que tu casa parezca una fiesta sorpresa permanente. 🎁🎊",
  "¡Ya casi es tu turno! Prepará la sonrisa 😁",
  "Turno en mano, paciencia en el corazón 🧘‍♂️",
  "¿Ansias? Tranqui, lo bueno se hace esperar ⏳",
  "¡Gracias por venir! Ya te atendemos 💕",
  "Turnito sacado, ahora a mirar memes 😜",
  "¡Sos el próximo protagonista! 🎬",
  "Mientras esperás… pensá en algo rico 🍫",
  "Tu número tiene suerte, lo presiento 🍀",
  "Esto no es el bingo… ¡pero podés ganar buena onda! 🎟️",
  "Estamos a full, pero ya te toca 💪",
  "Gracias por bancarnos con onda 🙌",
  "¡Zoco no se toma vacaciones! Vos tampoco del buen humor 😄",
  "Te prometemos atención con una sonrisa 😃",
  "Mientras esperás, pensá qué más te podés llevar 👀",
  "Esto es más rápido que sacar una selfie 📸",
]

export default function PaginaProximos() {
  const {
    estado,
    estadisticas,
    loading,
    error,
    cargarEstado,
    ultimaSincronizacion,
    isClient,
    cacheStats, // Nueva utilidad de cache
  } = useSistemaEstado("proximos") // Especificar que es la página próximos

  const [fraseAleatoria, setFraseAleatoria] = useState("")
  const [horaActual, setHoraActual] = useState<Date | null>(null)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)

  // Seleccionar frase aleatoria al cargar
  useEffect(() => {
    if (isClient) {
      const fraseSeleccionada = FRASES_ALEATORIAS[Math.floor(Math.random() * FRASES_ALEATORIAS.length)]
      setFraseAleatoria(fraseSeleccionada)
    }
  }, [isClient])

  // Actualizar hora cada minuto
  useEffect(() => {
    if (!isClient) return

    const actualizarHora = () => {
      setHoraActual(new Date())
    }

    actualizarHora()
    const interval = setInterval(actualizarHora, 60000)
    return () => clearInterval(interval)
  }, [isClient])

  const actualizarDatosManual = async () => {
    setActualizandoDatos(true)
    try {
      await cargarEstado(true, true) // Forzar actualización con estadísticas
    } catch (error) {
      console.error("Error al actualizar datos:", error)
    } finally {
      setActualizandoDatos(false)
    }
  }

  // Calcular próximos 5 números
  const calcularProximos5 = () => {
    if (!estado || !estado.tickets) return []

    const proximoNumero = estado.numerosLlamados + 1
    const proximos = []

    for (let i = 0; i < 5; i++) {
      const numeroAMostrar = proximoNumero + i
      if (numeroAMostrar <= estado.totalAtendidos) {
        const ticket = estado.tickets.find((t) => t.numero === numeroAMostrar)
        proximos.push({
          numero: numeroAMostrar,
          nombre: ticket?.nombre || "Cliente ZOCO",
          posicion: i + 1,
        })
      }
    }

    return proximos
  }

  // Calcular tiempo promedio de atención
  const calcularTiempoPromedio = () => {
    if (!estadisticas) return "Calculando..."

    const tiempoPromedio = estadisticas.promedioTiempoPorTicket
    if (tiempoPromedio === 0) return "Sin datos suficientes"

    const minutos = Math.round(tiempoPromedio)
    return `${minutos} minutos`
  }

  const proximos5 = calcularProximos5()
  const tiempoPromedio = calcularTiempoPromedio()

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando próximos turnos (Cache Optimizado)...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo ZOCO"
              className="h-32 md:h-40 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(11%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(100%) contrast(120%)",
              }}
            />
          </div>

          {/* Frase aleatoria */}
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 shadow-lg">
              <CardContent className="p-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center">
                  {fraseAleatoria || "¡Bienvenido a nuestro local!"}
                </h1>
              </CardContent>
            </Card>
          </div>

          {/* Información de estado optimizada */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {horaActual
                  ? horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Cargando..."}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>
                Última actualización:{" "}
                {ultimaSincronizacion
                  ? ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Nunca"}
              </span>
            </div>
            {/* Indicador de cache */}
            {cacheStats.totalEntries > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  📦 Cache: {cacheStats.totalEntries} entradas
                </span>
              </div>
            )}
          </div>

          {/* Botones de navegación y actualización */}
          <div className="flex justify-center gap-4 mb-8">
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Tickets
            </a>
            <Button
              onClick={actualizarDatosManual}
              disabled={actualizandoDatos}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {actualizandoDatos ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Próximos 5 turnos */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-xl border-4 border-purple-300">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Próximos 5 Turnos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {proximos5.length > 0 ? (
                  <div className="space-y-4">
                    {proximos5.map((turno, index) => (
                      <div
                        key={turno.numero}
                        className={`p-4 rounded-lg border-l-4 ${
                          index === 0
                            ? "bg-green-50 border-green-500 shadow-lg"
                            : index === 1
                              ? "bg-blue-50 border-blue-500"
                              : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div
                              className={`text-3xl font-bold ${
                                index === 0 ? "text-green-600" : index === 1 ? "text-blue-600" : "text-gray-600"
                              }`}
                            >
                              #{turno.numero.toString().padStart(3, "0")}
                            </div>
                            <div>
                              <p className="font-bold text-lg text-gray-800">{turno.nombre}</p>
                              <p className="text-sm text-gray-500">
                                {index === 0 ? "🔥 Próximo en ser llamado" : `Posición ${turno.posicion} en la fila`}
                              </p>
                            </div>
                          </div>
                          {index === 0 && (
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                              PRÓXIMO
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl text-gray-300 mb-4">🎫</div>
                    <p className="text-xl text-gray-500 mb-2">No hay turnos pendientes</p>
                    <p className="text-gray-400">Todos los números han sido llamados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral con estadísticas */}
          <div className="space-y-6">
            {/* Tiempo promedio */}
            <Card className="bg-gradient-to-br from-orange-100 to-red-100 border-4 border-orange-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Tiempo Promedio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">{tiempoPromedio}</div>
                <p className="text-sm text-gray-600">Por ticket atendido</p>
                {estadisticas && estadisticas.promedioTiempoPorTicket > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500">
                      Basado en {estadisticas.ticketsAtendidos} tickets atendidos hoy
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estadísticas del día */}
            <Card className="bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-blue-300 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Estado del Día
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets emitidos:</span>
                    <span className="font-bold text-blue-600">{estado?.totalAtendidos || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ya llamados:</span>
                    <span className="font-bold text-green-600">{estado?.numerosLlamados || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">En espera:</span>
                    <span className="font-bold text-orange-600">
                      {(estado?.totalAtendidos || 0) - (estado?.numerosLlamados || 0)}
                    </span>
                  </div>
                  <hr className="border-gray-300" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Próximo número:</span>
                    <span className="font-bold text-purple-600">
                      #{(estado?.numerosLlamados + 1 || 1).toString().padStart(3, "0")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información adicional */}
            <Card className="bg-gradient-to-br from-green-100 to-teal-100 border-4 border-green-300 shadow-xl">
              <CardContent className="p-6 text-center">
                <div className="text-2xl mb-2">📱</div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>¿Necesitas sacar un número?</strong>
                </p>
                <a
                  href="/"
                  className="inline-block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Ir a Sacar Ticket
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mensaje de error si existe */}
        {error && (
          <Card className="mb-6 bg-red-50 border-2 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600 text-center">⚠️ {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 5.3 | Cache Optimizado - Menos consultas DB</p>
            <p className="mt-1">Actualización inteligente cada 60s | Cache compartido entre páginas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
