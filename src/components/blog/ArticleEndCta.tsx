import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pricingTiersHint, trialMarketingParagraph } from "@/lib/marketing/trial-copy";

export function ArticleEndCta() {
  return (
    <aside className="not-prose mt-10 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-primary/12 via-card to-card p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">VREMA</p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Bereit für die neue Zeiterfassung?</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
        {trialMarketingParagraph()} Terminal, Saldo und Team in wenigen Minuten eingerichtet.
      </p>
      <p className="mt-1 max-w-xl text-xs text-slate-500">{pricingTiersHint()}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/auth/register"
          className="btn-primary-solid inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold active:scale-[0.99]"
        >
          Jetzt VREMA kostenlos testen
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/#pricing"
          className="btn-secondary-outline inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Pläne vergleichen
        </Link>
      </div>
    </aside>
  );
}
