# Payroll salary snapshot Stage 5 - controlled legacy backfill

Date: 2026-10-30

## Objective

Provide a safe, reviewable backfill workflow for legacy payroll records that lack explicit salary snapshots. The workflow must never infer a historical salary from the current personnel salary and must not change payroll money fields.

## Implemented scope

- Added a pure backfill planner that classifies records as already snapshotted, safe candidate, missing evidence, or conflicting evidence.
- Accepted evidence sources are explicit `earningsDetail.contractBaseSalary`, explicit adjustment-log snapshot fields, and an optional matching legacy backup record.
- Existing snapshots are never overwritten.
- Conflicting evidence is quarantined for manual review.
- Added `scripts/backfill-payroll-salary-snapshots.ts` with read-only dry-run as the default.
- Apply mode requires `--apply --actor-user-id <system-super-admin-id>` and writes only `contractSalarySnapshot` plus `salarySnapshotAt`.
- Apply mode writes an audit log for every record, uses one transaction, and verifies period gross/deduction/net/employee totals before commit.
- No `baseSalary`, `totalGross`, `totalDeductions`, `netSalary`, KPI, allowance, tax, insurance, or payment fields are recalculated.
- Optional `--backup <path>` evidence is matched by payroll record ID; it is not treated as authoritative when it conflicts with another source.

## Dry-run result

The verified PostgreSQL dry-run report is [payroll-salary-backfill-stage5-2026-10-30.json](../../reports/payroll-salary-backfill-stage5-2026-10-30.json):

- 253 records inspected.
- 242 safe candidates with one consistent explicit evidence amount.
- 11 records retained for manual review because no evidence was available.
- 0 conflicting candidates.
- 0 records applied; no business data was changed by Stage 5.

## Controlled apply procedure

1. Take and verify a PostgreSQL backup/checksum outside this script.
2. Run the dry-run and review the generated JSON report.
3. Confirm the candidate list and excluded records with Finance/HR.
4. Run the same command with `--apply --actor-user-id <system-super-admin-id>`.
5. Re-run the audit report and compare period totals and audit-log entries.

The script intentionally does not provide a force flag and aborts the transaction if any record changed concurrently or any period total differs after the metadata-only update.

## Verification

- `pnpm.cmd run lint`: passed.
- `pnpm.cmd test`: 48/48 tests passed.
- Dry-run against PostgreSQL: passed with the result above.
- Build and browser verification remain required after the final Stage 5 documentation update.
