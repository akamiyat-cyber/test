// キャッシュの名前（更新時はここを変えると新しいキャッシュが作られます）
const CACHE_NAME = 'fieldeval-v4-offline';

// キャッシュするファイルのリスト
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  // 外部ライブラリ（Tailwind CSS）
  'https://cdn.tailwindcss.com',
  // フォント（Google Fonts）
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap'
];

// 1. インストール時：指定したファイルをキャッシュに保存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 通信時：キャッシュがあればそれを使い、なければネットに取りに行く
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュが見つかればそれを返す（オフライン動作）
        if (response) {
          return response;
        }
        // キャッシュになければネットワークへ
        return fetch(event.request);
      })
  );
});

// 3. 起動時：古いキャッシュを削除して整理する
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});