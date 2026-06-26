/* VREMA Service Worker — Install-PWA + Offline-Shell für besuchte Seiten.
 * Navigation: network-first, Fallback auf Cache, dann offline.html.
 * Statische Assets: stale-while-revalidate.
 */
const CACHE_NAME = "vrema-shell-v5";
const RUNTIME_CACHE = "vrema-runtime-v5";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/vrema_logo.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (_) {
        /* offline.html optional */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const runtime = await caches.open(RUNTIME_CACHE);
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            runtime.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await runtime.match(req);
          if (cached) return cached;
          const shell = await caches.open(CACHE_NAME);
          const offline = await shell.match(OFFLINE_URL);
          return (
            offline ||
            new Response("Offline – bitte Verbindung prüfen.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const runtime = await caches.open(RUNTIME_CACHE);
        const cached = await runtime.match(req);
        if (cached) {
          void fetch(req)
            .then((fresh) => {
              if (fresh.ok) runtime.put(req, fresh.clone());
            })
            .catch(() => {});
          return cached;
        }
        try {
          const fresh = await fetch(req);
          if (fresh.ok) runtime.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "VREMA", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "VREMA";
  const options = {
    body: data.body || "",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    data: { url: data.url || "/dashboard" },
    tag: data.tag || undefined,
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      try {
        if (typeof data.unread === "number" && self.navigator) {
          if (data.unread > 0 && self.navigator.setAppBadge) {
            await self.navigator.setAppBadge(data.unread);
          } else if (self.navigator.clearAppBadge) {
            await self.navigator.clearAppBadge();
          }
        }
      } catch (_) {
        /* Badging API optional */
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch (_) {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
