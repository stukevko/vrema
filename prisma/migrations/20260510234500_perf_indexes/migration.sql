-- Performance-Indexes für Hot-Paths
-- WorkLog: aktive Stempelung pro User + (companyId,userId,clockIn-Range) für Tages-/Monats-Queries
CREATE INDEX IF NOT EXISTS "WorkLog_companyId_userId_clockIn_idx" ON "WorkLog" ("companyId", "userId", "clockIn");
CREATE INDEX IF NOT EXISTS "WorkLog_companyId_userId_clockOut_idx" ON "WorkLog" ("companyId", "userId", "clockOut");

-- Shift: findNextShift / queryActiveShiftTasks Filter (companyId,userId,isDraft,dayOfWeek)
CREATE INDEX IF NOT EXISTS "Shift_companyId_userId_isDraft_dayOfWeek_idx" ON "Shift" ("companyId", "userId", "isDraft", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "Shift_companyId_tradeStatus_idx" ON "Shift" ("companyId", "tradeStatus");
