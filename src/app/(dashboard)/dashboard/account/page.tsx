import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Fingerprint, UserRound } from "lucide-react";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import { PasskeySecurityForm } from "@/components/dashboard/PasskeySecurityForm";
import { ProfileAvatarForm } from "@/components/dashboard/ProfileAvatarForm";
import { TerminalPinForm } from "@/components/dashboard/TerminalPinForm";

export default async function EmployeeAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  if (role !== "EMPLOYEE") {
    redirect("/dashboard/settings");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-[max(0.25rem,env(safe-area-inset-left))] pb-6 sm:space-y-6 sm:px-0">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Mein Konto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil, Passwort und Terminal-PIN – ohne Zugriff auf Firmeneinstellungen.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90"
        >
          Zurück zum Cockpit
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-foreground">Profil</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Profilbild – sichtbar in der Kopfzeile und bei Kolleg:innen.
        </p>
        <ProfileAvatarForm imageUrl={session.user.image ?? null} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm uppercase tracking-widest text-foreground font-sans">Passwort ändern</h2>
        </div>
        <PasswordChangeForm />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm uppercase tracking-widest text-foreground font-sans">Sicherheit</h2>
        </div>
        <PasskeySecurityForm />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm uppercase tracking-widest text-foreground font-sans">Terminal-PIN</h2>
        </div>
        <TerminalPinForm />
      </section>
    </div>
  );
}
