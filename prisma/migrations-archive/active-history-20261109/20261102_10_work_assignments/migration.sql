CREATE TABLE "work_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignmentType" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_assignment_assignees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "responseStatus" TEXT NOT NULL DEFAULT 'pending',
    "responseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedNote" TEXT,
    "violationStatus" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_assignment_assignees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_assignment_assignees_assignmentId_personnelId_key"
ON "work_assignment_assignees"("assignmentId", "personnelId");

CREATE INDEX "work_assignments_createdById_status_idx"
ON "work_assignments"("createdById", "status");

CREATE INDEX "work_assignments_status_dueAt_idx"
ON "work_assignments"("status", "dueAt");

CREATE INDEX "work_assignment_assignees_personnelId_responseStatus_idx"
ON "work_assignment_assignees"("personnelId", "responseStatus");

CREATE INDEX "work_assignment_assignees_assignmentId_responseStatus_idx"
ON "work_assignment_assignees"("assignmentId", "responseStatus");

ALTER TABLE "work_assignments"
ADD CONSTRAINT "work_assignments_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_assignment_assignees"
ADD CONSTRAINT "work_assignment_assignees_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "work_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_assignment_assignees"
ADD CONSTRAINT "work_assignment_assignees_personnelId_fkey"
FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
