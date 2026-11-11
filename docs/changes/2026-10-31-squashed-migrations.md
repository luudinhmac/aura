# Squashed database migration and clean Docker bootstrap

## Objective

Consolidate the historical Prisma migrations so a new production VM can be
initialized with one active migration and one `docker compose up` workflow.

## Changes

- Generated `prisma/migrations/00000000000000_squashed_baseline/migration.sql`
  from the current PostgreSQL schema-only dump.
- Preserved PostgreSQL check constraints, foreign keys, indexes and
  `timestamptz` columns that were not fully represented by the Prisma schema.
- Removed PostgreSQL `pg_dump` session meta commands that Prisma does not
  understand and removed the empty `search_path` mutation that interfered with
  Prisma's `_prisma_migrations` bookkeeping.
- Moved 24 historical migration directories to
  `prisma/migrations-archive/`; Prisma scans only the single active baseline.
- Added `docker-entrypoint.sh` to run migration deploy, RBAC role sync, optional
  empty-database admin bootstrap, then the application server.
- Updated production admin bootstrap to assign the `system_admin` role and to
  support `--only-if-empty`.
- Updated schema migration tests and the production runbook.

## VM verification

The supplied VM was verified before reset: one existing user, zero personnel
profiles, and zero payroll records. Both Docker volumes were then recreated.

Verified after clean deployment:

- `aura-postgres`: healthy
- `aura-app`: healthy
- `aura-nginx`: running
- Prisma: one migration applied and database up to date
- RBAC roles: 16
- Users: 1 bootstrap admin
- User-role assignments: 1
- Personnel profiles: 0
- `https://aura.com/`: HTTP 200

## Known limitation

The browser smoke test reaches the unauthenticated login page and correctly
receives 401 responses for protected API calls until an admin login is made.
