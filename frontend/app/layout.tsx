// app/layout.tsx
import type { Metadata } from "next"
import { Outfit, Space_Mono } from "next/font/google"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "Cerebra — Knowledge Visualized",
  description:
    "Explore the universe of human knowledge as a living 3D neural network",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
