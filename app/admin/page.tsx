"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  Trash2,
  RotateCcw,
  BarChart3,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  Download,
  RefreshCw,
  ArrowLeft,
  Activity,
  Timer,
  CheckCircle,
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
  } = useSistemaEstado()

  const [backups, setBackups] = useState<any[]>([])
  const [backupSeleccionado, setBackupSeleccionado] = useState<any>(null)
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())
  const [estadisticasAdmin, setEstadisticasAdmin] = useState<any>(null)

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
      await cargarEstado(true) // Con estadísticas
    } catch (error) {
      console.error("Error al cargar datos admin:", error)
    }
  }

  const cargarBackups = async () => {
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
      // Llamar a la API para eliminar todos los registros
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
      // Llamar a la API para reiniciar el contador
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

    const totalTicketsHistorico = estado.totalAtendidos + backups.length * 50 // Estimación
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
      horasPicoGlobal: "14:00 - 16:00", // Estimación
      ticketsPorHora: Math.round(ticketsPorHora * 10) / 10,
      tiempoPromedioGlobal: Math.round(tiempoPromedioGlobal),
    }
  }

  const estadisticasAdminCalculadas = calcularEstadisticasAdmin()

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando panel de administración...</p>
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
          <p className="text-lg text-gray-600 mb-4">Control total del sistema de atención</p>

          {/* Información de estado */}
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

        {/* Estadísticas Avanzadas */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-indigo-800">
              <BarChart3 className="h-6 w-6" />
              Estadísticas Administrativas Completas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Días Operativos</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{estadisticasAdminCalculadas.diasOperativos}</div>
                <p className="text-xs text-gray-500">Desde inicio</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Promedio Diario</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {estadisticasAdminCalculadas.promedioTicketsPorDia}
                </div>
                <p className="text-xs text-gray-500">Tickets por día</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Productividad</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{estadisticasAdminCalculadas.ticketsPorHora}</div>
                <p className="text-xs text-gray-500">Tickets/hora</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Tiempo Promedio</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {estadisticasAdminCalculadas.tiempoPromedioGlobal}
                </div>
                <p className="text-xs text-gray-500">Min por ticket</p>
              </div>
            </div>

            {/* Estadísticas del servidor si están disponibles */}
            {estadisticas && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">📊 Datos en Tiempo Real del Servidor</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tickets última hora:</span>
                    <p className="font-bold text-blue-600">{estadisticas.ticketsUltimaHora}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio operaciones:</span>
                    <p className="font-bold text-green-600">{estadisticas.horaInicioOperaciones}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Última actividad:</span>
                    <p className="font-bold text-orange-600">
                      {estadisticas.ultimaActividad !== "Sin actividad"
                        ? new Date(estadisticas.ultimaActividad).toLocaleTimeString("es-AR", {
                            timeZone: "America/Argentina/Buenos_Aires",
                          })
                        : "Sin actividad"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Promedio servidor:</span>
                    <p className="font-bold text-purple-600">{estadisticas.promedioTiempoPorTicket.toFixed(1)} min</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controles Administrativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Acciones Principales */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Controles Administrativos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <h4 className="font-semibold text-red-800 mb-2">🗑️ Eliminar Todos los Registros</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Elimina permanentemente todos los tickets y datos del sistema. Esta acción no se puede deshacer.
                </p>
                <Button
                  onClick={() => setMostrarConfirmacionEliminar(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={procesandoAccion}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Todo
                </Button>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="font-semibold text-orange-800 mb-2">🔄 Reiniciar Contador Diario</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Reinicia el contador de tickets del día actual. Los datos se respaldan automáticamente.
                </p>
                <Button
                  onClick={() => setMostrarConfirmacionReinicio(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={procesandoAccion}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Día
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Herramientas */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Herramientas de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-800 mb-2">📥 Exportar Datos</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Descarga un archivo JSON con todos los datos del sistema para respaldo o análisis.
                </p>
                <Button onClick={exportarDatos} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar JSON
                </Button>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-semibold text-green-800 mb-2">🔄 Actualizar Datos</h4>
                <p className="text-sm text-gray-600 mb-3">Fuerza una actualización completa de todos los datos.</p>
                <Button onClick={cargarDatosAdmin} className="bg-green-600 hover:bg-green-700 text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Backups */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Días Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {backups.map((backup, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-2">📅 {backup.fecha}</h4>
                    <p className="text-sm text-gray-600 mb-3">Backup automático del día</p>
                    <Button onClick={() => verBackup(backup.fecha)} variant="outline" size="sm" className="w-full">
                      Ver Detalles
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay backups disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Modal de Confirmación - Eliminar */}
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

        {/* Modal de Confirmación - Reinicio */}
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

        {/* Modal de Backup Seleccionado */}
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
            <p>Develop by: Karim :) | Versión 5.0 | Powered by TURNOS_ZOCO (Upstash Redis)</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
