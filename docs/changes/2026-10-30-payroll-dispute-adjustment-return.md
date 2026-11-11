# Payroll dispute adjustment return flow — 2026-10-30

## Objective

Keep the selected payroll dispute connected to its adjustment form and make the adjustment result explicit before the reviewer closes the ticket.

## Implementation

- Added the `adjusted` dispute status and display label `Đã điều chỉnh`.
- Included `adjusted` in the open inbox and allowed reviewers to resolve or reject only after `under_review` or `adjusted`.
- Propagated `disputeId` with the adjustment target from the dispute inbox to payroll adjustment.
- After a successful payroll adjustment, the backend updates the dispute to `adjusted`; the UI returns to the dispute inbox and selects the same ticket.
- The selected ticket then exposes the final “Xác nhận đã xử lý” and “Từ chối” actions.
- Follow-up fix: the dispute id is now retained in local adjustment state before the navigation target is consumed, so saving the form reliably performs the return flow.

## Verification

- `pnpm run lint`: passed.
- `pnpm test`: passed, 76/76 tests.
- `pnpm run build`: passed. Existing Vite large-entry-chunk warning remains.
- Browser verification remains blocked by the local Node runtime error `uv_os_get_passwd ENOMEM`.
