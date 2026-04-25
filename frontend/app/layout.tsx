// app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Outfit, Space_Mono } from "next/font/google"
import { ServiceWorkerProvider } from "@/hooks/useServiceWorker"
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
    "Explore the universe of human knowledge as a living 3D neural network. An immersive experience of interconnected information.",
  applicationName: "Cerebra",
  authors: [
    {
      name: "Cerebra Team",
      url: "https://cerebra.ai",
    },
  ],
  generator: "Next.js",
  keywords: [
    "knowledge graph",
    "visualization",
    "3D neural network",
    "information exploration",
    "knowledge base",
    "semantic search",
    "AI",
    "data visualization",
  ],
  category: "Education",
  creator: "Cerebra",
  publisher: "Cerebra",
  abstract:
    "A revolutionary way to explore and visualize interconnected knowledge through an interactive 3D neural network interface.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cerebra",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/cerebra-logo.png",
        color: "#050508",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cerebra.ai",
    siteName: "Cerebra",
    title: "Cerebra — Knowledge Visualized",
    description:
      "Explore the universe of human knowledge as a living 3D neural network",
    images: [
      {
        url: "/cerebra-logo.png",
        width: 1200,
        height: 630,
        alt: "Cerebra Knowledge Network",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cerebra — Knowledge Visualized",
    description:
      "Explore the universe of human knowledge as a living 3D neural network",
    images: ["/cerebra-logo.png"],
    creator: "@cerebraai",
  },
  other: {
    "msapplication-TileColor": "#050508",
    "msapplication-config": "/browserconfig.xml",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  colorScheme: "dark",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050508" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerProvider />
        {children}
      </body>
    </html>
  )
}
