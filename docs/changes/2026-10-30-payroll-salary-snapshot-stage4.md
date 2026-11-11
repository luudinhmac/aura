# Payroll salary snapshot Stage 4 - legacy fallback isolation

Date: 2026-10-30

## Objective

Prevent the legacy JSON payroll fallback from changing historical salary amounts when the current personnel salary changes. PostgreSQL remains the production storage path and the source of the snapshot contract.

## Implemented scope

- Production now rejects the legacy JSON store and requires PostgreSQL mode.
- Legacy JSON synchronization no longer recalculates existing salary, allowance, tax, deduction, gross or net amounts from the current personnel profile.
- Automatic legacy salary backfill is disabled (`LEGACY_SALARY_BACKFILL_ENABLED = false`); missing historical evidence is not invented.
- Legacy synchronization is limited to `draft` periods. `pending_approval`, `approved`, and `locked_paid` periods are preserved without cleanup, salary recalculation, record creation, or aggregate-total rewriting.
- Existing profile, bank and display metadata synchronization remains available only for draft legacy periods.

## Data impact

- No business data was intentionally modified by this stage.
- Existing historical payroll records are not backfilled or recalculated.
- No schema migration was required.
- The legacy JSON fallback remains a development/test compatibility path only; it is not valid for production deployment.

## Verification

- `pnpm.cmd run lint`: passed.
- `pnpm.cmd test`: 44/44 tests passed.
- Production legacy-store guard smoke test: passed.
- `pnpm.cmd run build`: passed; existing Vite large-chunk warning remains.
- Prisma schema/migration status: previously verified valid and up to date; Stage 4 has no schema changes.
- Browser payroll API smoke test: verified after restarting the server, with HTTP 200 from `/api/payrolls`.

## Follow-up

Stage 5 should provide an explicit, evidence-backed legacy backfill/audit tool. It must produce a reviewable report, require an operator decision, preserve an audit trail, and never infer a historical salary solely from the current `Personnel.baseSalary`.
