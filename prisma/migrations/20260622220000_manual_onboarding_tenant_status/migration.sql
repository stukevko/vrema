-- Manuelles Onboarding: TenantStatus + Stripe-Felder entfernen

CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

ALTER TABLE "Company" ADD COLUMN "tenantStatus" "TenantStatus";

UPDATE "Company"
SET "tenantStatus" = 'ACTIVE'
WHERE "billingExempt" = true
   OR "isActive" = true
   OR "stripeSubId" IS NOT NULL;

UPDATE "Company"
SET "tenantStatus" = 'SUSPENDED'
WHERE "tenantStatus" IS NULL
  AND "isActive" = false
  AND "stripeSubId" IS NOT NULL;

UPDATE "Company"
SET "tenantStatus" = 'PENDING'
WHERE "tenantStatus" IS NULL;

ALTER TABLE "Company" ALTER COLUMN "tenantStatus" SET NOT NULL;
ALTER TABLE "Company" ALTER COLUMN "tenantStatus" SET DEFAULT 'PENDING';

UPDATE "Company"
SET "isActive" = true
WHERE "tenantStatus" = 'ACTIVE' OR "billingExempt" = true;

UPDATE "Company"
SET "isActive" = false
WHERE "tenantStatus" IN ('PENDING', 'SUSPENDED') AND "billingExempt" = false;

ALTER TABLE "Company" ALTER COLUMN "isActive" SET DEFAULT false;

ALTER TABLE "Company" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "stripeSubId";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "stripePaymentMethodFingerprint";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "paymentMethodVerifiedAt";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "subEndsAt";

DROP TABLE IF EXISTS "StripeWebhookEvent";
