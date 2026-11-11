-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'personnel',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isBusinessAdmin" BOOLEAN NOT NULL DEFAULT false,
    "allowedTabs" JSONB NOT NULL DEFAULT '[]',
    "allowedDepartments" JSONB NOT NULL DEFAULT '[]',
    "allowedActions" JSONB NOT NULL DEFAULT '[]',
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Đang hoạt động',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedBySessionId" TEXT,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "stt" INTEGER,
    "stageName" TEXT,
    "realName" TEXT NOT NULL,
    "dob" DATE,
    "joinDate" DATE,
    "resignedDate" DATE,
    "role" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "height" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hometown" TEXT,
    "currentLiving" TEXT,
    "department" TEXT NOT NULL,
    "personnelType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Đang hoạt động',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "isIdol" BOOLEAN NOT NULL DEFAULT false,
    "cooperationType" TEXT NOT NULL DEFAULT 'internal',
    "serviceNotes" TEXT,
    "assignedRole" TEXT,
    "phone" TEXT,
    "citizenId" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "baseSalary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "idolCategory" TEXT,
    "commercialDetails" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_activity_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_activities" (
    "id" TEXT NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "activityTypeId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_columns" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "showInRoster" BOOLEAN NOT NULL DEFAULT true,
    "showInProfile" BOOLEAN NOT NULL DEFAULT true,
    "sensitivity" TEXT NOT NULL DEFAULT 'public',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "activityTypeId" INTEGER,
    "dayOfWeek" INTEGER NOT NULL,
    "shiftType" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "repeatType" TEXT,
    "specificMonth" TEXT,
    "specificDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_tasks" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "activityTypeId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "loggedDurationMinutes" INTEGER NOT NULL DEFAULT 0,
    "subtasks" JSONB NOT NULL DEFAULT '[]',
    "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personnel_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "personnelName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DECIMAL(4,1) NOT NULL,
    "annualLeaveDays" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "unpaidLeaveDays" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "allocationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approverRoleRequired" TEXT,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" INTEGER,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "targetPersonnelId" INTEGER,
    "targetName" TEXT NOT NULL,
    "reason" TEXT,
    "data" JSONB,
    "requestedById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalGross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalKpiBonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalHotBonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "submittedById" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "feedbackStartsAt" DATE,
    "approvalStartsAt" DATE,
    "lockStartsAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" UUID NOT NULL,
    "periodId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "stageName" TEXT,
    "department" TEXT NOT NULL,
    "personnelType" TEXT NOT NULL,
    "isIdol" BOOLEAN NOT NULL DEFAULT false,
    "bankInfo" JSONB NOT NULL DEFAULT '{}',
    "baseSalary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "contractSalarySnapshot" DECIMAL(15,2),
    "salaryEffectiveFromSnapshot" DATE,
    "salarySnapshotAt" TIMESTAMP(3),
    "salaryHistoryId" UUID,
    "overtimePay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "kpiBonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "commissionGmv" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "giftShare" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "hotBonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalGross" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "companyInsurance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "companyLaborCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "earningsDetail" JSONB NOT NULL DEFAULT '{}',
    "deductionsDetail" JSONB NOT NULL DEFAULT '{}',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "adjustmentLogs" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_disputes" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "recordId" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "submittedById" INTEGER,
    "category" TEXT NOT NULL,
    "systemValue" JSONB NOT NULL DEFAULT '{}',
    "requestedValue" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_salary_history" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "salaryAmount" DECIMAL(15,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'mixed',
    "department" TEXT,
    "leaderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_group_members" (
    "groupId" INTEGER NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "roleInGroup" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_group_members_pkey" PRIMARY KEY ("groupId","personnelId")
);

