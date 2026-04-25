// Public service worker for PWA support
const IS_LOCALHOST =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "[::1]"

if (IS_LOCALHOST) {
  self.addEventListener("install", () => {
    self.skipWaiting()
  })

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))),
        )
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim()),
    )
  })
} else {
const CACHE_NAME = "cerebra-cache-v2"
const RUNTIME_CACHE = "cerebra-runtime"

// Assets to cache on install
const ASSETS_TO_CACHE = ["/", "/manifest.json", "/offline.html"]

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching app shell")
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.log("Cache install failed:", err)
      })
    }),
  )
  self.skipWaiting()
})

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Handle different request types
  if (request.destination === "document") {
    // HTML documents - network first, fallback to cache
    event.respondWith(networkFirstStrategy(request))
  } else if (
    request.destination === "style" ||
    request.destination === "script"
  ) {
    // CSS and JS - cache first
    event.respondWith(cacheFirstStrategy(request))
  } else if (request.destination === "image") {
    // Images - cache first with 30 day expiry
    event.respondWith(cacheFirstStrategy(request, 30 * 24 * 60 * 60 * 1000))
  } else {
    // Others - network first
    event.respondWith(networkFirstStrategy(request))
  }
})

// Network first strategy - try network first, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
      return response
    }
  } catch (error) {
    console.log("Fetch failed, trying cache:", error)
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // If nothing cached, return offline page
  return caches.match("/offline.html") || new Response("Offline")
}

// Cache first strategy - try cache first, fallback to network
async function cacheFirstStrategy(request, maxAge = null) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)

  if (cached) {
    // Check if cached response is still valid
    if (maxAge === null || isResponseFresh(cached, maxAge)) {
      return cached
    }
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log("Network request failed:", error)
    return cached || new Response("Offline")
  }
}

// Check if cached response is still fresh
function isResponseFresh(response, maxAge) {
  const cacheDate = response.headers.get("date")
  if (!cacheDate) return true

  const cachedTime = new Date(cacheDate).getTime()
  const now = Date.now()
  return now - cachedTime < maxAge
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
}
