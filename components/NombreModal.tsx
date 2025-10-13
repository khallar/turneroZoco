"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Ticket } from "lucide-react"

interface NombreModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (nombre: string) => void
  loading?: boolean
}

export function NombreModal({ isOpen, onClose, onConfirm, loading = false }: NombreModalProps) {
  const [nombre, setNombre] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(nombre.trim() || "Cliente ZOCO")
    setNombre("")
  }

  const handleClose = () => {
    if (!loading) {
      setNombre("")
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scaleIn">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>

          <div className="relative z-10">
            <div className="bg-white/20 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Ingresa tu nombre para generar el ticket</h3>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="nombre" className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-5 w-5 text-red-600" />
                Nombre (opcional)
              </Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Ingrese su nombre aquí..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
                maxLength={50}
                className="text-lg py-3 px-4 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-red-500 transition-colors"
              />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <span className="text-blue-500">💡</span>
                  Si no ingresas un nombre, se usará "Cliente ZOCO"
                </p>
              </div>
            </div>

            {/* Botón único verde */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  Generando Ticket...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Ticket className="h-6 w-6" />
                  GENERAR TICKET
                </div>
              )}
            </Button>

            {/* Botón cancelar discreto */}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
