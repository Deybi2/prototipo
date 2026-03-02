import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Source_Serif_4, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ProveedorAplicacion } from "@/contextos/contexto-aplicacion"

const fontSans = Geist({ subsets: ["latin"], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] })
const fontMono = Geist_Mono({ subsets: ["latin"], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], variable: "--font-mono" })
const fontSerif = Source_Serif_4({ subsets: ["latin"], weight: ["200", "300", "400", "500", "600", "700", "800", "900"], variable: "--font-serif" })

export const metadata: Metadata = {
  title: "Matemáticas en Verso",
  description: "Tu viaje hacia la maestría lógica y la belleza poética.",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fef3c7",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${fontSans.className} ${fontMono.variable} ${fontSerif.variable} font-sans antialiased`}>
        <ProveedorAplicacion>{children}</ProveedorAplicacion>
        <Analytics />
      </body>
    </html>
  )
}
