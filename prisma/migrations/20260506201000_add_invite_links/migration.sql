-- CreateEnum
CREATE TYPE "InviteRole" AS ENUM ('USER', 'MANAGER');

-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "InviteRole" NOT NULL DEFAULT 'USER',
    "orgId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_code_key" ON "InviteLink"("code");

-- CreateIndex
CREATE INDEX "InviteLink_orgId_expiresAt_idx" ON "InviteLink"("orgId", "expiresAt");

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
