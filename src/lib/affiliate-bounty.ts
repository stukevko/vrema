import type { Plan } from "@prisma/client";

/** Einmal-Bounty in Cent (kein Lifetime-Prozent). Enterprise = kein automatischer Affiliate. */
export function affiliateBountyCentsForPlan(plan: Plan): number | null {
  switch (plan) {
    case "STARTER":
      return 500;
    case "BUSINESS":
      return 1500;
    case "ENTERPRISE":
      return null;
    default:
      return null;
  }
}
