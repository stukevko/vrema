import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import { db } from "@/lib/db";
import { getMyUnreadSupportRepliesCount, countOpenSupportTicketsForSuperAdmin } from "@/lib/actions/support";
import { countMyUnreadNotifications } from "@/lib/actions/notifications";
import { buildBrandStyleCss, getCompanyBranding, VREMA_DEFAULT_BRAND_HEX } from "@/lib/branding/load";
import { countActiveEmployees } from "@/lib/plan-limits";
import {
  getCompanyTrialState,
  isTrialExemptDashboardPath,
} from "@/lib/trial";

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

  const requireCard = process.env.REQUIRE_CARD_ON_SIGNUP === "true";
  if (requireCard && session.user.role !== "SUPER_ADMIN") {
    const company = await db.company.findUnique({
      where: { id: session.user.companyId },
      select: { paymentMethodVerifiedAt: true },
    });
    if (!company?.paymentMethodVerifiedAt) {
      redirect("/setup?payment=required");
    }
  }

  const role = session.user.role ?? "EMPLOYEE";
  const pathname = (await headers()).get("x-pathname") ?? "";
  const trialState =
    role !== "SUPER_ADMIN" && role !== "SUPPORT"
      ? await getCompanyTrialState(session.user.companyId)
      : null;

  if (trialState?.isTrialExpired && !isTrialExemptDashboardPath(pathname)) {
    const canManageBilling =
      role === "COMPANY_OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
    if (canManageBilling) {
      redirect("/dashboard/billing?trial_expired=1");
    }
    redirect("/dashboard/trial-ended");
  }

  let trialBanner: { daysRemaining: number; activeEmployees: number } | null = null;
  if (trialState?.isInAppTrial && !isTrialExemptDashboardPath(pathname)) {
    const activeEmployees = await countActiveEmployees(session.user.companyId);
    trialBanner = { daysRemaining: trialState.daysRemaining, activeEmployees };
  }

  const showPasskeyNudge =
    role === "COMPANY_OWNER" && !isTrialExemptDashboardPath(pathname);

  let supportUnreadCount = 0;
  let superOpenTickets = 0;
  let unreadNotifications = 0;
  try {
    supportUnreadCount = await getMyUnreadSupportRepliesCount();
  } catch {
    supportUnreadCount = 0;
  }
  try {
    superOpenTickets = await countOpenSupportTicketsForSuperAdmin();
  } catch {
    superOpenTickets = 0;
  }
  try {
    unreadNotifications = await countMyUnreadNotifications();
  } catch {
    unreadNotifications = 0;
  }

  // Custom-Branding: nur applizieren, wenn Firma eine eigene Hex hinterlegt hat.
  // Sonst bleibt VREMA-Petrol (Default-Branding) aktiv – kein Style-Injection,
  // kein Flackern, keine zusätzliche CSS.
  const branding = await getCompanyBranding(session.user.companyId).catch(() => null);
  const hasCustomBrand = Boolean(branding && branding.brandHex.toLowerCase() !== VREMA_DEFAULT_BRAND_HEX.toLowerCase());
  const brandStyleCss = hasCustomBrand && branding ? buildBrandStyleCss(branding) : null;

  return (
    <div data-tenant-brand={hasCustomBrand ? "custom" : "default"} className="contents">
      {brandStyleCss ? (
        <style
          id="vrema-tenant-brand"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: brandStyleCss }}
        />
      ) : null}
      <DashboardLayoutClient
        role={role}
        plan={session.user.plan ?? "STARTER"}
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
