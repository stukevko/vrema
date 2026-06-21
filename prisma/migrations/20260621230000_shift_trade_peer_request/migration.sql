-- Schicht-Tausch: Direktanfrage an Kolleg:in (TPA-Flow)
ALTER TYPE "ShiftTradeStatus" ADD VALUE IF NOT EXISTS 'PEER_PENDING';

ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "tradeTargetUserId" TEXT;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "tradeCounterShiftId" TEXT;
