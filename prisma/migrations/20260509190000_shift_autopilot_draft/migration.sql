-- Autopilot: Entwurfs-Schichten + optionale Personal-Rolle

ALTER TABLE "User" ADD COLUMN "staffingRole" TEXT;

ALTER TABLE "Shift" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shift" ADD COLUMN "staffingRole" TEXT;

CREATE INDEX "Shift_companyId_weekIndex_isDraft_idx" ON "Shift"("companyId", "weekIndex", "isDraft");
