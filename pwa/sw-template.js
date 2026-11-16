/* Visa Hunter service worker — generated at build time from pwa/sw-template.js (see vite.config.ts). */
const VERSION = '__VERSION__'
const CACHE = `visa-hunter-${VERSION}`
const RUNTIME = 'visa-hunter-runtime'
const PRECACHE = __PRECACHE__

/**
 * Download the whole game once so it plays offline. On an update, files in assets/ that are
 * already on the device (same content hash in the name = same file) are copied from the old
 * cache instead of downloaded again — only what changed costs bandwidth.
 */
async function precache() {
  const cache = await caches.open(CACHE)
  await Promise.all(
    PRECACHE.map(async (url) => {
      if (url.includes('/assets/')) {
        const old = await caches.match(url)
        if (old) return cache.put(url, old)
      }
      await cache.add(url)
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('visa-hunter-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }
  return response
}

/** Music: media players ask for byte ranges; keep one full copy and answer from it. */
async function audioFromCache(request) {
  const url = request.url
  const hit = await caches.match(url)
  if (hit) return hit
  const response = await fetch(url)
  if (response.ok && response.status === 200) {
    const cache = await caches.open(RUNTIME)
    await cache.put(url, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Account, cloud save and multiplayer always go to the server, never the cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return

  // The page: network first so new versions arrive, the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./', copy))
          return response
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  // Web fonts: keep a copy once loaded.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, RUNTIME))
    return
  }

  if (url.origin === self.location.origin && /\.(ogg|mp3|m4a)$/.test(url.pathname)) {
    event.respondWith(audioFromCache(request))
    return
  }

  // Build files have content hashes in their names, so a cached copy is always right.
  if (url.origin === self.location.origin) event.respondWith(cacheFirst(request, RUNTIME))
})
