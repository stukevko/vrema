-- hourlyWage + Monatsbestaetigung Stundenzettel
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hourlyWage" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "TimesheetAcknowledgment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetAcknowledgment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TimesheetAcknowledgment_userId_monthKey_key" ON "TimesheetAcknowledgment"("userId", "monthKey");

CREATE INDEX IF NOT EXISTS "TimesheetAcknowledgment_companyId_monthKey_idx" ON "TimesheetAcknowledgment"("companyId", "monthKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TimesheetAcknowledgment_userId_fkey'
  ) THEN
    ALTER TABLE "TimesheetAcknowledgment" ADD CONSTRAINT "TimesheetAcknowledgment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
