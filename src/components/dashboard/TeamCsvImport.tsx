"use client";
import { userErrorMessage } from "@/lib/errors/user-message";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Upload, Download } from "lucide-react";
import { previewTeamImport, commitTeamImport } from "@/lib/actions/team-import";
import { useToast } from "@/components/ui/Toast";
import type { ImportRowDiagnosis } from "@/lib/team/csv-import";

const SAMPLE_CSV = `name,email,role,weeklyHours
Anna Krüger,anna@beispiel.de,EMPLOYEE,32
Mehmet Öztürk,mehmet@beispiel.de,MANAGER,40
Sofia Romano,sofia@beispiel.de,EMPLOYEE,20`;

export function TeamCsvImport() {
  const { show } = useToast();
  const [csv, setCsv] = useState<string>("");
  const [rows, setRows] = useState<ImportRowDiagnosis[] | null>(null);
  const [summary, setSummary] = useState<{ ok: number; warn: number; err: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result ?? "");
      setCsv(txt);
      setRows(null);
      setSummary(null);
    };
    reader.readAsText(file);
  }

  function runPreview() {
    if (!csv.trim()) {
      show("Bitte zuerst eine CSV einfügen oder hochladen.", "info");
      return;
    }
    startTransition(async () => {
      try {
        const res = await previewTeamImport(csv);
        setRows(res.rows);
        setSummary({ ok: res.okCount, warn: res.warnCount, err: res.errorCount });
      } catch (e) {
        show(userErrorMessage(e, "Vorschau fehlgeschlagen."), "error");
      }
    });
  }

  function runImport() {
    if (!csv.trim()) return;
    if (!confirm("Wirklich importieren? Mitarbeitende erhalten eine Willkommens-Mail mit Login-Daten.")) return;
    startTransition(async () => {
      try {
        const res = await commitTeamImport(csv);
        show(
          `Import abgeschlossen: ${res.imported} angelegt, ${res.skipped} übersprungen, ${res.failed} Fehler.`,
          res.failed > 0 ? "info" : "success",
        );
        if (res.failed > 0 && res.failures.length > 0) {
          console.warn("Import-Fehler:", res.failures);
        }
        setCsv("");
        setRows(null);
        setSummary(null);
      } catch (e) {
        show(userErrorMessage(e, "Import fehlgeschlagen."), "error");
      }
    });
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Lade eine CSV-Datei mit Spalten <code className="rounded bg-surface-muted px-1 py-0.5 text-[11px]">name, email, role, weeklyHours</code>{" "}
        hoch oder kopiere sie ins Feld unten. Wir prüfen alles vor dem Anlegen.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted">
          <Upload className="h-4 w-4" />
          Datei wählen
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`}
          download="vrema-team-vorlage.csv"
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Beispiel-CSV herunterladen
        </a>
      </div>

      <textarea
        value={csv}
        onChange={(e) => {
          setCsv(e.target.value);
          setRows(null);
          setSummary(null);
        }}
        rows={6}
        className="input-field-subtle mt-3 w-full font-mono text-xs"
        placeholder={SAMPLE_CSV}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runPreview}
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          Vorschau erstellen
        </button>
        {rows && summary && summary.ok > 0 && (
          <button
            type="button"
            onClick={runImport}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Importiere…" : `${summary.ok} Mitarbeitende importieren`}
          </button>
        )}
      </div>

      {summary && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge tone="ok" label={`${summary.ok} bereit`} icon={CheckCircle2} />
          {summary.warn > 0 && <Badge tone="warn" label={`${summary.warn} Dubletten`} icon={AlertTriangle} />}
          {summary.err > 0 && <Badge tone="err" label={`${summary.err} Fehler`} icon={AlertOctagon} />}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card dark:bg-surface/70">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-surface-muted/70 text-[10px] uppercase tracking-widest text-muted-foreground dark:bg-surface/50">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">E-Mail</th>
                <th className="px-3 py-2">Rolle</th>
                <th className="px-3 py-2">Wochenstd.</th>
                <th className="px-3 py-2">Hinweis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/70">
                  <td className="px-3 py-2">
                    {r.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="OK" />}
                    {r.status === "duplicate" && <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Dublette" />}
                    {r.status === "invalid" && <AlertOctagon className="h-4 w-4 text-rose-600" aria-label="Fehler" />}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {r.status === "invalid" ? r.raw.name || "—" : r.name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.status === "invalid" ? r.raw.email || "—" : r.email}
                  </td>
                  <td className="px-3 py-2">{r.status === "ok" ? r.role : "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{r.status === "ok" ? r.weeklyHours : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.status === "duplicate" && "E-Mail existiert bereits"}
                    {r.status === "invalid" && r.reason}
                    {r.status === "ok" && "Bereit zum Import"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Badge({ tone, label, icon: Icon }: { tone: "ok" | "warn" | "err"; label: string; icon: typeof CheckCircle2 }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    err: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold uppercase tracking-widest ${styles}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
