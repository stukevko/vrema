-- Rollenbezogene Aufgaben-Vorlagen (staffingRole wie bei User / Shift)
ALTER TABLE "TaskTemplate" ADD COLUMN "staffingRole" TEXT;

CREATE INDEX "TaskTemplate_companyId_staffingRole_idx" ON "TaskTemplate"("companyId", "staffingRole");
