import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getWeeklyWeatherForCompanyMemoized,
  mondayOfWeekContaining,
  sliceWeekFromMonday,
} from "@/lib/external/weather";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const anchor = searchParams.get("weekStart") ?? searchParams.get("anchorDate") ?? "";
  const monday = anchor ? mondayOfWeekContaining(anchor.slice(0, 10)) : mondayOfWeekContaining(new Date().toISOString().slice(0, 10));

  const result = await getWeeklyWeatherForCompanyMemoized(session.user.companyId);
  const week = sliceWeekFromMonday(monday, result.daily);

  return NextResponse.json({
    mondayIso: monday,
    week,
    queryKey: result.queryKey,
    error: result.error ?? null,
  });
}
