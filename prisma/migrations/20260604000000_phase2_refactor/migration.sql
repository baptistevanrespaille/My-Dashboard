-- Phase 2 refactor

-- 1. Add sessionLabel to workout_sessions
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "sessionLabel" TEXT;

-- 2. Create cardio_logs table
CREATE TABLE IF NOT EXISTS "cardio_logs" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "distanceKm" DECIMAL(5,2),
    "avgPaceMinPerKm" DECIMAL(4,2),
    "avgHeartRate" INTEGER,
    "route" TEXT,
    "notes" TEXT,
    CONSTRAINT "cardio_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cardio_logs_workoutSessionId_key" UNIQUE ("workoutSessionId"),
    CONSTRAINT "cardio_logs_workoutSessionId_fkey"
        FOREIGN KEY ("workoutSessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE
);

-- 3. Migrate running_logs -> cardio_logs
INSERT INTO "cardio_logs" ("id", "workoutSessionId", "distanceKm", "avgPaceMinPerKm", "avgHeartRate", "route", "notes")
SELECT "id", "workoutSessionId", "distanceKm", "avgPaceMinPerKm", "avgHeartRate", "route", "notes"
FROM "running_logs"
ON CONFLICT ("workoutSessionId") DO NOTHING;

-- 4. Drop running_logs
DROP TABLE IF EXISTS "running_logs";

-- 5. Update finance_snapshots: add new columns, drop old
ALTER TABLE "finance_snapshots"
    ADD COLUMN IF NOT EXISTS "totalInvested" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "totalValue" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Populate totalValue from investmentValue if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_snapshots' AND column_name = 'investmentValue'
  ) THEN
    UPDATE "finance_snapshots" SET
      "totalValue" = "investmentValue",
      "totalInvested" = "investmentValue";
    ALTER TABLE "finance_snapshots" DROP COLUMN "investmentValue";
  END IF;
END $$;

-- 6. Create investments table
CREATE TABLE IF NOT EXISTS "investments" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "avgBuyPrice" DECIMAL(10,2) NOT NULL,
    "currentPrice" DECIMAL(10,2) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "investments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "investments_ticker_key" UNIQUE ("ticker")
);
