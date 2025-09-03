"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  BarChart3,
  Users,
  Clock,
  Target,
  Award,
  Activity,
  PieChart,
  Download,
  RefreshCw,
  Eye,
  Star,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface ResumenData {
  resumenGeneral: any
  datosPorDia: any[]
  tendencias: any
  comparativas: any
  paginacion: {
    currentPage: number
    totalPages: number
    totalDias: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function PaginaResumen() {
  const [resumenData, setResumenData] = useState<ResumenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarDetalles, setMostrarDetalles] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const [limitePorPagina] = useState(15) // 15 días por página

  useEffect(() => {
    cargarResumen(paginaActual)
  }, [paginaActual])

  const cargarResumen = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/resumen-dias?page=${page}&limit=${limitePorPagina}`)
      if (!response.ok) {
        throw new Error("Error al cargar el resumen")
      }
      const data = await response.json()
      setResumenData(data)
    } catch (error) {
      console.error("Error al cargar resumen:", error)
      setError("Error al cargar los datos del resumen")
    } finally {
      setLoading(false)
    }
  }

  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && resumenData && nuevaPagina <= resumenData.paginacion.totalPages) {
      setPaginaActual(nuevaPagina)
    }
  }

  const exportarResumen = () => {
    if (!resumenData) return

    const datos = {
      fechaExportacion: new Date().toISOString(),
      paginaActual: paginaActual,
      resumenCompleto: resumenData,
      metadatos: {
        version: "6.1",
        sistema: "TURNOS_ZOCO",
        tipoExportacion: "Resumen Histórico Paginado",
      },
    }

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ZOCO-ResumenHistorico-Pagina${paginaActual}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const forzarBackup = async () => {
    try {
      const response = await fetch("/api/sistema?action=forzar_backup")
      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}`)
        // Recargar datos después de crear backup
        await cargarResumen(paginaActual)
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      console.error("Error al forzar backup:", error)
      alert("❌ Error al crear backup")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Generando resumen histórico...</p>
          <p className="text-sm text-gray-500 mt-2">Página {paginaActual}</p>
        </div>
      </div>
    )
  }

  if (error || !resumenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error al Cargar Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => cargarResumen(paginaActual)} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/admin")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { resumenGeneral, datosPorDia, tendencias, comparativas, paginacion } = resumenData

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-20 md:h-24 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-blue-600" />
            Resumen Histórico Completo
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Análisis detallado de {resumenGeneral.totalDias} días de operación
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Página {paginacion.currentPage} de {paginacion.totalPages} • Mostrando {datosPorDia.length} días
          </p>

          {/* Botones de navegación */}
          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Panel Admin
            </Button>
            <Button onClick={() => cargarResumen(paginaActual)} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={forzarBackup} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Calendar className="mr-2 h-4 w-4" />
              Crear Backup Hoy
            </Button>
            <Button onClick={exportarResumen} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="mr-2 h-4 w-4" />
              Exportar Página
            </Button>
          </div>
        </div>

        {/* Controles de Paginación Superior */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={!paginacion.hasPrevPage}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                <div className="flex items-center gap-2">
                  {/* Páginas cercanas */}
                  {Array.from({ length: Math.min(5, paginacion.totalPages) }, (_, i) => {
                    const startPage = Math.max(1, paginaActual - 2)
                    const pageNum = startPage + i
                    if (pageNum > paginacion.totalPages) return null

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => cambiarPagina(pageNum)}
                        variant={pageNum === paginaActual ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={!paginacion.hasNextPage}
                  variant="outline"
                  size="sm"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                Página {paginacion.currentPage} de {paginacion.totalPages} • {paginacion.totalDias} días totales
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen General */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
              <Award className="h-6 w-6" />📊 Resumen General Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{resumenGeneral.totalDias}</div>
                <p className="text-sm font-semibold text-blue-800">Días Operativos</p>
                <p className="text-xs text-blue-600">
                  {resumenGeneral.rangoFechas.desde} - {resumenGeneral.rangoFechas.hasta}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {resumenGeneral.totalTicketsHistoricos.toLocaleString()}
                </div>
                <p className="text-sm font-semibold text-green-800">Total Tickets Emitidos</p>
                <p className="text-xs text-green-600">En todo el período</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {resumenGeneral.totalTicketsAtendidos.toLocaleString()}
                </div>
                <p className="text-sm font-semibold text-orange-800">Total Tickets Atendidos</p>
                <p className="text-xs text-orange-600">Procesados históricamente</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {resumenGeneral.eficienciaPromedioGeneral}%
                </div>
                <p className="text-sm font-semibold text-purple-800">Eficiencia Promedio</p>
                <p className="text-xs text-purple-600">Histórica general</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Mejor Día Histórico
                </h4>
                {resumenGeneral.mejorDia ? (
                  <div>
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {resumenGeneral.mejorDia.ticketsEmitidos}
                    </div>
                    <p className="text-sm text-yellow-700">{resumenGeneral.mejorDia.fecha}</p>
                    <p className="text-xs text-yellow-600">{resumenGeneral.mejorDia.eficiencia}% eficiencia</p>
                  </div>
                ) : (
                  <p className="text-yellow-600">Sin datos</p>
                )}
              </div>

              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
                <h4 className="font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Promedios Diarios
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-cyan-700">Tickets emitidos:</span>
                    <span className="font-bold text-cyan-800">{resumenGeneral.promedioTicketsPorDia}/día</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-cyan-700">Tickets atendidos:</span>
                    <span className="font-bold text-cyan-800">{resumenGeneral.promedioAtendidosPorDia}/día</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendencia General
                </h4>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">
                    {tendencias.tendenciaGeneral === "creciente" && "📈 Creciente"}
                    {tendencias.tendenciaGeneral === "decreciente" && "📉 Decreciente"}
                    {tendencias.tendenciaGeneral === "estable" && "📊 Estable"}
                  </div>
                  {tendencias.crecimientoSemanal !== 0 && (
                    <p className="text-sm text-indigo-700">
                      {tendencias.crecimientoSemanal > 0 ? "+" : ""}
                      {tendencias.crecimientoSemanal}% vs período anterior
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análisis por Día de la Semana */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />📅 Análisis por Día de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(tendencias.datosPorDiaSemana || {}).map(([dia, datos]: [string, any]) => (
                <div key={dia} className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-2 capitalize">{dia}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio:</span>
                      <span className="font-bold text-blue-600">{datos.promedio} tickets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Eficiencia:</span>
                      <span className="font-bold text-green-600">{datos.eficienciaPromedio}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Días registrados:</span>
                      <span className="font-bold text-gray-700">{datos.totalDias}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Días Más Activos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />🏆 Top 10 Días Más Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {comparativas.diasMasActivos.slice(0, 10).map((dia, index) => (
                <div
                  key={dia.fecha}
                  className={`p-4 rounded-lg border-2 text-center ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300"
                      : index === 1
                        ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300"
                        : index === 2
                          ? "bg-gradient-to-r from-orange-50 to-red-50 border-orange-300"
                          : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="text-lg font-bold mb-1">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">{dia.fecha}</div>
                  <div className="text-xs text-gray-600 mb-2">{dia.diaSemana}</div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{dia.ticketsEmitidos}</div>
                  <div className="text-xs text-gray-600">tickets</div>
                  <div className="text-xs text-green-600 mt-1">{dia.eficiencia}% eficiencia</div>
                  <div className="text-xs text-purple-600">
                    Pico: {dia.horaPico.hora}:00 ({dia.horaPico.cantidad})
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Horas Pico Globales */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />🔥 Horas Pico Globales (Histórico)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {comparativas.horasPicoGlobales.map((hora, index) => (
                <div
                  key={hora.hora}
                  className={`p-3 rounded-lg text-center border-2 ${
                    index === 0
                      ? "bg-red-50 border-red-300"
                      : index === 1
                        ? "bg-orange-50 border-orange-300"
                        : index === 2
                          ? "bg-yellow-50 border-yellow-300"
                          : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="text-lg font-bold mb-1">
                    {index === 0 && "🔥"}
                    {index === 1 && "⚡"}
                    {index === 2 && "💫"}
                    {index > 2 && "📊"}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{hora.hora}</div>
                  <div className="text-xl font-bold text-blue-600 my-1">{hora.cantidad}</div>
                  <div className="text-xs text-gray-600">tickets</div>
                  <div className="text-xs text-green-600">{hora.porcentaje}% del total</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clientes Más Frecuentes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />👥 Top 15 Clientes Más Frecuentes (Histórico)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparativas.clientesMasFrecuentes.slice(0, 15).map((cliente, index) => (
                <div
                  key={cliente.nombre}
                  className={`p-3 rounded-lg border-l-4 ${
                    index < 3 ? "bg-yellow-50 border-yellow-400" : "bg-gray-50 border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          index === 0
                            ? "text-yellow-600"
                            : index === 1
                              ? "text-gray-500"
                              : index === 2
                                ? "text-orange-600"
                                : "text-gray-700"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-800 capitalize" title={cliente.nombre}>
                          {cliente.nombre.length > 20 ? cliente.nombre.substring(0, 20) + "..." : cliente.nombre}
                        </div>
                        <div className="text-sm text-gray-500">{cliente.porcentaje}% del total histórico</div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${index < 3 ? "text-blue-600" : "text-gray-600"}`}>
                      {cliente.cantidad}
                    </div>
                  </div>
                  {index < 3 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            cliente.porcentaje >= 5
                              ? "bg-green-500"
                              : cliente.porcentaje >= 2
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(cliente.porcentaje * 4, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botón para mostrar datos detallados por día */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />📋 Datos Detallados por Día (Página {paginaActual})
              </div>
              <Button onClick={() => setMostrarDetalles(!mostrarDetalles)} variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                {mostrarDetalles ? "Ocultar" : "Mostrar"} Detalles
              </Button>
            </CardTitle>
          </CardHeader>
          {mostrarDetalles && (
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {datosPorDia.map((dia, index) => (
                  <div key={dia.fecha} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">{dia.fecha}</h4>
                        <p className="text-sm text-gray-600">
                          {dia.diaSemana} - {dia.mes}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{dia.ticketsEmitidos}</div>
                        <div className="text-xs text-gray-500">tickets emitidos</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Atendidos:</span>
                        <p className="font-bold text-green-600">{dia.ticketsAtendidos}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Pendientes:</span>
                        <p className="font-bold text-orange-600">{dia.ticketsPendientes}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Eficiencia:</span>
                        <p className="font-bold text-purple-600">{dia.eficiencia}%</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Hora Pico:</span>
                        <p className="font-bold text-red-600">
                          {dia.horaPico.hora}:00 ({dia.horaPico.cantidad})
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Espera Real:</span>
                        <p className="font-semibold text-blue-700">{dia.tiempoEsperaReal} min</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Velocidad:</span>
                        <p className="font-semibold text-green-700">{dia.velocidadAtencion} t/min</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Clientes únicos:</span>
                        <p className="font-semibold text-purple-700">{dia.clientesUnicos}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duración:</span>
                        <p className="font-semibold text-orange-700">{dia.duracionOperaciones}h</p>
                      </div>
                    </div>

                    {/* Comparativa con promedio */}
                    <div className="mt-3 flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">vs Promedio tickets:</span>
                        <span className={`font-bold ${dia.vsPromedio.tickets > 0 ? "text-green-600" : "text-red-600"}`}>
                          {dia.vsPromedio.tickets > 0 ? "+" : ""}
                          {dia.vsPromedio.tickets}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">vs Promedio eficiencia:</span>
                        <span
                          className={`font-bold ${dia.vsPromedio.eficiencia > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {dia.vsPromedio.eficiencia > 0 ? "+" : ""}
                          {dia.vsPromedio.eficiencia}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Controles de Paginación Inferior */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={() => cambiarPagina(1)} disabled={paginaActual === 1} variant="outline" size="sm">
                  Primera
                </Button>

                <Button
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={!paginacion.hasPrevPage}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                <div className="flex items-center gap-2">
                  {/* Páginas cercanas */}
                  {Array.from({ length: Math.min(5, paginacion.totalPages) }, (_, i) => {
                    const startPage = Math.max(1, paginaActual - 2)
                    const pageNum = startPage + i
                    if (pageNum > paginacion.totalPages) return null

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => cambiarPagina(pageNum)}
                        variant={pageNum === paginaActual ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={!paginacion.hasNextPage}
                  variant="outline"
                  size="sm"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>

                <Button
                  onClick={() => cambiarPagina(paginacion.totalPages)}
                  disabled={paginaActual === paginacion.totalPages}
                  variant="outline"
                  size="sm"
                >
                  Última
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                Mostrando {datosPorDia.length} de {paginacion.totalDias} días totales
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Sistema de Turnos ZOCO | Resumen Histórico v6.1 con Paginación</p>
            <p>Generado el {new Date().toLocaleString("es-AR")}</p>
            <p>
              Página {paginaActual} de {paginacion.totalPages} • {paginacion.totalDias} días registrados
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
