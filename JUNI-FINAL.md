# VREMA — Fahrplan JUNI-FINAL

**Stichtag Feature-Freeze:** 15. Juni 2026  
**Ziel:** Ein Gastronom kann VREMA 30 Tage ohne Support nutzen.

---

## Die 4 Produkt-Regeln (Core-Metriken)

1. **Zeit sparen** — Planung &lt; 10 Min/Tag für 20 MA  
2. **Geld sparen** — Überstunden-Abbau proaktiv, keine blinden Kosten  
3. **Einfach & logisch** — Ein Planer-Board, ein Sprachstil  
4. **Lagfrei & problemfrei** — Nach jeder Mutation `router.refresh()` + deutsche Fehler-Anzeige  

---

## Definition of Done (Juni-Release)

- [x] **Übersicht:** 3 Fokus-Karten aktiv (Heute, Lücken, Freigaben) — `ManagerFocusCards`  
- [ ] **Planer:** Shift-Centric Board fehlerfrei — Code-Audit Zuweisen/Leeren/Vorlagen (optimistisch + Slot-Overlay); manuell: `RELEASE-SMOKE.md`  
- [x] **Berichte:** Stunden-Korrektur via Modal (kein `window.prompt` in Berichten), PDF Hochkant A4 — `KorrekturModal`, `jsPDF portrait`  
- [x] **Billing:** Webhook `invoice.payment_failed` sperrt Tenant; `invoice.paid` schaltet frei — `src/lib/billing/stripe-invoice-tenant.ts` (+ Stripe Dashboard: Event aktivieren)  
- [x] **Super-Admin:** Modul-Toggles (Kern vs. Erweiterungen) pro Betrieb — Zeile unter jeder Firma im Super-Admin-Panel  
- [x] **Stabilität:** `npm run typecheck` (`tsc --noEmit`) — Script in `package.json`  

---

## STRIKTER FEATURE-STOPP

Bis Juni werden **keine** Kassen-Importe, Umsatz-KPI-Dashboards, Offline-Terminals oder ML-Features gebaut. Fokus: Stabilität und fehlerfreier Core-Durchlauf.

---

## Wochenplan (Orientierung)

| Woche | Fokus |
|-------|--------|
| 19.–25. Mai | Billing-Webhooks, Super-Admin-Module, Deploy + Smoke |
| 26. Mai – 1. Jun | Planer/Berichte härten, Mobile-Polish |
| 2.–8. Jun | Pilot-Betrieb (`PILOT_CHECKLIST.md`) |
| 9.–14. Jun | Nur Fixes, Copy, Docs |
| **15. Jun** | **Feature-Freeze** |

---

## Verweise

- Deploy & Smoke: `GO_LIVE.md`, `docs/RELEASE-SMOKE.md`  
- Pilot: `PILOT_CHECKLIST.md`  
- Produkt-Modul-Logik: `PRODUCT.md`  
