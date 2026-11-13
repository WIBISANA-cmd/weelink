/* WeeLink service worker. Registered by components/pwa/pwa-provider.tsx in production builds. */
/* global self, caches, importScripts */

importScripts("/sw-version.js");

const VERSION = self.WEELINK_VERSION || "dev";
const PAGE_CACHE = `weelink-pages-${VERSION}`;
const ASSET_CACHE = `weelink-assets-${VERSION}`;
const OFFLINE_URL = "/offline";
// Every screen of the app, so any tab opens offline after the first visit.
const SHELL_ROUTES = ["/", "/riwayat", "/pengaturan", OFFLINE_URL];
const SHELL_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/badge-96.png", "/icon.svg"];
// On a slow connection, show the cached screen after this long instead of a blank window.
const NAVIGATION_TIMEOUT_MS = 3500;

async function precache() {
  const pages = await caches.open(PAGE_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  const assetUrls = new Set(SHELL_ASSETS);

  await Promise.all(
    SHELL_ROUTES.map(async (route) => {
      const res = await fetch(route, { cache: "no-store" });
      if (!res.ok) throw new Error(`${route} ${res.status}`);
      const html = await res.clone().text();
      // Pull the chunks each screen needs, so the cached HTML has something to run offline.
      for (const match of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assetUrls.add(match[0]);
      await pages.put(route, res);
    }),
  );

  // Assets are best effort: one missing file must not block the install.
  await Promise.all(
    [...assetUrls].map((url) =>
      fetch(url)
        .then((res) => (res.ok ? assets.put(url, res) : undefined))
        .catch(() => undefined),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGE_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("weelink-") && !keep.has(n)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  if (type === "GET_VERSION" && event.ports[0]) event.ports[0].postMessage(VERSION);
});

function timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function cachedPage(url) {
  const pages = await caches.open(PAGE_CACHE);
  return (await pages.match(url.pathname, { ignoreSearch: true })) || (await pages.match(OFFLINE_URL));
}

/** Screens: fresh from the network, the cached copy when offline or slow, the offline screen as a last resort. */
async function handleNavigation(event, url) {
  const network = (async () => {
    const preloaded = await event.preloadResponse;
    const res = preloaded || (await fetch(event.request));
    if (res.ok && res.type === "basic" && SHELL_ROUTES.includes(url.pathname)) {
      const copy = res.clone();
      caches.open(PAGE_CACHE).then((cache) => cache.put(url.pathname, copy));
    }
    return res;
  })();
  event.waitUntil(network.catch(() => undefined));

  try {
    const first = await Promise.race([network, timeout(NAVIGATION_TIMEOUT_MS)]);
    if (first) return first;
    const cached = await cachedPage(url);
    return cached || (await network);
  } catch {
    const cached = await cachedPage(url);
    return cached || Response.error();
  }
}

/** Hashed build files never change, so the first copy is good forever. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

/** Icons and the manifest: answer from cache right away, refresh in the background. */
async function staleWhileRevalidate(event) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then((res) => {
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Media links and file downloads always go to the server; tokens expire and files are large.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/sw.js" || url.pathname === "/sw-version.js") return;
  // Router payloads: when they fail offline, Next.js falls back to a full navigation, which is handled below.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (!url.pathname.startsWith("/_next/")) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus();
      return self.clients.openWindow("/");
    })(),
  );
});
