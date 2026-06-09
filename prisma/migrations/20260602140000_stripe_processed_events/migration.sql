-- Idempotente Stripe-Webhook-Verarbeitung
CREATE TABLE IF NOT EXISTS "ProcessedStripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProcessedStripeEvent_processedAt_idx" ON "ProcessedStripeEvent"("processedAt");
