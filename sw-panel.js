// Service worker del panel: permite instalarlo como app y abrirlo sin conexión (muestra la última versión guardada).
const CACHE = "tdv-panel-v1";
const BASE = ["/panel", "/panel.js", "/panel.css", "/styles.css", "/products.js", "/logo.svg", "/icons/panel-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  // Los datos (/api) siempre van a la red; el resto, red primero y si no hay conexión, lo guardado.
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && BASE.includes(u.pathname)) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match("/panel"))));
});
