"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">⏰ Administración de Cron Jobs</h1>
          <p className="text-gray-600">Prueba y verifica el backup automático diario</p>
        </div>

        {/* Navegación */}
        <div className="mb-8">
          <a href="/admin" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
            <ArrowLeft className="h-4 w-4" />
            Volver al Panel Admin
          </a>
        </div>

        {/* Verificación de Variables de Entorno */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Variables de Entorno
              </div>
              <Button onClick={verificarVariables} variant="outline" size="sm" disabled={verificandoEnv}>
                <RefreshCw className={`h-4 w-4 mr-2 ${verificandoEnv ? "animate-spin" : ""}`} />
                {verificandoEnv ? "Verificando..." : "Verificar"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {envInfo ? (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center justify-between">
                    <span>Estado de las Variables</span>
                    <Button onClick={() => setMostrarEnv(!mostrarEnv)} variant="ghost" size="sm">
                      {mostrarEnv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-gray-600">CRON_SECRET:</span>
                      <span
                        className={`font-semibold ${envInfo.entorno?.hasCronSecret ? "text-green-600" : "text-red-600"}`}
                      >
                        {envInfo.entorno?.hasCronSecret ? "✅ Configurado" : "❌ No configurado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-gray-600">KV_REST_API_URL:</span>
                      <span
                        className={`font-semibold ${envInfo.entorno?.hasKvUrl ? "text-green-600" : "text-red-600"}`}
                      >
                        {envInfo.entorno?.hasKvUrl ? "✅ Configurado" : "❌ No configurado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-gray-600">KV_REST_API_TOKEN:</span>
                      <span
                        className={`font-semibold ${envInfo.entorno?.hasKvToken ? "text-green-600" : "text-red-600"}`}
                      >
                        {envInfo.entorno?.hasKvToken ? "✅ Configurado" : "❌ No configurado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">NODE_ENV:</span>
                      <span className="font-mono text-gray-800">{envInfo.entorno?.NODE_ENV || "unknown"}</span>
                    </div>
                  </div>

                  {mostrarEnv && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 mb-2">Información completa (Debug):</p>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                        {JSON.stringify(envInfo, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {!envInfo.entorno?.hasCronSecret && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">⚠️ CRON_SECRET no configurado</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      El endpoint está público porque CRON_SECRET no está configurado. Esto permite pruebas manuales,
                      pero es recomendable configurarlo para producción.
                    </p>
                    <div className="bg-white p-3 rounded">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Para configurar:</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Ve a tu proyecto en Vercel</li>
                        <li>Settings → Environment Variables</li>
                        <li>
                          Agregar: <span className="font-mono">CRON_SECRET</span>
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
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Verificando variables de entorno...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado del Cron */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Estado del Cron Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">📋 Configuración Actual</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Endpoint:</span>
                    <span className="font-mono font-semibold">/api/cron/backup-diario</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Schedule:</span>
                    <span className="font-mono font-semibold">0 0 * * 2-7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horario (Argentina):</span>
                    <span className="font-semibold text-green-600">00:00 hs (medianoche)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Días:</span>
                    <span className="font-semibold">Lunes a Sábado</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seguridad:</span>
                    <span
                      className={`font-semibold ${envInfo?.entorno?.hasCronSecret ? "text-green-600" : "text-orange-600"}`}
                    >
                      {envInfo?.entorno?.hasCronSecret
                        ? "🔒 Protegido con CRON_SECRET"
                        : "🔓 Público (sin CRON_SECRET)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Importante
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• El cron se ejecuta automáticamente en Vercel</li>
                  <li>• Verifica en el Dashboard de Vercel si aparece como "Active"</li>
                  <li>• Los logs se pueden ver en Vercel → Functions</li>
                  <li>• Si no aparece, asegúrate de que vercel.json esté en la raíz</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prueba Manual */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Prueba Manual del Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Ejecuta el endpoint manualmente para verificar que funciona correctamente antes de esperar a las 00:00
                hs.
              </p>

              <Button
                onClick={probarCron}
                disabled={testando}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 text-lg"
              >
                {testando ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Ejecutando prueba...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Ejecutar Backup Manual
                  </div>
                )}
              </Button>

              {/* Resultado Exitoso */}
              {resultado && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />✅ Prueba Exitosa
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className="font-semibold text-green-600">{resultado.success ? "Exitoso" : "Fallido"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mensaje:</span>
                      <span className="font-semibold">{resultado.message}</span>
                    </div>
                    {resultado.ticketsRespaldados !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tickets Respaldados:</span>
                        <span className="font-semibold text-blue-600">{resultado.ticketsRespaldados}</span>
                      </div>
                    )}
                    {resultado.fecha && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha Backup:</span>
                        <span className="font-semibold">{resultado.fecha}</span>
                      </div>
                    )}
                    {resultado.horaEjecucionArgentina && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hora Ejecución:</span>
                        <span className="font-semibold">{resultado.horaEjecucionArgentina}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 bg-white p-3 rounded border border-green-200">
                    <p className="text-xs text-gray-600 mb-2">Respuesta completa (JSON):</p>
                    <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded max-h-48">
                      {JSON.stringify(resultado, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />❌ Error en la Prueba
                  </h3>
                  <p className="text-red-700 text-sm mb-2">{error}</p>
                  <div className="bg-white p-3 rounded border border-red-200">
                    <p className="text-xs text-gray-600 mb-2">Posibles soluciones:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
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
          </CardContent>
        </Card>

        {/* Guía de Verificación en Vercel */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Cómo Configurar CRON_SECRET en Vercel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Ve al Dashboard de Vercel</h4>
                    <p className="text-sm text-gray-600">
                      Abre{" "}
                      <a
                        href="https://vercel.com"
                        target="_blank"
                        className="text-blue-600 hover:underline"
                        rel="noreferrer"
                      >
                        vercel.com
                      </a>{" "}
                      e ingresa a tu proyecto
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Settings → Environment Variables</h4>
                    <p className="text-sm text-gray-600">
                      Busca la sección "Environment Variables" en el menú de Settings
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Agregar Variable</h4>
                    <div className="bg-gray-50 p-3 rounded border mt-2 space-y-2 text-sm">
                      <div>
                        <span className="font-semibold">Name:</span>{" "}
                        <span className="font-mono bg-white px-2 py-1 rounded">CRON_SECRET</span>
                      </div>
                      <div>
                        <span className="font-semibold">Value:</span>{" "}
                        <span className="text-gray-600">Tu clave secreta (ej: "mi-clave-super-secreta-123")</span>
                      </div>
                      <div>
                        <span className="font-semibold">Environments:</span>{" "}
                        <span className="text-gray-600">✓ Production</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Redeploy</h4>
                    <p className="text-sm text-gray-600">
                      Haz un nuevo deploy para que la variable tome efecto (Deployments → ⋯ → Redeploy)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Nota Importante</h4>
                <p className="text-sm text-blue-700">
                  El CRON_SECRET es <strong>opcional</strong>. Si no lo configuras, el endpoint funcionará igual pero
                  será público. Para pruebas está bien, pero para producción se recomienda configurarlo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema de Turnos ZOCO • Versión 6.2</p>
          <p className="mt-1">Develop by: Karim :)</p>
        </div>
      </div>
    </div>
  )
}
