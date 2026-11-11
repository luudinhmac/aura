# Pending personnel status constraint — 2026-10-31

## Objective

Allow HR-created personnel records to remain in `Chờ duyệt` until an authorized reviewer approves them.

## Root cause

The application already creates HR submissions with `status = 'Chờ duyệt'`, but PostgreSQL's `personnel_status_check` only allowed `Đang hoạt động` and `Đã nghỉ việc`. The insert was therefore rejected before the approval request could be completed.

## Implementation

- Added migration `20261031_allow_pending_personnel_status`.
- Replaced the status check constraint with the same invariant plus `Chờ duyệt`.
- Added a transaction regression test for pending personnel creation.
- No production/VM migration was executed.

## Verification

- Local migration deployment completed successfully; `prisma migrate status` reports the database is up to date, and the database-backed regression test passes.
- The migration is reversible by restoring the previous constraint only after all pending records have been resolved; do not roll it back while `Chờ duyệt` rows exist.
