"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from "lucide-react"
import styles from "./page.module.css"

export default function CronAdminPage() {
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificandoEnv, setVerificandoEnv] = useState(false)
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [mostrarEnv, setMostrarEnv] = useState(false)

  useEffect(() => {
    verificarVariables()
  }, [])

  const verificarVariables = async () => {
    setVerificandoEnv(true)
    try {
      const response = await fetch("/api/debug")
      if (response.ok) {
        const data = await response.json()
        setEnvInfo(data)
        console.log("🔍 Variables de entorno:", data)
      }
    } catch (error) {
      console.error("Error al verificar variables:", error)
    } finally {
      setVerificandoEnv(false)
    }
  }

  const probarCron = async () => {
    setTestando(true)
    setResultado(null)
    setError(null)

    try {
      console.log("🧪 Probando endpoint de cron...")
      const response = await fetch("/api/cron/backup-diario", {
        method: "GET",
        headers: {
          "x-admin-test": "true",
        },
      })

      const data = await response.json()

      if (response.ok) {
        console.log("✅ Resultado exitoso:", data)
        setResultado(data)
      } else {
        console.error("❌ Error en respuesta:", data)
        setError(data.error || "Error desconocido")
      }
    } catch (error) {
      console.error("❌ Error al probar cron:", error)
      setError(error instanceof Error ? error.message : "Error de conexión")
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>⏰ Administración de Cron Jobs</h1>
          <p className={styles.subtitle}>Prueba y verifica el backup automático diario</p>
        </div>

        {/* Navegación */}
        <div className={styles.nav}>
          <a href="/admin" className={styles.navLink}>
            <ArrowLeft className="h-4 w-4" />
            Volver al Panel Admin
          </a>
        </div>

        {/* Verificación de Variables de Entorno */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardTitleLeft}>
                <AlertTriangle className="h-5 w-5" style={{ color: "#ea580c" }} />
                Variables de Entorno
              </div>
              <button
                onClick={verificarVariables}
                className={`${styles.button} ${styles.buttonOutline} ${styles.buttonSmall}`}
                disabled={verificandoEnv}
              >
                <RefreshCw
                  className={`h-4 w-4 ${verificandoEnv ? styles.spinner : ""}`}
                  style={{ margin: 0, width: "1rem", height: "1rem" }}
                />
                {verificandoEnv ? "Verificando..." : "Verificar"}
              </button>
            </div>
          </div>
          <div className={styles.cardContent}>
            {envInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className={styles.infoBox}>
                  <div className={styles.infoHeader}>
                    <span>Estado de las Variables</span>
                    <button
                      onClick={() => setMostrarEnv(!mostrarEnv)}
                      className={`${styles.button} ${styles.buttonOutline} ${styles.buttonSmall}`}
                    >
                      {mostrarEnv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>CRON_SECRET:</span>
                      <span
                        className={`${styles.infoValue} ${envInfo.entorno?.hasCronSecret ? styles.infoValueSuccess : styles.infoValueError}`}
                      >
                        {envInfo.entorno?.hasCronSecret ? "✅ Configurado" : "❌ No configurado"}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>KV_REST_API_URL:</span>
                      <span
                        className={`${styles.infoValue} ${envInfo.entorno?.hasKvUrl ? styles.infoValueSuccess : styles.infoValueError}`}
                      >
                        {envInfo.entorno?.hasKvUrl ? "✅ Configurado" : "❌ No configurado"}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>KV_REST_API_TOKEN:</span>
                      <span
                        className={`${styles.infoValue} ${envInfo.entorno?.hasKvToken ? styles.infoValueSuccess : styles.infoValueError}`}
                      >
                        {envInfo.entorno?.hasKvToken ? "✅ Configurado" : "❌ No configurado"}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>NODE_ENV:</span>
                      <span className={styles.infoValue}>{envInfo.entorno?.NODE_ENV || "unknown"}</span>
                    </div>
                  </div>

                  {mostrarEnv && (
                    <div className={styles.debugSection}>
                      <p className={styles.debugLabel}>Información completa (Debug):</p>
                      <pre className={styles.debugPre}>{JSON.stringify(envInfo, null, 2)}</pre>
                    </div>
                  )}
                </div>

                {!envInfo.entorno?.hasCronSecret && (
                  <div className={styles.warningBox}>
                    <h4 className={styles.warningTitle}>⚠️ CRON_SECRET no configurado</h4>
                    <p className={styles.warningText}>
                      El endpoint está público porque CRON_SECRET no está configurado. Esto permite pruebas manuales,
                      pero es recomendable configurarlo para producción.
                    </p>
                    <div className={styles.warningInner}>
                      <p className={styles.warningInnerTitle}>Para configurar:</p>
                      <ol className={styles.warningList}>
                        <li>Ve a tu proyecto en Vercel</li>
                        <li>Settings → Environment Variables</li>
                        <li>
                          Agregar: <span className={styles.stepCode}>CRON_SECRET</span>
                        </li>
                        <li>Valor: Un UUID o string aleatorio (ej: "mi-secret-123")</li>
                        <li>Aplica a: Production</li>
                        <li>Hacer redeploy del proyecto</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.loadingCenter}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Verificando variables de entorno...</p>
              </div>
            )}
          </div>
        </div>

        {/* Estado del Cron */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardTitleLeft}>
                <Clock className="h-5 w-5" />
                Estado del Cron Job
              </div>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.blueBox}>
                <h3 className={styles.blueTitle}>📋 Configuración Actual</h3>
                <div className={styles.blueList}>
                  <div className={styles.blueItem}>
                    <span className={styles.blueLabel}>Endpoint:</span>
                    <span className={styles.blueValue}>/api/cron/backup-diario</span>
                  </div>
                  <div className={styles.blueItem}>
                    <span className={styles.blueLabel}>Schedule:</span>
                    <span className={styles.blueValue}>0 0 * * 2-7</span>
                  </div>
                  <div className={styles.blueItem}>
                    <span className={styles.blueLabel}>Horario (Argentina):</span>
                    <span style={{ fontWeight: 600, color: "#16a34a" }}>00:00 hs (medianoche)</span>
                  </div>
                  <div className={styles.blueItem}>
                    <span className={styles.blueLabel}>Días:</span>
                    <span style={{ fontWeight: 600 }}>Lunes a Sábado</span>
                  </div>
                  <div className={styles.blueItem}>
                    <span className={styles.blueLabel}>Seguridad:</span>
                    <span style={{ fontWeight: 600, color: envInfo?.entorno?.hasCronSecret ? "#16a34a" : "#ea580c" }}>
                      {envInfo?.entorno?.hasCronSecret
                        ? "🔒 Protegido con CRON_SECRET"
                        : "🔓 Público (sin CRON_SECRET)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.warningBox}>
                <h3 className={styles.warningTitle}>
                  <AlertTriangle className="h-4 w-4" />
                  Importante
                </h3>
                <ul
                  style={{
                    fontSize: "0.875rem",
                    color: "#78350f",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <li>• El cron se ejecuta automáticamente en Vercel</li>
                  <li>• Verifica en el Dashboard de Vercel si aparece como "Active"</li>
                  <li>• Los logs se pueden ver en Vercel → Functions</li>
                  <li>• Si no aparece, asegúrate de que vercel.json esté en la raíz</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Prueba Manual */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardTitleLeft}>
                <Play className="h-5 w-5" />
                Prueba Manual del Endpoint
              </div>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "#6b7280" }}>
                Ejecuta el endpoint manualmente para verificar que funciona correctamente antes de esperar a las 00:00
                hs.
              </p>

              <button onClick={probarCron} disabled={testando} className={`${styles.button} ${styles.buttonPrimary}`}>
                {testando ? (
                  <>
                    <RefreshCw className="h-5 w-5" style={{ animation: "spin 1s linear infinite" }} />
                    Ejecutando prueba...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Ejecutar Backup Manual
                  </>
                )}
              </button>

              {/* Resultado Exitoso */}
              {resultado && (
                <div className={styles.successBox}>
                  <h3 className={styles.successTitle}>
                    <CheckCircle className="h-5 w-5" />✅ Prueba Exitosa
                  </h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Estado:</span>
                      <span className={styles.infoValueSuccess}>{resultado.success ? "Exitoso" : "Fallido"}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Mensaje:</span>
                      <span style={{ fontWeight: 600 }}>{resultado.message}</span>
                    </div>
                    {resultado.ticketsRespaldados !== undefined && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Tickets Respaldados:</span>
                        <span style={{ fontWeight: 600, color: "#2563eb" }}>{resultado.ticketsRespaldados}</span>
                      </div>
                    )}
                    {resultado.fecha && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Fecha Backup:</span>
                        <span style={{ fontWeight: 600 }}>{resultado.fecha}</span>
                      </div>
                    )}
                    {resultado.horaEjecucionArgentina && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Hora Ejecución:</span>
                        <span style={{ fontWeight: 600 }}>{resultado.horaEjecucionArgentina}</span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "1rem",
                      background: "white",
                      padding: "0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #86efac",
                    }}
                  >
                    <p className={styles.debugLabel}>Respuesta completa (JSON):</p>
                    <pre className={styles.debugPre} style={{ maxHeight: "12rem" }}>
                      {JSON.stringify(resultado, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className={styles.errorBox}>
                  <h3 className={styles.errorTitle}>
                    <XCircle className="h-5 w-5" />❌ Error en la Prueba
                  </h3>
                  <p className={styles.errorText}>{error}</p>
                  <div
                    style={{
                      background: "white",
                      padding: "0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #fca5a5",
                    }}
                  >
                    <p className={styles.debugLabel}>Posibles soluciones:</p>
                    <ul
                      style={{
                        fontSize: "0.75rem",
                        color: "#374151",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <li>• Si el error es "Unauthorized", revisa la sección de Variables de Entorno arriba</li>
                      <li>• Verifica que el endpoint /api/cron/backup-diario existe</li>
                      <li>• Verifica la conexión a Upstash Redis</li>
                      <li>• Revisa los logs del navegador (F12 → Console)</li>
                      <li>• Intenta nuevamente en unos segundos</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Guía de Verificación en Vercel */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>📋 Cómo Configurar CRON_SECRET en Vercel</div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h4>Ve al Dashboard de Vercel</h4>
                  <p>
                    Abre{" "}
                    <a
                      href="https://vercel.com"
                      target="_blank"
                      style={{ color: "#2563eb", textDecoration: "underline" }}
                      rel="noreferrer"
                    >
                      vercel.com
                    </a>{" "}
                    e ingresa a tu proyecto
                  </p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h4>Settings → Environment Variables</h4>
                  <p>Busca la sección "Environment Variables" en el menú de Settings</p>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h4>Agregar Variable</h4>
                  <div className={styles.stepBox}>
                    <div>
                      <span className={styles.stepLabel}>Name:</span>{" "}
                      <span className={styles.stepCode}>CRON_SECRET</span>
                    </div>
                    <div>
                      <span className={styles.stepLabel}>Value:</span>{" "}
                      <span style={{ color: "#6b7280" }}>Tu clave secreta (ej: "mi-clave-super-secreta-123")</span>
                    </div>
                    <div>
                      <span className={styles.stepLabel}>Environments:</span>{" "}
                      <span style={{ color: "#6b7280" }}>✓ Production</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <h4>Redeploy</h4>
                  <p>Haz un nuevo deploy para que la variable tome efecto (Deployments → ⋯ → Redeploy)</p>
                </div>
              </div>
            </div>

            <div className={styles.blueBox} style={{ marginTop: "1rem" }}>
              <h4 className={styles.blueTitle}>💡 Nota Importante</h4>
              <p style={{ fontSize: "0.875rem", color: "#1e40af" }}>
                El CRON_SECRET es <strong>opcional</strong>. Si no lo configuras, el endpoint funcionará igual pero será
                público. Para pruebas está bien, pero para producción se recomienda configurarlo.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Sistema de Turnos ZOCO • Versión 6.2</p>
          <p>Develop by: Karim :)</p>
        </div>
      </div>
    </div>
  )
}
