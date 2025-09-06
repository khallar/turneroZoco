"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  RotateCcw,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  RefreshCw,
  ArrowLeft,
  Activity,
  CheckCircle,
  Eye,
} from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

export default function PaginaAdmin() {
  const {
    estado,
    estadisticas,
    loading,
    error,
    cargarEstado,
    ultimaSincronizacion,
    obtenerBackups,
    obtenerBackup,
    isClient,
    cacheStats,
    invalidateCache,
  } = useSistemaEstado("admin")

  const [backups, setBackups] = useState<any[]>([])
  const [backupSeleccionado, setBackupSeleccionado] = useState<any>(null)
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [mostrarMetricasAvanzadas, setMostrarMetricasAvanzadas] = useState(false)
  const [descargandoTodos, setDescargandoTodos] = useState(false)

  useEffect(() => {
    if (isClient) {
      cargarDatosAdmin()
      cargarBackups()
    }
  }, [isClient])

  // Actualizar hora cada minuto
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      setHoraActual(new Date())
    }, 60000)

    setHoraActual(new Date())
    return () => clearInterval(interval)
  }, [isClient])

  const cargarDatosAdmin = async () => {
    try {
      await cargarEstado(true, true)
    } catch (error) {
      console.error("Error al cargar datos admin:", error)
    }
  }

  const cargarBackups = async () => {
    try {
      const backupsData = await obtenerBackups()
      setBackups(backupsData)
    } catch (error) {
      console.error("Error al cargar backups:", error)
    }
  }

  const verBackup = async (fecha: string) => {
    try {
      const backup = await obtenerBackup(fecha)
      setBackupSeleccionado(backup)
    } catch (error) {
      console.error("Error al obtener backup:", error)
    }
  }

  const eliminarTodosLosRegistros = async () => {
    setProcesandoAccion(true)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ELIMINAR_TODOS_REGISTROS",
        }),
      })

      if (response.ok) {
        invalidateCache()
        await cargarDatosAdmin()
        alert("Todos los registros han sido eliminados exitosamente")
      } else {
        throw new Error("Error al eliminar registros")
      }
    } catch (error) {
      console.error("Error al eliminar registros:", error)
      alert("Error al eliminar registros")
    } finally {
      setProcesandoAccion(false)
      setMostrarConfirmacionEliminar(false)
    }
  }

  const reiniciarContadorDiario = async () => {
    setProcesandoAccion(true)
    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "REINICIAR_CONTADOR_DIARIO",
        }),
      })

      if (response.ok) {
        invalidateCache()
        await cargarDatosAdmin()
        alert("Contador diario reiniciado exitosamente")
      } else {
        throw new Error("Error al reiniciar contador")
      }
    } catch (error) {
      console.error("Error al reiniciar contador:", error)
      alert("Error al reiniciar contador")
    } finally {
      setProcesandoAccion(false)
      setMostrarConfirmacionReinicio(false)
    }
  }

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-24 md:h-32 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 md:h-12 md:w-12 text-red-600" />
            Panel de Administración
          </h1>
          <p className="text-lg text-gray-600 mb-4">Control total del sistema de atención</p>

          {/* Información de estado */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{horaActual.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>
                Última sync:{" "}
                {ultimaSincronizacion
                  ? ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Nunca"}
              </span>
            </div>
            {cacheStats.totalEntries > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  📦 Cache: {cacheStats.totalEntries} entradas
                </span>
              </div>
            )}
          </div>

          {/* Botones de navegación */}
          <div className="flex justify-center gap-4">
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Tickets
            </a>
            <a
              href="/empleados"
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users className="mr-2 h-4 w-4" />
              Panel Empleados
            </a>
            <a
              href="/proximos"
              className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Próximos
            </a>
          </div>
        </div>

        {/* Estadísticas Principales del Día */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Hoy</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.totalAtendidos}</div>
              <p className="text-xs opacity-80">Emitidos en el día</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.numerosLlamados}</div>
              <p className="text-xs opacity-80">Tickets procesados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Espera</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.totalAtendidos - estado?.numerosLlamados}</div>
              <p className="text-xs opacity-80">Pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {estado?.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0}%
              </div>
              <p className="text-xs opacity-80">Tasa de atención</p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gestión de datos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestión de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setMostrarConfirmacionReinicio(true)}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar Contador Diario
              </Button>

              <Button onClick={cargarDatosAdmin} variant="outline" className="w-full bg-transparent" disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualizar Datos
              </Button>

              <Button onClick={() => setMostrarConfirmacionEliminar(true)} variant="destructive" className="w-full">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Eliminar Todos los Registros
              </Button>
            </CardContent>
          </Card>

          {/* Estado del sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-bold ${error ? "text-red-600" : "text-green-600"}`}>
                    {error ? "Con errores" : "Operativo"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha inicio:</span>
                  <span className="font-medium">{estado?.fechaInicio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Último reinicio:</span>
                  <span className="font-medium text-sm">
                    {estado?.ultimoReinicio ? new Date(estado.ultimoReinicio).toLocaleString("es-AR") : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cache activo:</span>
                  <span className="font-medium">{cacheStats.totalEntries} entradas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modales de confirmación */}
        {mostrarConfirmacionEliminar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Eliminación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  ¿Está seguro de que desea eliminar TODOS los registros del sistema? Esta acción es permanente y no se
                  puede deshacer.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setMostrarConfirmacionEliminar(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={procesandoAccion}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={eliminarTodosLosRegistros}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={procesandoAccion}
                  >
                    {procesandoAccion ? "Eliminando..." : "Eliminar Todo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {mostrarConfirmacionReinicio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white">
              <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Confirmar Reinicio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  ¿Está seguro de que desea reiniciar el contador diario? Los datos actuales se respaldarán
                  automáticamente.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setMostrarConfirmacionReinicio(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={procesandoAccion}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={reiniciarContadorDiario}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={procesandoAccion}
                  >
                    {procesandoAccion ? "Reiniciando..." : "Reiniciar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 5.3 | Sistema Simplificado</p>
            <p>Actualización inteligente cada 120s | Cache compartido entre páginas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
