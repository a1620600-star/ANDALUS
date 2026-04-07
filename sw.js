// ثانوية الأندلس بترقش — Service Worker v7
// السياسة: index.html لا يُخزَّن أبداً — دائماً من الشبكة
const CACHE_NAME = 'andalus-v7';
const BASE = self.registration.scope;

// الملفات الثابتة فقط (أيقونات + manifest) — لا يشملها index.html أبداً
const STATIC_URLS = [
  BASE + 'manifest.json',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png'
];

// التثبيت — تخزين الملفات الثابتة فقط بشكل مستقل
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        STATIC_URLS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(r => { if (r && r.status === 200) return cache.put(url, r); })
            .catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// التفعيل — حذف جميع الكاشات القديمة (v1-v6)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        )
      )
  );
});

// الاعتراض
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // index.html وكل HTML: شبكة مباشرة بدون كاش نهائياً
  const isHTML = url.pathname === '/' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/') ||
                 url.pathname === '/Andalus' ||
                 url.pathname === '/Andalus/';

  if (isHTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => new Response(
          '<h2 style="font-family:sans-serif;text-align:center;padding:40px;direction:rtl">لا يوجد اتصال بالإنترنت<br><small>يرجى التحقق من الاتصال وإعادة المحاولة</small></h2>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        ))
    );
    return;
  }

  // الملفات الثابتة (أيقونات + manifest): كاش أولاً
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);
    })
  );
});
