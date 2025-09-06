"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, X } from "lucide-react"

interface NombreModalProps {
  isOpen: boolean
  onConfirm: (nombre: string) => void
  onCancel: () => void
  generandoTicket?: boolean
}

export default function NombreModal({ isOpen, onConfirm, onCancel, generandoTicket = false }: NombreModalProps) {
  const [nombre, setNombre] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nombre.trim()) {
      onConfirm(nombre.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="bg-blue-600 text-white relative">
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-white hover:bg-blue-700"
            disabled={generandoTicket}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-center text-xl flex items-center justify-center gap-2">
            <User className="h-6 w-6" />
            Ingrese su Nombre
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre" className="text-sm font-medium text-gray-700">
                Nombre completo
              </Label>
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese su nombre completo"
                className="mt-1"
                maxLength={50}
                disabled={generandoTicket}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nombre aparecerá en su ticket y será usado para llamarlo
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="flex-1 bg-transparent"
                disabled={generandoTicket}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!nombre.trim() || generandoTicket}
              >
                {generandoTicket ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generando...
                  </>
                ) : (
                  "Generar Ticket"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              💡 <strong>Consejo:</strong> Use su nombre completo para evitar confusiones al ser llamado
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { NombreModal }
