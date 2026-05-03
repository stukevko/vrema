import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCompanySettings } from "@/lib/actions/settings";
import { CompanySettingsForm } from "@/components/dashboard/CompanySettingsForm";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import { PasskeySecurityForm } from "@/components/dashboard/PasskeySecurityForm";
import { Settings, Building2, Lock, Fingerprint } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  const isOwner = role === "COMPANY_OWNER" || role === "SUPER_ADMIN";

  const company = isOwner ? await getCompanySettings() : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-1 sm:space-y-6 sm:px-0">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Settings className="w-6 h-6 text-muted-foreground" />
          Einstellungen
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Firma & persönliches Konto verwalten.</p>
      </div>

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
    </div>
  );
}
