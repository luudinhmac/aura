## Operational metrics

`operational_metrics` stores monthly operational KPI actuals that are not
available from schedules or revenue transactions, such as engagement and gift
points. Each personnel/month/metric code is unique and can be upserted by the
operational metrics API.

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `id` | UUID | Primary key | Metric record identifier |
| `personnelId` | INTEGER | Foreign key to `personnel.id` | KPI owner |
| `period` | TEXT | Part of unique key | `YYYY-MM` period |
| `metricCode` | TEXT | Part of unique key | `LIVE_HOURS`, `GMV_LIVE`, `ENGAGEMENT`, or `GIFT_POINTS` |
| `actualValue` | DECIMAL(15,2) | Required | Actual value for the period |
| `source` | TEXT | Optional | Source or evidence reference |
| `note` | TEXT | Optional | Operational note |

## Dynamic personnel columns

### `personnel.customFields`

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `customFields` | JSONB | Nullable | Stores values keyed by the immutable `PersonnelColumn.key`; legacy rows may remain `NULL`. |

### `personnel_columns`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `id` | UUID/TEXT | UUID | Column metadata identifier. |
| `key` | TEXT | — | Immutable unique key used in `customFields`. |
| `label` | TEXT | — | Editable display label. |
| `type` | TEXT | — | `text`, `number`, `date`, `select`, or `boolean`. |
| `options` | JSONB | NULL | Select options when `type=select`. |
| `required` | BOOLEAN | `false` | Client validation flag. |
| `isVisible` | BOOLEAN | `true` | Default roster visibility preference. |
| `isActive` | BOOLEAN | `true` | Archive/restore state; archive preserves values. |
| `sortOrder` | INTEGER | `0` | Metadata display order. |
| `showInRoster` | BOOLEAN | `true` | Enables roster rendering. |
| `showInProfile` | BOOLEAN | `true` | Enables profile rendering. |
| `sensitivity` | TEXT | `public` | `public`, `internal`, or `sensitive`; enforced server-side for custom values. |
| `isSystem` | BOOLEAN | `false` | Protects seeded system columns from destructive metadata changes. |

Migration:

- `prisma/migrations/00000000000000_squashed_baseline/migration.sql`

Historical incremental migrations are preserved under
`prisma/migrations-archive/` for audit reference and are not scanned by Prisma.

