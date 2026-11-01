-- AlterTable Workout: link free-log entries to program days
ALTER TABLE "Workout" ADD COLUMN "programId" TEXT;
ALTER TABLE "Workout" ADD COLUMN "programDayId" TEXT;

-- CreateIndex
CREATE INDEX "Workout_userId_programDayId_idx" ON "Workout"("userId", "programDayId");

-- AlterTable WorkoutPlan: rename sessions → weeks (structured ProgramWeek[])
ALTER TABLE "WorkoutPlan" RENAME COLUMN "sessions" TO "weeks";

-- AlterTable WorkoutPlanAssignment: track client cursor through the program
ALTER TABLE "WorkoutPlanAssignment" ADD COLUMN "currentWeekIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkoutPlanAssignment" ADD COLUMN "currentDayIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkoutPlanAssignment" ADD COLUMN "completedDayIds" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "WorkoutPlanAssignment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
