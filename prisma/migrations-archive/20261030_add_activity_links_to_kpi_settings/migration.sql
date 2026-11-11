ALTER TABLE "kpi_settings" ADD COLUMN "activityTypeId" INTEGER;

CREATE INDEX "kpi_settings_activityTypeId_period_status_idx"
  ON "kpi_settings"("activityTypeId", "period", "status");

ALTER TABLE "kpi_settings"
  ADD CONSTRAINT "kpi_settings_activityTypeId_fkey"
  FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
