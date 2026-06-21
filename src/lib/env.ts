import { z } from "zod";

/**
 * Zentrale, strenge Validierung aller kritischen Umgebungsvariablen.
 *
 * Warum: Vorher waren Pflicht-Variablen über das ganze Projekt mit `!`
 * (`process.env.X!`) verteilt. Fehlte eine in Production, crashte die App
 * erst irgendwo tief im Stripe-Import (Kaltstart-Crash mit kryptischem
 * `digest`). Hier validieren wir **einmal zentral** und werfen mit einer
 * klar lesbaren Meldung, welche Variable fehlt.
 *
 * Verhalten:
 *  - Server + Production  → die kritischen Variablen sind Pflicht (Boot-Fail-Fast).
 *  - Dev/Test/Client      → tolerant (Defaults), damit lokale Flows ohne
 *    vollständige Secrets laufen und der Client-Bundle nie crasht
 *    (im Browser sind nur `NEXT_PUBLIC_*`-Variablen verfügbar).
 *
 * Getriggert wird die Validierung früh über `src/instrumentation.ts`.
 */
const isServer = typeof window === "undefined";
const isProduction = process.env.NODE_ENV === "production";
/**
 * Während `next build` werden Module importiert, obwohl Laufzeit-Secrets evtl.
 * noch nicht gesetzt sind (z. B. erst via PM2 injiziert). Den Build dürfen wir
 * nicht hart abbrechen – die strenge Prüfung greift zur Laufzeit beim Boot
 * (siehe `src/instrumentation.ts`).
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/** Strenge Prüfung nur dort, wo die Secrets auch existieren müssen. */
const enforce = isServer && isProduction && !isBuildPhase;

/** Production-Pflichtfeld (non-empty) bzw. toleranter Fallback außerhalb. */
const requiredString = (devFallback = "") =>
  enforce ? z.string().min(1) : z.string().optional().default(devFallback);

const requiredUrl = (devFallback: string) =>
  enforce ? z.url() : z.url().optional().default(devFallback);

const optionalString = () => z.string().optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ── Kritisch: in Production zwingend (verhindert Kaltstart-Crashs) ──
  AUTH_SECRET: requiredString(),
  NEXT_PUBLIC_APP_URL: requiredUrl("http://localhost:3000"),

  // ── Web Push / VAPID (optional; Push ist ein Add-on) ──
  // Public-Key ist NEXT_PUBLIC_*, da ihn der Client zum Abonnieren braucht.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalString(),
  VAPID_PRIVATE_KEY: optionalString(),
  VAPID_SUBJECT: optionalString(),

  // ── Weitere Integrationen (optional) ──
  DATABASE_URL: optionalString(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `[VREMA] Umgebungs-Konfiguration ungültig oder unvollständig:\n${details}\n` +
        "→ Bitte die genannten Variablen in der Production-Umgebung setzen, bevor die App startet.",
    );
  }
  return parsed.data;
}

/** Validierte, typsichere Umgebungsvariablen. Import löst die Prüfung aus. */
export const env = loadEnv();

export type Env = typeof env;
