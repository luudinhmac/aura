ALTER TABLE "personnel_columns"
ADD COLUMN IF NOT EXISTS "sensitivity" TEXT NOT NULL DEFAULT 'public';

UPDATE "personnel_columns"
SET "sensitivity" = 'public'
WHERE "sensitivity" IS NULL OR "sensitivity" NOT IN ('public', 'internal', 'sensitive');
