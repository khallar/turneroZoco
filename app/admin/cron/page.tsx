"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function CronAdminPage() {
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const probarCron = async () => {
    setTestando(true)
    setResultado(null)
    setError(null)

    try {
      console.log("🧪 Probando endpoint de cron...")
      const response = await fetch("/api/cron/backup-diario", {
        method: "GET",
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
                    <span className="font-semibold text-green-600">21:00 hs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Días:</span>
                    <span className="font-semibold">Lunes a Sábado</span>
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
                Ejecuta el endpoint manualmente para verificar que funciona correctamente antes de esperar a las 21:00
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
                    <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded">
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

        {/* Guía de Verificación */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Cómo Verificar que el Cron Está Activo</CardTitle>
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
                    <h4 className="font-semibold mb-1">Busca "Cron Jobs"</h4>
                    <p className="text-sm text-gray-600">
                      En el menú lateral, busca la sección "Cron Jobs" o "Settings → Cron Jobs"
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Verifica el Estado</h4>
                    <p className="text-sm text-gray-600">
                      Deberías ver:{" "}
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">/api/cron/backup-diario</span> con
                      estado "Active"
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Revisa los Logs</h4>
                    <p className="text-sm text-gray-600">
                      Ve a Functions → Busca <span className="font-mono">/api/cron/backup-diario</span> → Revisa los
                      logs de ejecución
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">⚠️ Si NO aparece el Cron Job:</h4>
                <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                  <li>
                    Verifica que <span className="font-mono">vercel.json</span> esté en la raíz del proyecto
                  </li>
                  <li>Asegúrate de que el archivo se haya incluido en el último deploy</li>
                  <li>Haz un nuevo deploy y espera 2-3 minutos</li>
                  <li>Refresca el Dashboard de Vercel</li>
                </ol>
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
