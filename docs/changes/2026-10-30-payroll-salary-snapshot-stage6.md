# Payroll salary snapshot Stage 6 - consumer and finalized-period protection

Date: 2026-10-30

## Objective

Ensure payroll consumers read stored historical payroll amounts and prevent synchronization or manual adjustments from changing approved/paid periods.

## Implemented scope

- Added a shared payroll-period mutation guard. Only `draft` and `pending_approval` periods can change payroll amounts.
- `syncPayrollPeriod()` now rejects `approved` and `locked_paid` periods before deleting, creating, or recalculating any record.
- Manual payroll adjustment validates the selected period and rejects finalized periods before changing money fields.
- Revenue-to-payroll synchronization now rejects finalized periods instead of overwriting commission, gift share, gross and net values.
- Legacy payroll records expose `earningsDetail.contractBaseSalary` as a read-only API snapshot fallback when the explicit nullable snapshot column is not populated; the current personnel salary is never used for this fallback.
- Existing report/P&L/payroll aggregation paths continue to use stored payroll record and period amounts (`baseSalary`, `totalGross`, `totalDeductions`, `netSalary`) rather than `Personnel.baseSalary`.

## Data impact

- No data migration or historical recalculation was executed.
- Finalized-period data is now protected at the store boundary.
- Draft/pending payroll workflows retain existing adjustment and revenue-sync behavior.

## Verification

- `pnpm.cmd run lint`: passed.
- `pnpm.cmd test`: 51/51 tests passed, including finalized-period sync/adjustment rejection.
- `pnpm.cmd run build`: passed; existing Vite large-chunk warning remains (`532.94 kB` final entry, `151.81 kB` gzip).
- Browser smoke: `/api/payrolls` returned HTTP 200 with 26 periods, `/api/payrolls/payroll-2025-10/records` returned HTTP 200 with 17 records, and page reload completed without console or page errors.

## Follow-up

Stage 7 should cover UI messaging, RBAC/audit presentation and explicit history warnings when a record has a missing snapshot or an evidence-backed legacy fallback.
