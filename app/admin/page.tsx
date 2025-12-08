"use client"

import { useState, useEffect, useMemo } from "react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import styles from "./page.module.css"

export const dynamic = "force-dynamic"

type FilterPeriod = "hoy" | "ayer" | "7days" | "30days" | "all" // Added "hoy" and "ayer" filter options

export default function PaginaAdmin() {
  const { estado, loading, error, reiniciarContador, recargar } = useSistemaEstado()
  const [isClient, setIsClient] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [vistaActual, setVistaActual] = useState<"resumen" | "historial" | "metricas">("resumen")
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("30days") // Changed default to "30days"
  const [selectedMonth, setSelectedMonth] = useState<string>("")

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

  const descargarHistorial = () => {
    const dataToExport = backups.map((backup) => ({
      fecha: backup.fecha,
      emitidos: backup.resumen?.totalTicketsEmitidos || 0,
      atendidos: backup.resumen?.totalTicketsAtendidos || 0,
      tiempoEspera: backup.resumen?.tiempoEntreTickets || 0, // Changed from tiempoPromedioEsperaReal
    }))

    const csv = [
      ["Fecha", "Emitidos", "Atendidos", "Tiempo Espera (min)"],
      ...dataToExport.map((row) => [row.fecha, row.emitidos, row.atendidos, row.tiempoEspera]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historial_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const descargarPorMes = (mesAno: string) => {
    const [year, month] = mesAno.split("-")
    const backupsDelMes = backups.filter((backup) => {
      const fechaBackup = backup.fecha
      return fechaBackup.startsWith(`${year}-${month}`)
    })

    if (backupsDelMes.length === 0) {
      alert("No hay datos para este mes")
      return
    }

    const dataToExport = backupsDelMes.map((backup) => ({
      fecha: backup.fecha,
      emitidos: backup.resumen?.totalTicketsEmitidos || 0,
      atendidos: backup.resumen?.totalTicketsAtendidos || 0,
      tiempoEspera: backup.resumen?.tiempoEntreTickets || 0,
      eficiencia:
        backup.resumen?.totalTicketsEmitidos > 0
          ? Math.round((backup.resumen?.totalTicketsAtendidos / backup.resumen?.totalTicketsEmitidos) * 100)
          : 0,
    }))

    const csv = [
      ["Fecha", "Emitidos", "Atendidos", "Tiempo Espera (min)", "Eficiencia (%)"],
      ...dataToExport.map((row) => [row.fecha, row.emitidos, row.atendidos, row.tiempoEspera, row.eficiencia]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const nombreMes = new Date(`${year}-${month}-01`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historial_${nombreMes.replace(" ", "_")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>()
    backups.forEach((backup) => {
      const fecha = backup.fecha
      if (fecha) {
        const mesAno = fecha.substring(0, 7) // "YYYY-MM"
        meses.add(mesAno)
      }
    })
    return Array.from(meses).sort().reverse()
  }, [backups])

  const backupsUltimos30Dias = useMemo(() => {
    const hoy = new Date()
    const hace30Dias = new Date(hoy)
    hace30Dias.setDate(hace30Dias.getDate() - 30)

    return backups
      .filter((backup) => {
        const fechaBackup = new Date(backup.fecha)
        return fechaBackup >= hace30Dias && fechaBackup <= hoy
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [backups])

  const backupsFiltrados = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    return backups.filter((backup) => {
      const backupDate = new Date(backup.fecha)
      const backupDay = new Date(backupDate.getFullYear(), backupDate.getMonth(), backupDate.getDate())

      if (filterPeriod === "hoy") {
        return backupDay.getTime() === today.getTime()
      }
      if (filterPeriod === "ayer") {
        return backupDay.getTime() === yesterday.getTime()
      }

      const diffDays = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24))

      if (filterPeriod === "7days") return diffDays <= 7
      if (filterPeriod === "30days") return diffDays <= 30
      return true
    })
  }, [backups, filterPeriod])

  const metricas = useMemo(() => {
    const pendientes = estado.totalAtendidos - estado.numerosLlamados
    const promedioHistorico =
      backups.length > 0
        ? Math.round(backups.reduce((sum, b) => sum + (b.resumen?.totalTicketsEmitidos || 0), 0) / backups.length)
        : 0

    return { pendientes, promedioHistorico }
  }, [estado.totalAtendidos, estado.numerosLlamados, backups])

  const tiempoEsperaPromedio = useMemo(() => {
    if (backupsFiltrados.length === 0) return 0

    // Usar tiempoEntreTickets que ya está calculado en el backup
    const tiemposEspera = backupsFiltrados
      .map((backup) => backup.resumen?.tiempoEntreTickets || 0) // Changed from tiempoPromedioEsperaReal
      .filter((tiempo) => tiempo > 0)

    if (tiemposEspera.length === 0) return 0

    const promedio = tiemposEspera.reduce((sum, tiempo) => sum + tiempo, 0) / tiemposEspera.length
    return Math.round(promedio * 10) / 10
  }, [backupsFiltrados])

  const datosHorasPico = useMemo(() => {
    const distribucionPorHora: { [hora: number]: number } = {}

    backupsFiltrados.forEach((backup) => {
      if (backup.resumen?.distribucionPorHora) {
        Object.entries(backup.resumen.distribucionPorHora).forEach(([hora, cantidad]) => {
          const h = Number.parseInt(hora)
          distribucionPorHora[h] = (distribucionPorHora[h] || 0) + (cantidad as number)
        })
      }
    })

    return Object.entries(distribucionPorHora)
      .map(([hora, cantidad]) => ({
        hora: Number.parseInt(hora),
        cantidad,
      }))
      .sort((a, b) => a.hora - b.hora)
  }, [backupsFiltrados])

  const datosGrafico = useMemo(() => {
    return backupsFiltrados
      .slice(-30)
      .reverse()
      .map((backup) => ({
        fecha: new Date(backup.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        emitidos: backup.resumen?.totalTicketsEmitidos || 0,
        atendidos: backup.resumen?.totalTicketsAtendidos || 0,
      }))
  }, [backupsFiltrados])

  const datosGraficoTiempoEspera = useMemo(() => {
    return backupsFiltrados
      .slice(-30)
      .reverse()
      .map((backup) => ({
        fecha: new Date(backup.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        tiempoEspera: backup.resumen?.tiempoEntreTickets || 0, // Changed from tiempoPromedioEsperaReal
      }))
      .filter((item) => item.tiempoEspera > 0)
  }, [backupsFiltrados])

  if (loading || !isClient) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Cargando panel...</p>
        </div>
      </div>
    )
  }

  // Removed old calculations and duplicated functions. The useMemo hook calls are now directly used where needed.
  // const calcularMetricas = () => { ... }
  // const getFilteredBackups = () => { ... }
  // const calcularTiempoEsperaPromedio = () => { ... }
  // const prepararDatosHorasPico = () => { ... }
  // const prepararDatosGrafico = () => { ... }
  // const prepararDatosGraficoTiempoEspera = () => { ... }

  return (
    <div className={styles.container}>
      {/* Header Moderno */}
      <div className={styles.headerContainer}>
        <div className={styles.headerContent}>
          <div className={styles.headerTop}>
            <div className={styles.headerLeft}>
              <img src="/logo-rojo.png" alt="Logo" className={styles.headerLogo} />
              <div className={styles.headerTitle}>
                <h1 className={styles.headerTitleMain}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Panel de Administración
                </h1>
                <p className={styles.headerSubtitle}>Control y análisis del sistema</p>
              </div>
            </div>

            <div className={styles.headerRight}>
              <a href="/" className={styles.headerLink}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Tickets
              </a>
              <a href="/empleados" className={styles.headerLink}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Empleados
              </a>
              <a href="/proximos" className={styles.headerLink}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Próximos
              </a>
            </div>
          </div>

          {/* Navegación de vistas */}
          <div className={styles.tabs}>
            <button
              onClick={() => setVistaActual("resumen")}
              className={`${styles.tab} ${vistaActual === "resumen" ? styles.tabActive : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Resumen
            </button>
            <button
              onClick={() => setVistaActual("historial")}
              className={`${styles.tab} ${vistaActual === "historial" ? styles.tabActive : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Historial
            </button>
            <button
              onClick={() => setVistaActual("metricas")}
              className={`${styles.tab} ${vistaActual === "metricas" ? styles.tabActive : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
              Métricas
            </button>
          </div>
        </div>
      </div>

      <div className={styles.maxWidth}>
        {/* Vista: Resumen */}
        {vistaActual === "resumen" && (
          <div style={{ marginTop: "2rem" }}>
            {/* KPIs Principales */}
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.statCardBlue}`}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Tickets Emitidos</span>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className={styles.statValue}>{estado.totalAtendidos}</div>
                <p className={styles.statLabel}>
                  {estado.totalAtendidos > metricas.promedioHistorico ? "↗" : "↘"} vs promedio (
                  {metricas.promedioHistorico})
                </p>
              </div>

              <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Atendidos</span>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className={styles.statValue}>{estado.numerosLlamados}</div>
                <p className={styles.statLabel}>Procesados exitosamente</p>
              </div>

              <div className={`${styles.statCard} ${styles.statCardOrange}`}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>En Espera</span>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className={styles.statValue}>{metricas.pendientes}</div>
                <p className={styles.statLabel}>Tickets pendientes</p>
              </div>

              <div className={`${styles.statCard} ${styles.statCardCyan}`}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Tiempo de Espera</span>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className={styles.statValue}>{tiempoEsperaPromedio}</div>
                <p className={styles.statLabel}>
                  minutos por cliente (
                  {filterPeriod === "hoy"
                    ? "hoy"
                    : filterPeriod === "ayer"
                      ? "ayer"
                      : filterPeriod === "7days"
                        ? "7 días"
                        : filterPeriod === "30days"
                          ? "30 días"
                          : "total"}
                  )
                </p>
              </div>
            </div>

            {datosGrafico.length > 0 && (
              <div className={styles.chartCard}>
                <div className={styles.filterContainer}>
                  <h3 className={styles.chartTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    Tendencia de Tickets
                  </h3>
                  <div className={styles.filterGroup}>
                    <button
                      onClick={() => setFilterPeriod("hoy")}
                      className={`${styles.filterButton} ${filterPeriod === "hoy" ? styles.filterButtonActive : ""}`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setFilterPeriod("ayer")}
                      className={`${styles.filterButton} ${filterPeriod === "ayer" ? styles.filterButtonActive : ""}`}
                    >
                      Ayer
                    </button>
                    <button
                      onClick={() => setFilterPeriod("7days")}
                      className={`${styles.filterButton} ${filterPeriod === "7days" ? styles.filterButtonActive : ""}`}
                    >
                      Últimos 7 días
                    </button>
                    <button
                      onClick={() => setFilterPeriod("30days")}
                      className={`${styles.filterButton} ${filterPeriod === "30days" ? styles.filterButtonActive : ""}`}
                    >
                      Últimos 30 días
                    </button>
                    <button
                      onClick={() => setFilterPeriod("all")}
                      className={`${styles.filterButton} ${filterPeriod === "all" ? styles.filterButtonActive : ""}`}
                    >
                      Todo el tiempo
                    </button>
                  </div>
                </div>

                <div style={{ width: "100%", height: "350px", padding: "1rem 0" }}>
                  <svg width="100%" height="100%" viewBox="0 0 800 350" style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                      <filter id="chartShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <g key={i}>
                        <line x1="80" y1={40 + i * 60} x2="750" y2={40 + i * 60} stroke="#e5e7eb" strokeWidth="1" />
                        <text x="70" y={45 + i * 60} textAnchor="end" fill="#9ca3af" fontSize="12">
                          {Math.round(
                            (4 - i) * (Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos))) / 4),
                          )}
                        </text>
                      </g>
                    ))}

                    {/* X-axis labels */}
                    {datosGrafico.map((dato, index) => {
                      const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                      return (
                        <text
                          key={index}
                          x={x}
                          y="305"
                          textAnchor="middle"
                          fill="#6b7280"
                          fontSize="11"
                          transform={`rotate(-45, ${x}, 305)`}
                        >
                          {dato.fecha}
                        </text>
                      )
                    })}

                    {/* Area under emitidos line */}
                    {datosGrafico.length > 1 && (
                      <path
                        d={`
                          M 80,280
                          ${datosGrafico
                            .map((dato, index) => {
                              const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                              const maxValue = Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos)))
                              const y = 280 - (dato.emitidos / maxValue) * 240
                              return `L ${x},${y}`
                            })
                            .join(" ")}
                          L ${80 + 670},280
                          Z
                        `}
                        fill="url(#blueGradient)"
                      />
                    )}

                    {/* Emitidos line */}
                    {datosGrafico.length > 1 && (
                      <path
                        d={datosGrafico
                          .map((dato, index) => {
                            const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                            const maxValue = Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos)))
                            const y = 280 - (dato.emitidos / maxValue) * 240
                            return `${index === 0 ? "M" : "L"} ${x},${y}`
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#chartShadow)"
                      />
                    )}

                    {/* Emitidos points */}
                    {datosGrafico.map((dato, index) => {
                      const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                      const maxValue = Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos)))
                      const y = 280 - (dato.emitidos / maxValue) * 240

                      return (
                        <g key={`emitidos-${index}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            filter="url(#chartShadow)"
                          />
                          <circle cx={x} cy={y} r="3" fill="#3b82f6" />
                          <title>
                            {dato.fecha}: {dato.emitidos} emitidos
                          </title>
                        </g>
                      )
                    })}

                    {/* Area under atendidos line */}
                    {datosGrafico.length > 1 && (
                      <path
                        d={`
                          M 80,280
                          ${datosGrafico
                            .map((dato, index) => {
                              const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                              const maxValue = Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos)))
                              const y = 280 - (dato.atendidos / maxValue) * 240
                              return `L ${x},${y}`
                            })
                            .join(" ")}
                          L ${80 + 670},280
                          Z
                        `}
                        fill="url(#greenGradient)"
                      />
                    )}

                    {/* Atendidos line */}
                    {datosGrafico.length > 1 && (
                      <path
                        d={datosGrafico
                          .map((dato, index) => {
                            const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                            const maxValue = Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos)))
                            const y = 280 - (dato.atendidos / maxValue) * 240
                            return `${index === 0 ? "M" : "L"} ${x},${y}`
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#chartShadow)"
                      />
                    )}

                    {/* Atendidos points */}
                    {datosGrafico.map((dato, index) => {
                      const x = 80 + (index * 670) / Math.max(datosGrafico.length - 1, 1)
                      const maxValue = Math.max(...datosGrafico.map((d) => Math.max(d.emitidos, d.atendidos)))
                      const y = 280 - (dato.atendidos / maxValue) * 240

                      return (
                        <g key={`atendidos-${index}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill="white"
                            stroke="#10b981"
                            strokeWidth="3"
                            filter="url(#chartShadow)"
                          />
                          <circle cx={x} cy={y} r="3" fill="#10b981" />
                          <title>
                            {dato.fecha}: {dato.atendidos} atendidos
                          </title>
                        </g>
                      )
                    })}

                    {/* Y-axis label */}
                    <text
                      x="20"
                      y="160"
                      textAnchor="middle"
                      fill="#6b7280"
                      fontSize="12"
                      transform="rotate(-90, 20, 160)"
                    >
                      Cantidad de Tickets
                    </text>
                  </svg>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "3px",
                        background: "#3b82f6",
                        borderRadius: "2px",
                      }}
                    ></div>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Tickets Emitidos</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "3px",
                        background: "#10b981",
                        borderRadius: "2px",
                      }}
                    ></div>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Tickets Atendidos</span>
                  </div>
                </div>
              </div>
            )}

            {datosGraficoTiempoEspera.length > 0 && (
              <div className={styles.chartCard}>
                <div className={styles.filterContainer}>
                  <h3 className={styles.chartTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Tendencia de Tiempo de Espera
                  </h3>
                  <div className={styles.filterGroup}>
                    <button
                      onClick={() => setFilterPeriod("hoy")}
                      className={`${styles.filterButton} ${filterPeriod === "hoy" ? styles.filterButtonActive : ""}`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setFilterPeriod("ayer")}
                      className={`${styles.filterButton} ${filterPeriod === "ayer" ? styles.filterButtonActive : ""}`}
                    >
                      Ayer
                    </button>
                    <button
                      onClick={() => setFilterPeriod("7days")}
                      className={`${styles.filterButton} ${filterPeriod === "7days" ? styles.filterButtonActive : ""}`}
                    >
                      Últimos 7 días
                    </button>
                    <button
                      onClick={() => setFilterPeriod("30days")}
                      className={`${styles.filterButton} ${filterPeriod === "30days" ? styles.filterButtonActive : ""}`}
                    >
                      Últimos 30 días
                    </button>
                    <button
                      onClick={() => setFilterPeriod("all")}
                      className={`${styles.filterButton} ${filterPeriod === "all" ? styles.filterButtonActive : ""}`}
                    >
                      Todo el tiempo
                    </button>
                  </div>
                </div>

                <div style={{ width: "100%", height: "300px", padding: "1rem 0" }}>
                  <svg width="100%" height="100%" viewBox="0 0 800 300" style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <g key={i}>
                        <line x1="80" y1={40 + i * 50} x2="750" y2={40 + i * 50} stroke="#e5e7eb" strokeWidth="1" />
                        <text x="70" y={45 + i * 50} textAnchor="end" fill="#9ca3af" fontSize="12">
                          {Math.round((4 - i) * (Math.max(...datosGraficoTiempoEspera.map((d) => d.tiempoEspera)) / 4))}
                        </text>
                      </g>
                    ))}

                    {/* X-axis labels */}
                    {datosGraficoTiempoEspera.map((dato, index) => {
                      const x = 80 + (index * 670) / Math.max(datosGraficoTiempoEspera.length - 1, 1)
                      return (
                        <text
                          key={index}
                          x={x}
                          y="260"
                          textAnchor="middle"
                          fill="#6b7280"
                          fontSize="11"
                          transform={`rotate(-45, ${x}, 260)`}
                        >
                          {dato.fecha}
                        </text>
                      )
                    })}

                    {/* Area under the line */}
                    {datosGraficoTiempoEspera.length > 1 && (
                      <path
                        d={`
                          M 80,240
                          ${datosGraficoTiempoEspera
                            .map((dato, index) => {
                              const x = 80 + (index * 670) / Math.max(datosGraficoTiempoEspera.length - 1, 1)
                              const maxValue = Math.max(...datosGraficoTiempoEspera.map((d) => d.tiempoEspera))
                              const y = 240 - (dato.tiempoEspera / maxValue) * 200
                              return `L ${x},${y}`
                            })
                            .join(" ")}
                          L ${80 + 670},240
                          Z
                        `}
                        fill="url(#cyanGradient)"
                      />
                    )}

                    {/* Line */}
                    {datosGraficoTiempoEspera.length > 1 && (
                      <path
                        d={datosGraficoTiempoEspera
                          .map((dato, index) => {
                            const x = 80 + (index * 670) / Math.max(datosGraficoTiempoEspera.length - 1, 1)
                            const maxValue = Math.max(...datosGraficoTiempoEspera.map((d) => d.tiempoEspera))
                            const y = 240 - (dato.tiempoEspera / maxValue) * 200
                            return `${index === 0 ? "M" : "L"} ${x},${y}`
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#shadow)"
                      />
                    )}

                    {/* Points */}
                    {datosGraficoTiempoEspera.map((dato, index) => {
                      const x = 80 + (index * 670) / Math.max(datosGraficoTiempoEspera.length - 1, 1)
                      const maxValue = Math.max(...datosGraficoTiempoEspera.map((d) => d.tiempoEspera))
                      const y = 240 - (dato.tiempoEspera / maxValue) * 200

                      return (
                        <g key={index}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill="white"
                            stroke="#06b6d4"
                            strokeWidth="3"
                            filter="url(#shadow)"
                          />
                          <circle cx={x} cy={y} r="3" fill="#06b6d4" />
                          <title>
                            {dato.fecha}: {dato.tiempoEspera.toFixed(1)} min
                          </title>
                        </g>
                      )
                    })}

                    {/* Y-axis label */}
                    <text
                      x="20"
                      y="140"
                      textAnchor="middle"
                      fill="#6b7280"
                      fontSize="12"
                      transform="rotate(-90, 20, 140)"
                    >
                      Minutos
                    </text>
                  </svg>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "3px",
                        background: "#06b6d4",
                        borderRadius: "2px",
                      }}
                    ></div>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Tiempo de Espera Promedio</span>
                  </div>
                </div>
              </div>
            )}

            {datosHorasPico.length > 0 && (
              <div className={styles.chartCard}>
                <div className={styles.filterContainer}>
                  <h3 className={styles.chartTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                    Horas Pico - Distribución de Clientes
                  </h3>
                  <div className={styles.filterGroup}>
                    <button
                      onClick={() => setFilterPeriod("hoy")}
                      className={`${styles.filterButton} ${filterPeriod === "hoy" ? styles.filterButtonActive : ""}`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setFilterPeriod("ayer")}
                      className={`${styles.filterButton} ${filterPeriod === "ayer" ? styles.filterButtonActive : ""}`}
                    >
                      Ayer
                    </button>
                    <button
                      onClick={() => setFilterPeriod("7days")}
                      className={`${styles.filterButton} ${filterPeriod === "7days" ? styles.filterButtonActive : ""}`}
                    >
                      Últimos 7 días
                    </button>
                    <button
                      onClick={() => setFilterPeriod("30days")}
                      className={`${styles.filterButton} ${filterPeriod === "30days" ? styles.filterButtonActive : ""}`}
                    >
                      Últimos 30 días
                    </button>
                    <button
                      onClick={() => setFilterPeriod("all")}
                      className={`${styles.filterButton} ${filterPeriod === "all" ? styles.filterButtonActive : ""}`}
                    >
                      Todo el tiempo
                    </button>
                  </div>
                </div>

                <div style={{ width: "100%", height: "350px", padding: "1rem 0" }}>
                  <svg width="100%" height="100%" viewBox="0 0 800 350" style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
                      </linearGradient>
                      <filter id="barShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <g key={i}>
                        <line x1="80" y1={40 + i * 60} x2="750" y2={40 + i * 60} stroke="#e5e7eb" strokeWidth="1" />
                        <text x="70" y={45 + i * 60} textAnchor="end" fill="#9ca3af" fontSize="12">
                          {Math.round((4 - i) * (Math.max(...datosHorasPico.map((d) => d.cantidad)) / 4))}
                        </text>
                      </g>
                    ))}

                    {/* Bars */}
                    {datosHorasPico.map((dato, index) => {
                      const barWidth = 670 / Math.max(datosHorasPico.length, 1)
                      const x = 80 + index * barWidth
                      const maxValue = Math.max(...datosHorasPico.map((d) => d.cantidad))
                      const barHeight = (dato.cantidad / maxValue) * 240
                      const y = 280 - barHeight

                      return (
                        <g key={index}>
                          <rect
                            x={x + barWidth * 0.1}
                            y={y}
                            width={barWidth * 0.8}
                            height={barHeight}
                            fill="url(#barGradient)"
                            filter="url(#barShadow)"
                            rx="4"
                          >
                            <title>
                              {dato.hora}:00 - {dato.cantidad} clientes
                            </title>
                          </rect>
                          <text
                            x={x + barWidth / 2}
                            y={y - 5}
                            textAnchor="middle"
                            fill="#6b7280"
                            fontSize="11"
                            fontWeight="600"
                          >
                            {dato.cantidad}
                          </text>
                          <text x={x + barWidth / 2} y="305" textAnchor="middle" fill="#6b7280" fontSize="11">
                            {dato.hora}h
                          </text>
                        </g>
                      )
                    })}

                    {/* Y-axis label */}
                    <text
                      x="20"
                      y="160"
                      textAnchor="middle"
                      fill="#6b7280"
                      fontSize="12"
                      transform="rotate(-90, 20, 160)"
                    >
                      Cantidad de Clientes
                    </text>

                    {/* X-axis label */}
                    <text x="400" y="340" textAnchor="middle" fill="#6b7280" fontSize="12">
                      Hora del Día
                    </text>
                  </svg>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        background: "linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%)",
                        borderRadius: "4px",
                      }}
                    ></div>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Clientes por Hora</span>
                  </div>
                </div>
              </div>
            )}

            {/* Acción Rápida: Reiniciar Contador */}
            <div
              className={styles.card}
              style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)", border: "2px solid #fdba74" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: "700",
                      color: "#9a3412",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Reiniciar Contador Diario
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#c2410c" }}>
                    Crea un backup automático y reinicia el contador para un nuevo día
                  </p>
                </div>
                <button
                  onClick={() => setMostrarConfirmacionReinicio(true)}
                  disabled={procesandoAccion}
                  className={`${styles.button} ${styles.buttonDanger}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Reiniciar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vista: Historial */}
        {vistaActual === "historial" && (
          <div style={{ marginTop: "2rem" }}>
            <div className={styles.filterContainer}>
              <h2 className={styles.sectionTitle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Historial - Últimos 30 Días
              </h2>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className={styles.filterButton}
                    style={{
                      padding: "0.5rem 1rem",
                      cursor: "pointer",
                      minWidth: "160px",
                    }}
                  >
                    <option value="">Seleccionar mes...</option>
                    {mesesDisponibles.map((mes) => {
                      const [year, month] = mes.split("-")
                      const nombreMes = new Date(`${year}-${month}-01`).toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      })
                      return (
                        <option key={mes} value={mes}>
                          {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                        </option>
                      )
                    })}
                  </select>
                  <button
                    onClick={() => selectedMonth && descargarPorMes(selectedMonth)}
                    className={styles.downloadButton}
                    disabled={!selectedMonth}
                    style={{ opacity: selectedMonth ? 1 : 0.5 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Descargar Mes
                  </button>
                </div>

                <button
                  onClick={cargarBackups}
                  className={`${styles.button} ${styles.buttonOutline}`}
                  disabled={loadingBackups}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: loadingBackups ? "spin 1s linear infinite" : "none" }}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </div>

            {loadingBackups ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <div className={styles.spinner} style={{ width: "3rem", height: "3rem", margin: "0 auto 1rem" }}></div>
                <p style={{ color: "#6b7280" }}>Cargando historial...</p>
              </div>
            ) : backupsUltimos30Dias.length > 0 ? (
              <>
                <p style={{ color: "#64748b", marginBottom: "1rem", fontSize: "0.875rem" }}>
                  Mostrando {backupsUltimos30Dias.length} día(s) de los últimos 30 días
                </p>
                <div className={styles.historyGrid}>
                  {backupsUltimos30Dias.map((backup, index) => {
                    const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                    const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                    const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0
                    const tiempoEspera = backup.resumen?.tiempoEntreTickets || 0

                    return (
                      <div key={index} className={styles.historyCard}>
                        <div className={styles.historyCardHeader}>
                          <div>
                            <div className={styles.historyDate}>{backup.fecha}</div>
                            <div className={styles.historyDay}>
                              {new Date(backup.fecha).toLocaleDateString("es-AR", { weekday: "long" })}
                            </div>
                          </div>
                          {index < 3 && <span className={`${styles.badge} ${styles.badgeInfo}`}>Reciente</span>}
                        </div>

                        <div className={styles.historyStats}>
                          <div className={styles.historyStat}>
                            <span className={styles.historyStatLabel}>Emitidos:</span>
                            <span className={styles.historyStatValue} style={{ color: "#3b82f6" }}>
                              {emitidos}
                            </span>
                          </div>
                          <div className={styles.historyStat}>
                            <span className={styles.historyStatLabel}>Atendidos:</span>
                            <span className={styles.historyStatValue} style={{ color: "#10b981" }}>
                              {atendidos}
                            </span>
                          </div>
                          <div className={styles.historyStat}>
                            <span className={styles.historyStatLabel}>Espera:</span>
                            <span className={styles.historyStatValue} style={{ color: "#f97316" }}>
                              {tiempoEspera} min
                            </span>
                          </div>
                        </div>

                        <div className={styles.historyProgress}>
                          <div
                            className={styles.historyProgressBar}
                            style={{
                              width: `${eficiencia}%`,
                              background:
                                eficiencia >= 80
                                  ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                                  : "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
                            }}
                          ></div>
                        </div>
                        <div
                          style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", textAlign: "right" }}
                        >
                          {eficiencia}% eficiencia
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className={styles.card} style={{ textAlign: "center", padding: "3rem" }}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  style={{ margin: "0 auto 1rem" }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p style={{ fontSize: "1.125rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                  No hay historial en los últimos 30 días
                </p>
                <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                  Los datos aparecerán después del primer día de operación
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vista: Métricas */}
        {vistaActual === "metricas" && (
          <div className="text-slate-500" style={{ marginTop: "2rem" }}>
            {/* Filtros para métricas */}
            <div className={styles.filterContainer}>
              <h2 className={styles.sectionTitle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
                Métricas Avanzadas
              </h2>
              <div className={styles.filterGroup}>
                <button
                  onClick={() => setFilterPeriod("hoy")}
                  className={`${styles.filterButton} ${filterPeriod === "hoy" ? styles.filterButtonActive : ""}`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setFilterPeriod("ayer")}
                  className={`${styles.filterButton} ${filterPeriod === "ayer" ? styles.filterButtonActive : ""}`}
                >
                  Ayer
                </button>
                <button
                  onClick={() => setFilterPeriod("7days")}
                  className={`${styles.filterButton} ${filterPeriod === "7days" ? styles.filterButtonActive : ""}`}
                >
                  Últimos 7 días
                </button>
                <button
                  onClick={() => setFilterPeriod("30days")}
                  className={`${styles.filterButton} ${filterPeriod === "30days" ? styles.filterButtonActive : ""}`}
                >
                  Últimos 30 días
                </button>
                <button
                  onClick={() => setFilterPeriod("all")}
                  className={`${styles.filterButton} ${filterPeriod === "all" ? styles.filterButtonActive : ""}`}
                >
                  Todo el tiempo
                </button>
              </div>
            </div>

            {/* KPIs Generales */}
            <div className={styles.statsGrid}>
              <div className={styles.card} style={{ textAlign: "center" }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                  style={{ margin: "0 auto 0.75rem" }}
                >
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#1f2937", marginBottom: "0.5rem" }}>
                  {backupsFiltrados.length}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Días Operativos</p>
              </div>

              <div className={styles.card} style={{ textAlign: "center" }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  style={{ margin: "0 auto 0.75rem" }}
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#1f2937", marginBottom: "0.5rem" }}>
                  {backupsFiltrados.reduce((sum, b) => sum + (b.resumen?.totalTicketsEmitidos || 0), 0)}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Tickets Emitidos</p>
              </div>

              <div className={styles.card} style={{ textAlign: "center" }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  style={{ margin: "0 auto 0.75rem" }}
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#1f2937", marginBottom: "0.5rem" }}>
                  {backupsFiltrados.length > 0
                    ? Math.round(
                        backupsFiltrados.reduce((sum, b) => sum + (b.resumen?.totalTicketsEmitidos || 0), 0) /
                          backupsFiltrados.length,
                      )
                    : 0}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Promedio Diario</p>
              </div>

              <div className={styles.card} style={{ textAlign: "center" }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  style={{ margin: "0 auto 0.75rem" }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#1f2937", marginBottom: "0.5rem" }}>
                  {tiempoEsperaPromedio}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Min. Espera Promedio</p>
              </div>
            </div>

            {/* Estadísticas Destacadas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
                marginTop: "1.5rem",
              }}
            >
              {/* Mejor Día */}
              {(() => {
                const mejorDia = backupsFiltrados.reduce((max, backup) => {
                  const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                  return emitidos > (max.resumen?.totalTicketsEmitidos || 0) ? backup : max
                }, backupsFiltrados[0] || {})

                return mejorDia ? (
                  <div className={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                        <circle cx="12" cy="8" r="7" />
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                      </svg>
                      <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>Mejor Día</h4>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#eab308", marginBottom: "0.5rem" }}>
                      {new Date(mejorDia.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {mejorDia.resumen?.totalTicketsEmitidos || 0} tickets emitidos
                    </div>
                  </div>
                ) : null
              })()}

              {/* Promedio de Eficiencia */}
              {(() => {
                const promedioEficiencia =
                  backupsFiltrados.length > 0
                    ? Math.round(
                        backupsFiltrados.reduce((sum, b) => {
                          const emitidos = b.resumen?.totalTicketsEmitidos || 0
                          const atendidos = b.resumen?.totalTicketsAtendidos || 0
                          return sum + (emitidos > 0 ? (atendidos / emitidos) * 100 : 0)
                        }, 0) / backupsFiltrados.length,
                      )
                    : 0

                return (
                  <div className={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>Eficiencia Promedio</h4>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#10b981", marginBottom: "0.5rem" }}>
                      {promedioEficiencia}%
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Del período seleccionado</div>
                  </div>
                )
              })()}

              {/* Hora Pico Más Común */}
              {(() => {
                const horasPico: { [hora: number]: number } = {}
                backupsFiltrados.forEach((backup) => {
                  const hora = backup.resumen?.horaPico?.hora
                  if (hora !== undefined) {
                    horasPico[hora] = (horasPico[hora] || 0) + 1
                  }
                })

                const horaMasComun = Object.entries(horasPico).reduce(
                  (max, [hora, count]) => (count > max.count ? { hora: Number.parseInt(hora), count } : max),
                  { hora: 0, count: 0 },
                )

                return horaMasComun.count > 0 ? (
                  <div className={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>Hora Pico Más Común</h4>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f97316", marginBottom: "0.5rem" }}>
                      {horaMasComun.hora}:00
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      En {horaMasComun.count} de {backupsFiltrados.length} días
                    </div>
                  </div>
                ) : null
              })()}
            </div>

            {/* Análisis de Eficiencia */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Análisis de Eficiencia
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {backupsFiltrados.slice(0, 10).map((backup, index) => {
                  const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                  const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                  const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0

                  return (
                    <div key={index} className={styles.card} style={{ padding: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#6b7280" }}>
                          {new Date(backup.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                        </span>
                        <span
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: "700",
                            color: eficiencia >= 80 ? "#10b981" : eficiencia >= 60 ? "#f97316" : "#ef4444",
                          }}
                        >
                          {eficiencia}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: "#e5e7eb",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${eficiencia}%`,
                            height: "100%",
                            background:
                              eficiencia >= 80
                                ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                                : eficiencia >= 60
                                  ? "linear-gradient(90deg, #f97316 0%, #ea580c 100%)"
                                  : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                            transition: "width 0.3s ease",
                          }}
                        ></div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "0.5rem",
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                        }}
                      >
                        <span>{emitidos} emitidos</span>
                        <span>{atendidos} atendidos</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Distribución Horaria Agregada */}
            {(() => {
              const distribucionAgregada: { [hora: number]: number } = {}
              backupsFiltrados.forEach((backup) => {
                if (backup.resumen?.distribucionPorHora) {
                  Object.entries(backup.resumen.distribucionPorHora).forEach(([hora, cantidad]) => {
                    const h = Number.parseInt(hora)
                    distribucionAgregada[h] = (distribucionAgregada[h] || 0) + (cantidad as number)
                  })
                }
              })

              const datosDistribucion = Object.entries(distribucionAgregada)
                .map(([hora, cantidad]) => ({ hora: Number.parseInt(hora), cantidad }))
                .sort((a, b) => a.hora - b.hora)

              const maxCantidad = Math.max(...datosDistribucion.map((d) => d.cantidad), 1)

              return datosDistribucion.length > 0 ? (
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                    Distribución Horaria del Período
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
                      gap: "0.5rem",
                      marginTop: "1.5rem",
                    }}
                  >
                    {datosDistribucion.map((dato) => {
                      const altura = (dato.cantidad / maxCantidad) * 100
                      const esHoraPico = dato.cantidad === maxCantidad

                      return (
                        <div
                          key={dato.hora}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              color: esHoraPico ? "#8b5cf6" : "#6b7280",
                            }}
                          >
                            {dato.cantidad}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: "120px",
                              display: "flex",
                              alignItems: "flex-end",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "80%",
                                height: `${altura}%`,
                                background: esHoraPico
                                  ? "linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%)"
                                  : "linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)",
                                borderRadius: "4px 4px 0 0",
                                transition: "all 0.3s ease",
                                boxShadow: esHoraPico
                                  ? "0 4px 12px rgba(139, 92, 246, 0.4)"
                                  : "0 2px 8px rgba(59, 130, 246, 0.3)",
                              }}
                            ></div>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{dato.hora}h</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null
            })()}

            {/* Comparativa de Días */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Comparativa de Días
              </h3>

              <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        Fecha
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        Emitidos
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        Atendidos
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        Eficiencia
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        Tiempo Espera
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        Hora Pico
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupsFiltrados.slice(0, 15).map((backup, index) => {
                      const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                      const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                      const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0
                      const tiempoEspera = backup.resumen?.tiempoEntreTickets || 0
                      const horaPico = backup.resumen?.horaPico?.hora || 0

                      return (
                        <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#1f2937" }}>
                            {new Date(backup.fecha).toLocaleDateString("es-AR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              fontSize: "0.875rem",
                              fontWeight: "600",
                              color: "#3b82f6",
                            }}
                          >
                            {emitidos}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "center",
                              fontSize: "0.875rem",
                              fontWeight: "600",
                              color: "#10b981",
                            }}
                          >
                            {atendidos}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: eficiencia >= 80 ? "#d1fae5" : eficiencia >= 60 ? "#fed7aa" : "#fee2e2",
                                color: eficiencia >= 80 ? "#065f46" : eficiencia >= 60 ? "#9a3412" : "#991b1b",
                              }}
                            >
                              {eficiencia}%
                            </span>
                          </td>
                          <td
                            style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", color: "#6b7280" }}
                          >
                            {tiempoEspera.toFixed(1)} min
                          </td>
                          <td
                            style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", color: "#6b7280" }}
                          >
                            {horaPico}:00
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Estadísticas Adicionales */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
                marginTop: "1.5rem",
              }}
            >
              {/* Mejor Día */}
              {(() => {
                const mejorDia = backupsFiltrados.reduce((max, backup) => {
                  const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                  return emitidos > (max.resumen?.totalTicketsEmitidos || 0) ? backup : max
                }, backupsFiltrados[0] || {})

                return mejorDia ? (
                  <div className={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                        <circle cx="12" cy="8" r="7" />
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                      </svg>
                      <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>Mejor Día</h4>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#eab308", marginBottom: "0.5rem" }}>
                      {new Date(mejorDia.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {mejorDia.resumen?.totalTicketsEmitidos || 0} tickets emitidos
                    </div>
                  </div>
                ) : null
              })()}

              {/* Promedio de Eficiencia */}
              {(() => {
                const promedioEficiencia =
                  backupsFiltrados.length > 0
                    ? Math.round(
                        backupsFiltrados.reduce((sum, b) => {
                          const emitidos = b.resumen?.totalTicketsEmitidos || 0
                          const atendidos = b.resumen?.totalTicketsAtendidos || 0
                          return sum + (emitidos > 0 ? (atendidos / emitidos) * 100 : 0)
                        }, 0) / backupsFiltrados.length,
                      )
                    : 0

                return (
                  <div className={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>Eficiencia Promedio</h4>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#10b981", marginBottom: "0.5rem" }}>
                      {promedioEficiencia}%
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Del período seleccionado</div>
                  </div>
                )
              })()}

              {/* Hora Pico Más Común */}
              {(() => {
                const horasPico: { [hora: number]: number } = {}
                backupsFiltrados.forEach((backup) => {
                  const hora = backup.resumen?.horaPico?.hora
                  if (hora !== undefined) {
                    horasPico[hora] = (horasPico[hora] || 0) + 1
                  }
                })

                const horaMasComun = Object.entries(horasPico).reduce(
                  (max, [hora, count]) => (count > max.count ? { hora: Number.parseInt(hora), count } : max),
                  { hora: 0, count: 0 },
                )

                return horaMasComun.count > 0 ? (
                  <div className={styles.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>Hora Pico Más Común</h4>
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f97316", marginBottom: "0.5rem" }}>
                      {horaMasComun.hora}:00
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      En {horaMasComun.count} de {backupsFiltrados.length} días
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmación */}
      {mostrarConfirmacionReinicio && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h3 className={styles.modalTitle}>Confirmar Reinicio</h3>
            </div>
            <div className={styles.modalBody}>
              ¿Está seguro de que desea reiniciar el contador diario? Se creará un backup automático de los datos
              actuales.
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setMostrarConfirmacionReinicio(false)}
                className={`${styles.button} ${styles.buttonOutline}`}
                disabled={procesandoAccion}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={reiniciarContadorDiario}
                className={`${styles.button} ${styles.buttonDanger}`}
                disabled={procesandoAccion}
                style={{ flex: 1 }}
              >
                {procesandoAccion ? "Reiniciando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
