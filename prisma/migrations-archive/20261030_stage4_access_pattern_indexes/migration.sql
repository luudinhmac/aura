-- Stage 4: indexes for measured application access patterns and FK lookups.
CREATE INDEX IF NOT EXISTS "personnel_isIdol_personnelType_status_idx"
  ON "personnel"("isIdol", "personnelType", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_status_createdAt_idx"
  ON "leave_requests"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "approval_requests_targetPersonnelId_status_idx"
  ON "approval_requests"("targetPersonnelId", "status");
CREATE INDEX IF NOT EXISTS "payroll_records_personnelId_period_idx"
  ON "payroll_records"("personnelId", "period");
CREATE INDEX IF NOT EXISTS "kpi_group_members_personnelId_idx"
  ON "kpi_group_members"("personnelId");
CREATE INDEX IF NOT EXISTS "kpi_settings_groupId_period_status_idx"
  ON "kpi_settings"("groupId", "period", "status");
CREATE INDEX IF NOT EXISTS "kpi_settings_scopeType_status_period_idx"
  ON "kpi_settings"("scopeType", "status", "period");
CREATE INDEX IF NOT EXISTS "system_lookups_type_orderIndex_idx"
  ON "system_lookups"("type", "orderIndex");
CREATE INDEX IF NOT EXISTS "revenue_deduction_items_transactionId_idx"
  ON "revenue_deduction_items"("transactionId");
CREATE INDEX IF NOT EXISTS "company_expenses_period_status_idx"
  ON "company_expenses"("period", "status");
