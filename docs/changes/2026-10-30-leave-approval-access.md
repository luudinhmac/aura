# Leave approval access for business approvers — 2026-10-30

## Problem

The director account `khanghm` already had `manage_approvals`, but its `allowedTabs` did not contain `admin`. The leave approval screen was nested inside Admin Portal, so the account had backend capability without a frontend entry point.

## Change

- Admin Portal access now accepts the `manage_approvals` action in addition to the explicit `admin` tab permission.
- Non-system-admin users with approval permission open the portal in the leave-approval context.
- The portal title distinguishes the business approval center from the Super Admin console.
- No account is promoted to `system_admin`; backend route policies remain authoritative for mutations.

## Verification

- Fixed the disabled approval button for business director accounts whose legacy `role` value is `super_admin`: director authority is now recognized from role, title, or Board department in both UI and backend.
- Added a negative/positive authorization unit test for director recognition.

- `khanghm` database record was inspected: `accountType=personnel`, `isSuperAdmin=false`, `isBusinessAdmin=true`, and `manage_approvals` is present.
- Problems: no errors in the changed files.
- Lint: passed.
- Unit tests: 63/63 passed, including the director-recognition authorization test.
- Production build: passed; existing Vite large-chunk warning remains.
- Direct login with `khanghm/123` was not used as acceptance evidence because the current stored password does not accept that value; no password was changed by this fix.
