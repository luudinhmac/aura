# Payroll auto deductions and money input — 2026-10-30

## Objective

Make payroll adjustment values consistent and easier to enter: tax and employee insurance are recalculated from contract salary, while money fields display thousands separators without numeric spinner controls.

## Approved scope

- Use the existing payroll policy: personal income tax is 10% of contract salary above 11,000,000 VND; employee insurance is 10.5% of contract salary for company personnel; company insurance is 21.5% of contract salary for company personnel.
- Apply the same calculation in the adjustment UI and PostgreSQL store.
- Ignore client-supplied tax/insurance values on the backend and derive them again.
- Format VND inputs with Vietnamese thousands separators and use `text` + numeric input mode instead of `number` for money fields. Work-day and overtime-hour inputs remain numeric quantities.

## Implementation

- Added `src/utils/payrollDeductions.ts` as the shared calculation source.
- Added `src/components/MoneyInput.tsx` for formatted integer money entry accepting `.` or `,` separators.
- Updated `PayrollManagementView` to recalculate and display tax/insurance as read-only derived values.
- Updated `pgStore.adjustPayrollRecord` and initial payroll creation to use contract salary for employee/company insurance.
- Added unit coverage for company, below-threshold, and non-company cases.

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed, 76/76 tests.
- `npm.cmd run build`: passed. Existing Vite warning about the large entry chunk remains.
- Browser smoke verification: not completed because the local Node runtime previously failed with `uv_os_get_passwd ENOMEM`; the implementation is statically verified.

## Follow-up

- Re-run the adjustment modal in a working local server and verify typing `20.000.000` and `20,000,000`, recalculation after changing contract salary, and absence of spinner arrows in the browser.
