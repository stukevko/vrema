import clsx from "clsx";
import type { ReactNode } from "react";

export type DashboardMaxWidth = "2xl" | "3xl" | "4xl" | "5xl" | "6xl";

const WIDTH_CLASS: Record<DashboardMaxWidth, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

type Props = {
  children: ReactNode;
  maxWidth?: DashboardMaxWidth;
  className?: string;
  /** Billing/Partner: sanfter Fade-in */
  animateEnter?: boolean;
};

/** Einheitlicher Seiten-Rahmen für alle Dashboard-Routen. */
export function DashboardPageShell({
  children,
  maxWidth = "6xl",
  className,
  animateEnter = false,
}: Props) {
  return (
    <div
      className={clsx(
        "mx-auto w-full min-w-0 max-w-full space-y-5 px-1 text-foreground sm:space-y-6 sm:px-0",
        WIDTH_CLASS[maxWidth],
        animateEnter && "premium-enter",
        className,
      )}
    >
      {children}
    </div>
  );
}
