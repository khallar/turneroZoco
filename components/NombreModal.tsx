"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Ticket, X, Check } from "lucide-react"

interface NombreModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (nombre: string) => void
  nombre: string
  proximoNumero: number
  isGenerating: boolean
}

export function NombreModal({
  isOpen,
  onClose,
  onConfirm,
  nombre: nombreInicial,
  proximoNumero,
  isGenerating,
}: NombreModalProps) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [error, setError] = useState("")

  useEffect(() => {
    setNombre(nombreInicial)
    setError("")
  }, [nombreInicial, isOpen])

  const handleConfirm = () => {
    const nombreTrimmed = nombre.trim()

    if (!nombreTrimmed) {
      setError("El nombre es requerido")
      return
    }

    if (nombreTrimmed.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres")
      return
    }

    if (nombreTrimmed.length > 50) {
      setError("El nombre no puede exceder 50 caracteres")
      return
    }

    // Validar caracteres especiales básicos
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-.]+$/
    if (!regex.test(nombreTrimmed)) {
      setError("El nombre contiene caracteres no válidos")
      return
    }

    setError("")
    onConfirm(nombreTrimmed)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isGenerating) {
      handleConfirm()
    }
    if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl animate-fade-in">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2 text-blue-800">
              <Ticket className="h-6 w-6" />
              Confirmar Ticket
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isGenerating}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Número de Ticket */}
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">#{proximoNumero.toString().padStart(3, "0")}</div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Próximo Ticket
            </Badge>
          </div>

          {/* Campo de Nombre */}
          <div className="space-y-2">
            <Label htmlFor="modal-nombre" className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Nombre del Cliente
            </Label>
            <Input
              id="modal-nombre"
              type="text"
              placeholder="Ingrese el nombre completo"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setError("")
              }}
              onKeyPress={handleKeyPress}
              className={`text-lg p-4 border-2 ${
                error ? "border-red-300 focus:border-red-500" : "border-blue-200 focus:border-blue-500"
              }`}
              disabled={isGenerating}
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm flex items-center gap-1">
                <X className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Información del Ticket</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <p>• Número: #{proximoNumero.toString().padStart(3, "0")}</p>
              <p>
                • Fecha:{" "}
                {new Date().toLocaleDateString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p>
                • Hora:{" "}
                {new Date().toLocaleTimeString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={onClose} disabled={isGenerating} className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!nombre.trim() || isGenerating || !!error}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar
                </>
              )}
            </Button>
          </div>

          {/* Consejos */}
          <div className="text-xs text-gray-500 text-center">
            <p>💡 Consejo: Asegúrese de que el nombre esté escrito correctamente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
