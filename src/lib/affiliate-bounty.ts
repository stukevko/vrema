import type { Plan } from "@prisma/client";

/** Einmal-Bounty in Cent — Major höher wegen höherem Ticket. */
export function affiliateBountyCentsForPlan(plan: Plan | string): number | null {
  switch (plan) {
    case "PETITE":
      return 500;
    case "MAJOR":
      return 1500;
    default:
      return null;
  }
}
