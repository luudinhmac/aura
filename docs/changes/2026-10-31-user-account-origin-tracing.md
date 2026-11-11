# User account origin tracing — 2026-10-31

## Objective

Trace the source of unexpected accounts that reappear after data migration or deployment. This change only adds tracing; it does not delete or repair existing accounts.

## Implementation

- Added request audit metadata for accounts created through the admin API (`manual_admin_create`).
- Added request audit metadata for internal personnel creation, including whether account provisioning is automatic or disabled for service guests.
- Added one audit record per user restored or updated by `migrate-json-to-pg-v2.ts` with the legacy user ID, username, operation, and migration source.
- Added audit records for production admin bootstrap creation/update.
- Passwords and other secret values are excluded from all new audit metadata.
- Fixed the PostgreSQL transaction test cleanup so its automatically provisioned internal-personnel account is deleted with the test data.

## Expected trace sources

- `manual_admin_create`: account created from the admin account form.
- `personnel_create_request`: account provisioning initiated from internal personnel creation.
- `json_migration_restore`: account created or updated by JSON-to-PostgreSQL migration.
- `production_bootstrap`: production admin bootstrap script.

## Verification

- `pnpm.cmd run lint`: passed.
- `pnpm.cmd exec tsc --noEmit`: passed.
- `pnpm.cmd test`: 77/77 tests passed.
- `pnpm.cmd run build`: passed; existing Vite large-chunk warning remains.
- Problems check for [server.ts](../../server.ts), [migrate-json-to-pg-v2.ts](../../scripts/migrate-json-to-pg-v2.ts), and [bootstrap-production-admin.ts](../../scripts/bootstrap-production-admin.ts): no errors.
