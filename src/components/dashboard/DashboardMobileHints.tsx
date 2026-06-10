"use client";

import { useState } from "react";
import { MobileWayfindingStrip } from "@/components/dashboard/MobileWayfindingStrip";
import { PwaInstallHint } from "@/components/dashboard/PwaInstallHint";
import { TrialStatusBanner } from "@/components/dashboard/TrialStatusBanner";
import { PasskeySecurityNudge } from "@/components/dashboard/PasskeySecurityNudge";
import type { CompanyModules } from "@/lib/company-modules";

type TrialBannerProps = {
  daysRemaining: number;
  activeEmployees: number;
  flyerCampaignLabel?: string | null;
  trialEndsAtIso?: string | null;
  role: string;
};

/**
 * Mobil: maximal ein kontextloser Hinweis gleichzeitig (Support-Banner bleibt separat).
 * Priorität: Trial → Passkey → PWA → Wayfinding.
 */
export function DashboardMobileHints({
  role,
  companyModules,
  trialBanner,
  showPasskeyNudge,
}: {
  role: string;
  companyModules: CompanyModules;
  trialBanner: TrialBannerProps | null;
  showPasskeyNudge: boolean;
}) {
  const [pwaVisible, setPwaVisible] = useState(false);

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

  if (showPasskeyNudge) {
    return <PasskeySecurityNudge />;
  }

  return (
    <>
      <PwaInstallHint onVisibleChange={setPwaVisible} />
      {!pwaVisible ? <MobileWayfindingStrip role={role} companyModules={companyModules} /> : null}
    </>
  );
}
