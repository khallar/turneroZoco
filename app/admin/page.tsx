"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  Trash2,
  RotateCcw,
  BarChart3,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  Download,
  RefreshCw,
  ArrowLeft,
  Activity,
  Timer,
  CheckCircle,
  Eye,
  PieChart,
  LineChart,
  Target,
  Zap,
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

  const exportarDatos = () => {
    const datos = {
      fecha: new Date().toISOString(),
      estado: estado,
      estadisticas: estadisticas,
      backups: backups,
      cacheStats: cacheStats,
      metricasAvanzadas: calcularMetricasAvanzadas(),
    }

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `sistema-atencion-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Calcular estadísticas administrativas
  const calcularEstadisticasAdmin = () => {
    if (!estado.tickets || estado.tickets.length === 0) {
      return {
        totalTicketsHistorico: 0,
        promedioTicketsPorDia: 0,
        diasOperativos: 0,
        eficienciaGeneral: 0,
        horasPicoGlobal: "Sin datos",
        ticketsPorHora: 0,
        tiempoPromedioGlobal: 0,
      }
    }

    const ahora = new Date()
    const inicioOperaciones = new Date(estado.fechaInicio)
    const diasOperativos = Math.max(
      1,
      Math.ceil((ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60 * 60 * 24)),
    )

    const totalTicketsHistorico = estado.totalAtendidos + backups.length * 50
    const promedioTicketsPorDia = totalTicketsHistorico / diasOperativos
    const eficienciaGeneral = estado.totalAtendidos > 0 ? (estado.numerosLlamados / estado.totalAtendidos) * 100 : 0

    const tiempoOperacion = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60 * 60)
    const ticketsPorHora = tiempoOperacion > 0 ? estado.totalAtendidos / tiempoOperacion : 0
    const tiempoPromedioGlobal = estado.numerosLlamados > 0 ? (tiempoOperacion * 60) / estado.numerosLlamados : 0

    return {
      totalTicketsHistorico,
      promedioTicketsPorDia: Math.round(promedioTicketsPorDia),
      diasOperativos,
      eficienciaGeneral: Math.round(eficienciaGeneral),
      horasPicoGlobal: "14:00 - 16:00",
      ticketsPorHora: Math.round(ticketsPorHora * 10) / 10,
      tiempoPromedioGlobal: Math.round(tiempoPromedioGlobal),
    }
  }

  // NUEVAS MÉTRICAS AVANZADAS
  const calcularMetricasAvanzadas = () => {
    if (!estado.tickets || estado.tickets.length === 0) {
      return {
        distribucionPorHora: {},
        nombresComunes: {},
        tiempoEntreTickets: 0,
        velocidadAtencion: 0,
        eficienciaPorHora: {},
        patronesUso: {},
        metricsRendimiento: {},
        analisisTendencias: {},
      }
    }

    const tickets = estado.tickets
    const ahora = new Date()

    // 1. Distribución de tickets por hora del día
    const distribucionPorHora = {}
    tickets.forEach((ticket) => {
      const hora = new Date(ticket.timestamp || Date.now()).getHours()
      distribucionPorHora[hora] = (distribucionPorHora[hora] || 0) + 1
    })

    // 2. Análisis de nombres más comunes
    const nombresComunes = {}
    tickets.forEach((ticket) => {
      const nombre = ticket.nombre.toLowerCase().trim()
      nombresComunes[nombre] = (nombresComunes[nombre] || 0) + 1
    })

    // 3. Tiempo promedio entre tickets
    let tiempoEntreTickets = 0
    if (tickets.length > 1) {
      const tiempos = []
      for (let i = 1; i < tickets.length; i++) {
        const diff = (tickets[i].timestamp || 0) - (tickets[i - 1].timestamp || 0)
        tiempos.push(diff)
      }
      tiempoEntreTickets = tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000 / 60 // en minutos
    }

    // 4. Velocidad de atención (tickets por minuto)
    const tiempoOperacion = (ahora.getTime() - new Date(estado.fechaInicio).getTime()) / (1000 * 60) // en minutos
    const velocidadAtencion = tiempoOperacion > 0 ? estado.numerosLlamados / tiempoOperacion : 0

    // 5. Eficiencia por hora
    const eficienciaPorHora = {}
    Object.keys(distribucionPorHora).forEach((hora) => {
      const ticketsHora = distribucionPorHora[hora]
      eficienciaPorHora[hora] = {
        emitidos: ticketsHora,
        eficiencia: Math.round((ticketsHora / estado.totalAtendidos) * 100),
      }
    })

    // 6. Patrones de uso
    const patronesUso = {
      horaPico: Object.keys(distribucionPorHora).reduce((a, b) =>
        distribucionPorHora[a] > distribucionPorHora[b] ? a : b,
      ),
      horaMinima: Object.keys(distribucionPorHora).reduce((a, b) =>
        distribucionPorHora[a] < distribucionPorHora[b] ? a : b,
      ),
      promedioTicketsPorHora: Object.values(distribucionPorHora).reduce((a, b) => a + b, 0) / 24,
    }

    // 7. Métricas de rendimiento del sistema
    const metricsRendimiento = {
      cacheHitRate: cacheStats.entries.filter((e) => e.fresh).length / Math.max(cacheStats.entries.length, 1),
      tiempoRespuestaPromedio: ultimaSincronizacion ? Date.now() - ultimaSincronizacion.getTime() : 0,
      disponibilidadSistema: error ? 0.95 : 1.0, // 95% si hay errores, 100% si no
    }

    // 8. Análisis de tendencias
    const analisisTendencias = {
      crecimientoDiario: estado.totalAtendidos / Math.max(1, calcularEstadisticasAdmin().diasOperativos),
      tendenciaEficiencia: estado.numerosLlamados / Math.max(1, estado.totalAtendidos),
      proyeccionDiaria: Math.round((estado.totalAtendidos / (ahora.getHours() || 1)) * 24),
    }

    return {
      distribucionPorHora,
      nombresComunes: Object.entries(nombresComunes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      tiempoEntreTickets: Math.round(tiempoEntreTickets * 10) / 10,
      velocidadAtencion: Math.round(velocidadAtencion * 100) / 100,
      eficienciaPorHora,
      patronesUso,
      metricsRendimiento,
      analisisTendencias,
    }
  }

  const estadisticasAdminCalculadas = calcularEstadisticasAdmin()
  const metricasAvanzadas = calcularMetricasAvanzadas()

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de administración (Cache Optimizado)...</p>
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
          <p className="text-lg text-gray-600 mb-4">Control total del sistema de atención (Cache Optimizado)</p>

          {/* Información de estado optimizada */}
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

          {/* Botones de navegación - AGREGADO BOTÓN PRÓXIMOS */}
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

        {/* Estadísticas de Cache */}
        {cacheStats.totalEntries > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                <Database className="h-6 w-6" />
                Estado del Cache Optimizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                  <div className="text-2xl font-bold text-blue-600">{cacheStats.totalEntries}</div>
                  <p className="text-xs text-gray-500">Entradas en Cache</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                  <div className="text-2xl font-bold text-green-600">{cacheStats.subscribers}</div>
                  <p className="text-xs text-gray-500">Suscriptores Activos</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                  <div className="text-2xl font-bold text-orange-600">
                    {cacheStats.entries.filter((e) => e.fresh).length}
                  </div>
                  <p className="text-xs text-gray-500">Entradas Frescas</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                  <Button onClick={invalidateCache} className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                    Limpiar Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="text-3xl font-bold">{estadisticasAdminCalculadas.eficienciaGeneral}%</div>
              <p className="text-xs opacity-80">Tasa de atención</p>
            </CardContent>
          </Card>
        </div>

        {/* NUEVAS MÉTRICAS AVANZADAS */}
        <Card className="mb-8 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between text-cyan-800">
              <div className="flex items-center gap-2">
                <PieChart className="h-6 w-6" />
                Métricas Avanzadas de Análisis
              </div>
              <Button
                onClick={() => setMostrarMetricasAvanzadas(!mostrarMetricasAvanzadas)}
                variant="outline"
                size="sm"
              >
                {mostrarMetricasAvanzadas ? "Ocultar" : "Mostrar"} Detalles
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Velocidad de Atención */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-cyan-500">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-medium text-gray-600">Velocidad Atención</span>
                </div>
                <div className="text-2xl font-bold text-cyan-600">{metricasAvanzadas.velocidadAtencion}</div>
                <p className="text-xs text-gray-500">Tickets/minuto</p>
              </div>

              {/* Tiempo Entre Tickets */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-teal-500">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-gray-600">Intervalo Promedio</span>
                </div>
                <div className="text-2xl font-bold text-teal-600">{metricasAvanzadas.tiempoEntreTickets}</div>
                <p className="text-xs text-gray-500">Minutos entre tickets</p>
              </div>

              {/* Hora Pico */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-amber-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-600">Hora Pico</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">{metricasAvanzadas.patronesUso.horaPico}:00</div>
                <p className="text-xs text-gray-500">Mayor actividad</p>
              </div>

              {/* Proyección Diaria */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-indigo-500">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-600">Proyección Diaria</span>
                </div>
                <div className="text-2xl font-bold text-indigo-600">
                  {metricasAvanzadas.analisisTendencias.proyeccionDiaria}
                </div>
                <p className="text-xs text-gray-500">Tickets estimados hoy</p>
              </div>
            </div>

            {/* Detalles expandidos */}
            {mostrarMetricasAvanzadas && (
              <div className="space-y-6">
                {/* Distribución por Hora */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />📊 Distribución de Tickets por Hora
                  </h4>
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2 text-xs">
                    {Array.from({ length: 24 }, (_, i) => {
                      const tickets = metricasAvanzadas.distribucionPorHora[i] || 0
                      const maxTickets = Math.max(...Object.values(metricasAvanzadas.distribucionPorHora))
                      const altura = maxTickets > 0 ? (tickets / maxTickets) * 100 : 0
                      return (
                        <div key={i} className="text-center">
                          <div className="text-xs font-bold mb-1">{tickets}</div>
                          <div
                            className="bg-blue-500 rounded-t"
                            style={{ height: `${Math.max(altura, 5)}px`, minHeight: "5px" }}
                          ></div>
                          <div className="text-xs mt-1">{i}h</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Nombres Más Comunes */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />👥 Nombres Más Frecuentes
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    {metricasAvanzadas.nombresComunes.slice(0, 10).map(([nombre, cantidad], index) => (
                      <div key={nombre} className="bg-gray-50 p-2 rounded">
                        <div className="font-semibold text-gray-800 truncate" title={nombre}>
                          {nombre}
                        </div>
                        <div className="text-blue-600 font-bold">{cantidad} veces</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Métricas de Rendimiento del Sistema */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />⚡ Rendimiento del Sistema
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(metricasAvanzadas.metricsRendimiento.cacheHitRate * 100)}%
                      </div>
                      <p className="text-sm text-gray-600">Cache Hit Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(metricasAvanzadas.metricsRendimiento.disponibilidadSistema * 100)}%
                      </div>
                      <p className="text-sm text-gray-600">Disponibilidad</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(metricasAvanzadas.analisisTendencias.crecimientoDiario)}
                      </div>
                      <p className="text-sm text-gray-600">Tickets/día promedio</p>
                    </div>
                  </div>
                </div>

                {/* Análisis de Tendencias */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <LineChart className="h-4 w-4" />📈 Análisis de Tendencias
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="font-semibold text-blue-800">Eficiencia Actual</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(metricasAvanzadas.analisisTendencias.tendenciaEficiencia * 100)}%
                      </div>
                      <p className="text-xs text-blue-600">Tickets atendidos vs emitidos</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="font-semibold text-green-800">Crecimiento Diario</div>
                      <div className="text-2xl font-bold text-green-600">
                        +{Math.round(metricasAvanzadas.analisisTendencias.crecimientoDiario)}
                      </div>
                      <p className="text-xs text-green-600">Tickets por día operativo</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="font-semibold text-orange-800">Proyección Restante</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.max(0, metricasAvanzadas.analisisTendencias.proyeccionDiaria - estado.totalAtendidos)}
                      </div>
                      <p className="text-xs text-orange-600">Tickets estimados restantes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estadísticas Avanzadas Existentes */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-indigo-800">
              <BarChart3 className="h-6 w-6" />
              Estadísticas Administrativas Completas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Días Operativos</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{estadisticasAdminCalculadas.diasOperativos}</div>
                <p className="text-xs text-gray-500">Desde inicio</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Promedio Diario</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {estadisticasAdminCalculadas.promedioTicketsPorDia}
                </div>
                <p className="text-xs text-gray-500">Tickets por día</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Productividad</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{estadisticasAdminCalculadas.ticketsPorHora}</div>
                <p className="text-xs text-gray-500">Tickets/hora</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Tiempo Promedio</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {estadisticasAdminCalculadas.tiempoPromedioGlobal}
                </div>
                <p className="text-xs text-gray-500">Min por ticket</p>
              </div>
            </div>

            {/* Estadísticas del servidor si están disponibles */}
            {estadisticas && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">📊 Datos en Tiempo Real del Servidor</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tickets última hora:</span>
                    <p className="font-bold text-blue-600">{estadisticas.ticketsUltimaHora}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio operaciones:</span>
                    <p className="font-bold text-green-600">{estadisticas.horaInicioOperaciones}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Última actividad:</span>
                    <p className="font-bold text-orange-600">
                      {estadisticas.ultimaActividad !== "Sin actividad"
                        ? new Date(estadisticas.ultimaActividad).toLocaleTimeString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                          })
                        : "Sin actividad"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Promedio servidor:</span>
                    <p className="font-bold text-purple-600">{estadisticas.promedioTiempoPorTicket.toFixed(1)} min</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controles Administrativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Acciones Principales */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Controles Administrativos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <h4 className="font-semibold text-red-800 mb-2">🗑️ Eliminar Todos los Registros</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Elimina permanentemente todos los tickets y datos del sistema. Esta acción no se puede deshacer.
                </p>
                <Button
                  onClick={() => setMostrarConfirmacionEliminar(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={procesandoAccion}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Todo
                </Button>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="font-semibold text-orange-800 mb-2">🔄 Reiniciar Contador Diario</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Reinicia el contador de tickets del día actual. Los datos se respaldan automáticamente.
                </p>
                <Button
                  onClick={() => setMostrarConfirmacionReinicio(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={procesandoAccion}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Día
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Herramientas */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Herramientas de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-800 mb-2">📥 Exportar Datos</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Descarga un archivo JSON con todos los datos del sistema para respaldo o análisis.
                </p>
                <Button onClick={exportarDatos} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar JSON
                </Button>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-semibold text-green-800 mb-2">🔄 Actualizar Datos</h4>
                <p className="text-sm text-gray-600 mb-3">Fuerza una actualización completa de todos los datos.</p>
                <Button onClick={cargarDatosAdmin} className="bg-green-600 hover:bg-green-700 text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Backups */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Días Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {backups.map((backup, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-2">📅 {backup.fecha}</h4>
                    <p className="text-sm text-gray-600 mb-3">Backup automático del día</p>
                    <Button onClick={() => verBackup(backup.fecha)} variant="outline" size="sm" className="w-full">
                      Ver Detalles
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay backups disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Modales existentes... */}
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

        {backupSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl bg-white max-h-96 overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Backup del {backupSeleccionado.fecha}</span>
                  <Button onClick={() => setBackupSeleccionado(null)} variant="ghost" size="sm">
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backupSeleccionado.resumen && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Tickets emitidos:</span>
                        <p>{backupSeleccionado.resumen.totalTicketsEmitidos}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Tickets atendidos:</span>
                        <p>{backupSeleccionado.resumen.totalTicketsAtendidos}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Primer ticket:</span>
                        <p>#{backupSeleccionado.resumen.primerTicket}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Último ticket:</span>
                        <p>#{backupSeleccionado.resumen.ultimoTicket}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 5.1 | Cache Optimizado - Menos consultas DB</p>
            <p>Actualización inteligente cada 120s | Cache compartido entre páginas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
