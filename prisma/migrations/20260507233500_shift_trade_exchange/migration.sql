-- Shift trade marketplace foundation
CREATE TYPE "ShiftTradeStatus" AS ENUM ('NONE', 'OPEN', 'PENDING_APPROVAL');

ALTER TABLE "Shift"
ADD COLUMN "isOpenForTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tradeStatus" "ShiftTradeStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "tradeRequestedBy" TEXT;

CREATE INDEX "Shift_companyId_tradeStatus_idx" ON "Shift"("companyId", "tradeStatus");
CREATE INDEX "Shift_companyId_isOpenForTrade_idx" ON "Shift"("companyId", "isOpenForTrade");
