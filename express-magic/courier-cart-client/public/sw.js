const ASSET_CACHE = 'fastship-assets-v2'
const CACHE_PREFIX = 'fastship-assets-'
const MAX_CACHED_ASSETS = 160

const isCacheableAsset = (request) => {
  if (request.method !== 'GET') return false

  const url = new URL(request.url)
  return url.origin === self.location.origin && url.pathname.startsWith('/assets/')
}

const isValidAssetResponse = (response) => {
  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  return response.ok && !contentType.includes('text/html')
}

const trimAssetCache = async (cache) => {
  const keys = await cache.keys()
  const excess = keys.length - MAX_CACHED_ASSETS
  if (excess > 0) await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)))
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(CACHE_PREFIX) && key !== ASSET_CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  if (!isCacheableAsset(event.request)) return

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached && isValidAssetResponse(cached)) return cached
      if (cached) await cache.delete(event.request)

      const response = await fetch(event.request)
      if (isValidAssetResponse(response)) {
        await cache.put(event.request, response.clone())
        void trimAssetCache(cache)
      }
      return response
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WARM_ASSETS' || !Array.isArray(event.data.assets)) return

  event.waitUntil(
    caches.open(ASSET_CACHE).then(async (cache) => {
      await Promise.allSettled(
        event.data.assets.map(async (assetUrl) => {
          const url = new URL(assetUrl, self.location.origin)
          if (url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return
          if (await cache.match(url.href)) return

          const response = await fetch(url.href, { credentials: 'same-origin' })
          if (isValidAssetResponse(response)) await cache.put(url.href, response)
        }),
      )
      await trimAssetCache(cache)
    }),
  )
})
