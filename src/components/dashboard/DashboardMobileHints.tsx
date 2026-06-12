"use client";

import { PwaInstallHint } from "@/components/dashboard/PwaInstallHint";
import { TrialStatusBanner } from "@/components/dashboard/TrialStatusBanner";
import { PasskeySecurityNudge } from "@/components/dashboard/PasskeySecurityNudge";

type TrialBannerProps = {
  daysRemaining: number;
  activeEmployees: number;
  flyerCampaignLabel?: string | null;
  trialEndsAtIso?: string | null;
  role: string;
};

/**
 * Mobil: maximal ein Hinweis — kein Wayfinding (Seitentitel steht in der Topbar).
 */
export function DashboardMobileHints({
  role,
  trialBanner,
  showPasskeyNudge,
  pathname = "",
  supportUnreadCount = 0,
  onOpenSupport,
}: {
  role: string;
  companyModules?: unknown;
  trialBanner: TrialBannerProps | null;
  showPasskeyNudge: boolean;
  pathname?: string;
  supportUnreadCount?: number;
  onOpenSupport?: (mode?: "default" | "unread") => void;
}) {
  if (supportUnreadCount > 0 && onOpenSupport) {
    return (
      <div className="no-print mb-4 min-w-0 max-w-full rounded-2xl border border-brand/25 bg-brand-soft/80 px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-brand/18 md:mb-5">
        <p className="font-medium">Du hast eine Antwort auf dein Support-Ticket erhalten.</p>
        <button
          type="button"
          onClick={() => onOpenSupport("unread")}
          className="mt-2 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Antwort im Support-Postfach öffnen
        </button>
      </div>
    );
  }

  if (role === "EMPLOYEE") {
    return null;
  }

  const onDashboardHome =
    pathname === "/dashboard" || pathname === "/dashboard/";
  const minimalManagerMobile =
    onDashboardHome && ["COMPANY_OWNER", "MANAGER"].includes(role);

  if (trialBanner) {
    return (
      <TrialStatusBanner
        daysRemaining={trialBanner.daysRemaining}
        activeEmployees={trialBanner.activeEmployees}
        flyerCampaignLabel={trialBanner.flyerCampaignLabel}
        trialEndsAtIso={trialBanner.trialEndsAtIso}
        role={trialBanner.role}
      />
    );
  }

  if (showPasskeyNudge && !minimalManagerMobile) {
    return <PasskeySecurityNudge />;
  }

  if (minimalManagerMobile) {
    return null;
  }

  return <PwaInstallHint />;
}
