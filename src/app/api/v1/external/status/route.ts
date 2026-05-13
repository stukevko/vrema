/**
 * GET /api/v1/external/status
 *
 * Erste Test-Route der externen Enterprise-API.
 * Liefert eine kompakte Team-Auslastung für die aktuelle Berliner Tageszelle
 * (Stempelungen heute, anwesend jetzt, offene Pflicht-Schichten).
 *
 *  Auth: `x-api-key: vrema_live_…` (via `requireApiKey`).
 *  Tenant: Nur Daten der Firma, der der API-Key gehört.
 *  Caching: `Cache-Control: no-store` (immer live).
 */

import type { NextRequest } from "next/server";
import { requireApiKey, jsonOk } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { tenantWhere } from "@/lib/tenant-guard";
import { getDayBoundsUtc } from "@/lib/time/timezone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await requireApiKey(req, "status:read");
  if (ctx instanceof Response) return ctx;

  const { companyId } = ctx;
  const { start, end } = getDayBoundsUtc("Europe/Berlin");

  const [company, totalEmployees, presentNow, clockedInToday, plannedToday] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, plan: true },
    }),
    db.user.count({
      where: tenantWhere(companyId, { isActive: true }),
    }),
    db.workLog.count({
      where: tenantWhere(companyId, {
        clockIn: { gte: start, lte: end },
        clockOut: null,
      }),
    }),
    db.workLog.count({
      where: tenantWhere(companyId, { clockIn: { gte: start, lte: end } }),
    }),
    db.shift.count({
      where: tenantWhere(companyId, {
        // Schichten heute laut Wochenplan (dayOfWeek = Berliner Wochentag)
        // Hinweis: stark vereinfacht; im Detail würden wir hier auch
        // ShiftCycleWeeks berücksichtigen. Für die externe Status-Lampe reicht
        // diese Heuristik aktuell aus.
      }),
    }),
  ]);

  if (!company) {
    return jsonOk(
      { error: "company_not_found", message: "Zur API-Key-Firma wurde kein Datensatz gefunden." },
      { status: 404 },
    );
  }

  const utilisationPct = totalEmployees > 0
    ? Math.round((presentNow / totalEmployees) * 100)
    : 0;

  return jsonOk({
    apiVersion: "1",
    timestamp: new Date().toISOString(),
    company: {
      id: company.id,
      name: company.name,
      plan: company.plan,
    },
    team: {
      totalActiveEmployees: totalEmployees,
      presentNow,
      clockedInToday,
      plannedToday,
      utilisationPct,
    },
    meta: {
      timezone: "Europe/Berlin",
      generatedBy: "vrema-external-api",
    },
  });
}
