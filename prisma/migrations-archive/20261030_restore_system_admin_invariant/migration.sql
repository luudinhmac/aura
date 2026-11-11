-- Restore the root-account invariant after the Business Super Admin rollout.
-- System admins must always retain root access and must never be personnel
-- Business Super Admins.
UPDATE "users"
SET "isSuperAdmin" = true,
    "isBusinessAdmin" = false
WHERE "accountType" = 'system_admin';
