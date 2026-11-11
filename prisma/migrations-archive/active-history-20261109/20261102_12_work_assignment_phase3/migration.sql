ALTER TABLE "work_assignments"
  ADD COLUMN IF NOT EXISTS "penaltyType" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "penaltyValue" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "restDayDate" DATE,
  ADD COLUMN IF NOT EXISTS "restDayPortion" TEXT NOT NULL DEFAULT 'none';

ALTER TABLE "work_assignment_assignees"
  ADD COLUMN IF NOT EXISTS "penaltyAmount" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "violationNote" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restDayDate" DATE,
  ADD COLUMN IF NOT EXISTS "restDayPortion" TEXT NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS "work_assignments_restDayDate_idx"
  ON "work_assignments"("restDayDate");

CREATE INDEX IF NOT EXISTS "work_assignment_assignees_violationStatus_idx"
  ON "work_assignment_assignees"("violationStatus");
