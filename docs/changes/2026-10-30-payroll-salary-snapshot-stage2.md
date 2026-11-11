# Payroll salary snapshot - Stage 2

Date: 2026-10-30

## Objective

Enforce a controlled salary-change workflow so a later salary increase cannot rewrite historical payroll data.

## Approved scope

- Salary history API with effective date, reason, actor and audit metadata.
- Transactional history interval updates and current salary update.
- Guard against retroactive changes after payroll periods are pending approval, approved or locked/paid.
- Prevent direct salary mutation through the personnel profile update flow.
- Add effective-date and reason inputs to the personnel edit form.
- Add automated and browser smoke verification.

## Implementation

- Added route policy for `POST /idols/:id/salary-history` with `manage_payroll`.
- Added `changePersonnelSalary()` and `getPersonnelSalaryHistory()` in `server/db/pgStore.ts`.
- Added strict date and salary validation, unique effective-date handling, interval closing and audit log creation.
- Added `salaryChange` handling to `updateIdol()` and rejected unstructured salary changes.
- Added API client methods and edit-form controls in `src/components/IdolModal.tsx`.

## Data impact

No existing payroll record or historical business amount was backfilled or overwritten. A future-effective salary change does not update `Personnel.baseSalary` until its effective date. A change whose effective month intersects an already approved/locked workflow is rejected.

## Verification

- `pnpm.cmd run lint` passed.
- `pnpm.cmd test` passed: 40/40 tests.
- `pnpm.cmd run build` passed.
- Browser smoke test passed for roster loading, salary-history GET, retroactive-change rejection, and edit-form fields.

## Follow-up

Stage 3 should centralize salary resolution for payroll creation and ensure new payroll records select the correct salary-history row for each period, including the approved mid-month proration policy.
