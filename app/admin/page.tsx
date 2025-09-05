"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import {
  Settings,
  Database,
  Download,
  Upload,
  RotateCcw,
  Home,
  Wifi,
  WifiOff,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Activity,
} from "lucide-react"

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [conectado, setConectado] = useState(true)
  const [configuracion, setConfiguracion] = useState({
    ultimoNumero: 0,
    numeroActual: 1,
    nombreActual: "",
    totalTickets: 0,
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("")

  const { estado, actualizarEstado, cargarEstado } = useSistemaEstado()

  useEffect(() => {
    setMounted(true)

    // Verificar conectividad
    const checkConnection = () => {
      setConectado(navigator.onLine)
    }

    checkConnection()
    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
    }
  }, [])

  useEffect(() => {
    if (mounted && estado) {
      setConfiguracion({
        ultimoNumero: estado.ultimoNumero || 0,
        numeroActual: estado.numeroActual || 1,
        nombreActual: estado.nombreActual || "",
        totalTickets: estado.totalTickets || 0,
      })
    }
  }, [estado, mounted])

  const mostrarMensaje = (texto: string, tipo: "success" | "error") => {
    setMensaje(texto)
    setTipoMensaje(tipo)
    setTimeout(() => {
      setMensaje("")
      setTipoMensaje("")
    }, 5000)
  }

  const guardarConfiguracion = async () => {
    if (!conectado) {
      mostrarMensaje("Sin conexión a internet", "error")
      return
    }

    setGuardando(true)
    try {
      await actualizarEstado(configuracion)
      mostrarMensaje("Configuración guardada exitosamente", "success")
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      mostrarMensaje("Error al guardar la configuración", "error")
    } finally {
      setGuardando(false)
    }
  }

  const reiniciarSistema = async () => {
    if (!confirm("¿Está seguro de que desea reiniciar completamente el sistema? Esta acción no se puede deshacer.")) {
      return
    }

    if (!conectado) {
      mostrarMensaje("Sin conexión a internet", "error")
      return
    }

    setGuardando(true)
    try {
      const configInicial = {
        ultimoNumero: 0,
        numeroActual: 1,
        nombreActual: "",
        totalTickets: 0,
      }

      await actualizarEstado(configInicial)
      setConfiguracion(configInicial)
      mostrarMensaje("Sistema reiniciado exitosamente", "success")
    } catch (error) {
      console.error("Error al reiniciar sistema:", error)
      mostrarMensaje("Error al reiniciar el sistema", "error")
    } finally {
      setGuardando(false)
    }
  }

  const exportarDatos = () => {
    try {
      const datos = {
        ...estado,
        fechaExportacion: new Date().toISOString(),
        version: "5.3",
      }

      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `zoco-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      mostrarMensaje("Datos exportados exitosamente", "success")
    } catch (error) {
      console.error("Error al exportar datos:", error)
      mostrarMensaje("Error al exportar los datos", "error")
    }
  }

  const importarDatos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const datos = JSON.parse(e.target?.result as string)

        // Validar estructura de datos
        if (typeof datos.ultimoNumero !== "number" || typeof datos.totalTickets !== "number") {
          throw new Error("Formato de archivo inválido")
        }

        setConfiguracion({
          ultimoNumero: datos.ultimoNumero || 0,
          numeroActual: datos.numeroActual || 1,
          nombreActual: datos.nombreActual || "",
          totalTickets: datos.totalTickets || 0,
        })

        mostrarMensaje("Datos importados exitosamente. Recuerde guardar los cambios.", "success")
      } catch (error) {
        console.error("Error al importar datos:", error)
        mostrarMensaje("Error al importar los datos. Verifique el formato del archivo.", "error")
      }
    }
    reader.readAsText(file)

    // Limpiar el input
    event.target.value = ""
  }

  const actualizarCampo = (campo: keyof typeof configuracion, valor: string | number) => {
    setConfiguracion((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-gray-600 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-rojo.png" alt="ZOCO Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Panel de Administración ZOCO</h1>
              <p className="text-sm text-gray-600">Configuración y gestión del sistema</p>
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

      {/* Mensaje de estado */}
      {mensaje && (
        <div
          className={`p-4 ${tipoMensaje === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border-b-2`}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            {tipoMensaje === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${tipoMensaje === "success" ? "text-green-800" : "text-red-800"}`}>
              {mensaje}
            </span>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de configuración */}
          <div className="space-y-6">
            <Card className="bg-white shadow-xl border-2 border-blue-300">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  Configuración del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ultimoNumero">Último Número Generado</Label>
                    <Input
                      id="ultimoNumero"
                      type="number"
                      min="0"
                      value={configuracion.ultimoNumero}
                      onChange={(e) => actualizarCampo("ultimoNumero", Number.parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numeroActual">Número Actual en Atención</Label>
                    <Input
                      id="numeroActual"
                      type="number"
                      min="1"
                      value={configuracion.numeroActual}
                      onChange={(e) => actualizarCampo("numeroActual", Number.parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nombreActual">Nombre del Cliente Actual</Label>
                  <Input
                    id="nombreActual"
                    type="text"
                    value={configuracion.nombreActual}
                    onChange={(e) => actualizarCampo("nombreActual", e.target.value)}
                    placeholder="Nombre del cliente siendo atendido"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="totalTickets">Total de Tickets Generados</Label>
                  <Input
                    id="totalTickets"
                    type="number"
                    min="0"
                    value={configuracion.totalTickets}
                    onChange={(e) => actualizarCampo("totalTickets", Number.parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={guardarConfiguracion}
                    disabled={guardando || !conectado}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {guardando ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Panel de backup y restauración */}
            <Card className="bg-white shadow-xl border-2 border-purple-300">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-6 w-6" />
                  Backup y Restauración
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={exportarDatos} variant="outline" className="w-full bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Datos
                  </Button>

                  <div>
                    <input type="file" accept=".json" onChange={importarDatos} className="hidden" id="importFile" />
                    <Button
                      onClick={() => document.getElementById("importFile")?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Importar Datos
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={reiniciarSistema}
                  variant="destructive"
                  className="w-full"
                  disabled={guardando || !conectado}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Sistema Completo
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Panel de estadísticas y monitoreo */}
          <div className="space-y-6">
            <Card className="bg-white shadow-xl border-2 border-green-300">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Estado Actual del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">{estado.ultimoNumero || 0}</div>
                    <div className="text-sm text-gray-600">Último Ticket</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-3xl font-bold text-green-600">{estado.numeroActual || 1}</div>
                    <div className="text-sm text-gray-600">Atendiendo</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">{estado.totalTickets || 0}</div>
                    <div className="text-sm text-gray-600">Total Generados</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="text-3xl font-bold text-orange-600">
                      {Math.max(0, (estado.ultimoNumero || 0) - (estado.numeroActual || 1))}
                    </div>
                    <div className="text-sm text-gray-600">En Espera</div>
                  </div>
                </div>

                {estado.nombreActual && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-800">Cliente Actual:</div>
                      <div className="text-xl text-yellow-900">{estado.nombreActual}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panel de enlaces rápidos */}
            <Card className="bg-white shadow-xl border-2 border-gray-300">
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Enlaces Rápidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open("/empleados", "_blank")}
                >
                  👥 Panel de Empleados
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open("/proximos", "_blank")}
                >
                  📺 Pantalla de Próximos Turnos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => cargarEstado()}
                  disabled={!conectado}
                >
                  🔄 Actualizar Estado
                </Button>
              </CardContent>
            </Card>

            {/* Información del sistema */}
            <Card className="bg-white shadow-xl border-2 border-indigo-300">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Información del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Versión:</span>
                    <span className="font-bold">5.3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`font-bold ${conectado ? "text-green-600" : "text-red-600"}`}>
                      {conectado ? "Operativo" : "Sin conexión"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Última actualización:</span>
                    <span className="font-bold">{new Date().toLocaleTimeString("es-ES")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p className="text-sm">
          © 2024 Panel de Administración ZOCO - Versión 5.3 | Configuración y gestión del sistema
        </p>
      </footer>
    </div>
  )
}
