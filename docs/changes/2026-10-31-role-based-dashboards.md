# Role-based dashboards — 2026-10-31

## What changed

- Added a dashboard persona resolver in `src/utils/dashboardPersona.ts`.
- Added `RoleDashboardView`, which renders separate dashboard summaries for System Admin, Director, Talent Management, Team Leader, HR/Finance, Commercial, Content/Production, Livestream Operations, and general staff.
- Kept the existing Idol dashboard only for accounts with an explicit `idolId`.
- Removed the unsafe `idols[0]` fallback from the Idol dashboard. An unlinked staff or admin account can no longer see another Idol's personal dashboard, salary, KPI, leave, or profile data.
- Added unit coverage for role precedence and the no-unlinked-Idol invariant.

## Permission and data-scope rules

- `system_admin` is selected first when the account is a root system account or has the `system_admin` role.
- Business roles remain separate from System Admin and select their own dashboard persona.
- Dashboard collections are passed from the already filtered `permittedIdols` and `permittedTasks` data in `App.tsx`.
- A system account without a linked personnel/Idol record has no personal payroll or profile section on its dashboard.

## Verification

- `pnpm.cmd run lint` — passed.
- `pnpm.cmd test` — 82/82 passed.
- `pnpm.cmd run build` — passed; the existing large entry-chunk warning remains.
- Local browser accessibility inspection confirmed that Nguyễn Hà Anh now sees the Talent Management dashboard rather than the Idol dashboard.

Production/VM synchronization was not performed. Local verification must remain the gate before any future VM deployment.
