"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import { Users, UserCheck, Clock, RotateCcw, Home, Wifi, WifiOff, Volume2, VolumeX, Search, Phone } from "lucide-react"

export default function EmpleadosPage() {
  const [numeroActual, setNumeroActual] = useState(1)
  const [nombreActual, setNombreActual] = useState("")
  const [busquedaNombre, setBusquedaNombre] = useState("")
  const [mounted, setMounted] = useState(false)
  const [conectado, setConectado] = useState(true)
  const [sonidoActivado, setSonidoActivado] = useState(true)
  const [ultimaLlamada, setUltimaLlamada] = useState<string>("")

  const { estado, actualizarEstado } = useSistemaEstado()

  useEffect(() => {
    setMounted(true)

    // Verificar conectividad
    const checkConnection = () => {
      setConectado(navigator.onLine)
    }

    checkConnection()
    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    // Cargar configuración de sonido
    const sonidoGuardado = localStorage.getItem("sonidoActivado")
    if (sonidoGuardado !== null) {
      setSonidoActivado(JSON.parse(sonidoGuardado))
    }

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sonidoActivado", JSON.stringify(sonidoActivado))
    }
  }, [sonidoActivado, mounted])

  const reproducirSonido = () => {
    if (!sonidoActivado || typeof window === "undefined") return

    try {
      // Crear un sonido simple usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log("Error al reproducir sonido:", error)
    }
  }

  const llamarNumero = async (numero: number, nombre?: string) => {
    if (!mounted) return

    try {
      setNumeroActual(numero)
      setNombreActual(nombre || `Cliente ${numero.toString().padStart(3, "0")}`)

      // Reproducir sonido de notificación
      reproducirSonido()

      // Registrar la llamada
      const ahora = new Date().toLocaleString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      setUltimaLlamada(`${numero.toString().padStart(3, "0")} - ${ahora}`)

      // Actualizar estado del sistema
      await actualizarEstado({
        numeroActual: numero,
        nombreActual: nombre || `Cliente ${numero.toString().padStart(3, "0")}`,
      })
    } catch (error) {
      console.error("Error al llamar número:", error)
    }
  }

  const llamarSiguiente = () => {
    const siguiente = numeroActual + 1
    llamarNumero(siguiente)
  }

  const llamarAnterior = () => {
    if (numeroActual > 1) {
      const anterior = numeroActual - 1
      llamarNumero(anterior)
    }
  }

  const llamarPorNombre = () => {
    if (busquedaNombre.trim()) {
      llamarNumero(numeroActual, busquedaNombre.trim())
      setBusquedaNombre("")
    }
  }

  const reiniciarSistema = async () => {
    if (confirm("¿Está seguro de que desea reiniciar el sistema? Esto restablecerá todos los números.")) {
      try {
        await actualizarEstado({
          ultimoNumero: 0,
          numeroActual: 1,
          nombreActual: "",
          totalTickets: 0,
        })
        setNumeroActual(1)
        setNombreActual("")
        setUltimaLlamada("")
      } catch (error) {
        console.error("Error al reiniciar sistema:", error)
      }
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-green-600 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Panel de Empleados ZOCO</h1>
              <p className="text-sm text-gray-600">Gestión de turnos y atención al cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {conectado ? (
              <div className="flex items-center gap-2 text-green-600">
                <Wifi className="h-5 w-5" />
                <span className="text-sm font-medium">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <WifiOff className="h-5 w-5" />
                <span className="text-sm font-medium">Sin conexión</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Inicio
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de número actual */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-2xl border-4 border-green-500 h-full">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-8">
                <CardTitle className="text-3xl font-black flex items-center justify-center gap-3">
                  <UserCheck className="h-10 w-10" />
                  NÚMERO ACTUAL
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <div className="space-y-8">
                  {/* Número grande */}
                  <div className="bg-gradient-to-r from-blue-100 to-green-100 border-4 border-blue-400 rounded-2xl p-8">
                    <div className="text-8xl font-black text-blue-600 mb-4">
                      {numeroActual.toString().padStart(3, "0")}
                    </div>
                    <div className="text-2xl font-bold text-green-700 bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      {nombreActual || `Cliente ${numeroActual.toString().padStart(3, "0")}`}
                    </div>
                  </div>

                  {/* Controles principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={llamarAnterior}
                      disabled={numeroActual <= 1 || !conectado}
                      className="text-xl py-6 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                    >
                      ← ANTERIOR ({(numeroActual - 1).toString().padStart(3, "0")})
                    </Button>
                    <Button
                      onClick={llamarSiguiente}
                      disabled={!conectado}
                      className="text-xl py-6 bg-blue-500 hover:bg-blue-600 text-white font-bold"
                    >
                      SIGUIENTE ({(numeroActual + 1).toString().padStart(3, "0")}) →
                    </Button>
                  </div>

                  {/* Búsqueda por nombre */}
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-yellow-800 mb-3">Llamar por Nombre</h3>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Escriba el nombre del cliente..."
                        value={busquedaNombre}
                        onChange={(e) => setBusquedaNombre(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && llamarPorNombre()}
                        className="flex-1"
                        disabled={!conectado}
                      />
                      <Button
                        onClick={llamarPorNombre}
                        disabled={!busquedaNombre.trim() || !conectado}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Llamar
                      </Button>
                    </div>
                  </div>

                  {ultimaLlamada && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <Phone className="h-4 w-4" />
                        <span className="font-bold text-sm">Última llamada: {ultimaLlamada}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de controles y estadísticas */}
          <div className="space-y-6">
            {/* Estadísticas */}
            <Card className="bg-white shadow-xl border-2 border-blue-300">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Último Ticket:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {estado.ultimoNumero.toString().padStart(3, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Generados:</span>
                    <span className="text-xl font-bold text-green-600">{estado.totalTickets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">En Espera:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {Math.max(0, estado.ultimoNumero - numeroActual)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuración */}
            <Card className="bg-white shadow-xl border-2 border-purple-300">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sonido de notificación:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSonidoActivado(!sonidoActivado)}
                    className={sonidoActivado ? "text-green-600" : "text-red-600"}
                  >
                    {sonidoActivado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>

                <Button onClick={reiniciarSistema} variant="destructive" className="w-full" disabled={!conectado}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Sistema
                </Button>
              </CardContent>
            </Card>

            {/* Enlaces rápidos */}
            <Card className="bg-white shadow-xl border-2 border-gray-300">
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="text-lg">Enlaces Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open("/proximos", "_blank")}
                >
                  📺 Ver Próximos Turnos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open("/admin", "_blank")}
                >
                  ⚙️ Panel de Administración
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p className="text-sm">© 2024 Panel de Empleados ZOCO - Versión 5.3 | Sistema de gestión de turnos</p>
      </footer>
    </div>
  )
}
