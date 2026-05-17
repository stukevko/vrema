"use client";

import { useMemo, useState, useTransition } from "react";
import { updateBranding } from "@/lib/actions/branding";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { Loader2, RefreshCcw, Save } from "lucide-react";

type Props = {
  initial: {
    brandColor: string | null;
    brandColorDark: string | null;
    plan: string;
  };
};

const DEFAULT_LIGHT = "#0a3a52";
const DEFAULT_DARK = "#38BDF8";

function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(hex.trim());
}

export function BrandingSection({ initial }: Props) {
  const [light, setLight] = useState<string>(initial.brandColor ?? DEFAULT_LIGHT);
  const [dark, setDark] = useState<string>(initial.brandColorDark ?? DEFAULT_DARK);
  const [isPending, startTransition] = useTransition();
  const { toasts, show, remove } = useToast();

  const isEnterprise = initial.plan === "ENTERPRISE";
  const dirty = useMemo(
    () => light !== (initial.brandColor ?? DEFAULT_LIGHT) || dark !== (initial.brandColorDark ?? DEFAULT_DARK),
    [light, dark, initial.brandColor, initial.brandColorDark],
  );

  const handleSave = () => {
    if (!isValidHex(light) || !isValidHex(dark)) {
      show("Bitte zwei gültige Hex-Codes (#RRGGBB) eingeben.", "error");
      return;
    }
    startTransition(async () => {
      try {
        await updateBranding({ brandColor: light, brandColorDark: dark });
        show("Branding gespeichert — das Team sieht den neuen Look nach dem nächsten Seitenaufruf.", "success");
      } catch (err) {
        show(err instanceof Error ? err.message : "Speichern fehlgeschlagen.", "error");
      }
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      try {
        await updateBranding({ brandColor: null, brandColorDark: null });
        setLight(DEFAULT_LIGHT);
        setDark(DEFAULT_DARK);
        show("Auf VREMA-Standard zurückgesetzt.", "success");
      } catch (err) {
        show(err instanceof Error ? err.message : "Reset fehlgeschlagen.", "error");
      }
    });
  };

  return (
    <div className="space-y-5">
      {!isEnterprise && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-300/15 dark:bg-amber-500/10 dark:text-amber-100">
          Custom-Branding ist Bestandteil des Enterprise-Plans. Änderungen werden erst aktiv, wenn dein Tarif Enterprise ist.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Light */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Brand-Farbe (Light)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={isValidHex(light) ? `#${light.replace("#", "")}` : DEFAULT_LIGHT}
              onChange={(e) => setLight(e.target.value)}
              className="h-12 w-14 cursor-pointer rounded-xl border border-line"
              aria-label="Farbwähler Light"
            />
            <input
              value={light}
              onChange={(e) => setLight(e.target.value.trim())}
              placeholder="#0a3a52"
              className="input-field-subtle h-12 w-32 rounded-xl px-3 text-sm font-mono"
            />
          </div>
        </div>

        {/* Dark */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Brand-Farbe (Dark)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={isValidHex(dark) ? `#${dark.replace("#", "")}` : DEFAULT_DARK}
              onChange={(e) => setDark(e.target.value)}
              className="h-12 w-14 cursor-pointer rounded-xl border border-line"
              aria-label="Farbwähler Dark"
            />
            <input
              value={dark}
              onChange={(e) => setDark(e.target.value.trim())}
              placeholder="#38BDF8"
              className="input-field-subtle h-12 w-32 rounded-xl px-3 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Live-Preview – zwei Kacheln in den eingegebenen Farben */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="rounded-2xl border border-line p-5 text-white shadow-sm transition-colors"
          style={{ backgroundColor: isValidHex(light) ? light : DEFAULT_LIGHT }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Light Preview</p>
          <p className="mt-1 text-base font-bold">VREMA Brand · {isValidHex(light) ? light : DEFAULT_LIGHT}</p>
          <p className="mt-1 text-xs opacity-90">So sehen primäre Buttons im Light-Mode aus.</p>
        </div>
        <div
          className="rounded-2xl border border-line p-5 shadow-sm transition-colors"
          style={{
            backgroundColor: "#131418",
            color: isValidHex(dark) ? dark : DEFAULT_DARK,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Dark Preview</p>
          <p className="mt-1 text-base font-bold">VREMA Brand · {isValidHex(dark) ? dark : DEFAULT_DARK}</p>
          <p className="mt-1 text-xs opacity-80">So leuchten KPIs im Dark-Mode.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="btn-brand inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Branding speichern
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line/60 bg-surface/70 px-4 text-sm font-medium text-foreground hover:border-brand/35"
        >
          <RefreshCcw className="h-4 w-4" />
          Auf VREMA-Petrol zurücksetzen
        </button>
      </div>

      <ToastContainer toasts={toasts} remove={remove} />
    </div>
  );
}
