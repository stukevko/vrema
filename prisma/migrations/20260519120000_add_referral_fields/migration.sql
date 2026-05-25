-- Flyer-/Kampagnen-Referral (z. B. Speyer-Aktion)
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
