import Link from "next/link";
import { Compass } from "lucide-react";

/** Standard-404: kein Dead-End, sondern klarer Weg zurück. */
export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-6 py-10 text-fg">
      <div className="flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border border-border bg-card px-8 py-12 text-center shadow-sm">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Fehler 404
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Diese Seite gibt es nicht
          </h1>
          <p className="text-sm text-muted-foreground">
            Die Adresse wurde vielleicht geändert oder existiert nicht mehr. Geh zurück und
            starte von vorne.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Zur Startseite
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card/80 sm:w-auto"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
