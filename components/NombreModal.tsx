"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, User } from "lucide-react"

interface NombreModalProps {
  onConfirm: (nombre: string) => void
  onCancel: () => void
}

export function NombreModal({ onConfirm, onCancel }: NombreModalProps) {
  const [nombre, setNombre] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nombre.trim()) {
      onConfirm(nombre.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ingrese su nombre
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Ej: Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={50}
                autoFocus
                className="text-lg"
              />
              <p className="text-sm text-gray-500">Este nombre aparecerá en su ticket y será usado para llamarlo</p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700" disabled={!nombre.trim()}>
                Generar Ticket
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
