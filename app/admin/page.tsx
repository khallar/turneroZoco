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
  Timer,
  CheckCircle,
  Eye,
  PieChart,
  Target,
  Zap,
  Download,
  Archive,
  Plus,
  LineChart,
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
} from "recharts"

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

  const prepararDatosGraficoEvolucion = () => {
    if (backups.length === 0) return []

    // Tomar los últimos 30 días activos (que tienen backups)
    const ultimos30Dias = backups.slice(-30).reverse() // Más recientes primero

    return ultimos30Dias
      .map((backup) => {
        const fecha = new Date(backup.fecha)
        const emitidos = backup.resumen?.totalTicketsEmitidos || 0
        const atendidos = backup.resumen?.totalTicketsAtendidos || 0
        const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0
        const tiempoEsperaReal = backup.resumen?.tiempoPromedioEsperaReal || 0

        return {
          fecha: backup.fecha,
          fechaCorta: `${fecha.getDate()}/${fecha.getMonth() + 1}`,
          diaSemana: fecha.toLocaleDateString("es-AR", { weekday: "short" }),
          emitidos,
          atendidos,
          pendientes: emitidos - atendidos,
          eficiencia,
          tiempoEsperaReal,
        }
      })
      .reverse() // Volver a orden cronológico (más antiguos primero)
  }

  const estadisticasAdminCalculadas = calcularEstadisticasAdmin()
  const metricasAvanzadas = calcularMetricasAvanzadas()

  // Preparar datos para el gráfico de evolución
  const datosGraficoEvolucion = prepararDatosGraficoEvolucion()

  // Agregar función para descargar datos de un día específico
  const descargarDatosDia = async (backup: any) => {
    try {
      // Obtener datos completos del backup
      const backupCompleto = await obtenerBackup(backup.fecha)

      if (!backupCompleto) {
        alert("No se pudieron obtener los datos completos del día")
        return
      }

      // Preparar datos para descarga
      const datosDescarga = {
        // INFORMACIÓN BÁSICA
        fecha: backup.fecha,
        fechaFormateada: new Date(backup.fecha).toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),

        // MÉTRICAS PRINCIPALES SOLICITADAS
        cantidadTicketsEmitidos: backupCompleto.resumen?.totalTicketsEmitidos || 0,
        tiempoPromedioEsperaReal: backupCompleto.resumen?.tiempoPromedioEsperaReal || 0,
        horaPico: backupCompleto.resumen?.horaPico || { hora: 0, cantidad: 0, porcentaje: 0 },

        // RESUMEN OPERATIVO
        resumenOperativo: {
          ticketsEmitidos: backupCompleto.resumen?.totalTicketsEmitidos || 0,
          ticketsAtendidos: backupCompleto.resumen?.totalTicketsAtendidos || 0,
          ticketsPendientes: backupCompleto.resumen?.ticketsPendientes || 0,
          eficienciaDiaria: backupCompleto.resumen?.eficienciaDiaria || 0,
          primerTicket: backupCompleto.resumen?.primerTicket || 0,
          ultimoTicket: backupCompleto.resumen?.ultimoTicket || 0,
        },

        // ANÁLISIS TEMPORAL DETALLADO
        analisisTemporal: {
          tiempoPromedioEsperaReal: `${backupCompleto.resumen?.tiempoPromedioEsperaReal || 0} minutos`,
          velocidadAtencion: `${backupCompleto.resumen?.velocidadAtencion || 0} tickets/minuto`,
          tiempoEntreTickets: `${backupCompleto.resumen?.tiempoEntreTickets || 0} minutos`,
          duracionOperaciones: backupCompleto.datosDetallados?.analisisTemporal?.duracionTotal || 0,
          inicioOperaciones: backupCompleto.datosDetallados?.analisisTemporal?.inicioOperaciones || backup.fecha,
          finOperaciones: backupCompleto.datosDetallados?.analisisTemporal?.finOperaciones || backup.fecha,
        },

        // DISTRIBUCIÓN POR HORA (SOLICITADO)
        distribucionPorHora: backupCompleto.resumen?.distribucionPorHora || {},
        distribucionPorHoraDetallada: Object.entries(backupCompleto.resumen?.distribucionPorHora || {})
          .map(([hora, cantidad]) => ({
            hora: `${hora}:00 - ${Number.parseInt(hora) + 1}:00`,
            horaNumero: Number.parseInt(hora),
            cantidadTickets: cantidad,
            porcentajeDelTotal: Math.round((cantidad / (backupCompleto.resumen?.totalTicketsEmitidos || 1)) * 100),
          }))
          .sort((a, b) => a.horaNumero - b.horaNumero),

        // HORAS PICO Y MÍNIMAS
        horasPico: backupCompleto.datosDetallados?.analisisTemporal?.horasPico || [],
        horasMinimas: backupCompleto.datosDetallados?.analisisTemporal?.horasMinimas || [],

        // ANÁLISIS DE CLIENTES
        analisisClientes: {
          nombresComunes: backupCompleto.resumen?.nombresComunes || [],
          nombresUnicos: backupCompleto.datosDetallados?.estadisticasClientes?.nombresUnicos || 0,
          clientesRecurrentes: backupCompleto.datosDetallados?.estadisticasClientes?.clientesRecurrentes || 0,
          promedioCaracteresPorNombre:
            backupCompleto.datosDetallados?.estadisticasClientes?.promedioCaracteresPorNombre || 0,
        },

        // MÉTRICAS DE RENDIMIENTO
        rendimiento: backupCompleto.datosDetallados?.rendimiento || {},

        // TICKETS COMPLETOS (si están disponibles)
        tickets: backupCompleto.tickets || [],

        // METADATOS DE DESCARGA
        metadatos: {
          fechaDescarga: new Date().toISOString(),
          version: "5.2",
          sistema: "TURNOS_ZOCO",
          generadoPor: "Panel de Administración",
        },
      }

      // Crear y descargar archivo JSON
      const blob = new Blob([JSON.stringify(datosDescarga, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ZOCO-Datos-${backup.fecha}-Completo.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // También crear un archivo CSV con los datos principales
      const csvData = [
        // Encabezados
        [
          "Fecha",
          "Tickets Emitidos",
          "Tickets Atendidos",
          "Tickets Pendientes",
          "Eficiencia (%)",
          "Tiempo Promedio Espera (min)",
          "Hora Pico",
          "Tickets en Hora Pico",
          "Velocidad Atención (tickets/min)",
          "Tiempo Entre Tickets (min)",
        ],
        // Datos
        [
          datosDescarga.fechaFormateada,
          datosDescarga.cantidadTicketsEmitidos,
          datosDescarga.resumenOperativo.ticketsAtendidos,
          datosDescarga.resumenOperativo.ticketsPendientes,
          datosDescarga.resumenOperativo.eficienciaDiaria,
          datosDescarga.tiempoPromedioEsperaReal,
          `${datosDescarga.horaPico.hora}:00`,
          datosDescarga.horaPico.cantidad,
          datosDescarga.analisisTemporal.velocidadAtencion.replace(" tickets/minuto", ""),
          datosDescarga.analisisTemporal.tiempoEntreTickets.replace(" minutos", ""),
        ],
      ]

      const csvContent = csvData.map((row) => row.join(",")).join("\n")
      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const csvUrl = URL.createObjectURL(csvBlob)
      const csvLink = document.createElement("a")
      csvLink.href = csvUrl
      csvLink.download = `ZOCO-Resumen-${backup.fecha}.csv`
      document.body.appendChild(csvLink)
      csvLink.click()
      document.body.removeChild(csvLink)
      URL.revokeObjectURL(csvUrl)

      alert(`Datos del ${backup.fecha} descargados exitosamente:\n- Archivo JSON completo\n- Archivo CSV resumen`)
    } catch (error) {
      console.error("Error al descargar datos del día:", error)
      alert("Error al descargar los datos del día")
    }
  }

  // NUEVA FUNCIÓN: Calcular totales históricos de todos los backups
  const calcularTotalesHistoricos = () => {
    if (backups.length === 0) {
      return {
        totalDias: 0,
        totalTicketsEmitidos: 0,
        totalTicketsAtendidos: 0,
        totalTicketsPendientes: 0,
        promedioTicketsPorDia: 0,
        promedioAtendidosPorDia: 0,
        eficienciaPromedio: 0,
        mejorDia: null,
        peorDia: null,
        diasConMasActividad: [],
        tendenciaGeneral: "estable",
      }
    }

    const totalDias = backups.length
    const totalTicketsEmitidos = backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0)
    const totalTicketsAtendidos = backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsAtendidos || 0), 0)
    const totalTicketsPendientes = backups.reduce((sum, backup) => sum + (backup.resumen?.ticketsPendientes || 0), 0)

    const promedioTicketsPorDia = Math.round(totalTicketsEmitidos / totalDias)
    const promedioAtendidosPorDia = Math.round(totalTicketsAtendidos / totalDias)
    const eficienciaPromedio =
      totalTicketsEmitidos > 0 ? Math.round((totalTicketsAtendidos / totalTicketsEmitidos) * 100) : 0

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

    // Días con más actividad (top 5)
    const diasConMasActividad = [...backups]
      .sort((a, b) => (b.resumen?.totalTicketsEmitidos || 0) - (a.resumen?.totalTicketsEmitidos || 0))
      .slice(0, 5)

    // Calcular tendencia general (comparar primera mitad vs segunda mitad)
    const mitad = Math.floor(backups.length / 2)
    const primeraMetad = backups.slice(-mitad) // Más recientes
    const segundaMetad = backups.slice(0, mitad) // Más antiguos

    const promedioReciente =
      primeraMetad.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0) / primeraMetad.length
    const promedioAntiguo =
      segundaMetad.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0) / segundaMetad.length

    let tendenciaGeneral = "estable"
    if (promedioReciente > promedioAntiguo * 1.1) tendenciaGeneral = "creciente"
    else if (promedioReciente < promedioAntiguo * 0.9) tendenciaGeneral = "decreciente"

    return {
      totalDias,
      totalTicketsEmitidos,
      totalTicketsAtendidos,
      totalTicketsPendientes,
      promedioTicketsPorDia,
      promedioAtendidosPorDia,
      eficienciaPromedio,
      mejorDia,
      peorDia,
      diasConMasActividad,
      tendenciaGeneral,
    }
  }

  const totalesHistoricos = calcularTotalesHistoricos()

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

        {/* Historial de Días Anteriores MEJORADO */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historial de Días Anteriores
              </div>
              <div className="flex gap-2">
                <Button onClick={cargarBackups} variant="outline" size="sm" disabled={loadingBackups}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingBackups ? "animate-spin" : ""}`} />
                  {loadingBackups ? "Cargando..." : "Actualizar"}
                </Button>
                <Button onClick={crearBackupPrueba} variant="outline" size="sm" disabled={creandoBackupPrueba}>
                  <Plus className={`mr-2 h-4 w-4 ${creandoBackupPrueba ? "animate-spin" : ""}`} />
                  {creandoBackupPrueba ? "Creando..." : "Crear Backup"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBackups ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">Cargando historial de backups...</p>
                <p className="text-sm text-gray-500 mt-2">Esto puede tomar unos momentos</p>
              </div>
            ) : errorBackups ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-xl text-red-600 mb-2">Error al cargar historial</p>
                <p className="text-gray-500 mb-4">{errorBackups}</p>
                <div className="space-y-2">
                  <Button onClick={cargarBackups} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                  <Button onClick={crearBackupPrueba} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Backup de Prueba
                  </Button>
                </div>
              </div>
            ) : backups.length > 0 ? (
              <div className="space-y-4">
                {datosGraficoEvolucion.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-indigo-800 text-lg flex items-center gap-2">
                        <LineChart className="h-6 w-6" />📈 Evolución de los Últimos{" "}
                        {Math.min(datosGraficoEvolucion.length, 30)} Días Activos
                      </h4>
                      <Button
                        onClick={() => setMostrarGraficoEvolucion(!mostrarGraficoEvolucion)}
                        variant="outline"
                        size="sm"
                      >
                        {mostrarGraficoEvolucion ? "Ocultar" : "Mostrar"} Gráfico
                      </Button>
                    </div>

                    {/* Información del horario de atención */}
                    <div className="bg-white p-3 rounded-lg border border-indigo-200 mb-4">
                      <p className="text-sm text-indigo-700">
                        <Clock className="inline h-4 w-4 mr-1" />
                        <strong>Horario de atención:</strong> 9:30 - 12:30 y 15:00 - 20:00 (Lunes a Sábado)
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        Las métricas mostradas corresponden solo a los días con actividad registrada
                      </p>
                    </div>

                    {mostrarGraficoEvolucion && (
                      <div className="bg-white p-4 rounded-lg">
                        {/* Gráfico de Tickets Emitidos y Atendidos */}
                        <div className="mb-6">
                          <h5 className="font-semibold text-gray-700 mb-3 text-center">
                            Tickets Emitidos vs Atendidos
                          </h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsLineChart data={datosGraficoEvolucion}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis
                                dataKey="fechaCorta"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #ccc",
                                  borderRadius: "8px",
                                  padding: "10px",
                                }}
                                labelFormatter={(label) => {
                                  const dato = datosGraficoEvolucion.find((d) => d.fechaCorta === label)
                                  return dato ? `${dato.diaSemana} ${dato.fecha}` : label
                                }}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="emitidos"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Tickets Emitidos"
                                dot={{ fill: "#3b82f6", r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="atendidos"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Tickets Atendidos"
                                dot={{ fill: "#10b981", r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Gráfico de Eficiencia */}
                        <div className="mb-6">
                          <h5 className="font-semibold text-gray-700 mb-3 text-center">Eficiencia Diaria (%)</h5>
                          <ResponsiveContainer width="100%" height={250}>
                            <RechartsLineChart data={datosGraficoEvolucion}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis
                                dataKey="fechaCorta"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                domain={[0, 100]}
                                label={{ value: "%", angle: -90, position: "insideLeft" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #ccc",
                                  borderRadius: "8px",
                                  padding: "10px",
                                }}
                                labelFormatter={(label) => {
                                  const dato = datosGraficoEvolucion.find((d) => d.fechaCorta === label)
                                  return dato ? `${dato.diaSemana} ${dato.fecha}` : label
                                }}
                                formatter={(value: number) => [`${value}%`, "Eficiencia"]}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="eficiencia"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                name="Eficiencia"
                                dot={{ fill: "#8b5cf6", r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Gráfico de Tiempo de Espera Real */}
                        <div>
                          <h5 className="font-semibold text-gray-700 mb-3 text-center">
                            Tiempo de Espera Real Promedio (minutos)
                          </h5>
                          <ResponsiveContainer width="100%" height={250}>
                            <RechartsLineChart data={datosGraficoEvolucion}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis
                                dataKey="fechaCorta"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                label={{ value: "min", angle: -90, position: "insideLeft" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #ccc",
                                  borderRadius: "8px",
                                  padding: "10px",
                                }}
                                labelFormatter={(label) => {
                                  const dato = datosGraficoEvolucion.find((d) => d.fechaCorta === label)
                                  return dato ? `${dato.diaSemana} ${dato.fecha}` : label
                                }}
                                formatter={(value: number) => [`${value} min`, "Tiempo Espera"]}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="tiempoEsperaReal"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                name="Tiempo Espera Real"
                                dot={{ fill: "#f59e0b", r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Estadísticas del período */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {Math.round(
                                datosGraficoEvolucion.reduce((sum, d) => sum + d.emitidos, 0) /
                                  datosGraficoEvolucion.length,
                              )}
                            </div>
                            <p className="text-xs text-blue-700">Promedio Emitidos/Día</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round(
                                datosGraficoEvolucion.reduce((sum, d) => sum + d.atendidos, 0) /
                                  datosGraficoEvolucion.length,
                              )}
                            </div>
                            <p className="text-xs text-green-700">Promedio Atendidos/Día</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {Math.round(
                                datosGraficoEvolucion.reduce((sum, d) => sum + d.eficiencia, 0) /
                                  datosGraficoEvolucion.length,
                              )}
                              %
                            </div>
                            <p className="text-xs text-purple-700">Eficiencia Promedio</p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {Math.round(
                                (datosGraficoEvolucion.reduce((sum, d) => sum + d.tiempoEsperaReal, 0) /
                                  datosGraficoEvolucion.length) *
                                  10,
                              ) / 10}
                            </div>
                            <p className="text-xs text-orange-700">Espera Promedio (min)</p>
                          </div>
                        </div>

                        {/* Análisis de tendencia */}
                        <div className="mt-4 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
                          <h5 className="font-semibold text-cyan-800 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Análisis de Tendencia
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-cyan-700 font-medium">Mejor día:</span>
                              <p className="text-cyan-900 font-bold">
                                {datosGraficoEvolucion.reduce((max, d) => (d.emitidos > max.emitidos ? d : max)).fecha}{" "}
                                (
                                {
                                  datosGraficoEvolucion.reduce((max, d) => (d.emitidos > max.emitidos ? d : max))
                                    .emitidos
                                }{" "}
                                tickets)
                              </p>
                            </div>
                            <div>
                              <span className="text-cyan-700 font-medium">Mayor eficiencia:</span>
                              <p className="text-cyan-900 font-bold">
                                {
                                  datosGraficoEvolucion.reduce((max, d) => (d.eficiencia > max.eficiencia ? d : max))
                                    .fecha
                                }{" "}
                                (
                                {
                                  datosGraficoEvolucion.reduce((max, d) => (d.eficiencia > max.eficiencia ? d : max))
                                    .eficiencia
                                }
                                %)
                              </p>
                            </div>
                            <div>
                              <span className="text-cyan-700 font-medium">Menor espera:</span>
                              <p className="text-cyan-900 font-bold">
                                {
                                  datosGraficoEvolucion
                                    .filter((d) => d.tiempoEsperaReal > 0)
                                    .reduce(
                                      (min, d) => (d.tiempoEsperaReal < min.tiempoEsperaReal ? d : min),
                                      datosGraficoEvolucion[0],
                                    ).fecha
                                }{" "}
                                (
                                {
                                  datosGraficoEvolucion
                                    .filter((d) => d.tiempoEsperaReal > 0)
                                    .reduce(
                                      (min, d) => (d.tiempoEsperaReal < min.tiempoEsperaReal ? d : min),
                                      datosGraficoEvolucion[0],
                                    ).tiempoEsperaReal
                                }{" "}
                                min)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen del historial */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3">📊 Resumen del Historial</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{backups.length}</div>
                      <p className="text-blue-700">Días registrados</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(
                          backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0) /
                            backups.length,
                        )}
                      </div>
                      <p className="text-green-700">Promedio tickets/día</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.max(...backups.map((backup) => backup.resumen?.totalTicketsEmitidos || 0))}
                      </div>
                      <p className="text-orange-700">Día más activo</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(
                          backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsAtendidos || 0), 0) /
                            backups.length,
                        )}
                      </div>
                      <p className="text-purple-700">Promedio atendidos/día</p>
                    </div>
                  </div>
                </div>

                {/* Lista de días con métricas MEJORADA */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {backups.map((backup, index) => {
                    const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                    const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                    const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0
                    const pendientes = emitidos - atendidos
                    const esReciente = index < 3
                    const esMejorDia =
                      emitidos === Math.max(...backups.map((b) => b.resumen?.totalTicketsEmitidos || 0))

                    // NUEVAS MÉTRICAS SOLICITADAS
                    const tiempoEsperaReal = backup.resumen?.tiempoPromedioEsperaReal || 0
                    const horaPico = backup.resumen?.horaPico || { hora: 0, cantidad: 0, porcentaje: 0 }

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                          esMejorDia
                            ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300"
                            : esReciente
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
                              : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4
                              className={`font-bold text-lg ${
                                esMejorDia ? "text-yellow-800" : esReciente ? "text-blue-800" : "text-gray-800"
                              }`}
                            >
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
                          {esMejorDia && (
                            <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              🏆 RÉCORD
                            </div>
                          )}
                          {esReciente && !esMejorDia && (
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

                        {/* Botones de acción mejorados */}
                        <div className="space-y-2">
                          <Button
                            onClick={() => verBackup(backup.fecha)}
                            variant="outline"
                            size="sm"
                            className="w-full hover:bg-blue-50"
                          >
                            👁️ Ver Detalles Completos
                          </Button>

                          {/* Botones de descarga mejorados */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => descargarDatosDia(backup)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              size="sm"
                            >
                              📄 Descargar JSON
                            </Button>
                            <Button
                              onClick={() => descargarDatosDia(backup)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              size="sm"
                            >
                              📊 Descargar CSV
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Comparativa con día actual */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3">📈 Comparativa con Hoy</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{estado.totalAtendidos}</div>
                      <p className="text-green-700">Tickets hoy</p>
                      <p className="text-xs text-green-600">
                        vs promedio:{" "}
                        {estado.totalAtendidos >
                        Math.round(
                          backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsEmitidos || 0), 0) /
                            backups.length,
                        )
                          ? "↗️"
                          : "↘️"}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{estado.numerosLlamados}</div>
                      <p className="text-blue-700">Atendidos hoy</p>
                      <p className="text-xs text-blue-600">
                        vs promedio:{" "}
                        {estado.numerosLlamados >
                        Math.round(
                          backups.reduce((sum, backup) => sum + (backup.resumen?.totalTicketsAtendidos || 0), 0) /
                            backups.length,
                        )
                          ? "↗️"
                          : "↘️"}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        {Math.round((estado.numerosLlamados / Math.max(estado.totalAtendidos, 1)) * 100)}%
                      </div>
                      <p className="text-orange-700">Eficiencia hoy</p>
                      <p className="text-xs text-orange-600">
                        vs promedio:{" "}
                        {Math.round((estado.numerosLlamados / Math.max(estado.totalAtendidos, 1)) * 100) >
                        Math.round(
                          backups.reduce(
                            (sum, backup) =>
                              sum +
                              ((backup.resumen?.totalTicketsAtendidos || 0) /
                                Math.max(backup.resumen?.totalTicketsEmitidos || 1, 1)) *
                                100,
                            0,
                          ) / backups.length,
                        )
                          ? "↗️"
                          : "↘️"}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {new Date().getHours() > 0
                          ? Math.round(estado.totalAtendidos / new Date().getHours())
                          : estado.totalAtendidos}
                      </div>
                      <p className="text-purple-700">Tickets/hora hoy</p>
                      <p className="text-xs text-purple-600">Ritmo actual</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-xl text-gray-500 mb-2">No hay historial disponible</p>
                <p className="text-gray-400 mb-4">
                  Los backups aparecerán aquí después del primer día de operación o cuando se cree un backup manual
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 ¿Por qué no veo días anteriores?</h4>
                  <ul className="text-sm text-blue-700 text-left space-y-1">
                    <li>• Los backups se crean automáticamente al final del día</li>
                    <li>• También se crean al reiniciar el contador diario</li>
                    <li>• Puedes crear un backup manual con el botón "Crear Backup"</li>
                    <li>• Los datos aparecerán a partir de mañana si el sistema es nuevo</li>
                  </ul>
                </div>
                <Button onClick={crearBackupPrueba} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Backup del Día Actual
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NUEVA SECCIÓN: Totales Históricos Consolidados */}
        {backups.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center justify-between text-emerald-800">
                <div className="flex items-center gap-2">
                  <Archive className="h-6 w-6" />📊 Totales Históricos Consolidados
                </div>
                <Button
                  onClick={exportarDatos}
                  disabled={descargandoTodos}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {descargandoTodos ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Datos
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Resumen de totales históricos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{totalesHistoricos.totalDias}</div>
                  <p className="text-sm font-semibold text-blue-800">Días Operativos</p>
                  <p className="text-xs text-blue-600">Registrados en historial</p>
                </div>

                <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {totalesHistoricos.totalTicketsEmitidos.toLocaleString()}
                  </div>
                  <p className="text-sm font-semibold text-green-800">Total Tickets Emitidos</p>
                  <p className="text-xs text-green-600">En todo el historial</p>
                </div>

                <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {totalesHistoricos.totalTicketsAtendidos.toLocaleString()}
                  </div>
                  <p className="text-sm font-semibold text-orange-800">Total Tickets Atendidos</p>
                  <p className="text-xs text-orange-600">Procesados históricamente</p>
                </div>

                <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{totalesHistoricos.eficienciaPromedio}%</div>
                  <p className="text-sm font-semibold text-purple-800">Eficiencia Promedio</p>
                  <p className="text-xs text-purple-600">Histórica general</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="text-gray-700 mb-4">¿Está seguro de que desea reiniciar el contador diario?</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    📦 <strong>Backup automático:</strong> Los datos actuales se respaldarán automáticamente antes del
                    reinicio y aparecerán en el historial de días anteriores.
                  </p>
                </div>
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
                    {procesandoAccion ? "Reiniciando..." : "Reiniciar con Backup"}
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
            <p>Develop by: Karim :) | Versión 7.0 | Panel Admin con Reinicio de Contador</p>
            <p>Actualización inteligente cada 120s | Cache compartido entre páginas</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
