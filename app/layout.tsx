import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Turnos ZOCO",
  description: "Sistema de gestión de turnos para ZOCO",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="bg-white">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>{children}</body>
    </html>
  )
}