-- CreateTable
CREATE TABLE "kpi_settings" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "customUnitLabel" TEXT,
    "scopeType" TEXT NOT NULL,
    "groupId" INTEGER,
    "assignedPersonnelId" INTEGER,
    "activityTypeId" INTEGER,
    "period" TEXT NOT NULL,
    "targetValue" DECIMAL(15,2) NOT NULL,
    "minThreshold" DECIMAL(15,2),
    "weight" DECIMAL(5,2) NOT NULL,
    "bonusIncentive" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_metrics" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "metricCode" TEXT NOT NULL,
    "actualValue" DECIMAL(15,2) NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criteria" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "priorityOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_records" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "totalScore" DECIMAL(6,2) NOT NULL,
    "averageScore" DECIMAL(5,2) NOT NULL,
    "evaluatorNotes" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_record_items" (
    "id" SERIAL NOT NULL,
    "scoreRecordId" UUID NOT NULL,
    "criterionId" INTEGER NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "score_record_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'global_settings',
    "referenceYear" INTEGER NOT NULL DEFAULT 2026,
    "referenceDate" TEXT,
    "brandName" TEXT,
    "brandTagline" TEXT,
    "brandLogoUrl" TEXT,
    "tieBreakerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tieBreakerCriteriaIds" JSONB NOT NULL DEFAULT '[]',
    "scoreCalculationMode" TEXT NOT NULL DEFAULT 'sum',
    "departmentParentMap" JSONB NOT NULL DEFAULT '{}',
    "departmentLeaders" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lookups" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_categories" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultIdolShareRate" DECIMAL(5,2) NOT NULL DEFAULT 70.0,
    "color" TEXT DEFAULT 'rose',
    "icon" TEXT DEFAULT 'DollarSign',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_platforms" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultFeeRate" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "feeType" TEXT NOT NULL DEFAULT 'percentage',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_transactions" (
    "id" UUID NOT NULL,
    "transactionCode" TEXT NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "platformId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "contractRef" TEXT,
    "payoutMode" TEXT NOT NULL DEFAULT 'percentage',
    "grossAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "idolShareRate" DECIMAL(5,2) NOT NULL DEFAULT 70.0,
    "fixedPayoutAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "idolPayoutAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "companyProfitAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rateOverrideReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "proofUrl" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "approvedById" INTEGER,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_deduction_items" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "deductionType" TEXT NOT NULL DEFAULT 'platform_fee',
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_deduction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_expenses" (
    "id" UUID NOT NULL,
    "expenseCode" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "categoryLabel" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "facilityType" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "recipient" TEXT,
    "invoiceRef" TEXT,
    "proofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorUserId" INTEGER,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "statusCode" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key" ON "auth_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON "auth_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_userId_key" ON "personnel"("userId");

