import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthBrandLogo } from "@/components/brand/AuthBrandLogo";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Zugriff verweigert.",
  Configuration: "Authentifizierung ist momentan falsch konfiguriert.",
  Verification: "Verifizierungslink ist ungültig oder abgelaufen.",
  CredentialsSignin: "Anmeldung fehlgeschlagen. Bitte prüfe E-Mail und Passwort.",
  Default: "Authentifizierung fehlgeschlagen. Bitte versuche es erneut.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const code = params.error ?? "Default";
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.Default;

  return (
    <main className="auth-shell flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AuthBrandLogo />
        </div>
        <div className="auth-card p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger-foreground">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-danger-foreground">Anmeldung</p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Anmeldung nicht möglich</h1>
          <p className="mt-2 text-sm text-fg-muted">{message}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/login" className="btn-primary-solid w-full sm:w-auto">
              Zurück zum Login
            </Link>
            <Link href="/auth/forgot-password" className="btn-secondary-outline w-full sm:w-auto">
              Passwort zurücksetzen
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
