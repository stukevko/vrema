import Link from "next/link";
import { Sparkles, UserPlus, Eye } from "lucide-react";

/**
 *  Owner-only Empty-State-Banner für ein noch nicht eingerichtetes Team.
 *  Zeigt sich nur wenn `teamSize <= 1` (also nur der Owner selbst).
 */
export function EmptyTeamBanner({ teamSize }: { teamSize: number }) {
  if (teamSize > 1) return null;
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-brand/25 bg-brand-soft/40 p-6 shadow-sm dark:border-white/[0.06] dark:bg-brand/[0.08] sm:p-7"
      aria-label="Dashboard noch leer"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand/15 blur-3xl"
      />
      <div className="relative flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-brand shadow-sm dark:bg-surface/70">
          <Sparkles className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">Dein Dashboard ist startklar</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Du bist gerade alleine hier. Lade dein Team ein – oder schau dir ohne Risiko an, wie VREMA mit echten Daten aussieht.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard/team"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" />
              Team einladen
            </Link>
            <Link
              href="/dashboard/settings#team-import"
              className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
            >
              CSV importieren
            </Link>
            <Link
              href="/demo"
              target="_blank"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
            >
              <Eye className="h-4 w-4" />
              Demo-Daten ansehen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
