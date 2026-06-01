/**
 * Client-seitige Web-Push- & Badge-Helfer (laufen nur im Browser).
 *
 * Alle Funktionen sind defensiv: fehlt Support oder eine Permission,
 * passiert einfach nichts (kein Throw), damit die App nie hängt.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Base64URL-VAPID-Key → Uint8Array (von pushManager.subscribe verlangt). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Über expliziten ArrayBuffer, damit der Typ zu `BufferSource` passt.
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/** True, wenn der Browser Web Push grundsätzlich unterstützt. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

/** Aktueller Permission-Status (oder "unsupported"). */
export function pushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Setzt das Homescreen-Icon-Badge auf `count` (0 ⇒ entfernen). */
export function setAppBadge(count: number): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) {
      void nav.setAppBadge?.(count);
    } else {
      void nav.clearAppBadge?.();
    }
  } catch {
    /* Badging API optional */
  }
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });
}

/**
 * Fordert (falls nötig) die Permission an und legt ein Push-Abo an.
 * Gibt true zurück, wenn am Ende ein gültiges Abo beim Server registriert ist.
 *
 * `interactive=false` → nur synchronisieren, wenn die Permission bereits
 * erteilt wurde (kein Permission-Prompt, kein „Nagging").
 */
export async function subscribeToPush(interactive = true): Promise<boolean> {
  if (!isPushSupported()) return false;

  let permission = Notification.permission;
  if (permission === "default") {
    if (!interactive) return false;
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    await postSubscription(subscription);
    return true;
  } catch {
    return false;
  }
}

/** Hebt das Push-Abo dieses Geräts auf (lokal + serverseitig). */
export async function unsubscribeFromPush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
