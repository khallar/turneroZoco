"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, X } from "lucide-react"

interface NombreModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (nombre: string) => void
}

export function NombreModal({ isOpen, onClose, onSubmit }: NombreModalProps) {
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(nombre.trim())
      setNombre("")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setNombre("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <User className="h-5 w-5 mr-2 text-red-600" />
            Solicitar Turno
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium">
              Ingrese su nombre
            </Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full"
              maxLength={50}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500">Máximo 50 caracteres</p>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-transparent"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700" disabled={!nombre.trim() || loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Generar Turno
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
