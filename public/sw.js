const CACHE = 'vespa-tracker-v1';

// Ihned po instalaci nahraď starý SW — bez čekání na zavření záložek
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Převezmi kontrolu nad všemi otevřenými klienty
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pouze GET a stejná origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // HTML → network-first (vždy čerstvé, fallback na cache pro offline)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Hashované assety (_expo/static/, assets/) → cache-first (jsou immutable)
  if (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});
