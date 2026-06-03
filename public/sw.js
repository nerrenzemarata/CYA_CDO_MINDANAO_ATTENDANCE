const CACHE = 'cya-attendance-v2'

const PRECACHE = [
  '/',
  '/USTP',
  '/XU',
  '/Staffer',
  '/UC',
  '/CYA High',
  '/Butuan',
  '/all',
]

const API_CACHE = 'cya-api-v2'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== API_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // API calls: cache-first (show instantly), then update in background
  if (url.pathname.startsWith('/api/members')) {
    event.respondWith(
      caches.open(API_CACHE).then(async cache => {
        const cached = await cache.match(request)
        const networkFetch = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone())
          return res
        }).catch(() => null)

        // Return cache immediately if available, else wait for network
        if (cached) {
          event.waitUntil(networkFetch)
          return cached
        }
        return networkFetch || new Response('[]', { headers: { 'Content-Type': 'application/json' } })
      })
    )
    return
  }

  // Pages: network-first, fall back to cache
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
