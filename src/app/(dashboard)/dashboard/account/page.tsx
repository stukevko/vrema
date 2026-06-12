import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Fingerprint, UserRound, Bell } from "lucide-react";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import { PasskeySecurityForm } from "@/components/dashboard/PasskeySecurityForm";
import { ProfileAvatarForm } from "@/components/dashboard/ProfileAvatarForm";
import { TerminalPinForm } from "@/components/dashboard/TerminalPinForm";
import { AvailabilityEditor } from "@/components/dashboard/AvailabilityEditor";
import { PushNotificationToggle } from "@/components/pwa/PushNotificationToggle";
import { getMyWorkSchedule } from "@/lib/actions/work-schedule";
import { CalendarOff } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardSectionCard } from "@/components/dashboard/DashboardSectionCard";

export default async function EmployeeAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.role ?? "EMPLOYEE";
  if (role !== "EMPLOYEE") {
    redirect("/dashboard/settings");
  }

  const workSchedule = await getMyWorkSchedule();

  return (
    <DashboardPageShell
      maxWidth="3xl"
      className="space-y-5 px-[max(0.25rem,env(safe-area-inset-left))] pb-6 sm:px-0"
    >
      <DashboardPageHeader
        variant="hero"
        eyebrow="Profil"
        title="Mein Konto"
        description="Profil, Passwort und Terminal-PIN — ohne Zugriff auf Firmeneinstellungen."
        hideOnMobile
        actions={
          <Link
            href="/dashboard"
            className="btn-brand inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
          >
            Zurück zum Cockpit
          </Link>
        }
      />

      <DashboardSectionCard
        title="Profil"
        icon={UserRound}
        description="Profilbild — sichtbar in der Kopfzeile und bei Kolleg:innen."
      >
        <ProfileAvatarForm imageUrl={session.user.image ?? null} />
      </DashboardSectionCard>

      <DashboardSectionCard title="Passwort ändern" icon={Lock}>
        <PasswordChangeForm />
      </DashboardSectionCard>

      <DashboardSectionCard title="Sicherheit" icon={Fingerprint}>
        <PasskeySecurityForm />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Benachrichtigungen"
        icon={Bell}
        description="Push auf dieses Gerät — pro Gerät einzeln steuerbar."
      >
        <PushNotificationToggle />
      </DashboardSectionCard>

      <DashboardSectionCard title="Verfügbarkeit" icon={CalendarOff}>
        <AvailabilityEditor initial={workSchedule} />
      </DashboardSectionCard>

      <DashboardSectionCard title="Terminal-PIN" icon={Lock}>
        <TerminalPinForm />
      </DashboardSectionCard>
    </DashboardPageShell>
  );
}
