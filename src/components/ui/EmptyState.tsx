import * as React from "react";
import { Sparkles } from "lucide-react";

/**
 * VREMA-EmptyState – verhindert „Dead-Ends" in Listen/Tabellen.
 *
 * UX-Regel (.cursorrules):
 *  Wenn eine Liste leer ist, zeige einen sauberen Empty-State mit Call-to-Action,
 *  damit der User weiß, was als Nächstes passiert. NIE ein kahles leeres Feld.
 *
 * Verwendung:
 *   <EmptyState
 *     icon={Inbox}
 *     title="Alles erledigt für heute"
 *     description="Keine offenen Tickets, keine Korrekturen."
 *     action={<Link href="/dashboard/planning" className="btn-brand">Wochenplan öffnen</Link>}
 *   />
 */

type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  tone?: "calm" | "celebrate";
};

export function EmptyState({
  title,
  description,
  icon: Icon = Sparkles,
  action,
  className = "",
  tone = "calm",
}: EmptyStateProps) {
  const accent =
    tone === "celebrate"
      ? "from-brand/12 via-surface/40 to-transparent text-brand"
      : "from-slate-200/30 via-surface/30 to-transparent text-fg-muted";

  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-2xl",
        "border border-dashed border-line/60 bg-gradient-to-b",
        accent,
        "px-6 py-10 text-center",
        className,
      ].join(" ")}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 shadow-sm ring-1 ring-line/60 dark:bg-white/5 dark:ring-white/10">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-fg-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
