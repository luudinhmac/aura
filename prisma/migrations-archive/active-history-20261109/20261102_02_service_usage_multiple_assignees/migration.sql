CREATE TABLE IF NOT EXISTS "service_usage_assignees" (
  "serviceUsageId" UUID NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_usage_assignees_pkey" PRIMARY KEY ("serviceUsageId", "userId")
);

INSERT INTO "service_usage_assignees" ("serviceUsageId", "userId")
SELECT "id", "assignedUserId"
FROM "service_usage_records"
WHERE "assignedUserId" IS NOT NULL
ON CONFLICT ("serviceUsageId", "userId") DO NOTHING;

CREATE INDEX IF NOT EXISTS "service_usage_assignees_userId_idx" ON "service_usage_assignees"("userId");
ALTER TABLE "service_usage_assignees"
  ADD CONSTRAINT "service_usage_assignees_serviceUsageId_fkey"
  FOREIGN KEY ("serviceUsageId") REFERENCES "service_usage_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_usage_assignees"
  ADD CONSTRAINT "service_usage_assignees_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
