"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, MapPin, X } from "lucide-react";
import type { CompanyModules } from "@/lib/company-modules";
import { useVocabulary } from "@/components/VocabularyContext";

type Guide = {
  title: string;
  hint: string;
  cta?: { href: string; label: string };
};

function guideForPath(
  pathname: string,
  role: string,
  modules: CompanyModules,
  planTitle: string,
  slot: string,
  slots: string,
): Guide | null {
  if (pathname.startsWith("/dashboard/planning")) {
    if (role === "EMPLOYEE") {
      return {
        title: `Mein ${planTitle}`,
        hint: `${slots} & Tausch — Fragen an die Leitung.`,
        cta: { href: "/dashboard/vacation", label: "Abwesenheit" },
      };
    }
    return {
      title: planTitle,
      hint: "Person wählen → Tag antippen (+). Wischen = andere Tage.",
      cta: { href: "/dashboard/settings", label: "Vorlagen" },
    };
  }
  if (pathname.startsWith("/dashboard/team")) {
    return {
      title: "Team",
      hint: "Einladen, Rollen, Verfügbarkeiten.",
      cta: { href: "/dashboard/planning", label: "Planer" },
    };
  }
  if (pathname.startsWith("/dashboard/vacation")) {
    return {
      title: "Abwesenheit",
      hint: role === "EMPLOYEE" ? "Urlaub oder Krankmeldung." : "Anträge freigeben.",
    };
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return {
      title: "Berichte",
      hint: "Monat wählen · Stunden prüfen · PDF oder CSV.",
    };
  }
  if (pathname.startsWith("/dashboard/insights")) {
    return {
      title: "Auswertung",
      hint: modules.peaks ? "Plan-Hinweise & Stoßzeiten." : "Stunden & ArbZG.",
      cta: modules.peaks ? { href: "/dashboard/peaks", label: "Stoß" } : undefined,
    };
  }
  if (pathname.startsWith("/dashboard/peaks")) {
    return {
      title: "Stoß & Umsatz",
      hint: "Pro Tag: ruhig, normal oder Stoß.",
    };
  }
  if (pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/account")) {
    return {
      title: role === "EMPLOYEE" ? "Mein Konto" : "Einstellungen",
      hint: role === "EMPLOYEE" ? "Profil & Passkey." : "Terminal, Module, Branding.",
    };
  }
  if (pathname.startsWith("/dashboard/billing")) {
    return {
      title: "Abonnement",
      hint: "Tarif & Zahlung.",
    };
  }
  if (pathname.startsWith("/dashboard/tasks")) {
    return {
      title: `${slot}-Checklisten`,
      hint: `Checklisten pro ${slot}.`,
      cta: { href: "/dashboard/planning", label: "Planer" },
    };
  }
  if (pathname.startsWith("/dashboard/support")) {
    return {
      title: "Hilfe",
      hint: "Ticket erstellen — Antwort hier & per Mail.",
    };
  }
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    if (role === "EMPLOYEE") {
      return null;
    }
    return {
      title: "Übersicht",
      hint: "Kennzahlen oben · Aktionen in den Fokus-Karten.",
      cta: { href: "/dashboard/planning", label: "Planer" },
    };
  }
  return null;
}

function dismissKey(pathname: string) {
  return `vrema-wayfinding-dismiss:${pathname}`;
}

export function MobileWayfindingStrip({
  role,
  companyModules,
}: {
  role: string;
  companyModules: CompanyModules;
}) {
  const pathname = usePathname();
  const vocab = useVocabulary();
  const guide = guideForPath(pathname, role, companyModules, vocab.planTitle, vocab.singular, vocab.plural);
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!guide) return;
    try {
      setDismissed(localStorage.getItem(dismissKey(pathname)) === "1");
    } catch {
      setDismissed(false);
    }
    setExpanded(false);
  }, [pathname, guide]);

  if (!guide || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(pathname), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="mb-3 md:hidden">
      <div className="rounded-xl border border-brand/20 bg-card/95 px-3 py-2.5 shadow-sm dark:border-brand/25 dark:bg-card/90 sm:rounded-2xl sm:px-4 sm:py-3">
        <div className="flex items-start gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand/25 sm:h-9 sm:w-9 sm:rounded-xl">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Du bist hier</p>
              <button
                type="button"
                onClick={dismiss}
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-muted/60"
                aria-label="Hinweis ausblenden"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className="mt-0.5 w-full text-left"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <p className="text-sm font-bold text-foreground">{guide.title}</p>
              {(expanded || !guide.cta) && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{guide.hint}</p>
              )}
            </button>
            {guide.cta ? (
              <Link
                href={guide.cta.href}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand"
              >
                {guide.cta.label}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
