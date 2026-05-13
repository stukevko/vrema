-- ──────────────────────────────────────────────────────────────────────────
-- Company.industry & Company.region — wurden ursprünglich nur per
-- `prisma db push` ins Schema gespielt, deshalb fehlten sie auf Production.
--
-- Migration ist idempotent (IF NOT EXISTS / DO-Blöcke), damit Tenants, deren
-- DB bereits per `db push` patcht wurde, sauber durchlaufen.
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Enum CompanyIndustry
DO $ci$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyIndustry') THEN
    CREATE TYPE "CompanyIndustry" AS ENUM (
      'RESTAURANT',
      'CAFE',
      'BAR',
      'HOTEL',
      'BAKERY',
      'CANTEEN',
      'CLUB',
      'CATERING',
      'OTHER'
    );
  END IF;
END $ci$;

-- 2) Company.industry (nullable)
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "industry" "CompanyIndustry";

-- 3) Company.region (nullable, z. B. "DE-BE")
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "region" TEXT;
