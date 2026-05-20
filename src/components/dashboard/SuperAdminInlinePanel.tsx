"use client";

import { userErrorMessage } from "@/lib/errors/user-message";
import { useTransition } from "react";
import Link from "next/link";
import {
  createCompanyBySuperAdmin,
  deleteCompanyBySuperAdmin,
  grantCompanyPlanWithoutBilling,
  updateCompanyBySuperAdmin,
} from "@/lib/actions/super-admin";
import { Shield, Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
  billingInterval: "MONTHLY" | "YEARLY";
  isActive: boolean;
  billingExempt: boolean;
  stripeSubId: string | null;
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

const inputClass =
  "min-h-12 rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm text-fg shadow-sm " +
  "placeholder:text-fg-subtle focus:border-brand dark:border-white/12 sm:text-xs";

const selectClass =
  "min-h-10 rounded-xl border border-line bg-surface px-2 py-1.5 text-xs text-fg shadow-sm focus:border-brand dark:border-white/12";

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
    <section id="super-admin" className="glass-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-brand">Super Admin Modus</h2>
      </div>

      <p className="mb-4 text-[11px] leading-relaxed text-fg-muted">
        Hier legen Sie <span className="text-fg">Kundenfirmen</span> an.{" "}
        <span className="text-fg">Empfehlungspartner (Affiliate)</span> mit Referenzlink legen Sie auf der Seite{" "}
        <Link href="/dashboard/partners" className="font-medium text-brand underline underline-offset-2 hover:brightness-110">
          /dashboard/partners
        </Link>{" "}
        unter „Affiliate & Auszahlungen“. Blog-Artikel:{" "}
        <Link
          href="/dashboard/super-admin/blog"
          className="font-medium text-brand underline underline-offset-2 hover:brightness-110"
        >
          Blog-Manager
        </Link>
        .
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: "Firmen", value: `${monitoring.activeCompanies}/${monitoring.totalCompanies}`, tone: "brand" as const },
          { label: "User", value: `${monitoring.activeUsers}/${monitoring.totalUsers}`, tone: "success" as const },
          { label: "Logs 24h", value: `${monitoring.logsLast24h}`, tone: "info" as const },
          { label: "Offene Clock-ins", value: `${monitoring.openWorkLogs}`, tone: "warning" as const },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-line bg-surface-muted/80 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-surface-muted/45"
          >
            <p className="text-[10px] uppercase tracking-widest text-fg-muted">{m.label}</p>
            <p className="mt-1">
              <StatusBadge tone={m.tone} size="sm" glass withDot={false}>
                {m.value}
              </StatusBadge>
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-line bg-surface-muted/80 px-3 py-2 text-[11px] text-fg dark:border-white/10 dark:bg-surface-muted/45">
        Übersicht: neue Nutzer (7 Tage) <span className="font-semibold">{monitoring.newUsersLast7d}</span> · offene
        Bestätigungslinks <span className="font-semibold">{monitoring.verificationTokensOpen}</span> · abgelaufene
        Links{" "}
        <span className={monitoring.staleVerificationTokens > 0 ? "font-semibold text-warning" : "font-semibold text-brand"}>
          {monitoring.staleVerificationTokens}
        </span>{" "}
        · abgelaufene Sitzungen{" "}
        <span className={monitoring.expiredSessions > 0 ? "font-semibold text-warning" : "font-semibold text-brand"}>
          {monitoring.expiredSessions}
        </span>{" "}
        · Datenbereinigung (Cron){" "}
        <span className={monitoring.retentionCronConfigured ? "font-semibold text-brand" : "font-semibold text-danger"}>
          {monitoring.retentionCronConfigured ? "eingerichtet" : "fehlt"}
        </span>
      </div>

      <form
        className="mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-line bg-surface-muted/70 p-4 dark:border-white/10 dark:bg-surface-muted/40 sm:grid-cols-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
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
                result.welcomeEmailSent
                  ? `Firma „${result.company.name}“ erstellt. Willkommens-E-Mail mit Zugangsdaten wurde an ${result.ownerEmail} gesendet.`
                  : `Firma „${result.company.name}“ erstellt. E-Mail konnte nicht versendet werden – Startpasswort sicher an ${result.ownerEmail} übermitteln: ${result.tempPassword}`,
              );
              form.reset();
            } catch (err: unknown) {
              setResultMsg(userErrorMessage(err, "Firma konnte nicht erstellt werden."));
            }
          });
        }}
      >
        <input name="companyName" placeholder="Firma (z. B. Muster GmbH)" className={inputClass} required />
        <input name="ownerName" placeholder="Name des Inhabers" className={inputClass} required />
        <input name="ownerEmail" type="email" placeholder="owner@firma.de" className={inputClass} required />
        <Button type="submit" variant="brand" size="md" className="w-full lg:col-span-1" disabled={isPending} loading={isPending}>
          Firma hinzufügen
        </Button>
      </form>

      {resultMsg && (
        <p className="mb-4 rounded-2xl border border-line bg-surface px-3 py-2 text-[11px] text-fg dark:border-white/10">
          {resultMsg}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface-muted/60 dark:border-white/10 dark:bg-surface-muted/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line text-fg-muted dark:border-white/10">
              <th className="px-3 py-2 text-left">Firma</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-left">Intervall</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Kostenfrei</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {!hasCompanies && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-fg-muted">
                  Keine Firmen vorhanden.
                </td>
              </tr>
            )}
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 dark:border-white/8">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-fg-muted" />
                    <div>
                      <p className="text-fg/90">{c.name}</p>
                      <p className="text-[10px] text-fg-muted">{c.slug}</p>
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
                          billingExempt: c.billingExempt,
                        });
                      })
                    }
                    className={selectClass}
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
                          billingExempt: c.billingExempt,
                        });
                      })
                    }
                    className={selectClass}
                    disabled={isPending}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge tone={c.isActive ? "brand" : "neutral"} size="sm" glass withDot={false}>
                    {c.isActive ? "Aktiv" : "Inaktiv"}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2 text-[10px] font-medium text-fg">
                    <input
                      type="checkbox"
                      defaultChecked={c.billingExempt}
                      disabled={isPending}
                      onChange={(e) =>
                        startTransition(async () => {
                          await updateCompanyBySuperAdmin({
                            companyId: c.id,
                            plan: c.plan,
                            billingInterval: c.billingInterval,
                            isActive: c.isActive,
                            billingExempt: e.target.checked,
                          });
                          setResultMsg(
                            e.target.checked
                              ? `„${c.name}“ ist kostenfrei — Stripe-Abo wurde beendet (falls vorhanden).`
                              : `„${c.name}“ nutzt wieder normale Abrechnung.`,
                          );
                        })
                      }
                      className="h-4 w-4 rounded border-line"
                    />
                    {c.billingExempt ? "Ja" : "Nein"}
                  </label>
                  {c.stripeSubId && !c.billingExempt ? (
                    <p className="mt-1 text-[9px] text-warning">Stripe aktiv</p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-fg">
                  {c.activeUserCount}/{c.userCount}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          await grantCompanyPlanWithoutBilling({
                            companyId: c.id,
                            plan: c.plan,
                            billingInterval: c.billingInterval,
                          });
                          setResultMsg(`„${c.name}“: ${c.plan} kostenfrei freigeschaltet (ohne Stripe).`);
                        })
                      }
                      disabled={isPending}
                    >
                      Schenken
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-danger/35 text-danger-foreground hover:border-danger/50 hover:bg-danger-soft/70 hover:text-danger"
                      onClick={() =>
                        startTransition(async () => {
                          await updateCompanyBySuperAdmin({
                            companyId: c.id,
                            plan: c.plan,
                            billingInterval: c.billingInterval,
                            isActive: !c.isActive,
                            billingExempt: c.billingExempt,
                          });
                        })
                      }
                      disabled={isPending}
                    >
                      {c.isActive ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const confirmation = window.prompt(
                          `Zum Löschen bitte die Firmen-Kennung eingeben: ${c.slug}`,
                        );
                        if (confirmation !== c.slug) return;
                        startTransition(async () => {
                          await deleteCompanyBySuperAdmin(c.id);
                        });
                      }}
                      disabled={isPending}
                    >
                      Löschen
                    </Button>
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
