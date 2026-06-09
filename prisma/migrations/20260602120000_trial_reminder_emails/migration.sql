-- Trial-Ende-Erinnerungen (idempotent per Firma, Cron täglich)
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialRemind3dSentAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialRemind1dSentAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialExpiredNotifiedAt" TIMESTAMP(3);
