-- Branchen-neutrales Terminologie-Layer: pro Firma wählbares Vokabular für
-- „Schicht" (SHIFT | ASSIGNMENT | DUTY). Reines UI-Label, keine Strukturänderung.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "shiftVocabulary" TEXT NOT NULL DEFAULT 'SHIFT';
