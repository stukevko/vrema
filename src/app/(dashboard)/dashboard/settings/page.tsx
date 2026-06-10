import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanySettings } from "@/lib/actions/settings";
import { listApiKeys } from "@/lib/actions/api-keys";
import { getBrandingSettings } from "@/lib/actions/branding";
import { getClockGeofenceSettings } from "@/lib/actions/clock-geofence";
import { getShiftTemplates } from "@/lib/actions/shift-templates";
import { getCompanyModulesForTenant } from "@/lib/actions/company-modules";
import { ShiftTemplatesSection } from "@/components/dashboard/ShiftTemplatesSection";
import { CompanyModulesSection } from "@/components/dashboard/CompanyModulesSection";
import { CompanySettingsForm } from "@/components/dashboard/CompanySettingsForm";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import { PasskeySecurityForm } from "@/components/dashboard/PasskeySecurityForm";
import { ApiKeysSection } from "@/components/dashboard/ApiKeysSection";
import { TeamCsvImport } from "@/components/dashboard/TeamCsvImport";
import { BrandingSection } from "@/components/dashboard/BrandingSection";
import { ClockGeofenceSection } from "@/components/dashboard/ClockGeofenceSection";
import { AiInsightsAuditSection } from "@/components/dashboard/AiInsightsAuditSection";
import type { LucideIcon } from "lucide-react";
import {
  Settings,
  Building2,
  Lock,
  Fingerprint,
  Users,
  CalendarDays,
  CreditCard,
  Timer,
  Shield,
  ChevronRight,
  UserRound,
  Rss,
  KeyRound,
  UploadCloud,
  Palette,
  Wifi,
  Brain,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { ProfileAvatarForm } from "@/components/dashboard/ProfileAvatarForm";
import { TerminalPinForm } from "@/components/dashboard/TerminalPinForm";
import { TerminalAccessSection } from "@/components/dashboard/TerminalAccessSection";
import { getSiteUrl } from "@/lib/seo/site";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  if (role === "EMPLOYEE") {
    redirect("/dashboard/account");
  }

  const isOwner = role === "COMPANY_OWNER" || role === "SUPER_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const showBilling = role !== "EMPLOYEE";

  const company = isOwner ? await getCompanySettings() : null;
  const apiKeys = isOwner ? await listApiKeys().catch(() => []) : [];
  const branding = isOwner ? await getBrandingSettings().catch(() => null) : null;
  const geofence = isOwner ? await getClockGeofenceSettings().catch(() => ({ enabled: false, allowlist: [] })) : null;
  const shiftTemplates = isOwner ? await getShiftTemplates().catch(() => []) : [];
  const companyModules = isOwner ? await getCompanyModulesForTenant().catch(() => null) : null;

  const mobileMoreLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/dashboard/reports", label: "Berichte", icon: FileText },
    { href: "/dashboard/vacation", label: "Abwesenheit", icon: CalendarDays },
    { href: "/dashboard/support", label: "Hilfe", icon: LifeBuoy },
    { href: "/dashboard#terminal-widget", label: "Terminal", icon: Timer },
  ];
  if (showBilling) {
    mobileMoreLinks.push({ href: "/dashboard/billing", label: "Abonnement", icon: CreditCard });
  }
  if (isSuperAdmin) {
    mobileMoreLinks.push({ href: "/dashboard/partners", label: "Vertriebspartner", icon: Shield });
    mobileMoreLinks.push({ href: "/dashboard/super-admin/blog", label: "Blog-Manager", icon: Rss });
  }

  return (
    <DashboardPageShell maxWidth="3xl">
      <DashboardPageHeader
        variant="card"
        icon={Settings}
        eyebrow="Verwaltung"
        title="Einstellungen"
        description="Zuerst Terminal & Team — erweiterte Optionen findest du unten unter „Erweitert“."
      />

      <DashboardSectionCard
        tone="brand"
        title="Täglicher Betrieb"
        icon={Timer}
        description="Tablet-Link und PIN — das brauchst du für die Stempeluhr im Betrieb."
      >
        <TerminalPinForm />
        {company?.slug ? (
          <div className="mt-4">
            <TerminalAccessSection
              terminalUrl={`${getSiteUrl()}/terminal/${company.slug}`}
              plan={session.user.plan ?? "STARTER"}
            />
          </div>
        ) : null}
        <Link
          href="/dashboard/team#invite"
          className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          <Users className="h-4 w-4" aria-hidden />
          Team einladen
        </Link>
      </DashboardSectionCard>

      <nav
        className="md:hidden rounded-2xl border border-border bg-card p-3 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
        aria-label="Weitere Bereiche"
      >
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Weitere Bereiche
        </p>
        <div className="flex flex-col gap-1">
          {mobileMoreLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors active:scale-[0.99] active:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </nav>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">Profil</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Persönliches Profilbild — erscheint in der Kopfzeile und macht das Konto leichter wiederzuerkennen.
        </p>
        <ProfileAvatarForm imageUrl={session.user.image ?? null} />
      </section>

      {/* Company settings – only for owners */}
      {isOwner && company && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-foreground uppercase tracking-widest font-sans">Firmendaten</h2>
          </div>
          <CompanySettingsForm company={company} />
        </section>
      )}

      {isOwner && companyModules && (
        <section
          id="company-modules"
          className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Module & Erweiterungen
            </h2>
          </div>
          <CompanyModulesSection
            initialModules={companyModules}
            industry={company?.industry ?? null}
          />
        </section>
      )}

      {isOwner && (
        <section
          id="shift-templates"
          className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Schicht-Vorlagen
            </h2>
          </div>
          <ShiftTemplatesSection initialTemplates={shiftTemplates} />
        </section>
      )}

      {/* Password change – for all users */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground uppercase tracking-widest font-sans">Passwort ändern</h2>
        </div>
        <PasswordChangeForm />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground uppercase tracking-widest font-sans">Sicherheit</h2>
        </div>
        <PasskeySecurityForm />
      </section>


      <details className="group rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:content-none sm:px-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Optional</p>
            <p className="text-sm font-semibold text-foreground">Erweitert · API, Branding, Geofence</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="space-y-5 border-t border-border px-4 pb-5 pt-4 sm:px-5">
      {isOwner && geofence && (
        <section
          id="ipgeofence"
          className="space-y-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Privacy-Stempeln · IP-Geofence
            </h2>
          </div>
          <ClockGeofenceSection initial={geofence} />
        </section>
      )}

      {isOwner && branding && (
        <section
          id="branding"
          className="space-y-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Custom-Branding
            </h2>
          </div>
          <BrandingSection initial={branding} />
        </section>
      )}

      {isOwner && (
        <section
          id="team-import"
          className="space-y-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Team-Import · CSV
            </h2>
          </div>
          <TeamCsvImport />
        </section>
      )}

      {isOwner && (
        <section
          id="api"
          className="space-y-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Externe API · Keys
            </h2>
          </div>
          <ApiKeysSection apiKeys={apiKeys} />
        </section>
      )}

      {(isOwner || role === "MANAGER") && (
        <section
          id="ai-insights"
          className="space-y-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">
              Planungs-Hinweise · Zurücksetzen
            </h2>
          </div>
          <AiInsightsAuditSection />
        </section>
      )}
        </div>
      </details>
    </DashboardPageShell>
  );
}
