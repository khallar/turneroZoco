"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Gift, Save, TrendingUp } from "lucide-react"
import type { ConfiguracionPremios, Premio } from "@/lib/premios"
import styles from "./page.module.css"

export default function PremiosPage() {
  const [config, setConfig] = useState<ConfiguracionPremios | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null)
  const [estadisticas, setEstadisticas] = useState<any>(null)

  useEffect(() => {
    cargarPremios()
    cargarEstadisticas()
  }, [])

  const cargarPremios = async () => {
    try {
      const response = await fetch("/api/premios")
      const data = await response.json()

      if (data.success) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error("Error al cargar premios:", error)
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch("/api/premios?action=estadisticas")
      const data = await response.json()

      if (data.success) {
        setEstadisticas(data.estadisticas)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    }
  }

  const guardarPremios = async () => {
    if (!config) return

    setGuardando(true)
    setMensaje(null)

    try {
      const response = await fetch("/api/premios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })

      const data = await response.json()

      if (data.success) {
        setMensaje({ tipo: "success", texto: "Premios guardados exitosamente" })
        await cargarEstadisticas()
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al guardar" })
      }
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error de conexión" })
    } finally {
      setGuardando(false)
    }
  }

  const actualizarPremio = (index: number, campo: keyof Premio, valor: any) => {
    if (!config) return

    const nuevosPremios = [...config.premios]
    nuevosPremios[index] = { ...nuevosPremios[index], [campo]: valor }

    setConfig({ ...config, premios: nuevosPremios })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        {/* Header */}
        <div className={styles.header}>
          <img src="/logo-rojo.png" alt="ZOCO" className={styles.logo} />
          <h1 className={styles.title}>Configuración de Premios</h1>
          <p className={styles.subtitle}>Configura los premios diarios para tus clientes</p>
        </div>

        {/* Mensaje de feedback */}
        {mensaje && (
          <div
            className={`${styles.message} ${mensaje.tipo === "success" ? styles.messageSuccess : styles.messageError}`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Estadísticas */}
        {estadisticas && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <Gift className={`${styles.statIcon} ${styles.statIconPurple}`} />
              <div className={styles.statValue}>{estadisticas.totalPremiosConfigurados}</div>
              <p className={styles.statLabel}>Premios Activos</p>
            </div>
            <div className={styles.statCard}>
              <TrendingUp className={`${styles.statIcon} ${styles.statIconGreen}`} />
              <div className={styles.statValue}>{estadisticas.totalGanadores}</div>
              <p className={styles.statLabel}>Ganadores Hoy</p>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {estadisticas.numerosGanadores.length > 0
                  ? estadisticas.numerosGanadores[estadisticas.numerosGanadores.length - 1]
                  : "-"}
              </div>
              <p className={styles.statLabel}>Último Ganador</p>
            </div>
          </div>
        )}

        {/* Configuración de Premios */}
        <div>
          {config?.premios.map((premio, index) => (
            <div key={premio.id} className={styles.premioCard}>
              <div className={styles.premioHeader}>
                <span className={styles.premioTitle}>
                  <Gift className="h-6 w-6" />
                  Premio {index + 1}
                </span>
                <Switch
                  checked={premio.activo}
                  onCheckedChange={(checked) => actualizarPremio(index, "activo", checked)}
                />
              </div>
              <div className={styles.premioContent}>
                {/* Mensaje del Premio */}
                <div className={styles.formGroup}>
                  <label htmlFor={`mensaje-${index}`} className={styles.label}>
                    Mensaje del Premio
                  </label>
                  <textarea
                    id={`mensaje-${index}`}
                    value={premio.mensaje}
                    onChange={(e) => actualizarPremio(index, "mensaje", e.target.value)}
                    placeholder="Ej: ¡Felicitaciones! Ganaste un 10% de descuento"
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                {/* Tipo de Premio */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo de Premio</label>
                  <div className={styles.tipoGrid}>
                    <button
                      onClick={() => actualizarPremio(index, "tipo", "aleatorio")}
                      className={`${styles.tipoButton} ${premio.tipo === "aleatorio" ? styles.tipoButtonActive : ""}`}
                    >
                      <div className={styles.tipoEmoji}>🎲</div>
                      <div className={styles.tipoTitle}>Aleatorio</div>
                      <div className={styles.tipoDesc}>5% de probabilidad</div>
                    </button>
                    <button
                      onClick={() => actualizarPremio(index, "tipo", "numero_especifico")}
                      className={`${styles.tipoButton} ${premio.tipo === "numero_especifico" ? styles.tipoButtonActive : ""}`}
                    >
                      <div className={styles.tipoEmoji}>🎯</div>
                      <div className={styles.tipoTitle}>Número Específico</div>
                      <div className={styles.tipoDesc}>Ticket exacto</div>
                    </button>
                  </div>
                </div>

                {/* Número Específico */}
                {premio.tipo === "numero_especifico" && (
                  <div className={styles.formGroup}>
                    <label htmlFor={`numero-${index}`} className={styles.label}>
                      Número de Ticket Ganador
                    </label>
                    <input
                      id={`numero-${index}`}
                      type="number"
                      min="1"
                      value={premio.numeroEspecifico || ""}
                      onChange={(e) => actualizarPremio(index, "numeroEspecifico", Number.parseInt(e.target.value))}
                      placeholder="Ej: 50"
                      className={styles.input}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Botones de Acción */}
          <div className={styles.actionGrid}>
            <button
              onClick={guardarPremios}
              disabled={guardando}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              {guardando ? (
                <>
                  <div className={styles.spinner} style={{ width: "1.25rem", height: "1.25rem", margin: 0 }}></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Guardar Configuración
                </>
              )}
            </button>

            <a href="/admin" className={`${styles.button} ${styles.buttonSecondary}`}>
              <ArrowLeft className="h-5 w-5" />
              Volver al Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
