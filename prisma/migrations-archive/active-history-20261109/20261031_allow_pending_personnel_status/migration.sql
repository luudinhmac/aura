-- Personnel created by HR/operational users remains pending until approval.
-- Keep the invariant explicit while allowing the existing approval workflow state.
ALTER TABLE "personnel"
  DROP CONSTRAINT IF EXISTS "personnel_status_check";

ALTER TABLE "personnel"
  ADD CONSTRAINT "personnel_status_check"
  CHECK ("status" IN ('Đang hoạt động', 'Đã nghỉ việc', 'Chờ duyệt'));
