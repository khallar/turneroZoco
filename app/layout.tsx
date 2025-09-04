import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Atención - ZOCO",
  description: "Sistema de turnos y atención al cliente",
    generator: 'v0.app'
}

function SearchParamsWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Cargando...</div>}>{children}</Suspense>
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SearchParamsWrapper>{children}</SearchParamsWrapper>
      </body>
    </html>
  )
}
