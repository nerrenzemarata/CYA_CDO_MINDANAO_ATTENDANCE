const CACHE = 'cya-attendance-v1'

const PRECACHE = [
  '/',
  '/USTP',
  '/XU',
  '/Staffer',
  '/UC',
  '/Butuan',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event

  // API calls: network-first (don't cache)
  if (request.url.includes('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('[]', { headers: { 'Content-Type': 'application/json' } })))
    return
  }

  // Everything else: network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request)),
  )
})
