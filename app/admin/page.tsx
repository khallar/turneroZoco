"use client"

import { useState, useEffect } from "react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"
import styles from "./page.module.css"

export const dynamic = "force-dynamic"

type FilterPeriod = "7days" | "30days" | "all"

export default function PaginaAdmin() {
  const { estado, loading, error, reiniciarContador, recargar } = useSistemaEstado()
  const [isClient, setIsClient] = useState(false)
  const [backups, setBackups] = useState<any[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [vistaActual, setVistaActual] = useState<"resumen" | "historial" | "metricas">("resumen")
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("7days")

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
      eficiencia:
        backup.resumen?.totalTicketsEmitidos > 0
          ? Math.round(((backup.resumen?.totalTicketsAtendidos || 0) / backup.resumen.totalTicketsEmitidos) * 100)
          : 0,
    }))

    const csv = [
      ["Fecha", "Emitidos", "Atendidos", "Eficiencia (%)"],
      ...dataToExport.map((row) => [row.fecha, row.emitidos, row.atendidos, row.eficiencia]),
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

  const getFilteredBackups = () => {
    const now = new Date()
    const filtered = backups.filter((backup) => {
      const backupDate = new Date(backup.fecha)
      const diffDays = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24))

      if (filterPeriod === "7days") return diffDays <= 7
      if (filterPeriod === "30days") return diffDays <= 30
      return true
    })
    return filtered
  }

  const calcularTiempoEsperaPromedio = () => {
    const filteredBackups = getFilteredBackups()

    if (filteredBackups.length === 0) return 0

    const tiemposEspera = filteredBackups
      .map((backup) => backup.resumen?.tiempoPromedioEsperaReal || 0)
      .filter((tiempo) => tiempo > 0)

    if (tiemposEspera.length === 0) return 0

    const promedio = tiemposEspera.reduce((sum, tiempo) => sum + tiempo, 0) / tiemposEspera.length
    return Math.round(promedio * 10) / 10 // Redondear a 1 decimal
  }

  const prepararDatosGrafico = () => {
    const filteredBackups = getFilteredBackups()
    return filteredBackups
      .slice(-30)
      .reverse()
      .map((backup) => ({
        fecha: new Date(backup.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        emitidos: backup.resumen?.totalTicketsEmitidos || 0,
        atendidos: backup.resumen?.totalTicketsAtendidos || 0,
      }))
  }

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

  const metricas = calcularMetricas()
  const datosGrafico = prepararDatosGrafico()
  const tiempoEsperaPromedio = calcularTiempoEsperaPromedio()

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

              <div className={`${styles.statCard} ${styles.statCardPurple}`}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Eficiencia</span>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div className={styles.statValue}>{metricas.eficiencia}%</div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#f3f4f6",
                    borderRadius: "9999px",
                    overflow: "hidden",
                    marginTop: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: `${metricas.eficiencia}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #a855f7 0%, #9333ea 100%)",
                      borderRadius: "9999px",
                      transition: "width 0.6s ease",
                    }}
                  ></div>
                </div>
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
                  minutos promedio (
                  {filterPeriod === "7days" ? "7 días" : filterPeriod === "30days" ? "30 días" : "total"})
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
                  <svg width="100%" height="100%" viewBox="0 0 800 300">
                    <defs>
                      <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="50"
                        y1={50 + i * 50}
                        x2="750"
                        y2={50 + i * 50}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Data visualization would go here - simplified for vanilla CSS */}
                    <text x="400" y="150" textAnchor="middle" fill="#9ca3af" fontSize="14">
                      Gráfico de tendencia (
                      {filterPeriod === "7days" ? "7 días" : filterPeriod === "30days" ? "30 días" : "Todo"})
                    </text>
                  </svg>
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
                Historial de Días
              </h2>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={descargarHistorial} className={styles.downloadButton} disabled={backups.length === 0}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Descargar CSV
                </button>
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
            ) : backups.length > 0 ? (
              <div className={styles.historyGrid}>
                {backups
                  .slice(-30)
                  .reverse()
                  .map((backup, index) => {
                    const emitidos = backup.resumen?.totalTicketsEmitidos || 0
                    const atendidos = backup.resumen?.totalTicketsAtendidos || 0
                    const eficiencia = emitidos > 0 ? Math.round((atendidos / emitidos) * 100) : 0

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
                            <span className={styles.historyStatLabel}>Eficiencia:</span>
                            <span
                              className={styles.historyStatValue}
                              style={{ color: eficiencia >= 80 ? "#10b981" : "#f97316" }}
                            >
                              {eficiencia}%
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
                      </div>
                    )
                  })}
              </div>
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
                  No hay historial disponible
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
          <div style={{ marginTop: "2rem" }}>
            <h2 className={styles.sectionTitle}>Métricas Avanzadas</h2>

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
                  {backups.length}
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
                  {backups.reduce((sum, b) => sum + (b.resumen?.totalTicketsEmitidos || 0), 0)}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Histórico</p>
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
                  {metricas.promedioHistorico}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Promedio Diario</p>
              </div>
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
