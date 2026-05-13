import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanySettings } from "@/lib/actions/settings";
import { listApiKeys } from "@/lib/actions/api-keys";
import { getBrandingSettings } from "@/lib/actions/branding";
import { getClockGeofenceSettings } from "@/lib/actions/clock-geofence";
import { CompanySettingsForm } from "@/components/dashboard/CompanySettingsForm";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import { PasskeySecurityForm } from "@/components/dashboard/PasskeySecurityForm";
import { ApiKeysSection } from "@/components/dashboard/ApiKeysSection";
import { BrandingSection } from "@/components/dashboard/BrandingSection";
import { ClockGeofenceSection } from "@/components/dashboard/ClockGeofenceSection";
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
  Palette,
  Wifi,
} from "lucide-react";
import { ProfileAvatarForm } from "@/components/dashboard/ProfileAvatarForm";
import { TerminalPinForm } from "@/components/dashboard/TerminalPinForm";

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

  const mobileMoreLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "/dashboard/vacation", label: "Urlaub", icon: CalendarDays },
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
    <div className="mx-auto max-w-3xl space-y-5 px-1 sm:space-y-6 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Settings className="w-6 h-6 text-muted-foreground" />
          Einstellungen
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Firma & persönliches Konto verwalten.</p>
      </div>

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

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-foreground uppercase tracking-widest font-sans">Terminal-PIN</h2>
        </div>
        <TerminalPinForm />
      </section>

      {/* Enterprise: Geofencing-Toggle ist auch in Business sinnvoll und sicher,
          deshalb für alle Owner sichtbar. */}
      {isOwner && geofence && (
        <section
          id="ipgeofence"
          className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5"
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

      {/* Enterprise: Custom Branding (Plan-Gate in Action selbst). */}
      {isOwner && branding && (
        <section
          id="branding"
          className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5"
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

      {/* Enterprise: External API */}
      {isOwner && (
        <section
          id="api"
          className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5"
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
    </div>
  );
}
