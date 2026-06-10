# VREMA Produkt — Lego, nicht SAP

## Kern (immer aktiv)
Stempeln · Schichtplan · Team · Abwesenheit · Berichte · Einstellungen

## Erweiterungen (pro Tenant)
| Modul | Sichtbar wenn aktiv |
|--------|---------------------|
| Stoß & Umsatz | Nav, Auswertung, Plan-Hinweise |
| Wetter im Planer | Schichtkarten |
| Schicht-Tausch | Planung (MA + Chef) |
| Schicht-Tasks | Nav `/dashboard/tasks`, Planer-Link |
| Autopilot (Beta) | Planer-Panel |

## UX-Regeln
1. **Ein Planer** für Chefs (Schichtkarten-Board) auf Desktop und Mobil.
2. **Nach jeder Mutation** in Client-UI: `router.refresh()` (siehe `useDashboardMutation`).
3. **Modul aus** → UI weg + kurzer Hinweis mit Link zu Einstellungen → Module.
4. **Empty State** = Text + ein CTA (kein Dead End).
5. **Mobil-Bottom-Nav (Chef):** Start · Planer · Team · Auswertung · Profil. Berichte über Cockpit-Schnellzugriff.

## Checkliste vor neuem Feature
- Welcher Stein? Kern oder Erweiterung?
- Wo dockt es an (Daten + Nav)?
- Was passiert, wenn das Modul aus ist?
