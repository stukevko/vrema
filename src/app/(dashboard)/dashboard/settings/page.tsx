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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-muted-foreground" />
          Einstellungen
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Firma & persönliches Konto verwalten.</p>
      </div>

      {/* Company settings – only for owners */}
      {isOwner && company && (
        <section className="rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm text-slate-700 uppercase tracking-widest font-sans">Firmendaten</h2>
          </div>
          <CompanySettingsForm company={company} />
        </section>
      )}

      {/* Password change – for all users */}
      <section className="rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-slate-700 uppercase tracking-widest font-sans">Passwort ändern</h2>
        </div>
        <PasswordChangeForm />
      </section>

      <section className="rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-slate-700 uppercase tracking-widest font-sans">Sicherheit</h2>
        </div>
        <PasskeySecurityForm />
      </section>
    </div>
  );
}
