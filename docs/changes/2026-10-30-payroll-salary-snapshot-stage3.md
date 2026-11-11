# Payroll salary snapshot - Stage 3

Date: 2026-10-30

## Objective

Resolve the salary that applies to each payroll period and snapshot it when a new payroll record is created.

## Implementation

- Added [payrollSalaryResolver.ts](../../src/utils/payrollSalaryResolver.ts) as a pure resolver.
- Resolver selects the applicable salary-history row by effective date.
- Mid-month changes are prorated using working days Monday-Saturday, clipped by join and resignation dates.
- PostgreSQL `syncPayrollPeriod()` now loads salary history for eligible personnel and snapshots the resolved salary on new records.
- Existing records remain immutable during sync.
- New records include salary segments in `earningsDetail` for auditability.

## Data integrity

The mutable `Personnel.baseSalary` is used only as a fallback when no salary-history row applies to a new record. A later salary increase therefore cannot rewrite an existing payroll record. No historical records were backfilled or recalculated.

## Verification

- `pnpm.cmd run lint` passed.
- `pnpm.cmd test` passed: 44/44 tests.
- `pnpm.cmd run build` passed.
- Prisma schema validation and migration status passed.
- Browser smoke test confirmed the roster and payroll list API return successfully after server restart.

## Follow-up

Stage 4 should remove or isolate legacy JSON salary recalculation behavior and make the fallback path explicitly dev/test-only, then Stage 5 can perform controlled backfill where evidence exists.
