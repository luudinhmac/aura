# Work assignment acceptance, cancellation and delegated penalty review

## Scope

- `acceptanceDeadline` replaces the ambiguous `dueAt` meaning. It must be earlier than `startAt`; when omitted, the server defaults it to one minute before the start.
- After the deadline, an unaccepted assignment is marked `overdue` and `under_review`.
- Managers can cancel a published assignment with a required reason. Cancelled assignments do not affect schedules, KPI target reduction, or assignment compensation.
- Assignees can be changed before the assignment starts. After the start, the assignee list is locked to preserve audit and payroll history.
- An affected employee can submit a waiver/reduction request with a reason. The request can be approved (waive/reduce) or rejected (keep the configured penalty) only by a director or an account with an active time-bounded delegation.
- Delegations have explicit start/end timestamps, can be revoked early by the director, and are automatically inactive after the end timestamp.

## Server enforcement

- Response deadline, cancellation reason, assignee-edit timing, waiver ownership, and director/delegate authorization are enforced server-side.
- The database migration is `prisma/migrations/20261102_work_assignment_acceptance/migration.sql`.

## Verification

- Prisma schema validation and client generation were run; Windows may report an engine-file lock if the dev process is active, but the generated declarations were updated.
- TypeScript lint passed after the implementation changes.
- The existing schema-focused test was re-run successfully. The full suite remains the final regression gate for this change.
