DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_assignments' AND column_name = 'dueAt')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_assignments' AND column_name = 'acceptanceDeadline') THEN
    ALTER TABLE "work_assignments" RENAME COLUMN "dueAt" TO "acceptanceDeadline";
  END IF;
END $$;

ALTER TABLE "work_assignments"
  ADD COLUMN IF NOT EXISTS "acceptanceDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledById" INTEGER;

ALTER TABLE "work_assignment_assignees"
  ADD COLUMN IF NOT EXISTS "waiverRequestStatus" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "waiverRequestReason" TEXT,
  ADD COLUMN IF NOT EXISTS "waiverRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "waiverReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "waiverReviewedById" INTEGER,
  ADD COLUMN IF NOT EXISTS "waiverReviewNote" TEXT;

CREATE TABLE IF NOT EXISTS "work_assignment_approval_delegations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "directorId" INTEGER NOT NULL,
  "delegateId" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_assignment_approval_delegations_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "work_assignments_status_dueAt_idx";
CREATE INDEX IF NOT EXISTS "work_assignments_status_acceptanceDeadline_idx" ON "work_assignments"("status", "acceptanceDeadline");
CREATE INDEX IF NOT EXISTS "work_assignment_assignees_waiverRequestStatus_idx" ON "work_assignment_assignees"("waiverRequestStatus");
CREATE INDEX IF NOT EXISTS "work_assignment_delegations_director_idx" ON "work_assignment_approval_delegations"("directorId", "startsAt", "endsAt", "revokedAt");
CREATE INDEX IF NOT EXISTS "work_assignment_delegations_delegate_idx" ON "work_assignment_approval_delegations"("delegateId", "startsAt", "endsAt", "revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_assignments_cancelledById_fkey') THEN
    ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_assignment_delegations_director_fkey') THEN
    ALTER TABLE "work_assignment_approval_delegations" ADD CONSTRAINT "work_assignment_delegations_director_fkey" FOREIGN KEY ("directorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "work_assignment_approval_delegations" ADD CONSTRAINT "work_assignment_delegations_delegate_fkey" FOREIGN KEY ("delegateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "work_assignment_approval_delegations" ADD CONSTRAINT "work_assignment_delegations_revokedBy_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
