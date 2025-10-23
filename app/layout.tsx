import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "Sistema de Turnos ZOCO",
  description: "Sistema de gestión de turnos para ZOCO",
  generator: "v0.app",
  icons: {
    icon: [{ url: "/logo-rojo.png" }, { url: "/logo-rojo.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/logo-rojo.png" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="bg-white">
      <body className={`${inter.className} antialiased bg-white text-gray-900 min-h-screen`}>{children}</body>
    </html>
  )
}
