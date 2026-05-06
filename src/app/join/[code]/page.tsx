import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ code: string }>;
};

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const invite = await db.inviteLink.findUnique({
    where: { code: code.toLowerCase() },
    include: { org: { select: { name: true } } },
  });
  if (!invite) notFound();

  const expired = invite.expiresAt.getTime() < Date.now();
  const usageExceeded = invite.maxUses !== null && invite.usedCount >= invite.maxUses;
  const unavailable = expired || usageExceeded;

  return (
    <main className="public-page flex items-center justify-center px-4 py-12">
      <div className="public-card w-full max-w-lg rounded-2xl p-8">
        <p className="text-xs uppercase tracking-widest text-slate-500">Team-Einladung</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{invite.org.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Rolle: {invite.role === "MANAGER" ? "Manager" : "Mitarbeiter"}
        </p>
        {unavailable ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Dieser Einladungs-Link ist leider abgelaufen oder wurde zu oft verwendet.
          </p>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Link gültig bis {invite.expiresAt.toLocaleDateString("de-DE")}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {unavailable ? (
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-500">
              Link nicht mehr gültig
            </span>
          ) : (
            <Link
              href={`/auth/register?code=${encodeURIComponent(invite.code)}&org=${encodeURIComponent(invite.orgId)}&role=${encodeURIComponent(invite.role)}`}
              className="btn-primary-solid inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
            >
              Kostenlos registrieren
            </Link>
          )}
          <Link
            href="/auth/login"
            className="btn-secondary-outline inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
          >
            Bereits Konto? Anmelden
          </Link>
        </div>
      </div>
    </main>
  );
}
