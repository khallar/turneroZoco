"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, X, ArrowRight, AlertCircle, Edit3 } from "lucide-react"

interface NombreModalProps {
  isOpen: boolean
  onConfirm: (nombre: string) => void
  onCancel: () => void
  generandoTicket?: boolean
}

export default function NombreModal({ isOpen, onConfirm, onCancel, generandoTicket = false }: NombreModalProps) {
  const [nombre, setNombre] = useState("Cliente ZOCO")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && mounted) {
      setNombre("Cliente ZOCO")
      // Enfocar el input después de un pequeño delay
      setTimeout(() => {
        const input = document.getElementById("nombre-input")
        if (input) {
          input.focus()
          // Seleccionar todo el texto para facilitar el cambio
          ;(input as HTMLInputElement).select()
        }
      }, 100)
    }
  }, [isOpen, mounted])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (generandoTicket) return // Evitar doble envío

    const nombreFinal = nombre.trim() || "Cliente ZOCO"
    onConfirm(nombreFinal)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !generandoTicket) {
      onCancel()
    }
  }

  if (!isOpen || !mounted) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-red-500 opacity-10 animate-pulse"></div>
      <Card className="w-full max-w-lg bg-white border-8 border-red-500 shadow-2xl animate-scaleIn relative max-h-[90vh] overflow-y-auto">
        {/* Indicador parpadeante */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold animate-bounce mx-0">
          {generandoTicket ? "¡GENERANDO TICKET!" : "¡ESCRIBA SU NOMBRE AQUÍ!"}
        </div>

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-red-50 to-orange-50 border-b-4 border-red-200">
          <CardTitle className="flex items-center gap-3 text-red-700 font-black text-2xl">
            <User className="h-8 w-8" />
            {generandoTicket ? "GENERANDO..." : "PASO 1: SU NOMBRE"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500" disabled={generandoTicket}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="pt-6 pb-6 px-4 md:px-6">
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            {/* SECCIÓN DEL NOMBRE - MUY DESTACADA */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-bold text-lg">¡MUY IMPORTANTE!</span>
                </div>
              </div>

              <Label htmlFor="nombre-input" className="text-2xl font-black text-center block mb-4 text-gray-800">
                👤 ESCRIBA SU NOMBRE COMPLETO:
              </Label>

              <div className="relative">
                <Edit3 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-blue-500 z-10" />
                <Input
                  id="nombre-input"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="👆 HAGA CLIC AQUÍ Y ESCRIBA SU NOMBRE"
                  className="text-2xl p-8 pl-14 border-4 border-blue-500 focus:border-red-500 rounded-xl bg-white shadow-lg font-bold text-center"
                  maxLength={50}
                  disabled={generandoTicket}
                />
                <div className="absolute -right-2 -top-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                  ESCRIBA AQUÍ
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-lg font-bold text-blue-700 bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                  📢 Su nombre aparecerá en pantalla cuando sea llamado
                </p>
                <p className="text-sm text-gray-600 mt-2">Ejemplo: "María González", "Juan Pérez", etc.</p>
              </div>
            </div>

            {generandoTicket && (
              <div className="text-center bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-green-700 font-bold">Generando su ticket...</p>
                <p className="text-sm text-green-600">Por favor espere un momento</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 text-lg py-6 border-2 border-gray-300 hover:bg-gray-50 bg-transparent"
                disabled={generandoTicket}
              >
                ❌ Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-2 text-xl py-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center justify-center gap-3 shadow-lg transform transition-transform hover:scale-105"
                disabled={generandoTicket}
              >
                {generandoTicket ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    GENERANDO...
                  </>
                ) : (
                  <>
                    ✅ GENERAR TICKET
                    <ArrowRight className="h-6 w-6" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
