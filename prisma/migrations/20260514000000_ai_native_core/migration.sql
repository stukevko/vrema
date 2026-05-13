-- ──────────────────────────────────────────────────────────────────────────
-- VREMA Native Core AI (Task 19 – No-LLM Version).
--
-- Diese Migration ist idempotent: AiTelemetry wurde bei einigen Tenants
-- bereits per `prisma db push` angelegt – wir erstellen alle Strukturen
-- daher mit "IF NOT EXISTS" / DO-Blöcken, damit bestehende DBs nicht crashen.
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Enum AiTelemetryKind (nur anlegen, wenn noch nicht vorhanden)
DO $ai_enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiTelemetryKind') THEN
    CREATE TYPE "AiTelemetryKind" AS ENUM (
      'SHIFT_PLAN_DEVIATION',
      'STAFFING_RECOMMENDATION',
      'COMPLIANCE_SCORE',
      'NO_SHOW_PREDICTION',
      'GENERIC'
    );
  END IF;
END $ai_enum$;

-- 2) AiTelemetry-Tabelle (nur anlegen, wenn noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS "AiTelemetry" (
  "id"            TEXT PRIMARY KEY,
  "companyId"     TEXT NOT NULL,
  "kind"          "AiTelemetryKind" NOT NULL,
  "suggestion"    JSONB NOT NULL,
  "actual"        JSONB,
  "metrics"       JSONB,
  "modelTag"      TEXT NOT NULL,
  "referenceDate" TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"      TIMESTAMP(3)
);

-- FK für AiTelemetry → Company (nur, wenn noch nicht vorhanden)
DO $ai_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiTelemetry_company_fk'
  ) THEN
    ALTER TABLE "AiTelemetry"
      ADD CONSTRAINT "AiTelemetry_company_fk"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE;
  END IF;
END $ai_fk$;

CREATE INDEX IF NOT EXISTS "AiTelemetry_companyId_kind_createdAt_idx"
  ON "AiTelemetry" ("companyId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "AiTelemetry_companyId_referenceDate_idx"
  ON "AiTelemetry" ("companyId", "referenceDate");

-- 3) AiWeights-Tabelle (lernende Korrekturfaktoren – Kernstück der Native Core AI)
CREATE TABLE IF NOT EXISTS "AiWeights" (
  "id"          TEXT PRIMARY KEY,
  "companyId"   TEXT NOT NULL,
  "dimension"   TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "weight"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "sampleCount" INTEGER NOT NULL DEFAULT 0,
  "lastError"   DOUBLE PRECISION,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $ai_w_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiWeights_company_fk'
  ) THEN
    ALTER TABLE "AiWeights"
      ADD CONSTRAINT "AiWeights_company_fk"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE;
  END IF;
END $ai_w_fk$;

CREATE UNIQUE INDEX IF NOT EXISTS "AiWeights_companyId_dimension_key_key"
  ON "AiWeights" ("companyId", "dimension", "key");
CREATE INDEX IF NOT EXISTS "AiWeights_companyId_dimension_idx"
  ON "AiWeights" ("companyId", "dimension");
