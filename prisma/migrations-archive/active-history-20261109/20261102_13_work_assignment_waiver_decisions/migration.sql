ALTER TABLE "work_assignment_assignees"
  ADD COLUMN IF NOT EXISTS "waiverDecision" TEXT,
  ADD COLUMN IF NOT EXISTS "penaltyRate" DECIMAL(5, 2);

ALTER TABLE "work_assignment_assignees"
  DROP CONSTRAINT IF EXISTS "work_assignment_assignees_penaltyRate_check";

ALTER TABLE "work_assignment_assignees"
  ADD CONSTRAINT "work_assignment_assignees_penaltyRate_check" CHECK ("penaltyRate" IS NULL OR ("penaltyRate" >= 0 AND "penaltyRate" <= 100));
