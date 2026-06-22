-- CreateEnum
CREATE TYPE "VacationWishStatus" AS ENUM ('WISH', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "VacationRequest" ADD COLUMN "sickAttachmentMime" TEXT,
ADD COLUMN "sickAttachmentData" TEXT,
ADD COLUMN "sickAttachmentUploadedAt" TIMESTAMP(3),
ADD COLUMN "sickAttachmentRetainUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VacationPlanYear" (
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "submissionsOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationPlanYear_pkey" PRIMARY KEY ("companyId","year")
);

-- CreateTable
CREATE TABLE "VacationWish" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "note" TEXT,
    "status" "VacationWishStatus" NOT NULL DEFAULT 'WISH',
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "vacationRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationWish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VacationWish_vacationRequestId_key" ON "VacationWish"("vacationRequestId");

-- CreateIndex
CREATE INDEX "VacationWish_companyId_year_status_idx" ON "VacationWish"("companyId", "year", "status");

-- CreateIndex
CREATE INDEX "VacationWish_companyId_userId_year_idx" ON "VacationWish"("companyId", "userId", "year");

-- AddForeignKey
ALTER TABLE "VacationPlanYear" ADD CONSTRAINT "VacationPlanYear_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationWish" ADD CONSTRAINT "VacationWish_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationWish" ADD CONSTRAINT "VacationWish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationWish" ADD CONSTRAINT "VacationWish_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationWish" ADD CONSTRAINT "VacationWish_vacationRequestId_fkey" FOREIGN KEY ("vacationRequestId") REFERENCES "VacationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
