-- Stage 3: enforce invariants already satisfied by the current data set.

ALTER TABLE "personnel"
  ADD CONSTRAINT "personnel_nonnegative_measurements_check"
  CHECK ("weight" >= 0 AND "height" >= 0 AND "baseSalary" >= 0),
  ADD CONSTRAINT "personnel_status_check"
  CHECK ("status" IN ('Đang hoạt động', 'Đã nghỉ việc')),
  ADD CONSTRAINT "personnel_resignation_after_join_check"
  CHECK ("joinDate" IS NULL OR "resignedDate" IS NULL OR "resignedDate" >= "joinDate");

ALTER TABLE "payroll_records"
  ADD CONSTRAINT "payroll_period_format_check"
  CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "payroll_nonnegative_amounts_check"
  CHECK (
    "baseSalary" >= 0 AND "overtimePay" >= 0 AND "kpiBonus" >= 0 AND
    "commissionGmv" >= 0 AND "giftShare" >= 0 AND "hotBonus" >= 0 AND
    "totalGross" >= 0 AND "totalDeductions" >= 0 AND "netSalary" >= 0 AND
    "companyInsurance" >= 0 AND "companyLaborCost" >= 0
  );

ALTER TABLE "revenue_transactions"
  ADD CONSTRAINT "revenue_period_format_check"
  CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "revenue_nonnegative_amounts_check"
  CHECK (
    "grossAmount" >= 0 AND "totalDeductions" >= 0 AND "netAmount" >= 0 AND
    "fixedPayoutAmount" >= 0 AND "idolPayoutAmount" >= 0 AND "companyProfitAmount" >= 0
  ),
  ADD CONSTRAINT "revenue_share_rate_check"
  CHECK ("idolShareRate" >= 0 AND "idolShareRate" <= 100),
  ADD CONSTRAINT "revenue_payout_mode_check"
  CHECK ("payoutMode" IN ('percentage', 'fixed', 'hybrid')),
  ADD CONSTRAINT "revenue_status_check"
  CHECK ("status" IN ('draft', 'verified', 'synced_to_payroll', 'cancelled', 'completed'));

ALTER TABLE "revenue_deduction_items"
  ADD CONSTRAINT "revenue_deduction_nonnegative_amount_check"
  CHECK ("amount" >= 0);

ALTER TABLE "company_expenses"
  ADD CONSTRAINT "expense_period_format_check"
  CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "expense_nonnegative_amount_check"
  CHECK ("amount" >= 0),
  ADD CONSTRAINT "expense_status_check"
  CHECK ("status" IN ('pending', 'approved', 'paid', 'cancelled'));

ALTER TABLE "kpi_settings"
  ADD CONSTRAINT "kpi_target_nonnegative_check"
  CHECK ("targetValue" >= 0 AND ("minThreshold" IS NULL OR "minThreshold" >= 0)),
  ADD CONSTRAINT "kpi_weight_range_check"
  CHECK ("weight" > 0 AND "weight" <= 100),
  ADD CONSTRAINT "kpi_scope_type_check"
  CHECK ("scopeType" IN ('group', 'individual')),
  ADD CONSTRAINT "kpi_status_check"
  CHECK ("status" IN ('active', 'inactive'));

ALTER TABLE "criteria"
  ADD CONSTRAINT "criterion_positive_max_score_check"
  CHECK ("maxScore" > 0),
  ADD CONSTRAINT "criterion_weight_range_check"
  CHECK ("weight" > 0 AND "weight" <= 100);

ALTER TABLE "operational_metrics"
  ADD CONSTRAINT "operational_metric_nonnegative_value_check"
  CHECK ("actualValue" >= 0);

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_nonnegative_days_check"
  CHECK ("totalDays" >= 0);
