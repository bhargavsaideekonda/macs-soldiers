/* Simple offline shell cache */
const CACHE = "macs-v25";
const ASSETS = ["./", "./index.html", "./styles.css", "./splash.js", "./splash-v3.js", "./app.js", "./manifest.webmanifest",
  "./icons/seal-640.jpg", "./icons/seal-parts.png"];

self.addEventListener("install", (e) => {
  /* "reload" goes past the browser's own cache, so a new version is really new. */
  e.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never cache Supabase API calls — always go to network
  if (url.hostname.endsWith("supabase.co")) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
