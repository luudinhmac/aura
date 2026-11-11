ALTER TABLE "app_settings"
ADD COLUMN IF NOT EXISTS "referenceClockAnchorAt" TIMESTAMP(3);

UPDATE "app_settings"
SET "referenceClockAnchorAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
WHERE "referenceDate" IS NOT NULL
  AND "referenceDate" <> ''
  AND "referenceClockAnchorAt" IS NULL;
