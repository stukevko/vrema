import { db } from "@/lib/db";

/** Gibt true zurück, wenn das Event neu ist und verarbeitet werden soll. */
export async function claimStripeWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  try {
    await db.processedStripeEvent.create({
      data: { id: eventId, type: eventType },
    });
    return true;
  } catch {
    return false;
  }
}
