"use client"

import { useState, useEffect } from "react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

interface BackupInfo {
  fecha: string
  resumen: {
    totalTicketsEmitidos: number
    totalTicketsAtendidos: number
    ticketsPendientes: number
    eficienciaDiaria: number
    primerTicket: number
    ultimoTicket: number
  }
  createdAt: string
}

export default function AdminPage() {
  const {
    estado,
    estadisticas,
    loading: loadingSistemaEstado,
    error: errorSistemaEstado,
    cargarEstado,
    ultimaSincronizacion,
    obtenerBackups,
    obtenerBackup,
    isClient,
    cacheStats,
    invalidateCache,
  } = useSistemaEstado("admin")
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [backupSeleccionado, setBackupSeleccionado] = useState<any>(null)
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [mostrarMetricasAvanzadas, setMostrarMetricasAvanzadas] = useState(false)
  const [descargandoTodos, setDescargandoTodos] = useState(false)

  // Cargar backups
  useEffect(() => {
    const cargarBackupsData = async () => {
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

    cargarBackupsData()
  }, [])

  useEffect(() => {
    if (isClient) {
      cargarDatosAdmin()
      cargarBackupsInicial()
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

  const cargarBackupsInicial = async () => {
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

    // 10. Métricas de rendimiento del sistema
    const metricsRendimiento = {
      cacheHitRate: cacheStats.entries.filter((e) => e.fresh).length / Math.max(cacheStats.entries.length, 1),
      tiempoRespuestaPromedio: ultimaSincronizacion ? Date.now() - ultimaSincronizacion.getTime() : 0,
      disponibilidadSistema: errorSistemaEstado ? 0.95 : 1.0,
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
          version: "5.1",
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

  // NUEVA FUNCIÓN: Descargar backup completo JSON
  const descargarBackupCompleto = async (backup: any) => {
    try {
      const backupCompleto = await obtenerBackup(backup.fecha)

      if (!backupCompleto) {
        alert("No se pudieron obtener los datos completos del día")
        return
      }

      const datosCompletos = {
        // INFORMACIÓN DEL DÍA
        fecha: backup.fecha,
        fechaFormateada: new Date(backup.fecha).toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),

        // RESUMEN EJECUTIVO
        resumenEjecutivo: {
          ticketsEmitidos: backupCompleto.resumen?.totalTicketsEmitidos || 0,
          ticketsAtendidos: backupCompleto.resumen?.totalTicketsAtendidos || 0,
          ticketsPendientes: backupCompleto.resumen?.ticketsPendientes || 0,
          eficienciaDiaria: backupCompleto.resumen?.eficienciaDiaria || 0,
          tiempoPromedioEspera: backupCompleto.resumen?.tiempoPromedioEsperaReal || 0,
          horaPico: backupCompleto.resumen?.horaPico || { hora: 0, cantidad: 0 },
          rangoTickets: {
            primero: backupCompleto.resumen?.primerTicket || 0,
            ultimo: backupCompleto.resumen?.ultimoTicket || 0,
          },
        },

        // ANÁLISIS TEMPORAL DETALLADO
        analisisTemporal: {
          distribucionPorHora: backupCompleto.resumen?.distribucionPorHora || {},
          velocidadAtencion: backupCompleto.resumen?.velocidadAtencion || 0,
          tiempoEntreTickets: backupCompleto.resumen?.tiempoEntreTickets || 0,
          horasPico: backupCompleto.datosDetallados?.analisisTemporal?.horasPico || [],
          horasMinimas: backupCompleto.datosDetallados?.analisisTemporal?.horasMinimas || [],
        },

        // ESTADÍSTICAS DE CLIENTES
        estadisticasClientes: {
          nombresComunes: backupCompleto.resumen?.nombresComunes || [],
          nombresUnicos: backupCompleto.datosDetallados?.estadisticasClientes?.nombresUnicos || 0,
          clientesRecurrentes: backupCompleto.datosDetallados?.estadisticasClientes?.clientesRecurrentes || 0,
          promedioCaracteresPorNombre:
            backupCompleto.datosDetallados?.estadisticasClientes?.promedioCaracteresPorNombre || 0,
        },

        // TICKETS COMPLETOS
        ticketsCompletos: backupCompleto.tickets || [],

        // MÉTRICAS DE RENDIMIENTO
        rendimiento: backupCompleto.datosDetallados?.rendimiento || {},

        // METADATOS
        metadatos: {
          fechaDescarga: new Date().toISOString(),
          version: "5.2",
          sistema: "TURNOS_ZOCO",
          tipoDescarga: "Backup Completo JSON",
          generadoPor: "Panel de Administración",
        },
      }

      const blob = new Blob([JSON.stringify(datosCompletos, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ZOCO-BackupCompleto-${backup.fecha}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert(`✅ Backup completo descargado: ${backup.fecha}`)
    } catch (error) {
      console.error("Error al descargar backup completo:", error)
      alert("❌ Error al descargar el backup completo")
    }
  }

  // NUEVA FUNCIÓN: Descargar backup CSV
  const descargarBackupCSV = async (backup: any) => {
    try {
      const backupCompleto = await obtenerBackup(backup.fecha)

      if (!backupCompleto) {
        alert("No se pudieron obtener los datos completos del día")
        return
      }

      // Datos principales del día
      const csvData = [
        // ENCABEZADOS PRINCIPALES
        ["=== RESUMEN DEL DÍA ==="],
        ["Fecha", backup.fecha],
        ["Día de la Semana", new Date(backup.fecha).toLocaleDateString("es-AR", { weekday: "long" })],
        ["Tickets Emitidos", backupCompleto.resumen?.totalTicketsEmitidos || 0],
        ["Tickets Atendidos", backupCompleto.resumen?.totalTicketsAtendidos || 0],
        ["Tickets Pendientes", backupCompleto.resumen?.ticketsPendientes || 0],
        ["Eficiencia (%)", backupCompleto.resumen?.eficienciaDiaria || 0],
        ["Tiempo Promedio Espera (min)", backupCompleto.resumen?.tiempoPromedioEsperaReal || 0],
        ["Hora Pico", `${backupCompleto.resumen?.horaPico?.hora || 0}:00`],
        ["Tickets en Hora Pico", backupCompleto.resumen?.horaPico?.cantidad || 0],
        ["Primer Ticket", backupCompleto.resumen?.primerTicket || 0],
        ["Último Ticket", backupCompleto.resumen?.ultimoTicket || 0],
        [""],

        // DISTRIBUCIÓN POR HORA
        ["=== DISTRIBUCIÓN POR HORA ==="],
        ["Hora", "Cantidad de Tickets", "Porcentaje del Total"],
        ...Object.entries(backupCompleto.resumen?.distribucionPorHora || {}).map(([hora, cantidad]) => [
          `${hora}:00 - ${Number.parseInt(hora) + 1}:00`,
          cantidad,
          `${Math.round((cantidad / (backupCompleto.resumen?.totalTicketsEmitidos || 1)) * 100)}%`,
        ]),
        [""],

        // NOMBRES MÁS COMUNES
        ["=== TOP 10 NOMBRES MÁS COMUNES ==="],
        ["Posición", "Nombre", "Cantidad", "Porcentaje"],
        ...(backupCompleto.resumen?.nombresComunes || [])
          .slice(0, 10)
          .map(([nombre, cantidad], index) => [
            index + 1,
            nombre,
            cantidad,
            `${Math.round((cantidad / (backupCompleto.resumen?.totalTicketsEmitidos || 1)) * 100)}%`,
          ]),
        [""],

        // TICKETS INDIVIDUALES (si hay pocos)
        ...(backupCompleto.tickets && backupCompleto.tickets.length <= 100
          ? [
              ["=== TICKETS INDIVIDUALES ==="],
              ["Número", "Nombre", "Fecha/Hora", "Estado"],
              ...backupCompleto.tickets.map((ticket) => [
                ticket.numero,
                ticket.nombre,
                new Date(ticket.timestamp || ticket.fecha).toLocaleString("es-AR"),
                ticket.atendido ? "Atendido" : "Pendiente",
              ]),
            ]
          : [
              ["=== TICKETS INDIVIDUALES ==="],
              ["Demasiados tickets para mostrar individualmente"],
              [`Total de tickets: ${backupCompleto.tickets.length}`],
            ]),
      ]

      const csvContent = csvData.map((row) => (Array.isArray(row) ? row.join(",") : row)).join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ZOCO-Resumen-${backup.fecha}.csv`
      document.body.appendChild(link)
      csvLink.click()
      document.body.removeChild(csvLink)
      URL.revokeObjectURL(url)

      alert(`✅ Resumen CSV descargado: ${backup.fecha}`)
    } catch (error) {
      console.error("Error al descargar CSV:", error)
      alert("❌ Error al descargar el resumen CSV")
    }
  }

  // NUEVA FUNCIÓN: Descargar backup raw (original)
  const descargarBackupRaw = async (backup: any) => {
    try {
      const backupCompleto = await obtenerBackup(backup.fecha)

      if (!backupCompleto) {
        alert("No se pudieron obtener los datos del backup original")
        return
      }

      // Descargar el backup exactamente como está almacenado
      const blob = new Blob([JSON.stringify(backupCompleto, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ZOCO-BackupRaw-${backup.fecha}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert(`✅ Backup original descargado: ${backup.fecha}`)
    } catch (error) {
      console.error("Error al descargar backup raw:", error)
      alert("❌ Error al descargar el backup original")
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

  // NUEVA FUNCIÓN: Descargar todos los datos históricos
  const descargarTodosLosDatos = async () => {
    setDescargandoTodos(true)
    try {
      console.log("🔄 Iniciando descarga de todos los datos históricos...")

      // Obtener todos los backups completos
      const backupsCompletos = []
      for (const backup of backups) {
        try {
          const backupCompleto = await obtenerBackup(backup.fecha)
          if (backupCompleto) {
            backupsCompletos.push(backupCompleto)
          }
        } catch (error) {
          console.error(`Error al obtener backup de ${backup.fecha}:`, error)
        }
      }

      const totalesHistoricos = calcularTotalesHistoricos()

      // Preparar datos consolidados
      const datosConsolidados = {
        // METADATOS
        metadatos: {
          fechaDescarga: new Date().toISOString(),
          version: "5.1",
          sistema: "TURNOS_ZOCO",
          generadoPor: "Panel de Administración - Descarga Completa",
          totalDiasIncluidos: backupsCompletos.length,
          rangoFechas: {
            desde: backups[backups.length - 1]?.fecha || "N/A",
            hasta: backups[0]?.fecha || "N/A",
          },
        },

        // TOTALES HISTÓRICOS CONSOLIDADOS
        totalesHistoricos: {
          resumenGeneral: {
            totalDiasOperativos: totalesHistoricos.totalDias,
            totalTicketsEmitidos: totalesHistoricos.totalTicketsEmitidos,
            totalTicketsAtendidos: totalesHistoricos.totalTicketsAtendidos,
            totalTicketsPendientes: totalesHistoricos.totalTicketsPendientes,
            promedioTicketsPorDia: totalesHistoricos.promedioTicketsPorDia,
            promedioAtendidosPorDia: totalesHistoricos.promedioAtendidosPorDia,
            eficienciaPromedioGeneral: totalesHistoricos.eficienciaPromedio,
            tendenciaGeneral: totalesHistoricos.tendenciaGeneral,
          },
          recordsYExtremos: {
            mejorDia: {
              fecha: totalesHistoricos.mejorDia?.fecha || "N/A",
              ticketsEmitidos: totalesHistoricos.mejorDia?.resumen?.totalTicketsEmitidos || 0,
              eficiencia: totalesHistoricos.mejorDia?.resumen?.eficienciaDiaria || 0,
            },
            peorDia: {
              fecha: totalesHistoricos.peorDia?.fecha || "N/A",
              ticketsEmitidos: totalesHistoricos.peorDia?.resumen?.totalTicketsEmitidos || 0,
              eficiencia: totalesHistoricos.peorDia?.resumen?.eficienciaDiaria || 0,
            },
            top5DiasActividad: totalesHistoricos.diasConMasActividad.map((dia) => ({
              fecha: dia.fecha,
              ticketsEmitidos: dia.resumen?.totalTicketsEmitidos || 0,
              ticketsAtendidos: dia.resumen?.totalTicketsAtendidos || 0,
              eficiencia: dia.resumen?.eficienciaDiaria || 0,
            })),
          },
        },

        // ANÁLISIS TEMPORAL CONSOLIDADO
        analisisTemporalConsolidado: {
          distribucionPorDiaSemana: {},
          horasPicoGlobales: {},
          tendenciasMensuales: {},
          patronesEstacionales: {},
        },

        // DATOS DETALLADOS POR DÍA
        datosPorDia: backupsCompletos.map((backup) => ({
          fecha: backup.fecha,
          fechaFormateada: new Date(backup.fecha).toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          resumen: backup.resumen || {},
          analisisTemporal: backup.datosDetallados?.analisisTemporal || {},
          estadisticasClientes: backup.datosDetallados?.estadisticasClientes || {},
          rendimiento: backup.datosDetallados?.rendimiento || {},
          ticketsCompletos: backup.tickets || [],
        })),

        // ESTADO ACTUAL (HOY)
        estadoActual: {
          fecha: new Date().toISOString().split("T")[0],
          estado: estado,
          estadisticas: estadisticas,
          metricasAvanzadas: calcularMetricasAvanzadas(),
        },
      }

      // Calcular análisis temporal consolidado
      backupsCompletos.forEach((backup) => {
        const fecha = new Date(backup.fecha)
        const diaSemana = fecha.toLocaleDateString("es-AR", { weekday: "long" })
        const mes = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" })

        // Distribución por día de la semana
        if (!datosConsolidados.analisisTemporalConsolidado.distribucionPorDiaSemana[diaSemana]) {
          datosConsolidados.analisisTemporalConsolidado.distribucionPorDiaSemana[diaSemana] = {
            totalTickets: 0,
            totalDias: 0,
            promedio: 0,
          }
        }
        datosConsolidados.analisisTemporalConsolidado.distribucionPorDiaSemana[diaSemana].totalTickets +=
          backup.resumen?.totalTicketsEmitidos || 0
        datosConsolidados.analisisTemporalConsolidado.distribucionPorDiaSemana[diaSemana].totalDias += 1

        // Tendencias mensuales
        if (!datosConsolidados.analisisTemporalConsolidado.tendenciasMensuales[mes]) {
          datosConsolidados.analisisTemporalConsolidado.tendenciasMensuales[mes] = {
            totalTickets: 0,
            totalDias: 0,
            promedio: 0,
          }
        }
        datosConsolidados.analisisTemporalConsolidado.tendenciasMensuales[mes].totalTickets +=
          backup.resumen?.totalTicketsEmitidos || 0
        datosConsolidados.analisisTemporalConsolidado.tendenciasMensuales[mes].totalDias += 1

        // Horas pico globales
        if (backup.resumen?.distribucionPorHora) {
          Object.entries(backup.resumen.distribucionPorHora).forEach(([hora, cantidad]) => {
            if (!datosConsolidados.analisisTemporalConsolidado.horasPicoGlobales[hora]) {
              datosConsolidados.analisisTemporalConsolidado.horasPicoGlobales[hora] = 0
            }
            datosConsolidados.analisisTemporalConsolidado.horasPicoGlobales[hora] += cantidad
          })
        }
      })

      // Calcular promedios
      Object.keys(datosConsolidados.analisisTemporalConsolidado.distribucionPorDiaSemana).forEach((dia) => {
        const data = datosConsolidados.analisisTemporalConsolidado.distribucionPorDiaSemana[dia]
        data.promedio = Math.round(data.totalTickets / data.totalDias)
      })

      Object.keys(datosConsolidados.analisisTemporalConsolidado.tendenciasMensuales).forEach((mes) => {
        const data = datosConsolidados.analisisTemporalConsolidado.tendenciasMensuales[mes]
        data.promedio = Math.round(data.totalTickets / data.totalDias)
      })

      // Crear archivo JSON completo
      const jsonBlob = new Blob([JSON.stringify(datosConsolidados, null, 2)], {
        type: "application/json",
      })
      const jsonUrl = URL.createObjectURL(jsonBlob)
      const jsonLink = document.createElement("a")
      jsonLink.href = jsonUrl
      jsonLink.download = `ZOCO-HistorialCompleto-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(jsonLink)
      jsonLink.click()
      document.body.removeChild(jsonLink)
      URL.revokeObjectURL(jsonUrl)

      // Crear archivo CSV consolidado
      const csvData = [
        // Encabezados
        [
          "Fecha",
          "Día Semana",
          "Tickets Emitidos",
          "Tickets Atendidos",
          "Tickets Pendientes",
          "Eficiencia (%)",
          "Tiempo Promedio Espera (min)",
          "Hora Pico",
          "Tickets en Hora Pico",
          "Velocidad Atención",
          "Tiempo Entre Tickets",
          "Nombres Únicos",
          "Clientes Recurrentes",
        ],
        // Datos de cada día
        ...datosConsolidados.datosPorDia.map((dia) => [
          dia.fecha,
          new Date(dia.fecha).toLocaleDateString("es-AR", { weekday: "long" }),
          dia.resumen.totalTicketsEmitidos || 0,
          dia.resumen.totalTicketsAtendidos || 0,
          dia.resumen.ticketsPendientes || 0,
          dia.resumen.eficienciaDiaria || 0,
          dia.resumen.tiempoPromedioEsperaReal || 0,
          dia.resumen.horaPico?.hora || 0,
          dia.resumen.horaPico?.cantidad || 0,
          dia.resumen.velocidadAtencion || 0,
          dia.resumen.tiempoEntreTickets || 0,
          dia.estadisticasClientes.nombresUnicos || 0,
          dia.estadisticasClientes.clientesRecurrentes || 0,
        ]),
      ]

      const csvContent = csvData.map((row) => row.join(",")).join("\n")
      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const csvUrl = URL.createObjectURL(csvBlob)
      const csvLink = document.createElement("a")
      csvLink.href = csvUrl
      csvLink.download = `ZOCO-HistorialConsolidado-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(csvLink)
      csvLink.click()
      document.body.removeChild(csvLink)
      URL.revokeObjectURL(csvUrl)

      alert(
        `✅ Descarga completa exitosa!\n\n📊 Datos incluidos:\n- ${backupsCompletos.length} días de historial\n- ${totalesHistoricos.totalTicketsEmitidos} tickets totales\n- Análisis temporal consolidado\n- Tendencias y patrones\n\n📁 Archivos generados:\n- JSON completo con todos los detalles\n- CSV consolidado para análisis`,
      )
    } catch (error) {
      console.error("Error al descargar todos los datos:", error)
      alert("❌ Error al descargar los datos históricos completos")
    } finally {
      setDescargandoTodos(false)
    }
  }

  // Verificar salud del sistema
  useEffect(() => {
    const verificarSalud = async () => {
      try {
        const response = await fetch("/api/health")
        const data = await response.json()
        setSystemHealth(data)
      } catch (error) {
        console.error("Error al verificar salud del sistema:", error)
      }
    }

    verificarSalud()
    const interval = setInterval(verificarSalud, 60000) // Cada minuto
    return () => clearInterval(interval)
  }, [])

  const handleCrearBackup = async () => {
    try {
      const response = await fetch("/api/backup", { method: "POST" })
      const data = await response.json()

      if (data.success) {
        alert("Backup creado exitosamente")
        // Recargar backups
        window.location.reload()
      } else {
        alert("Error al crear backup: " + data.error)
      }
    } catch (error) {
      alert("Error al crear backup")
    }
  }

  const handleReiniciarSistema = async () => {
    if (confirm("¿Estás seguro de que quieres reiniciar el sistema? Esto eliminará todos los datos del día actual.")) {
      const success = await reiniciarContador()
      if (success) {
        alert("Sistema reiniciado exitosamente")
      } else {
        alert("Error al reiniciar el sistema")
      }
    }
  }

  const handleEliminarTodos = async () => {
    if (confirm("¿Estás seguro de que quieres eliminar TODOS los registros? Esta acción no se puede deshacer.")) {
      if (confirm("CONFIRMACIÓN FINAL: Se eliminarán todos los datos históricos. ¿Continuar?")) {
        try {
          const response = await fetch("/api/sistema", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "eliminar_todos" }),
          })

          const data = await response.json()
          if (data.success) {
            alert("Todos los registros han sido eliminados")
            window.location.reload()
          } else {
            alert("Error al eliminar registros: " + data.error)
          }
        } catch (error) {
          alert("Error al eliminar registros")
        }
      }
    }
  }

  const totalesHistoricos = calcularTotalesHistoricos()

  if (loadingSistemaEstado || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de administración (Cache Optimizado)...</p>
        </div>
      </div>
    )
  }

  const ticketsPendientes = estado.totalAtendidos - estado.numerosLlamados
  const eficiencia = estado.totalAtendidos > 0 ? Math.round((estado.numerosLlamados / estado.totalAtendidos) * 100) : 0

  return (
    
      
        
          
            
              
                
                  
                    Panel
  de
  Administración
  Gestión
  y
  monitoreo
  del
  sistema

  \
                \
  systemHealth && (\
  systemHealth.status === 'healthy' ? (
                        <> Sistema OK</>
                      ) : (\
                        <> Sistema
  con
  problemas
  </>
      )

  )
  \
              \
            
          
        \
\
        
          
            \
              
                
                  
                    Resumen
                  
                
                
                  
                    Backups
                  
                
                
                  
                    Salud del Sistema
                  
                
                
                  
                    Configuración

  Total
  Emitidos
  estado.totalAtendidos

  \
                  
                

                
                  
                    
                      Atendidos
  estado.numerosLlamados

  En
  Espera
  ticketsPendientes

  \
                

                
                  
                    
                      Eficiencia
  eficiencia
  %
                    
                    
                  
                
              
\

  Historial
  de
  Días
  Anteriores
  loadingBackups ? (
                    \
                      
                        
                      
                      Cargando
  historial
  ...

    ) : backups.length > 0 ? (
                    \
  backups.slice(0, 7).map((backup) => (\
                        
                          
                            
                              
                              
                                {new Date(backup.fecha).toLocaleDateString('es-AR', {
                                  weekday: 'long',\
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'\
                                })}
                              
                              {backup.resumen.totalTicketsEmitidos} tickets emitidos, {backup.resumen.totalTicketsAtendidos} atendidos\
                            \
                          \
                          \
                            
                              {backup.resumen.eficienciaDiaria}% eficiencia
                            
                          \
                        
                      )
  )

  ) : (
                    
                      \
                        \
                        \
                      
                      No hay historial disponible
                    
                  )

  Gestión
  de
  Backups

  \
                        Crear Backup Manual
                      
                    

                    
                      
                        Backups Disponibles
  loadingBackups ? (
                          
                            
                          
                        ) : backups.length > 0 ? (
                          
                            {backups.map((backup) => (
                              
                                \
  backup.fecha
  backup.resumen.totalTicketsEmitidos
  tickets
  new Date(backup.createdAt).toLocaleDateString("es-AR")

  ))

  ) : (
                          No hay backups disponibles\
                        )
}
\

{
  /* Tab: Salud del Sistema */
}

Estado
del
Sistema

{
  systemHealth ? (
                    \
                      
                        {systemHealth.status === 'healthy' ? (
                          
                        ) : (
                          
                        )}
  systemHealth.status === "healthy" ? "Saludable" : "Con problemas"
  JSON.stringify(systemHealth.details, null, 2)

  ) : (
                    
                      
                        
                        
                      
                      Verificando salud del sistema...
                    
                  )
}

{
  /* Tab: Configuración */
}

Acciones
del
Sistema

Reiniciar
Contador
Diario

Eliminar
Todos
los
Registros

Información
del
Sistema

Versión: 5.2

Fecha
de
{
  new Date(estado.fechaInicio).toLocaleDateString("es-AR")
}

Último
{
  new Date(estado.ultimoReinicio).toLocaleString("es-AR")
}

Estado: Activo

{
  /* Modales existentes... */
}
{
  mostrarConfirmacionEliminar && (
          
            
              
                
                  
                    
                      Confirmar
  Eliminación

  ¿Está seguro de que desea eliminar TODOS los registros del sistema? Esta acción es permanente y no se
                    puede deshacer.
                  
                  
                    
                      
                        Cancelar
  procesandoAccion ? "Eliminando..." : "Eliminar Todo"

  )
}

{
  mostrarConfirmacionReinicio && (
          
            
              
                
                  
                    
                      Confirmar
  Reinicio

  ¿Está seguro de que desea reiniciar el contador diario? Los datos actuales se respaldarán
                    automáticamente.
                  
                  
                    
                      
                        Cancelar
  procesandoAccion ? "Reiniciando..." : "Reiniciar"

  )
}

{
  backupSeleccionado && (
          
            
              
                
                  
                    
                      Backup
  del
  backupSeleccionado.fecha

  ✕
  backupSeleccionado.resumen && (
                        
                          
                            
                              Tickets
  backupSeleccionado.resumen.totalTicketsEmitidos

  Tickets
  backupSeleccionado.resumen.totalTicketsAtendidos

  Primer
  ticket: #
  backupSeleccionado.resumen.primerTicket

  Último
  ticket: #
  backupSeleccionado.resumen.ultimoTicket

  )

  )
}

{
  /* Footer */
}

Develop
by: Karim :
) | Versión 5.2 | Historial Consolidado + Descarga Masiva
              Actualización inteligente cada 120s | Cache compartido entre páginas
            
          
        
      
    
  )
}
