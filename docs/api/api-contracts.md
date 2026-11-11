## Operational KPI

### `GET /api/operational-kpi/:personnelId?period=YYYY-MM`

Returns the four operational KPI metrics for one personnel record and period.
Targets are resolved from active `KpiSetting` records. Sales use verified or
payroll-synced `GMV_LIVE` revenue transactions. The response includes actual,
target, score, maximum score, total score, and grade.

### `GET /api/operational-metrics?personnelId=&period=`

Lists stored operational metric actuals.

### `PUT /api/operational-metrics`

Upserts one metric using `personnelId`, `period`, `metricCode`, `actualValue`,
and optional `source` and `note`.

