-- Schicht-Checklisten (TaskTemplate → ShiftTaskList → ShiftTaskItem)

CREATE TYPE "ShiftTaskItemStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED');

CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaskTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShiftTaskList" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "taskTemplateId" TEXT,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTaskList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShiftTaskItem" (
    "id" TEXT NOT NULL,
    "shiftTaskListId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShiftTaskItemStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,

    CONSTRAINT "ShiftTaskItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskTemplate_companyId_idx" ON "TaskTemplate"("companyId");
CREATE INDEX "TaskTemplate_companyId_isDefault_idx" ON "TaskTemplate"("companyId", "isDefault");

CREATE INDEX "TaskTemplateItem_templateId_sortOrder_idx" ON "TaskTemplateItem"("templateId", "sortOrder");

CREATE UNIQUE INDEX "ShiftTaskList_shiftId_occurrenceDate_key" ON "ShiftTaskList"("shiftId", "occurrenceDate");
CREATE INDEX "ShiftTaskList_companyId_occurrenceDate_idx" ON "ShiftTaskList"("companyId", "occurrenceDate");

CREATE INDEX "ShiftTaskItem_shiftTaskListId_sortOrder_idx" ON "ShiftTaskItem"("shiftTaskListId", "sortOrder");

ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskTemplateItem" ADD CONSTRAINT "TaskTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftTaskList" ADD CONSTRAINT "ShiftTaskList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftTaskList" ADD CONSTRAINT "ShiftTaskList_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftTaskList" ADD CONSTRAINT "ShiftTaskList_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftTaskItem" ADD CONSTRAINT "ShiftTaskItem_shiftTaskListId_fkey" FOREIGN KEY ("shiftTaskListId") REFERENCES "ShiftTaskList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftTaskItem" ADD CONSTRAINT "ShiftTaskItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
