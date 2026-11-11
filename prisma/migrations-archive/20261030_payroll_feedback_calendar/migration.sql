ALTER TABLE "payroll_periods"
  ADD COLUMN "feedbackStartsAt" DATE,
  ADD COLUMN "approvalStartsAt" DATE,
  ADD COLUMN "lockStartsAt" DATE;

CREATE TABLE "payroll_disputes" (
  "id" UUID NOT NULL,
  "periodId" TEXT NOT NULL,
  "recordId" UUID NOT NULL,
  "personnelId" INTEGER NOT NULL,
  "submittedById" INTEGER,
  "category" TEXT NOT NULL,
  "systemValue" JSONB NOT NULL DEFAULT '{}',
  "requestedValue" JSONB NOT NULL DEFAULT '{}',
  "reason" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "reviewedById" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payroll_disputes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payroll_disputes_periodId_status_idx" ON "payroll_disputes"("periodId", "status");
CREATE INDEX "payroll_disputes_recordId_status_idx" ON "payroll_disputes"("recordId", "status");
CREATE INDEX "payroll_disputes_personnelId_createdAt_idx" ON "payroll_disputes"("personnelId", "createdAt");
CREATE INDEX "payroll_disputes_submittedById_status_idx" ON "payroll_disputes"("submittedById", "status");

ALTER TABLE "payroll_disputes"
  ADD CONSTRAINT "payroll_disputes_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "payroll_disputes_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "payroll_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "payroll_disputes_personnelId_fkey"
  FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "payroll_disputes_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payroll_disputes_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
