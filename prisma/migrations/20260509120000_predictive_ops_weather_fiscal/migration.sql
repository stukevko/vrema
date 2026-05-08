-- Predictive Operations: Standort, Umsatz-Schätzung, Wetter-Cache, Außenbereich am User
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "locationZip" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "locationCity" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "estimatedWeeklyRevenue" DOUBLE PRECISION;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planningWorkArea" TEXT;

CREATE TABLE IF NOT EXISTS "WeatherCache" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeatherCache_companyId_key" ON "WeatherCache"("companyId");
CREATE INDEX IF NOT EXISTS "WeatherCache_fetchedAt_idx" ON "WeatherCache"("fetchedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WeatherCache_companyId_fkey'
  ) THEN
    ALTER TABLE "WeatherCache" ADD CONSTRAINT "WeatherCache_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
