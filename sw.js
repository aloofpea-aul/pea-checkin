// Service Worker สำหรับ PEA Dashboard PWA
const CACHE_NAME = 'pea-dashboard-v1';
const OFFLINE_URL = '/pea-checkin/dashboard_mobile.html';

// ไฟล์ที่ cache ไว้ใช้ offline
const CACHE_URLS = [
  '/pea-checkin/dashboard_mobile.html',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap',
  'https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js',
];

// Install: cache ไฟล์หลัก
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('Cache partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: ลบ cache เก่า
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network first, cache fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // GAS API calls — ไม่ cache เพราะข้อมูล realtime
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('raw.githubusercontent.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // HTML/CSS/JS — Network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache response ใหม่
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: ใช้ cache
        return caches.match(event.request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});
