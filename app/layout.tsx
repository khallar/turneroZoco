import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
})

console.log("[v0] Layout loading - Inter font className:", inter.className)
console.log("[v0] Globals.css imported successfully")

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
  console.log("[v0] RootLayout rendering")

  return (
    <html lang="es" className={`${inter.variable} bg-white`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </head>
      <body
        className={`${inter.className} antialiased bg-white text-gray-900 min-h-screen`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  )
}
