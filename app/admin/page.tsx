"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  RotateCcw,
  BarChart3,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  Eye,
  Target,
  Zap,
  LineChart,
  Activity,
  Award,
} from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts"

export const dynamic = "force-dynamic"

export default function PaginaAdmin() {
  const { estado, loading, error, reiniciarContador, recargar } = useSistemaEstado()
  const [isClient, setIsClient] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [vistaActual, setVistaActual] = useState<"resumen" | "historial" | "metricas">("resumen")

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      cargarBackups()
      recargar(true, true)
    }
  }, [isClient])

  const cargarBackups = async () => {
    setLoadingBackups(true)
    try {
      const response = await fetch("/api/backup")
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.backups)) {
          setBackups(data.backups)
        }
      }
    } catch (error) {
      console.error("Error al cargar backups:", error)
    } finally {
      setLoadingBackups(false)
    }
  }

  const reiniciarContadorDiario = async () => {
    setProcesandoAccion(true)
    try {
      const success = await reiniciarContador()
      if (success) {
        await cargarBackups()
        alert("Contador reiniciado exitosamente")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error al reiniciar contador")
    } finally {
      setProcesandoAccion(false)
      setMostrarConfirmacionReinicio(false)
    }
  }

  const calcularMetricas = () => {
    const eficiencia =
      estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0
    const pendientes = estado.totalAtendidos - estado.numerosLlamados
    const promedioHistorico =
      backups.length > 0
        ? Math.round(backups.reduce((sum, b) => sum + (b.resumen?.totalTicketsEmitidos || 0), 0) / backups.length)
        : 0

    return { eficiencia, pendientes, promedioHistorico }
  }

  const prepararDatosGrafico = () => {
    return backups
      .slice(-7)
      .reverse()
      .map((backup) => ({
        fecha: new Date(backup.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        emitidos: backup.resumen?.totalTicketsEmitidos || 0,
        atendidos: backup.resumen?.totalTicketsAtendidos || 0,
      }))
  }

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando panel...</p>
        </div>
      </div>
    )
  }

  const metricas = calcularMetricas()
  const datosGrafico = prepararDatosGrafico()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Moderno */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo-rojo.png" alt="Logo" className="h-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-red-600" />
                  Panel de Administración
                </h1>
                <p className="text-sm text-gray-500">Control y análisis del sistema</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a href="/" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Tickets
              </a>
              <a href="/empleados" className="text-sm text-gray-600 hover:text-green-600 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Empleados
              </a>
              <a href="/proximos" className="text-sm text-gray-600 hover:text-purple-600 flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Próximos
              </a>
            </div>
          </div>

          {/* Navegación de vistas */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setVistaActual("resumen")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaActual === "resumen" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Activity className="inline h-4 w-4 mr-1" />
              Resumen
            </button>
            <button
              onClick={() => setVistaActual("historial")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaActual === "historial" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Calendar className="inline h-4 w-4 mr-1" />
              Historial
            </button>
            <button
              onClick={() => setVistaActual("metricas")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaActual === "metricas" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <BarChart3 className="inline h-4 w-4 mr-1" />
              Métricas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Vista: Resumen */}
        {vistaActual === "resumen" && (
          <div className="space-y-6">
            {/* KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-8 w-8 text-blue-500" />
                    <span className="text-3xl font-bold text-blue-600">{estado.totalAtendidos}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600">Tickets Emitidos Hoy</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {estado.totalAtendidos > metricas.promedioHistorico ? "↗" : "↘"} vs promedio (
                    {metricas.promedioHistorico})
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <span className="text-3xl font-bold text-green-600">{estado.numerosLlamados}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600">Tickets Atendidos</p>
                  <p className="text-xs text-gray-400 mt-1">Procesados exitosamente</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <span className="text-3xl font-bold text-orange-600">{metricas.pendientes}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600">En Espera</p>
                  <p className="text-xs text-gray-400 mt-1">Tickets pendientes</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-8 w-8 text-purple-500" />
                    <span className="text-3xl font-bold text-purple-600">{metricas.eficiencia}%</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600">Eficiencia</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${metricas.eficiencia}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Tendencia Semanal */}
            {datosGrafico.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Tendencia Últimos 7 Días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={datosGrafico}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="emitidos" stroke="#3b82f6" strokeWidth={2} name="Emitidos" />
                      <Line type="monotone" dataKey="atendidos" stroke="#10b981" strokeWidth={2} name="Atendidos" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Acción Rápida: Reiniciar Contador */}
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Reiniciar Contador Diario
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      Crea un backup automático y reinicia el contador para un nuevo día
                    </p>
                  </div>
                  <Button
                    onClick={() => setMostrarConfirmacionReinicio(true)}
                    disabled={procesandoAccion}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reiniciar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vista: Historial */}
        {vistaActual === "historial" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Historial de Días</h2>
              <Button onClick={cargarBackups} variant="outline" disabled={loadingBackups}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingBackups ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>

            {loadingBackups ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando historial...</p>
              </div>
            ) : backups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {backups
                  .slice(-30)
                  .reverse()
                  .map((backup, index) => {
                    const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                    const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                    const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0

                    return (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-gray-900">{backup.fecha}</h4>
                              <p className="text-xs text-gray-500">
                                {new Date(backup.fecha).toLocaleDateString("es-AR", { weekday: "long" })}
                              </p>
                            </div>
                            {index < 3 && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                Reciente
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Emitidos:</span>
                              <span className="font-bold text-blue-600">{emitidos}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Atendidos:</span>
                              <span className="font-bold text-green-600">{atendidos}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Eficiencia:</span>
                              <span className={`font-bold ${eficiencia >= 80 ? "text-green-600" : "text-orange-600"}`}>
                                {eficiencia}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                            <div
                              className={`h-2 rounded-full ${eficiencia >= 80 ? "bg-green-500" : "bg-orange-500"}`}
                              style={{ width: `${eficiencia}%` }}
                            ></div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No hay historial disponible</p>
                  <p className="text-gray-400 text-sm mt-2">Los datos aparecerán después del primer día de operación</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Vista: Métricas */}
        {vistaActual === "metricas" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Métricas Avanzadas</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{backups.length}</div>
                  <p className="text-sm text-gray-600 mt-1">Días Operativos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900">
                    {backups.reduce((sum, b) => sum + (b.resumen?.totalTicketsEmitidos || 0), 0)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Total Histórico</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Zap className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{metricas.promedioHistorico}</div>
                  <p className="text-sm text-gray-600 mt-1">Promedio Diario</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de barras comparativo */}
            {datosGrafico.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparativa Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={datosGrafico}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="emitidos" fill="#3b82f6" name="Emitidos" />
                      <Bar dataKey="atendidos" fill="#10b981" name="Atendidos" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmación */}
      {mostrarConfirmacionReinicio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Confirmar Reinicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                ¿Está seguro de que desea reiniciar el contador diario? Se creará un backup automático de los datos
                actuales.
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
                  {procesandoAccion ? "Reiniciando..." : "Confirmar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
