-- Enums
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "AbsenceType" ADD VALUE IF NOT EXISTS 'OTHER';

CREATE TYPE "AbsenceRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');
CREATE TYPE "TicketType" AS ENUM ('BUG', 'QUESTION', 'FEATURE');

-- User extension for terminal preparation
ALTER TABLE "User" ADD COLUMN "terminalPin" TEXT;

-- Ticket model
CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "type" "TicketType" NOT NULL DEFAULT 'QUESTION',
  "response" TEXT,
  "respondedBy" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_orgId_status_createdAt_idx" ON "Ticket"("orgId", "status", "createdAt");
CREATE INDEX "Ticket_userId_createdAt_idx" ON "Ticket"("userId", "createdAt");

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Absence model
CREATE TABLE "Absence" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "type" "AbsenceType" NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "end" TIMESTAMP(3) NOT NULL,
  "status" "AbsenceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "sourceVacationRequestId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Absence_sourceVacationRequestId_key" ON "Absence"("sourceVacationRequestId");
CREATE INDEX "Absence_orgId_status_start_end_idx" ON "Absence"("orgId", "status", "start", "end");
CREATE INDEX "Absence_userId_start_end_idx" ON "Absence"("userId", "start", "end");

ALTER TABLE "Absence"
  ADD CONSTRAINT "Absence_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Absence"
  ADD CONSTRAINT "Absence_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Absence"
  ADD CONSTRAINT "Absence_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
