import type { ReactNode } from "react";

/**
 * Gruppiert Manager-Hinweise auf dem Dashboard in zwei klare Blöcke:
 * Planung voraus vs. Rückblick aus Betriebsdaten.
 */
export function DashboardManagerGuidance({ children }: { children: ReactNode }) {
  return <div className="order-1 space-y-8">{children}</div>;
}

export function DashboardGuidanceSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
