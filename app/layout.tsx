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
    <html lang="es" style={{ backgroundColor: "#ffffff" }}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { 
              background-color: #ffffff !important; 
              color: #111827 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              min-height: 100vh;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `,
          }}
        />
      </head>
      <body
        className={`${inter.className} antialiased bg-white text-gray-900 min-h-screen`}
        style={{ backgroundColor: "#ffffff", color: "#111827", minHeight: "100vh" }}
      >
        {children}
      </body>
    </html>
  )
}
