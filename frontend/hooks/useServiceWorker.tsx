"use client"

import { useEffect, useState } from "react"

export function ServiceWorkerProvider() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.navigator.standalone === true) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    })

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    // Register service worker
    registerServiceWorker()

    return () => {
      window.removeEventListener("beforeinstallprompt", () => {})
      window.removeEventListener("appinstalled", () => {})
    }
  }, [])

  const registerServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Workers are not supported")
      return
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })

      console.log("Service Worker registered:", registration)

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute

      // Listen for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              console.log("Service Worker updated")
              // Show update notification to user if needed
            }
          })
        }
      })
    } catch (error) {
      console.error("Service Worker registration failed:", error)
    }
  }

  const requestInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      console.log(`User response to the install prompt: ${outcome}`)
      setInstallPrompt(null)
    }
  }

  return (
    <div style={{ display: "none" }}>
      {/* Service worker is registered in the background */}
    </div>
  )
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    })
  }, [])

  const canInstall = installPrompt !== null

  const install = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === "accepted") {
        setInstallPrompt(null)
      }
    }
  }

  return { canInstall, install }
}
