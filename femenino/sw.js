// Service worker de la app de jugadoras: primero la red (siempre la última versión); sin conexión, lo guardado.
const VERSION = 'smbf-20261027d';
const SHELL = ['./', './index.html', './app.js', './firebase-config.js', './manifest.webmanifest', './lib/avatar.js', './juego.js', './juegos2.js', './mascotas.js', './partidos.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('smbf-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (/googleapis\.com|firebaseio\.com|identitytoolkit|securetoken/.test(u.host)) return;
  if (u.origin === location.origin && u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
    e.respondWith(fetch(r.mode === 'navigate' ? r.url : r, { cache: 'no-cache' }).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(k => k.put(r, c)); } return res; }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
  }
});
