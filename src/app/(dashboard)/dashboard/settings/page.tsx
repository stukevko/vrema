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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-white/40" />
          Einstellungen
        </h1>
        <p className="text-white/40 text-sm mt-1">Firma & persönliches Konto verwalten.</p>
      </div>

      {/* Company settings – only for owners */}
      {isOwner && company && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-white/30" />
            <h2 className="font-semibold text-sm text-white/60 uppercase tracking-widest font-mono">Firmendaten</h2>
          </div>
          <CompanySettingsForm company={company} />
        </section>
      )}

      {/* Password change – for all users */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-white/30" />
          <h2 className="font-semibold text-sm text-white/60 uppercase tracking-widest font-mono">Passwort ändern</h2>
        </div>
        <PasswordChangeForm />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="w-4 h-4 text-white/30" />
          <h2 className="font-semibold text-sm text-white/60 uppercase tracking-widest font-mono">Sicherheit</h2>
        </div>
        <PasskeySecurityForm />
      </section>
    </div>
  );
}
