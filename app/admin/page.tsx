"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  RotateCcw,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Database,
  ArrowLeft,
  Timer,
  CheckCircle,
  Eye,
  PieChart,
  Target,
  Zap,
} from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

export default function PaginaAdmin() {
  const { estado, loading, error, generarTicket, llamarSiguiente, reiniciarContador, recargar } = useSistemaEstado()

  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const obtenerBackup = async (fecha: string) => {
    try {
      const response = await fetch(`/api/backup?fecha=${fecha}`)
      if (!response.ok) throw new Error("Error al obtener backup")
      const data = await response.json()
      return data.backup
    } catch (error) {
      console.error("Error al obtener backup:", error)
      return null
    }
  }

  const invalidateCache = () => {
    // Función placeholder para limpiar cache
    console.log("Cache invalidated")
  }

  const [backups, setBackups] = useState<any[]>([])
  const [backupSeleccionado, setBackupSeleccionado] = useState<any>(null)
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [mostrarMetricasAvanzadas, setMostrarMetricasAvanzadas] = useState(false)
  const [descargandoTodos, setDescargandoTodos] = useState(false)
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [errorBackups, setErrorBackups] = useState<string | null>(null)
  const [creandoBackupPrueba, setCreandoBackupPrueba] = useState(false)

  // Nuevo estado para controlar la visibilidad del gráfico de evolución
  const [mostrarGraficoEvolucion, setMostrarGraficoEvolucion] = useState(true)

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
      await recargar(true, true)
    } catch (error) {
      console.error("Error al cargar datos admin:", error)
    }
  }

  const cargarBackups = async () => {
    setLoadingBackups(true)
    setErrorBackups(null)
    try {
      console.log("🔄 Cargando backups desde API...")

      const response = await fetch("/api/backup", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("📊 Respuesta de API backups:", data)

      if (data.success && Array.isArray(data.backups)) {
        setBackups(data.backups)
        console.log(`✅ Cargados ${data.backups.length} backups`)
      } else {
        console.warn("⚠️ Respuesta de API no contiene backups válidos:", data)
        setBackups([])
        setErrorBackups(data.error || "No se pudieron cargar los backups")
      }
    } catch (error) {
      console.error("❌ Error al cargar backups:", error)
      setErrorBackups(error instanceof Error ? error.message : "Error desconocido")
      setBackups([])
    } finally {
      setLoadingBackups(false)
    }
  }

  const crearBackupPrueba = async () => {
    setCreandoBackupPrueba(true)
    try {
      console.log("🧪 Creando backup de prueba...")

      const response = await fetch("/api/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("📊 Respuesta de creación de backup:", data)

      if (data.success) {
        alert(`✅ Backup creado exitosamente para ${data.fecha}\nTickets incluidos: ${data.totalTickets}`)
        // Recargar backups
        await cargarBackups()
      } else {
        alert(`❌ Error al crear backup: ${data.error}`)
      }
    } catch (error) {
      console.error("❌ Error al crear backup de prueba:", error)
      alert(`❌ Error al crear backup: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setCreandoBackupPrueba(false)
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
        await recargar()
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

  // NUEVA FUNCIÓN: Reiniciar contador diario
  const reiniciarContadorDiario = async () => {
    setProcesandoAccion(true)
    try {
      const success = await reiniciarContador()
      if (success) {
        // Recargar backups para mostrar el nuevo backup creado
        await cargarBackups()
        alert(
          "✅ Contador diario reiniciado exitosamente\n📦 Backup automático del día anterior creado\n🔄 Historial actualizado",
        )
      } else {
        throw new Error("Error al reiniciar contador")
      }
    } catch (error) {
      console.error("Error al reiniciar contador:", error)
      alert("❌ Error al reiniciar contador")
    } finally {
      setProcesandoAccion(false)
      setMostrarConfirmacionReinicio(false)
    }
  }

  const exportarDatos = () => {
    const datos = {
      fecha: new Date().toISOString(),
      estado: estado,
      estadisticas: {},
      backups: backups,
      cacheStats: { entries: [], totalEntries: 0 },
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

  // MÉTRICAS AVANZADAS MEJORADAS
  const calcularMetricasAvanzadas = () => {
    if (!estado.tickets || estado.tickets.length === 0) {
      return {
        distribucionPorHora: {},
        nombresComunes: {},
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

    const tickets = estado.tickets
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

    // 10. Métricas de rendimiento del sistema - FIXED: Handle undefined cacheStats
    const safeCache = { entries: [], totalEntries: 0 }
    const metricsRendimiento = {
      cacheHitRate:
        safeCache.entries.length > 0 ? safeCache.entries.filter((e) => e.fresh).length / safeCache.entries.length : 0,
      tiempoRespuestaPromedio: 0,
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
                Última sync: {new Date().toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
              </span>
            </div>
            {false && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">📦 Cache: 0 entradas</span>
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
              <div className="text-3xl font-bold">{estadisticasAdminCalculadas.eficienciaGeneral}%</div>
              <p className="text-xs opacity-80">Tasa de atención</p>
            </CardContent>
          </Card>
        </div>

        {/* BOTÓN DE REINICIAR DÍA - AGREGADO */}
        <div className="mb-8 text-center">
          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center justify-center gap-2">
                <RotateCcw className="h-6 w-6" />
                Gestión del Contador Diario
              </h3>
              <p className="text-orange-700 mb-4">
                Reinicia el contador para comenzar un nuevo día. Los datos actuales se respaldarán automáticamente.
              </p>
              <Button
                onClick={() => setMostrarConfirmacionReinicio(true)}
                disabled={procesandoAccion}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg rounded-xl shadow-lg"
              >
                <RotateCcw className="mr-3 h-5 w-5" />
                {procesandoAccion ? "Reiniciando..." : "Reiniciar Contador Diario"}
              </Button>
            </CardContent>
          </Card>
        </div>

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
                          {Math.round(metricasAvanzadas.patronesUso.promedioTicketsPorHora * 10) / 10}
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
                          {Math.round((metricasAvanzadas.horaPico.cantidad / estado.totalAtendidos) * 100)}% en pico
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
                      const porcentaje = Math.round((cantidad / estado.totalAtendidos) * 100)
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            <p>Develop by: Karim :) | Versión 6.0 | Panel Admin con Reinicio de Contador</p>
            <p>Actualización inteligente cada 120s | Cache compartido entre páginas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
