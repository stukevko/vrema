-- Company feature modules (branchenneutraler Kern + optionale Erweiterungen)
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "modulePeaks" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "modulePlannerWeather" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "moduleShiftTrade" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "moduleShiftTasks" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "moduleAutopilot" BOOLEAN NOT NULL DEFAULT false;

-- Bestehende Gastro/Hospitality-Tenants: sinnvolle Defaults
UPDATE "Company"
SET
  "modulePeaks" = true,
  "modulePlannerWeather" = true
WHERE "industry" IN (
  'RESTAURANT', 'CAFE', 'BAR', 'HOTEL', 'BAKERY', 'CANTEEN', 'CLUB', 'CATERING'
);
