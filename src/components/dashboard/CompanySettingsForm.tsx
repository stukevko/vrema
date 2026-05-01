"use client";

import { useState, useTransition } from "react";
import { updateCompanySettings } from "@/lib/actions/settings";
import { Loader2, Save, MapPin } from "lucide-react";
import dynamic from "next/dynamic";

const GeoFenceMapPicker = dynamic(() => import("@/components/dashboard/GeoFenceMapPicker"), {
  ssr: false,
});

interface Props {
  company: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    logoUrl: string | null;
    geoRadiusMeters: number;
    geoLatitude: number | null;
    geoLongitude: number | null;
    shiftCycleWeeks: number;
  };
}

export function CompanySettingsForm({ company }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [geoRadiusKm, setGeoRadiusKm] = useState(String(Math.max(0.01, company.geoRadiusMeters / 1000)));
  const [geoLatitude, setGeoLatitude] = useState(company.geoLatitude?.toString() ?? "");
  const [geoLongitude, setGeoLongitude] = useState(company.geoLongitude?.toString() ?? "");
  const [shiftCycleWeeks, setShiftCycleWeeks] = useState(String(company.shiftCycleWeeks ?? 1));

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation wird von diesem Browser nicht unterstützt.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLatitude(pos.coords.latitude.toFixed(6));
        setGeoLongitude(pos.coords.longitude.toFixed(6));
      },
      () => setError("Standort konnte nicht gelesen werden. Bitte Berechtigung erlauben."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateCompanySettings({
          name: fd.get("name") as string,
          geoRadiusMeters: Number(geoRadiusKm) * 1000,
          geoLatitude: geoLatitude ? Number(geoLatitude) : null,
          geoLongitude: geoLongitude ? Number(geoLongitude) : null,
          shiftCycleWeeks: Number(shiftCycleWeeks),
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
      }
    });
  };

  return (
    <div className="rounded-2xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Firmenname
            </label>
            <input
              name="name"
              type="text"
              defaultValue={company.name}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-900 text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Firmen-Slug
            </label>
            <input
              value={company.slug}
              readOnly
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-white/5 text-muted-foreground text-sm font-sans cursor-not-allowed"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            Schichtzyklus (Wochen)
          </label>
          <select
            value={shiftCycleWeeks}
            onChange={(e) => setShiftCycleWeeks(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-900 text-sm focus:outline-none focus:border-primary/40 transition-colors"
          >
            <option value="1">1 Woche (Standard)</option>
            <option value="2">2 Wochen</option>
            <option value="3">3 Wochen</option>
          </select>
          <p className="text-[10px] text-muted-foreground mt-1 font-sans">
            Legt fest, ob Planungsmuster wöchentlich, alle 2 Wochen oder alle 3 Wochen rotieren.
          </p>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            GPS-Geo-Radius (km) – für Stempel-Validierung
          </label>
          <div className="relative">
            <input
              name="geoRadius"
              type="number"
              value={geoRadiusKm}
              onChange={(e) => setGeoRadiusKm(e.target.value)}
              min={0.05}
              max={50}
              step={0.05}
              className="w-full px-3 py-2.5 pr-12 rounded-xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-900 text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-sans">km</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-sans">
            Mitarbeiter müssen sich innerhalb dieses Radius befinden, um per GPS einzustempeln.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest block">
              Standort auf Karte markieren
            </label>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              <MapPin className="w-3.5 h-3.5" />
              Aktueller Standort
            </button>
          </div>
          <GeoFenceMapPicker
            latitude={geoLatitude ? Number(geoLatitude) : 49.317}
            longitude={geoLongitude ? Number(geoLongitude) : 8.437}
            radiusMeters={Math.max(10, Math.round(Number(geoRadiusKm || "0") * 1000))}
            onChange={(lat, lng) => {
              setGeoLatitude(lat.toFixed(6));
              setGeoLongitude(lng.toFixed(6));
            }}
          />
          <p className="text-[10px] text-muted-foreground font-sans">
            Klick auf die Karte setzt deinen Shop-Standort. Der grüne Kreis zeigt den aktiven Radius.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Standort Breitengrad
            </label>
            <input
              name="geoLatitude"
              type="number"
              step="0.000001"
              value={geoLatitude}
              onChange={(e) => setGeoLatitude(e.target.value)}
              placeholder="49.3170"
              className="w-full px-3 py-2.5 rounded-xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-900 text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
              Standort Längengrad
            </label>
            <input
              name="geoLongitude"
              type="number"
              step="0.000001"
              value={geoLongitude}
              onChange={(e) => setGeoLongitude(e.target.value)}
              placeholder="8.4370"
              className="w-full px-3 py-2.5 rounded-xl bg-card backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-900 text-sm focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest mb-1.5 block">
            Aktueller Plan
          </label>
          <div className="px-3 py-2.5 rounded-xl bg-card border border-white/5 flex items-center justify-between">
            <span className="text-sm font-sans text-primary font-bold">{company.plan}</span>
            <a href="/dashboard/billing" className="text-xs text-muted-foreground hover:text-slate-900 transition-colors font-sans">
              Upgrade →
            </a>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-sans bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
            ✗ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {success ? "✓ Gespeichert" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
