-- Schema-Drift beheben (D1):
-- Der Prisma-Schema-Default für Company.shiftCycleWeeks wurde von 1 auf 4
-- geändert. Diese Migration setzt den Default auch physisch in der Datenbank,
-- damit Schema und DB wieder zu 100 % synchron sind.
-- Bestehende Zeilen bleiben unverändert (nur der DEFAULT für neue INSERTs).
ALTER TABLE "Company" ALTER COLUMN "shiftCycleWeeks" SET DEFAULT 4;
