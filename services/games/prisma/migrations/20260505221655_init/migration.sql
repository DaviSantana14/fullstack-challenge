-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('BETTING', 'IN_PROGRESS', 'CRASHED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CASHED_OUT', 'LOST', 'REFUNDED', 'VOIDED');

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "serverSeed" TEXT,
    "crashPointHundredths" INTEGER,
    "bettingStartsAt" TIMESTAMP(3) NOT NULL,
    "bettingClosesAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "crashedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "status" "BetStatus" NOT NULL,
    "cashoutMultiplierHundredths" INTEGER,
    "payoutInCents" BIGINT,
    "correlationId" TEXT,
    "rejectionReason" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "cashedOutAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rounds_roundNumber_key" ON "rounds"("roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_serverSeedHash_key" ON "rounds"("serverSeedHash");

-- CreateIndex
CREATE INDEX "rounds_status_createdAt_idx" ON "rounds"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bets_correlationId_key" ON "bets"("correlationId");

-- CreateIndex
CREATE INDEX "bets_playerId_createdAt_idx" ON "bets"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "bets_status_createdAt_idx" ON "bets"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bets_roundId_playerId_key" ON "bets"("roundId", "playerId");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
