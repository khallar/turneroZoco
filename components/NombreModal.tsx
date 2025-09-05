"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NombreModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  nombre: string
  setNombre: (nombre: string) => void
}

export default function NombreModal({ isOpen, onClose, onSubmit, nombre, setNombre }: NombreModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && mounted) {
      setNombre("Cliente ZOCO")
      // Enfocar el input después de un pequeño delay
      setTimeout(() => {
        const input = document.getElementById("modalNombre")
        if (input) {
          input.focus()
          // Seleccionar todo el texto para facilitar el cambio
          ;(input as HTMLInputElement).select()
        }
      }, 100)
    }
  }, [isOpen, mounted])

  if (!isOpen || !mounted) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-red-500 opacity-10 animate-pulse"></div>
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Generar Nuevo Ticket</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="modalNombre">Nombre del Cliente</Label>
            <Input
              id="modalNombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingrese su nombre"
              onKeyPress={(e) => e.key === "Enter" && nombre.trim() && onSubmit()}
              autoFocus
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={!nombre.trim()} className="flex-1 bg-red-600 hover:bg-red-700">
              Generar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
