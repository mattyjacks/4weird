// 4weird service worker (Next.js app shell).
//
// Policy: navigations are NETWORK-ONLY (never cached, never served from
// cache except the offline fallback below). Caching versioned HTML shells
// serves stale markup that references old hashed `/_next/static/` chunks,
// which is exactly the "preloaded CSS but not used" console spam after a
// deploy. Only immutable same-origin GET assets are cached.
//
// Bump CACHE_NAME on every deploy that changes cached assets so old caches
// are purged in `activate` instead of lingering in visitors' browsers.
const CACHE_NAME = '4weird-v12-cache';
const ASSETS_TO_CACHE = [
  './',
  './games',
  './academy',
  './pricing',
  './accessibility',
  './privacy',
  './styles.css',
  './components.js',
  './script.js',
  './manifest.webmanifest'
];

// Install: pre-cache the shell. Each asset is added independently so one
// 404 can never reject the whole install (a rejected install leaves the
// previous worker; and its stale caches; stuck in place forever).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => null)),
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback for assets,
// network-only for navigations (see file header for why).
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS (ignore chrome-extension schemes, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  if (event.request.method !== 'GET') {
    return;
  }
  if (event.request.cache === 'no-store') {
    return;
  }
  if (event.request.headers.has('range')) {
    return;
  }
  const requestUrl = new URL(event.request.url);
  // Next.js Server Component payloads are navigational data, not app-shell
  // assets. Let the browser own these requests so a cache miss cannot turn a
  // route transition into an invalid `undefined` service-worker response.
  if (requestUrl.searchParams.has('_rsc')) {
    return;
  }
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/auth/') || requestUrl.pathname === '/account' || requestUrl.pathname.startsWith('/protected')) {
    return;
  }

  // Navigations (HTML pages): never serve from cache, never write to cache.
  // Offline fallback is the cached home shell; without it, settle to a
  // Response so respondWith never resolves to `undefined`.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(new URL('/', self.location.origin).toString())
          .then((home) => home || Response.error());
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and cache it for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // respondWith must always settle to a Response. Returning undefined
          // here caused "Failed to convert value to Response" in production.
          return Response.error();
        });
      })
  );
});
