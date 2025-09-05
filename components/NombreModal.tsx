"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NombreModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (nombre?: string) => void
}

export default function NombreModal({ isOpen, onClose, onConfirm }: NombreModalProps) {
  const [nombre, setNombre] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(nombre.trim() || undefined)
    setNombre("")
  }

  const handleClose = () => {
    setNombre("")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Generar Ticket con Nombre</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="nombre" className="text-lg font-semibold">
              Nombre (opcional)
            </Label>
            <Input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingrese su nombre"
              className="mt-2 h-12 text-lg"
              maxLength={50}
            />
          </div>

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12 text-lg bg-transparent"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-12 text-lg bg-red-600 hover:bg-red-700">
              Generar Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
