ALTER TABLE "users"
  ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'personnel';

ALTER TABLE "users"
  ADD CONSTRAINT "users_accountType_check"
  CHECK ("accountType" IN ('system_admin', 'personnel'));
