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
}: {
  role: string;
  companyModules?: unknown;
  trialBanner: TrialBannerProps | null;
  showPasskeyNudge: boolean;
  pathname?: string;
}) {
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
