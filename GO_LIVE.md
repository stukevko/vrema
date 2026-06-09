# VREMA GO LIVE

Dieses Runbook ist für den Moment gedacht, in dem du auf der VM den Schalter umlegst.

## 0) Pre-Launch Checkliste (alles REQUIRED außer „Optional“)

| Variable / Schritt | Zweck |
|--------------------|--------|
| `DATABASE_URL` | Postgres |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` | Login |
| `NEXT_PUBLIC_APP_URL` | Links, SEO, E-Mails |
| `STRIPE_*` (Live) | Abos |
| Stripe Webhook-Events | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, **`invoice.payment_failed`**, `invoice.payment_action_required`, `charge.refunded` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Verify, Reset, Welcome |
| `SUPER_ADMIN_USER_ID` | Backoffice |
| `AUTH_WEBAUTHN_*` | Passkeys (Domain muss passen) |
| `OPENWEATHER_API_KEY` | Wetter im Planer + Personal-Empfehlung |
| `DATA_RETENTION_CRON_SECRET` | Nightly Cleanup + Trial-Reminder (Fallback) |
| `TRIAL_REMINDER_CRON_SECRET` | Optional: eigener Secret für Trial-E-Mails |
| `RESEND_API_KEY` | Verify, Reset, Welcome, **Trial-Ende-E-Mails** |
| `REQUIRE_CARD_ON_SIGNUP=false` | Trial ohne Karte (Standard) |
| Flyer `/ref/speyer` | 30 Tage Trial ohne Karte (`FLYER_CAMPAIGN_CODES`) |
| `NEXT_PUBLIC_REQUIRE_CARD_ON_SIGNUP=false` | Marketing-Copy ohne Karten-Zwang — **nach Änderung neu bauen** |
| `npm run build` grün | Kein kaputter Deploy |
| `npm run prod:cleanup` einmalig | Keine Test-Altlasten |
| Smoke-Tests unten | Register → Dashboard → Passkey → Terminal |

Ohne `OPENWEATHER_API_KEY` läuft VREMA – aber **ohne Wetterzeile im Planer** und mit abgeschwächter Personal-Vorhersage.

## 1) Vorbereitung auf der VM

1. **Repository aktualisieren**
   - `git clone <repo-url>` oder im bestehenden Verzeichnis:
   - `git pull`

2. **Dependencies installieren**
   - `npm install`

3. **Environment setzen**
   - `cp env.production.example .env`
   - Alle Echt-Daten eintragen:
     - `DATABASE_URL`
     - `AUTH_SECRET`
     - `NEXT_PUBLIC_APP_URL=https://vrema.app`
     - Stripe Live Keys
     - Resend Keys
     - Passkey/WebAuthn Variablen
     - `OPENWEATHER_API_KEY` (OpenWeatherMap)

4. **Dateirechte setzen**
   - `chmod +x scripts/backup-db.sh`

---

## 2) Datenbank & Build

1. **Schema synchronisieren** (Production: **immer** Migrationen)
   - `npx prisma migrate deploy`
   - Neu u. a.: `trial_reminder_emails`, `stripe_processed_events`, `company_shift_vocabulary`

2. **Build**
   - `npm run build`

3. **Start mit PM2**
   - `pm2 start npm --name "vrema" -- start`
   - Nach Deploy: `pm2 restart vrema --update-env`

---

## 3) Clean Start

Einmalig ausfuehren, um Test-Altlasten zu entfernen:

```bash
npm run prod:cleanup
```

---

## 4) Verifizierung (Smoke-Tests)

### A) Kern (jeder Deploy)

| # | Test | Erwartung |
|---|------|-----------|
| 1 | `/auth/register` → Mail verifizieren | Login möglich |
| 2 | Onboarding (4 Schritte) oder Skip | Dashboard lädt |
| 3 | `/dashboard/settings` → Terminal-PIN + Link | Terminal-URL kopierbar |
| 4 | Terminal: PIN → ein-/ausstempeln | Eintrag in Berichten |
| 5 | Passkey (optional) | Registrieren + Login nach Logout |
| 6 | `npm run build` auf VM | Kein Fehler |

