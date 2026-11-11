-- Stage 1: preserve salary history and make payroll salary snapshots explicit.
-- Existing rows remain nullable and are intentionally not backfilled in this migration.

CREATE TABLE "personnel_salary_history" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "salaryAmount" DECIMAL(15,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_salary_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "personnel_salary_history"
  ADD CONSTRAINT "personnel_salary_history_personnelId_fkey"
  FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "personnel_salary_history_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "personnel_salary_history_nonnegative_check"
  CHECK ("salaryAmount" >= 0),
  ADD CONSTRAINT "personnel_salary_history_date_order_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");

CREATE UNIQUE INDEX "personnel_salary_history_personnelId_effectiveFrom_key"
  ON "personnel_salary_history"("personnelId", "effectiveFrom");
CREATE INDEX "personnel_salary_history_personnelId_effectiveFrom_idx"
  ON "personnel_salary_history"("personnelId", "effectiveFrom");
CREATE INDEX "personnel_salary_history_createdById_idx"
  ON "personnel_salary_history"("createdById");

ALTER TABLE "payroll_records"
  ADD COLUMN "contractSalarySnapshot" DECIMAL(15,2),
  ADD COLUMN "salaryEffectiveFromSnapshot" DATE,
  ADD COLUMN "salarySnapshotAt" TIMESTAMP(3),
  ADD COLUMN "salaryHistoryId" UUID;

ALTER TABLE "payroll_records"
  ADD CONSTRAINT "payroll_records_salaryHistoryId_fkey"
  FOREIGN KEY ("salaryHistoryId") REFERENCES "personnel_salary_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "payroll_records_salaryHistoryId_idx"
  ON "payroll_records"("salaryHistoryId");
