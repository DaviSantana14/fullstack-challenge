BEGIN;

CREATE TYPE "BetStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'CASHOUT_PENDING', 'REJECTED', 'CASHED_OUT', 'LOST');

ALTER TABLE "bets" ALTER COLUMN "status" TYPE "BetStatus_new" USING ("status"::text::"BetStatus_new");

DROP TYPE "BetStatus";

ALTER TYPE "BetStatus_new" RENAME TO "BetStatus";

COMMIT;
