# HR personnel creation error — 2026-10-31

## Objective

Fix the failure reported for the HR/Accounting account when creating a new personnel profile, while preserving the existing permission model: HR may create and edit personnel, but only System Admin may delete them.

## Findings

- The Kim Ngân account has `manage_idols` and the personnel list exposes the create action.
- The `POST /api/idols` route also authorizes `manage_idols`.
- The previous API response replaced every creation error with the same generic message, which hid the actual cause.
- A company personnel creation can reuse an existing username/email. If that account is already linked to another personnel profile, the database unique relation constraint rejects the transaction.

## Approved scope and implementation

- Log the request ID and server-side error for personnel creation failures.
- Return the actionable API error to the client instead of hiding it behind the old generic message.
- Reject reuse of an account already linked to another personnel profile with a clear validation error.
- Add a transaction test proving linked-account reuse is rejected and no duplicate profile is created.
- No schema, migration, production deployment, or VM synchronization is included.

## Verification

- `pnpm.cmd lint`: passed.
- `pnpm.cmd test`: passed, 87/87 tests.
- Browser verification: Kim Ngân can access the personnel roster and the “Thêm thành viên” action on local. No production changes were made.

## Known limitation

The local browser session still reports an existing `401 Unauthorized` resource request during session transitions; this is unrelated to the personnel-create transaction and was not changed in this fix.
