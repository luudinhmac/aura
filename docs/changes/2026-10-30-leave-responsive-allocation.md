# Leave responsive layout and allocation — 2026-10-30

## Objective

Fix clipped long modals and implement confirmation-based annual-leave overflow allocation into unpaid leave without mutating rejected requests or finalized payroll history.

## Approved scope

- Responsive scrolling for the existing modal surfaces.
- Leave allocation fields, API validation/error contract, admin visibility, and payroll deduction for approved unpaid leave.
- Unit tests, migration validation, lint, build, and browser smoke verification where the current account permits.

## Implemented

- Added responsive modal viewport constraints across the affected views and shared components.
- Added `LeaveRequest.annualLeaveDays`, `LeaveRequest.unpaidLeaveDays`, and `LeaveRequest.allocationConfirmed`.
- Applied migration `20261030_leave_allocations`; legacy rows are initialized as fully annual for annual leave and fully unpaid for other leave types.
- Added pure allocation and payroll deduction utilities and unit coverage.
- Added API 409 response for unconfirmed annual-leave overflow.
- Added admin allocation display and approved unpaid-leave deduction during PostgreSQL payroll record creation.
- Added server-side leave route policies: personnel can view/submit only for their own linked profile; management approval permission is required for update/delete and cross-person access; reviewer identity is sourced server-side.

## Data and safety decisions

- Pending and approved annual requests reserve quota; rejected requests do not.
- The user must explicitly confirm the split before submission.
- Finalized payroll periods are not recalculated by this change.
- The payroll deduction is based on monthly contract salary / standard work days × approved unpaid days.

## Verification

- Prisma schema validation: passed.
- Prisma migration deploy: passed (`20261030_leave_allocations`).
- TypeScript/lint: passed.
- Unit tests: 62/62 passed.
- Production build: passed; existing Vite large-chunk warning remains.
- Route policy/security tests: passed as part of the 62-test suite.
- Browser: application restarted and payroll page reloaded successfully with no visible runtime failure. Full leave-form interaction is not verified in-browser because the active HR account does not expose Idol Dashboard in its navigation.

## Follow-up

## Browser smoke verification update

- Verified login with idol account `quynhbt/123`.
- Verified the leave modal at 420x700: the modal stays within the viewport and the action footer remains accessible.
- Verified a 5-day annual-leave request with 1 day remaining renders `1 annual + 4 unpaid` and blocks submission until confirmation.
- Closed the test modal without submitting, so no test leave request was persisted.

- Run the leave-form smoke test with a user account that has Hồ Sơ / Idol Dashboard access before production release.
