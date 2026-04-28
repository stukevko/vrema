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
    <section id="super-admin" className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-300" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-200/90">Super Admin Modus</h2>
      </div>

      <p className="mb-4 text-[11px] leading-relaxed text-white/45">
        Hier legst du <span className="text-white/65">Kundenfirmen</span> an.{" "}
        <span className="text-white/65">Empfehlungspartner (Affiliate)</span> mit Ref-Link erstellst du auf der Seite{" "}
        <Link href="/dashboard/partners" className="text-amber-200/95 underline underline-offset-2 hover:text-amber-100">
          /dashboard/partners
        </Link>{" "}
        unter „Affiliate & Auszahlungen“.
      </p>

      <div className="mb-4 grid gap-2 md:grid-cols-4">
        {[
          { label: "Firmen", value: `${monitoring.activeCompanies}/${monitoring.totalCompanies}`, tone: "text-sky-300" },
          { label: "User", value: `${monitoring.activeUsers}/${monitoring.totalUsers}`, tone: "text-emerald-300" },
          { label: "Logs 24h", value: `${monitoring.logsLast24h}`, tone: "text-violet-300" },
          { label: "Offene Clock-ins", value: `${monitoring.openWorkLogs}`, tone: "text-amber-300" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-white/10 bg-[#111] px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40">{m.label}</p>
            <p className={`mt-1 text-sm font-semibold ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-[11px] text-white/65">
        Monitoring: neue User (7d) <span className="text-white/90">{monitoring.newUsersLast7d}</span> · offene Tokens{" "}
        <span className="text-white/90">{monitoring.verificationTokensOpen}</span> · abgelaufene Tokens{" "}
        <span className={monitoring.staleVerificationTokens > 0 ? "text-amber-300" : "text-emerald-300"}>
          {monitoring.staleVerificationTokens}
        </span>{" "}
        · abgelaufene Sessions{" "}
        <span className={monitoring.expiredSessions > 0 ? "text-amber-300" : "text-emerald-300"}>
          {monitoring.expiredSessions}
        </span>{" "}
        · Retention-Cron{" "}
        <span className={monitoring.retentionCronConfigured ? "text-emerald-300" : "text-red-300"}>
          {monitoring.retentionCronConfigured ? "konfiguriert" : "nicht gesetzt"}
        </span>
      </div>

      <form
        className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-[#111] p-3 md:grid-cols-4"
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
          className="rounded border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white"
          required
        />
        <input
          name="ownerName"
          placeholder="Owner Name"
          className="rounded border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white"
          required
        />
        <input
          name="ownerEmail"
          type="email"
          placeholder="owner@firma.de"
          className="rounded border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white"
          required
        />
        <button
          type="submit"
          className="rounded border border-amber-300/35 bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/20 disabled:opacity-60"
          disabled={isPending}
        >
          Firma hinzufügen
        </button>
      </form>

      {resultMsg && (
        <p className="mb-4 rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-[11px] text-white/75">
          {resultMsg}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#111]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
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
                <td colSpan={6} className="px-3 py-4 text-center text-white/40">
                  Keine Firmen vorhanden.
                </td>
              </tr>
            )}
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.06] last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-white/35" />
                    <div>
                      <p className="text-white/85">{c.name}</p>
                      <p className="font-mono text-[10px] text-white/35">{c.slug}</p>
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
                    className="rounded border border-white/10 bg-[#0b0b0b] px-2 py-1 text-white"
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
                    className="rounded border border-white/10 bg-[#0b0b0b] px-2 py-1 text-white"
                    disabled={isPending}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={c.isActive ? "text-[#22c55e]" : "text-red-300"}>{c.isActive ? "Aktiv" : "Inaktiv"}</span>
                </td>
                <td className="px-3 py-2 text-white/70">
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
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white/80 hover:bg-white/10"
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
                      className="rounded border border-red-400/25 bg-red-500/10 px-2 py-1 text-red-300 hover:bg-red-500/20"
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
