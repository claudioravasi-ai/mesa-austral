/* Mesa Austral · guarda las pantallas para que abran rápido con mala señal. Los datos siempre se piden al servidor. */
const CACHE = 'mesa-austral-0.1.0';
const BASE = ['./', 'index.html', 'mi.html', 'pago.html', 'sala.html', 'dueno.html', 'privacidad.html', 'config.js', 'css/app.css', 'css/estilos.css', 'icono.svg', 'manifest.json',
  'js/comun.js', 'js/reservar.js', 'js/mi.js', 'js/sala.js', 'js/dueno.js', 'js/editor.js', 'js/noche.js', 'js/acceso.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;           // la API y las fuentes van directo a la red
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
