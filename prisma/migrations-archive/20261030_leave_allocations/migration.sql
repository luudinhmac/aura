ALTER TABLE "leave_requests"
  ADD COLUMN "annualLeaveDays" DECIMAL(4,1) NOT NULL DEFAULT 0,
  ADD COLUMN "unpaidLeaveDays" DECIMAL(4,1) NOT NULL DEFAULT 0,
  ADD COLUMN "allocationConfirmed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "leave_requests"
SET
  "annualLeaveDays" = CASE WHEN "leaveType" = 'annual' THEN "totalDays" ELSE 0 END,
  "unpaidLeaveDays" = CASE WHEN "leaveType" = 'annual' THEN 0 ELSE "totalDays" END,
  "allocationConfirmed" = true;
