/* АВР — Подписи: кешируется только оболочка приложения; акты всегда берутся свежими. */
var CACHE = 'avr-sign-v5';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = e.request.url;
  if (e.request.method !== 'GET' || /script\.google|googleusercontent|docs\.google/.test(u)) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(function (r) { var c = r.clone(); caches.open(CACHE).then(function (x) { x.put('./index.html', c); }); return r; })
      .catch(function () { return caches.match('./index.html'); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (m) { return m || fetch(e.request); }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (cs) { if (cs.length) return cs[0].focus(); return self.clients.openWindow('./'); }));
});

/* Push: сообщение без текста — телефон сам спрашивает сервер, что случилось. */
var API = 'https://avr-sign.nurislamturgunbaev.workers.dev/';
self.addEventListener('push', function (e) {
  e.waitUntil(caches.open('avr-sign-auth').then(function (c) { return c.match(new URL('./__tok', self.registration.scope).href); })
    .then(function (r) { return r ? r.text() : ''; })
    .then(function (tok) { return tok ? fetch(API, { method: 'POST', body: JSON.stringify({ sign_api: 'pending', token: tok }) }).then(function (r) { return r.json(); }) : null; })
    .catch(function () { return null; })
    .then(function (j) {
      var t = 'АВР — Подписи', b = 'Откройте приложение', tag = 'avr', must = false;
      if (j && j.ok && j.confirms && j.confirms.length) { var c = j.confirms[0]; t = 'Подтвердите подпись АВР №' + c.num; b = 'Запрос с компьютера · ' + c.exe + ' · ' + c.total + '. Нажмите и подтвердите Face ID.'; tag = 'c' + c.cid; must = true; }
      else if (j && j.ok && j.waiting) { t = 'АВР на подпись: ' + j.waiting; b = 'Откройте приложение, чтобы посмотреть и подписать.'; tag = 'wait'; }
      else if (j && j.ok && j.late) { t = 'Акт подписан, а PDF не готов'; b = 'Откройте приложение и нажмите «Сформировать подписанный PDF».'; tag = 'late'; }
      return self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (w) { w.postMessage('push'); }); })
        .then(function () { return self.registration.showNotification(t, { body: b, icon: 'icon-192.png', badge: 'icon-192.png', tag: tag, renotify: true, requireInteraction: must, data: { url: './' } }); });
    }));
});
