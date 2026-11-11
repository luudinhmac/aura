# Payroll salary snapshot Stage 7 - source warnings and UI protection

Date: 2026-10-30

## Objective

Make the salary snapshot source visible to operators and prevent UI actions from suggesting that finalized payroll periods can still be edited.

## Implemented scope

- Added `snapshotSource` classification for PostgreSQL payroll records:
  - `explicit_snapshot`: nullable snapshot column is present.
  - `legacy_evidence`: explicit column is empty but stored legacy contract salary evidence exists.
  - `missing_snapshot`: no acceptable salary snapshot evidence exists.
- Added warning banner and per-record badges in the payroll table.
- Added explicit tooltip text for legacy and missing snapshot records.
- Disabled hot-bonus and manual-adjustment controls for `approved` and `locked_paid` periods.
- Kept backend mutation guards as the authoritative security/data-integrity enforcement.

## Data impact

- No schema migration.
- No backfill or recalculation.
- No payroll amount changed.
- Missing snapshot records remain visible with their stored historical amounts and a warning; current personnel salary is never substituted.

## Verification

- `pnpm.cmd run lint`: passed.
- `pnpm.cmd test`: 52/52 tests passed.
- `pnpm.cmd run build`: passed; existing Vite large-chunk warning remains.
- Browser payroll smoke passed: draft period displayed legacy warning and enabled valid actions; locked period displayed legacy/missing warnings and disabled hot-bonus/manual-adjustment actions.
- Browser console/page errors: none observed during the successful smoke run.

## Follow-up

Stage 8 should add detailed audit/source presentation to payslip and export flows, plus an explicit operator workflow for resolving records with missing snapshot evidence.
