const CACHE = "project-memory-release-v1";
const SHELL = ["/", "/demo", "/assets/notebook-hero-960.webp", "/favicon.svg"];
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const page = await fetch("/demo");
  const html = await page.clone().text();
  const assets = [...html.matchAll(/["'](\/assets\/[^"']+)["']/g)].map(match => match[1]);
  for (const asset of assets) {
    const response = await fetch(asset);
    await cache.put(asset, response.clone());
    if (asset.endsWith(".css")) {
      const css = await response.text();
      const fonts = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map(match => match[1]);
      await Promise.all(fonts.map(font => cache.add(new URL(font, self.location.origin).pathname)));
    }
  }
  await self.skipWaiting();
})()));
self.addEventListener("activate", event => event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))])));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin || new URL(event.request.url).pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match("/demo"))));
});