-- CreateIndex
CREATE INDEX "personnel_isIdol_personnelType_status_idx" ON "personnel"("isIdol", "personnelType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_activity_types_code_key" ON "personnel_activity_types"("code");

-- CreateIndex
CREATE INDEX "personnel_activity_types_isActive_displayOrder_idx" ON "personnel_activity_types"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "personnel_activities_personnelId_isPrimary_idx" ON "personnel_activities"("personnelId", "isPrimary");

-- CreateIndex
CREATE INDEX "personnel_activities_activityTypeId_idx" ON "personnel_activities"("activityTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_activities_personnelId_activityTypeId_key" ON "personnel_activities"("personnelId", "activityTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_columns_key_key" ON "personnel_columns"("key");

-- CreateIndex
CREATE INDEX "personnel_columns_isActive_sortOrder_idx" ON "personnel_columns"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "work_schedules_personnelId_dayOfWeek_idx" ON "work_schedules"("personnelId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "work_schedules_activityTypeId_idx" ON "work_schedules"("activityTypeId");

-- CreateIndex
CREATE INDEX "personnel_tasks_personnelId_status_idx" ON "personnel_tasks"("personnelId", "status");

-- CreateIndex
CREATE INDEX "personnel_tasks_activityTypeId_idx" ON "personnel_tasks"("activityTypeId");

-- CreateIndex
CREATE INDEX "leave_requests_personnelId_status_idx" ON "leave_requests"("personnelId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_status_createdAt_idx" ON "leave_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_requests_status_createdAt_idx" ON "approval_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_requests_targetPersonnelId_status_idx" ON "approval_requests"("targetPersonnelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_period_key" ON "payroll_periods"("period");

-- CreateIndex
CREATE INDEX "payroll_records_personnelId_period_idx" ON "payroll_records"("personnelId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_periodId_personnelId_key" ON "payroll_records"("periodId", "personnelId");

-- CreateIndex
CREATE INDEX "payroll_disputes_periodId_status_idx" ON "payroll_disputes"("periodId", "status");

-- CreateIndex
CREATE INDEX "payroll_disputes_recordId_status_idx" ON "payroll_disputes"("recordId", "status");

-- CreateIndex
CREATE INDEX "payroll_disputes_personnelId_createdAt_idx" ON "payroll_disputes"("personnelId", "createdAt");

-- CreateIndex
CREATE INDEX "payroll_disputes_submittedById_status_idx" ON "payroll_disputes"("submittedById", "status");

-- CreateIndex
CREATE INDEX "personnel_salary_history_personnelId_effectiveFrom_idx" ON "personnel_salary_history"("personnelId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "personnel_salary_history_createdById_idx" ON "personnel_salary_history"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_salary_history_personnelId_effectiveFrom_key" ON "personnel_salary_history"("personnelId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "kpi_group_members_personnelId_idx" ON "kpi_group_members"("personnelId");

-- CreateIndex
CREATE INDEX "kpi_settings_activityTypeId_period_status_idx" ON "kpi_settings"("activityTypeId", "period", "status");

-- CreateIndex
CREATE INDEX "kpi_settings_groupId_period_status_idx" ON "kpi_settings"("groupId", "period", "status");

-- CreateIndex
CREATE INDEX "kpi_settings_scopeType_status_period_idx" ON "kpi_settings"("scopeType", "status", "period");

-- CreateIndex
CREATE INDEX "operational_metrics_personnelId_period_idx" ON "operational_metrics"("personnelId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "operational_metrics_personnelId_period_metricCode_key" ON "operational_metrics"("personnelId", "period", "metricCode");

-- CreateIndex
CREATE UNIQUE INDEX "criteria_code_key" ON "criteria"("code");

-- CreateIndex
CREATE INDEX "score_records_personnelId_period_idx" ON "score_records"("personnelId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "score_records_personnelId_period_key" ON "score_records"("personnelId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "score_record_items_scoreRecordId_criterionId_key" ON "score_record_items"("scoreRecordId", "criterionId");

-- CreateIndex
CREATE INDEX "system_lookups_type_orderIndex_idx" ON "system_lookups"("type", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "system_lookups_type_value_key" ON "system_lookups"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_categories_code_key" ON "revenue_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_platforms_code_key" ON "revenue_platforms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_transactions_transactionCode_key" ON "revenue_transactions"("transactionCode");

-- CreateIndex
CREATE INDEX "revenue_transactions_personnelId_period_idx" ON "revenue_transactions"("personnelId", "period");

-- CreateIndex
CREATE INDEX "revenue_transactions_period_status_idx" ON "revenue_transactions"("period", "status");

-- CreateIndex
CREATE INDEX "revenue_deduction_items_transactionId_idx" ON "revenue_deduction_items"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "company_expenses_expenseCode_key" ON "company_expenses"("expenseCode");

-- CreateIndex
CREATE INDEX "company_expenses_period_category_idx" ON "company_expenses"("period", "category");

-- CreateIndex
CREATE INDEX "company_expenses_period_status_idx" ON "company_expenses"("period", "status");

-- CreateIndex
CREATE INDEX "company_expenses_expenseDate_idx" ON "company_expenses"("expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_requestId_key" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_createdAt_idx" ON "audit_logs"("resource", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_activities" ADD CONSTRAINT "personnel_activities_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_activities" ADD CONSTRAINT "personnel_activities_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_tasks" ADD CONSTRAINT "personnel_tasks_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_tasks" ADD CONSTRAINT "personnel_tasks_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_targetPersonnelId_fkey" FOREIGN KEY ("targetPersonnelId") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_salaryHistoryId_fkey" FOREIGN KEY ("salaryHistoryId") REFERENCES "personnel_salary_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disputes" ADD CONSTRAINT "payroll_disputes_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disputes" ADD CONSTRAINT "payroll_disputes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "payroll_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disputes" ADD CONSTRAINT "payroll_disputes_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disputes" ADD CONSTRAINT "payroll_disputes_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disputes" ADD CONSTRAINT "payroll_disputes_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_salary_history" ADD CONSTRAINT "personnel_salary_history_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel_salary_history" ADD CONSTRAINT "personnel_salary_history_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_groups" ADD CONSTRAINT "kpi_groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_group_members" ADD CONSTRAINT "kpi_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "kpi_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_group_members" ADD CONSTRAINT "kpi_group_members_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_settings" ADD CONSTRAINT "kpi_settings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "kpi_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_settings" ADD CONSTRAINT "kpi_settings_assignedPersonnelId_fkey" FOREIGN KEY ("assignedPersonnelId") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_settings" ADD CONSTRAINT "kpi_settings_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_records" ADD CONSTRAINT "score_records_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_record_items" ADD CONSTRAINT "score_record_items_scoreRecordId_fkey" FOREIGN KEY ("scoreRecordId") REFERENCES "score_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_record_items" ADD CONSTRAINT "score_record_items_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "revenue_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "revenue_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_deduction_items" ADD CONSTRAINT "revenue_deduction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "revenue_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



