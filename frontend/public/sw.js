// Farm Buddy Service Worker — full offline PWA support
const CACHE_NAME = 'farmbuddy-v3'
const API_CACHE = 'farmbuddy-api-v1'

// Static assets to pre-cache for offline shell
const SHELL_URLS = ['/', '/chat', '/dashboard', '/marketplace', '/services', '/profile']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API calls: network-first, cache fallback for GET requests
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Cache successful GET responses for offline use
            if (response.ok) {
              const clone = response.clone()
              caches.open(API_CACHE).then((cache) => cache.put(event.request, clone))
            }
            return response
          })
          .catch(() => caches.match(event.request))
      )
    } else {
      // POST/PUT — network only, but if offline return a helpful error
      event.respondWith(
        fetch(event.request).catch(() =>
          new Response(JSON.stringify({ error: 'offline', message: 'You are offline. This action requires internet.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    }
    return
  }

  // Static assets: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        // Cache static assets on first load
        if (response.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.woff2'))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    }).catch(() => {
      // Offline fallback — serve app shell for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/')
      }
    })
  )
})
