"use client";

import Link from "next/link";

type Focus = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

/** Mobil: ein Satz Fokus — ruhig oder Handlung, keine Extra-Links. */
export function ManagerMobileCockpit({
  focus,
  firstName,
}: {
  focus: Focus;
  planTitle?: string;
  firstName?: string;
}) {
  const hasUrgentFocus = focus.title !== "Heute keine kritischen Hinweise";

  if (!hasUrgentFocus) {
    return (
      <section aria-label="Tagesstatus" className="flex min-h-[min(52vh,22rem)] flex-col items-center justify-center py-10 text-center md:hidden">
        <p className="text-sm text-muted-foreground">{firstName ? `Hallo ${firstName}` : "Hallo"}</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Alles läuft.</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Heute musst du nichts freigeben oder prüfen.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Handlungsbedarf"
      className="rounded-2xl border border-warning/35 bg-warning-soft/25 px-4 py-4 md:hidden dark:bg-warning/10"
    >
      <p className="font-semibold text-foreground">{focus.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{focus.description}</p>
      <Link
        href={focus.href}
        className="btn-brand mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold active:scale-[0.99]"
      >
        {focus.cta}
      </Link>
    </section>
  );
}
