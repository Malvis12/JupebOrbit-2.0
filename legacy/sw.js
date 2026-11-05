const CACHE_NAME = 'jupeb-orbit-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/practice.html',
    '/exam.html',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting(); // Force update
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests (like Firebase)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                // Return a fallback or just let it fail if not in cache and offline
                return new Response('Network error occurred', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/plain' })
                });
            });
        })
    );
});