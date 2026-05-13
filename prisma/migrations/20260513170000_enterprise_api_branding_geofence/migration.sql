-- ──────────────────────────────────────────────────────────────────────────
-- Enterprise Foundation (Task 18): External API, Custom Branding, IP-Geofence.
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Company-Erweiterungen: Branding + IP-Allowlist
ALTER TABLE "Company"
  ADD COLUMN "brandColor"       TEXT,
  ADD COLUMN "brandColorDark"   TEXT,
  ADD COLUMN "clockIpRestrictionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "clockIpAllowlist" TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2) ApiKey-Tabelle für /api/v1/external/*
CREATE TABLE "ApiKey" (
  "id"          TEXT PRIMARY KEY,
  "companyId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "hashedKey"   TEXT NOT NULL,
  "keyHint"     TEXT NOT NULL,
  "scopes"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"  TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3),

  CONSTRAINT "ApiKey_company_fk"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey" ("hashedKey");
CREATE INDEX "ApiKey_companyId_idx" ON "ApiKey" ("companyId");
CREATE INDEX "ApiKey_hashedKey_idx" ON "ApiKey" ("hashedKey");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey" ("expiresAt");
