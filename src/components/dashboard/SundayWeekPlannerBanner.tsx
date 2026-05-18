import { isPlanningHandoffWindow, buildForecastHorizon } from "@/lib/planning/forecast-horizon";
import { db } from "@/lib/db";
import { SundayPlanWizard } from "@/components/dashboard/SundayPlanWizard";

export async function SundayWeekPlannerBanner({ companyId }: { companyId: string }) {
  if (!isPlanningHandoffWindow()) return null;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { shiftCycleWeeks: true },
  });
  const slots = buildForecastHorizon(company?.shiftCycleWeeks);
  const primary = slots.find((s) => s.isPrimary) ?? slots[0];
  if (!primary) return null;

  return <SundayPlanWizard weekLabel={primary.label} weekIndex={primary.weekIndex} />;
}
