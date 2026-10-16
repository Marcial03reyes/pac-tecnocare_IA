// Service worker de PAC: hace la web instalable y carga más rápido.
// Nunca guarda datos del CRM: Supabase y /api siempre van a la red.
const VERSION = "pac-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const BASE = new URL(self.registration.scope).pathname;
const INDEX = `${BASE}index.html`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll([INDEX])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fuentes, etc.
  if (url.pathname.startsWith(`${BASE}api/`)) return; // API del asistente

  // Navegación: red primero; sin conexión, la última versión guardada de la app.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(INDEX, copy)); }
          return res;
        })
        .catch(() => caches.match(INDEX)),
    );
    return;
  }

  // Archivos con hash de Vite (JS/CSS) e imágenes: caché primero.
  if (url.pathname.startsWith(`${BASE}assets/`) || /\.(png|svg|jpg|jpeg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
