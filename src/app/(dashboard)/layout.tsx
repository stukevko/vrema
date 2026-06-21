import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import { PushBootstrap } from "@/components/pwa/PushBootstrap";
import { db } from "@/lib/db";
import { getMyUnreadSupportRepliesCount, countOpenSupportTicketsForSuperAdmin } from "@/lib/actions/support";
import { countMyUnreadNotifications } from "@/lib/actions/notifications";
import { buildBrandStyleCss, getCompanyBranding, VREMA_DEFAULT_BRAND_HEX } from "@/lib/branding/load";
import { isTenantGateExemptPath, resolveTenantGateRedirect } from "@/lib/tenant-access";
import { getCompanyTrialState } from "@/lib/trial";
import { flyerReferralDisplayName, isFlyerReferralCode } from "@/lib/trial/referral";
import { countActiveEmployees } from "@/lib/plan-limits";
import { vocabularyLabels } from "@/lib/vocabulary";
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }
  if (session.user.role === "AFFILIATE_PARTNER") {
    redirect("/partner/dashboard");
  }
  if (!session.user.companyId) {
    redirect("/setup");
  }

  const role = session.user.role ?? "EMPLOYEE";
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (
    role === "ADVISOR" &&
    !pathname.startsWith("/dashboard/peaks") &&
    !pathname.startsWith("/dashboard/account") &&
    !isTenantGateExemptPath(pathname)
  ) {
    redirect("/dashboard/peaks");
  }

  if (role !== "SUPER_ADMIN" && role !== "SUPPORT" && !isTenantGateExemptPath(pathname)) {
    const company = await db.company.findUnique({
      where: { id: session.user.companyId },
      select: { tenantStatus: true, billingExempt: true, trialEndsAt: true },
    });
    if (company && !company.billingExempt) {
      const gate = resolveTenantGateRedirect(company);
      if (gate === "suspended") {
        redirect("/dashboard/access-suspended");
      }
      if (gate === "trial-ended") {
        redirect("/dashboard/trial-ended");
      }
      if (gate === "access-pending") {
        redirect("/dashboard/access-pending");
      }
    }
  }

  const [supportUnreadRes, superOpenTicketsRes, unreadNotificationsRes] = await Promise.allSettled([
    getMyUnreadSupportRepliesCount(),
    countOpenSupportTicketsForSuperAdmin(),
    countMyUnreadNotifications(),
  ]);
  const supportUnreadCount = supportUnreadRes.status === "fulfilled" ? supportUnreadRes.value : 0;
  const superOpenTickets = superOpenTicketsRes.status === "fulfilled" ? superOpenTicketsRes.value : 0;
  const unreadNotifications = unreadNotificationsRes.status === "fulfilled" ? unreadNotificationsRes.value : 0;

  const companyRow = await db.company
    .findUnique({
      where: { id: session.user.companyId },
      select: { shiftVocabulary: true },
    })
    .catch(() => null);
  const planVocabulary = vocabularyLabels(companyRow?.shiftVocabulary);

  const companyModules = await getCompanyModulesForTenant().catch(() => ({
    peaks: false,
    plannerWeather: false,
    shiftTrade: true,
    shiftTasks: false,
    autopilot: false,
  }));

  const branding = await getCompanyBranding(session.user.companyId).catch(() => null);
  const hasCustomBrand = Boolean(branding && branding.brandHex.toLowerCase() !== VREMA_DEFAULT_BRAND_HEX.toLowerCase());
  const brandStyleCss = hasCustomBrand && branding ? buildBrandStyleCss(branding) : null;

  const showPasskeyNudge = role === "COMPANY_OWNER";

  const trialState = await getCompanyTrialState(session.user.companyId).catch(() => null);
  const trialBanner =
    trialState?.isInAppTrial
      ? {
          daysRemaining: trialState.daysRemaining,
          activeEmployees: await countActiveEmployees(session.user.companyId).catch(() => 0),
          flyerCampaignLabel:
            trialState.referredBy && isFlyerReferralCode(trialState.referredBy)
              ? flyerReferralDisplayName(trialState.referredBy)
              : null,
          trialEndsAtIso: trialState.trialEndsAt?.toISOString() ?? null,
        }
      : null;

  return (
    <div data-tenant-brand={hasCustomBrand ? "custom" : "default"} className="contents">
      {brandStyleCss ? (
        <style
          id="vrema-tenant-brand"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: brandStyleCss }}
        />
      ) : null}
      <PushBootstrap unreadCount={unreadNotifications} />
      <DashboardLayoutClient
        role={role}
        plan={session.user.plan ?? "PETITE"}
        planVocabulary={planVocabulary}
        companyModules={companyModules}
        user={session.user}
        supportUnreadCount={supportUnreadCount}
        initialSuperOpenTickets={superOpenTickets}
        initialUnreadNotifications={unreadNotifications}
        trialBanner={trialBanner}
        showPasskeyNudge={showPasskeyNudge}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
