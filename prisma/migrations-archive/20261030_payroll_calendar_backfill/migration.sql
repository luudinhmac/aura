UPDATE "payroll_periods"
SET
  "feedbackStartsAt" = (to_date("period" || '-01', 'YYYY-MM-DD') + INTERVAL '1 month')::date,
  "approvalStartsAt" = (to_date("period" || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' + INTERVAL '3 days')::date,
  "lockStartsAt" = (to_date("period" || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' + INTERVAL '4 days')::date
WHERE "feedbackStartsAt" IS NULL;
