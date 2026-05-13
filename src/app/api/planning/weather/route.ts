import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getWeeklyWeatherForCompanyMemoized,
  mondayOfWeekContaining,
  sliceWeekFromMonday,
} from "@/lib/external/weather";
import { getBerlinDateKey } from "@/lib/time/timezone";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const anchor = searchParams.get("weekStart") ?? searchParams.get("anchorDate") ?? "";
  const monday = anchor
    ? mondayOfWeekContaining(anchor.slice(0, 10))
    : mondayOfWeekContaining(getBerlinDateKey(new Date()));

  const result = await getWeeklyWeatherForCompanyMemoized(session.user.companyId);
  const week = sliceWeekFromMonday(monday, result.daily);

  return NextResponse.json({
    mondayIso: monday,
    week,
    queryKey: result.queryKey,
    error: result.error ?? null,
  });
}
