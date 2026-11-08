// Offline fallback: any page that fails to load sends the visitor to the offline page,
// which <OfflineCache /> saves with its scripts, stylesheets, fonts and images (`offline` and `offline-icons` caches).
const page = new URL(location.href).searchParams.get('page')

const assetDestinations = ['script', 'style', 'font', 'image']

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (!page || request.method !== 'GET') {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => offline(request)))
    return
  }

  // any origin: icons come from the CDN
  if (assetDestinations.includes(request.destination)) {
    event.respondWith(fetch(request).catch(() => cached(request)))
  }
})

async function offline(request) {
  if (new URL(request.url).pathname !== page) {
    return Response.redirect(new URL(page, location.origin), 302)
  }

  return await cached(request)
}

async function cached(request) {
  // ignoreSearch: asset urls may carry a deployment id (?dpl=…) the saved copy lacks,
  // except optimized images, which differ only by query (/_next/image?url=…&w=…).
  // ignoreVary: CDN icons vary on Origin, which the saving fetch sent and an <img> doesn't
  const response = await caches.match(request, {
    ignoreSearch: new URL(request.url).pathname !== '/_next/image',
    ignoreVary: true,
  })

  return response ?? Response.error()
}
