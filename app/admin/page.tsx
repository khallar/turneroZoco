"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  RefreshCw,
  Trash2,
  RotateCcw,
  Download,
  History,
  Database,
  CloudOff,
  Cloud,
  Clock,
  CalendarDays,
  FileText,
  Info,
} from "lucide-react"
import { useSistemaEstado } from "@/hooks/useSistemaEstado"

interface BackupSummary {
  fecha: string
  resumen: {
    totalTicketsEmitidos: number
    totalTicketsAtendidos: number
    ticketsPendientes: number
    primerTicket: number
    ultimoTicket: number
    horaInicio: string
    horaBackup: string
  }
  createdAt: string
}

export default function PaginaAdmin() {
  const {
    estado,
    loading,
    error,
    cargarEstado,
    eliminarTodosRegistros,
    reiniciarContadorDiario,
    limpiarDatosAntiguos,
    ultimaSincronizacion,
  } = useSistemaEstado()
  const [isOnline, setIsOnline] = useState(true)
  const [actualizandoDatos, setActualizandoDatos] = useState(false)
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [loadingBackups, setLoadingBackups] = useState(true)
  const [errorBackups, setErrorBackups] = useState<string | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<any | null>(null)
  const [loadingSelectedBackup, setLoadingSelectedBackup] = useState(false)
  const [errorSelectedBackup, setErrorSelectedBackup] = useState<string | null>(null)

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [])

  const actualizarDatosManual = async () => {
    setActualizandoDatos(true)
    try {
      await cargarEstado(true)
      await cargarBackups() // Recargar backups también
    } catch (error) {
      console.error("Error al actualizar datos (Admin):", error)
    } finally {
      setActualizandoDatos(false)
    }
  }

  const handleEliminarTodos = async () => {
    if (confirm("¿Estás seguro de que quieres ELIMINAR TODOS los registros del día actual? Se creará un backup.")) {
      try {
        await eliminarTodosRegistros()
        alert("Todos los registros han sido eliminados y se ha creado un backup.")
        await cargarBackups() // Recargar la lista de backups después de eliminar
      } catch (err) {
        alert(`Error al eliminar registros: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const handleReiniciarContador = async () => {
    if (confirm("¿Estás seguro de que quieres REINICIAR el contador diario? Se creará un backup.")) {
      try {
        await reiniciarContadorDiario()
        alert("Contador diario reiniciado y se ha creado un backup.")
        await cargarBackups() // Recargar la lista de backups después de reiniciar
      } catch (err) {
        alert(`Error al reiniciar contador: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const handleLimpiarDatosAntiguos = async () => {
    if (confirm("¿Estás seguro de que quieres LIMPIAR los datos antiguos (más de 30 días)?")) {
      try {
        await limpiarDatosAntiguos()
        alert("Datos antiguos limpiados exitosamente.")
        await cargarBackups() // Recargar la lista de backups después de limpiar
      } catch (err) {
        alert(`Error al limpiar datos antiguos: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const cargarBackups = async () => {
    setLoadingBackups(true)
    setErrorBackups(null)
    try {
      const response = await fetch("/api/backup", { cache: "no-store" })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar backups")
      }
      const data: BackupSummary[] = await response.json()
      setBackups(data)
    } catch (err) {
      console.error("Error al cargar backups:", err)
      setErrorBackups(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingBackups(false)
    }
  }

  const verDetalleBackup = async (fecha: string) => {
    setLoadingSelectedBackup(true)
    setErrorSelectedBackup(null)
    setSelectedBackup(null)
    try {
      const response = await fetch(`/api/backup?fecha=${fecha}`, { cache: "no-store" })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar detalle del backup")
      }
      const data = await response.json()
      setSelectedBackup(data)
    } catch (err) {
      console.error("Error al cargar detalle del backup:", err)
      setErrorSelectedBackup(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSelectedBackup(false)
    }
  }

  const descargarBackup = (backup: any) => {
    const filename = `backup-zoco-${backup.fecha}.json`
    const jsonStr = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    cargarBackups()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-base md:text-lg text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4 md:mb-8">
          <div className="mb-3 md:mb-6">
            <img
              src="/logo-rojo.png"
              alt="Logo Sistema de Atención"
              className="h-16 md:h-24 mx-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(6932%) hue-rotate(359deg) brightness(94%) contrast(112%)",
              }}
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-1 md:mb-2">Panel de Administración</h1>
          <p className="text-sm md:text-lg text-gray-600 mb-3 md:mb-4 px-2">
            Gestión y mantenimiento del sistema de turnos
          </p>

          {/* Información de estado */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span>
                Última sync:{" "}
                {ultimaSincronizacion
                  ? ultimaSincronizacion.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                  : "Nunca"}
              </span>
              {actualizandoDatos && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 ml-1"></div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Cloud className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <span className="text-green-500">Online (Upstash Redis)</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                  <span className="text-red-500">Offline (Upstash Redis)</span>
                </>
              )}
            </div>
          </div>

          {/* Botón de refresh manual */}
          <div className="flex justify-center mb-4">
            <Button
              onClick={actualizarDatosManual}
              disabled={actualizandoDatos}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
            >
              {actualizandoDatos ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar Ahora
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
        </div>

        {/* Acciones Administrativas */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-blue-800 text-base md:text-lg flex items-center gap-2">
              <Database className="h-5 w-5" /> Acciones de Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 md:p-6 pt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleEliminarTodos} className="w-full bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Todos los Registros
              </Button>
              <Button onClick={handleReiniciarContador} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar Contador Diario
              </Button>
            </div>
            <Button
              onClick={handleLimpiarDatosAntiguos}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <History className="mr-2 h-4 w-4" /> Limpiar Datos Antiguos (30+ días)
            </Button>
            <p className="text-xs text-gray-600 mt-2">
              * Las acciones de eliminación y reinicio crearán un backup automático antes de ejecutarse.
            </p>
          </CardContent>
        </Card>

        {/* Resumen del Estado Actual */}
        <Card className="mb-6">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Info className="h-5 w-5" /> Estado Actual del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3 p-3 md:p-6 pt-0">
            <div className="flex justify-between text-sm md:text-base">
              <span>Próximo número a emitir:</span>
              <span className="font-bold text-purple-600">{estado?.numeroActual?.toString().padStart(3, "0")}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span>Total tickets emitidos hoy:</span>
              <span className="font-bold text-blue-600">{estado?.totalAtendidos}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span>Números ya llamados:</span>
              <span className="font-bold text-green-600">{estado?.numerosLlamados}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span>Números en espera:</span>
              <span className="font-bold text-orange-600">{estado?.totalAtendidos - estado?.numerosLlamados}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span>Fecha de inicio de operaciones:</span>
              <span className="font-bold text-gray-700">{estado?.fechaInicio}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span>Último reinicio:</span>
              <span className="font-bold text-gray-700">
                {estado?.ultimoReinicio
                  ? new Date(estado.ultimoReinicio).toLocaleString("es-AR", {
                      timeZone: "America/Argentina/Buenos_Aires",
                    })
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm md:text-base">
              <span>Tickets en memoria (DEBUG):</span>
              <span className="font-bold text-gray-700">{estado?.tickets?.length || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Backups */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-green-800 text-base md:text-lg flex items-center gap-2">
              <History className="h-5 w-5" /> Historial de Backups
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {loadingBackups ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Cargando historial de backups...</p>
              </div>
            ) : errorBackups ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm">
                <strong className="font-bold">Error al cargar backups:</strong>
                <span className="block sm:inline"> {errorBackups}</span>
              </div>
            ) : backups.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">No hay backups disponibles.</p>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div
                    key={backup.fecha}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="flex-1 mb-2 sm:mb-0">
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-blue-600" /> Backup del {backup.fecha}
                      </p>
                      <p className="text-xs text-gray-600 ml-5">
                        Emitidos: {backup.resumen.totalTicketsEmitidos} | Atendidos:{" "}
                        {backup.resumen.totalTicketsAtendidos} | Pendientes: {backup.resumen.ticketsPendientes}
                      </p>
                      <p className="text-xs text-gray-500 ml-5">
                        Creado:{" "}
                        {new Date(backup.createdAt).toLocaleString("es-AR", {
                          timeZone: "America/Argentina/Buenos_Aires",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verDetalleBackup(backup.fecha)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <FileText className="mr-1 h-3 w-3" /> Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => descargarBackup(backup)}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Download className="mr-1 h-3 w-3" /> Descargar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalle de Backup */}
        {selectedBackup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg flex items-center justify-between">
                  Detalle del Backup: {selectedBackup.fecha}
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBackup(null)}>
                    X
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-sm">
                {loadingSelectedBackup ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando detalle del backup...</p>
                  </div>
                ) : errorSelectedBackup ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline"> {errorSelectedBackup}</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base mb-2">Resumen:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Total Tickets Emitidos: {selectedBackup.resumen.totalTicketsEmitidos}</li>
                      <li>Total Tickets Atendidos: {selectedBackup.resumen.totalTicketsAtendidos}</li>
                      <li>Tickets Pendientes: {selectedBackup.resumen.ticketsPendientes}</li>
                      <li>Primer Ticket: {selectedBackup.resumen.primerTicket}</li>
                      <li>Último Ticket: {selectedBackup.resumen.ultimoTicket}</li>
                      <li>Hora de Inicio de Operaciones: {selectedBackup.resumen.horaInicio}</li>
                      <li>
                        Hora de Creación del Backup:{" "}
                        {new Date(selectedBackup.resumen.horaBackup).toLocaleString("es-AR", {
                          timeZone: "America/Argentina/Buenos_Aires",
                        })}
                      </li>
                    </ul>

                    <h3 className="font-semibold text-base mt-4 mb-2">Tickets Detallados:</h3>
                    {selectedBackup.tickets && selectedBackup.tickets.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-gray-50">
                        <ul className="space-y-1">
                          {selectedBackup.tickets.map((ticket: any) => (
                            <li key={ticket.numero} className="flex justify-between items-center text-xs">
                              <span>
                                #{ticket.numero.toString().padStart(3, "0")} - {ticket.nombre}
                              </span>
                              <span className="text-gray-500">
                                {new Date(ticket.timestamp).toLocaleTimeString("es-AR", {
                                  timeZone: "America/Argentina/Buenos_Aires",
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500">No hay tickets detallados en este backup.</p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardContent className="p-4 border-t flex justify-end">
                <Button onClick={() => setSelectedBackup(null)}>Cerrar</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center mt-8 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p>Develop by: Karim :) | Versión 5.0</p>
        </div>
      </footer>
    </div>
  )
}
