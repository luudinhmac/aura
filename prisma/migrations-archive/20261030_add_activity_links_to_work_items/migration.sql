ALTER TABLE "work_schedules"
  ADD COLUMN "activityTypeId" INTEGER;

ALTER TABLE "personnel_tasks"
  ADD COLUMN "activityTypeId" INTEGER;

CREATE INDEX "work_schedules_activityTypeId_idx"
  ON "work_schedules"("activityTypeId");

CREATE INDEX "personnel_tasks_activityTypeId_idx"
  ON "personnel_tasks"("activityTypeId");

ALTER TABLE "work_schedules"
  ADD CONSTRAINT "work_schedules_activityTypeId_fkey"
  FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "personnel_tasks"
  ADD CONSTRAINT "personnel_tasks_activityTypeId_fkey"
  FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
