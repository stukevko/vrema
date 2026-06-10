# VREMA — Release Smoke-Test

Manuelle Checkliste **vor jedem Production-Push** (ca. 15–20 Min.). Bei einem roten Punkt: **kein Deploy**, Issue fixen oder Rollback planen.

**Tester:** __________ · **Datum:** __________ · **Build/Commit:** __________

---

## Auth & Zugang

- [ ] **Login** mit bestehendem Account (E-Mail + Passwort) → Dashboard ohne 500/Redirect-Loop
- [ ] **Logout** → erneuter Login funktioniert
- [ ] **Passwort vergessen** (falls genutzt): Reset-Mail-Link öffnet Formular

## Stempeln & Live-Daten

- [ ] **Einstempeln** (Dashboard oder Terminal) → Status „aktiv“ / Uhr sichtbar
- [ ] **Ausstempeln** → Nettozeit erscheint in Berichten **ohne F5** (ggf. `router.refresh` / kurz warten)
- [ ] **Terminal-PIN** (falls aktiv): Stempeln mit PIN klappt
- [ ] **Offline-Stempeln** (App): Flugmodus → einstempeln → „Offline gespeichert“ → online → Sync-Toast + Eintrag in Berichten

## Schichtplan

- [ ] **Schicht zuweisen** im Planer → Person erscheint in der Schichtkarte
- [ ] **Zuweisung entfernen** → kein 500 in Netzwerk-Tab, Person verschwindet nach Aktion
- [ ] **Ungültige Zeit** (z. B. >18 h) → konkrete Fehlermeldung, nicht nur „Speichern fehlgeschlagen“
- [ ] **Schicht-Vorlage** anlegen/löschen (Einstellungen) → Liste aktualisiert ohne Hard-Reload
- [ ] **Schichtplan PDF** (Business): Button im Planer → PDF mit Team × Mo–So, lesbar auf dem Handy
- [ ] **Mitarbeiter „Mein Dienstplan“**: Wochen-Raster + Liste chronologisch, Drucken/PDF speichern möglich
- [ ] **Chef Mobil Planer**: Einfach-Planer (Mitarbeiter-Chip + Tages-Pills), keine horizontale Desktop-Board-Scroll-Hölle

## Team & Einstellungen

- [ ] **Team-Einladung** (E-Mail oder Link) → Erfolgsmeldung, kein stiller Fehler
- [ ] **Rolle / Stundenlohn** ändern → Wert in Team-Liste sofort sichtbar
- [ ] **Firmeneinstellungen speichern** → gespeicherte Werte nach Reload/Refresh noch da
- [ ] **API-Key** erstellen + revoken/löschen → Liste aktualisiert

## Berichte & Korrekturen

- [ ] **Berichte** Monatsansicht lädt (kein leerer Crash)
- [ ] **Korrektur-Modal** (fehlender Tag): Öffnen, Grund + Zeiten, „Korrektur speichern“ → Toast + Zeile aktualisiert
- [ ] **PDF-Export** (Hochformat A4): Stunden plausibel (z. B. ~7,5 h statt ~31 h bei Tages-Schicht), Tabelle ohne Abschnitt rechts
- [ ] **Druckvorschau** (`@page` portrait): Layout lesbar, kein Querformat-Zwang

## Module & Grenzfälle

- [ ] **Navigation**: deaktiviertes Modul (z. B. Stoß) **nicht** in Sidebar sichtbar
- [ ] **Mobile MA** (375px): Bottom-Nav Heute · Planer · Team · Urlaub · Profil
- [ ] **Mobile Chef** (375px): Bottom-Nav Start · Planer · Team · **Auswertung** · Profil; Berichte im Cockpit-Schnellzugriff
- [ ] **Mobile Chef Start**: Fokus-Cockpit sichtbar, „Mehr auf der Startseite“ klappt auf
- [ ] **Mobile**: max. ein Banner-Hinweis (Trial/Passkey/PWA/Wayfinding), kein abgeschnittenes Modal
- [ ] **Health** `GET /api/health` → 200 OK

## Nach Deploy (Production)

- [ ] Smoke auf **vrema.app** mit echtem Pilot-Account wiederholt (mindestens Login, Stempeln, Planer, Berichte)
- [ ] Server-Logs: **keine** neuen `[vrema:onRequestError]`-Einträge während des Tests

---

*FINAL Sprint Woche 1 — Fokus: Vertrauen, keine neuen Features.*
