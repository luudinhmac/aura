# Payroll salary snapshot - Stage 1

Date: 2026-10-30

## Changes

- Applied migration `20261030_payroll_salary_snapshots`.
- Added `personnel_salary_history` with salary amount, effective dates, currency, source, reason, actor, foreign keys, checks, unique constraint and indexes.
- Added nullable payroll snapshot fields: `contractSalarySnapshot`, `salaryEffectiveFromSnapshot`, `salarySnapshotAt`, and `salaryHistoryId`.
- New PostgreSQL payroll records now persist the contract salary snapshot and snapshot timestamp at creation.
- Payroll API mappings expose the explicit snapshot fields.
- Existing rows were not backfilled or recalculated.

## Verification

- Prisma Client full binary regenerated after stopping stale local Node processes that held the Windows query-engine lock.
- `pnpm.cmd exec prisma validate` passed.
- `pnpm.cmd exec prisma migrate deploy` passed.
- `pnpm.cmd exec prisma migrate status` reports the database up to date.
- `pnpm.cmd run lint` passed.
- `pnpm.cmd test` passed: 38/38.
- `pnpm.cmd run build` passed; the existing >500 kB entry-chunk warning remains.

## Next stage

Stage 2 will add the salary-change workflow and effective-date validation. Historical missing snapshots and legacy total mismatches remain intentionally untouched.
