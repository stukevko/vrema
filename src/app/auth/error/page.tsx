import Link from "next/link";

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
    <main className="min-h-screen bg-background text-white px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-white/5 bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <p className="text-xs font-sans uppercase tracking-widest text-red-300">Auth Error</p>
        <h1 className="mt-2 text-xl font-bold">Anmeldung nicht möglich</h1>
        <p className="mt-3 text-sm text-white/70">{message}</p>
        <div className="mt-6">
          <Link href="/auth/login" className="text-sm font-semibold text-primary hover:underline">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </main>
  );
}
