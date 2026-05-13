import { Brain, ShieldCheck, Info } from "lucide-react";
import { getAiWeightsAudit } from "@/lib/actions/insights";
import { AiWeightResetButton } from "./AiWeightResetButton";

const DIMENSION_LABEL_DE: Record<string, { label: string; hint: string }> = {
  history_weekday: {
    label: "Wochentag-Historie",
    hint: "Wie viel Personal du an einem bestimmten Wochentag tatsächlich brauchst.",
  },
  weather: {
    label: "Wetter",
    hint: "Wie stark Sonne, Regen oder Hitze deinen Personalbedarf verändert.",
  },
  event: {
    label: "Feiertag / Brückentag",
    hint: "Korrektur für Feiertage, Brückentage und Tag-vor-Feiertag.",
  },
  experience: {
    label: "Team-Erfahrung",
    hint: "Junges Team vs. erfahrenes Team – wirkt auf die nötige Kopfzahl.",
  },
};

const KEY_LABEL_DE: Record<string, string> = {
  // Wochentage
  MON: "Montag", TUE: "Dienstag", WED: "Mittwoch", THU: "Donnerstag",
  FRI: "Freitag", SAT: "Samstag", SUN: "Sonntag",
  // Wetter
  SUNNY: "Sonnig", CLOUDY: "Wolkig", RAIN: "Regen", STORM: "Sturm", COLD: "Kalt", HOT: "Heiß",
  // Events
  NONE: "Normaler Tag", PUBLIC_HOLIDAY: "Feiertag", PUBLIC_HOLIDAY_EVE: "Tag vor Feiertag",
  BRIDGE_DAY: "Brückentag", WEEKEND: "Wochenende",
  // Experience
  BALANCED: "Ausgewogenes Team", JUNIOR_HEAVY: "Viele Junioren",
  SENIOR_HEAVY: "Viele Erfahrene", UNKNOWN: "Unbekannt",
};

/**
 *  VREMA Native Core AI – Audit-Section in den Settings.
 *
 *  User Journey: Der Owner öffnet Einstellungen, scrollt zu "KI-Audit",
 *  sieht jeden einzelnen gelernten Faktor mit Bedeutung, Wert und Stichprobe.
 *  Er kann jeden Faktor per Klick auf 1,0 zurücksetzen (Override).
 *  Das ist der DSGVO-Trust-Beweis: keine Black-Box, alles einsehbar und löschbar.
 */
export async function AiInsightsAuditSection() {
  let rows: Awaited<ReturnType<typeof getAiWeightsAudit>> = [];
  try {
    rows = await getAiWeightsAudit();
  } catch {
    return null;
  }

  // Nach Dimension gruppieren – die UI zeigt sie als Block.
  const byDim = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDim.get(r.dimension) ?? [];
    list.push(r);
    byDim.set(r.dimension, list);
  }

  const hasData = rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4 dark:border-white/[0.04] dark:bg-surface/40">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Die VREMA Native Core AI lernt ausschließlich aus deinen eigenen Daten und speichert{" "}
          <span className="font-semibold text-foreground">keine Texte, sondern Zahlen</span> – einen
          Korrekturfaktor pro Wochentag, Wetter, Event und Team-Mix. Du kannst jeden Faktor sehen und
          auf 1,0 zurücksetzen (= keine Korrektur). Reset wirkt sofort.
        </p>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground dark:border-white/[0.04] dark:bg-surface/60">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Brain className="h-4 w-4 text-brand" aria-hidden />
            Noch keine gelernten Faktoren.
          </div>
          <p className="mt-1 text-xs">
            Sobald du den ersten Schichtplan finalisierst, lernt die Core-AI im Hintergrund.
            Pro finalisierter Woche werden vier Faktoren (Wochentag, Wetter, Event, Team-Mix)
            angepasst.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(byDim.entries()).map(([dim, list]) => {
            const meta = DIMENSION_LABEL_DE[dim] ?? {
              label: dim,
              hint: "Unbekannte Dimension – wird ignoriert.",
            };
            return (
              <div
                key={dim}
                className="rounded-xl border border-border bg-card p-4 dark:border-white/[0.04] dark:bg-surface/60"
              >
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{meta.label}</h3>
                    <p className="text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        <th className="px-2 py-1 text-left font-semibold">Bucket</th>
                        <th className="px-2 py-1 text-right font-semibold">Faktor</th>
                        <th className="px-2 py-1 text-right font-semibold">Lernzyklen</th>
                        <th className="px-2 py-1 text-right font-semibold">Aktualisiert</th>
                        <th className="px-2 py-1 text-right font-semibold">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => {
                        const w = r.weight;
                        const isNeutral = Math.abs(w - 1.0) < 0.01;
                        const movement = (w - 1) * 100;
                        return (
                          <tr
                            key={`${r.dimension}:${r.key}`}
                            className="border-t border-border/60 dark:border-white/[0.04]"
                          >
                            <td className="px-2 py-2 text-foreground">
                              {KEY_LABEL_DE[r.key] ?? r.key}
                            </td>
                            <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">
                              {w.toFixed(3)}
                              {!isNeutral && (
                                <span
                                  className={`ml-1 inline-block rounded-full px-1.5 text-[10px] font-bold ${
                                    movement > 0
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
                                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                                  }`}
                                >
                                  {movement > 0 ? "+" : ""}
                                  {movement.toFixed(1)} %
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">
                              {r.sampleCount}
                            </td>
                            <td className="px-2 py-2 text-right text-muted-foreground">
                              {new Date(r.updatedAt).toLocaleDateString("de-DE")}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <AiWeightResetButton dimension={r.dimension} weightKey={r.key} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
