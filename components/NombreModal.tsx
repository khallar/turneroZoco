"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NombreModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (nombre: string) => void
  defaultName?: string
}

export function NombreModal({ isOpen, onClose, onSave, defaultName = "" }: NombreModalProps) {
  const [nombre, setNombre] = useState(defaultName)

  const handleSave = () => {
    onSave(nombre)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ingresa tu Nombre</DialogTitle>
          <DialogDescription>Por favor, ingresa tu nombre para que podamos llamarte.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="col-span-3"
              placeholder="Ej: Juan Pérez"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={!nombre.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
