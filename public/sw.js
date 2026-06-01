/* VREMA Service Worker — minimal, damit Chrome/Edge die Install-Aufforderung anzeigt.
 * Kein aggressives Caching: wir bleiben „network-first", damit neue Deploys sofort sichtbar sind.
 */
const CACHE_NAME = "vrema-shell-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/vrema_logo.png", "/android-chrome-192x192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (_) {
        /* offline.html optional, ignorieren falls fehlt */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Kein SW-Caching für API/Auth/Server-Action-Pfade
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match(OFFLINE_URL);
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

/* ── Web Push ─────────────────────────────────────────────────────────────
 * Payload (JSON): { title, body, url, unread }
 * Zeigt die native Notification an und aktualisiert parallel das
 * Homescreen-Icon-Badge (Badging API) anhand des mitgelieferten unread-Counts.
 */
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
    // Gleiche tag → ersetzt statt stapelt (z. B. bei mehreren Updates).
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

/* Klick auf die Notification → bestehendes Fenster fokussieren & zur
 * Ziel-URL navigieren, sonst ein neues Fenster öffnen. */
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
              /* z. B. Cross-Origin – ignorieren */
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
