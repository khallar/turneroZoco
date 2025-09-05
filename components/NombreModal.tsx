"use client"

import { CardContent } from "@/components/ui/card"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface NombreModalProps {
  isOpen: boolean
  onConfirm: (nombre: string) => void
  onCancel: () => void
  generandoTicket: boolean
}

export default function NombreModal({ isOpen, onConfirm, onCancel, generandoTicket }: NombreModalProps) {
  const [nombre, setNombre] = useState("")

  const handleConfirm = () => {
    if (nombre.trim() !== "") {
      onConfirm(nombre)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ingrese su nombre</AlertDialogTitle>
          <AlertDialogDescription>Por favor, ingrese su nombre para generar el ticket.</AlertDialogDescription>
        </AlertDialogHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={generandoTicket} />
          </div>
        </CardContent>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={generandoTicket}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={generandoTicket} onClick={handleConfirm}>
            {generandoTicket ? "Generando..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
