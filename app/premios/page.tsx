"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Gift, Save, TrendingUp } from "lucide-react"
import type { ConfiguracionPremios, Premio } from "@/lib/premios"

export default function PremiosPage() {
  const [config, setConfig] = useState<ConfiguracionPremios | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null)
  const [estadisticas, setEstadisticas] = useState<any>(null)

  useEffect(() => {
    cargarPremios()
    cargarEstadisticas()
  }, [])

  const cargarPremios = async () => {
    try {
      const response = await fetch("/api/premios")
      const data = await response.json()

      if (data.success) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error("Error al cargar premios:", error)
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch("/api/premios?action=estadisticas")
      const data = await response.json()

      if (data.success) {
        setEstadisticas(data.estadisticas)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    }
  }

  const guardarPremios = async () => {
    if (!config) return

    setGuardando(true)
    setMensaje(null)

    try {
      const response = await fetch("/api/premios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })

      const data = await response.json()

      if (data.success) {
        setMensaje({ tipo: "success", texto: "Premios guardados exitosamente" })
        await cargarEstadisticas()
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al guardar" })
      }
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error de conexión" })
    } finally {
      setGuardando(false)
    }
  }

  const actualizarPremio = (index: number, campo: keyof Premio, valor: any) => {
    if (!config) return

    const nuevosPremios = [...config.premios]
    nuevosPremios[index] = { ...nuevosPremios[index], [campo]: valor }

    setConfig({ ...config, premios: nuevosPremios })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
          <p className="text-2xl text-gray-700 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo-rojo.png" alt="ZOCO" className="h-24 md:h-32 mx-auto drop-shadow-lg mb-6" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Configuración de Premios</h1>
          <p className="text-gray-600">Configura los premios diarios para tus clientes</p>
        </div>

        {/* Mensaje de feedback */}
        {mensaje && (
          <div
            className={`max-w-4xl mx-auto mb-6 p-4 rounded-xl ${
              mensaje.tipo === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Estadísticas */}
        {estadisticas && (
          <div className="max-w-4xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Gift className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-800">{estadisticas.totalPremiosConfigurados}</div>
                <p className="text-sm text-gray-600">Premios Activos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-800">{estadisticas.totalGanadores}</div>
                <p className="text-sm text-gray-600">Ganadores Hoy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {estadisticas.numerosGanadores.length > 0
                    ? estadisticas.numerosGanadores[estadisticas.numerosGanadores.length - 1]
                    : "-"}
                </div>
                <p className="text-sm text-gray-600">Último Ganador</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración de Premios */}
        <div className="max-w-4xl mx-auto space-y-6">
          {config?.premios.map((premio, index) => (
            <Card key={premio.id} className="border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Gift className="h-6 w-6" />
                    Premio {index + 1}
                  </span>
                  <Switch
                    checked={premio.activo}
                    onCheckedChange={(checked) => actualizarPremio(index, "activo", checked)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Mensaje del Premio */}
                <div>
                  <Label htmlFor={`mensaje-${index}`}>Mensaje del Premio</Label>
                  <Textarea
                    id={`mensaje-${index}`}
                    value={premio.mensaje}
                    onChange={(e) => actualizarPremio(index, "mensaje", e.target.value)}
                    placeholder="Ej: ¡Felicitaciones! Ganaste un 10% de descuento"
                    className="mt-2"
                    rows={3}
                  />
                </div>

                {/* Tipo de Premio */}
                <div>
                  <Label>Tipo de Premio</Label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <button
                      onClick={() => actualizarPremio(index, "tipo", "aleatorio")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        premio.tipo === "aleatorio"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="text-2xl mb-2">🎲</div>
                      <div className="font-semibold">Aleatorio</div>
                      <div className="text-xs text-gray-600">5% de probabilidad</div>
                    </button>
                    <button
                      onClick={() => actualizarPremio(index, "tipo", "numero_especifico")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        premio.tipo === "numero_especifico"
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="font-semibold">Número Específico</div>
                      <div className="text-xs text-gray-600">Ticket exacto</div>
                    </button>
                  </div>
                </div>

                {/* Número Específico */}
                {premio.tipo === "numero_especifico" && (
                  <div>
                    <Label htmlFor={`numero-${index}`}>Número de Ticket Ganador</Label>
                    <Input
                      id={`numero-${index}`}
                      type="number"
                      min="1"
                      value={premio.numeroEspecifico || ""}
                      onChange={(e) => actualizarPremio(index, "numeroEspecifico", Number.parseInt(e.target.value))}
                      placeholder="Ej: 50"
                      className="mt-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Botones de Acción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={guardarPremios}
              disabled={guardando}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
            >
              {guardando ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Guardar Configuración
                </div>
              )}
            </Button>

            <a
              href="/admin"
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-6 text-lg rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver al Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
