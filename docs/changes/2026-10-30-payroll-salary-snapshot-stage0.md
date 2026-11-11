# Payroll salary snapshot - Stage 0

Date: 2026-10-30

## Scope

Read-only baseline audit for historical payroll salary preservation. No schema migration, payroll sync, update, delete, or backfill was performed.

## Implementation

- Added [audit-payroll-salary-snapshots.ts](../../scripts/audit-payroll-salary-snapshots.ts), which reads payroll periods, payroll records, current personnel salary, snapshot fields, payment status, adjustment logs, and period totals.
- Added [payrollSnapshotAudit.ts](../../src/utils/payrollSnapshotAudit.ts) with pure classification and reconciliation logic.
- Added [payrollSnapshotAudit.test.ts](../../test/payrollSnapshotAudit.test.ts).
- Generated the local ignored report at `reports/payroll-salary-baseline-2026-10-30.json`.

## Baseline result

- 26 payroll periods and 253 payroll records.
- 25 periods are `approved` or `locked_paid`.
- 11 records lack `earningsDetail.contractBaseSalary`; all are in `2025-10`.
- 0 records currently have a snapshot different from the current `Personnel.baseSalary`.
- 4 records contain adjustment logs; 209 records are paid.
- 24 periods have stored totals that do not reconcile with the sum of their records.
- A PostgreSQL custom-format backup was created at the local ignored path `backups/payroll-stage0-2026-10-30.dump`; its catalog contained 229 entries.

## Verification

- `pnpm.cmd run lint` passed.
- `pnpm.cmd test` passed: 38/38 tests.
- The first direct `tsx` audit attempt hit the known agent runtime `uv_os_get_passwd ENOMEM`; rerunning with `test/tsx-preload.cjs` completed successfully.

## Decision required before Stage 1

Do not infer historical salary from the current profile. Before adding salary history and backfill, confirm the business treatment for the 11 missing snapshots and investigate the 24 stored-total mismatches. Existing approved/paid periods must remain financially immutable unless a separately approved correction workflow is used.
