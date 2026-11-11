ALTER TABLE "service_usage_records"
  ADD COLUMN IF NOT EXISTS "assignedUserId" INTEGER,
  ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outstandingAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completionProgress" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidById" INTEGER,
  ADD COLUMN IF NOT EXISTS "paymentNote" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledById" INTEGER,
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

UPDATE "service_usage_records"
SET "outstandingAmount" = GREATEST("netAmount" - "paidAmount", 0)
WHERE "paymentStatus" = 'unpaid' AND "paidAmount" = 0;

CREATE TABLE IF NOT EXISTS "service_usage_payments" (
  "id" UUID NOT NULL,
  "serviceUsageId" UUID NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidById" INTEGER,
  "reference" TEXT,
  "note" TEXT,
  CONSTRAINT "service_usage_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "service_usage_records_assignedUserId_startAt_endAt_status_idx" ON "service_usage_records"("assignedUserId", "startAt", "endAt", "status");
CREATE INDEX IF NOT EXISTS "service_usage_payments_serviceUsageId_paidAt_idx" ON "service_usage_payments"("serviceUsageId", "paidAt");
ALTER TABLE "service_usage_records" ADD CONSTRAINT "service_usage_records_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_usage_records" ADD CONSTRAINT "service_usage_records_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_usage_records" ADD CONSTRAINT "service_usage_records_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_usage_payments" ADD CONSTRAINT "service_usage_payments_serviceUsageId_fkey" FOREIGN KEY ("serviceUsageId") REFERENCES "service_usage_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_usage_payments" ADD CONSTRAINT "service_usage_payments_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
