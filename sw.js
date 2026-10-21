// オフラインでも開けるようにアプリ本体をキャッシュする。
// ネットにつながるときは最新を取りに行き、つながらないときはキャッシュを使う。
const CACHE = 'mono-kanri-v2';
const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'db.js', 'manifest.webmanifest',
  'vendor/qrcode.js', 'vendor/jsQR.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(r => r ?? (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
