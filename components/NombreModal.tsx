"use client"

import type React from "react"
import { useState } from "react"
import styles from "./NombreModal.module.css"

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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerDecor1}></div>
          <div className={styles.headerDecor2}></div>

          <div className={styles.iconWrapper}>
            <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className={styles.headerTitle}>Ingresa tu nombre para generar el ticket</h3>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="nombre" className={styles.label}>
                <svg className={styles.labelIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Nombre (opcional)
              </label>
              <input
                id="nombre"
                type="text"
                placeholder="Ingrese su nombre aquí..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
                maxLength={50}
                className={styles.input}
              />
              <div className={styles.infoBox}>
                <span>💡</span>
                <p className={styles.infoText}>Si no ingresas un nombre, se usará "Cliente ZOCO"</p>
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Generando Ticket...
                </>
              ) : (
                <>
                  <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  GENERAR TICKET
                </>
              )}
            </button>

            <button type="button" onClick={handleClose} disabled={loading} className={styles.cancelButton}>
              Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
