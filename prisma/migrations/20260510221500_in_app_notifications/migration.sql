-- In-App-Notifications (Light-Push)

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'VACATION_APPROVED',
    'VACATION_REJECTED',
    'SHIFT_PUBLISHED',
    'SHIFT_TRADE_APPROVED',
    'SHIFT_TRADE_REJECTED',
    'CORRECTION_APPROVED',
    'CORRECTION_REJECTED',
    'GENERIC'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL DEFAULT 'GENERIC',
  "title"     TEXT NOT NULL,
  "body"      TEXT,
  "href"      TEXT,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_companyId_userId_createdAt_idx"
  ON "Notification" ("companyId", "userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "Notification" ("userId", "readAt");
