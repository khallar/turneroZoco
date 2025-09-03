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
  Database,
  RefreshCw,
  ArrowLeft,
  Activity,
  Timer,
  CheckCircle,
  Eye,
  PieChart,
  Target,
  Zap,
  Download,
  Plus,
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
  const [creandoBackup, setCreandoBackup] = useState(false)

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
      const backupsResult = await obtenerBackups(1, 10) // Cargar solo los primeros 10 para el admin
      setBackups(backupsResult?.backups || [])
    } catch (error) {
      console.error("Error al cargar backups:", error)
      setBackups([])
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

  const forzarBackupDiario = async () => {
    setCreandoBackup(true)
    try {
      const response = await fetch("/api/sistema?action=forzar_backup")
      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}`)
        // Recargar backups después de crear uno nuevo
        await cargarBackups()
        await cargarDatosAdmin()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      console.error("Error al forzar backup:", error)
      alert("❌ Error al crear backup")
    } finally {
      setCreandoBackup(false)
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
    if (!estado || !estado.tickets || estado.tickets.length === 0) {
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

    const totalTicketsHistorico = estado.totalAtendidos + (backups?.length || 0) * 50
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

  // MÉTRICAS AVANZADAS MEJORADAS
  const calcularMetricasAvanzadas = () => {
    if (!estado || !estado.tickets || estado.tickets.length === 0) {
      return {
        distribucionPorHora: {},
        nombresComunes: [],
        tiempoEntreTickets: 0,
        velocidadAtencion: 0,
        tiempoEsperaReal: 0,
        horaPico: { hora: 0, cantidad: 0 },
        proyeccionDiaria: 0,
        eficienciaPorHora: {},
        patronesUso: {},
        metricsRendimiento: {},
        analisisTendencias: {},
      }
    }

    const tickets = estado.tickets || []
    const ahora = new Date()
    const inicioOperaciones = new Date(estado.fechaInicio)

    // 1. Distribución de tickets por hora del día
    const distribucionPorHora = {}
    tickets.forEach((ticket) => {
      const fecha = ticket.timestamp ? new Date(ticket.timestamp) : new Date(ticket.fecha)
      const hora = fecha.getHours()
      distribucionPorHora[hora] = (distribucionPorHora[hora] || 0) + 1
    })

    // 2. Análisis de nombres más comunes
    const nombresComunes = {}
    tickets.forEach((ticket) => {
      const nombre = ticket.nombre.toLowerCase().trim()
      if (nombre !== "cliente zoco") {
        // Excluir nombre por defecto
        nombresComunes[nombre] = (nombresComunes[nombre] || 0) + 1
      }
    })

    // 3. Tiempo promedio entre tickets (Intervalo Promedio)
    let tiempoEntreTickets = 0
    if (tickets.length > 1) {
      const tiempos = []
      for (let i = 1; i < tickets.length; i++) {
        const timestamp1 = tickets[i - 1].timestamp || new Date(tickets[i - 1].fecha).getTime()
        const timestamp2 = tickets[i].timestamp || new Date(tickets[i].fecha).getTime()
        const diff = timestamp2 - timestamp1
        if (diff > 0) tiempos.push(diff)
      }
      if (tiempos.length > 0) {
        tiempoEntreTickets = tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000 / 60 // en minutos
      }
    }

    // 4. Velocidad de atención (tickets atendidos por minuto)
    const tiempoOperacionMinutos = (ahora.getTime() - inicioOperaciones.getTime()) / (1000 * 60)
    const velocidadAtencion = tiempoOperacionMinutos > 0 ? estado.numerosLlamados / tiempoOperacionMinutos : 0

    // 5. NUEVO: Tiempo de espera real promedio
    let tiempoEsperaReal = 0
    if (estado.numerosLlamados > 0 && tickets.length > 0) {
      const ticketsAtendidos = tickets.slice(0, estado.numerosLlamados)
      const tiemposEspera = []

      ticketsAtendidos.forEach((ticket, index) => {
        // Calcular tiempo desde que se emitió hasta que fue llamado
        // Asumimos que los tickets se llaman en orden, entonces el ticket en posición 'index'
        // fue llamado cuando se procesaron 'index + 1' tickets
        const tiempoEmision = ticket.timestamp || new Date(ticket.fecha).getTime()
        const tiempoEstimadoLlamada =
          inicioOperaciones.getTime() + (index + 1) * (tiempoOperacionMinutos / estado.numerosLlamados) * 60 * 1000
        const espera = (tiempoEstimadoLlamada - tiempoEmision) / 1000 / 60 // en minutos
        if (espera > 0) tiemposEspera.push(espera)
      })

      if (tiemposEspera.length > 0) {
        tiempoEsperaReal = tiemposEspera.reduce((a, b) => a + b, 0) / tiemposEspera.length
      }
    }

    // 6. Hora pico mejorada
    const horaPico = Object.entries(distribucionPorHora).reduce(
      (max, [hora, cantidad]) => {
        return cantidad > max.cantidad ? { hora: Number.parseInt(hora), cantidad } : max
      },
      { hora: 0, cantidad: 0 },
    )

    // 7. Proyección diaria mejorada
    const horaActual = ahora.getHours()
    const minutosTranscurridos = ahora.getHours() * 60 + ahora.getMinutes()
    const minutosEnDia = 24 * 60
    const proyeccionDiaria =
      minutosTranscurridos > 0
        ? Math.round((estado.totalAtendidos / minutosTranscurridos) * minutosEnDia)
        : estado.totalAtendidos

    // 8. Eficiencia por hora
    const eficienciaPorHora = {}
    Object.keys(distribucionPorHora).forEach((hora) => {
      const ticketsHora = distribucionPorHora[hora]
      eficienciaPorHora[hora] = {
        emitidos: ticketsHora,
        eficiencia: Math.round((ticketsHora / estado.totalAtendidos) * 100),
      }
    })

    // 9. Patrones de uso
    const patronesUso = {
      horaPico: horaPico.hora,
      horaMinima: Object.keys(distribucionPorHora).reduce((a, b) =>
        distribucionPorHora[a] < distribucionPorHora[b] ? a : b,
      ),
      promedioTicketsPorHora:
        Object.values(distribucionPorHora).reduce((a, b) => a + b, 0) /
        Math.max(Object.keys(distribucionPorHora).length, 1),
    }

    // 10. Métricas de rendimiento del sistema
    const metricsRendimiento = {
      cacheHitRate:
        (cacheStats?.entries?.filter((e) => e.fresh)?.length || 0) / Math.max(cacheStats?.entries?.length || 1, 1),
      tiempoRespuestaPromedio: ultimaSincronizacion ? Date.now() - ultimaSincronizacion.getTime() : 0,
      disponibilidadSistema: error ? 0.95 : 1.0,
    }

    // 11. Análisis de tendencias
    const analisisTendencias = {
      crecimientoDiario: estado.totalAtendidos / Math.max(1, calcularEstadisticasAdmin().diasOperativos),
      tendenciaEficiencia: estado.numerosLlamados / Math.max(1, estado.totalAtendidos),
      proyeccionDiaria: proyeccionDiaria,
    }

    return {
      distribucionPorHora,
      nombresComunes: Object.entries(nombresComunes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      tiempoEntreTickets: Math.round(tiempoEntreTickets * 10) / 10,
      velocidadAtencion: Math.round(velocidadAtencion * 100) / 100,
      tiempoEsperaReal: Math.round(tiempoEsperaReal * 10) / 10,
      horaPico,
      proyeccionDiaria,
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
            {cacheStats && cacheStats.totalEntries > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  📦 Cache: {cacheStats.totalEntries} entradas
                </span>
              </div>
            )}
          </div>

          {/* Botones de navegación */}
          <div className="flex justify-center gap-4 flex-wrap">
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
            <a
              href="/resumen"
              className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Resumen Histórico
            </a>
          </div>
        </div>

        {/* Estadísticas de Cache - MINIMIZADO */}
        {cacheStats && cacheStats.totalEntries > 0 && (
          <div className="mb-6 flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 font-medium">Cache:</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-blue-700">{cacheStats.totalEntries} entradas</span>
                <span className="text-green-700">
                  {(cacheStats.entries || []).filter((e) => e.fresh).length} frescas
                </span>
                <span className="text-purple-700">{cacheStats.subscribers || 0} suscriptores</span>
                <Button
                  onClick={invalidateCache}
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-6 bg-transparent"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas Principales del Día */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Hoy</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.totalAtendidos || 0}</div>
              <p className="text-xs opacity-80">Emitidos en el día</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{estado?.numerosLlamados || 0}</div>
              <p className="text-xs opacity-80">Tickets procesados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Espera</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(estado?.totalAtendidos || 0) - (estado?.numerosLlamados || 0)}</div>
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

        {/* Acciones Administrativas Principales */}
        <Card className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-xl text-orange-800 flex items-center gap-2">
              <Shield className="h-6 w-6" />🔧 Acciones Administrativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Crear Backup Manual */}
              <Button
                onClick={forzarBackupDiario}
                disabled={creandoBackup}
                className="bg-green-600 hover:bg-green-700 text-white h-20 flex flex-col items-center justify-center"
              >
                {creandoBackup ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
                    <span className="text-sm">Creando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-6 w-6 mb-2" />
                    <span className="text-sm font-semibold">Crear Backup Hoy</span>
                  </>
                )}
              </Button>

              {/* Reiniciar Contador */}
              <Button
                onClick={() => setMostrarConfirmacionReinicio(true)}
                disabled={procesandoAccion}
                className="bg-orange-600 hover:bg-orange-700 text-white h-20 flex flex-col items-center justify-center"
              >
                <RotateCcw className="h-6 w-6 mb-2" />
                <span className="text-sm font-semibold">Reiniciar Contador</span>
              </Button>

              {/* Eliminar Registros */}
              <Button
                onClick={() => setMostrarConfirmacionEliminar(true)}
                disabled={procesandoAccion}
                className="bg-red-600 hover:bg-red-700 text-white h-20 flex flex-col items-center justify-center"
              >
                <AlertTriangle className="h-6 w-6 mb-2" />
                <span className="text-sm font-semibold">Eliminar Todo</span>
              </Button>

              {/* Exportar Datos */}
              <Button
                onClick={exportarDatos}
                className="bg-blue-600 hover:bg-blue-700 text-white h-20 flex flex-col items-center justify-center"
              >
                <Download className="h-6 w-6 mb-2" />
                <span className="text-sm font-semibold">Exportar Datos</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* MÉTRICAS AVANZADAS MEJORADAS */}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                <p className="text-xs text-gray-500">Min entre tickets</p>
              </div>

              {/* NUEVO: Tiempo de Espera Real */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">Espera Real</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{metricasAvanzadas.tiempoEsperaReal}</div>
                <p className="text-xs text-gray-500">Min promedio espera</p>
              </div>

              {/* Hora Pico Mejorada */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-amber-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-600">Hora Pico</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">{metricasAvanzadas.horaPico.hora}:00</div>
                <p className="text-xs text-gray-500">{metricasAvanzadas.horaPico.cantidad} tickets</p>
              </div>

              {/* Proyección Diaria Mejorada */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-indigo-500">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-600">Proyección Diaria</span>
                </div>
                <div className="text-2xl font-bold text-indigo-600">{metricasAvanzadas.proyeccionDiaria}</div>
                <p className="text-xs text-gray-500">Tickets estimados hoy</p>
              </div>
            </div>

            {/* Detalles expandidos mejorados */}
            {mostrarMetricasAvanzadas && (
              <div className="space-y-6">
                {/* Distribución por Hora MEJORADA */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />📊 Distribución de Tickets por Hora del Día
                  </h4>
                  <div className="mb-4">
                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2 text-xs">
                      {Array.from({ length: 24 }, (_, i) => {
                        const tickets = metricasAvanzadas.distribucionPorHora[i] || 0
                        const maxTickets = Math.max(...Object.values(metricasAvanzadas.distribucionPorHora), 1)
                        const altura = (tickets / maxTickets) * 60 // Altura máxima 60px
                        const esPico = i === metricasAvanzadas.horaPico.hora
                        return (
                          <div key={i} className="text-center">
                            <div className={`text-xs font-bold mb-1 ${esPico ? "text-red-600" : "text-gray-700"}`}>
                              {tickets}
                            </div>
                            <div
                              className={`rounded-t transition-all duration-300 ${
                                esPico ? "bg-red-500 animate-pulse" : tickets > 0 ? "bg-blue-500" : "bg-gray-200"
                              }`}
                              style={{ height: `${Math.max(altura, 4)}px`, minHeight: "4px" }}
                            ></div>
                            <div className={`text-xs mt-1 ${esPico ? "font-bold text-red-600" : "text-gray-500"}`}>
                              {i}h
                            </div>
                            {esPico && <div className="text-xs text-red-500 font-bold">PICO</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="font-semibold text-gray-700">Hora más activa:</span>
                        <p className="text-blue-600 font-bold">
                          {metricasAvanzadas.horaPico.hora}:00 ({metricasAvanzadas.horaPico.cantidad} tickets)
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Promedio por hora:</span>
                        <p className="text-green-600 font-bold">
                          {Math.round((metricasAvanzadas.patronesUso.promedioTicketsPorHora || 0) * 10) / 10}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Horas activas:</span>
                        <p className="text-purple-600 font-bold">
                          {Object.keys(metricasAvanzadas.distribucionPorHora).length}/24
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Concentración:</span>
                        <p className="text-orange-600 font-bold">
                          {Math.round(
                            (metricasAvanzadas.horaPico.cantidad / Math.max(estado?.totalAtendidos || 1, 1)) * 100,
                          )}
                          % en pico
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nombres Más Comunes MEJORADO */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />👥 Top 10 Nombres Más Frecuentes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metricasAvanzadas.nombresComunes.slice(0, 10).map(([nombre, cantidad], index) => {
                      const porcentaje = Math.round((cantidad / Math.max(estado?.totalAtendidos || 1, 1)) * 100)
                      const isTop3 = index < 3
                      return (
                        <div
                          key={nombre}
                          className={`p-3 rounded-lg border-l-4 ${
                            isTop3 ? "bg-yellow-50 border-yellow-400" : "bg-gray-50 border-gray-300"
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
                                <div className="font-semibold text-gray-800 capitalize" title={nombre}>
                                  {nombre.length > 20 ? nombre.substring(0, 20) + "..." : nombre}
                                </div>
                                <div className="text-sm text-gray-500">{porcentaje}% del total</div>
                              </div>
                            </div>
                            <div className={`text-2xl font-bold ${isTop3 ? "text-blue-600" : "text-gray-600"}`}>
                              {cantidad}
                            </div>
                          </div>
                          {isTop3 && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    porcentaje >= 10 ? "bg-green-500" : porcentaje >= 5 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(porcentaje * 2, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {metricasAvanzadas.nombresComunes.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay datos suficientes para mostrar nombres frecuentes
                    </p>
                  )}
                </div>

                {/* Métricas de Tiempo Detalladas */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    ⏱️ Análisis Temporal Detallado
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">Tiempo de Espera Real</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {metricasAvanzadas.tiempoEsperaReal} min
                      </div>
                      <p className="text-sm text-blue-700">Promedio desde emisión hasta llamada</p>
                      <div className="mt-2 text-xs text-blue-600">
                        Basado en {estado?.numerosLlamados || 0} tickets atendidos
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Velocidad de Atención</span>
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {metricasAvanzadas.velocidadAtencion}/min
                      </div>
                      <p className="text-sm text-green-700">Tickets procesados por minuto</p>
                      <div className="mt-2 text-xs text-green-600">
                        {Math.round(metricasAvanzadas.velocidadAtencion * 60 * 10) / 10} tickets/hora
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-purple-800">Intervalo Entre Tickets</span>
                      </div>
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {metricasAvanzadas.tiempoEntreTickets} min
                      </div>
                      <p className="text-sm text-purple-700">Tiempo promedio entre emisiones</p>
                      <div className="mt-2 text-xs text-purple-600">
                        {Math.round((60 / Math.max(metricasAvanzadas.tiempoEntreTickets, 1)) * 10) / 10} tickets/hora
                        estimados
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proyección y Tendencias */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5" />🎯 Proyecciones y Tendencias
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-indigo-600 mb-2">
                        {metricasAvanzadas.proyeccionDiaria}
                      </div>
                      <p className="text-sm font-semibold text-indigo-800">Proyección Total Día</p>
                      <p className="text-xs text-indigo-600 mt-1">
                        Faltan: {Math.max(0, metricasAvanzadas.proyeccionDiaria - (estado?.totalAtendidos || 0))}{" "}
                        tickets
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {Math.round((metricasAvanzadas.analisisTendencias.tendenciaEficiencia || 0) * 100)}%
                      </div>
                      <p className="text-sm font-semibold text-orange-800">Eficiencia Actual</p>
                      <p className="text-xs text-orange-600 mt-1">Tickets atendidos vs emitidos</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-teal-600 mb-2">
                        {Math.round(metricasAvanzadas.analisisTendencias.crecimientoDiario || 0)}
                      </div>
                      <p className="text-sm font-semibold text-teal-800">Promedio Diario</p>
                      <p className="text-xs text-teal-600 mt-1">Tickets por día operativo</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Días Anteriores MEJORADO - Solo mostrar algunos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historial Reciente (Últimos 10 días)
              </div>
              <div className="flex gap-2">
                <Button onClick={cargarBackups} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
                <a
                  href="/resumen"
                  className="inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Todo el Historial
                </a>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backups && backups.length > 0 ? (
              <div className="space-y-4">
                {/* Lista de días con métricas MEJORADA - Solo primeros 10 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {backups.slice(0, 10).map((backup, index) => {
                    const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                    const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                    const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0
                    const pendientes = emitidos - atendidos
                    const esReciente = index < 3

                    // NUEVAS MÉTRICAS SOLICITADAS
                    const tiempoEsperaReal = backup.resumen?.tiempoPromedioEsperaReal || 0
                    const horaPico = backup.resumen?.horaPico || { hora: 0, cantidad: 0, porcentaje: 0 }

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                          esReciente
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className={`font-bold text-lg ${esReciente ? "text-blue-800" : "text-gray-800"}`}>
                              📅 {backup.fecha}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Date(backup.fecha).toLocaleDateString("es-AR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          {esReciente && (
                            <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              RECIENTE
                            </div>
                          )}
                        </div>

                        {/* Métricas principales del día */}
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">📊 Tickets emitidos:</span>
                            <span className="font-bold text-blue-600">{emitidos}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">✅ Atendidos:</span>
                            <span className="font-bold text-green-600">{atendidos}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">⏳ Pendientes:</span>
                            <span className="font-bold text-orange-600">{pendientes}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">📈 Eficiencia:</span>
                            <span
                              className={`font-bold ${
                                eficiencia >= 90
                                  ? "text-green-600"
                                  : eficiencia >= 70
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {eficiencia}%
                            </span>
                          </div>

                          {/* NUEVAS MÉTRICAS SOLICITADAS */}
                          <hr className="border-gray-300 my-2" />
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-blue-700 font-medium">⏱️ Espera Real:</span>
                              <span className="font-bold text-blue-800">{tiempoEsperaReal} min</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-blue-700 font-medium">🔥 Hora Pico:</span>
                              <span className="font-bold text-blue-800">
                                {horaPico.hora}:00 ({horaPico.cantidad} tickets)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                eficiencia >= 90 ? "bg-green-500" : eficiencia >= 70 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${eficiencia}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">Eficiencia del día</p>
                        </div>

                        {/* Rango de tickets */}
                        {backup.resumen?.primerTicket && backup.resumen?.ultimoTicket && (
                          <div className="bg-white p-2 rounded border mb-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Rango:</span>
                              <span className="font-mono font-bold text-gray-800">
                                #{backup.resumen.primerTicket.toString().padStart(3, "0")} - #
                                {backup.resumen.ultimoTicket.toString().padStart(3, "0")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Botón de acción */}
                        <Button
                          onClick={() => verBackup(backup.fecha)}
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-blue-50"
                        >
                          👁️ Ver Detalles
                        </Button>
                      </div>
                    )
                  })}
                </div>

                {/* Mensaje para ver más */}
                {backups.length > 10 && (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-600 mb-2">
                      Mostrando los últimos 10 días. Hay {backups.length - 10} días más en el historial.
                    </p>
                    <a
                      href="/resumen"
                      className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Ver Historial Completo con Paginación
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-xl text-gray-500 mb-2">No hay historial disponible</p>
                <p className="text-gray-400 mb-4">Los backups aparecerán aquí después del primer día de operación</p>
                <Button
                  onClick={forzarBackupDiario}
                  disabled={creandoBackup}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {creandoBackup ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando Backup...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Primer Backup
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                        <p>{backupSeleccionado.resumen.totalTicketsEmitidos || 0}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Tickets atendidos:</span>
                        <p>{backupSeleccionado.resumen.totalTicketsAtendidos || 0}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Eficiencia:</span>
                        <p>{backupSeleccionado.resumen.eficienciaDiaria || 0}%</p>
                      </div>
                      <div>
                        <span className="font-semibold">Hora pico:</span>
                        <p>{backupSeleccionado.resumen.horaPico?.hora || 0}:00</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded">
                    <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(backupSeleccionado, null, 2)}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
