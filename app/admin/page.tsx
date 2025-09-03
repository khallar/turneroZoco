"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Download,
  RefreshCw,
  Database,
  Activity,
  Calendar,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  History,
  Archive,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface EstadoSistema {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string
  ultimoReinicio: string
  tickets?: any[]
}

interface BackupData {
  fecha: string
  fechaCreacion: string
  version: string
  resumen: {
    totalTicketsEmitidos: number
    totalTicketsAtendidos: number
    ticketsPendientes: number
    eficienciaDiaria: number
    primerTicket: number
    ultimoTicket: number
    tiempoPromedioEsperaReal: number
    horaPico: { hora: number; cantidad: number; porcentaje: number }
    velocidadAtencion: number
    clientesUnicos: number
    duracionOperaciones: number
  }
  createdAt: string
}

interface CacheStats {
  entries: Array<{
    key: string
    size: number
    lastAccess: string
    hitCount: number
  }>
  totalSize: number
  hitRate: number
  totalRequests: number
}

interface ConexionDB {
  connected: boolean
  details: {
    responseTime?: string
    config?: string
    endpoint?: string
    region?: string
    testResult?: string
    error?: string
    timestamp: string
  }
}

export default function PaginaAdmin() {
  const [estado, setEstado] = useState<EstadoSistema | null>(null)
  const [backups, setBackups] = useState<BackupData[]>([])
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [conexionDB, setConexionDB] = useState<ConexionDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoNumeroLlamados, setNuevoNumeroLlamados] = useState("")
  const [mostrarDetallesBackups, setMostrarDetallesBackups] = useState(false)
  const [mostrarTotalesHistoricos, setMostrarTotalesHistoricos] = useState(false)
  const [totalesHistoricos, setTotalesHistoricos] = useState<any>(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar estado actual
      const estadoResponse = await fetch("/api/sistema")
      if (!estadoResponse.ok) throw new Error("Error al cargar estado")
      const estadoData = await estadoResponse.json()
      setEstado(estadoData)

      // Cargar backups
      await cargarBackups()

      // Cargar estadísticas de caché
      await cargarCacheStats()

      // Verificar conexión DB
      await verificarConexionDB()

      // Cargar totales históricos
      await cargarTotalesHistoricos()
    } catch (error) {
      console.error("Error al cargar datos:", error)
      setError("Error al cargar los datos del panel")
    } finally {
      setLoading(false)
    }
  }

  const cargarBackups = async () => {
    try {
      const backupsResponse = await fetch("/api/backup")
      if (backupsResponse.ok) {
        const backupsData = await backupsResponse.json()
        setBackups(backupsData.backups || [])
      }
    } catch (error) {
      console.error("Error al cargar backups:", error)
      setBackups([])
    }
  }

  const cargarCacheStats = async () => {
    try {
      const cacheResponse = await fetch("/api/debug")
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        setCacheStats(cacheData.cache || null)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas de caché:", error)
      setCacheStats(null)
    }
  }

  const verificarConexionDB = async () => {
    try {
      const dbResponse = await fetch("/api/health")
      if (dbResponse.ok) {
        const dbData = await dbResponse.json()
        setConexionDB(dbData)
      }
    } catch (error) {
      console.error("Error al verificar conexión DB:", error)
      setConexionDB({ connected: false, details: { error: "Error de conexión", timestamp: new Date().toISOString() } })
    }
  }

  const cargarTotalesHistoricos = async () => {
    try {
      const response = await fetch("/api/resumen-dias?page=1&limit=1000")
      if (response.ok) {
        const data = await response.json()
        setTotalesHistoricos(data.resumenGeneral)
      }
    } catch (error) {
      console.error("Error al cargar totales históricos:", error)
      setTotalesHistoricos(null)
    }
  }

  const actualizarNumerosLlamados = async () => {
    if (!nuevoNumeroLlamados || !estado) return

    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "actualizar_llamados",
          numerosLlamados: Number.parseInt(nuevoNumeroLlamados),
        }),
      })

      if (response.ok) {
        await cargarDatos()
        setNuevoNumeroLlamados("")
        alert("✅ Números llamados actualizados correctamente")
      } else {
        alert("❌ Error al actualizar números llamados")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("❌ Error al actualizar números llamados")
    }
  }

  const reiniciarSistema = async () => {
    if (!confirm("⚠️ ¿Estás seguro de que quieres reiniciar el sistema? Esto borrará todos los datos del día actual."))
      return

    try {
      const response = await fetch("/api/sistema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reiniciar" }),
      })

      if (response.ok) {
        await cargarDatos()
        alert("✅ Sistema reiniciado correctamente")
      } else {
        alert("❌ Error al reiniciar el sistema")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("❌ Error al reiniciar el sistema")
    }
  }

  const crearBackup = async () => {
    try {
      const response = await fetch("/api/sistema?action=forzar_backup")
      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}`)
        await cargarBackups()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("❌ Error al crear backup")
    }
  }

  const exportarBackup = (backup: BackupData) => {
    const datos = {
      ...backup,
      metadatos: {
        exportadoPor: "Panel Admin",
        fechaExportacion: new Date().toISOString(),
        version: "6.2",
      },
    }

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ZOCO-Backup-${backup.fecha}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportarTodosLosBackups = () => {
    if (backups.length === 0) {
      alert("No hay backups para exportar")
      return
    }

    const datos = {
      fechaExportacion: new Date().toISOString(),
      totalBackups: backups.length,
      backups: backups,
      metadatos: {
        version: "6.2",
        sistema: "TURNOS_ZOCO",
        tipoExportacion: "Todos los Backups",
        exportadoPor: "Panel Admin",
      },
    }

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ZOCO-TodosLosBackups-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const limpiarCache = async () => {
    try {
      const response = await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cache" }),
      })

      if (response.ok) {
        await cargarCacheStats()
        alert("✅ Caché limpiado correctamente")
      } else {
        alert("❌ Error al limpiar caché")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("❌ Error al limpiar caché")
    }
  }

  // Función para calcular estadísticas del admin
  const calcularEstadisticasAdmin = () => {
    if (!estado) return null

    const ticketsHoy = estado.totalAtendidos || 0
    const atendidos = estado.numerosLlamados || 0
    const pendientes = ticketsHoy - atendidos
    const eficiencia = ticketsHoy > 0 ? Math.round((atendidos / ticketsHoy) * 100) : 0

    return {
      ticketsHoy,
      atendidos,
      pendientes,
      eficiencia,
      proximoNumero: estado.numeroActual || 1,
      ultimoTicket: estado.ultimoNumero || 0,
    }
  }

  // Función para calcular métricas avanzadas de backups
  const calcularMetricasAvanzadas = () => {
    if (!backups || backups.length === 0) return null

    const totalDias = backups.length
    const totalTicketsHistoricos = backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0)
    const totalAtendidosHistoricos = backups.reduce(
      (sum, backup) => sum + (backup.resumen?.totalTicketsAtendidos || 0),
      0,
    )
    const promedioTicketsPorDia = totalDias > 0 ? Math.round(totalTicketsHistoricos / totalDias) : 0
    const promedioAtendidosPorDia = totalDias > 0 ? Math.round(totalAtendidosHistoricos / totalDias) : 0
    const eficienciaPromedio =
      totalTicketsHistoricos > 0 ? Math.round((totalAtendidosHistoricos / totalTicketsHistoricos) * 100) : 0

    // Encontrar mejor y peor día
    const mejorDia = backups.reduce((mejor, backup) => {
      const emitidos = backup.resumen?.totalTicketsEmitidos || 0
      const mejorEmitidos = mejor?.resumen?.totalTicketsEmitidos || 0
      return emitidos > mejorEmitidos ? backup : mejor
    }, null)

    const peorDia = backups.reduce((peor, backup) => {
      const emitidos = backup.resumen?.totalTicketsEmitidos || 0
      const peorEmitidos = peor?.resumen?.totalTicketsEmitidos || Number.POSITIVE_INFINITY
      return emitidos < peorEmitidos ? backup : peor
    }, null)

    return {
      totalDias,
      totalTicketsHistoricos,
      totalAtendidosHistoricos,
      promedioTicketsPorDia,
      promedioAtendidosPorDia,
      eficienciaPromedio,
      mejorDia,
      peorDia,
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={cargarDatos} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estadisticas = calcularEstadisticasAdmin()
  const metricas = calcularMetricasAvanzadas()

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
            <Settings className="h-8 w-8 md:h-10 md:w-10 text-blue-600" />
            Panel de Administración
          </h1>
          <p className="text-lg text-gray-600 mb-4">Gestión y monitoreo del sistema de turnos</p>

          <div className="flex justify-center gap-4 mb-6 flex-wrap">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Sistema
            </Button>
            <Button onClick={cargarDatos} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={() => (window.location.href = "/resumen")} className="bg-green-600 hover:bg-green-700">
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver Resumen Completo
            </Button>
          </div>
        </div>

        {/* Estado del Sistema */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Estado Actual del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadisticas && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{estadisticas.ticketsHoy}</div>
                  <p className="text-sm font-semibold text-blue-800">Tickets Hoy</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{estadisticas.atendidos}</div>
                  <p className="text-sm font-semibold text-green-800">Atendidos</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{estadisticas.pendientes}</div>
                  <p className="text-sm font-semibold text-orange-800">Pendientes</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{estadisticas.eficiencia}%</div>
                  <p className="text-sm font-semibold text-purple-800">Eficiencia</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">{estadisticas.proximoNumero}</div>
                  <p className="text-sm font-semibold text-red-800">Próximo Número</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-gray-500 text-center">
                  <div className="text-3xl font-bold text-gray-600 mb-2">{estadisticas.ultimoTicket}</div>
                  <p className="text-sm font-semibold text-gray-800">Último Ticket</p>
                </div>
              </div>
            )}

            {/* Controles de Administración */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-3">Actualizar Números Llamados</h4>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Nuevo número"
                    value={nuevoNumeroLlamados}
                    onChange={(e) => setNuevoNumeroLlamados(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={actualizarNumerosLlamados} size="sm">
                    <Target className="mr-2 h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-3">Backup Manual</h4>
                <Button onClick={crearBackup} className="w-full bg-orange-600 hover:bg-orange-700">
                  <Archive className="mr-2 h-4 w-4" />
                  Crear Backup Ahora
                </Button>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-3">Reiniciar Sistema</h4>
                <Button onClick={reiniciarSistema} variant="destructive" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reiniciar Sistema
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Totales Históricos Consolidados */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />📊 Totales Históricos Consolidados
              </div>
              <Button
                onClick={() => setMostrarTotalesHistoricos(!mostrarTotalesHistoricos)}
                variant="outline"
                size="sm"
              >
                {mostrarTotalesHistoricos ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Mostrar
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {mostrarTotalesHistoricos && (
            <CardContent>
              {totalesHistoricos ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{totalesHistoricos.totalDias || 0}</div>
                    <p className="text-sm font-semibold text-blue-800">Días Operativos</p>
                    <p className="text-xs text-blue-600 mt-1">Total histórico</p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {(totalesHistoricos.totalTicketsHistoricos || 0).toLocaleString()}
                    </div>
                    <p className="text-sm font-semibold text-green-800">Tickets Emitidos</p>
                    <p className="text-xs text-green-600 mt-1">Histórico total</p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200 text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {(totalesHistoricos.totalTicketsAtendidos || 0).toLocaleString()}
                    </div>
                    <p className="text-sm font-semibold text-orange-800">Tickets Atendidos</p>
                    <p className="text-xs text-orange-600 mt-1">Histórico total</p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {totalesHistoricos.eficienciaPromedioGeneral || 0}%
                    </div>
                    <p className="text-sm font-semibold text-purple-800">Eficiencia Promedio</p>
                    <p className="text-xs text-purple-600 mt-1">Histórica general</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No se pudieron cargar los totales históricos</p>
                  <Button onClick={cargarTotalesHistoricos} variant="outline" className="mt-4 bg-transparent">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              )}

              {totalesHistoricos && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Mejor Día Histórico
                    </h4>
                    {totalesHistoricos.mejorDia ? (
                      <div>
                        <div className="text-2xl font-bold text-yellow-600 mb-1">
                          {totalesHistoricos.mejorDia.ticketsEmitidos}
                        </div>
                        <p className="text-sm text-yellow-700">{totalesHistoricos.mejorDia.fecha}</p>
                        <p className="text-xs text-yellow-600">{totalesHistoricos.mejorDia.eficiencia}% eficiencia</p>
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
                        <span className="font-bold text-cyan-800">
                          {totalesHistoricos.promedioTicketsPorDia || 0}/día
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-cyan-700">Tickets atendidos:</span>
                        <span className="font-bold text-cyan-800">
                          {totalesHistoricos.promedioAtendidosPorDia || 0}/día
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Historial de Días Anteriores */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />📅 Historial de Días Anteriores
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setMostrarDetallesBackups(!mostrarDetallesBackups)} variant="outline" size="sm">
                  {mostrarDetallesBackups ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Mostrar
                    </>
                  )}
                </Button>
                {backups.length > 0 && (
                  <Button onClick={exportarTodosLosBackups} className="bg-green-600 hover:bg-green-700" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Todos
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          {mostrarDetallesBackups && (
            <CardContent>
              {backups.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {backups.slice(0, 10).map((backup, index) => (
                    <div key={backup.fecha} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-gray-800">{backup.fecha}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(backup.fecha).toLocaleDateString("es-AR", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {backup.resumen?.totalTicketsEmitidos || 0}
                          </div>
                          <div className="text-xs text-gray-500">tickets emitidos</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Atendidos:</span>
                          <p className="font-bold text-green-600">{backup.resumen?.totalTicketsAtendidos || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Pendientes:</span>
                          <p className="font-bold text-orange-600">{backup.resumen?.ticketsPendientes || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Eficiencia:</span>
                          <p className="font-bold text-purple-600">{backup.resumen?.eficienciaDiaria || 0}%</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Hora Pico:</span>
                          <p className="font-bold text-red-600">
                            {backup.resumen?.horaPico?.hora || 0}:00 ({backup.resumen?.horaPico?.cantidad || 0})
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Creado: {new Date(backup.fechaCreacion).toLocaleString("es-AR")}
                        </div>
                        <Button onClick={() => exportarBackup(backup)} size="sm" variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {backups.length > 10 && (
                    <div className="text-center py-4">
                      <p className="text-gray-600 mb-2">Mostrando los primeros 10 días</p>
                      <Button onClick={() => (window.location.href = "/resumen")} variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Historial Completo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay backups de días anteriores disponibles</p>
                  <Button onClick={cargarBackups} variant="outline" className="mt-4 bg-transparent">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Métricas Avanzadas */}
        {metricas && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />📈 Métricas Avanzadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">{metricas.totalDias}</div>
                  <p className="text-sm font-semibold text-blue-800">Días con Datos</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {metricas.totalTicketsHistoricos.toLocaleString()}
                  </div>
                  <p className="text-sm font-semibold text-green-800">Total Histórico</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-2">{metricas.promedioTicketsPorDia}</div>
                  <p className="text-sm font-semibold text-orange-800">Promedio/Día</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">{metricas.eficienciaPromedio}%</div>
                  <p className="text-sm font-semibold text-purple-800">Eficiencia Promedio</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-3">🏆 Mejor Día</h4>
                  {metricas.mejorDia ? (
                    <div>
                      <div className="text-xl font-bold text-yellow-600 mb-1">
                        {metricas.mejorDia.resumen?.totalTicketsEmitidos || 0} tickets
                      </div>
                      <p className="text-sm text-yellow-700">{metricas.mejorDia.fecha}</p>
                      <p className="text-xs text-yellow-600">
                        {metricas.mejorDia.resumen?.eficienciaDiaria || 0}% eficiencia
                      </p>
                    </div>
                  ) : (
                    <p className="text-yellow-600">Sin datos</p>
                  )}
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-3">📉 Día Más Bajo</h4>
                  {metricas.peorDia ? (
                    <div>
                      <div className="text-xl font-bold text-red-600 mb-1">
                        {metricas.peorDia.resumen?.totalTicketsEmitidos || 0} tickets
                      </div>
                      <p className="text-sm text-red-700">{metricas.peorDia.fecha}</p>
                      <p className="text-xs text-red-600">
                        {metricas.peorDia.resumen?.eficienciaDiaria || 0}% eficiencia
                      </p>
                    </div>
                  ) : (
                    <p className="text-red-600">Sin datos</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado de Conexión y Caché */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Conexión Base de Datos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estado de Conexión
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conexionDB ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {conexionDB.connected ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${conexionDB.connected ? "text-green-600" : "text-red-600"}`}>
                      {conexionDB.connected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>
                  {conexionDB.details.responseTime && (
                    <div className="text-sm text-gray-600">
                      <strong>Tiempo de respuesta:</strong> {conexionDB.details.responseTime}
                    </div>
                  )}
                  {conexionDB.details.config && (
                    <div className="text-sm text-gray-600">
                      <strong>Configuración:</strong> {conexionDB.details.config}
                    </div>
                  )}
                  {conexionDB.details.region && (
                    <div className="text-sm text-gray-600">
                      <strong>Región:</strong> {conexionDB.details.region}
                    </div>
                  )}
                  {conexionDB.details.error && (
                    <div className="text-sm text-red-600">
                      <strong>Error:</strong> {conexionDB.details.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Verificando conexión...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas de Caché */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Caché del Sistema
                </div>
                <Button onClick={limpiarCache} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entradas:</span>
                    <span className="font-semibold">{cacheStats.entries?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tamaño total:</span>
                    <span className="font-semibold">{Math.round((cacheStats.totalSize || 0) / 1024)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tasa de aciertos:</span>
                    <span className="font-semibold">{Math.round((cacheStats.hitRate || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total requests:</span>
                    <span className="font-semibold">{cacheStats.totalRequests || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Sin datos de caché</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Sistema de Turnos ZOCO | Panel de Administración v6.2</p>
            <p>Última actualización: {new Date().toLocaleString("es-AR")}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
