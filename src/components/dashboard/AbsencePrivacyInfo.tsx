import Link from "next/link";
import { ShieldCheck } from "lucide-react";

type Props = {
  isManager: boolean;
};

/**
 * Transparenz „Was sieht wer?“ — Vertrauen vor Aktion (B2B: Arbeitgeber = Verantwortlicher).
 */
export function AbsencePrivacyInfo({ isManager }: Props) {
  return (
    <details className="group rounded-2xl border border-line bg-surface-muted/40 dark:border-white/10 dark:bg-surface-muted/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground marker:content-none sm:px-5 sm:py-3.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        Was sieht wer? — Datenschutz in Kurzform
        <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Aufklappen</span>
      </summary>
      <div className="space-y-4 border-t border-line px-4 pb-4 pt-3 text-[13px] leading-relaxed text-foreground dark:border-white/10 sm:px-5 sm:pb-5">
        {isManager ? (
          <>
            <div>
              <p className="font-semibold">Als Führungskraft siehst du</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Team-Anträge (Urlaub, Krank, Sonderfälle) inkl. Zeitraum und Status</li>
                <li>Resturlaub und Überschneidungen — nur bei Urlaubsanträgen, nicht bei Krank</li>
                <li>Optionale Krank-Notiz (z. B. „AU folgt“) — keine Diagnose erforderlich</li>
                <li>AU-Nachweis nur on demand über gesicherten Link, nicht in Listen</li>
                <li>Im Planer: Vorname + „krank“/„Urlaub“ zur Einsatzplanung</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Du siehst bewusst nicht</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Urlaubsgründe — werden nicht abgefragt (BUrlG / Datenminimierung)</li>
                <li>Stundenlöhne anderer Mitarbeitender (nur eigene Zahlen im Profil)</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-semibold">Als Mitarbeiter:in siehst du</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Nur deine eigenen Anträge und optional deine Krank-Notiz</li>
                <li>Im Planer nur deine Schichten — nicht den Krank/Urlaub-Status von Kolleg:innen</li>
                <li>Im Team: Namen, Rolle, Wochenstunden — deinen Stundenlohn nur bei dir selbst</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Deine Leitung sieht bei dir</p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Zeitraum und Art der Abwesenheit (Urlaub / Krank)</li>
                <li>Optionale Notiz und AU-Datei, falls du sie hochlädst</li>
                <li>Keinen Urlaubsgrund — das Feld gibt es nicht</li>
              </ul>
            </div>
          </>
        )}
        <p className="text-[12px] text-muted-foreground">
          Rechtsgrundlage im Arbeitsverhältnis: Art. 6 Abs. 1 lit. b DSGVO; AU-Nachweise können
          Gesundheitsdaten (Art. 9) sein — Verarbeitung zur arbeitsrechtlichen Nachweispflicht. AU-Dateien
          werden nach Ablauf der Aufbewahrungsfrist automatisch gelöscht. Betroffenenrechte (Auskunft,
          Löschung) richtest du an deinen Arbeitgeber; Plattformbetreiber:{" "}
          <Link href="/datenschutz" className="font-semibold text-brand hover:underline">
            Datenschutzhinweise
          </Link>
          .
        </p>
      </div>
    </details>
  );
}
