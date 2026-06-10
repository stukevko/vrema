# VREMA Pilot-Checkliste

Für **einen echten Gastronomie-Betrieb** (7 Tage Trial, bis 3 Mitarbeitende). Technik: siehe `GO_LIVE.md`.

---

## Tag 0 — Du (Betreiber VREMA)

| ✓ | Schritt |
|---|--------|
| ☐ | `npx prisma migrate deploy` auf Produktion |
| ☐ | `npm run build` grün |
| ☐ | Env: Trial ohne Karte, Resend, Stripe, OpenWeather |
| ☐ | Smoke **A + B** aus `GO_LIVE.md` |
| ☐ | Support-Ticket-Postfach beobachtet |

---

## Tag 1 — Inhaber (Owner)

**Ziel:** In unter 30 Min. Team + Terminal + erste Schicht.

| ✓ | Was der Inhaber tut | Erwartung |
|---|---------------------|-----------|
| ☐ | Registrieren, E-Mail bestätigen | Login |
| ☐ | Onboarding (4 Schritte) oder überspringen | Dashboard |
| ☐ | **Team** → 1–2 Mitarbeitende einladen | Zugangsdaten erhalten |
| ☐ | **Einstellungen** → Terminal-Link + PIN | Link am Tablet |
| ☐ | **Stoß & Umsatz** → Fr/Sa auf „Stoß“ (optional) | Gespeichert |
| ☐ | **Planung** → 1 Schicht setzen oder Autopilot → veröffentlichen | MA sieht Schicht |
| ☐ | Am Terminal: MA stempelt ein | Eintrag in Berichten |

**Erfolg Tag 1:** Mindestens ein Stempel + eine veröffentlichte Schicht sichtbar.

---

## Tag 2–3 — Mitarbeitende

| ✓ | Was | Erwartung |
|---|-----|-----------|
| ☐ | MA-Login (Handy) | Übersicht, großer Stempel-Button |
| ☐ | Bottom-Nav | Heute · Planer · Team · Urlaub · Profil (kein Auswertung/Abo) |
| ☐ | **Planung** | Nur „Mein Dienstplan“ |
| ☐ | Urlaub beantragen (optional) | Owner sieht unter Abwesenheit |

---

## Tag 4–7 — Inhaber vertieft

| ✓ | Was | Erwartung |
|---|-----|-----------|
| ☐ | Timeline: Woche blättern | Schichten passen zur Planwoche |
| ☐ | Planer-Badge „Stoß · +1 prüfen“ an Stoß-Tagen | Nur wenn Stoß-Profil + Unterbesetzung |
| ☐ | Berater einladen (Rolle Berater) | Landet nur auf Stoß & Umsatz |
| ☐ | **Auswertung** (Bottom-Nav Tab oder Desktop-Sidebar) | Hinweise ohne Score-Wand |
| ☐ | Owner-Handy: Cockpit + „Mehr anzeigen“ | Fokus oben, Rest eingeklappt |
| ☐ | Owner-Handy: Planer = Einfach-Planer | Mitarbeiter wählen → Tag antippen |
| ☐ | Support-Ticket (optional) | Antwort innerhalb 24h |

---

## Bewusst nicht im Pilot

- Kassen-Import / Umsatz pro Stunde  
- Lohnbüro-Portal  
- **Offline-PIN-Terminal** (Tablet ohne Netz — App-Stempeln offline mit Sync ist ok)  
- ML-Blackbox  

---

## Wenn etwas klemmt

| Symptom | Erste Prüfung |
|---------|----------------|
| Kein Wetter im Planer | `OPENWEATHER_API_KEY` + PLZ in Einstellungen |
| Autopilot „alles offen“ | Zu wenig Team → nur 1 Schicht/Tag; manuell planen |
| Trial blockiert 4. MA | Limit 3 — erwartet |
| Berater sieht Planer | Rolle muss „Berater“ sein, nicht Manager |
