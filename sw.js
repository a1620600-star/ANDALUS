// ثانوية الأندلس بترقش — Service Worker
// الإصدار: يتغير تلقائياً عند كل نشر

const CACHE_NAME = 'andalus-v1';
const OFFLINE_URL = '/';

const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// التثبيت — تخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// التفعيل — حذف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// الاعتراض — خدمة الطلبات
self.addEventListener('fetch', event => {
  // تجاهل طلبات Firebase وخارجية
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // تحديث الكاش بأحدث نسخة
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // أوفلاين — ارجع من الكاش
        return caches.match(event.request).then(cached => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});
