CREATE TABLE IF NOT EXISTS "service_usage_records" (
  "id" UUID NOT NULL,
  "usageCode" TEXT NOT NULL,
  "personnelId" INTEGER NOT NULL,
  "serviceName" TEXT NOT NULL,
  "description" TEXT,
  "usageDate" DATE NOT NULL,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'lượt',
  "location" TEXT,
  "grossAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "contractRef" TEXT,
  "invoiceRef" TEXT,
  "revenueTransactionId" UUID,
  "notes" TEXT,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_usage_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_usage_records_usageCode_key" UNIQUE ("usageCode"),
  CONSTRAINT "service_usage_records_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_usage_records_revenueTransactionId_fkey" FOREIGN KEY ("revenueTransactionId") REFERENCES "revenue_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_usage_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "service_usage_records_personnelId_usageDate_idx" ON "service_usage_records"("personnelId", "usageDate");
CREATE INDEX IF NOT EXISTS "service_usage_records_status_usageDate_idx" ON "service_usage_records"("status", "usageDate");
CREATE INDEX IF NOT EXISTS "service_usage_records_revenueTransactionId_idx" ON "service_usage_records"("revenueTransactionId");
