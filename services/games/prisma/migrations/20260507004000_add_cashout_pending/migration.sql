ALTER TYPE "BetStatus" ADD VALUE IF NOT EXISTS 'CASHOUT_PENDING';

ALTER TABLE "bets"
ADD COLUMN IF NOT EXISTS "cashoutCorrelationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "bets_cashoutCorrelationId_key"
ON "bets"("cashoutCorrelationId");
