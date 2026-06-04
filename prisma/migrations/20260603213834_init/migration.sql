-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'RUNNING', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskScope" AS ENUM ('DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "body_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_logs" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DECIMAL(6,1) NOT NULL,
    "carbs" DECIMAL(6,1) NOT NULL,
    "fat" DECIMAL(6,1) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_logs" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bedtime" TIME NOT NULL,
    "wakeTime" TIME NOT NULL,
    "duration" DECIMAL(4,2) NOT NULL,
    "quality" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "WorkoutType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "sets" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "running_logs" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "distanceKm" DECIMAL(5,2) NOT NULL,
    "avgPaceMinPerKm" DECIMAL(4,2) NOT NULL,
    "avgHeartRate" INTEGER,
    "route" TEXT,
    "notes" TEXT,

    CONSTRAINT "running_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bankBalance" DECIMAL(10,2) NOT NULL,
    "investmentValue" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE,
    "scope" "TaskScope" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "body_metrics_date_key" ON "body_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_logs_date_key" ON "nutrition_logs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_logs_date_key" ON "sleep_logs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "running_logs_workoutSessionId_key" ON "running_logs"("workoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_snapshots_date_key" ON "finance_snapshots"("date");

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "running_logs" ADD CONSTRAINT "running_logs_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
