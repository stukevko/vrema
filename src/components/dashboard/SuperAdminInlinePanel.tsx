"use client";

import { useTransition } from "react";
import Link from "next/link";
import { createCompanyBySuperAdmin, deleteCompanyBySuperAdmin, updateCompanyBySuperAdmin } from "@/lib/actions/super-admin";
import { Shield, Building2 } from "lucide-react";
import { useState } from "react";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
  billingInterval: "MONTHLY" | "YEARLY";
  isActive: boolean;
  createdAt: Date;
  userCount: number;
  activeUserCount: number;
};

type MonitoringData = {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  activeUsers: number;
  openWorkLogs: number;
  logsLast24h: number;
  newUsersLast7d: number;
  verificationTokensOpen: number;
  staleVerificationTokens: number;
  expiredSessions: number;
  retentionCronConfigured: boolean;
  generatedAt: string;
};

export function SuperAdminInlinePanel({
  companies,
  monitoring,
}: {
  companies: CompanyRow[];
  monitoring: MonitoringData;
}) {
  const [isPending, startTransition] = useTransition();
  const hasCompanies = companies.length > 0;
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  return (
    <section id="super-admin" className="rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Super Admin Modus</h2>
      </div>

      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
        Hier legen Sie <span className="text-foreground">Kundenfirmen</span> an.{" "}
        <span className="text-foreground">Empfehlungspartner (Affiliate)</span> mit Referenzlink legen Sie auf der Seite{" "}
        <Link href="/dashboard/partners" className="text-primary underline underline-offset-2 hover:text-primary/90">
          /dashboard/partners
        </Link>{" "}
        unter „Affiliate & Auszahlungen“.
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: "Firmen", value: `${monitoring.activeCompanies}/${monitoring.totalCompanies}`, tone: "text-sky-700" },
          { label: "User", value: `${monitoring.activeUsers}/${monitoring.totalUsers}`, tone: "text-emerald-700" },
          { label: "Logs 24h", value: `${monitoring.logsLast24h}`, tone: "text-violet-700" },
          { label: "Offene Clock-ins", value: `${monitoring.openWorkLogs}`, tone: "text-amber-700" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-white px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</p>
            <p className={`mt-1 text-sm font-semibold ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-white px-3 py-2 text-[11px] text-foreground">
        Monitoring: neue User (7d) <span className="text-foreground">{monitoring.newUsersLast7d}</span> · offene Tokens{" "}
        <span className="text-foreground">{monitoring.verificationTokensOpen}</span> · abgelaufene Tokens{" "}
        <span className={monitoring.staleVerificationTokens > 0 ? "text-amber-700" : "text-emerald-700"}>
          {monitoring.staleVerificationTokens}
        </span>{" "}
        · abgelaufene Sessions{" "}
        <span className={monitoring.expiredSessions > 0 ? "text-amber-700" : "text-emerald-700"}>
          {monitoring.expiredSessions}
        </span>{" "}
        · Retention-Cron{" "}
        <span className={monitoring.retentionCronConfigured ? "text-emerald-700" : "text-red-700"}>
          {monitoring.retentionCronConfigured ? "konfiguriert" : "nicht gesetzt"}
        </span>
      </div>

      <form
        className="mb-4 grid gap-2 rounded-2xl border border-border bg-card p-4 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(e.currentTarget);
          const companyName = String(fd.get("companyName") ?? "");
          const ownerName = String(fd.get("ownerName") ?? "");
          const ownerEmail = String(fd.get("ownerEmail") ?? "");

          setResultMsg(null);
          startTransition(async () => {
            try {
              const result = await createCompanyBySuperAdmin({
                companyName,
                ownerName,
                ownerEmail,
              });
              setResultMsg(
                `Firma erstellt: ${result.company.name} (${result.company.slug}) | Owner: ${result.ownerEmail} | Temp-Passwort: ${result.tempPassword}`
              );
              form.reset();
            } catch (err: unknown) {
              setResultMsg(err instanceof Error ? `Fehler: ${err.message}` : "Fehler beim Erstellen.");
            }
          });
        }}
      >
        <input
          name="companyName"
          placeholder="Firma (z. B. Muster GmbH)"
          className="rounded-2xl border border-border bg-white px-3 py-2 text-xs text-foreground"
          required
        />
        <input
          name="ownerName"
          placeholder="Owner Name"
          className="rounded-2xl border border-border bg-white px-3 py-2 text-xs text-foreground"
          required
        />
        <input
          name="ownerEmail"
          type="email"
          placeholder="owner@firma.de"
          className="rounded-2xl border border-border bg-white px-3 py-2 text-xs text-foreground"
          required
        />
        <button
          type="submit"
          className="rounded-2xl border border-primary/35 bg-primary px-3 py-2 text-xs font-semibold text-foreground hover:bg-primary/90 disabled:opacity-60"
          disabled={isPending}
        >
          Firma hinzufügen
        </button>
      </form>

      {resultMsg && (
        <p className="mb-4 rounded-2xl border border-border bg-white px-3 py-2 text-[11px] text-foreground">
          {resultMsg}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2 text-left">Firma</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Intervall</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {!hasCompanies && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  Keine Firmen vorhanden.
                </td>
              </tr>
            )}
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-foreground/85">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={c.plan}
                    onChange={(e) =>
                      startTransition(async () => {
                        await updateCompanyBySuperAdmin({
                          companyId: c.id,
                          plan: e.target.value as CompanyRow["plan"],
                          billingInterval: c.billingInterval,
                          isActive: c.isActive,
                        });
                      })
                    }
                    className="rounded-2xl border border-border bg-white px-2 py-1 text-foreground"
                    disabled={isPending}
                  >
                    <option value="STARTER">STARTER</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={c.billingInterval}
                    onChange={(e) =>
                      startTransition(async () => {
                        await updateCompanyBySuperAdmin({
                          companyId: c.id,
                          plan: c.plan,
                          billingInterval: e.target.value as CompanyRow["billingInterval"],
                          isActive: c.isActive,
                        });
                      })
                    }
                    className="rounded-2xl border border-border bg-white px-2 py-1 text-foreground"
                    disabled={isPending}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={c.isActive ? "text-emerald-700" : "text-red-700"}>{c.isActive ? "Aktiv" : "Inaktiv"}</span>
                </td>
                <td className="px-3 py-2 text-foreground">
                  {c.activeUserCount}/{c.userCount}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await updateCompanyBySuperAdmin({
                            companyId: c.id,
                            plan: c.plan,
                            billingInterval: c.billingInterval,
                            isActive: !c.isActive,
                          });
                        })
                      }
                      className="rounded-2xl border border-border bg-white px-2 py-1 text-foreground hover:bg-card/80"
                      disabled={isPending}
                    >
                      {c.isActive ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmation = window.prompt(
                          `Zum Löschen bitte den Slug eingeben: ${c.slug}`
                        );
                        if (confirmation !== c.slug) return;
                        startTransition(async () => {
                          await deleteCompanyBySuperAdmin(c.id);
                        });
                      }}
                      className="rounded-2xl border border-red-200 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100"
                      disabled={isPending}
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
