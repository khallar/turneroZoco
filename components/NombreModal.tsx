"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre (opcional)</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Ingrese su nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
                maxLength={50}
              />
              <p className="text-xs text-gray-500">Si no ingresa un nombre, se usará "Cliente ZOCO"</p>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-transparent"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Generando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