### B) Trial (7 Tage / max. 3 MA)

| # | Test | Erwartung |
|---|------|-----------|
| 1 | Banner „Testphase“ sichtbar | Tage + MA-Anzahl |
| 2 | 3. Mitarbeiter einladen | Hinweis bei Limit |
| 3 | Trial abgelaufen simulieren (`trialEndsAt` in DB) | Owner → Billing, MA → trial-ended |
| 4 | `REQUIRE_CARD_ON_SIGNUP=false` | Register ohne Karte |

### C) Pilot-Betrieb (1 echter Gastronom)

| # | Test | Erwartung |
|---|------|-----------|
| 1 | Owner: Team 2 MA + Terminal | MA kann stempeln |
| 2 | MA-Handy: Bottom-Nav (kein Einblicke-Tab) | Urlaub + Planer erreichbar |
| 3 | Planer: Autopilot → Entwurf → veröffentlichen | MA sieht Schicht |
| 4 | Business: Berichte → DATEV-Export | CSV lädt (wenn Plan Business) |
| 5 | Support: Ticket an VREMA | Antwort im Postfach |
| 6 | **Stoß & Umsatz** → Fr/Sa „Stoß“ speichern | Planer zeigt ggf. „Stoß · +1 prüfen“ |
| 7 | Berater einladen (Rolle Berater) | Nur `/dashboard/peaks` + Konto |

Wenn A + B grün sind, ist der technische Deploy ok. C validiert die echte Gastro-Journey.

**Pilot-Ablauf für Betreiber:** siehe `PILOT_CHECKLIST.md` (Tag 1–7).

---

## Optional: Automatisches DB-Backup mit Rotation (empfohlen)

Backup manuell:

```bash
./scripts/backup-db.sh
```

Empfohlene ENV-Werte:

- `BACKUP_DIR=/backups`
- `BACKUP_PREFIX=vrema`
- `BACKUP_KEEP_COUNT=7`

Cronjob alle 4 Tage (03:15 Uhr):

```bash
15 3 */4 * * cd /path/to/vrema && ./scripts/backup-db.sh >> /var/log/vrema-backup.log 2>&1
```

Hinweis: Das Script behaelt automatisch nur die neuesten 7 Backups und loescht aeltere Dumps.

---

## Optional: Automatische Datenloeschung (Retention)

1. **Retention ENV setzen**
   - `DATA_RETENTION_CRON_SECRET=<lange-zufaellige-zeichenfolge>`
   - `DATA_RETENTION_UNVERIFIED_USER_DAYS=14`
   - `DATA_RETENTION_EMPTY_COMPANY_DAYS=30`
   - `DATA_RETENTION_WORKLOG_DAYS=0` (0 = deaktiviert)
   - `DATA_RETENTION_VACATION_DAYS=0` (0 = deaktiviert)

2. **Manueller Testlauf**

```bash
npm run retention:run
```

3. **Nightly Cron ueber interne API (z. B. 03:40)**

```bash
40 3 * * * curl -fsS -H "x-retention-secret: <DEIN_SECRET>" https://vrema.app/api/internal/data-retention >> /var/log/vrema-retention.log 2>&1
```

4. **Absent-Cron (Business Soll/Ist) z. B. taeglich 04:10**

```bash
10 4 * * * curl -fsS -H "x-absent-secret: <DEIN_SECRET>" https://vrema.app/api/internal/mark-absent >> /var/log/vrema-absent.log 2>&1
```

5. **Trial-Reminder-Cron (E-Mails 3d / 1d / abgelaufen) z. B. taeglich 08:00**

```bash
0 8 * * * curl -fsS -H "x-trial-reminder-secret: <DEIN_SECRET>" https://vrema.app/api/internal/trial-reminders >> /var/log/vrema-trial-reminders.log 2>&1
```

`TRIAL_REMINDER_CRON_SECRET` oder Fallback `DATA_RETENTION_CRON_SECRET`.

### Speyer-Flyer Quick-Deploy

```bash
cd /var/www/vrema
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
pm2 restart vrema --update-env
```

Smoke: `https://vrema.app/ref/speyer` → Register → 30-Tage-Banner → kein Stripe-Zwang.
