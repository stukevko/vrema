import { BlogPostCategory } from "@prisma/client";

/**
 * Idempotenter Inhalt für `npm run blog:seed` — entspricht den früheren drei posts.tsx-Artikeln.
 * HTML + optional {{YOUTUBE}}-Marker für die Einbettung.
 */
export const DEFAULT_BLOG_SEED_ROWS = [
  {
    slug: "vrema-release-1-0",
    title: "VREMA Release 1.0 – Die neue Ära der Zeiterfassung",
    teaser:
      "Was Release 1.0 für Teams bedeutet: klare Stempelprozesse, DSGVO ohne Standort-Tracking und ein Produkt-Journal für Transparenz.",
    category: BlogPostCategory.UPDATES,
    youtubeId: null as string | null,
    published: true,
    content: `
<p>Mit Release 1.0 legen wir den Grundstein für eine Zeiterfassung, die sich an Unternehmen richtet, die
Präzision, Datenschutz und Alltagstauglichkeit gleichermaßen ernst nehmen. Dieses Journal begleitet Sie ab
jetzt durch Updates, Tutorials und kuratiertes Wissen rund um VREMA.</p>
<h2>Was ist neu?</h2>
<ul>
<li>Einheitliches Dashboard für Mitarbeitende und Führungskräfte</li>
<li>Terminal mit optimistischer Oberfläche — Stempeln fühlt sich sofort an</li>
<li>Klare Trennung: keine Standortdaten, Fokus auf revisionssichere Zeiten</li>
</ul>
{{YOUTUBE}}
<h2>Für wen ist VREMA gedacht?</h2>
<p>Für Organisationen, die Lohnvorbereitung, Nachvollziehbarkeit und moderne UX nicht gegeneinander ausspielen
wollen. Ob Handwerk, Büro oder verteilte Teams — die Plattform skaliert mit Ihrem Bedarf.</p>
<p>Im nächsten Schritt zeigen wir Ihnen in Tutorials Schritt für Schritt, wie Sie Terminal, Team und Auswertungen
in wenigen Minuten produktiv nutzen.</p>
`.trim(),
  },
  {
    slug: "terminal-in-drei-minuten",
    title: "Tutorial: Terminal in drei Minuten einrichten",
    teaser:
      "QR-Terminal oder Browser: So bringen Sie die erste Stempel-Umgebung ohne Frust ans Laufen — inklusive Checkliste.",
    category: BlogPostCategory.TUTORIALS,
    youtubeId: null,
    published: true,
    content: `
<p>Das Terminal ist der schnellste Weg, damit alle denselben klaren Prozess nutzen. Dieses Tutorial fasst die
wichtigsten Schritte zusammen — perfekt für den Rollout am Montagmorgen.</p>
<h2>Checkliste</h2>
<ol>
<li>Firma und Team in VREMA anlegen</li>
<li>Terminal-Link oder QR-Station bereitstellen</li>
<li>Teststempelung mit einem Pilot-Team durchführen</li>
<li>Kurzes Feedback einholen und Rollout planen</li>
</ol>
<h2>Tipps</h2>
<p>Halten Sie die Kommunikation knapp: ein Satz zur Datenschutz-Entscheidung (kein GPS), ein Satz zur Bedienung
(ein Tipp zum Stempeln). Das senkt die Akzeptanzhürde spürbar.</p>
`.trim(),
  },
  {
    slug: "gobd-und-zeiterfassung",
    title: "Wissen: GoBD und Zeiterfassung — worauf es ankommt",
    teaser:
      "Keine Rechtsberatung, aber eine kompakte Orientierung: welche Prinzipien bei digitalen Arbeitszeiten oft geprüft werden.",
    category: BlogPostCategory.KNOWLEDGE,
    youtubeId: null,
    published: true,
    content: `
<p><strong>Hinweis:</strong> Dieser Beitrag ersetzt keine Rechts- oder Steuerberatung. Er fasst typische
Erwartungen an dokumentierte Arbeitszeiten zusammen, damit Sie mit Ihrer Fachkraft gezielt sprechen können.</p>
<h2>Unveränderbarkeit &amp; Nachvollziehbarkeit</h2>
<p>Digitale Zeiterfassung sollte nachvollziehbar und schützenswert dokumentiert sein. Änderungen an Buchungen
sollten transparent bleiben — inklusive Zeitpunkt und Bearbeiter, wo es Ihr Prozess vorsieht.</p>
<h2>Praktische Hygiene</h2>
<ul>
<li>Klare Rollen: wer darf korrigieren, wer genehmigt?</li>
<li>Exporte für definierte Zeiträume archivieren</li>
<li>Schulungen kurz halten und wiederholen</li>
</ul>
`.trim(),
  },
] as const;
