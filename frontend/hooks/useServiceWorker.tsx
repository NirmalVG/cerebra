"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const isLocalhost = () =>
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]"

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  )
}

async function registerServiceWorker() {
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

    const updateInterval = window.setInterval(() => {
      registration.update().catch((error) => {
        console.warn("Service Worker update failed:", error)
      })
    }, 60000)

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "activated") {
          console.log("Service Worker updated")
        }
      })
    })

    return () => window.clearInterval(updateInterval)
  } catch (error) {
    console.error("Service Worker registration failed:", error)
  }
}

export function ServiceWorkerProvider() {
  const [, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    let cleanupRegistration: (() => void) | undefined

    if (process.env.NODE_ENV !== "production" || isLocalhost()) {
      unregisterServiceWorkers().catch((error) => {
        console.warn("Service Worker unregister failed:", error)
      })
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    registerServiceWorker().then((cleanup) => {
      cleanupRegistration = cleanup
    })

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      )
      window.removeEventListener("appinstalled", handleInstalled)
      cleanupRegistration?.()
    }
  }, [])

  return null
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      )
    }
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
