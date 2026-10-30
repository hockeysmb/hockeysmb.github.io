// Service worker de la app de jugadoras: primero la red (siempre la última versión); sin conexión, lo guardado.
const VERSION = 'smbf-20261030c';
const SHELL = ['./', './index.html', './app.js', './firebase-config.js', './manifest.webmanifest', './lib/avatar.js', './juegos.js', './lib/phaser.min.js?v=4.2.1', './mascotas.js', './partidos.json', './img/check.webp', './img/antes.webp', './img/despues.webp', './img/partido.webp', './img/diario.webp', './img/mando.webp', './img/corazon.webp', './img/camiseta.webp', './img/tienda.webp', './img/grafica.webp', './img/ventana.webp', './img/cuadro.webp', './img/planta.webp', './img/cama.webp', './img/manzana.webp', './img/pelota.webp', './img/banera.webp', './img/carne.webp', './img/feliz.webp', './img/jabon.webp', './img/sucio.webp', './img/hambre.webp', './img/triste.webp', './img/burbujas.webp', './img/chispa.webp', './img/nota.webp', './img/regalo.webp', './img/cono.webp', './img/iman.webp', './img/escudo.webp', './img/x2.webp', './img/estrella.webp', './img/trofeo.webp', './img/fuego.webp', './img/guante.webp', './img/stick.webp', './img/moneda.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('smbf-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (/googleapis\.com|firebaseio\.com|identitytoolkit|securetoken/.test(u.host)) return;
  // dibujos y librerías (no cambian): primero lo guardado
  if (u.origin === location.origin && /\/(img|lib)\//.test(u.pathname)) { e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(k => k.put(r, c)); } return res; }))); return; }
  if (u.origin === location.origin && u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
    e.respondWith(fetch(r.mode === 'navigate' ? r.url : r, { cache: 'no-cache' }).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(k => k.put(r, c)); } return res; }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
  }
});
