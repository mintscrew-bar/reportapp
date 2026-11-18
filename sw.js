const CACHE_NAME = 'daily-report-v7';
const ASSETS_TO_CACHE = [
  'index.html',
  'styles.css',
  'script.js',
  'node_modules/xlsx/dist/xlsx.full.min.js',
  'node_modules/jspdf/dist/jspdf.umd.min.js',
  'node_modules/html2canvas/dist/html2canvas.min.js',
  'icon-192.png',
  'icon-512.png'
];

// 설치 시, 앱의 기본 파일들을 캐시에 저장합니다.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// 요청이 발생했을 때, 캐시된 파일이 있으면 네트워크 대신 캐시에서 파일을 제공합니다.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 파일이 있으면 그것을 반환하고, 없으면 네트워크로 요청합니다.
        return response || fetch(event.request);
      })
  );
});

// 새 버전 배포 시 이전 캐시를 정리합니다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('daily-report-') && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
});
