"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import type { CompanyModules } from "@/lib/company-modules";

type Guide = {
  title: string;
  hint: string;
  cta?: { href: string; label: string };
};

function guideForPath(
  pathname: string,
  role: string,
  modules: CompanyModules,
): Guide | null {
  if (pathname.startsWith("/dashboard/planning")) {
    if (role === "EMPLOYEE") {
      return {
        title: "Mein Dienstplan",
        hint: "Hier siehst du deine Schichten. Fragen? Kurz bei der Leitung nachfragen.",
        cta: { href: "/dashboard/vacation", label: "Urlaub beantragen" },
      };
    }
    return {
      title: "Schichtplan",
      hint: "Team oben wählen · Schichtkarte antippen (+) · Person per X oder „Schicht leeren“ entfernen. Wischen = Tage.",
      cta: { href: "/dashboard/settings", label: "Module & Vorlagen" },
    };
  }
  if (pathname.startsWith("/dashboard/team")) {
    return {
      title: "Team",
      hint: "Mitarbeitende einladen, Rollen setzen, Verfügbarkeiten pflegen.",
      cta: { href: "/dashboard/planning", label: "Zum Planer" },
    };
  }
  if (pathname.startsWith("/dashboard/vacation")) {
    return {
      title: "Abwesenheit",
      hint: role === "EMPLOYEE" ? "Urlaub oder Krankmeldung — Status siehst du hier." : "Anträge prüfen und freigeben.",
    };
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return {
      title: "Berichte",
      hint: "Stunden, Korrekturen, Exporte — mit Vorher/Nachher bei Änderungen.",
    };
  }
  if (pathname.startsWith("/dashboard/insights")) {
    return {
      title: "Auswertung",
      hint: modules.peaks
        ? "Plan-Hinweise, ArbZG und optional Stoßzeiten."
        : "Stunden, ArbZG und Plan vs. Ist — ohne Umsatz-Extras.",
      cta: modules.peaks ? { href: "/dashboard/peaks", label: "Stoß pflegen" } : undefined,
    };
  }
  if (pathname.startsWith("/dashboard/peaks")) {
    return {
      title: "Stoß & Umsatz",
      hint: "Pro Wochentag: ruhig, normal oder Stoß — für bessere Plan-Hinweise.",
    };
  }
  if (pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/account")) {
    return {
      title: role === "EMPLOYEE" ? "Mein Konto" : "Einstellungen",
      hint: role === "EMPLOYEE" ? "Profil, Passwort, Passkey." : "Terminal, Vorlagen, Module — Betrieb einrichten.",
    };
  }
  if (pathname.startsWith("/dashboard/billing")) {
    return {
      title: "Abonnement",
      hint: "Tarif und Zahlung — oder kostenfrei, wenn vom Admin freigeschaltet.",
    };
  }
  if (pathname.startsWith("/dashboard/tasks")) {
    return {
      title: "Schicht-Tasks",
      hint: "Checklisten pro Schicht — nur sichtbar, wenn das Modul in den Einstellungen aktiv ist.",
      cta: { href: "/dashboard/planning", label: "Zum Planer" },
    };
  }
  if (pathname.startsWith("/dashboard/support")) {
    return {
      title: "Hilfe & Support",
      hint: "Ticket erstellen oder Status prüfen — Antworten siehst du hier und per E-Mail.",
    };
  }
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    if (role === "EMPLOYEE") {
      return {
        title: "Dein Tag",
        hint: "1. Stempeln · 2. Schicht checken · 3. Urlaub bei Bedarf",
        cta: { href: "/dashboard/planning", label: "Meine Schichten" },
      };
    }
    return {
      title: "Übersicht",
      hint: "Oben: was heute wichtig ist. Unten: Team & Kennzahlen.",
      cta: { href: "/dashboard/planning", label: "Planung öffnen" },
    };
  }
  return null;
}

export function MobileWayfindingStrip({
  role,
  companyModules,
}: {
  role: string;
  companyModules: CompanyModules;
}) {
  const pathname = usePathname();
  const guide = guideForPath(pathname, role, companyModules);
  if (!guide) return null;

  return (
    <div className="mb-4 rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/10 via-card to-card px-4 py-3 shadow-sm dark:from-brand/15">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/25">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Du bist hier</p>
          <p className="text-sm font-bold text-foreground">{guide.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{guide.hint}</p>
          {guide.cta ? (
            <Link
              href={guide.cta.href}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              {guide.cta.label}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
