# VREMA GO LIVE

Dieses Runbook ist für den Moment gedacht, in dem du auf der VM den Schalter umlegst.

## 0) Pre-Launch Checkliste (alles REQUIRED außer „Optional“)

| Variable / Schritt | Zweck |
|--------------------|--------|
| `DATABASE_URL` | Postgres |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` | Login |
| `NEXT_PUBLIC_APP_URL` | Links, SEO, E-Mails |
| `STRIPE_*` (Live) | Abos |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Verify, Reset, Welcome |
| `SUPER_ADMIN_USER_ID` | Backoffice |
| `AUTH_WEBAUTHN_*` | Passkeys (Domain muss passen) |
| `OPENWEATHER_API_KEY` | Wetter im Planer + Personal-Empfehlung |
| `DATA_RETENTION_CRON_SECRET` | Nightly Cleanup |
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

1. **Schema synchronisieren**
   - Erster Wurf:
     - `npx prisma db push`
   - Oder sauber ueber Migrationen:
     - `npx prisma migrate deploy`

2. **Build**
   - `npm run build`

3. **Start mit PM2**
   - `pm2 start npm --name "vrema" -- start`

---

## 3) Clean Start

Einmalig ausfuehren, um Test-Altlasten zu entfernen:

```bash
npm run prod:cleanup
```

---

## 4) Verifizierung (Smoke-Tests)

Diese 5 Klicks muessen nach Deploy gruen sein:

1. **Register + Verify**
   - `/auth/register` -> Account erstellen -> Verify-Link aus Mail oeffnen

2. **Setup abschliessen**
   - Firmenname/Setup speichern -> Redirect auf Dashboard

3. **Passkey registrieren**
   - `/dashboard/settings` -> Sicherheit -> Passkey registrieren

4. **Passkey Login testen**
   - ausloggen -> `/auth/login` -> "Mit Passkey anmelden"

5. **Terminal + Geofencing**
   - `/terminal/<company-slug>` -> PIN eingeben -> Reports auf Out-of-Range Markierung pruefen

Wenn der Passkey-Login nach Ausloggen funktioniert, hast du gewonnen.

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
