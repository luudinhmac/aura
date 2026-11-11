// PostgreSQL Store - Prisma Data Access Layer for Aura Talent Management OS
import { randomUUID } from 'crypto';
import { prisma } from './prisma.ts';
import { toPrismaDateOnly } from './payrollPeriodDates.ts';
import { Prisma } from '../../prisma/client/index.js';
import {
  Idol,
  Criterion,
  IdolScoreRecord,
  IdolTask,
  UserAccount,
  ApprovalRequest,
  WorkScheduleSlot,
  WorkAssignment,
  LeaveRequest,
  PayrollPeriod,
  PayrollRecord,
  KpiGroup,
  KpiSetting,
  MacroPayrollSummary,
  AggregatedPayrollPersonnel,
  RevenueCategory,
  RevenuePlatform,
  RevenueTransaction,
  RevenueDeductionItem,
  RevenueSummary,
  ServiceUsageRecord,
  OperationalMetric,
  OperationalKpiSummary,
  OperationalKpiMetric,
  CompanyExpense,
  CompanyExpenseCategory,
  FinancePnLSummary,
  FinanceTrendPoint,
  FinanceTrendData,
  PersonnelColumn,
  PersonnelCustomFields,
  PersonnelCustomFieldValue,
  PersonnelActivityProfile,
  PayrollDispute,
  PayrollDisputeInboxItem,
  AppTabPermission
} from '../../src/types/index.ts';
import { filterPersonnelCustomFields } from '../../src/utils/personnelFieldAccess.ts';
import { generateCompanyCredentials } from '../../src/utils/credentialsUtils.ts';
import { hashPassword, isPasswordHash, verifyPassword } from '../auth/password.ts';
import { isEligibleForPayrollPeriod, calculateProratedWorkDays, calculateOvertimePay, calculateAnnualLeaveQuota, getSystemNow } from '../../src/utils/dateUtils.ts';
import { calculateLeaveAllocation, getReservedAnnualLeaveDays } from '../../src/utils/leaveAllocation.ts';
import { calculateUnpaidLeaveDeduction } from '../../src/utils/payrollLeave.ts';
import { calculateWorkAssignmentCompensation } from '../../src/utils/workAssignmentCompensation.ts';
import { calculateAssignmentPenalty, getWorkAssignmentAutoPenaltyCutoff, calculateWorkAssignmentRest } from '../../src/utils/workAssignmentPolicy.ts';
import { calculateAdjustedLiveKpiTarget } from '../../src/utils/liveKpiTarget.ts';
import { isEligibleForIdolKpi } from '../../src/utils/kpiEligibility.ts';
import { isExternalServicePersonnel } from '../../src/utils/revenueEligibility.ts';
import { resolveSalaryForPayrollPeriod } from '../../src/utils/payrollSalaryResolver.ts';
import { assertPayrollPeriodMutable } from '../../src/utils/payrollPeriodGuards.ts';
import { classifyPayrollSnapshot } from '../../src/utils/payrollSnapshotStatus.ts';
import { assertPayrollApprovalAllowed, assertPayrollLockAllowed, assertPayrollSubmitAllowed } from '../../src/utils/payrollWorkflowPermissions.ts';
import { canCancelPayrollDispute, canReviewPayrollDispute, canSubmitPayrollDispute } from '../../src/utils/payrollDisputePolicy.ts';
import { getPayrollCalendarDates, canSubmitOrApprovePayroll, canLockOrPayPayroll } from '../../src/utils/payrollCalendar.ts';
import { calculatePayrollDeductions, recalculatePayrollRecordFinancials } from '../../src/utils/payrollDeductions.ts';
import { isTaskCategoryAllowedForActivity, isTaskCategoryAllowedForIdol } from '../../src/utils/taskTaxonomy.ts';

type DbClient = Prisma.TransactionClient | typeof prisma;

const BUSINESS_ADMIN_TABS = ['roster', 'schedule', 'tasks', 'analytics', 'payroll', 'kpi', 'revenue', 'finance'];
const BUSINESS_ADMIN_ACTIONS = [
  'manage_idols',
  'manage_schedule',
  'manage_tasks',
  'manage_work_assignments',
  'manage_approvals',
  'manage_payroll',
  'approve_payroll',
  'adjust_payroll',
  'hot_bonus',
  'manage_kpi',
  'manage_revenue',
  'manage_settings'
];

const SYSTEM_ADMIN_TABS = [
  'roster', 'scoring', 'leaderboard', 'schedule', 'tasks', 'analytics',
  'admin', 'my_dashboard', 'payroll', 'payroll_disputes', 'kpi', 'revenue', 'finance'
];
const SYSTEM_ADMIN_ACTIONS = [
  'manage_idols', 'manage_scores', 'manage_criteria', 'manage_schedule', 'manage_tasks',
  'manage_work_assignments',
  'manage_departments', 'manage_settings', 'manage_approvals', 'manage_payroll',
  'adjust_payroll', 'approve_payroll', 'hot_bonus', 'manage_kpi', 'manage_revenue'
];

// A system-admin account may also be a normal business personnel profile.
// Account authority and business participation are separate concerns.
const businessPersonnelRelation: any = {};

async function assertBusinessPersonnel(personnelId: number, db: DbClient = prisma): Promise<void> {
  if (!Number.isInteger(personnelId) || personnelId <= 0) {
    throw new Error('Nhân sự không hợp lệ');
  }
  const personnel = await db.personnel.findUnique({
    where: { id: personnelId },
    select: { id: true }
  });
  if (!personnel) throw new Error('Không tìm thấy hồ sơ nhân sự');
}

// Helper: chuyển Decimal sang Number an toàn
function num(val: Prisma.Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === 'number' ? val : val.toNumber();
}

function parseDateOrNull(val: string | null | undefined): Date | null {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().split('T')[0];
}

function mapPayrollDispute(row: any): PayrollDispute {
  return {
    id: row.id,
    periodId: row.periodId,
    recordId: row.recordId,
    personnelId: String(row.personnelId),
    category: row.category,
    systemValue: (row.systemValue as Record<string, unknown>) || {},
    requestedValue: (row.requestedValue as Record<string, unknown>) || {},
    reason: row.reason,
    evidenceUrl: row.evidenceUrl || undefined,
    status: row.status,
    submittedById: row.submittedById ? String(row.submittedById) : undefined,
    submittedByName: row.submittedBy?.username || undefined,
    reviewedById: row.reviewedById ? String(row.reviewedById) : undefined,
    reviewedByName: row.reviewedBy?.username || undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
    resolutionNote: row.resolutionNote || undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapPayrollDisputeInboxItem(row: any): PayrollDisputeInboxItem {
  const earnings = (row.record?.earningsDetail as Record<string, unknown> | null) || {};
  const deductions = (row.record?.deductionsDetail as Record<string, unknown> | null) || {};
  return {
    ...mapPayrollDispute(row),
    period: row.period?.period || row.periodId.replace(/^payroll-/, ''),
    payrollStatus: row.period?.status || 'draft',
    employeeName: row.record?.employeeName || row.personnel?.realName || 'Nhân sự',
    stageName: row.record?.stageName || row.personnel?.stageName || undefined,
    department: row.record?.department || row.personnel?.department || '',
    currentValue: row.record ? {
      baseSalary: num(row.record.baseSalary),
      totalGross: num(row.record.totalGross),
      totalDeductions: num(row.record.totalDeductions),
      netSalary: num(row.record.netSalary),
      actualWorkDays: earnings.actualWorkDays ?? null,
      kpiBonus: num(row.record.kpiBonus),
      tax: num((deductions as any).tax),
      insurance: num((deductions as any).insurance)
    } : undefined
  };
}

function payrollCalendarForPeriod(period: string, row?: any): {
  feedbackStartsAt: string;
  approvalStartsAt: string;
  lockStartsAt: string;
} {
  const defaults = getPayrollCalendarDates(period);
  return {
    feedbackStartsAt: (row?.feedbackStartsAt ? toIsoDate(row.feedbackStartsAt) : undefined) || defaults.feedbackStartsAt,
    approvalStartsAt: (row?.approvalStartsAt ? toIsoDate(row.approvalStartsAt) : undefined) || defaults.approvalStartsAt,
    lockStartsAt: (row?.lockStartsAt ? toIsoDate(row.lockStartsAt) : undefined) || defaults.lockStartsAt
  };
}

function normalizeCustomFields(value: unknown): PersonnelCustomFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const normalized: PersonnelCustomFields = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (
      fieldValue === null ||
      typeof fieldValue === 'string' ||
      typeof fieldValue === 'number' ||
      typeof fieldValue === 'boolean'
    ) {
      normalized[key] = fieldValue as PersonnelCustomFieldValue;
    }
  }
  return normalized;
}

function canManagePayroll(viewer?: UserAccount): boolean {
  return viewer?.accountType === 'system_admin' || viewer?.isBusinessAdmin === true || (viewer?.allowedActions as any)?.includes('manage_payroll');
}

async function syncUserRoleAssignments(userId: number, roleCodes: unknown, assignedById?: number): Promise<void> {
  if (!Array.isArray(roleCodes)) return;
  const codes = [...new Set(roleCodes.filter((code): code is string => typeof code === 'string' && code.trim().length > 0))];
  const roles = await prisma.role.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  if (roles.length !== codes.length) {
    const found = new Set(roles.map((role) => role.code));
    throw new Error(`Role không tồn tại: ${codes.filter((code) => !found.has(code)).join(', ')}`);
  }
  await prisma.userRole.deleteMany({ where: { userId } });
  if (roles.length > 0) {
    await prisma.userRole.createMany({
      data: roles.map((role) => ({ userId, roleId: role.id, assignedById: assignedById || null }))
    });
  }
}

function parseStrictDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Ngày hiệu lực phải có định dạng YYYY-MM-DD');
  }
  const parsed = parseDateOrNull(value);
  if (!parsed || parsed.toISOString().slice(0, 10) !== value) throw new Error('Ngày hiệu lực không hợp lệ');
  return parsed;
}

function dateBefore(value: Date): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

function mapWorkAssignment(row: any): WorkAssignment {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    assignmentType: row.assignmentType,
    mandatory: row.mandatory === true,
    penaltyType: row.penaltyType || 'none',
    penaltyValue: row.penaltyValue == null ? undefined : num(row.penaltyValue),
    startAt: row.startAt?.toISOString(),
    endAt: row.endAt?.toISOString(),
    acceptanceDeadline: row.acceptanceDeadline?.toISOString(),
    cancellationReason: row.cancellationReason || undefined,
    cancelledAt: row.cancelledAt?.toISOString(),
    cancelledById: row.cancelledById == null ? undefined : String(row.cancelledById),
    location: row.location || undefined,
    restDayDate: toIsoDate(row.restDayDate),
    restDayPortion: row.restDayPortion || 'none',
    status: row.status,
    createdById: String(row.createdById),
    createdByName: row.createdBy?.name || row.createdBy?.username || undefined,
    assignees: (row.assignees || []).map((assignee: any) => ({
      id: assignee.id,
      assignmentId: assignee.assignmentId,
      personnelId: String(assignee.personnelId),
      personnelName: assignee.personnel?.realName || 'Nhân sự',
      stageName: assignee.personnel?.stageName || undefined,
      department: assignee.personnel?.department || '',
      contractSalary: assignee.personnel?.baseSalary == null ? undefined : num(assignee.personnel.baseSalary),
      responseStatus: assignee.responseStatus,
      responseNote: assignee.responseNote || undefined,
      respondedAt: assignee.respondedAt?.toISOString(),
      completedAt: assignee.completedAt?.toISOString(),
      completedNote: assignee.completedNote || undefined,
      violationStatus: assignee.violationStatus || 'none'
      ,penaltyAmount: assignee.penaltyAmount == null ? undefined : num(assignee.penaltyAmount)
      ,violationNote: assignee.violationNote || undefined
      ,reviewedAt: assignee.reviewedAt?.toISOString()
      ,waiverRequestStatus: assignee.waiverRequestStatus || 'none'
      ,waiverRequestReason: assignee.waiverRequestReason || undefined
      ,waiverRequestedAt: assignee.waiverRequestedAt?.toISOString()
      ,waiverDecision: assignee.waiverDecision || undefined
      ,penaltyRate: assignee.penaltyRate == null ? undefined : num(assignee.penaltyRate)
      ,waiverReviewedAt: assignee.waiverReviewedAt?.toISOString()
      ,waiverReviewedById: assignee.waiverReviewedById == null ? undefined : String(assignee.waiverReviewedById)
      ,waiverReviewNote: assignee.waiverReviewNote || undefined
      ,restDayDate: toIsoDate(assignee.restDayDate)
      ,restDayPortion: assignee.restDayPortion || 'none'
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapPersonnelColumn(column: any): PersonnelColumn {
  return {
    id: column.id,
    key: column.key,
    label: column.label,
    type: column.type,
    options: Array.isArray(column.options)
      ? column.options.filter((option: unknown): option is string => typeof option === 'string')
      : undefined,
    required: column.required,
    isVisible: column.isVisible,
    isActive: column.isActive,
    sortOrder: column.sortOrder,
    showInRoster: column.showInRoster,
    showInProfile: column.showInProfile,
    sensitivity: column.sensitivity || 'public',
    isSystem: column.isSystem
  };
}

function mapPersonnelActivities(activities: any[] | undefined): PersonnelActivityProfile[] {
  return (activities || [])
    .slice()
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.activityType?.displayOrder || 0) - (b.activityType?.displayOrder || 0))
    .map((activity) => ({
      id: activity.id,
      activityTypeId: String(activity.activityTypeId),
      code: activity.activityType?.code || '',
      name: activity.activityType?.name || '',
      isPrimary: activity.isPrimary,
      metadata: activity.metadata && typeof activity.metadata === 'object' ? activity.metadata : undefined
    }));
}

function activityInclude() {
  return { activityType: true } as const;
}

async function resolveKpiActivityTypeId(payload: any, groupId: number | null, assignedPersonnelId: number | null): Promise<number | null> {
  const requestedCode = typeof payload.activityCode === 'string' ? payload.activityCode.trim() : '';
  const hasRequestedId = payload.activityTypeId !== undefined && payload.activityTypeId !== null && payload.activityTypeId !== '';
  const requestedId = hasRequestedId ? Number(payload.activityTypeId) : null;
  if (!requestedCode && (!hasRequestedId || !Number.isInteger(requestedId))) return null;

  const personnelIds = assignedPersonnelId
    ? [assignedPersonnelId]
    : groupId
      ? (await prisma.kpiGroupMember.findMany({ where: { groupId }, select: { personnelId: true } })).map(m => m.personnelId)
      : [];
  if (personnelIds.length === 0) throw new Error('KPI theo hoạt động cần gắn cá nhân hoặc nhóm');

  const activities = await prisma.personnelActivity.findMany({
    where: {
      personnelId: { in: personnelIds },
      ...(requestedCode ? { activityType: { code: requestedCode, isActive: true } } : { activityTypeId: requestedId as number })
    },
    include: { activityType: true },
    take: 1
  });
  if (!activities[0] || !activities[0].activityType.isActive) {
    throw new Error('Hoạt động KPI không thuộc cá nhân/nhóm được gán hoặc đã ngừng sử dụng');
  }
  return activities[0].activityTypeId;
}

async function validateKpiSetting(payload: any, excludeId?: number): Promise<number | null> {
  const scopeType = payload.scopeType || 'group';
  const groupId = payload.groupId ? Number(payload.groupId) : null;
  const assignedPersonnelId = payload.assignedIdolId ? Number(payload.assignedIdolId) : null;
  const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : '';
  const weight = Number(payload.weight ?? 100);
  const targetValue = Number(payload.targetValue ?? 0);

  if (!code) throw new Error('Mã KPI không được để trống');
  if (scopeType === 'group' && (!groupId || !Number.isInteger(groupId))) throw new Error('KPI theo nhóm cần chọn nhóm áp dụng');
  if (scopeType === 'individual' && (!assignedPersonnelId || !Number.isInteger(assignedPersonnelId))) throw new Error('KPI cá nhân cần chọn nhân sự áp dụng');
  if (scopeType !== 'group' && scopeType !== 'individual') throw new Error('Phạm vi KPI không hợp lệ');
  if (targetValue < 0) throw new Error('Mục tiêu KPI không được âm');
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error('Trọng số KPI phải lớn hơn 0 và không vượt quá 100%');

  const activityTypeId = await resolveKpiActivityTypeId(payload, groupId, assignedPersonnelId);
  if (payload.status !== 'inactive') {
    const duplicate = await prisma.kpiSetting.findFirst({
      where: {
        code,
        scopeType,
        groupId,
        assignedPersonnelId,
        activityTypeId,
        period: payload.period || 'monthly',
        status: 'active',
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });
    if (duplicate) throw new Error('Đã tồn tại KPI cùng mã, phạm vi, hoạt động và kỳ áp dụng');
  }
  return activityTypeId;
}

async function resolvePersonnelActivityTypeId(personnelId: number, payload: any): Promise<number | null> {
  const requestedCode = typeof payload.activityCode === 'string' ? payload.activityCode.trim() : '';
  const hasRequestedId = payload.activityTypeId !== undefined && payload.activityTypeId !== null && payload.activityTypeId !== '';
  const requestedId = hasRequestedId ? Number(payload.activityTypeId) : null;
  if (!requestedCode && (!hasRequestedId || !Number.isInteger(requestedId))) return null;

  const activities = await prisma.personnelActivity.findMany({
    where: {
      personnelId,
      ...(requestedCode ? { activityType: { code: requestedCode, isActive: true } } : { activityTypeId: requestedId as number }),
    },
    include: { activityType: true },
    take: 1
  });
  if (!activities[0] || !activities[0].activityType.isActive) {
    throw new Error('Hoạt động không thuộc hồ sơ nhân sự hoặc đã ngừng sử dụng');
  }
  return activities[0].activityTypeId;
}

async function validateTaskTaxonomy(personnelId: number, category: any, activityCode?: string): Promise<void> {
  const personnel = await prisma.personnel.findUnique({ where: { id: personnelId }, select: { idolCategory: true } });
  if (!personnel) throw new Error('Không tìm thấy Idol để kiểm tra loại nhiệm vụ');
  if (personnel.idolCategory && !isTaskCategoryAllowedForIdol(personnel.idolCategory as any, category)) {
    throw new Error('Loại nhiệm vụ không phù hợp với nhóm công việc của Idol');
  }
  if (activityCode && !isTaskCategoryAllowedForActivity(category, activityCode)) {
    throw new Error('Hoạt động KPI không phù hợp với loại nhiệm vụ đã chọn');
  }
}

async function replacePersonnelActivities(personnelId: number, payload: any, db: DbClient = prisma): Promise<void> {
  const rawCodes: unknown[] = Array.isArray(payload.activityCodes) ? payload.activityCodes : [];
  const codes: string[] = [...new Set(rawCodes.filter((code: unknown): code is string => typeof code === 'string' && code.trim() !== '').map((code: string) => code.trim()))];
  const primaryCode = typeof payload.primaryActivityCode === 'string' ? payload.primaryActivityCode.trim() : codes[0];
  const personnel = await db.personnel.findUnique({ where: { id: personnelId }, select: { isIdol: true, personnelType: true, department: true } });
  const eligible = personnel ? isEligibleForIdolKpi({ ...personnel, hasActiveActivity: true }) : false;
  if (!eligible || codes.length === 0) {
    await db.personnelActivity.deleteMany({ where: { personnelId } });
    return;
  }
  if (!primaryCode || !codes.includes(primaryCode)) throw new Error('Hoạt động chính phải nằm trong danh sách hoạt động đã chọn');
  const types = await db.personnelActivityType.findMany({ where: { code: { in: codes }, isActive: true } });
  if (types.length !== codes.length) throw new Error('Danh sách hoạt động không hợp lệ hoặc đã ngừng sử dụng');
  await db.personnelActivity.deleteMany({ where: { personnelId } });
  await db.personnelActivity.createMany({ data: types.map((type) => ({ personnelId, activityTypeId: type.id, isPrimary: type.code === primaryCode })) });
}

function personnelColumnError(message: string, status = 400): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function resolveInitialPassword(value: unknown): string {
  const password = typeof value === 'string' ? value.trim() : '';
  if (!password && process.env.NODE_ENV === 'production') {
    throw new Error('Mật khẩu khởi tạo là bắt buộc trong production');
  }
  return password || '123';
}

export async function getEffectiveSystemDate(db: DbClient = prisma): Promise<Date> {
  let s: any;
  try {
    s = await db.appSetting.findFirst();
  } catch (error) {
    if (!isMissingReferenceClockColumn(error)) throw error;
    s = await db.appSetting.findFirst({ select: { referenceDate: true, referenceTime: true } });
  }
  if (s?.referenceDate && s.referenceDate.trim() !== '') {
    return getSystemNow(s.referenceDate, s.referenceTime || undefined, s.referenceClockAnchorAt?.toISOString());
  }
  return new Date();
}

function isMissingReferenceClockColumn(error: unknown): boolean {
  const candidate = error as { code?: string; meta?: { column?: string }; message?: string };
  return candidate?.code === 'P2022'
    && (candidate.meta?.column?.includes('referenceClockAnchorAt') === true || candidate.message?.includes('referenceClockAnchorAt') === true);
}

// Mapper: Personnel (DB) ➔ Idol (Frontend format)
function mapPersonnelToIdol(p: any): Idol {
  return {
    id: String(p.id),
    stt: p.stt ?? undefined,
    stageName: p.stageName || p.realName,
    realName: p.realName,
    dob: toIsoDate(p.dob) || '2000-01-01',
    joinDate: toIsoDate(p.joinDate),
    resignedDate: toIsoDate(p.resignedDate),
    role: p.role,
    weight: num(p.weight),
    height: num(p.height),
    hometown: p.hometown || '',
    currentLiving: p.currentLiving || '',
    department: p.department,
    personnelType: p.personnelType,
    status: p.status,
    avatarUrl: p.avatarUrl || '',
    bio: p.bio || '',
    // The linked account email is authoritative for internal personnel.
    // Older demo profiles may still contain a stale socialLinks.email value
    // (for example admin@auratalent.vn after account migration).
    socialLinks: {
      ...((p.socialLinks as any) || {}),
      ...(p.user?.email ? { email: p.user.email } : {})
    },
    userId: p.userId ? String(p.userId) : undefined,
    accountUsername: p.user?.username || undefined,
    isIdol: p.isIdol,
    cooperationType: p.cooperationType || 'internal',
    serviceNotes: p.serviceNotes || undefined,
    assignedRole: p.assignedRole || undefined,
    phone: p.phone || undefined,
    citizenId: p.citizenId || undefined,
    bankName: p.bankName || undefined,
    bankAccountNumber: p.bankAccountNumber || undefined,
    bankAccountName: p.bankAccountName || undefined,
    baseSalary: num(p.baseSalary),
    idolCategory: p.idolCategory || undefined,
    commercialDetails: (p.commercialDetails as any) || undefined,
    customFields: normalizeCustomFields(p.customFields),
    createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString()
  };
}

function mapRevenueTransaction(tx: any): RevenueTransaction {
  return {
    id: tx.id,
    transactionCode: tx.transactionCode,
    personnelId: tx.personnelId,
    personnelName: tx.personnel?.realName,
    stageName: tx.personnel?.stageName || tx.personnel?.realName,
    department: tx.personnel?.department,
    avatarUrl: tx.personnel?.avatarUrl || '',
    period: tx.period,
    transactionDate: tx.transactionDate instanceof Date ? tx.transactionDate.toISOString().split('T')[0] : String(tx.transactionDate),
    categoryId: tx.categoryId,
    categoryCode: tx.category?.code,
    categoryName: tx.category?.name,
    platformId: tx.platformId,
    platformCode: tx.platform?.code,
    platformName: tx.platform?.name,
    title: tx.title,
    contractRef: tx.contractRef || undefined,
    payoutMode: tx.payoutMode as any,
    grossAmount: num(tx.grossAmount),
    totalDeductions: num(tx.totalDeductions),
    netAmount: num(tx.netAmount),
    idolShareRate: num(tx.idolShareRate),
    fixedPayoutAmount: num(tx.fixedPayoutAmount),
    idolPayoutAmount: num(tx.idolPayoutAmount),
    companyProfitAmount: num(tx.companyProfitAmount),
    rateOverrideReason: tx.rateOverrideReason || undefined,
    status: tx.status as any,
    proofUrl: tx.proofUrl || undefined,
    notes: tx.notes || undefined,
    createdById: tx.createdById ?? undefined,
    approvedById: tx.approvedById ?? undefined,
    syncedAt: tx.syncedAt?.toISOString(),
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    deductions: (tx.deductions || []).map((d: any) => ({
      id: d.id,
      transactionId: d.transactionId,
      name: d.name,
      deductionType: d.deductionType,
      amount: num(d.amount),
      proofUrl: d.proofUrl || undefined
    }))
  };
}

function mapServiceUsageRecord(row: any, effectiveNow?: Date): ServiceUsageRecord {
  const status = row.status === 'cancelled' ? 'cancelled' : deriveServiceUsageStatus(row, effectiveNow);
  const assigneeRows = row.assignees?.length
    ? row.assignees
    : row.assignedUser
      ? [{ userId: row.assignedUserId, user: row.assignedUser }]
      : [];
  const assignedUserIds = assigneeRows.map((item: any) => Number(item.userId)).filter((id: number) => Number.isInteger(id));
  const assignedUserNames = assigneeRows.map((item: any) => item.user?.name || item.user?.username).filter(Boolean);
  return {
    id: row.id,
    usageCode: row.usageCode,
    personnelId: row.personnelId,
    personnelName: row.personnel?.realName || undefined,
    stageName: row.personnel?.stageName || undefined,
    serviceName: row.serviceName,
    description: row.description || undefined,
    usageDate: toIsoDate(row.usageDate) || '',
    startAt: row.startAt?.toISOString(),
    endAt: row.endAt?.toISOString(),
    quantity: num(row.quantity),
    unit: row.unit,
    location: row.location || undefined,
    grossAmount: num(row.grossAmount),
    discountAmount: num(row.discountAmount),
    netAmount: num(row.netAmount),
    status,
    assignedUserId: assignedUserIds[0] || undefined,
    assignedUserName: assignedUserNames[0] || undefined,
    assignedUserIds,
    assignedUserNames,
    paymentStatus: row.paymentStatus || 'unpaid',
    paidAmount: num(row.paidAmount),
    outstandingAmount: num(row.outstandingAmount ?? Math.max(0, num(row.netAmount) - num(row.paidAmount))),
    completionProgress: num(row.completionProgress),
    contractRef: row.contractRef || undefined,
    invoiceRef: row.invoiceRef || undefined,
    revenueTransactionId: row.revenueTransactionId || undefined,
    notes: row.notes || undefined,
    createdById: row.createdById || undefined,
    paidAt: row.paidAt?.toISOString(),
    paymentNote: row.paymentNote || undefined,
    cancelledAt: row.cancelledAt?.toISOString(),
    cancellationReason: row.cancellationReason || undefined,
    payments: (row.payments || []).map((payment: any) => ({ id: payment.id, serviceUsageId: payment.serviceUsageId, amount: num(payment.amount), paidAt: payment.paidAt.toISOString(), paidById: payment.paidById || undefined, paidByName: payment.paidBy?.name || payment.paidBy?.username || undefined, reference: payment.reference || undefined, note: payment.note || undefined })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function deriveServiceUsageStatus(row: { status?: string; usageDate: Date | string; startAt?: Date | string | null; endAt?: Date | string | null }, now = new Date()): ServiceUsageRecord['status'] {
  if (row.status === 'cancelled') return 'cancelled';
  const start = row.startAt ? new Date(row.startAt) : new Date(row.usageDate);
  const end = row.endAt ? new Date(row.endAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  if (now < start) return 'planned';
  if (now <= end) return 'in_progress';
  return 'completed';
}

// Mapper: UserAccount (DB) ➔ UserAccount (Frontend format)
function mapDbUser(u: any): UserAccount {
  const unique = (values: string[]) => [...new Set(values)];
  const assignedRoleCodes = Array.isArray(u.roleAssignments)
    ? u.roleAssignments.map((assignment: any) => assignment.role?.code).filter((code: unknown): code is string => typeof code === 'string')
    : [];
  // `accountType=system_admin` is the authoritative root capability. Keep the
  // role list consistent with that capability so account and role views agree.
  const roleCodes = unique([
    ...(u.accountType === 'system_admin' ? ['system_admin'] : []),
    ...assignedRoleCodes
  ]);
  const hasSystemAdminRole = u.accountType === 'system_admin' || roleCodes.includes('system_admin');
  const rolePermissions = Array.isArray(u.roleAssignments)
    ? u.roleAssignments.reduce((result: { tabs: string[]; actions: string[]; departments: string[] }, assignment: any) => {
        const role = assignment.role;
        if (!role) return result;
        result.tabs.push(...(Array.isArray(role.defaultTabs) ? role.defaultTabs : []));
        result.actions.push(...(Array.isArray(role.defaultActions) ? role.defaultActions : []));
        result.departments.push(...(Array.isArray(role.defaultDepartments) ? role.defaultDepartments : []));
        return result;
      }, { tabs: [], actions: [], departments: [] })
    : { tabs: [], actions: [], departments: [] };
  return {
    id: String(u.id),
    username: u.username,
    email: u.email,
    name: u.personnelProfile
      ? (u.personnelProfile.realName && u.personnelProfile.stageName && u.personnelProfile.realName !== u.personnelProfile.stageName
          ? `${u.personnelProfile.realName} (${u.personnelProfile.stageName})`
          : (u.personnelProfile.realName || u.personnelProfile.stageName))
      : u.username,
    role: u.role,
    roleTitle: u.roleTitle,
    accountType: hasSystemAdminRole ? 'system_admin' : 'personnel',
    // `accountType=system_admin` is the database-level root invariant. Keep
    // the frontend flag derived from it so a stale boolean cannot hide root
    // administration after a permissions edit or migration.
    isSuperAdmin: hasSystemAdminRole,
    isBusinessAdmin: hasSystemAdminRole ? false : u.isBusinessAdmin === true,
    isIdol: u.personnelProfile?.isIdol === true,
    roleCodes,
    allowedTabs: (hasSystemAdminRole
      ? SYSTEM_ADMIN_TABS
      : unique([
          ...(rolePermissions.tabs.length ? rolePermissions.tabs : ((u.allowedTabs as any) || [])),
          ...(u.personnelProfile ? ['my_dashboard'] : [])
        ])) as AppTabPermission[],
    allowedDepartments: hasSystemAdminRole ? ['*'] : (rolePermissions.departments.length ? unique(rolePermissions.departments) : ((u.allowedDepartments as any) || [])),
    allowedActions: hasSystemAdminRole ? SYSTEM_ADMIN_ACTIONS : (rolePermissions.actions.length ? unique(rolePermissions.actions) : ((u.allowedActions as any) || [])),
    avatarUrl: u.avatarUrl || u.personnelProfile?.avatarUrl || '',
    department: u.personnelProfile?.department || undefined,
    personnelType: u.personnelProfile?.personnelType || undefined,
    status: u.status,
    phone: u.personnelProfile?.phone || undefined,
    address: u.personnelProfile?.currentLiving || undefined,
    currentLiving: u.personnelProfile?.currentLiving || undefined,
    stageName: u.personnelProfile?.stageName || undefined,
    realName: u.personnelProfile?.realName || undefined,
    dob: u.personnelProfile ? toIsoDate(u.personnelProfile.dob) : undefined,
    hometown: u.personnelProfile?.hometown || undefined,
    height: u.personnelProfile ? num(u.personnelProfile.height) : undefined,
    weight: u.personnelProfile ? num(u.personnelProfile.weight) : undefined,
    citizenId: u.personnelProfile?.citizenId || undefined,
    bankName: u.personnelProfile?.bankName || undefined,
    bankAccountNumber: u.personnelProfile?.bankAccountNumber || undefined,
    bankAccountName: u.personnelProfile?.bankAccountName || undefined,
    baseSalary: u.personnelProfile ? num(u.personnelProfile.baseSalary) : undefined,
    joinDate: u.personnelProfile ? toIsoDate(u.personnelProfile.joinDate) : undefined,
    idolId: u.personnelProfile ? String(u.personnelProfile.id) : undefined
  };
}

export const pgStore = {
  async createAuditLog(data: {
    requestId: string;
    actorUserId?: number;
    method: string;
    path: string;
    action: string;
    resource: string;
    resourceId?: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const createData: Prisma.AuditLogUncheckedCreateInput = {
      requestId: data.requestId,
      actorUserId: data.actorUserId,
      method: data.method,
      path: data.path,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      statusCode: data.statusCode,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    };
    await prisma.auditLog.create({ data: createData });
  },

  async getAuditLogs(options: {
    page?: number;
    limit?: number;
    search?: string;
    method?: string;
    resource?: string;
    statusCode?: number;
    category?: 'all' | 'data' | 'auth';
    statusGroup?: 'all' | '2xx' | '4xx_5xx';
    fromDate?: string;
    toDate?: string;
  } = {}): Promise<{
    items: Array<{
      id: string;
      requestId: string;
      actorUserId?: string;
      actorUsername?: string;
      actorName?: string;
      actorRole?: string;
      method: string;
      path: string;
      action: string;
      resource: string;
      resourceId?: string;
      statusCode: number;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Math.floor(Number(options.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(options.limit) || 25)));
    const search = options.search?.trim();
    const method = options.method?.trim().toUpperCase();
    const resource = options.resource?.trim();
    const statusCode = Number.isInteger(options.statusCode) ? options.statusCode : undefined;
    const category = options.category || 'all';
    const statusGroup = options.statusGroup || 'all';
    const fromDate = options.fromDate?.trim();
    const toDate = options.toDate?.trim();

    const where: Prisma.AuditLogWhereInput = {};
    if (method && method !== 'ALL') {
      where.method = method;
    }
    if (resource && resource !== 'all') {
      where.resource = resource;
    } else if (category === 'auth') {
      where.resource = 'auth';
    } else if (category === 'data') {
      where.resource = { not: 'auth' };
    }

    if (statusCode && statusCode > 0) {
      where.statusCode = statusCode;
    } else if (statusGroup === '2xx') {
      where.statusCode = { gte: 200, lt: 300 };
    } else if (statusGroup === '4xx_5xx') {
      where.statusCode = { gte: 400 };
    }

    if ((fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) || (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate))) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
        createdAtFilter.gte = new Date(`${fromDate}T00:00:00+07:00`);
      }
      if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
        createdAtFilter.lte = new Date(`${toDate}T23:59:59.999+07:00`);
      }
      where.createdAt = createdAtFilter;
    }
    if (search) {
      where.OR = [
        { requestId: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        {
          actorUser: {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { roleTitle: { contains: search, mode: 'insensitive' } },
              {
                personnelProfile: {
                  OR: [
                    { realName: { contains: search, mode: 'insensitive' } },
                    { stageName: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actorUser: {
            select: {
              id: true,
              username: true,
              role: true,
              roleTitle: true,
              personnelProfile: {
                select: {
                  realName: true,
                  stageName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => {
        const profile = row.actorUser?.personnelProfile;
        const actorName = profile
          ? (profile.realName && profile.stageName && profile.realName !== profile.stageName
              ? `${profile.realName} (${profile.stageName})`
              : (profile.realName || profile.stageName || undefined))
          : (row.actorUser?.roleTitle || row.actorUser?.username || undefined);

        return {
          id: row.id,
          requestId: row.requestId,
          actorUserId: row.actorUserId !== null && row.actorUserId !== undefined ? String(row.actorUserId) : undefined,
          actorUsername: row.actorUser?.username || undefined,
          actorName,
          actorRole: row.actorUser?.role || undefined,
          method: row.method,
          path: row.path,
          action: row.action,
          resource: row.resource,
          resourceId: row.resourceId || undefined,
          statusCode: row.statusCode,
          metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },
  // ==========================================
  // 1. PERSONNEL / IDOLS
  // ==========================================
  async getIdols(viewer?: UserAccount): Promise<Idol[]> {
    const list = await prisma.personnel.findMany({
      where: businessPersonnelRelation,
      include: { user: true, activities: { include: activityInclude() } },
      orderBy: [{ stt: 'asc' }, { id: 'asc' }]
    });
    const columns = await this.getPersonnelColumns();
    return list.map((personnel) => {
      const activities = mapPersonnelActivities(personnel.activities);
      return {
        ...mapPersonnelToIdol(personnel),
        activities,
        activityCodes: activities.map((activity) => activity.code),
        primaryActivityCode: activities.find((activity) => activity.isPrimary)?.code,
        customFields: filterPersonnelCustomFields(normalizeCustomFields(personnel.customFields), columns, viewer)
      };
    });
  },

  async getIdolById(idStr: string, viewer?: UserAccount, db: DbClient = prisma): Promise<Idol | null> {
    const id = Number(idStr);
    if (isNaN(id)) return null;
    const p = await db.personnel.findUnique({
      where: { id },
      include: { user: true, activities: { include: activityInclude() } }
    });
    if (!p) return null;
    const columns = await this.getPersonnelColumns();
    const activities = mapPersonnelActivities(p.activities);
    return {
      ...mapPersonnelToIdol(p),
      activities,
      activityCodes: activities.map((activity) => activity.code),
      primaryActivityCode: activities.find((activity) => activity.isPrimary)?.code,
      customFields: filterPersonnelCustomFields(normalizeCustomFields(p.customFields), columns, viewer)
    };
  },

  async createIdol(payload: any, viewer?: UserAccount, db: DbClient = prisma): Promise<Idol> {
    if (db === prisma) return prisma.$transaction((tx) => this.createIdol(payload, viewer, tx));
    const nextStt = payload.stt || (await db.personnel.count()) + 1;
    const isServiceGuest = payload.personnelType === 'Dịch vụ ngoài';

    let matchedUserId: number | null = null;
    let username = payload.accountUsername;
    const email = payload.socialLinks?.email;

    if (!isServiceGuest) {
      if (!username && (payload.realName || payload.stageName)) {
        const creds = generateCompanyCredentials(payload.realName || payload.stageName);
        username = creds.username;
      }

      if (username) {
        // Tìm hoặc tạo tài khoản UserAccount
        let user: any = await db.userAccount.findUnique({
          where: { username },
          include: { personnelProfile: { select: { id: true, stageName: true, realName: true } } }
        });
        if (!user && email) {
          user = await db.userAccount.findUnique({
            where: { email },
            include: { personnelProfile: { select: { id: true, stageName: true, realName: true } } }
          });
        }

        if (!user) {
          user = await db.userAccount.create({
            data: {
              username: username,
              email: email || `${username}@auratalent.vn`,
              password: await hashPassword(resolveInitialPassword(payload.accountPassword)),
              role: payload.assignedRole || (payload.isIdol !== false ? 'idol_exclusive' : 'viewer'),
              roleTitle: payload.isIdol !== false ? (payload.role ? `Idol (${payload.role})` : 'Idol / Nghệ Sĩ') : 'Nhân Viên Khối Vận Hành',
              allowedTabs: payload.isIdol !== false ? ['my_dashboard', 'schedule', 'tasks', 'leaderboard'] : ['tasks', 'schedule'],
              allowedDepartments: payload.department ? [payload.department] : ['*'],
              allowedActions: [],
              avatarUrl: payload.avatarUrl || null,
              status: 'Đang hoạt động',
              isSuperAdmin: false
            }
          });
        } else if (user.personnelProfile) {
          const linkedName = user.personnelProfile.stageName || user.personnelProfile.realName || username;
          throw new Error(`Tài khoản ${username} đã được gắn với hồ sơ nhân sự "${linkedName}"; vui lòng chọn username hoặc email khác`);
        }
        matchedUserId = user.id;
      }
    }

    const effDate = await getEffectiveSystemDate(db);
    const columns = await this.getPersonnelColumns();
    const created = await db.personnel.create({
      data: {
        userId: matchedUserId,
        stt: nextStt,
        stageName: payload.stageName || null,
        realName: payload.realName || payload.stageName || 'Chưa đặt tên',
        dob: parseDateOrNull(payload.dob),
        joinDate: parseDateOrNull(payload.joinDate) || effDate,
        resignedDate: parseDateOrNull(payload.resignedDate),
        role: payload.role || 'Idol',
        weight: new Prisma.Decimal(payload.weight || 0),
        height: new Prisma.Decimal(payload.height || 0),
        hometown: payload.hometown || null,
        currentLiving: payload.currentLiving || null,
        department: payload.department || 'Nhóm Idol Biểu Diễn & Donate (PK)',
        personnelType: payload.personnelType || 'Công ty',
        status: payload.status || 'Đang hoạt động',
        avatarUrl: payload.avatarUrl || null,
        bio: payload.bio || null,
        socialLinks: payload.socialLinks || {},
        isIdol: payload.isIdol !== false,
        cooperationType: isServiceGuest ? 'service_guest' : (payload.cooperationType || 'internal'),
        serviceNotes: payload.serviceNotes || null,
        assignedRole: payload.assignedRole || null,
        phone: payload.phone || null,
        citizenId: payload.citizenId || null,
        bankName: payload.bankName || null,
        bankAccountNumber: payload.bankAccountNumber || null,
        bankAccountName: payload.bankAccountName || null,
        baseSalary: new Prisma.Decimal(payload.baseSalary || 0),
        idolCategory: payload.idolCategory || null,
        commercialDetails: payload.commercialDetails || null,
        ...(payload.customFields !== undefined
          ? { customFields: filterPersonnelCustomFields(normalizeCustomFields(payload.customFields), columns, viewer) }
          : {})
      },
      include: { user: true, activities: { include: activityInclude() } }
    });

    await replacePersonnelActivities(created.id, payload, db);
    const createdWithActivities = await db.personnel.findUnique({ where: { id: created.id }, include: { user: true, activities: { include: activityInclude() } } });
    const activities = mapPersonnelActivities(createdWithActivities?.activities);
    return { ...mapPersonnelToIdol(createdWithActivities || created), activities, activityCodes: activities.map((activity) => activity.code), primaryActivityCode: activities.find((activity) => activity.isPrimary)?.code };
  },

  async updateIdol(idStr: string, updates: any, viewer?: UserAccount, db: DbClient = prisma): Promise<Idol | null> {
    const id = Number(idStr);
    if (isNaN(id)) return null;
    if (db === prisma) return prisma.$transaction((tx) => this.updateIdol(idStr, updates, viewer, tx));
    const current = await db.personnel.findUnique({ where: { id }, select: { customFields: true, updatedAt: true, baseSalary: true, status: true, resignedDate: true } });
    if (!current) return null;

    const isSystemAdminViewer = viewer?.accountType === 'system_admin' || viewer?.isSuperAdmin === true;
    if ((current.status === 'Đã nghỉ việc' || current.resignedDate) && !isSystemAdminViewer) {
      throw new Error('Hồ sơ đã nghỉ việc chỉ System Admin được phép chỉnh sửa');
    }

    const salaryChange = updates.salaryChange;
    if (updates.baseSalary !== undefined && Number(updates.baseSalary || 0) !== num(current.baseSalary) && !salaryChange) {
      throw new Error('Thay đổi lương phải đi qua salaryChange với ngày hiệu lực và lý do');
    }

    const data: any = {};
    if (updates.stageName !== undefined) data.stageName = updates.stageName;
    if (updates.realName !== undefined) data.realName = updates.realName;
    if (updates.dob !== undefined) data.dob = parseDateOrNull(updates.dob);
    if (updates.joinDate !== undefined) data.joinDate = parseDateOrNull(updates.joinDate);
    if (updates.resignedDate !== undefined) data.resignedDate = parseDateOrNull(updates.resignedDate);
    if (updates.role !== undefined) data.role = updates.role;
    if (updates.weight !== undefined) data.weight = new Prisma.Decimal(updates.weight || 0);
    if (updates.height !== undefined) data.height = new Prisma.Decimal(updates.height || 0);
    if (updates.hometown !== undefined) data.hometown = updates.hometown;
    if (updates.currentLiving !== undefined) data.currentLiving = updates.currentLiving;
    if (updates.department !== undefined) data.department = updates.department;
    if (updates.personnelType !== undefined) data.personnelType = updates.personnelType;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.avatarUrl !== undefined) data.avatarUrl = updates.avatarUrl;
    if (updates.bio !== undefined) data.bio = updates.bio;
    if (updates.socialLinks !== undefined) data.socialLinks = updates.socialLinks;
    if (updates.isIdol !== undefined) data.isIdol = updates.isIdol;
    if (updates.cooperationType !== undefined) data.cooperationType = updates.cooperationType;
    if (updates.serviceNotes !== undefined) data.serviceNotes = updates.serviceNotes;
    if (updates.assignedRole !== undefined) data.assignedRole = updates.assignedRole;
    if (updates.phone !== undefined) data.phone = updates.phone;
    if (updates.citizenId !== undefined) data.citizenId = updates.citizenId;
    if (updates.bankName !== undefined) data.bankName = updates.bankName;
    if (updates.bankAccountNumber !== undefined) data.bankAccountNumber = updates.bankAccountNumber;
    if (updates.bankAccountName !== undefined) data.bankAccountName = updates.bankAccountName;
    if (updates.idolCategory !== undefined) data.idolCategory = updates.idolCategory;
    if (updates.commercialDetails !== undefined) data.commercialDetails = updates.commercialDetails;
    if (updates.customFields !== undefined) {
      const columns = await this.getPersonnelColumns();
      const existingFields = normalizeCustomFields(current.customFields);
      const allowedUpdates = filterPersonnelCustomFields(normalizeCustomFields(updates.customFields), columns, viewer);
      data.customFields = { ...existingFields, ...allowedUpdates };
    }
    if (updates.stt !== undefined) data.stt = updates.stt;

    const writeResult = await db.personnel.updateMany({
      where: { id, updatedAt: current.updatedAt },
      data,
    });
    if (writeResult.count !== 1) throw new Error('Hồ sơ nhân sự đã được cập nhật; vui lòng tải lại và thử lại');

    if (salaryChange) {
      if (!canManagePayroll(viewer)) throw new Error('Tài khoản không có quyền quản lý thay đổi lương');
      await this.changePersonnelSalary(idStr, salaryChange, viewer, db);
    }
    const updated = await db.personnel.findUnique({ where: { id }, include: { user: true } });

    if (updates.activityCodes !== undefined || updates.primaryActivityCode !== undefined || updates.isIdol !== undefined || updates.personnelType !== undefined) {
      await replacePersonnelActivities(id, updates, db);
    }

    if (updates.status === 'Đã nghỉ việc' || updates.resignedDate !== undefined) {
      await this.cascadePersonnelResignation(id, updates.resignedDate, updates.status, db);
    }

    const updatedWithActivities = await db.personnel.findUnique({ where: { id }, include: { user: true, activities: { include: activityInclude() } } });
    const activities = mapPersonnelActivities(updatedWithActivities?.activities);
    return { ...mapPersonnelToIdol(updatedWithActivities || updated), activities, activityCodes: activities.map((activity) => activity.code), primaryActivityCode: activities.find((activity) => activity.isPrimary)?.code };
  },

  async changePersonnelSalary(idStr: string, payload: any, actor?: UserAccount, db: DbClient = prisma): Promise<any> {
    if (db === prisma) return prisma.$transaction((tx) => this.changePersonnelSalary(idStr, payload, actor, tx));
    if (!canManagePayroll(actor)) throw new Error('Tài khoản không có quyền quản lý thay đổi lương');

    const personnelId = Number(idStr);
    if (!Number.isInteger(personnelId) || personnelId <= 0) throw new Error('Nhân sự không hợp lệ');
    const salaryAmount = Number(payload?.salaryAmount);
    if (!Number.isFinite(salaryAmount) || salaryAmount < 0) throw new Error('Mức lương không hợp lệ');
    const effectiveFrom = parseStrictDate(payload?.effectiveFrom);
    const reason = typeof payload?.reason === 'string' ? payload.reason.trim() : '';
    if (!reason) throw new Error('Bắt buộc nhập lý do thay đổi lương');

    const personnel = await db.personnel.findUnique({ where: { id: personnelId }, select: { id: true, baseSalary: true, joinDate: true } });
    if (!personnel) throw new Error('Không tìm thấy hồ sơ nhân sự');
    const periodStart = `${effectiveFrom.getUTCFullYear()}-${String(effectiveFrom.getUTCMonth() + 1).padStart(2, '0')}`;
    const lockedPeriods = await db.payrollPeriod.findMany({
      where: { period: { gte: periodStart }, status: { in: ['pending_approval', 'approved', 'locked_paid'] } },
      select: { period: true, status: true },
      orderBy: { period: 'asc' }
    });
    if (lockedPeriods.length > 0) {
      throw new Error(`Không thể hồi tố lương vì có kỳ đã duyệt/khóa từ ${lockedPeriods[0].period}`);
    }

    const existingAtDate = await db.personnelSalaryHistory.findUnique({
      where: { personnelId_effectiveFrom: { personnelId, effectiveFrom } },
      select: { id: true }
    });
    if (existingAtDate) throw new Error('Đã tồn tại mức lương có cùng ngày hiệu lực');

    const [previous, next] = await Promise.all([
      db.personnelSalaryHistory.findFirst({ where: { personnelId, effectiveFrom: { lt: effectiveFrom } }, orderBy: { effectiveFrom: 'desc' } }),
      db.personnelSalaryHistory.findFirst({ where: { personnelId, effectiveFrom: { gt: effectiveFrom } }, orderBy: { effectiveFrom: 'asc' } })
    ]);
    if (previous) {
      await db.personnelSalaryHistory.update({ where: { id: previous.id }, data: { effectiveTo: dateBefore(effectiveFrom) } });
    }
    const history = await db.personnelSalaryHistory.create({
      data: {
        personnelId,
        salaryAmount: new Prisma.Decimal(salaryAmount),
        effectiveFrom,
        effectiveTo: next ? dateBefore(next.effectiveFrom) : null,
        currency: payload.currency || 'VND',
        reason,
        source: payload.source || 'manual',
        createdById: actor?.id ? Number(actor.id) : undefined
      }
    });

    const referenceDate = await getEffectiveSystemDate(db);
    if (effectiveFrom <= referenceDate) {
      await db.personnel.update({ where: { id: personnelId }, data: { baseSalary: new Prisma.Decimal(salaryAmount) } });
    }
    await db.auditLog.create({
      data: {
        requestId: randomUUID(),
        actorUserId: actor?.id ? Number(actor.id) : undefined,
        method: 'POST',
        path: `/api/idols/${personnelId}/salary-history`,
        action: 'personnel.salary.change',
        resource: 'personnel_salary_history',
        resourceId: history.id,
        statusCode: 200,
        metadata: {
          personnelId,
          previousSalary: num(personnel.baseSalary),
          newSalary: salaryAmount,
          effectiveFrom: payload.effectiveFrom,
          reason,
          source: payload.source || 'manual'
        }
      }
    });
    return {
      id: history.id,
      personnelId: history.personnelId,
      salaryAmount: num(history.salaryAmount),
      effectiveFrom: toIsoDate(history.effectiveFrom),
      effectiveTo: toIsoDate(history.effectiveTo),
      currency: history.currency,
      reason: history.reason || undefined,
      source: history.source,
      createdById: history.createdById ? String(history.createdById) : undefined,
      createdAt: history.createdAt.toISOString()
    };
  },

  async getPersonnelSalaryHistory(idStr: string): Promise<any[]> {
    const personnelId = Number(idStr);
    if (!Number.isInteger(personnelId) || personnelId <= 0) return [];
    const rows = await prisma.personnelSalaryHistory.findMany({ where: { personnelId }, orderBy: { effectiveFrom: 'desc' } });
    return rows.map((row) => ({
      id: row.id,
      personnelId: row.personnelId,
      salaryAmount: num(row.salaryAmount),
      effectiveFrom: toIsoDate(row.effectiveFrom),
      effectiveTo: toIsoDate(row.effectiveTo),
      currency: row.currency,
      reason: row.reason || undefined,
      source: row.source,
      createdById: row.createdById ? String(row.createdById) : undefined,
      createdAt: row.createdAt.toISOString()
    }));
  },

  async getPersonnelActivityTypes(): Promise<any[]> {
    const types = await prisma.personnelActivityType.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
    return types.map((type) => ({ id: String(type.id), code: type.code, name: type.name, description: type.description || undefined, isActive: type.isActive, displayOrder: type.displayOrder }));
  },

  async cascadePersonnelResignation(personnelId: number, resignedDateStr?: string | null, status?: string, db: DbClient = prisma): Promise<void> {
    const isResigned = status === 'Đã nghỉ việc' || !!resignedDateStr;
    if (!isResigned) return;

    const personnel = await db.personnel.findUnique({
      where: { id: personnelId },
      include: { user: true }
    });
    if (!personnel) return;

    const effectiveResignDate = resignedDateStr || toIsoDate(personnel.resignedDate) || toIsoDate(personnel.joinDate) || '2025-01-01';

    // 1. Đồng bộ sang tài khoản userAccount
    if (personnel.userId) {
      await db.userAccount.update({
        where: { id: personnel.userId },
        data: { status: 'Đã khóa' }
      });
    }

    // 2. Vô hiệu hóa toàn bộ lịch trực live / ca làm việc
    await db.workSchedule.updateMany({
      where: { personnelId, isActive: true },
      data: { isActive: false }
    });

    // 3. Quét và dọn các phiếu lương không hợp lệ (thuộc kỳ diễn ra sau ngày nghỉ việc)
    const records = await db.payrollRecord.findMany({
      where: { personnelId }
    });

    const affectedPeriodIds = new Set<string>();

    for (const r of records) {
      const eligible = isEligibleForPayrollPeriod(
        r.period,
        toIsoDate(personnel.joinDate),
        effectiveResignDate,
        status || personnel.status
      );

      if (!eligible) {
        await db.payrollRecord.delete({ where: { id: r.id } });
        affectedPeriodIds.add(r.periodId);
      } else if (r.period === effectiveResignDate.slice(0, 7) && r.paymentStatus !== 'paid') {
        const prorated = calculateProratedWorkDays(r.period, toIsoDate(personnel.joinDate), effectiveResignDate);
        const contractSalary = num(personnel.baseSalary);
        const proratedBase = Math.round(contractSalary * prorated.workRatio);
        const earningsDetail = (r.earningsDetail as any) || {};
        earningsDetail.actualWorkDays = prorated.actualWorkDays;
        earningsDetail.standardWorkDays = prorated.standardWorkDays;
        earningsDetail.workRatio = prorated.workRatio;
        earningsDetail.contractBaseSalary = contractSalary;
        earningsDetail.baseSalary = proratedBase;
        earningsDetail.workDaysExplanation = prorated.explanation;

        const currentAllowance = earningsDetail.allowance || 0;
        const totalGross = proratedBase + (earningsDetail.kpiBonus || 0) + (earningsDetail.commissionGmv || 0) + (earningsDetail.giftShare || 0) + currentAllowance + (earningsDetail.hotBonus || 0) + (r.overtimePay ? num(r.overtimePay) : 0);
        const totalDeductions = num(r.totalDeductions);
        const netSalary = Math.max(0, totalGross - totalDeductions);

        await db.payrollRecord.update({
          where: { id: r.id },
          data: {
            baseSalary: new Prisma.Decimal(proratedBase),
            totalGross: new Prisma.Decimal(totalGross),
            netSalary: new Prisma.Decimal(netSalary),
            earningsDetail
          }
        });
        affectedPeriodIds.add(r.periodId);
      }
    }

    // 4. Tính lại tổng lũy kế cho các kỳ lương bị ảnh hưởng
    for (const periodId of affectedPeriodIds) {
      await this.recalculatePeriodTotals(periodId, db);
    }
  },

  async auditAndCleanResignedPersonnel(): Promise<{ cleanedPersonnel: number }> {
    const resignedPersonnel = await prisma.personnel.findMany({
      where: {
        OR: [
          { status: 'Đã nghỉ việc' },
          { resignedDate: { not: null } }
        ]
      }
    });

    for (const p of resignedPersonnel) {
      await this.cascadePersonnelResignation(p.id, toIsoDate(p.resignedDate), p.status);
    }

    return { cleanedPersonnel: resignedPersonnel.length };
  },

  async deleteIdol(idStr: string, db: DbClient = prisma): Promise<boolean> {
    const id = Number(idStr);
    if (isNaN(id)) return false;
    try {
      const [payrollCount, revenueCount] = await Promise.all([
        db.payrollRecord.count({ where: { personnelId: id } }),
        db.revenueTransaction.count({ where: { personnelId: id } }),
      ]);
      if (payrollCount > 0 || revenueCount > 0) return false;
      await db.personnel.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ==========================================
  // 2. CRITERIA
  // ==========================================
  async getCriteria(): Promise<Criterion[]> {
    const list = await prisma.criterion.findMany({
      orderBy: { priorityOrder: 'asc' }
    });
    return list.map(c => ({
      id: String(c.id),
      code: c.code,
      name: c.name,
      maxScore: num(c.maxScore),
      weight: num(c.weight),
      description: c.description || undefined,
      priorityOrder: c.priorityOrder
    }));
  },

  async createCriterion(payload: any): Promise<Criterion> {
    const created = await prisma.criterion.create({
      data: {
        code: payload.code,
        name: payload.name,
        maxScore: new Prisma.Decimal(payload.maxScore || 10),
        weight: new Prisma.Decimal(payload.weight || 20),
        description: payload.description || null,
        priorityOrder: payload.priorityOrder || 1
      }
    });
    return {
      id: String(created.id),
      code: created.code,
      name: created.name,
      maxScore: num(created.maxScore),
      weight: num(created.weight),
      description: created.description || undefined,
      priorityOrder: created.priorityOrder
    };
  },

  async updateCriterion(idStr: string, payload: any): Promise<Criterion | null> {
    const id = Number(idStr);
    if (isNaN(id)) return null;
    const data: any = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.code !== undefined) data.code = payload.code;
    if (payload.maxScore !== undefined) data.maxScore = new Prisma.Decimal(payload.maxScore);
    if (payload.weight !== undefined) data.weight = new Prisma.Decimal(payload.weight);
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.priorityOrder !== undefined) data.priorityOrder = payload.priorityOrder;

    const updated = await prisma.criterion.update({
      where: { id },
      data
    });
    return {
      id: String(updated.id),
      code: updated.code,
      name: updated.name,
      maxScore: num(updated.maxScore),
      weight: num(updated.weight),
      description: updated.description || undefined,
      priorityOrder: updated.priorityOrder
    };
  },

  async deleteCriterion(idStr: string): Promise<boolean> {
    const id = Number(idStr);
    if (isNaN(id)) return false;
    try {
      await prisma.criterion.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async updateCriteriaPriority(criterionIds: string[]): Promise<Criterion[]> {
    for (let i = 0; i < criterionIds.length; i++) {
      const id = Number(criterionIds[i]);
      if (!isNaN(id)) {
        await prisma.criterion.update({
          where: { id },
          data: { priorityOrder: i + 1 }
        });
      }
    }
    return this.getCriteria();
  },

  // ==========================================
  // 3. SCORES (ĐÁNH GIÁ CHUYÊN MÔN)
  // ==========================================
  async getScores(period?: string): Promise<IdolScoreRecord[]> {
    const where: any = {};
    if (period) where.period = period;
    const records = await prisma.scoreRecord.findMany({
      where: { ...where, personnel: businessPersonnelRelation },
      include: { scoreItems: true }
    });

    return records.map(r => {
      const scoresObj: Record<string, number> = {};
      r.scoreItems.forEach(item => {
        scoresObj[String(item.criterionId)] = num(item.score);
      });
      return {
        id: r.id,
        idolId: String(r.personnelId),
        period: r.period,
        scores: scoresObj,
        totalScore: num(r.totalScore),
        averageScore: num(r.averageScore),
        evaluatorNotes: r.evaluatorNotes || undefined,
        evaluatedAt: r.evaluatedAt.toISOString()
      };
    });
  },

  async saveScore(payload: any, db: DbClient = prisma): Promise<IdolScoreRecord> {
    if (db === prisma) return prisma.$transaction((tx) => this.saveScore(payload, tx));
    const personnelId = Number(payload.idolId);
    await assertBusinessPersonnel(personnelId, db);
    const period = payload.period || '2026-10';

    // Xóa record cũ nếu có cùng kỳ và personnelId
    const existing = await db.scoreRecord.findFirst({
      where: { personnelId, period }
    });
    if (existing) {
      await db.scoreRecord.delete({ where: { id: existing.id } });
    }

    const scoreRecordId = randomUUID();
    const created = await db.scoreRecord.create({
      data: {
        id: scoreRecordId,
        personnelId,
        period,
        totalScore: new Prisma.Decimal(payload.totalScore || 0),
        averageScore: new Prisma.Decimal(payload.averageScore || 0),
        evaluatorNotes: payload.evaluatorNotes || null,
        evaluatedAt: parseDateOrNull(payload.evaluatedAt) || new Date()
      }
    });

    // Tạo items
    const scores = payload.scores || {};
    const scoresObj: Record<string, number> = {};
    for (const [critIdStr, scVal] of Object.entries(scores)) {
      const critId = Number(critIdStr);
      if (!isNaN(critId)) {
        await db.scoreRecordItem.create({
          data: {
            scoreRecordId,
            criterionId: critId,
            score: new Prisma.Decimal(Number(scVal) || 0)
          }
        });
        scoresObj[critIdStr] = Number(scVal);
      }
    }

    return {
      id: created.id,
      idolId: String(created.personnelId),
      period: created.period,
      scores: scoresObj,
      totalScore: num(created.totalScore),
      averageScore: num(created.averageScore),
      evaluatorNotes: created.evaluatorNotes || undefined,
      evaluatedAt: created.evaluatedAt.toISOString()
    };
  },

  async batchSaveScores(records: any[]): Promise<IdolScoreRecord[]> {
    return prisma.$transaction(async (tx) => {
      const results: IdolScoreRecord[] = [];
      for (const rec of records) results.push(await this.saveScore(rec, tx));
      return results;
    });
  },

  // ==========================================
  // 4. TASKS (NHIỆM VỤ CÔNG VIỆC)
  // ==========================================
  async getTasks(idolIdStr?: string, viewer?: UserAccount): Promise<IdolTask[]> {
    const where: any = {};
    const canManageAllTasks = Boolean(!viewer?.isIdol && (viewer?.isSuperAdmin || viewer?.isBusinessAdmin || viewer?.allowedActions?.includes('manage_tasks')));
    if (viewer?.idolId && viewer?.isIdol) {
      where.personnelId = Number(viewer.idolId);
    } else if (idolIdStr) {
      const pid = Number(idolIdStr);
      if (!isNaN(pid)) where.personnelId = pid;
    }
    const allowedDepartments = viewer?.allowedDepartments || [];
    where.personnel = {
      ...businessPersonnelRelation,
      ...(!viewer?.isIdol && allowedDepartments.length > 0 && !allowedDepartments.includes('*') ? { department: { in: allowedDepartments } } : {})
    };
    const list = await prisma.personnelTask.findMany({
      where,
      include: { activityType: true },
      orderBy: { createdAt: 'desc' }
    });

    return list.map(t => ({
      id: t.id,
      idolId: String(t.personnelId),
      activityCode: t.activityType?.code || undefined,
      title: t.title,
      description: t.description || undefined,
      category: t.category as any,
      status: t.status as any,
      startTime: t.startTime ? t.startTime.toISOString() : undefined,
      endTime: t.endTime ? t.endTime.toISOString() : undefined,
      loggedDurationMinutes: t.loggedDurationMinutes,
      subtasks: (t.subtasks as any) || [],
      dueDate: toIsoDate(t.dueDate),
      createdAt: t.createdAt.toISOString()
    }));
  },

  async getTaskOwner(id: string): Promise<{ personnelId: number; department: string } | null> {
    const task = await prisma.personnelTask.findUnique({
      where: { id },
      select: { personnelId: true, personnel: { select: { department: true } } }
    });
    if (!task) return null;
    return { personnelId: task.personnelId, department: task.personnel.department };
  },

  async createTask(payload: any): Promise<IdolTask> {
    const personnelId = Number(payload.idolId);
    await assertBusinessPersonnel(personnelId);
    await validateTaskTaxonomy(personnelId, payload.category || 'Luyện tập', payload.activityCode);
    const effDate = await getEffectiveSystemDate();
    const activityTypeId = await resolvePersonnelActivityTypeId(personnelId, payload);
    const created = await prisma.personnelTask.create({
      data: {
        personnelId,
        activityTypeId,
        title: payload.title,
        description: payload.description || null,
        category: payload.category || 'Luyện tập',
        status: payload.status || 'todo',
        startTime: parseDateOrNull(payload.startTime),
        endTime: parseDateOrNull(payload.endTime),
        loggedDurationMinutes: Number(payload.loggedDurationMinutes) || 0,
        subtasks: payload.subtasks || [],
        dueDate: parseDateOrNull(payload.dueDate),
        createdAt: effDate
      }
    });

    return {
      id: created.id,
      idolId: String(created.personnelId),
      title: created.title,
      activityCode: activityTypeId ? (await prisma.personnelActivityType.findUnique({ where: { id: activityTypeId }, select: { code: true } }))?.code : undefined,
      description: created.description || undefined,
      category: created.category as any,
      status: created.status as any,
      startTime: created.startTime ? created.startTime.toISOString() : undefined,
      endTime: created.endTime ? created.endTime.toISOString() : undefined,
      loggedDurationMinutes: created.loggedDurationMinutes,
      subtasks: (created.subtasks as any) || [],
      dueDate: toIsoDate(created.dueDate),
      createdAt: created.createdAt.toISOString()
    };
  },

  async updateTask(id: string, payload: any): Promise<IdolTask | null> {
    const data: any = {};
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.category !== undefined) data.category = payload.category;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.startTime !== undefined) data.startTime = parseDateOrNull(payload.startTime);
    if (payload.endTime !== undefined) data.endTime = parseDateOrNull(payload.endTime);
    if (payload.loggedDurationMinutes !== undefined) data.loggedDurationMinutes = Number(payload.loggedDurationMinutes);
    if (payload.subtasks !== undefined) data.subtasks = payload.subtasks;
    if (payload.dueDate !== undefined) data.dueDate = parseDateOrNull(payload.dueDate);

    const existingTask = await prisma.personnelTask.findUnique({ where: { id }, include: { activityType: true, personnel: { select: { idolCategory: true } } } });
    if (!existingTask) return null;
    await assertBusinessPersonnel(existingTask.personnelId);
    const nextCategory = payload.category !== undefined ? payload.category : existingTask.category;
    const nextActivityCode = payload.activityCode !== undefined
      ? payload.activityCode
      : (payload.activityTypeId !== undefined ? undefined : existingTask.activityType?.code);
    await validateTaskTaxonomy(existingTask.personnelId, nextCategory, nextActivityCode);
    if (payload.activityCode !== undefined || payload.activityTypeId !== undefined) {
      data.activityTypeId = await resolvePersonnelActivityTypeId(existingTask.personnelId, payload);
    }
    const updated = await prisma.personnelTask.update({
      where: { id },
      data,
      include: { activityType: true }
    });

    return {
      id: updated.id,
      idolId: String(updated.personnelId),
      activityCode: updated.activityType?.code || undefined,
      title: updated.title,
      description: updated.description || undefined,
      category: updated.category as any,
      status: updated.status as any,
      startTime: updated.startTime ? updated.startTime.toISOString() : undefined,
      endTime: updated.endTime ? updated.endTime.toISOString() : undefined,
      loggedDurationMinutes: updated.loggedDurationMinutes,
      subtasks: (updated.subtasks as any) || [],
      dueDate: toIsoDate(updated.dueDate),
      createdAt: updated.createdAt.toISOString()
    };
  },

  async startTaskTimer(id: string): Promise<IdolTask | null> {
    const task = await prisma.personnelTask.findUnique({ where: { id }, select: { startTime: true, endTime: true, status: true } });
    if (!task) return null;
    if (task.status === 'in_progress' && task.startTime && !task.endTime) return this.updateTask(id, {});
    return this.updateTask(id, {
      status: 'in_progress',
      startTime: new Date().toISOString(),
      endTime: null
    });
  },

  async stopTaskTimer(id: string): Promise<IdolTask | null> {
    const task = await prisma.personnelTask.findUnique({ where: { id }, select: { startTime: true, loggedDurationMinutes: true, status: true } });
    if (!task) return null;
    const endTime = new Date();
    const elapsedMinutes = task.startTime ? Math.max(1, Math.round((endTime.getTime() - task.startTime.getTime()) / 60000)) : 0;
    return this.updateTask(id, {
      status: 'in_progress',
      endTime: endTime.toISOString(),
      loggedDurationMinutes: (task.loggedDurationMinutes || 0) + elapsedMinutes
    });
  },

  async deleteTask(id: string): Promise<boolean> {
    try {
      await prisma.personnelTask.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async addSubtask(taskId: string, title: string, timeSpentMinutes: number): Promise<IdolTask | null> {
    const task = await prisma.personnelTask.findUnique({ where: { id: taskId } });
    if (!task) return null;
    const subtasks = ((task.subtasks as any[]) || []).concat({
      id: `subtask-${Date.now()}`,
      title,
      completed: false,
      timeSpentMinutes
    });
    return this.updateTask(taskId, { subtasks });
  },

  async updateSubtask(taskId: string, subtaskId: string, updates: any): Promise<IdolTask | null> {
    const task = await prisma.personnelTask.findUnique({ where: { id: taskId } });
    if (!task) return null;
    const subtasks = ((task.subtasks as any[]) || []).map(s => {
      if (s.id === subtaskId) {
        return { ...s, ...updates };
      }
      return s;
    });
    return this.updateTask(taskId, { subtasks });
  },

  async deleteSubtask(taskId: string, subtaskId: string): Promise<IdolTask | null> {
    const task = await prisma.personnelTask.findUnique({ where: { id: taskId } });
    if (!task) return null;
    const subtasks = ((task.subtasks as any[]) || []).filter(s => s.id !== subtaskId);
    return this.updateTask(taskId, { subtasks });
  },

  // ==========================================
  // 5. DEPARTMENTS & LOOKUPS
  // ==========================================
  async getDepartments(): Promise<string[]> {
    const list = await prisma.systemLookup.findMany({
      where: { type: 'department' },
      orderBy: { orderIndex: 'asc' }
    });
    return list.map(l => l.value);
  },

  async addDepartment(name: string): Promise<string[]> {
    const clean = name.trim();
    if (clean) {
      const count = await prisma.systemLookup.count({ where: { type: 'department' } });
      await prisma.systemLookup.upsert({
        where: { type_value: { type: 'department', value: clean } },
        update: {},
        create: { type: 'department', value: clean, orderIndex: count }
      });
    }
    return this.getDepartments();
  },

  async updateDepartment(oldName: string, newName: string): Promise<string[]> {
    const clean = newName.trim();
    if (clean) {
      await prisma.systemLookup.updateMany({
        where: { type: 'department', value: oldName },
        data: { value: clean }
      });
      await prisma.personnel.updateMany({
        where: { department: oldName },
        data: { department: clean }
      });
      await prisma.payrollRecord.updateMany({
        where: { department: oldName },
        data: { department: clean }
      });
    }
    return this.getDepartments();
  },

  async deleteDepartment(name: string): Promise<string[]> {
    await prisma.systemLookup.deleteMany({
      where: { type: 'department', value: name }
    });
    return this.getDepartments();
  },

  // Personnel Types
  async getPersonnelTypes(): Promise<string[]> {
    const list = await prisma.systemLookup.findMany({
      where: { type: 'personnelType' },
      orderBy: { orderIndex: 'asc' }
    });
    return list.map(l => l.value);
  },

  async addPersonnelType(name: string): Promise<string[]> {
    const clean = name.trim();
    if (clean) {
      const count = await prisma.systemLookup.count({ where: { type: 'personnelType' } });
      await prisma.systemLookup.upsert({
        where: { type_value: { type: 'personnelType', value: clean } },
        update: {},
        create: { type: 'personnelType', value: clean, orderIndex: count }
      });
    }
    return this.getPersonnelTypes();
  },

  async updatePersonnelType(oldName: string, newName: string): Promise<string[]> {
    const clean = newName.trim();
    if (clean) {
      await prisma.systemLookup.updateMany({
        where: { type: 'personnelType', value: oldName },
        data: { value: clean }
      });
      // Cascade update sang bảng personnel và payrollRecord
      await prisma.personnel.updateMany({
        where: { personnelType: oldName },
        data: { personnelType: clean }
      });
      await prisma.payrollRecord.updateMany({
        where: { personnelType: oldName },
        data: { personnelType: clean }
      });
    }
    return this.getPersonnelTypes();
  },

  async deletePersonnelType(name: string): Promise<string[]> {
    // 1. Chuyển đổi các nhân sự đang mang loại bị xóa về 'Công ty' mặc định (để không bị mất phân loại)
    await prisma.personnel.updateMany({
      where: { personnelType: name },
      data: { personnelType: 'Công ty' }
    });
    // 2. Xóa khỏi bảng tra cứu danh mục systemLookup
    await prisma.systemLookup.deleteMany({
      where: { type: 'personnelType', value: name }
    });
    return this.getPersonnelTypes();
  },

  // Statuses
  async getStatuses(): Promise<string[]> {
    const list = await prisma.systemLookup.findMany({
      where: { type: 'status' },
      orderBy: { orderIndex: 'asc' }
    });
    return list.map(l => l.value);
  },

  async addStatus(name: string): Promise<string[]> {
    const clean = name.trim();
    if (clean) {
      const count = await prisma.systemLookup.count({ where: { type: 'status' } });
      await prisma.systemLookup.upsert({
        where: { type_value: { type: 'status', value: clean } },
        update: {},
        create: { type: 'status', value: clean, orderIndex: count }
      });
    }
    return this.getStatuses();
  },

  async updateStatus(oldName: string, newName: string): Promise<string[]> {
    const clean = newName.trim();
    if (clean) {
      await prisma.systemLookup.updateMany({
        where: { type: 'status', value: oldName },
        data: { value: clean }
      });
    }
    return this.getStatuses();
  },

  async deleteStatus(name: string): Promise<string[]> {
    const trimmed = name.trim();
    const inUseCount = await prisma.personnel.count({
      where: { status: trimmed },
    });
    if (inUseCount > 0) {
      throw new Error(
        `Không thể xóa trạng thái "${trimmed}" vì đang có ${inUseCount} nhân sự sử dụng. Vui lòng chuyển trạng thái của các nhân sự đó trước.`
      );
    }
    await prisma.systemLookup.deleteMany({
      where: { type: 'status', value: trimmed }
    });
    return this.getStatuses();
  },

  // Column Headers & Settings
  async getColumnHeaders(): Promise<any> {
    const setting = await prisma.appSetting.findUnique({ where: { id: 'global_settings' }, select: { departmentParentMap: true } });
    return (setting?.departmentParentMap as any)?.columnHeaders || {
      stt: 'STT',
      stageName: 'Nghệ Danh & Ảnh',
      realName: 'Tên Thật',
      age: 'Tuổi',
      dob: 'Ngày Sinh',
      joinDate: 'Ngày Vào',
      tenure: 'Thâm Niên',
      role: 'Chức Danh',
      height: 'Chiều Cao',
      weight: 'Cân Nặng',
      hometown: 'Quê Quán',
      currentLiving: 'Nơi Sống',
      department: 'Đơn Vị Trực Thuộc',
      personnelType: 'Loại Nhân Sự',
      status: 'Trạng Thái',
      actions: 'Thao Tác'
    };
  },

  async updateColumnHeaders(updates: any): Promise<any> {
    const setting = await prisma.appSetting.findUnique({ where: { id: 'global_settings' }, select: { departmentParentMap: true } });
    const currentMap = (setting?.departmentParentMap as any) || {};
    const updatedMap = { ...currentMap, columnHeaders: { ...(currentMap.columnHeaders || {}), ...updates } };
    await prisma.appSetting.upsert({
      where: { id: 'global_settings' },
      update: { departmentParentMap: updatedMap },
      create: { id: 'global_settings', departmentParentMap: updatedMap }
    });
    return this.getColumnHeaders();
  },

  // Dynamic Personnel Columns
  async getPersonnelColumns(includeInactive = false): Promise<PersonnelColumn[]> {
    const columns = await prisma.personnelColumn.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    return columns.map(mapPersonnelColumn);
  },

  async createPersonnelColumn(payload: any): Promise<PersonnelColumn> {
    const key = String(payload.key || '').trim();
    const label = String(payload.label || '').trim();
    const type = String(payload.type || '').trim();
    const validTypes = new Set(['text', 'number', 'date', 'select', 'boolean']);
    if (!/^[a-z][a-zA-Z0-9_-]*$/.test(key)) {
      throw personnelColumnError('Key phải bắt đầu bằng chữ và chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới');
    }
    if (!label || label.length > 120) throw personnelColumnError('Label không được để trống và tối đa 120 ký tự');
    if (!validTypes.has(type)) throw personnelColumnError('Type không hợp lệ');
    const sensitivity = String(payload.sensitivity || 'public');
    if (!['public', 'internal', 'sensitive'].includes(sensitivity)) throw personnelColumnError('Mức độ nhạy cảm không hợp lệ');

    const options: string[] = Array.isArray(payload.options)
      ? [...new Set(payload.options.map((option: unknown) => String(option).trim()).filter(Boolean))] as string[]
      : [];
    if (type === 'select' && options.length === 0) {
      throw personnelColumnError('Cột select phải có ít nhất một option');
    }
    if (type !== 'select' && options.length > 0) {
      throw personnelColumnError('Chỉ cột select mới được khai báo options');
    }
    const existing = await prisma.personnelColumn.findUnique({ where: { key } });
    if (existing) throw personnelColumnError('Key cột đã tồn tại', 409);

    const created = await prisma.personnelColumn.create({
      data: {
        key,
        label,
        type,
        options: type === 'select' ? options : Prisma.JsonNull,
        required: payload.required === true,
        isVisible: payload.isVisible !== false,
        isActive: true,
        sortOrder: Number.isInteger(payload.sortOrder) ? payload.sortOrder : 0,
        showInRoster: payload.showInRoster !== false,
        showInProfile: payload.showInProfile !== false,
        sensitivity,
        isSystem: false
      }
    });
    return mapPersonnelColumn(created);
  },

  async updatePersonnelColumn(id: string, payload: any): Promise<PersonnelColumn | null> {
    const existing = await prisma.personnelColumn.findUnique({ where: { id } });
    if (!existing) return null;

    const data: any = {};
    if (payload.key !== undefined) {
      const key = String(payload.key).trim();
      if (key !== existing.key) {
        if (existing.isSystem) throw personnelColumnError('Không được đổi key của cột hệ thống', 409);
        if (!/^[a-z][a-zA-Z0-9_-]*$/.test(key)) throw personnelColumnError('Key không hợp lệ');
        const keyInUse = await prisma.personnelColumn.findUnique({ where: { key } });
        if (keyInUse) throw personnelColumnError('Key cột đã tồn tại', 409);
        const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
          SELECT EXISTS (
            SELECT 1 FROM "personnel"
            WHERE "customFields" ? ${existing.key}
          ) AS "exists"
        `);
        if (rows[0]?.exists) throw personnelColumnError('Không được đổi key khi cột đã có dữ liệu', 409);
        data.key = key;
      }
    }
    if (payload.label !== undefined) {
      const label = String(payload.label).trim();
      if (!label || label.length > 120) throw personnelColumnError('Label không được để trống và tối đa 120 ký tự');
      data.label = label;
    }
    if (payload.type !== undefined) {
      const type = String(payload.type).trim();
      if (!['text', 'number', 'date', 'select', 'boolean'].includes(type)) {
        throw personnelColumnError('Type không hợp lệ');
      }
      if (existing.isSystem && type !== existing.type) {
        throw personnelColumnError('Không được đổi type của cột hệ thống', 409);
      }
      data.type = type;
    }
    const nextType = data.type || existing.type;
    if (payload.sensitivity !== undefined) {
      const sensitivity = String(payload.sensitivity);
      if (!['public', 'internal', 'sensitive'].includes(sensitivity)) throw personnelColumnError('Mức độ nhạy cảm không hợp lệ');
      data.sensitivity = sensitivity;
    }
    if (payload.options !== undefined || data.type !== undefined) {
      const options: string[] = Array.isArray(payload.options)
        ? [...new Set(payload.options.map((option: unknown) => String(option).trim()).filter(Boolean))] as string[]
        : (Array.isArray(existing.options)
          ? existing.options.filter((option): option is string => typeof option === 'string')
          : []);
      if (nextType === 'select' && options.length === 0) throw personnelColumnError('Cột select phải có options');
      if (nextType !== 'select' && options.length > 0) throw personnelColumnError('Chỉ cột select mới được khai báo options');
      data.options = nextType === 'select' ? options : Prisma.JsonNull;
    }
    for (const field of ['required', 'isVisible', 'showInRoster', 'showInProfile']) {
      if (payload[field] !== undefined) data[field] = payload[field] === true;
    }
    if (payload.sortOrder !== undefined) {
      if (!Number.isInteger(payload.sortOrder)) throw personnelColumnError('sortOrder phải là số nguyên');
      data.sortOrder = payload.sortOrder;
    }

    const updated = await prisma.personnelColumn.update({ where: { id }, data });
    return mapPersonnelColumn(updated);
  },

  async archivePersonnelColumn(id: string): Promise<PersonnelColumn | null> {
    const existing = await prisma.personnelColumn.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.isSystem) throw personnelColumnError('Không được archive cột hệ thống', 409);
    const updated = await prisma.personnelColumn.update({ where: { id }, data: { isActive: false } });
    return mapPersonnelColumn(updated);
  },

  async restorePersonnelColumn(id: string): Promise<PersonnelColumn | null> {
    const existing = await prisma.personnelColumn.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await prisma.personnelColumn.update({ where: { id }, data: { isActive: true } });
    return mapPersonnelColumn(updated);
  },

  async reorderPersonnelColumns(columnIds: string[]): Promise<PersonnelColumn[]> {
    const uniqueIds = [...new Set(columnIds)];
    const columns = await prisma.personnelColumn.findMany({ where: { id: { in: uniqueIds }, isActive: true } });
    if (columns.length !== uniqueIds.length) throw personnelColumnError('Danh sách cột sắp xếp không hợp lệ');
    await prisma.$transaction(
      uniqueIds.map((id, index) => prisma.personnelColumn.update({ where: { id }, data: { sortOrder: index } }))
    );
    return this.getPersonnelColumns(true);
  },

  async getSettings(): Promise<any> {
    let s: any;
    try {
      s = await prisma.appSetting.findUnique({ where: { id: 'global_settings' } });
    } catch (error) {
      if (!isMissingReferenceClockColumn(error)) throw error;
      s = await prisma.appSetting.findUnique({
        where: { id: 'global_settings' },
        select: {
          referenceYear: true, referenceDate: true, referenceTime: true,
          brandName: true, brandTagline: true, brandLogoUrl: true,
          tieBreakerEnabled: true, tieBreakerCriteriaIds: true,
          scoreCalculationMode: true, departmentParentMap: true, departmentLeaders: true
        }
      });
    }
    return {
      referenceYear: s?.referenceYear || 2026,
      referenceDate: s?.referenceDate || '',
      referenceTime: s?.referenceTime || '',
      referenceClockAnchorAt: s?.referenceClockAnchorAt?.toISOString() || '',
      brandName: s?.brandName || 'AURA TALENT',
      brandTagline: s?.brandTagline || 'Idol Agency OS',
      brandLogoUrl: s?.brandLogoUrl || '',
      tieBreakerEnabled: s?.tieBreakerEnabled !== false,
      tieBreakerCriteriaIds: (s?.tieBreakerCriteriaIds as any) || [],
      scoreCalculationMode: s?.scoreCalculationMode || 'sum',
      departmentParentMap: (s?.departmentParentMap as any) || {},
      departmentLeaders: (s?.departmentLeaders as any) || {}
    };
  },

  async updateSettings(updates: any): Promise<any> {
    const data: any = {};
    const resetReferenceClockAnchor = updates.resetReferenceClockAnchor === true;
    if (updates.referenceYear !== undefined) data.referenceYear = Number(updates.referenceYear);
    if (updates.referenceDate !== undefined) data.referenceDate = updates.referenceDate;
    if (updates.referenceTime !== undefined) {
      const value = String(updates.referenceTime || '').trim();
      if (value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('referenceTime không hợp lệ');
      data.referenceTime = value || null;
    }
    if (updates.referenceDate !== undefined || updates.referenceTime !== undefined || resetReferenceClockAnchor) {
      let existing: any;
      let clockColumnAvailable = true;
      try {
        existing = await prisma.appSetting.findUnique({ where: { id: 'global_settings' }, select: { referenceDate: true, referenceTime: true, referenceClockAnchorAt: true } });
      } catch (error) {
        if (!isMissingReferenceClockColumn(error)) throw error;
        clockColumnAvailable = false;
        existing = await prisma.appSetting.findUnique({ where: { id: 'global_settings' }, select: { referenceDate: true, referenceTime: true } });
      }
      const nextDate = updates.referenceDate !== undefined ? String(updates.referenceDate || '').trim() : (existing?.referenceDate || '');
      const nextTime = updates.referenceTime !== undefined ? String(updates.referenceTime || '').trim() : (existing?.referenceTime || '');
      if (clockColumnAvailable) {
        if (!nextDate) data.referenceClockAnchorAt = null;
        else if (resetReferenceClockAnchor || !existing?.referenceClockAnchorAt || existing.referenceDate !== nextDate || (existing.referenceTime || '') !== nextTime) {
          data.referenceClockAnchorAt = new Date();
          if (resetReferenceClockAnchor) data.referenceTime = null;
        }
      } else if (resetReferenceClockAnchor && nextDate) {
        // Legacy DBs without the additive anchor column use save-time HH:mm.
        data.referenceTime = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        }).format(new Date());
      }
    }
    if (updates.brandName !== undefined) data.brandName = updates.brandName;
    if (updates.brandTagline !== undefined) data.brandTagline = updates.brandTagline;
    if (updates.brandLogoUrl !== undefined) data.brandLogoUrl = updates.brandLogoUrl;
    if (updates.tieBreakerEnabled !== undefined) data.tieBreakerEnabled = updates.tieBreakerEnabled;
    if (updates.tieBreakerCriteriaIds !== undefined) data.tieBreakerCriteriaIds = updates.tieBreakerCriteriaIds;
    if (updates.scoreCalculationMode !== undefined) data.scoreCalculationMode = updates.scoreCalculationMode;
    if (updates.departmentParentMap !== undefined) data.departmentParentMap = updates.departmentParentMap;
    if (updates.departmentLeaders !== undefined) data.departmentLeaders = updates.departmentLeaders;

    await prisma.appSetting.upsert({
      where: { id: 'global_settings' },
      update: data,
      create: { id: 'global_settings', ...data }
    });
    return this.getSettings();
  },

  // ==========================================
  // 6. WORK ASSIGNMENTS (GIAO CÔNG TÁC / CÔNG VIỆC)
  // ==========================================
  async getWorkAssignments(personnelId?: string, createdById?: string): Promise<WorkAssignment[]> {
    const effectiveNow = await getEffectiveSystemDate();
    const autoPenaltyCutoff = getWorkAssignmentAutoPenaltyCutoff(effectiveNow);
    const autoPenaltyCandidates = await prisma.workAssignmentAssignee.findMany({
      where: {
        responseStatus: { in: ['pending', 'overdue'] },
        violationStatus: { in: ['none', 'under_review'] },
        waiverRequestStatus: { not: 'pending' },
        assignment: { status: 'published', mandatory: true, endAt: { lte: autoPenaltyCutoff } },
        personnel: { ...businessPersonnelRelation, ...(personnelId ? { id: Number(personnelId) } : {}) }
      },
      include: { assignment: true, personnel: { select: { baseSalary: true } } }
    });
    await Promise.all(autoPenaltyCandidates.map(async (assignee) => {
      const penaltyAmount = calculateAssignmentPenalty(assignee.assignment.penaltyType as any, num(assignee.assignment.penaltyValue), num(assignee.personnel.baseSalary));
      await prisma.workAssignmentAssignee.updateMany({
        where: { id: assignee.id, responseStatus: { in: ['pending', 'overdue'] }, violationStatus: { in: ['none', 'under_review'] }, waiverRequestStatus: { not: 'pending' } },
        data: {
          responseStatus: 'declined', responseNote: 'Tự động không tham gia do không phản hồi sau 3 ngày kể từ khi công tác kết thúc', respondedAt: effectiveNow,
          violationStatus: 'confirmed', penaltyAmount, penaltyRate: 100,
          violationNote: 'Tự động xác nhận phạt do không phản hồi sau 3 ngày kể từ khi công tác kết thúc', reviewedAt: effectiveNow,
          waiverRequestStatus: 'rejected', waiverDecision: 'penalty', waiverReviewedAt: effectiveNow,
          waiverReviewNote: 'Tự động áp dụng phạt đủ định mức do không có phản hồi.'
        }
      });
    }));
    await prisma.workAssignmentAssignee.updateMany({
      where: {
        responseStatus: { in: ['pending', 'accepted', 'in_progress'] },
        violationStatus: 'none',
        assignment: {
          status: 'published',
          acceptanceDeadline: { lt: effectiveNow }
        }
      },
      data: { responseStatus: 'overdue', violationStatus: 'under_review' }
    });
    const where: any = {};
    if (personnelId) where.assignees = { some: { personnelId: Number(personnelId) } };
    if (createdById) where.createdById = Number(createdById);
    const rows = await prisma.workAssignment.findMany({
      where,
      include: {
        createdBy: { select: { id: true, username: true } },
        assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } }
      },
      orderBy: [{ acceptanceDeadline: 'asc' }, { createdAt: 'desc' }]
    });
    return rows.map(mapWorkAssignment);
  },

  async createWorkAssignment(payload: any, createdById: string): Promise<WorkAssignment> {
    const personnelIds: number[] = Array.from(new Set<number>((Array.isArray(payload.assigneePersonnelIds) ? payload.assigneePersonnelIds : []).map((value: unknown) => Number(value)).filter((id: number) => Number.isInteger(id) && id > 0)));
    if (personnelIds.length === 0) throw new Error('Phải chọn ít nhất một nhân sự');
    const personnel = await prisma.personnel.findMany({ where: { id: { in: personnelIds }, ...businessPersonnelRelation }, select: { id: true } });
    if (personnel.length !== personnelIds.length) throw new Error('Có nhân sự không hợp lệ hoặc không còn hoạt động');
    const mandatory = payload.mandatory === true;
    const penaltyType = mandatory && ['none', 'fixed', 'percentage'].includes(String(payload.penaltyType)) ? String(payload.penaltyType) : 'none';
    const penaltyValue = penaltyType === 'none' ? 0 : Number(payload.penaltyValue);
    if (penaltyType !== 'none' && (!Number.isFinite(penaltyValue) || penaltyValue <= 0)) throw new Error('Mức phạt phải lớn hơn 0');
    const startAt = parseDateOrNull(payload.startAt);
    const endAt = parseDateOrNull(payload.endAt);
    if (startAt && endAt && endAt < startAt) throw new Error('Thời điểm kết thúc phải sau thời điểm bắt đầu');
    const rest = calculateWorkAssignmentRest(startAt || undefined, endAt || undefined);
    const acceptanceDeadline = parseDateOrNull(payload.acceptanceDeadline) || (startAt ? new Date(startAt.getTime() - 60000) : null);
    if (acceptanceDeadline && startAt && acceptanceDeadline >= startAt) throw new Error('Hạn chấp nhận phải trước thời điểm bắt đầu');
    const scheduleRows = await prisma.workSchedule.findMany({
      where: { personnelId: { in: personnelIds }, isActive: true },
      select: { personnelId: true, dayOfWeek: true }
    });
    const restWeekdaysByPersonnel = new Map<number, number[]>();
    personnelIds.forEach((personnelId) => {
      const workingDays = new Set(scheduleRows.filter((row) => row.personnelId === personnelId).map((row) => row.dayOfWeek % 7));
      const fixedDays = workingDays.size > 0 ? [0, 1, 2, 3, 4, 5, 6].filter((day) => !workingDays.has(day)) : [0];
      restWeekdaysByPersonnel.set(personnelId, fixedDays);
    });
    const created = await prisma.workAssignment.create({
      data: {
        title: String(payload.title || '').trim(),
        description: payload.description ? String(payload.description).trim() : null,
        assignmentType: String(payload.assignmentType || 'other'),
        mandatory,
        penaltyType,
        penaltyValue,
        startAt,
        endAt,
        acceptanceDeadline,
        location: payload.location ? String(payload.location).trim() : null,
        restDayDate: rest.restDayDate ? parseDateOrNull(rest.restDayDate) : null,
        restDayPortion: rest.restDayPortion,
        createdById: Number(createdById),
        assignees: { create: personnelIds.map((personnelId) => {
          const personRest = calculateWorkAssignmentRest(startAt || undefined, endAt || undefined, restWeekdaysByPersonnel.get(personnelId));
          return {
            personnel: { connect: { id: personnelId } },
            restDayDate: personRest.restDayDate ? parseDateOrNull(personRest.restDayDate) : null,
            restDayPortion: personRest.restDayPortion
          };
        }) }
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } }
      }
    });
    return mapWorkAssignment(created);
  },

  async updateWorkAssignment(assignmentId: string, payload: any, updatedById: string): Promise<WorkAssignment | null> {
    const effectiveNow = await getEffectiveSystemDate();
    const existing = await prisma.workAssignment.findUnique({ where: { id: assignmentId }, include: { assignees: true } });
    if (!existing || existing.status === 'cancelled') return null;
    if (existing.assignees.length > 0 && existing.assignees.every((item) => item.responseStatus === 'completed')) {
      throw new Error('Không thể chỉnh sửa công việc đã hoàn thành');
    }
    const mandatory = payload.mandatory === undefined ? existing.mandatory : payload.mandatory === true;
    const penaltyType = mandatory && ['none', 'fixed', 'percentage'].includes(String(payload.penaltyType ?? existing.penaltyType)) ? String(payload.penaltyType ?? existing.penaltyType) : 'none';
    const penaltyValue = penaltyType === 'none' ? 0 : Number(payload.penaltyValue ?? existing.penaltyValue);
    if (penaltyType !== 'none' && (!Number.isFinite(penaltyValue) || penaltyValue <= 0)) throw new Error('Mức phạt phải lớn hơn 0');
    const startAt = payload.startAt === undefined ? existing.startAt : parseDateOrNull(payload.startAt);
    const endAt = payload.endAt === undefined ? existing.endAt : parseDateOrNull(payload.endAt);
    if (startAt && endAt && endAt < startAt) throw new Error('Thời điểm kết thúc phải sau thời điểm bắt đầu');
    const acceptanceDeadline = payload.acceptanceDeadline === undefined
      ? existing.acceptanceDeadline
      : (parseDateOrNull(payload.acceptanceDeadline) || (startAt ? new Date(startAt.getTime() - 60000) : null));
    if (acceptanceDeadline && startAt && acceptanceDeadline >= startAt) throw new Error('Hạn chấp nhận phải trước thời điểm bắt đầu');
    const title = payload.title === undefined ? existing.title : String(payload.title || '').trim();
    if (!title) throw new Error('Tiêu đề công việc không được để trống');
    const rest = calculateWorkAssignmentRest(startAt || undefined, endAt || undefined);
    const nextPersonnelIds = payload.assigneePersonnelIds === undefined
      ? null
      : Array.from(new Set<number>((Array.isArray(payload.assigneePersonnelIds) ? payload.assigneePersonnelIds : []).map((value: unknown) => Number(value)).filter((id: number) => Number.isInteger(id) && id > 0)));
    if (nextPersonnelIds && nextPersonnelIds.length === 0) throw new Error('Phải chọn ít nhất một nhân sự');
    if (nextPersonnelIds && existing.startAt && existing.startAt <= effectiveNow) throw new Error('Chỉ được đổi người thực hiện trước khi công tác bắt đầu');
    if (nextPersonnelIds) {
      const validPersonnel = await prisma.personnel.findMany({ where: { id: { in: nextPersonnelIds }, ...businessPersonnelRelation }, select: { id: true } });
      if (validPersonnel.length !== nextPersonnelIds.length) throw new Error('Có nhân sự không hợp lệ hoặc không còn hoạt động');
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.workAssignment.update({
        where: { id: assignmentId },
        data: {
        title,
        description: payload.description === undefined ? existing.description : (payload.description ? String(payload.description).trim() : null),
        assignmentType: payload.assignmentType === undefined ? existing.assignmentType : String(payload.assignmentType),
        mandatory,
        penaltyType,
        penaltyValue,
        startAt,
        endAt,
        acceptanceDeadline,
        location: payload.location === undefined ? existing.location : (payload.location ? String(payload.location).trim() : null),
        restDayDate: rest.restDayDate ? parseDateOrNull(rest.restDayDate) : null,
        restDayPortion: rest.restDayPortion
        },
        include: {
          createdBy: { select: { id: true, username: true } },
          assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } }
        }
      });
      if (nextPersonnelIds) {
        await tx.workAssignmentAssignee.deleteMany({ where: { assignmentId, personnelId: { notIn: nextPersonnelIds } } });
        const existingIds = new Set(existing.assignees.map((item) => item.personnelId));
        const addedIds = nextPersonnelIds.filter((personnelId) => !existingIds.has(personnelId));
        if (addedIds.length > 0) await tx.workAssignmentAssignee.createMany({ data: addedIds.map((personnelId) => ({ assignmentId, personnelId })) });
      }
      return result;
    });
    void updatedById;
    return mapWorkAssignment(updated);
  },

  async respondToWorkAssignment(assignmentId: string, personnelId: string, responseStatus: string, note?: string): Promise<WorkAssignment | null> {
    const effectiveNow = await getEffectiveSystemDate();
    const assignment = await prisma.workAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.status === 'cancelled') return null;
    if (responseStatus === 'accepted' && assignment.acceptanceDeadline && assignment.acceptanceDeadline < effectiveNow) {
      await prisma.workAssignmentAssignee.update({ where: { assignmentId_personnelId: { assignmentId, personnelId: Number(personnelId) } }, data: { responseStatus: 'overdue', violationStatus: 'under_review' } });
      throw new Error('Đã quá hạn chấp nhận công tác');
    }
    if (responseStatus === 'declined' && assignment.mandatory) throw new Error('Công việc bắt buộc không thể từ chối trực tiếp');
    if (!['accepted', 'declined'].includes(responseStatus)) throw new Error('Trạng thái phản hồi không hợp lệ');
    if (responseStatus === 'declined' && !String(note || '').trim()) throw new Error('Từ chối công việc phải có lý do');
    await prisma.workAssignmentAssignee.update({
      where: { assignmentId_personnelId: { assignmentId, personnelId: Number(personnelId) } },
      data: { responseStatus, responseNote: note ? String(note).trim() : null, respondedAt: new Date() }
    });
    const updated = await prisma.workAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        createdBy: { select: { id: true, username: true } },
        assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } }
      }
    });
    return updated ? mapWorkAssignment(updated) : null;
  },

  async cancelWorkAssignment(assignmentId: string, cancelledById: string, reason?: string): Promise<WorkAssignment | null> {
    const assignment = await prisma.workAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.status === 'cancelled') return null;
    if (!String(reason || '').trim()) throw new Error('Hủy công tác phải có lý do');
    const updated = await prisma.workAssignment.update({
      where: { id: assignmentId },
      data: { status: 'cancelled', cancellationReason: String(reason).trim(), cancelledAt: new Date(), cancelledById: Number(cancelledById) },
      include: { createdBy: { select: { id: true, username: true } }, assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } } }
    });
    return mapWorkAssignment(updated);
  },

  async requestWorkAssignmentWaiver(assignmentId: string, personnelId: string, reason?: string): Promise<WorkAssignment | null> {
    if (!String(reason || '').trim()) throw new Error('Yêu cầu miễn/giảm phạt phải có lý do');
    const effectiveNow = await getEffectiveSystemDate();
    const assignee = await prisma.workAssignmentAssignee.findUnique({ where: { assignmentId_personnelId: { assignmentId, personnelId: Number(personnelId) } }, include: { assignment: true } });
    const beforeAcceptanceDeadline = Boolean(assignee?.assignment.status === 'published'
      && assignee.responseStatus === 'pending'
      && assignee.violationStatus === 'none'
      && (!assignee.assignment.acceptanceDeadline || assignee.assignment.acceptanceDeadline >= effectiveNow));
    if (!assignee || (assignee.violationStatus !== 'under_review' && !beforeAcceptanceDeadline)) throw new Error('Công việc hiện không ở trạng thái có thể phản hồi');
    if (assignee.waiverRequestStatus === 'pending') throw new Error('Giải trình đã được gửi và đang chờ xử lý');
    await prisma.workAssignmentAssignee.update({ where: { id: assignee.id }, data: { waiverRequestStatus: 'pending', waiverRequestReason: String(reason).trim(), waiverRequestedAt: new Date() } });
    const updated = await prisma.workAssignment.findUnique({ where: { id: assignmentId }, include: { createdBy: { select: { id: true, username: true } }, assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } } } });
    return updated ? mapWorkAssignment(updated) : null;
  },

  async reviewWorkAssignmentWaiver(assignmentId: string, personnelId: string, action: 'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty' | 'confirm' | 'waive', reviewerId: string, note?: string, penaltyRate?: number): Promise<WorkAssignment | null> {
    const assignee = await prisma.workAssignmentAssignee.findUnique({ where: { assignmentId_personnelId: { assignmentId, personnelId: Number(personnelId) } }, include: { assignment: true, personnel: { select: { baseSalary: true } } } });
    if (!assignee) return null;
    const legacyAction = action === 'confirm' || action === 'waive';
    const canReviewOverdueWithoutWaiver = assignee.violationStatus === 'under_review'
      && ['pending', 'overdue'].includes(assignee.responseStatus)
      && assignee.waiverRequestStatus !== 'pending';
    if (!legacyAction && assignee.waiverRequestStatus !== 'pending' && !canReviewOverdueWithoutWaiver) throw new Error('Yêu cầu giải trình này đã được xử lý');
    const normalizedRate = penaltyRate == null ? undefined : Number(penaltyRate);
    if (action === 'reduced_penalty' && (normalizedRate === undefined || !Number.isFinite(normalizedRate) || normalizedRate < 0 || normalizedRate > 100)) throw new Error('Tỷ lệ phạt phải từ 0 đến 100%');
    const configuredPenalty = calculateAssignmentPenalty(assignee.assignment.penaltyType as any, num(assignee.assignment.penaltyValue), num(assignee.personnel.baseSalary));
    const appliesPenalty = action === 'confirm' || action === 'penalty' || action === 'reduced_penalty';
    if ((action === 'penalty' || action === 'reduced_penalty') && configuredPenalty <= 0) throw new Error('Công việc chưa có định mức phạt để áp dụng');
    const appliedRate = action === 'confirm' || action === 'penalty' ? 100 : action === 'reduced_penalty' ? normalizedRate : 0;
    const penaltyAmount = appliesPenalty ? configuredPenalty * (appliedRate ?? 0) / 100 : 0;
    const accepted = action === 'accept';
    await prisma.workAssignmentAssignee.update({ where: { id: assignee.id }, data: { responseStatus: legacyAction ? assignee.responseStatus : accepted ? 'accepted' : 'declined', responseNote: legacyAction ? assignee.responseNote : accepted ? 'Quản lý xác nhận tham gia theo giải trình' : 'Không tham gia theo giải trình', violationStatus: appliesPenalty ? 'confirmed' : 'waived', penaltyAmount, penaltyRate: appliedRate, violationNote: note ? String(note).trim() : null, reviewedAt: new Date(), waiverRequestStatus: legacyAction ? action === 'waive' ? 'approved' : 'rejected' : appliesPenalty ? 'rejected' : 'approved', waiverDecision: legacyAction ? action === 'confirm' ? 'penalty' : 'no_penalty' : action, waiverReviewedAt: new Date(), waiverReviewedById: Number(reviewerId), waiverReviewNote: note ? String(note).trim() : null } });
    const updated = await prisma.workAssignment.findUnique({ where: { id: assignmentId }, include: { createdBy: { select: { id: true, username: true } }, assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } } } });
    return updated ? mapWorkAssignment(updated) : null;
  },

  async getWorkAssignmentDelegations(directorId?: string) {
    return prisma.workAssignmentApprovalDelegation.findMany({ where: directorId ? { directorId: Number(directorId) } : undefined, include: { delegate: { select: { id: true, username: true, roleTitle: true } }, director: { select: { id: true, username: true } } }, orderBy: { startsAt: 'desc' } });
  },

  async createWorkAssignmentDelegation(directorId: string, delegateId: string, startsAt: string, endsAt: string) {
    const start = parseDateOrNull(startsAt); const end = parseDateOrNull(endsAt);
    if (!start || !end || end <= start) throw new Error('Khoảng thời gian ủy quyền không hợp lệ');
    if (Number(directorId) === Number(delegateId)) throw new Error('Không thể tự ủy quyền cho chính mình');
    return prisma.workAssignmentApprovalDelegation.create({ data: { directorId: Number(directorId), delegateId: Number(delegateId), startsAt: start, endsAt: end } });
  },

  async revokeWorkAssignmentDelegation(id: string, directorId: string) {
    return prisma.workAssignmentApprovalDelegation.updateMany({ where: { id, directorId: Number(directorId), revokedAt: null }, data: { revokedAt: new Date(), revokedById: Number(directorId) } });
  },

  async canReviewWorkAssignmentWaiver(userId: string) {
    const effectiveNow = await getEffectiveSystemDate();
    const delegation = await prisma.workAssignmentApprovalDelegation.findFirst({ where: { delegateId: Number(userId), startsAt: { lte: effectiveNow }, endsAt: { gt: effectiveNow }, revokedAt: null } });
    return Boolean(delegation);
  },

  async isWorkAssignmentCreator(assignmentId: string, userId: string) {
    const assignment = await prisma.workAssignment.findUnique({ where: { id: assignmentId }, select: { createdById: true } });
    return Boolean(assignment && Number(assignment.createdById) === Number(userId));
  },

  async completeWorkAssignment(assignmentId: string, personnelId: string, note?: string): Promise<WorkAssignment | null> {
    const effectiveNow = await getEffectiveSystemDate();
    const assignment = await prisma.workAssignment.findUnique({ where: { id: assignmentId }, select: { startAt: true, status: true } });
    if (!assignment || assignment.status === 'cancelled') return null;
    if (assignment.startAt && assignment.startAt > effectiveNow) {
      throw new Error('Chưa đến thời gian thực hiện công tác');
    }
    await prisma.workAssignmentAssignee.update({
      where: { assignmentId_personnelId: { assignmentId, personnelId: Number(personnelId) } },
      data: { responseStatus: 'completed', completedAt: new Date(), completedNote: note ? String(note).trim() : null }
    });
    const updated = await prisma.workAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        createdBy: { select: { id: true, username: true } },
        assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } }
      }
    });
    return updated ? mapWorkAssignment(updated) : null;
  },

  async reviewWorkAssignmentViolation(assignmentId: string, personnelId: string, action: 'confirm' | 'waive', note?: string): Promise<WorkAssignment | null> {
    const assignee = await prisma.workAssignmentAssignee.findUnique({
      where: { assignmentId_personnelId: { assignmentId, personnelId: Number(personnelId) } },
      include: { assignment: true, personnel: { select: { baseSalary: true } } }
    });
    if (!assignee) return null;
    const penaltyAmount = action === 'confirm'
      ? calculateAssignmentPenalty(assignee.assignment.penaltyType as any, num(assignee.assignment.penaltyValue), num(assignee.personnel.baseSalary))
      : 0;
    await prisma.workAssignmentAssignee.update({
      where: { id: assignee.id },
      data: {
        violationStatus: action === 'confirm' ? 'confirmed' : 'waived',
        penaltyAmount,
        violationNote: note ? String(note).trim() : null,
        reviewedAt: new Date()
      }
    });
    const updated = await prisma.workAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        createdBy: { select: { id: true, username: true } },
        assignees: { include: { personnel: { select: { realName: true, stageName: true, department: true, baseSalary: true } } } }
      }
    });
    return updated ? mapWorkAssignment(updated) : null;
  },

  // 7. WORK SCHEDULES (LỊCH TRỰC LIVE / STUDIO)
  // ==========================================
  async getSchedules(): Promise<WorkScheduleSlot[]> {
    const list = await prisma.workSchedule.findMany({
      where: { personnel: businessPersonnelRelation },
      include: { activityType: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    return list.map(s => ({
      id: s.id,
      idolId: String(s.personnelId),
      activityCode: s.activityType?.code || undefined,
      dayOfWeek: s.dayOfWeek,
      shiftType: s.shiftType as any,
      startTime: s.startTime,
      endTime: s.endTime,
      platform: s.platform,
      title: s.title,
      notes: s.notes || undefined,
      isActive: s.isActive,
      repeatType: (s.repeatType as any) || 'fixed_year',
      specificMonth: s.specificMonth || undefined,
      specificDate: toIsoDate(s.specificDate)
    }));
  },

  async getSchedulesByIdol(idolIdStr: string): Promise<WorkScheduleSlot[]> {
    const pid = Number(idolIdStr);
    if (isNaN(pid)) return [];
    const list = await prisma.workSchedule.findMany({
      where: { personnelId: pid, personnel: businessPersonnelRelation },
      include: { activityType: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    return list.map(s => ({
      id: s.id,
      idolId: String(s.personnelId),
      activityCode: s.activityType?.code || undefined,
      dayOfWeek: s.dayOfWeek,
      shiftType: s.shiftType as any,
      startTime: s.startTime,
      endTime: s.endTime,
      platform: s.platform,
      title: s.title,
      notes: s.notes || undefined,
      isActive: s.isActive,
      repeatType: (s.repeatType as any) || 'fixed_year',
      specificMonth: s.specificMonth || undefined,
      specificDate: toIsoDate(s.specificDate)
    }));
  },

  async createSchedule(payload: any): Promise<WorkScheduleSlot> {
    const personnelId = Number(payload.idolId);
    await assertBusinessPersonnel(personnelId);
    const activityTypeId = await resolvePersonnelActivityTypeId(personnelId, payload);
    const created = await prisma.workSchedule.create({
      data: {
        personnelId,
        activityTypeId,
        dayOfWeek: Number(payload.dayOfWeek) || 1,
        shiftType: payload.shiftType || 'evening',
        startTime: payload.startTime,
        endTime: payload.endTime,
        platform: payload.platform || 'TikTok Live',
        title: payload.title || 'Ca Live Stream',
        notes: payload.notes || null,
        isActive: payload.isActive !== false,
        repeatType: payload.repeatType || 'fixed_year',
        specificMonth: payload.specificMonth || null,
        specificDate: parseDateOrNull(payload.specificDate)
      }
    });
    return {
      id: created.id,
      idolId: String(created.personnelId),
      activityCode: activityTypeId ? (await prisma.personnelActivityType.findUnique({ where: { id: activityTypeId }, select: { code: true } }))?.code : undefined,
      dayOfWeek: created.dayOfWeek,
      shiftType: created.shiftType as any,
      startTime: created.startTime,
      endTime: created.endTime,
      platform: created.platform,
      title: created.title,
      notes: created.notes || undefined,
      isActive: created.isActive,
      repeatType: (created.repeatType as any) || 'fixed_year',
      specificMonth: created.specificMonth || undefined,
      specificDate: toIsoDate(created.specificDate)
    };
  },

  async updateSchedule(id: string, payload: any): Promise<WorkScheduleSlot | null> {
    const data: any = {};
    const existingSchedule = await prisma.workSchedule.findUnique({ where: { id }, select: { personnelId: true } });
    if (!existingSchedule) return null;
    await assertBusinessPersonnel(existingSchedule.personnelId);
    if (payload.activityCode !== undefined || payload.activityTypeId !== undefined) {
      data.activityTypeId = await resolvePersonnelActivityTypeId(existingSchedule.personnelId, payload);
    }
    if (payload.dayOfWeek !== undefined) data.dayOfWeek = Number(payload.dayOfWeek);
    if (payload.shiftType !== undefined) data.shiftType = payload.shiftType;
    if (payload.startTime !== undefined) data.startTime = payload.startTime;
    if (payload.endTime !== undefined) data.endTime = payload.endTime;
    if (payload.platform !== undefined) data.platform = payload.platform;
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.notes !== undefined) data.notes = payload.notes;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
    if (payload.repeatType !== undefined) data.repeatType = payload.repeatType;
    if (payload.specificMonth !== undefined) data.specificMonth = payload.specificMonth;
    if (payload.specificDate !== undefined) data.specificDate = parseDateOrNull(payload.specificDate);

    const updated = await prisma.workSchedule.update({
      where: { id },
      data,
      include: { activityType: true }
    });
    return {
      id: updated.id,
      idolId: String(updated.personnelId),
      activityCode: updated.activityType?.code || undefined,
      dayOfWeek: updated.dayOfWeek,
      shiftType: updated.shiftType as any,
      startTime: updated.startTime,
      endTime: updated.endTime,
      platform: updated.platform,
      title: updated.title,
      notes: updated.notes || undefined,
      isActive: updated.isActive,
      repeatType: (updated.repeatType as any) || 'fixed_year',
      specificMonth: updated.specificMonth || undefined,
      specificDate: toIsoDate(updated.specificDate)
    };
  },

  async deleteSchedule(id: string): Promise<boolean> {
    try {
      await prisma.workSchedule.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async batchSetIdolSchedules(idolIdStr: string, slots: any[]): Promise<WorkScheduleSlot[]> {
    const personnelId = Number(idolIdStr);
    if (isNaN(personnelId)) return [];
    await prisma.workSchedule.deleteMany({ where: { personnelId } });
    for (const s of slots) {
      await this.createSchedule({ ...s, idolId: idolIdStr });
    }
    return this.getSchedulesByIdol(idolIdStr);
  },

  // ==========================================
  // 7. AUTH & USERS
  // ==========================================
  async authenticate(usernameOrEmail: string, pass: string): Promise<{ success: boolean; user?: UserAccount; error?: string; status?: number }> {
    const clean = usernameOrEmail.trim().toLowerCase();
    const user = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { username: { equals: clean, mode: 'insensitive' } },
          { email: { equals: clean, mode: 'insensitive' } }
        ]
      },
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } }
    });

    if (!user) {
      return { success: false, error: 'Tài khoản không tồn tại trên hệ thống', status: 404 };
    }

    const passwordMatches = isPasswordHash(user.password)
      ? await verifyPassword(pass, user.password)
      : user.password === pass;
    if (!passwordMatches) {
      return { success: false, error: 'Mật khẩu đăng nhập không chính xác', status: 401 };
    }

    if (!isPasswordHash(user.password)) {
      await prisma.userAccount.update({ where: { id: user.id }, data: { password: await hashPassword(pass) } });
    }

    if (user.status === 'Đã khóa' || user.status === 'Tạm khóa') {
      return { success: false, error: 'Tài khoản của bạn đã bị khóa', status: 403 };
    }

    return { success: true, user: mapDbUser(user) };
  },

  async updateUserProfile(userIdStr: string, updates: any): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const userId = Number(userIdStr);
    if (isNaN(userId)) return { success: false, error: 'ID người dùng không hợp lệ' };
    const user = await prisma.userAccount.findUnique({
      where: { id: userId },
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } }
    });
    if (!user) return { success: false, error: 'Không tìm thấy người dùng' };

    if (updates.currentPassword && updates.newPassword) {
      const currentPasswordMatches = isPasswordHash(user.password)
        ? await verifyPassword(updates.currentPassword, user.password)
        : user.password === updates.currentPassword;
      if (!currentPasswordMatches) {
        return { success: false, error: 'Mật khẩu hiện tại không đúng' };
      }
      await prisma.userAccount.update({
        where: { id: userId },
        data: { password: await hashPassword(updates.newPassword) }
      });
    }

    if (updates.avatarUrl) {
      await prisma.userAccount.update({
        where: { id: userId },
        data: { avatarUrl: updates.avatarUrl }
      });
    }

    if (user.personnelProfile) {
      const pUpdates: any = {};
      if (updates.name && updates.name.trim()) pUpdates.realName = updates.name.trim();
      if (updates.realName && updates.realName.trim()) pUpdates.realName = updates.realName.trim();
      if (updates.stageName && updates.stageName.trim()) pUpdates.stageName = updates.stageName.trim();
      if (updates.dob && updates.dob.trim()) pUpdates.dob = new Date(updates.dob.trim());
      if (updates.hometown && updates.hometown.trim()) pUpdates.hometown = updates.hometown.trim();
      if (updates.height && Number(updates.height) > 0) pUpdates.height = Number(updates.height);
      if (updates.weight && Number(updates.weight) > 0) pUpdates.weight = Number(updates.weight);
      if (updates.phone) pUpdates.phone = updates.phone.trim();
      if (updates.address) pUpdates.currentLiving = updates.address.trim();
      if (updates.avatarUrl) pUpdates.avatarUrl = updates.avatarUrl.trim();
      await prisma.personnel.update({
        where: { id: user.personnelProfile.id },
        data: pUpdates
      });
    }

    const refreshed = await prisma.userAccount.findUnique({
      where: { id: userId },
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } }
    });
    return { success: true, user: mapDbUser(refreshed) };
  },

  async getUsers(): Promise<UserAccount[]> {
    const list = await prisma.userAccount.findMany({
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } },
      orderBy: { id: 'asc' }
    });
    return list.map(mapDbUser);
  },

  async getPersonnelForUser(userIdStr: string): Promise<{ id: string; realName: string; stageName?: string; department: string } | null> {
    const userId = Number(userIdStr);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    const personnel = await prisma.personnel.findUnique({
      where: { userId },
      select: { id: true, realName: true, stageName: true, department: true }
    });
    if (!personnel) return null;
    return {
      id: String(personnel.id),
      realName: personnel.realName,
      stageName: personnel.stageName || undefined,
      department: personnel.department
    };
  },

  async createUser(payload: any): Promise<UserAccount> {
    const accountType = payload.accountType === 'system_admin' ? 'system_admin' : 'personnel';
    const isSystemAdmin = accountType === 'system_admin';
    const created = await prisma.userAccount.create({
      data: {
        username: payload.username,
        email: payload.email,
        password: await hashPassword(resolveInitialPassword(payload.password)),
        role: payload.role || 'viewer',
        roleTitle: payload.roleTitle || 'Nhân Viên',
        accountType,
        isSuperAdmin: isSystemAdmin,
        isBusinessAdmin: !isSystemAdmin && payload.isBusinessAdmin === true,
        allowedTabs: isSystemAdmin ? SYSTEM_ADMIN_TABS : (payload.isBusinessAdmin === true ? BUSINESS_ADMIN_TABS : (payload.allowedTabs || [])),
        allowedDepartments: isSystemAdmin || payload.isBusinessAdmin === true ? ['*'] : (payload.allowedDepartments || []),
        allowedActions: isSystemAdmin ? SYSTEM_ADMIN_ACTIONS : (payload.isBusinessAdmin === true ? BUSINESS_ADMIN_ACTIONS : (payload.allowedActions || [])),
        avatarUrl: payload.avatarUrl || null,
        status: payload.status || 'Đang hoạt động'
      },
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } }
    });
    await syncUserRoleAssignments(created.id, payload.roleCodes || (isSystemAdmin ? ['system_admin'] : undefined));
    const refreshed = await prisma.userAccount.findUnique({
      where: { id: created.id },
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } }
    });
    return mapDbUser(refreshed);
  },

  async updateUser(idStr: string, payload: any): Promise<UserAccount | null> {
    const id = Number(idStr);
    if (isNaN(id)) return null;

    const currentUser = await prisma.userAccount.findUnique({
      where: { id },
      select: {
        username: true,
        accountType: true,
        personnelProfile: { select: { id: true } },
        roleAssignments: { include: { role: { select: { code: true } } } }
      }
    });
    if (!currentUser) return null;
    const isImmutableRootAdmin = currentUser.username === 'admin';
    const requestedRoleCodes = Array.isArray(payload.roleCodes) ? payload.roleCodes : undefined;
    const hasRequestedSystemAdmin = requestedRoleCodes?.includes('system_admin') === true;
    const currentlySystemAdmin = currentUser.accountType === 'system_admin' || currentUser.roleAssignments.some((assignment) => assignment.role.code === 'system_admin');
    const wantsSystemAdmin = hasRequestedSystemAdmin || payload.accountType === 'system_admin' || payload.isSuperAdmin === true;
    const demotesSystemAdmin = currentlySystemAdmin && (requestedRoleCodes ? !hasRequestedSystemAdmin : payload.accountType === 'personnel' && payload.isSuperAdmin === false);
    const roleCodesToSync = requestedRoleCodes || (demotesSystemAdmin
      ? currentUser.roleAssignments.map((assignment) => assignment.role.code).filter((code) => code !== 'system_admin')
      : (isImmutableRootAdmin ? ['system_admin', ...currentUser.roleAssignments.map((assignment) => assignment.role.code)] : undefined));

    const data: any = {};
    if (payload.username !== undefined) data.username = payload.username;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.role !== undefined) data.role = payload.role;
    if (payload.roleTitle !== undefined) data.roleTitle = payload.roleTitle;
    if (payload.accountType !== undefined) data.accountType = payload.accountType === 'system_admin' ? 'system_admin' : 'personnel';
    if (payload.isSuperAdmin !== undefined) data.isSuperAdmin = payload.isSuperAdmin;
    if (payload.isBusinessAdmin !== undefined) data.isBusinessAdmin = payload.isBusinessAdmin === true;
    if (payload.allowedTabs !== undefined) data.allowedTabs = payload.allowedTabs;
    if (payload.allowedDepartments !== undefined) data.allowedDepartments = payload.allowedDepartments;
    if (payload.allowedActions !== undefined) data.allowedActions = payload.allowedActions;
    if (payload.isBusinessAdmin === true && !wantsSystemAdmin) {
      data.allowedTabs = BUSINESS_ADMIN_TABS;
      data.allowedDepartments = ['*'];
      data.allowedActions = BUSINESS_ADMIN_ACTIONS;
    }
    if (payload.avatarUrl !== undefined) data.avatarUrl = payload.avatarUrl;
    if (payload.password !== undefined) data.password = await hashPassword(payload.password);
    if (payload.status !== undefined) data.status = payload.status;
    if (wantsSystemAdmin) {
      data.accountType = 'system_admin';
      data.isSuperAdmin = true;
      data.isBusinessAdmin = false;
      data.allowedTabs = SYSTEM_ADMIN_TABS;
      data.allowedDepartments = ['*'];
      data.allowedActions = SYSTEM_ADMIN_ACTIONS;
    }

    if (isImmutableRootAdmin) {
      data.accountType = 'system_admin';
      data.isSuperAdmin = true;
      data.isBusinessAdmin = false;
      data.allowedTabs = SYSTEM_ADMIN_TABS;
      data.allowedDepartments = ['*'];
      data.allowedActions = SYSTEM_ADMIN_ACTIONS;
    }

    if (demotesSystemAdmin) {
      const systemAdminCount = await prisma.userAccount.count({ where: { accountType: 'system_admin' } });
      if (currentUser.username === 'admin' || systemAdminCount <= 1) {
        throw new Error('KhÃ´ng thá»ƒ gá»¡ tÃ i khoáº£n System Admin gá»‘c hoáº·c System Admin cuá»‘i cÃ¹ng');
      }
      data.accountType = 'personnel';
      data.isSuperAdmin = false;
      data.isBusinessAdmin = false;
      data.allowedTabs = payload.allowedTabs || ['roster', 'schedule', 'tasks'];
      data.allowedDepartments = payload.allowedDepartments || ['*'];
      data.allowedActions = payload.allowedActions || [];
    }

    // System Admin permissions are normalized unless this explicit, guarded
    // demotion path is used by the System Admin management UI.
    if ((currentUser.accountType === 'system_admin' && !demotesSystemAdmin) || data.accountType === 'system_admin') {
      data.accountType = 'system_admin';
      data.isSuperAdmin = true;
      data.isBusinessAdmin = false;
      data.allowedTabs = SYSTEM_ADMIN_TABS;
      data.allowedDepartments = ['*'];
      data.allowedActions = SYSTEM_ADMIN_ACTIONS;
    }

    const updated = await prisma.userAccount.update({
      where: { id },
      data,
      include: { personnelProfile: true, roleAssignments: { include: { role: true } } }
    });
    if (roleCodesToSync) await syncUserRoleAssignments(id, roleCodesToSync);
    const refreshed = roleCodesToSync
      ? await prisma.userAccount.findUnique({ where: { id }, include: { personnelProfile: true, roleAssignments: { include: { role: true } } } })
      : updated;
    return mapDbUser(refreshed);
  },

  async deleteUser(idStr: string): Promise<boolean> {
    const id = Number(idStr);
    if (isNaN(id)) return false;
    const user = await prisma.userAccount.findUnique({ where: { id } });
    if (user?.username === 'admin' || user?.isSuperAdmin) {
      return false; // Không thể xóa tài khoản Super Admin
    }
    try {
      await prisma.userAccount.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async syncIdolsWithUsers(): Promise<{ synced: number }> {
    return { synced: 0 };
  },

  // ==========================================
  // 8. APPROVAL REQUESTS
  // ==========================================
  async getApprovals(status?: string): Promise<ApprovalRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    const list = await prisma.approvalRequest.findMany({
      where,
      include: { requestedBy: true, reviewedBy: true, targetPersonnel: true },
      orderBy: { createdAt: 'desc' }
    });

    return list.map(a => ({
      id: a.id,
      type: a.type as any,
      status: a.status as any,
      targetIdolId: a.targetPersonnelId ? String(a.targetPersonnelId) : undefined,
      targetName: a.targetName,
      reason: a.reason || undefined,
      data: (a.data as any) || undefined,
      requestedBy: {
        id: String(a.requestedBy.id),
        username: a.requestedBy.username,
        name: a.requestedBy.username,
        roleTitle: a.requestedBy.roleTitle || 'Thành viên'
      },
      reviewedBy: a.reviewedBy
        ? { id: String(a.reviewedBy.id), name: a.reviewedBy.username }
        : undefined,
      reviewNote: a.reviewNote || undefined,
      createdAt: a.createdAt.toISOString(),
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : undefined
    }));
  },

  async createApproval(payload: any): Promise<ApprovalRequest> {
    const rawTargetId = payload.targetPersonnelId ?? payload.targetIdolId;
    const targetPersonnelId = rawTargetId && !isNaN(Number(rawTargetId)) ? Number(rawTargetId) : null;
    const reqById = payload.requestedBy?.id ? Number(payload.requestedBy.id) : 1;
    const effDate = await getEffectiveSystemDate();

    const created = await prisma.approvalRequest.create({
      data: {
        type: payload.type || 'update_idol',
        status: 'pending',
        targetPersonnelId: targetPersonnelId,
        targetName: payload.targetName || 'Yêu cầu',
        reason: payload.reason || null,
        data: payload.data || null,
        requestedById: !isNaN(reqById) ? reqById : 1,
        createdAt: effDate
      },
      include: { requestedBy: true }
    });

    return {
      id: created.id,
      type: created.type as any,
      status: created.status as any,
      targetIdolId: created.targetPersonnelId ? String(created.targetPersonnelId) : undefined,
      targetName: created.targetName,
      reason: created.reason || undefined,
      data: (created.data as any) || undefined,
      requestedBy: {
        id: String(created.requestedBy.id),
        username: created.requestedBy.username,
        name: created.requestedBy.username,
        roleTitle: created.requestedBy.roleTitle || 'Thành viên'
      },
      createdAt: created.createdAt.toISOString()
    };
  },

  async approveApproval(id: string, reviewer: any, note?: string, db: DbClient = prisma): Promise<any> {
    if (db === prisma) return prisma.$transaction((tx) => this.approveApproval(id, reviewer, note, tx));
    const approval = await db.approvalRequest.findUnique({ where: { id } });
    if (!approval) return null;
    const revId = reviewer?.id ? Number(reviewer.id) : 1;

    const approvalData: any = typeof approval.data === 'object' && approval.data !== null ? approval.data : {};
    let targetPersonnelIdNum: number | null = approval.targetPersonnelId ?? (approvalData.id ? Number(approvalData.id) : null);

    let createdIdol: Idol | undefined;
    let deletedIdolId: string | undefined;

    if (approval.type === 'create_idol') {
      let existing: Idol | null = null;
      if (targetPersonnelIdNum && !isNaN(targetPersonnelIdNum)) {
        existing = await this.getIdolById(String(targetPersonnelIdNum), undefined, db);
      }
      if (!existing && (approvalData.realName || approvalData.stageName)) {
        const found = await db.personnel.findFirst({
          where: {
            OR: [
              ...(approvalData.realName ? [{ realName: approvalData.realName }] : []),
              ...(approvalData.stageName ? [{ stageName: approvalData.stageName }] : [])
            ]
          },
          include: { user: true }
        });
        if (found) existing = mapPersonnelToIdol(found);
      }

      if (existing) {
        targetPersonnelIdNum = Number(existing.id);
        const nextStatus = existing.personnelType === 'Dịch vụ ngoài' ? '' : 'Đang hoạt động';
        createdIdol = (await this.updateIdol(existing.id, { status: nextStatus }, undefined, db)) || undefined;
        if (existing.userId) {
          await db.userAccount.update({
            where: { id: Number(existing.userId) },
            data: { status: 'Đang hoạt động' }
          }).catch(() => {});
        }
      } else if (approval.data) {
        createdIdol = await this.createIdol({
          ...approvalData,
          status: approvalData.personnelType === 'Dịch vụ ngoài' ? '' : 'Đang hoạt động'
        }, reviewer, db);
        if (createdIdol) {
          targetPersonnelIdNum = Number(createdIdol.id);
        }
      }
    } else if (approval.type === 'update_idol' && targetPersonnelIdNum && !isNaN(targetPersonnelIdNum)) {
      await this.updateIdol(String(targetPersonnelIdNum), approvalData, reviewer, db);
    } else if (approval.type === 'delete_idol' && approval.targetPersonnelId) {
      deletedIdolId = String(approval.targetPersonnelId);
      await this.deleteIdol(deletedIdolId, db);
    }

    const effDate = await getEffectiveSystemDate(db);
    const updated = await db.approvalRequest.update({
      where: { id },
      data: {
        status: 'approved',
        targetPersonnelId: targetPersonnelIdNum && !isNaN(targetPersonnelIdNum) ? targetPersonnelIdNum : approval.targetPersonnelId,
        reviewedById: !isNaN(revId) ? revId : 1,
        reviewNote: note || 'Đã phê duyệt',
        reviewedAt: effDate
      },
      include: { requestedBy: true, reviewedBy: true }
    });

    return { approval: updated, createdIdol, deletedIdolId };
  },

  async rejectApproval(id: string, reviewer: any, reason?: string): Promise<any> {
    const revId = reviewer?.id ? Number(reviewer.id) : 1;
    const effDate = await getEffectiveSystemDate();
    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedById: !isNaN(revId) ? revId : 1,
        reviewNote: reason || 'Từ chối yêu cầu',
        reviewedAt: effDate
      }
    });
    return updated;
  },

  async deleteApproval(id: string): Promise<boolean> {
    try {
      await prisma.approvalRequest.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ==========================================
  // 9. LEAVE REQUESTS (NGHỈ PHÉP)
  // ==========================================
  async getLeaveRequests(idolIdStr?: string): Promise<LeaveRequest[]> {
    const where: any = {};
    if (idolIdStr) {
      const pid = Number(idolIdStr);
      if (!isNaN(pid)) where.personnelId = pid;
    }
    where.personnel = businessPersonnelRelation;
    const list = await prisma.leaveRequest.findMany({
      where,
      include: { reviewedBy: true },
      orderBy: { createdAt: 'desc' }
    });

    return list.map(l => ({
      id: l.id,
      idolId: String(l.personnelId),
      idolName: l.personnelName,
      department: l.department,
      leaveType: l.leaveType as any,
      startDate: toIsoDate(l.startDate) || '2026-10-01',
      endDate: toIsoDate(l.endDate) || '2026-10-01',
      totalDays: num(l.totalDays),
      annualLeaveDays: num(l.annualLeaveDays),
      unpaidLeaveDays: num(l.unpaidLeaveDays),
      allocationConfirmed: l.allocationConfirmed,
      reason: l.reason,
      status: l.status as any,
      approverRoleRequired: (l.approverRoleRequired as any) || undefined,
      autoApproved: l.autoApproved,
      reviewedBy: l.reviewedBy ? { id: String(l.reviewedBy.id), name: l.reviewedBy.username } : undefined,
      reviewNote: l.reviewNote || undefined,
      reviewedAt: l.reviewedAt ? l.reviewedAt.toISOString() : undefined,
      createdAt: l.createdAt.toISOString()
    }));
  },

  async createLeaveRequest(payload: any): Promise<LeaveRequest> {
    const personnelId = Number(payload.idolId);
    await assertBusinessPersonnel(personnelId);
    const effDate = await getEffectiveSystemDate();
    const personnel = await prisma.personnel.findUnique({ where: { id: personnelId }, select: { joinDate: true } });
    const quota = calculateAnnualLeaveQuota(
      personnel?.joinDate ? personnel.joinDate.toISOString().slice(0, 10) : undefined,
      effDate.toISOString().slice(0, 10)
    );
    const existingLeaves = await prisma.leaveRequest.findMany({
      where: { personnelId },
      select: { leaveType: true, status: true, totalDays: true, annualLeaveDays: true }
    });
    const remainingAnnualDays = Math.max(0, quota.totalDays - getReservedAnnualLeaveDays({
      totalAnnualDays: quota.totalDays,
      requests: existingLeaves.map((leave) => ({
      leaveType: leave.leaveType as any,
      status: leave.status as any,
      totalDays: num(leave.totalDays),
      annualLeaveDays: num(leave.annualLeaveDays)
      }))
    }));
    const allocation = calculateLeaveAllocation(
      payload.leaveType || 'annual',
      Number(payload.totalDays) || 1,
      remainingAnnualDays,
      payload.allocationConfirmed === true
    );
    if (allocation.requiresConfirmation) {
      const error = new Error('LEAVE_ALLOCATION_CONFIRMATION_REQUIRED');
      (error as any).allocation = allocation;
      (error as any).remainingAnnualDays = remainingAnnualDays;
      throw error;
    }
    const created = await prisma.leaveRequest.create({
      data: {
        personnelId,
        personnelName: payload.idolName || 'Nhân sự',
        department: payload.department || 'Phòng Idol',
        leaveType: payload.leaveType || 'annual',
        startDate: parseDateOrNull(payload.startDate) || effDate,
        endDate: parseDateOrNull(payload.endDate) || effDate,
        totalDays: new Prisma.Decimal(payload.totalDays || 1),
        annualLeaveDays: new Prisma.Decimal(allocation.annualLeaveDays),
        unpaidLeaveDays: new Prisma.Decimal(allocation.unpaidLeaveDays),
        allocationConfirmed: payload.allocationConfirmed === true || allocation.unpaidLeaveDays === 0,
        reason: payload.reason || 'Nghỉ phép',
        status: payload.status || 'pending',
        approverRoleRequired: payload.approverRoleRequired || null,
        autoApproved: !!payload.autoApproved,
        createdAt: effDate
      }
    });

    return {
      id: created.id,
      idolId: String(created.personnelId),
      idolName: created.personnelName,
      department: created.department,
      leaveType: created.leaveType as any,
      startDate: toIsoDate(created.startDate) || '2026-10-01',
      endDate: toIsoDate(created.endDate) || '2026-10-01',
      totalDays: num(created.totalDays),
      reason: created.reason,
      status: created.status as any,
      autoApproved: created.autoApproved,
      createdAt: created.createdAt.toISOString()
    };
  },

  async updateLeaveRequest(id: string, updates: any): Promise<LeaveRequest | null> {
    const existing = await prisma.leaveRequest.findUnique({ where: { id }, select: { personnelId: true } });
    if (!existing) return null;
    await assertBusinessPersonnel(existing.personnelId);
    const data: any = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.reviewNote !== undefined) data.reviewNote = updates.reviewNote;
    if (updates.reviewedAt !== undefined) {
      data.reviewedAt = parseDateOrNull(updates.reviewedAt);
    } else if (updates.status === 'approved' || updates.status === 'rejected') {
      data.reviewedAt = await getEffectiveSystemDate();
    }
    if (updates.reviewedBy?.id) {
      const revId = Number(updates.reviewedBy.id);
      if (!isNaN(revId)) data.reviewedById = revId;
    }
    if (updates.reviewedById !== undefined) {
      const reviewerId = Number(updates.reviewedById);
      if (Number.isInteger(reviewerId) && reviewerId > 0) data.reviewedById = reviewerId;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data,
      include: { reviewedBy: true }
    });

    return {
      id: updated.id,
      idolId: String(updated.personnelId),
      idolName: updated.personnelName,
      department: updated.department,
      leaveType: updated.leaveType as any,
      startDate: toIsoDate(updated.startDate) || '2026-10-01',
      endDate: toIsoDate(updated.endDate) || '2026-10-01',
      totalDays: num(updated.totalDays),
      annualLeaveDays: num(updated.annualLeaveDays),
      unpaidLeaveDays: num(updated.unpaidLeaveDays),
      allocationConfirmed: updated.allocationConfirmed,
      reason: updated.reason,
      status: updated.status as any,
      reviewedBy: updated.reviewedBy ? { id: String(updated.reviewedBy.id), name: updated.reviewedBy.username } : undefined,
      reviewNote: updated.reviewNote || undefined,
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : undefined,
      createdAt: updated.createdAt.toISOString()
    };
  },

  async deleteLeaveRequest(id: string): Promise<boolean> {
    try {
      await prisma.leaveRequest.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ==========================================
  // 10. PAYROLL (BẢNG LƯƠNG & CHI TRẢ THU NHẬP)
  // ==========================================
  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    // Khi bước sang tháng mới, kỳ lương của tháng liền trước phải xuất hiện
    // ngay cả khi chưa có thao tác thủ công tạo kỳ. Mốc tính dùng cùng
    // referenceDate với toàn hệ thống để không lệch với UI/Admin settings.
    const settings = await this.getSettings();
    const referenceDate = settings.referenceDate?.trim() || toIsoDate(new Date()) || '';
    const referenceParts = referenceDate.split('-').map(Number);
    if (referenceParts.length === 3 && referenceParts.every(Number.isFinite)) {
      const [referenceYear, referenceMonth] = referenceParts;
      const previousMonth = new Date(referenceYear, referenceMonth - 2, 1);
      const payrollPeriod = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
      const periodId = `payroll-${payrollPeriod}`;
      const existing = await prisma.payrollPeriod.findUnique({ where: { period: payrollPeriod } });
      if (!existing) {
        const calendar = payrollCalendarForPeriod(payrollPeriod);
        await prisma.payrollPeriod.create({
          data: {
            id: periodId,
            period: payrollPeriod,
            status: 'draft',
            feedbackStartsAt: toPrismaDateOnly(calendar.feedbackStartsAt),
            approvalStartsAt: toPrismaDateOnly(calendar.approvalStartsAt),
            lockStartsAt: toPrismaDateOnly(calendar.lockStartsAt)
          }
        });
        await this.syncPayrollPeriod(periodId);
      }
    }
    const list = await prisma.payrollPeriod.findMany({
      include: { submittedBy: true, approvedBy: true },
      orderBy: { period: 'desc' }
    });
    return list.map(p => ({
      id: p.id,
      period: p.period,
      status: p.status as any,
      totalGross: num(p.totalGross),
      totalKpiBonus: num(p.totalKpiBonus),
      totalHotBonus: num(p.totalHotBonus),
      totalDeductions: num(p.totalDeductions),
      totalNet: num(p.totalNet),
      employeeCount: p.employeeCount,
      ...payrollCalendarForPeriod(p.period, p),
      submittedBy: p.submittedBy
        ? { id: String(p.submittedBy.id), name: p.submittedBy.username, roleTitle: p.submittedBy.roleTitle || 'Chuyên Viên Nhân Sự & Kế Toán' }
        : undefined,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : undefined,
      approvedBy: p.approvedBy ? { id: String(p.approvedBy.id), name: p.approvedBy.username } : undefined,
      approvedAt: p.approvedAt ? p.approvedAt.toISOString() : undefined,
      lockedAt: p.lockedAt ? p.lockedAt.toISOString() : undefined,
      createdAt: p.createdAt.toISOString()
    }));
  },

  async getPayrollPeriod(periodId: string): Promise<PayrollPeriod | null> {
    const p = await prisma.payrollPeriod.findFirst({
      where: { OR: [{ id: periodId }, { period: periodId.replace('payroll-', '') }] },
      include: { submittedBy: true, approvedBy: true }
    });
    if (!p) return null;
    return {
      id: p.id,
      period: p.period,
      status: p.status as any,
      totalGross: num(p.totalGross),
      totalKpiBonus: num(p.totalKpiBonus),
      totalHotBonus: num(p.totalHotBonus),
      totalDeductions: num(p.totalDeductions),
      totalNet: num(p.totalNet),
      employeeCount: p.employeeCount,
      ...payrollCalendarForPeriod(p.period, p),
      submittedBy: p.submittedBy
        ? { id: String(p.submittedBy.id), name: p.submittedBy.username, roleTitle: p.submittedBy.roleTitle || 'Chuyên Viên Nhân Sự & Kế Toán' }
        : undefined,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : undefined,
      approvedBy: p.approvedBy ? { id: String(p.approvedBy.id), name: p.approvedBy.username } : undefined,
      approvedAt: p.approvedAt ? p.approvedAt.toISOString() : undefined,
      lockedAt: p.lockedAt ? p.lockedAt.toISOString() : undefined,
      createdAt: p.createdAt.toISOString()
    };
  },

  async getPayrollRecords(periodId: string, filter?: { department?: string; userId?: string }): Promise<PayrollRecord[]> {
    const cleanPeriod = periodId.startsWith('payroll-') ? periodId : `payroll-${periodId}`;
    const where: any = { periodId: cleanPeriod };
    if (filter?.department) where.department = filter.department;
    const personnelWhere: any = { ...businessPersonnelRelation };
    if (filter?.userId !== undefined && filter.userId !== '') {
      const uid = Number(filter.userId);
      if (!Number.isInteger(uid) || uid <= 0) return [];
      personnelWhere.userId = uid;
    }

    const records = await prisma.payrollRecord.findMany({
      where: { ...where, personnel: personnelWhere },
      include: {
        personnel: { include: { user: true } },
        periodRel: { select: { status: true } }
      },
      orderBy: { employeeName: 'asc' }
    });

    return records.map(r => {
      const earnings = (r.earningsDetail as any) || {};
      const deductions = (r.deductionsDetail as any) || {};
      const hasExplicitSalarySnapshot = r.contractSalarySnapshot !== null && r.contractSalarySnapshot !== undefined;
      const legacyContractSalary = earnings.contractBaseSalary !== undefined ? Number(earnings.contractBaseSalary) : undefined;
      const snapshotSource = classifyPayrollSnapshot({
        contractSalarySnapshot: hasExplicitSalarySnapshot ? num(r.contractSalarySnapshot) : undefined,
        earnings: { contractBaseSalary: Number.isFinite(legacyContractSalary) ? legacyContractSalary : undefined }
      });
      const isOfficial = r.personnelType === 'Công ty';
      const baseSal = num(r.baseSalary) || Number(earnings.baseSalary) || 0;
      const totalGross = num(r.totalGross);
      const companyInsuranceAmount = (r as any).companyInsurance !== undefined && (r as any).companyInsurance !== null && num((r as any).companyInsurance) > 0
        ? num((r as any).companyInsurance)
        : (isOfficial ? Math.round(baseSal * 0.215) : 0);
      const totalCompanyLaborCost = (r as any).companyLaborCost !== undefined && (r as any).companyLaborCost !== null && num((r as any).companyLaborCost) > 0
        ? num((r as any).companyLaborCost)
        : (totalGross + companyInsuranceAmount);

      return {
        id: r.id,
        periodId: r.periodId,
        period: r.period,
        periodStatus: r.periodRel.status as PayrollPeriod['status'],
        userId: r.personnel.userId ? String(r.personnel.userId) : `user-${r.personnelId}`,
        idolId: String(r.personnelId),
        employeeName: r.employeeName,
        stageName: r.stageName || undefined,
        department: r.department,
        personnelType: r.personnelType,
        roleTitle: r.personnel.role,
        isIdol: r.isIdol,
        bankInfo: (r.bankInfo as any) || {},
        earnings,
        deductions,
        contractSalarySnapshot: r.contractSalarySnapshot !== null
          ? num(r.contractSalarySnapshot)
          : (earnings.contractBaseSalary !== undefined ? Number(earnings.contractBaseSalary) : undefined),
        snapshotSource,
        salaryEffectiveFromSnapshot: r.salaryEffectiveFromSnapshot ? toIsoDate(r.salaryEffectiveFromSnapshot) : undefined,
        salarySnapshotAt: r.salarySnapshotAt ? r.salarySnapshotAt.toISOString() : undefined,
        salaryHistoryId: r.salaryHistoryId || undefined,
        netSalary: num(r.netSalary),
        companyInsuranceAmount,
        totalCompanyLaborCost,
        status: r.paymentStatus,
        paymentStatus: r.paymentStatus as any,
        paidAt: r.paidAt ? r.paidAt.toISOString() : undefined,
        paymentRef: r.paymentRef || undefined,
        adjustmentLogs: (r.adjustmentLogs as any) || [],
        notes: r.notes || undefined,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      };
    });
  },

  async getPayrollDisputes(periodId: string, viewer: UserAccount): Promise<PayrollDispute[]> {
    const cleanPeriodId = periodId.startsWith('payroll-') ? periodId : `payroll-${periodId}`;
    const manager = canReviewPayrollDispute(viewer);
    const personnel = manager ? null : await prisma.personnel.findUnique({ where: { userId: Number(viewer.id) }, select: { id: true } });
    if (!manager && !personnel) return [];
    const rows = await prisma.payrollDispute.findMany({
      where: {
        periodId: cleanPeriodId,
        ...(manager ? {} : { personnelId: personnel!.id })
      },
      include: { submittedBy: true, reviewedBy: true },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(mapPayrollDispute);
  },

  async getPayrollDisputeInbox(viewer: UserAccount, status?: string): Promise<PayrollDisputeInboxItem[]> {
    const manager = canReviewPayrollDispute(viewer);
    const personnel = manager ? null : await prisma.personnel.findUnique({ where: { userId: Number(viewer.id) }, select: { id: true } });
    if (!manager && !personnel) return [];
    const rows = await prisma.payrollDispute.findMany({
      where: {
        ...(manager ? {} : { personnelId: personnel!.id }),
        ...(status === 'open' ? { status: { in: ['submitted', 'under_review', 'adjusted'] } } : status && status !== 'all' ? { status } : {}),
      },
      include: {
        submittedBy: true,
        reviewedBy: true,
        period: { select: { period: true, status: true } },
        record: { select: { employeeName: true, stageName: true, department: true, baseSalary: true, totalGross: true, totalDeductions: true, netSalary: true, kpiBonus: true, earningsDetail: true, deductionsDetail: true } },
        personnel: { select: { realName: true, stageName: true, department: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(mapPayrollDisputeInboxItem);
  },

  async createPayrollDispute(periodId: string, recordId: string, payload: any, viewer: UserAccount): Promise<PayrollDispute> {
    const cleanPeriodId = periodId.startsWith('payroll-') ? periodId : `payroll-${periodId}`;
    const record = await prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: { periodRel: true, personnel: { select: { id: true, userId: true } } }
    });
    if (!record || record.periodId !== cleanPeriodId) throw new Error('Phiếu lương không thuộc kỳ được chọn');
    if (record.periodRel.status === 'locked_paid') throw new Error('Không thể phản ánh kỳ lương đã khóa');
    if (!canReviewPayrollDispute(viewer) && Number(record.personnel.userId) !== Number(viewer.id)) {
      throw new Error('Bạn chỉ được phản ánh phiếu lương của chính mình');
    }
    const reason = typeof payload?.reason === 'string' ? payload.reason.trim() : '';
    if (!canSubmitPayrollDispute(record.periodRel.status)) throw new Error('Chỉ được phản ánh sau khi chốt công và trước khi Giám đốc duyệt');
    if (!reason) throw new Error('Lý do phản ánh là bắt buộc');
    const created = await prisma.payrollDispute.create({
      data: {
        periodId: cleanPeriodId,
        recordId,
        personnelId: record.personnel.id,
        submittedById: Number(viewer.id) || null,
        category: payload?.category || 'other',
        systemValue: payload?.systemValue || {
          baseSalary: num(record.baseSalary),
          totalGross: num(record.totalGross),
          totalDeductions: num(record.totalDeductions),
          netSalary: num(record.netSalary),
          actualWorkDays: (record.earningsDetail as any)?.actualWorkDays ?? null,
          kpiBonus: num(record.kpiBonus),
          tax: (record.deductionsDetail as any)?.tax ?? 0,
          insurance: (record.deductionsDetail as any)?.insurance ?? 0
        },
        requestedValue: payload?.requestedValue || {},
        reason,
        evidenceUrl: typeof payload?.evidenceUrl === 'string' ? payload.evidenceUrl.trim() || null : null
      },
      include: { submittedBy: true, reviewedBy: true }
    });
    return mapPayrollDispute(created);
  },

  async updatePayrollDispute(id: string, updates: any, viewer: UserAccount): Promise<PayrollDispute | null> {
    const dispute = await prisma.payrollDispute.findUnique({ where: { id }, include: { submittedBy: true, reviewedBy: true } });
    if (!dispute) return null;
    const manager = canReviewPayrollDispute(viewer);
    if (!manager && !canCancelPayrollDispute(dispute.status, dispute.submittedById ?? undefined, viewer.id)) {
      throw new Error('Bạn không có quyền cập nhật phản ánh này');
    }
    const nextStatus = updates?.status;
    if (!manager && nextStatus !== 'cancelled') throw new Error('Tài khoản không có quyền xử lý phản ánh');
    if (manager && !['under_review', 'adjusted', 'resolved', 'rejected'].includes(nextStatus)) {
      throw new Error('Trạng thái xử lý phản ánh không hợp lệ');
    }
    if (manager && ['resolved', 'rejected'].includes(nextStatus) && !['under_review', 'adjusted'].includes(dispute.status)) {
      throw new Error('Phản ánh phải được tiếp nhận trước khi kết luận xử lý');
    }
    const data: any = {};
    if (nextStatus === 'cancelled' || manager) data.status = nextStatus;
    if (manager && typeof updates?.resolutionNote === 'string') {
      data.resolutionNote = updates.resolutionNote.trim() || null;
      data.reviewedById = Number(viewer.id) || null;
      data.reviewedAt = new Date();
    }
    const updated = await prisma.payrollDispute.update({
      where: { id },
      data,
      include: { submittedBy: true, reviewedBy: true }
    });
    return mapPayrollDispute(updated);
  },

  async adjustPayrollRecord(periodId: string, recordId: string, updates: any, editorUser: any): Promise<PayrollRecord | null> {
    const record = await prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: { periodRel: { select: { id: true, status: true } } }
    });
    if (!record) return null;
    const cleanPeriodId = periodId.startsWith('payroll-') ? periodId : `payroll-${periodId}`;
    if (record.periodId !== cleanPeriodId) throw new Error('Phieu luong khong thuoc ky duoc chon');
    assertPayrollPeriodMutable(record.periodRel.status);

    const rawEarnings = { ...((record.earningsDetail as any) || {}), ...(updates.earnings || {}) };
    const rawDeductions = { ...((record.deductionsDetail as any) || {}), ...(updates.deductions || {}) };
    const contractSalary = Number(rawEarnings.contractBaseSalary) || Number(record.contractSalarySnapshot) || 0;

    // Tax and insurance are system-calculated; KPI, commission, gifts, allowance and other taxable earnings are included in TNCN.
    const {
      earnings,
      deductions,
      totalGross,
      totalDeductions,
      netSalary,
      companyInsurance,
      companyLaborCost
    } = recalculatePayrollRecordFinancials({
      earnings: rawEarnings,
      deductions: rawDeductions,
      contractSalary,
      personnelType: record.personnelType
    });

    const baseSal = Number(earnings.baseSalary) || 0;
    const ot = Number(earnings.overtimePay) || 0;
    const kpi = Number(earnings.kpiBonus) || 0;
    const gmv = Number(earnings.commissionGmv) || 0;
    const gift = Number(earnings.giftShare) || 0;
    const hot = Number(earnings.hotBonus) || 0;

    // Ghi nhật ký điều chỉnh
    const oldLogs = ((record.adjustmentLogs as any[]) || []);
    const newLog = {
      adjustedAt: new Date().toISOString(),
      adjustedBy: editorUser,
      previousNet: num(record.netSalary),
      newNet: netSalary,
      reason: updates.reason || 'Kế toán điều chỉnh phiếu lương'
    };
    const adjustmentLogs = [...oldLogs, newLog];

    const updated = await prisma.payrollRecord.update({
      where: { id: recordId },
      data: {
        baseSalary: new Prisma.Decimal(baseSal),
        overtimePay: new Prisma.Decimal(ot),
        kpiBonus: new Prisma.Decimal(kpi),
        commissionGmv: new Prisma.Decimal(gmv),
        giftShare: new Prisma.Decimal(gift),
        hotBonus: new Prisma.Decimal(hot),
        totalGross: new Prisma.Decimal(totalGross),
        totalDeductions: new Prisma.Decimal(totalDeductions),
        netSalary: new Prisma.Decimal(netSalary),
        companyInsurance: new Prisma.Decimal(companyInsurance),
        companyLaborCost: new Prisma.Decimal(companyLaborCost),
        earningsDetail: earnings,
        deductionsDetail: deductions,
        adjustmentLogs,
        notes: updates.notes !== undefined ? updates.notes : record.notes
      },
      include: { personnel: true }
    });

    // Cập nhật lại tổng kỳ lương
    await this.recalculatePeriodTotals(record.periodId);

    return {
      id: updated.id,
      periodId: updated.periodId,
      period: updated.period,
      userId: updated.personnel.userId ? String(updated.personnel.userId) : `user-${updated.personnelId}`,
      idolId: String(updated.personnelId),
      employeeName: updated.employeeName,
      stageName: updated.stageName || undefined,
      department: updated.department,
      personnelType: updated.personnelType,
      isIdol: updated.isIdol,
      bankInfo: (updated.bankInfo as any) || {},
      earnings,
      deductions,
      contractSalarySnapshot: updated.contractSalarySnapshot ? num(updated.contractSalarySnapshot) : undefined,
      snapshotSource: classifyPayrollSnapshot({
        contractSalarySnapshot: updated.contractSalarySnapshot ? num(updated.contractSalarySnapshot) : undefined,
        earnings: {
          contractBaseSalary: Number.isFinite(Number((earnings as any)?.contractBaseSalary))
            ? Number((earnings as any).contractBaseSalary)
            : undefined
        }
      }),
      salaryEffectiveFromSnapshot: updated.salaryEffectiveFromSnapshot ? toIsoDate(updated.salaryEffectiveFromSnapshot) : undefined,
      salarySnapshotAt: updated.salarySnapshotAt ? updated.salarySnapshotAt.toISOString() : undefined,
      salaryHistoryId: updated.salaryHistoryId || undefined,
      netSalary: num(updated.netSalary),
      companyInsuranceAmount: companyInsurance,
      totalCompanyLaborCost: companyLaborCost,
      paymentStatus: updated.paymentStatus as any,
      adjustmentLogs,
      notes: updated.notes || undefined
    };
  },

  async applyHotBonus(periodId: string, recordId: string, amount: number, reason: string, directorUser: any): Promise<PayrollRecord | null> {
    const record = await prisma.payrollRecord.findUnique({ where: { id: recordId } });
    if (!record) return null;
    const earnings = ((record.earningsDetail as any) || {});
    earnings.hotBonus = amount;
    earnings.hotBonusReason = reason;
    return this.adjustPayrollRecord(periodId, recordId, { earnings, reason: `⚡ Thưởng nóng Giám Đốc: ${reason}` }, directorUser);
  },

  async recalculatePeriodTotals(periodId: string, db: DbClient = prisma): Promise<void> {
    const records = await db.payrollRecord.findMany({ where: { periodId } });
    let totalGross = 0;
    let totalKpiBonus = 0;
    let totalHotBonus = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const r of records) {
      totalGross += num(r.totalGross);
      totalKpiBonus += num(r.kpiBonus);
      totalHotBonus += num(r.hotBonus);
      totalDeductions += num(r.totalDeductions);
      totalNet += num(r.netSalary);
    }

    await db.payrollPeriod.update({
      where: { id: periodId },
      data: {
        totalGross: new Prisma.Decimal(totalGross),
        totalKpiBonus: new Prisma.Decimal(totalKpiBonus),
        totalHotBonus: new Prisma.Decimal(totalHotBonus),
        totalDeductions: new Prisma.Decimal(totalDeductions),
        totalNet: new Prisma.Decimal(totalNet),
        employeeCount: records.length
      }
    });
  },

  async submitPayrollPeriod(periodId: string, user: any): Promise<PayrollPeriod | null> {
    const p = await prisma.payrollPeriod.findFirst({
      where: { OR: [{ id: periodId }, { period: periodId.replace('payroll-', '') }] }
    });
    if (!p) return null;
    assertPayrollSubmitAllowed(p.status as any, user);
    const calendar = payrollCalendarForPeriod(p.period, p);
    if (!canSubmitOrApprovePayroll(toIsoDate(await getEffectiveSystemDate())!, calendar)) {
      throw new Error(`Chưa đến ngày được phép trình/phê duyệt: ${calendar.approvalStartsAt}`);
    }
    const updated = await prisma.payrollPeriod.update({
      where: { id: p.id },
      data: {
        status: 'pending_approval',
        submittedAt: new Date(),
        submittedById: Number(user?.id) || null
      }
    });
    return this.getPayrollPeriod(updated.id);
  },

  async approvePayrollPeriod(periodId: string, user: any): Promise<PayrollPeriod | null> {
    const p = await prisma.payrollPeriod.findFirst({
      where: { OR: [{ id: periodId }, { period: periodId.replace('payroll-', '') }] }
    });
    if (!p) return null;
    assertPayrollApprovalAllowed(p.status as any, user);
    const calendar = payrollCalendarForPeriod(p.period, p);
    if (!canSubmitOrApprovePayroll(toIsoDate(await getEffectiveSystemDate())!, calendar)) {
      throw new Error(`Chưa đến ngày được phép trình/phê duyệt: ${calendar.approvalStartsAt}`);
    }
    const updated = await prisma.payrollPeriod.update({
      where: { id: p.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedById: Number(user?.id) || null
      }
    });
    return this.getPayrollPeriod(updated.id);
  },

  async lockPayrollPeriod(periodId: string, user: any): Promise<PayrollPeriod | null> {
    const p = await prisma.payrollPeriod.findFirst({
      where: { OR: [{ id: periodId }, { period: periodId.replace('payroll-', '') }] }
    });
    if (!p) return null;
    assertPayrollLockAllowed(p.status as any, user);
    const calendar = payrollCalendarForPeriod(p.period, p);
    if (!canLockOrPayPayroll(p.status as any, toIsoDate(await getEffectiveSystemDate())!, calendar)) {
      throw new Error(`Chỉ được khóa sổ và chi từ ngày ${calendar.lockStartsAt} khi kỳ đã được phê duyệt`);
    }
    const updated = await prisma.payrollPeriod.update({
      where: { id: p.id },
      data: {
        status: 'locked_paid',
        lockedAt: new Date()
      }
    });
    await prisma.payrollRecord.updateMany({
      where: { periodId: p.id },
      data: { paymentStatus: 'paid', paidAt: new Date() }
    });
    return this.getPayrollPeriod(updated.id);
  },

  async syncPayrollPeriod(periodId: string): Promise<{ period: PayrollPeriod; records: PayrollRecord[] }> {
    const p = await prisma.payrollPeriod.findFirst({
      where: { OR: [{ id: periodId }, { period: periodId.replace('payroll-', '') }] }
    });
    if (!p) throw new Error('Không tìm thấy kỳ lương');
    assertPayrollPeriodMutable(p.status);

    const allPersonnel = await prisma.personnel.findMany({
      where: businessPersonnelRelation,
      include: { user: true }
    });

    const salaryHistories = await prisma.personnelSalaryHistory.findMany({
      where: { personnelId: { in: allPersonnel.map((personnel) => personnel.id) } },
      orderBy: { effectiveFrom: 'asc' }
    });
    const salaryHistoryByPersonnel = new Map<number, typeof salaryHistories>();
    salaryHistories.forEach((history) => {
      const existing = salaryHistoryByPersonnel.get(history.personnelId) || [];
      existing.push(history);
      salaryHistoryByPersonnel.set(history.personnelId, existing);
    });

    const periodStr = p.period;
    const periodStart = new Date(`${periodStr}-01T00:00:00.000Z`);
    const nextPeriod = new Date(periodStart);
    nextPeriod.setUTCMonth(nextPeriod.getUTCMonth() + 1);
    const approvedLeaveRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'approved',
        startDate: { lt: nextPeriod },
        endDate: { gte: periodStart },
        personnelId: { in: allPersonnel.map((personnel) => personnel.id) }
      },
      select: { personnelId: true, unpaidLeaveDays: true }
    });
    const unpaidLeaveDaysByPersonnel = new Map<number, number>();
    approvedLeaveRequests.forEach((leave) => {
      unpaidLeaveDaysByPersonnel.set(
        leave.personnelId,
        (unpaidLeaveDaysByPersonnel.get(leave.personnelId) || 0) + num(leave.unpaidLeaveDays)
      );
    });
    const completedWorkAssignments = await prisma.workAssignmentAssignee.findMany({
      where: {
        personnelId: { in: allPersonnel.map((personnel) => personnel.id) },
        responseStatus: 'completed',
        assignment: {
          status: { not: 'cancelled' },
          startAt: { lt: nextPeriod },
          endAt: { gte: periodStart }
        }
      },
      include: { assignment: true }
    });
    const workCompensationByPersonnel = new Map<number, ReturnType<typeof calculateWorkAssignmentCompensation>[]>();
    completedWorkAssignments.forEach((item) => {
      const personnel = allPersonnel.find((candidate) => candidate.id === item.personnelId);
      if (!personnel || !item.assignment.startAt || !item.assignment.endAt) return;
      const compensation = calculateWorkAssignmentCompensation({
        startAt: item.assignment.startAt,
        endAt: item.assignment.endAt,
        contractBaseSalary: num(personnel.baseSalary),
        standardWorkDays: 26
      });
      const existing = workCompensationByPersonnel.get(item.personnelId) || [];
      existing.push(compensation);
      workCompensationByPersonnel.set(item.personnelId, existing);
    });
    const confirmedAssignmentPenalties = await prisma.workAssignmentAssignee.findMany({
      where: {
        personnelId: { in: allPersonnel.map((personnel) => personnel.id) },
        violationStatus: 'confirmed',
        assignment: { status: { not: 'cancelled' } },
        OR: [
          { assignment: { startAt: { gte: periodStart, lt: nextPeriod } } },
          { assignment: { startAt: null }, reviewedAt: { gte: periodStart, lt: nextPeriod } }
        ]
      },
      select: { personnelId: true, penaltyAmount: true }
    });
    const assignmentPenaltyByPersonnel = new Map<number, number>();
    confirmedAssignmentPenalties.forEach((item) => {
      assignmentPenaltyByPersonnel.set(item.personnelId, (assignmentPenaltyByPersonnel.get(item.personnelId) || 0) + num(item.penaltyAmount));
    });
    const isExcluded = (personnel: any) =>
      personnel.personnelType === 'Dịch vụ ngoài' || personnel.cooperationType === 'service_guest';

    // 1. Quét các records hiện có: Xóa những records không còn hợp lệ (đã nghỉ việc trước kỳ này, hoặc là khách dịch vụ ngoài)
    const existingRecords = await prisma.payrollRecord.findMany({
      where: { periodId: p.id }
    });

    for (const r of existingRecords) {
      const match = allPersonnel.find(x => x.id === r.personnelId);
      if (!match) {
        await prisma.payrollRecord.delete({ where: { id: r.id } });
        continue;
      }
      if (isExcluded(match)) {
        await prisma.payrollRecord.delete({ where: { id: r.id } });
        continue;
      }
      const eligible = isEligibleForPayrollPeriod(
        periodStr,
        toIsoDate(match.joinDate),
        toIsoDate(match.resignedDate),
        match.status
      );
      if (!eligible) {
        await prisma.payrollRecord.delete({ where: { id: r.id } });
      }
    }

    // 2. Thêm phiếu lương cho các nhân sự hợp lệ chưa có trong kỳ
    const updatedExisting = await prisma.payrollRecord.findMany({
      where: { periodId: p.id }
    });
    const existingPersonnelIds = new Set(updatedExisting.map(r => r.personnelId));

    for (const personnel of allPersonnel) {
      if (isExcluded(personnel)) continue;
      const eligible = isEligibleForPayrollPeriod(
        periodStr,
        toIsoDate(personnel.joinDate),
        toIsoDate(personnel.resignedDate),
        personnel.status
      );
      if (!eligible) continue;
      if (existingPersonnelIds.has(personnel.id)) continue;

      // Tạo mới record cho nhân sự này
      const salaryResolution = resolveSalaryForPayrollPeriod(
        periodStr,
        (salaryHistoryByPersonnel.get(personnel.id) || []).map((history) => ({
          id: history.id,
          salaryAmount: num(history.salaryAmount),
          effectiveFrom: toIsoDate(history.effectiveFrom)!,
          effectiveTo: toIsoDate(history.effectiveTo)
        })),
        num(personnel.baseSalary),
        toIsoDate(personnel.joinDate),
        toIsoDate(personnel.resignedDate)
      );
      const contractSalary = salaryResolution.monthlySalary;
      const prorated = calculateProratedWorkDays(
        periodStr,
        toIsoDate(personnel.joinDate),
        toIsoDate(personnel.resignedDate)
      );
      const proratedBase = salaryResolution.segments.length > 0
        ? salaryResolution.proratedSalary
        : Math.round(contractSalary * prorated.workRatio);
      const fullAllowance = personnel.isIdol
        ? (personnel.personnelType === 'Công ty' && contractSalary > 0 ? 500000 : 0)
        : (contractSalary > 0 ? 1000000 : 0);
      const proratedAllowance = Math.round(fullAllowance * prorated.workRatio);
      const unpaidLeaveDays = unpaidLeaveDaysByPersonnel.get(personnel.id) || 0;
      const unpaidLeaveDeduction = calculateUnpaidLeaveDeduction(contractSalary, prorated.standardWorkDays, unpaidLeaveDays);
      const workCompensations = workCompensationByPersonnel.get(personnel.id) || [];
      const workAssignmentBaseHours = workCompensations.reduce((sum, item) => sum + item.baseHours, 0);
      const workAssignmentPremiumHours = workCompensations.reduce((sum, item) => sum + item.premiumHours, 0);
      const workAssignmentPay = workCompensations.reduce((sum, item) => sum + item.totalPay, 0);
      const workAssignmentBasePay = workCompensations.reduce((sum, item) => sum + item.basePay, 0);
      const workAssignmentPremiumPay = workCompensations.reduce((sum, item) => sum + item.premiumPay, 0);
      const workAssignmentRestDay = workCompensations.map((item) => item.restDayDate).filter(Boolean).sort()[0];
      const workAssignmentPenalty = assignmentPenaltyByPersonnel.get(personnel.id) || 0;

      const earningsDetail: any = {
        baseSalary: proratedBase,
        contractBaseSalary: contractSalary,
        standardWorkDays: prorated.standardWorkDays,
        actualWorkDays: prorated.actualWorkDays,
        workRatio: prorated.workRatio,
        workDaysExplanation: prorated.explanation,
        otNormalHours: 0,
        otWeekendHours: 0,
        otHolidayHours: 0,
        overtimePay: 0,
        workAssignmentBaseHours,
        workAssignmentPremiumHours,
        workAssignmentBasePay,
        workAssignmentPremiumPay,
        workAssignmentPay,
        workAssignmentRestDay,
        kpiBonus: 0,
        commissionGmv: 0,
        giftShare: 0,
        hotBonus: 0,
        allowance: proratedAllowance,
        salarySegments: salaryResolution.segments,
        otherBonus: 0,
        totalGross: proratedBase + proratedAllowance + workAssignmentPay
      };

      const automaticDeductions = calculatePayrollDeductions({ contractSalary, taxableIncome: contractSalary + workAssignmentPay, personnelType: personnel.personnelType });
      const deductionsDetail: any = {
        liveHoursPenalty: 0,
        advancePayment: 0,
        tax: automaticDeductions.tax,
        insurance: automaticDeductions.employeeInsurance,
        unpaidLeaveDeduction,
        otherPenalty: workAssignmentPenalty,
        totalDeductions: 0
      };
      deductionsDetail.totalDeductions = deductionsDetail.tax + deductionsDetail.insurance + deductionsDetail.unpaidLeaveDeduction + deductionsDetail.otherPenalty;
      const totalGross = earningsDetail.totalGross;
      const totalDeductions = deductionsDetail.totalDeductions;
      const netSalary = Math.max(0, totalGross - totalDeductions);
      const companyInsurance = automaticDeductions.companyInsurance;
      const companyLaborCost = totalGross + companyInsurance;

      await prisma.payrollRecord.create({
        data: {
          periodId: p.id,
          period: periodStr,
          personnelId: personnel.id,
          employeeName: personnel.realName || personnel.stageName || 'Chưa đặt tên',
          stageName: personnel.stageName || null,
          department: personnel.department,
          personnelType: personnel.personnelType,
          isIdol: personnel.isIdol,
          bankInfo: {
            bankName: personnel.bankName || '',
            accountNumber: personnel.bankAccountNumber || '',
            accountName: personnel.bankAccountName || ''
          },
          baseSalary: new Prisma.Decimal(proratedBase),
          contractSalarySnapshot: new Prisma.Decimal(contractSalary),
          salaryEffectiveFromSnapshot: salaryResolution.salaryEffectiveFrom
            ? new Date(`${salaryResolution.salaryEffectiveFrom}T00:00:00.000Z`)
            : null,
          salarySnapshotAt: new Date(),
          salaryHistoryId: salaryResolution.salaryHistoryId || null,
          overtimePay: new Prisma.Decimal(0),
          kpiBonus: new Prisma.Decimal(0),
          commissionGmv: new Prisma.Decimal(0),
          giftShare: new Prisma.Decimal(0),
          hotBonus: new Prisma.Decimal(0),
          totalGross: new Prisma.Decimal(totalGross),
          totalDeductions: new Prisma.Decimal(totalDeductions),
          netSalary: new Prisma.Decimal(netSalary),
          companyInsurance: new Prisma.Decimal(companyInsurance),
          companyLaborCost: new Prisma.Decimal(companyLaborCost),
          earningsDetail,
          deductionsDetail,
          paymentStatus: 'pending'
        }
      });
    }

    await this.recalculatePeriodTotals(p.id);

    const period = await this.getPayrollPeriod(p.id);
    const records = await this.getPayrollRecords(p.id);
    return { period: period!, records };
  },

  async getMyPayslips(userIdStr: string): Promise<PayrollRecord[]> {
    // The authenticated account is the source of truth. Do not let a client
    // supplied idolId select another personnel profile's payslips.
    let personnelId: number | undefined;
    if (userIdStr) {
      const uid = Number(userIdStr);
      if (!isNaN(uid)) {
        const p = await prisma.personnel.findUnique({ where: { userId: uid } });
        if (p) personnelId = p.id;
      }
    }

    if (!personnelId) return [];

    const records = await prisma.payrollRecord.findMany({
      where: { personnelId, personnel: businessPersonnelRelation },
      include: {
        personnel: true,
        periodRel: { select: { status: true } }
      },
      orderBy: { period: 'desc' }
    });

    return records.map(r => ({
      id: r.id,
      periodId: r.periodId,
      period: r.period,
      periodStatus: r.periodRel.status as PayrollPeriod['status'],
      userId: userIdStr,
      idolId: String(r.personnelId),
      employeeName: r.employeeName,
      stageName: r.stageName || undefined,
      department: r.department,
      personnelType: r.personnelType,
      isIdol: r.isIdol,
      bankInfo: (r.bankInfo as any) || {},
      earnings: (r.earningsDetail as any) || {},
      deductions: (r.deductionsDetail as any) || {},
      contractSalarySnapshot: r.contractSalarySnapshot ? num(r.contractSalarySnapshot) : undefined,
      snapshotSource: classifyPayrollSnapshot({
        contractSalarySnapshot: r.contractSalarySnapshot ? num(r.contractSalarySnapshot) : undefined,
        earnings: { contractBaseSalary: Number.isFinite(Number((r.earningsDetail as any)?.contractBaseSalary)) ? Number((r.earningsDetail as any).contractBaseSalary) : undefined }
      }),
      salaryEffectiveFromSnapshot: r.salaryEffectiveFromSnapshot ? toIsoDate(r.salaryEffectiveFromSnapshot) : undefined,
      salarySnapshotAt: r.salarySnapshotAt ? r.salarySnapshotAt.toISOString() : undefined,
      salaryHistoryId: r.salaryHistoryId || undefined,
      netSalary: num(r.netSalary),
      status: r.paymentStatus,
      paymentStatus: r.paymentStatus as any,
      paidAt: r.paidAt ? r.paidAt.toISOString() : undefined,
      paymentRef: r.paymentRef || undefined,
      adjustmentLogs: (r.adjustmentLogs as any) || [],
      notes: r.notes || undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));
  },

  async getMacroPayrollSummary(): Promise<MacroPayrollSummary> {
    const periods = await prisma.payrollPeriod.findMany({
      orderBy: { period: 'desc' }
    });

    const allTime: MacroPayrollSummary['allTime'] = {
      gross: periods.reduce((sum, p) => sum + num(p.totalGross), 0),
      kpi: periods.reduce((sum, p) => sum + num(p.totalKpiBonus), 0),
      hot: periods.reduce((sum, p) => sum + num(p.totalHotBonus), 0),
      deductions: periods.reduce((sum, p) => sum + num(p.totalDeductions), 0),
      net: periods.reduce((sum, p) => sum + num(p.totalNet), 0),
      periodCount: periods.length,
      firstPeriod: periods.length > 0 ? periods[periods.length - 1].period : '2022-01',
      latestPeriod: periods.length > 0 ? periods[0].period : '2026-10'
    };

    const byYear: MacroPayrollSummary['byYear'] = {};
    const byQuarter: MacroPayrollSummary['byQuarter'] = {};

    periods.forEach(p => {
      const [year, monthStr] = p.period.split('-');
      const month = Number(monthStr);
      const qNum = Math.ceil(month / 3);
      const qKey = `${year}-Q${qNum}`;

      if (!byYear[year]) {
        byYear[year] = {
          year,
          gross: 0,
          kpi: 0,
          hot: 0,
          deductions: 0,
          net: 0,
          periodCount: 0,
          avgEmployees: 0,
          months: []
        };
      }
      byYear[year].gross += num(p.totalGross);
      byYear[year].kpi += num(p.totalKpiBonus);
      byYear[year].hot += num(p.totalHotBonus);
      byYear[year].deductions += num(p.totalDeductions);
      byYear[year].net += num(p.totalNet);
      byYear[year].periodCount += 1;
      byYear[year].months.push(p.period);

      if (!byQuarter[qKey]) {
        byQuarter[qKey] = {
          year,
          quarter: `Q${qNum}`,
          quarterKey: qKey,
          label: `Quý ${qNum}/${year}`,
          gross: 0,
          kpi: 0,
          hot: 0,
          deductions: 0,
          net: 0,
          periodCount: 0,
          months: []
        };
      }
      byQuarter[qKey].gross += num(p.totalGross);
      byQuarter[qKey].kpi += num(p.totalKpiBonus);
      byQuarter[qKey].hot += num(p.totalHotBonus);
      byQuarter[qKey].deductions += num(p.totalDeductions);
      byQuarter[qKey].net += num(p.totalNet);
      byQuarter[qKey].periodCount += 1;
      byQuarter[qKey].months.push(p.period);
    });

    Object.values(byYear).forEach(y => {
      const yearPeriods = periods.filter(p => p.period.startsWith(y.year));
      const totalEmp = yearPeriods.reduce((sum, p) => sum + (p.employeeCount || 0), 0);
      y.avgEmployees = yearPeriods.length > 0 ? Math.round(totalEmp / yearPeriods.length) : 0;
    });

    return { allTime, byYear, byQuarter };
  },

  async getAggregatedPayrollPersonnel(scope: string, key?: string): Promise<AggregatedPayrollPersonnel[]> {
    let targetPeriods: string[] | null = null;
    if (scope === 'year') {
      const year = key || '2026';
      const periods = await prisma.payrollPeriod.findMany({
        where: { period: { startsWith: year } },
        select: { period: true }
      });
      targetPeriods = periods.map(p => p.period);
    } else if (scope === 'quarter') {
      const qKey = key || '2026-Q4';
      const [year, qPart] = qKey.split('-');
      const qNum = Number(qPart.replace('Q', ''));
      const startMonth = (qNum - 1) * 3 + 1;
      const endMonth = qNum * 3;
      targetPeriods = [startMonth, startMonth + 1, endMonth].map(m => `${year}-${String(m).padStart(2, '0')}`);
    }

    const where: any = {};
    if (targetPeriods) {
      where.period = { in: targetPeriods };
    }

    const records = await prisma.payrollRecord.findMany({
      where: { ...where, personnel: businessPersonnelRelation },
      include: { personnel: true }
    });

    const personnelMap = new Map<string, AggregatedPayrollPersonnel>();

    for (const r of records) {
      const pKey = r.personnel.userId ? String(r.personnel.userId) : `user-${r.personnelId}`;
      if (!personnelMap.has(pKey)) {
        personnelMap.set(pKey, {
          userId: pKey,
          idolId: String(r.personnelId),
          employeeName: r.employeeName,
          stageName: r.stageName || undefined,
          roleTitle: r.personnel.assignedRole || undefined,
          department: r.department,
          personnelType: r.personnelType,
          isIdol: r.isIdol,
          bankInfo: (r.bankInfo as any) || { bankName: '', accountNumber: '', accountName: '' },
          totalBaseSalary: 0,
          totalKpiBonus: 0,
          totalAllowance: 0,
          totalHotBonus: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          periodCount: 0
        });
      }

      const agg = personnelMap.get(pKey)!;
      agg.totalBaseSalary += num(r.baseSalary);
      agg.totalKpiBonus += num(r.kpiBonus) + num(r.commissionGmv) + num(r.giftShare);
      agg.totalAllowance += Number((r.earningsDetail as any)?.allowance || 0);
      agg.totalHotBonus += num(r.hotBonus);
      agg.totalGross += num(r.totalGross);
      agg.totalDeductions += num(r.totalDeductions);
      agg.totalNet += num(r.netSalary);
      agg.periodCount += 1;
    }

    return Array.from(personnelMap.values());
  },

  // ==========================================
  // 11. KPI GROUPS & KPI SETTINGS
  // ==========================================
  async getKpiGroups(): Promise<KpiGroup[]> {
    const list = await prisma.kpiGroup.findMany({
      include: {
        members: { where: { personnel: businessPersonnelRelation }, include: { personnel: true } },
        leader: true
      },
      orderBy: { id: 'asc' }
    });

    return list.map(g => ({
      id: String(g.id),
      name: g.name,
      description: g.description || undefined,
      type: g.type as any,
      category: g.category as any,
      department: g.department || undefined,
      leaderId: g.leaderId ? String(g.leaderId) : undefined,
      memberIds: g.members.map(m => String(m.personnelId)),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt ? g.updatedAt.toISOString() : g.createdAt.toISOString()
    }));
  },

  async createKpiGroup(payload: any, db: DbClient = prisma): Promise<KpiGroup> {
    if (db === prisma) return prisma.$transaction((tx) => this.createKpiGroup(payload, tx));
    const leaderId = payload.leaderId ? Number(payload.leaderId) : null;
    if (leaderId) await assertBusinessPersonnel(leaderId, db);
    const created = await db.kpiGroup.create({
      data: {
        name: payload.name,
        description: payload.description || null,
        type: payload.type || 'custom',
        category: payload.category || 'mixed',
        department: payload.department || null,
        leaderId: !isNaN(leaderId as number) ? leaderId : null
      }
    });

    // Thêm thành viên vào bảng trung gian kpi_group_members
    const memberIds = payload.memberIds || [];
    const memberData = memberIds
      .map((memIdStr: unknown) => Number(memIdStr))
      .filter((pid: number) => !isNaN(pid))
      .map((pid: number) => ({ groupId: created.id, personnelId: pid, roleInGroup: pid === leaderId ? 'leader' : 'member' }));
    for (const member of memberData) await assertBusinessPersonnel(member.personnelId, db);
    if (memberData.length) await db.kpiGroupMember.createMany({ data: memberData });

    return {
      id: String(created.id),
      name: created.name,
      description: created.description || undefined,
      type: created.type as any,
      category: created.category as any,
      department: created.department || undefined,
      leaderId: created.leaderId ? String(created.leaderId) : undefined,
      memberIds: memberIds.map(String),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt ? created.updatedAt.toISOString() : created.createdAt.toISOString()
    };
  },

  async updateKpiGroup(idStr: string, payload: any, db: DbClient = prisma): Promise<KpiGroup | null> {
    const id = Number(idStr);
    if (isNaN(id)) return null;
    if (db === prisma) return prisma.$transaction((tx) => this.updateKpiGroup(idStr, payload, tx));

    const data: any = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.category !== undefined) data.category = payload.category;
    if (payload.department !== undefined) data.department = payload.department;
    if (payload.leaderId !== undefined) {
      const lid = Number(payload.leaderId);
      if (!isNaN(lid)) await assertBusinessPersonnel(lid, db);
      data.leaderId = !isNaN(lid) ? lid : null;
    }

    const updated = await db.kpiGroup.update({
      where: { id },
      data
    });

    // Cập nhật lại thành viên nếu có truyền memberIds
    if (payload.memberIds && Array.isArray(payload.memberIds)) {
      await db.kpiGroupMember.deleteMany({ where: { groupId: id } });
      const memberData = payload.memberIds
        .map((memIdStr: unknown) => Number(memIdStr))
        .filter((pid: number) => !isNaN(pid))
        .map((pid: number) => ({ groupId: id, personnelId: pid, roleInGroup: pid === updated.leaderId ? 'leader' : 'member' }));
      for (const member of memberData) await assertBusinessPersonnel(member.personnelId, db);
      if (memberData.length) await db.kpiGroupMember.createMany({ data: memberData });
    }

    const full = await db.kpiGroup.findUnique({
      where: { id },
      include: { members: true }
    });

    return {
      id: String(full!.id),
      name: full!.name,
      description: full!.description || undefined,
      type: full!.type as any,
      category: full!.category as any,
      department: full!.department || undefined,
      leaderId: full!.leaderId ? String(full!.leaderId) : undefined,
      memberIds: full!.members.map(m => String(m.personnelId)),
      createdAt: full!.createdAt.toISOString(),
      updatedAt: full!.updatedAt ? full!.updatedAt.toISOString() : full!.createdAt.toISOString()
    };
  },

  async deleteKpiGroup(idStr: string): Promise<boolean> {
    const id = Number(idStr);
    if (isNaN(id)) return false;
    try {
      await prisma.kpiGroup.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getKpiSettings(): Promise<KpiSetting[]> {
    const list = await prisma.kpiSetting.findMany({
      include: { activityType: true },
      orderBy: { id: 'asc' }
    });
    return list.map(k => ({
      id: String(k.id),
      code: k.code,
      name: k.name,
      description: k.description || undefined,
      unit: k.unit,
      customUnitLabel: k.customUnitLabel || undefined,
      scopeType: k.scopeType as any,
      groupId: k.groupId ? String(k.groupId) : undefined,
      assignedIdolId: k.assignedPersonnelId ? String(k.assignedPersonnelId) : undefined,
      activityCode: k.activityType?.code || undefined,
      period: k.period as any,
      targetValue: num(k.targetValue),
      minThreshold: k.minThreshold ? num(k.minThreshold) : undefined,
      weight: num(k.weight),
      bonusIncentive: (k.bonusIncentive as any) || undefined,
      status: k.status as any,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString()
    }));
  },

  async createKpiSetting(payload: any): Promise<KpiSetting> {
    const groupId = payload.groupId ? Number(payload.groupId) : null;
    const assignedPersonnelId = payload.assignedIdolId ? Number(payload.assignedIdolId) : null;
    if (assignedPersonnelId) await assertBusinessPersonnel(assignedPersonnelId);
    const activityTypeId = await validateKpiSetting(payload);

    const created = await prisma.kpiSetting.create({
      data: {
        code: payload.code || 'KPI_CUSTOM',
        name: payload.name,
        description: payload.description || null,
        unit: payload.unit || 'VNĐ',
        customUnitLabel: payload.customUnitLabel || null,
        scopeType: payload.scopeType || 'group',
        groupId: !isNaN(groupId as number) ? groupId : null,
        assignedPersonnelId: !isNaN(assignedPersonnelId as number) ? assignedPersonnelId : null,
        activityTypeId,
        period: payload.period || 'monthly',
        targetValue: new Prisma.Decimal(payload.targetValue || 0),
        minThreshold: payload.minThreshold !== undefined ? new Prisma.Decimal(payload.minThreshold) : null,
        weight: new Prisma.Decimal(payload.weight || 100),
        bonusIncentive: payload.bonusIncentive || null,
        status: payload.status || 'active'
      }
    });

    return {
      id: String(created.id),
      code: created.code,
      name: created.name,
      description: created.description || undefined,
      unit: created.unit,
      customUnitLabel: created.customUnitLabel || undefined,
      scopeType: created.scopeType as any,
      groupId: created.groupId ? String(created.groupId) : undefined,
      assignedIdolId: created.assignedPersonnelId ? String(created.assignedPersonnelId) : undefined,
      activityCode: (await prisma.personnelActivityType.findUnique({ where: { id: created.activityTypeId || 0 }, select: { code: true } }))?.code || undefined,
      period: created.period as any,
      targetValue: num(created.targetValue),
      minThreshold: created.minThreshold ? num(created.minThreshold) : undefined,
      weight: num(created.weight),
      bonusIncentive: (created.bonusIncentive as any) || undefined,
      status: created.status as any,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    };
  },

  async updateKpiSetting(idStr: string, payload: any): Promise<KpiSetting | null> {
    const id = Number(idStr);
    if (isNaN(id)) return null;

    const current = await prisma.kpiSetting.findUnique({ where: { id } });
    if (!current) return null;
    const mergedPayload = {
      ...current,
      ...payload,
      assignedIdolId: payload.assignedIdolId ?? current.assignedPersonnelId,
      activityCode: payload.activityCode !== undefined ? payload.activityCode : undefined,
      activityTypeId: payload.activityCode !== undefined || payload.activityTypeId !== undefined
        ? payload.activityTypeId
        : current.activityTypeId
    };
    if (mergedPayload.assignedIdolId) await assertBusinessPersonnel(Number(mergedPayload.assignedIdolId));
    const validatedActivityTypeId = await validateKpiSetting(mergedPayload, id);

    const data: any = {};
    if (payload.code !== undefined) data.code = payload.code;
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.unit !== undefined) data.unit = payload.unit;
    if (payload.customUnitLabel !== undefined) data.customUnitLabel = payload.customUnitLabel;
    if (payload.scopeType !== undefined) data.scopeType = payload.scopeType;
    if (payload.groupId !== undefined) {
      const gid = Number(payload.groupId);
      data.groupId = !isNaN(gid) ? gid : null;
    }
    if (payload.assignedIdolId !== undefined) {
      const pid = Number(payload.assignedIdolId);
      data.assignedPersonnelId = !isNaN(pid) ? pid : null;
    }
    if (payload.activityCode !== undefined || payload.activityTypeId !== undefined || payload.groupId !== undefined || payload.assignedIdolId !== undefined) {
      const nextGroupId = payload.groupId !== undefined ? (payload.groupId ? Number(payload.groupId) : null) : (await prisma.kpiSetting.findUnique({ where: { id }, select: { groupId: true } }))?.groupId || null;
      const nextPersonnelId = payload.assignedIdolId !== undefined ? (payload.assignedIdolId ? Number(payload.assignedIdolId) : null) : (await prisma.kpiSetting.findUnique({ where: { id }, select: { assignedPersonnelId: true } }))?.assignedPersonnelId || null;
      data.activityTypeId = validatedActivityTypeId;
    }
    if (payload.period !== undefined) data.period = payload.period;
    if (payload.targetValue !== undefined) data.targetValue = new Prisma.Decimal(payload.targetValue);
    if (payload.minThreshold !== undefined) {
      data.minThreshold = payload.minThreshold !== null ? new Prisma.Decimal(payload.minThreshold) : null;
    }
    if (payload.weight !== undefined) data.weight = new Prisma.Decimal(payload.weight);
    if (payload.bonusIncentive !== undefined) data.bonusIncentive = payload.bonusIncentive;
    if (payload.status !== undefined) data.status = payload.status;

    const updated = await prisma.kpiSetting.update({
      where: { id },
      data,
      include: { activityType: true }
    });

    return {
      id: String(updated.id),
      code: updated.code,
      name: updated.name,
      description: updated.description || undefined,
      unit: updated.unit,
      customUnitLabel: updated.customUnitLabel || undefined,
      scopeType: updated.scopeType as any,
      groupId: updated.groupId ? String(updated.groupId) : undefined,
      assignedIdolId: updated.assignedPersonnelId ? String(updated.assignedPersonnelId) : undefined,
      activityCode: updated.activityType?.code || undefined,
      period: updated.period as any,
      targetValue: num(updated.targetValue),
      minThreshold: updated.minThreshold ? num(updated.minThreshold) : undefined,
      weight: num(updated.weight),
      bonusIncentive: (updated.bonusIncentive as any) || undefined,
      status: updated.status as any,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  },

  async deleteKpiSetting(idStr: string): Promise<boolean> {
    const id = Number(idStr);
    if (isNaN(id)) return false;
    try {
      await prisma.kpiSetting.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getOperationalMetrics(personnelIdStr?: string, period?: string): Promise<OperationalMetric[]> {
    const personnelId = personnelIdStr ? Number(personnelIdStr) : undefined;
    const list = await prisma.operationalMetric.findMany({
      where: {
        ...(personnelId && !isNaN(personnelId) ? { personnelId } : {}),
        ...(period ? { period } : {}),
        personnel: businessPersonnelRelation
      },
      orderBy: [{ period: 'desc' }, { metricCode: 'asc' }]
    });
    return list.map(metric => ({
      id: metric.id,
      personnelId: metric.personnelId,
      period: metric.period,
      metricCode: metric.metricCode as any,
      actualValue: num(metric.actualValue),
      source: metric.source || undefined,
      note: metric.note || undefined,
      createdAt: metric.createdAt.toISOString(),
      updatedAt: metric.updatedAt.toISOString()
    }));
  },

  async upsertOperationalMetric(payload: Partial<OperationalMetric>): Promise<OperationalMetric> {
    const personnelId = Number(payload.personnelId);
    if (!personnelId || !payload.period || !payload.metricCode) {
      throw new Error('Thiếu nhân sự, kỳ hoặc mã chỉ số vận hành');
    }
    await assertBusinessPersonnel(personnelId);
    const saved = await prisma.operationalMetric.upsert({
      where: { personnelId_period_metricCode: { personnelId, period: payload.period, metricCode: payload.metricCode } },
      create: {
        personnelId,
        period: payload.period,
        metricCode: payload.metricCode,
        actualValue: new Prisma.Decimal(Number(payload.actualValue) || 0),
        source: payload.source || null,
        note: payload.note || null
      },
      update: {
        actualValue: new Prisma.Decimal(Number(payload.actualValue) || 0),
        source: payload.source || null,
        note: payload.note || null
      }
    });
    return (await this.getOperationalMetrics(String(saved.personnelId), saved.period)).find(m => m.metricCode === saved.metricCode)!;
  },

  async getOperationalKpi(personnelIdStr: string, period: string): Promise<OperationalKpiSummary> {
    const personnelId = Number(personnelIdStr);
    const periodStart = new Date(`${period}-01T00:00:00.000Z`);
    const nextPeriod = new Date(periodStart);
    nextPeriod.setUTCMonth(nextPeriod.getUTCMonth() + 1);
    const [personnel, settings, metrics, tasks, revenue, schedules, assignments] = await Promise.all([
      prisma.personnel.findUnique({
        where: { id: personnelId },
        include: {
          user: { select: { accountType: true } },
          groupMemberships: true,
          activities: { include: { activityType: true } }
        }
      }),
      prisma.kpiSetting.findMany({ where: { period: { in: [period, 'monthly'] }, status: 'active' }, include: { group: { include: { members: true } }, activityType: true } }),
      prisma.operationalMetric.findMany({ where: { personnelId, period, personnel: businessPersonnelRelation } }),
      prisma.personnelTask.findMany({
        where: {
          personnelId,
          personnel: businessPersonnelRelation,
          OR: [
            { startTime: { gte: periodStart, lt: nextPeriod } },
            { dueDate: { gte: periodStart, lt: nextPeriod } }
          ]
        },
        select: { loggedDurationMinutes: true }
      }),
      prisma.revenueTransaction.findMany({ where: { personnelId, period, status: { in: ['verified', 'synced_to_payroll'] }, personnel: businessPersonnelRelation }, include: { category: true } })
      ,
      prisma.workSchedule.findMany({ where: { personnelId, isActive: true } }),
      prisma.workAssignment.findMany({
        where: { status: { not: 'cancelled' }, assignees: { some: { personnelId } } },
        include: { assignees: { where: { personnelId }, select: { responseStatus: true } } }
      })
    ]);
    if (!personnel) throw new Error('Không tìm thấy nhân sự');

    const isKpiEligible = isEligibleForIdolKpi({
      ...personnel,
      hasActiveActivity: personnel.activities.length > 0
    });
    if (!isKpiEligible) {
      return {
        period,
        totalScore: 0,
        grade: 'Không áp dụng',
        metrics: {
          liveHours: { actual: 0, target: 0, score: 0, maxScore: 25 },
          sales: { actual: 0, target: 0, score: 0, maxScore: 25 },
          engagement: { actual: 0, target: 0, score: 0, maxScore: 25 },
          gifts: { actual: 0, target: 0, score: 0, maxScore: 25 }
        },
        items: []
      };
    }

    const activityCodes = personnel.activities
      .slice()
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map(a => a.activityType.code);
    const settingFor = (codes: string[]) => settings.find(s => codes.includes(s.code) && s.activityType?.code && activityCodes.includes(s.activityType.code) && s.assignedPersonnelId === personnelId && activityCodes.indexOf(s.activityType.code) === 0)
      || settings.find(s => codes.includes(s.code) && s.activityType?.code && activityCodes.includes(s.activityType.code) && s.assignedPersonnelId === personnelId)
      || settings.find(s => codes.includes(s.code) && s.activityType?.code && activityCodes.includes(s.activityType.code) && s.group?.members.some(m => m.personnelId === personnelId) && activityCodes.indexOf(s.activityType.code) === 0)
      || settings.find(s => codes.includes(s.code) && s.activityType?.code && activityCodes.includes(s.activityType.code) && s.group?.members.some(m => m.personnelId === personnelId))
      || settings.find(s => codes.includes(s.code) && !s.activityTypeId && s.assignedPersonnelId === personnelId)
      || settings.find(s => codes.includes(s.code) && !s.activityTypeId && s.group?.members.some(m => m.personnelId === personnelId));
    const metricConfigs = [
      { key: 'liveHours' as const, codes: ['LIVE_HOURS_COMMERCE', 'STREAM_HOURS_GAMING', 'STREAM_HOURS'], fallbackTarget: 0, fallbackWeight: 25, label: 'Thời gian livestream', unit: 'giờ', actualCode: 'LIVE_HOURS' },
      { key: 'sales' as const, codes: ['GMV_LIVE', 'GEAR_SALES', 'BOOKING_REVENUE'], fallbackTarget: 50000000, fallbackWeight: 25, label: 'Doanh số / doanh thu', unit: 'VNĐ', actualCode: 'GMV_LIVE' },
      { key: 'engagement' as const, codes: ['NEW_FOLLOWERS', 'ENGAGEMENT'], fallbackTarget: 25000, fallbackWeight: 25, label: 'Lượt xem & tương tác', unit: 'lượt', actualCode: 'ENGAGEMENT' },
      { key: 'gifts' as const, codes: ['DONATE_REVENUE', 'PK_MATCHES_WON', 'GIFT_POINTS'], fallbackTarget: 60000, fallbackWeight: 25, label: 'Quà tặng & điểm PK', unit: 'điểm', actualCode: 'GIFT_POINTS' }
    ];
    const selectedSettings = metricConfigs.map(config => settingFor(config.codes));
    const target = (index: number) => num(selectedSettings[index]?.targetValue) || metricConfigs[index].fallbackTarget;
    const weight = (index: number) => num(selectedSettings[index]?.weight) || metricConfigs[index].fallbackWeight;
    const metricValue = (code: string) => num(metrics.find(m => m.metricCode === code)?.actualValue);
    const loggedLiveHours = tasks.reduce((sum, task) => sum + task.loggedDurationMinutes, 0) / 60;
    const liveHours = metrics.some(m => m.metricCode === 'LIVE_HOURS') ? metricValue('LIVE_HOURS') : loggedLiveHours;
    const engagement = metricValue('ENGAGEMENT');
    const gifts = metricValue('GIFT_POINTS');
    const sales = revenue.filter(r => r.category?.code === 'GMV_LIVE').reduce((sum, r) => sum + num(r.grossAmount), 0);
    const metricWeights = metricConfigs.map((_, index) => weight(index));
    const weightTotal = metricWeights.reduce((sum, value) => sum + value, 0);
    const makeMetric = (actual: number, metricTarget: number, rawWeight: number): OperationalKpiMetric => ({
      actual,
      target: metricTarget,
      score: metricTarget > 0 ? Math.min(rawWeight, Math.round((actual / metricTarget) * rawWeight)) : 0,
      maxScore: rawWeight
    });
    const normalizedWeight = (value: number) => weightTotal > 0 ? (value / weightTotal) * 100 : 25;
    const liveTargetAdjustment = calculateAdjustedLiveKpiTarget(
      period,
      schedules.length > 0 ? target(0) : 0,
      schedules,
      assignments.map((assignment) => ({
        status: assignment.status,
        startAt: assignment.startAt,
        endAt: assignment.endAt,
        assigneeResponseStatus: assignment.assignees[0]?.responseStatus
      }))
    );
    const liveHoursMetric = makeMetric(liveHours, liveTargetAdjustment.adjustedTarget, normalizedWeight(metricWeights[0]));
    const metricsResult = {
      liveHours: {
        ...liveHoursMetric,
        originalTarget: liveTargetAdjustment.originalTarget,
        adjustedByWorkAssignmentHours: liveTargetAdjustment.reducedHours,
        affectedWorkAssignmentShifts: liveTargetAdjustment.affectedShifts
      },
      sales: makeMetric(sales, target(1), normalizedWeight(metricWeights[1])),
      engagement: makeMetric(engagement, target(2), normalizedWeight(metricWeights[2])),
      gifts: makeMetric(gifts, target(3), normalizedWeight(metricWeights[3]))
    };
    const actualByKey: Record<'liveHours' | 'sales' | 'engagement' | 'gifts', OperationalKpiMetric> = metricsResult;
    const items = metricConfigs
      .map((config, index) => ({ config, index, setting: selectedSettings[index] }))
      .filter(({ setting }) => Boolean(setting))
      .map(({ config, setting }) => {
        const metric = actualByKey[config.key];
        return {
        ...metric,
        code: setting!.code,
        label: setting!.name || config.label,
        unit: setting!.unit || config.unit,
        metricKey: config.key,
        activityCode: setting!.activityType?.code || undefined,
        activityName: setting!.activityType?.name || undefined
        };
      });
    const totalScore = Object.values(metricsResult).reduce((sum, metric) => sum + metric.score, 0);
    return {
      period,
      totalScore,
      grade: totalScore >= 90 ? 'Xuất Sắc' : totalScore >= 80 ? 'Đạt Chuẩn' : totalScore >= 70 ? 'Khá' : 'Cần Cải Thiện',
      items,
      metrics: metricsResult
    };
  },

  // ==========================================
  // REVENUE MANAGEMENT (DOANH THU & ĐỐI SOÁT HOA HỒNG)
  // ==========================================

  async getServiceUsageRecords(personnelId: number): Promise<ServiceUsageRecord[]> {
    const effectiveNow = await getEffectiveSystemDate();
    const rows = await prisma.serviceUsageRecord.findMany({
      where: { personnelId },
      include: { personnel: true, assignedUser: true, assignees: { include: { user: true } }, payments: { include: { paidBy: true }, orderBy: { paidAt: 'asc' } } },
      orderBy: [{ usageDate: 'desc' }, { createdAt: 'desc' }]
    });
    return rows.map((row) => mapServiceUsageRecord(row, effectiveNow));
  },

  async getServiceUsageAccountingRecords(): Promise<ServiceUsageRecord[]> {
    const effectiveNow = await getEffectiveSystemDate();
    const rows = await prisma.serviceUsageRecord.findMany({
      where: { status: { not: 'cancelled' }, paymentStatus: { not: 'paid' } },
      include: { personnel: true, assignedUser: true, assignees: { include: { user: true } }, payments: { include: { paidBy: true }, orderBy: { paidAt: 'asc' } } },
      orderBy: [{ usageDate: 'asc' }, { createdAt: 'asc' }]
    });
    return rows.map((row) => mapServiceUsageRecord(row, effectiveNow)).filter((record) => record.status === 'completed');
  },

  async getAssignedServiceUsageRecords(userId: number): Promise<ServiceUsageRecord[]> {
    const effectiveNow = await getEffectiveSystemDate();
    const rows = await prisma.serviceUsageRecord.findMany({
      where: { status: { not: 'cancelled' }, OR: [{ assignedUserId: userId }, { assignees: { some: { userId } } }] },
      include: { personnel: true, assignedUser: true, assignees: { include: { user: true } }, payments: { include: { paidBy: true }, orderBy: { paidAt: 'asc' } } },
      orderBy: [{ startAt: 'asc' }, { usageDate: 'asc' }]
    });
    return rows.map((row) => mapServiceUsageRecord(row, effectiveNow));
  },

  async getServiceUsageAssignees(): Promise<UserAccount[]> {
    const users = await this.getUsers();
    return users.filter((user) => user.status !== 'inactive' && user.status !== 'Đã nghỉ việc');
  },

  async createServiceUsageRecord(data: {
    personnelId: number | string;
    serviceName: string;
    description?: string;
    usageDate: string;
    startAt?: string;
    endAt?: string;
    quantity?: number;
    unit?: string;
    location?: string;
    grossAmount?: number;
    discountAmount?: number;
    status?: string;
    contractRef?: string;
    invoiceRef?: string;
    revenueTransactionId?: string;
    notes?: string;
    createdById?: number;
    assignedUserId?: number;
    assignedUserIds?: number[];
  }, db: DbClient = prisma): Promise<ServiceUsageRecord> {
    if (db === prisma) return prisma.$transaction((tx) => this.createServiceUsageRecord(data, tx));
    const personnelId = Number(data.personnelId);
    const personnel = await db.personnel.findUnique({
      where: { id: personnelId },
      select: { id: true, personnelType: true, cooperationType: true }
    });
    if (!personnel) throw new Error('Không tìm thấy hồ sơ dịch vụ');
    if (!isExternalServicePersonnel(personnel)) throw new Error('Chỉ hồ sơ Dịch vụ ngoài mới có lịch sử sử dụng dịch vụ');
    if (!data.serviceName?.trim() || !data.usageDate) throw new Error('Tên dịch vụ và ngày sử dụng là bắt buộc');
    const grossAmount = Math.max(0, Number(data.grossAmount) || 0);
    const discountAmount = Math.min(grossAmount, Math.max(0, Number(data.discountAmount) || 0));
    const netAmount = grossAmount - discountAmount;
    const allowedStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    if (data.status && !allowedStatuses.includes(data.status)) throw new Error('Trạng thái lượt sử dụng dịch vụ không hợp lệ');
    const usagePrefix = `SVC-${data.usageDate.slice(0, 7).replace('-', '')}-`;
    await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${usagePrefix}))`);
    const nextRows = await db.$queryRaw<Array<{ nextNumber: number | bigint }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING("usageCode" FROM '[0-9]+$') AS INTEGER)), 0) + 1 AS "nextNumber"
      FROM "service_usage_records" WHERE "usageCode" LIKE ${`${usagePrefix}%`}
    `);
    const usageCode = `${usagePrefix}${String(Number(nextRows[0]?.nextNumber || 1)).padStart(4, '0')}`;
    const startAt = parseDateOrNull(data.startAt);
    const endAt = parseDateOrNull(data.endAt);
    if (startAt && endAt && endAt <= startAt) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    const assignedUserIds = [...new Set((data.assignedUserIds ?? (data.assignedUserId ? [data.assignedUserId] : [])).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (assignedUserIds.length > 0 && startAt && endAt) {
      const conflict = await db.serviceUsageRecord.findFirst({ where: { status: { not: 'cancelled' }, startAt: { lt: endAt }, endAt: { gt: startAt }, OR: [{ assignedUserId: { in: assignedUserIds } }, { assignees: { some: { userId: { in: assignedUserIds } } } }] }, select: { serviceName: true } });
      if (conflict) throw new Error(`Người thực hiện đã có lịch trùng với dịch vụ “${conflict.serviceName}”`);
    }
    const created = await db.serviceUsageRecord.create({
      data: {
        usageCode,
        personnelId,
        serviceName: data.serviceName.trim(),
        description: data.description?.trim() || null,
        usageDate: new Date(data.usageDate),
        startAt,
        endAt,
        quantity: new Prisma.Decimal(Math.max(0, Number(data.quantity) || 1)),
        unit: data.unit?.trim() || 'lượt',
        location: data.location?.trim() || null,
        grossAmount: new Prisma.Decimal(grossAmount),
        discountAmount: new Prisma.Decimal(discountAmount),
        netAmount: new Prisma.Decimal(netAmount),
        status: 'planned',
        assignedUserId: assignedUserIds[0] || null,
        assignees: { create: assignedUserIds.map((userId) => ({ userId })) },
        paymentStatus: 'unpaid',
        paidAmount: new Prisma.Decimal(0),
        outstandingAmount: new Prisma.Decimal(netAmount),
        completionProgress: new Prisma.Decimal(0),
        contractRef: data.contractRef?.trim() || null,
        invoiceRef: data.invoiceRef?.trim() || null,
        revenueTransactionId: data.revenueTransactionId || null,
        notes: data.notes?.trim() || null,
        createdById: data.createdById || null
      },
      include: { personnel: true, assignedUser: true, assignees: { include: { user: true } }, payments: { include: { paidBy: true } } }
    });
    return mapServiceUsageRecord(created);
  },

  async updateServiceUsageRecord(id: string, data: Partial<any>): Promise<ServiceUsageRecord | null> {
    const existing = await prisma.serviceUsageRecord.findUnique({ where: { id }, include: { personnel: true, assignedUser: true, assignees: true, payments: true } });
    if (!existing) return null;
    const grossAmount = data.grossAmount !== undefined ? Math.max(0, Number(data.grossAmount) || 0) : num(existing.grossAmount);
    const discountAmount = data.discountAmount !== undefined
      ? Math.min(grossAmount, Math.max(0, Number(data.discountAmount) || 0))
      : num(existing.discountAmount);
    const allowedStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    if (data.status !== undefined && !allowedStatuses.includes(data.status)) throw new Error('Trạng thái lượt sử dụng dịch vụ không hợp lệ');
    if (existing.paymentStatus === 'paid' && (data.startAt !== undefined || data.endAt !== undefined || data.assignedUserId !== undefined || data.assignedUserIds !== undefined || data.grossAmount !== undefined || data.discountAmount !== undefined)) throw new Error('Dịch vụ đã thanh toán đủ, không thể chỉnh sửa lịch hoặc giá trị');
    const nextStartAt = data.startAt !== undefined ? parseDateOrNull(data.startAt) : existing.startAt;
    const nextEndAt = data.endAt !== undefined ? parseDateOrNull(data.endAt) : existing.endAt;
    if (nextStartAt && nextEndAt && nextEndAt <= nextStartAt) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    const nextAssignedUserIds = data.assignedUserIds !== undefined
      ? [...new Set((data.assignedUserIds || []).map(Number).filter((userId: number) => Number.isInteger(userId) && userId > 0))]
      : data.assignedUserId !== undefined
        ? (data.assignedUserId ? [Number(data.assignedUserId)] : [])
        : (existing.assignees?.length ? existing.assignees.map((assignee: any) => assignee.userId) : existing.assignedUserId ? [existing.assignedUserId] : []);
    if (nextAssignedUserIds.length > 0 && nextStartAt && nextEndAt) {
      const conflict = await prisma.serviceUsageRecord.findFirst({ where: { id: { not: id }, status: { not: 'cancelled' }, startAt: { lt: nextEndAt }, endAt: { gt: nextStartAt }, OR: [{ assignedUserId: { in: nextAssignedUserIds } }, { assignees: { some: { userId: { in: nextAssignedUserIds } } } }] }, select: { serviceName: true } });
      if (conflict) throw new Error(`Người thực hiện đã có lịch trùng với dịch vụ “${conflict.serviceName}”`);
    }
    const nextNetAmount = grossAmount - discountAmount;
    const updated = await prisma.serviceUsageRecord.update({
      where: { id },
      data: {
        serviceName: data.serviceName !== undefined ? String(data.serviceName).trim() : undefined,
        description: data.description !== undefined ? String(data.description).trim() || null : undefined,
        usageDate: data.usageDate ? new Date(data.usageDate) : undefined,
        startAt: data.startAt !== undefined ? nextStartAt : undefined,
        endAt: data.endAt !== undefined ? nextEndAt : undefined,
        quantity: data.quantity !== undefined ? new Prisma.Decimal(Math.max(0, Number(data.quantity) || 0)) : undefined,
        unit: data.unit !== undefined ? String(data.unit).trim() || 'lượt' : undefined,
        location: data.location !== undefined ? String(data.location).trim() || null : undefined,
        grossAmount: new Prisma.Decimal(grossAmount),
        discountAmount: new Prisma.Decimal(discountAmount),
        netAmount: new Prisma.Decimal(nextNetAmount),
        assignedUserId: data.assignedUserIds !== undefined || data.assignedUserId !== undefined ? nextAssignedUserIds[0] || null : undefined,
        outstandingAmount: new Prisma.Decimal(Math.max(0, nextNetAmount - num(existing.paidAmount))),
        status: data.status === 'cancelled' ? 'cancelled' : undefined,
        contractRef: data.contractRef !== undefined ? String(data.contractRef).trim() || null : undefined,
        invoiceRef: data.invoiceRef !== undefined ? String(data.invoiceRef).trim() || null : undefined,
        revenueTransactionId: data.revenueTransactionId !== undefined ? data.revenueTransactionId || null : undefined,
        notes: data.notes !== undefined ? String(data.notes).trim() || null : undefined
      },
      include: { personnel: true, assignedUser: true, assignees: { include: { user: true } }, payments: { include: { paidBy: true } } }
    });
    if (data.assignedUserIds !== undefined || data.assignedUserId !== undefined) {
      await prisma.serviceUsageAssignee.deleteMany({ where: { serviceUsageId: id } });
      if (nextAssignedUserIds.length > 0) {
        await prisma.serviceUsageAssignee.createMany({ data: nextAssignedUserIds.map((userId) => ({ serviceUsageId: id, userId })), skipDuplicates: true });
      }
      const refreshed = await prisma.serviceUsageRecord.findUnique({ where: { id }, include: { personnel: true, assignedUser: true, assignees: { include: { user: true } }, payments: { include: { paidBy: true } } } });
      return refreshed ? mapServiceUsageRecord(refreshed) : mapServiceUsageRecord(updated);
    }
    return mapServiceUsageRecord(updated);
  },

  async cancelServiceUsageRecord(id: string, reason?: string, cancelledById?: number): Promise<boolean> {
    try {
      const existing = await prisma.serviceUsageRecord.findUnique({ where: { id }, select: { paymentStatus: true } });
      if (!existing || existing.paymentStatus === 'paid') return false;
      if (!reason?.trim()) throw new Error('Huỷ dịch vụ phải có lý do');
      await prisma.serviceUsageRecord.update({ where: { id }, data: { status: 'cancelled', cancelledAt: new Date(), cancelledById: cancelledById || null, cancellationReason: reason.trim() } });
      return true;
    } catch {
      return false;
    }
  },

  async confirmServiceUsagePayment(id: string, data: { amount?: number; categoryId?: number; platformId?: number; reference?: string; note?: string; paidById?: number }): Promise<ServiceUsageRecord | null> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.serviceUsageRecord.findUnique({ where: { id }, include: { personnel: true, payments: true } });
      if (!existing || existing.status === 'cancelled') return null;
      const remaining = Math.max(0, num(existing.netAmount) - num(existing.paidAmount));
      const amount = Math.min(remaining, Math.max(0, Number(data.amount ?? remaining) || 0));
      if (amount <= 0) throw new Error('Dịch vụ đã thanh toán đủ hoặc số tiền không hợp lệ');
      await tx.serviceUsagePayment.create({ data: { serviceUsageId: id, amount: new Prisma.Decimal(amount), paidById: data.paidById || null, reference: data.reference?.trim() || null, note: data.note?.trim() || null } });
      const totalPaid = num(existing.paidAmount) + amount;
      const paymentStatus = totalPaid >= num(existing.netAmount) ? 'paid' : 'partially_paid';
      let revenueTransactionId = existing.revenueTransactionId;
      if (!revenueTransactionId) {
        const category = data.categoryId ? await tx.revenueCategory.findUnique({ where: { id: Number(data.categoryId) } }) : await tx.revenueCategory.findFirst({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
        const platform = data.platformId ? await tx.revenuePlatform.findUnique({ where: { id: Number(data.platformId) } }) : await tx.revenuePlatform.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
        if (!category || !platform) throw new Error('Chưa cấu hình danh mục hoặc nền tảng doanh thu');
        const revenue = await this.createRevenueTransaction({ personnelId: existing.personnelId, period: existing.usageDate.toISOString().slice(0, 7), transactionDate: existing.usageDate.toISOString().slice(0, 10), categoryId: category.id, platformId: platform.id, title: existing.serviceName, contractRef: existing.contractRef || undefined, grossAmount: totalPaid, idolShareRate: 0, status: 'verified', notes: `Doanh thu từ dịch vụ ngoài ${existing.usageCode}`, createdById: data.paidById }, tx);
        revenueTransactionId = revenue.id;
      } else {
        await tx.revenueTransaction.update({
          where: { id: revenueTransactionId },
          data: { grossAmount: new Prisma.Decimal(totalPaid), totalDeductions: new Prisma.Decimal(0), netAmount: new Prisma.Decimal(totalPaid), idolPayoutAmount: new Prisma.Decimal(0), companyProfitAmount: new Prisma.Decimal(totalPaid) }
        });
      }
      const updated = await tx.serviceUsageRecord.update({ where: { id }, data: { paidAmount: new Prisma.Decimal(totalPaid), outstandingAmount: new Prisma.Decimal(Math.max(0, num(existing.netAmount) - totalPaid)), paymentStatus, paidAt: paymentStatus === 'paid' ? new Date() : existing.paidAt, paidById: data.paidById || null, paymentNote: data.note?.trim() || null, revenueTransactionId }, include: { personnel: true, assignedUser: true, payments: { include: { paidBy: true } } } });
      return mapServiceUsageRecord(updated);
    });
  },

  async getRevenueCategories(): Promise<RevenueCategory[]> {
    const categories = await prisma.revenueCategory.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    return categories.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || undefined,
      defaultIdolShareRate: num(c.defaultIdolShareRate),
      color: c.color || 'rose',
      icon: c.icon || 'DollarSign',
      isActive: c.isActive,
      displayOrder: c.displayOrder
    }));
  },

  async createRevenueCategory(data: Partial<RevenueCategory>): Promise<RevenueCategory> {
    const created = await prisma.revenueCategory.create({
      data: {
        code: data.code || `CAT_${Date.now()}`,
        name: data.name || 'Nguồn thu mới',
        description: data.description,
        defaultIdolShareRate: new Prisma.Decimal(data.defaultIdolShareRate !== undefined ? Number(data.defaultIdolShareRate) : 70.0),
        color: data.color || 'rose',
        icon: data.icon || 'DollarSign',
        displayOrder: Number(data.displayOrder) || 1,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
      }
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description || undefined,
      defaultIdolShareRate: num(created.defaultIdolShareRate),
      color: created.color || 'rose',
      icon: created.icon || 'DollarSign',
      isActive: created.isActive,
      displayOrder: created.displayOrder
    };
  },

  async updateRevenueCategory(id: number, data: Partial<RevenueCategory>): Promise<RevenueCategory | null> {
    try {
      const updated = await prisma.revenueCategory.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          defaultIdolShareRate: data.defaultIdolShareRate !== undefined ? new Prisma.Decimal(Number(data.defaultIdolShareRate)) : undefined,
          color: data.color,
          icon: data.icon,
          displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined
        }
      });
      return {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        description: updated.description || undefined,
        defaultIdolShareRate: num(updated.defaultIdolShareRate),
        color: updated.color || 'rose',
        icon: updated.icon || 'DollarSign',
        isActive: updated.isActive,
        displayOrder: updated.displayOrder
      };
    } catch {
      return null;
    }
  },

  async deleteRevenueCategory(id: number): Promise<boolean> {
    try {
      // Check if transactions exist
      const count = await prisma.revenueTransaction.count({ where: { categoryId: id } });
      if (count > 0) {
        // Soft delete / deactivate
        await prisma.revenueCategory.update({
          where: { id },
          data: { isActive: false }
        });
        return true;
      }
      await prisma.revenueCategory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getRevenuePlatforms(): Promise<RevenuePlatform[]> {
    const platforms = await prisma.revenuePlatform.findMany({
      orderBy: { id: 'asc' }
    });
    return platforms.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      defaultFeeRate: num(p.defaultFeeRate),
      feeType: p.feeType as any,
      isActive: p.isActive
    }));
  },

  async createRevenuePlatform(data: Partial<RevenuePlatform>): Promise<RevenuePlatform> {
    const created = await prisma.revenuePlatform.create({
      data: {
        code: data.code || `PLATFORM_${Date.now()}`,
        name: data.name || 'Nền tảng mới',
        defaultFeeRate: new Prisma.Decimal(data.defaultFeeRate !== undefined ? Number(data.defaultFeeRate) : 0),
        feeType: data.feeType || 'percentage',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
      }
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      defaultFeeRate: num(created.defaultFeeRate),
      feeType: created.feeType as any,
      isActive: created.isActive
    };
  },

  async updateRevenuePlatform(id: number, data: Partial<RevenuePlatform>): Promise<RevenuePlatform | null> {
    try {
      const updated = await prisma.revenuePlatform.update({
        where: { id },
        data: {
          name: data.name,
          defaultFeeRate: data.defaultFeeRate !== undefined ? new Prisma.Decimal(Number(data.defaultFeeRate)) : undefined,
          feeType: data.feeType,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined
        }
      });
      return {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        defaultFeeRate: num(updated.defaultFeeRate),
        feeType: updated.feeType as any,
        isActive: updated.isActive
      };
    } catch {
      return null;
    }
  },

  async deleteRevenuePlatform(id: number): Promise<boolean> {
    try {
      const count = await prisma.revenueTransaction.count({ where: { platformId: id } });
      if (count > 0) {
        await prisma.revenuePlatform.update({
          where: { id },
          data: { isActive: false }
        });
        return true;
      }
      await prisma.revenuePlatform.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getRevenueTransactions(filter?: {
    period?: string;
    personnelId?: number;
    categoryId?: number;
    platformId?: number;
    status?: string;
  }): Promise<RevenueTransaction[]> {
    const where: any = {};
    if (filter?.period) where.period = filter.period;
    if (filter?.personnelId) where.personnelId = Number(filter.personnelId);
    if (filter?.categoryId) where.categoryId = Number(filter.categoryId);
    if (filter?.platformId) where.platformId = Number(filter.platformId);
    if (filter?.status) where.status = filter.status;

    const list = await prisma.revenueTransaction.findMany({
      where: { ...where, personnel: businessPersonnelRelation },
      include: {
        personnel: true,
        category: true,
        platform: true,
        deductions: true
      },
      orderBy: [
        { transactionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return list.map(mapRevenueTransaction);
  },

  async getRevenueTransactionById(id: string): Promise<RevenueTransaction | null> {
    const found = await prisma.revenueTransaction.findUnique({
      where: { id },
      include: {
        personnel: true,
        category: true,
        platform: true,
        deductions: true
      }
    });
    return found ? mapRevenueTransaction(found) : null;
  },

  async createRevenueTransaction(data: {
    personnelId: number | string;
    period: string;
    transactionDate: string;
    categoryId: number;
    platformId: number;
    title: string;
    contractRef?: string;
    payoutMode?: 'percentage' | 'fixed' | 'hybrid';
    grossAmount: number;
    deductions?: Array<{ name: string; deductionType: string; amount: number; proofUrl?: string }>;
    idolShareRate: number; // CHỈNH SỬA TÙY BIẾN CHO DEAL
    fixedPayoutAmount?: number;
    rateOverrideReason?: string;
    status?: 'draft' | 'verified' | 'synced_to_payroll' | 'cancelled';
    proofUrl?: string;
    notes?: string;
    createdById?: number;
  }, db: DbClient = prisma): Promise<RevenueTransaction> {
    if (db === prisma) return prisma.$transaction((tx) => this.createRevenueTransaction(data, tx));
    const personnelId = Number(data.personnelId);
    const categoryId = Number(data.categoryId);
    const platformId = Number(data.platformId);
    await assertBusinessPersonnel(personnelId, db);
    const payoutMode = data.payoutMode || 'percentage';
    const grossAmount = Math.max(0, Number(data.grossAmount) || 0);
    const personnel = await db.personnel.findUnique({
      where: { id: personnelId },
      select: { personnelType: true, cooperationType: true }
    });
    const isExternalService = isExternalServicePersonnel(personnel);

    const deductions = data.deductions || [];
    const totalDeductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const netAmount = Math.max(0, grossAmount - totalDeductions);

    const idolShareRate = isExternalService ? 0 : (data.idolShareRate !== undefined ? Number(data.idolShareRate) : 70);
    const fixedPayoutAmount = isExternalService ? 0 : (Number(data.fixedPayoutAmount) || 0);

    let idolPayoutAmount = 0;
    if (payoutMode === 'fixed') {
      idolPayoutAmount = fixedPayoutAmount;
    } else if (payoutMode === 'hybrid') {
      idolPayoutAmount = fixedPayoutAmount + (netAmount * (idolShareRate / 100));
    } else {
      idolPayoutAmount = netAmount * (idolShareRate / 100);
    }
    const companyProfitAmount = Math.max(0, netAmount - idolPayoutAmount);

    const codePrefix = `REV-${data.period.replace('-', '')}-`;
    await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${codePrefix}))`);
    const nextCodeRows = await db.$queryRaw<Array<{ nextNumber: number | bigint }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING("transactionCode" FROM '[0-9]+$') AS INTEGER)), 0) + 1 AS "nextNumber"
      FROM "revenue_transactions"
      WHERE "transactionCode" LIKE ${`${codePrefix}%`}
    `);
    const nextCodeNumber = Number(nextCodeRows[0]?.nextNumber || 1);
    const transactionCode = `${codePrefix}${String(nextCodeNumber).padStart(4, '0')}`;

    const created = await db.revenueTransaction.create({
      data: {
        transactionCode,
        personnelId,
        period: data.period,
        transactionDate: new Date(data.transactionDate),
        categoryId,
        platformId,
        title: data.title,
        contractRef: data.contractRef,
        payoutMode,
        grossAmount: new Prisma.Decimal(grossAmount),
        totalDeductions: new Prisma.Decimal(totalDeductions),
        netAmount: new Prisma.Decimal(netAmount),
        idolShareRate: new Prisma.Decimal(idolShareRate),
        fixedPayoutAmount: new Prisma.Decimal(fixedPayoutAmount),
        idolPayoutAmount: new Prisma.Decimal(idolPayoutAmount),
        companyProfitAmount: new Prisma.Decimal(companyProfitAmount),
        rateOverrideReason: data.rateOverrideReason,
        status: data.status || 'draft',
        proofUrl: data.proofUrl,
        notes: data.notes,
        createdById: data.createdById,
        deductions: {
          create: deductions.map(d => ({
            name: d.name,
            deductionType: d.deductionType || 'platform_fee',
            amount: new Prisma.Decimal(Number(d.amount) || 0),
            proofUrl: d.proofUrl
          }))
        }
      },
      include: {
        personnel: true,
        category: true,
        platform: true,
        deductions: true
      }
    });

    return mapRevenueTransaction(created);
  },

  async updateRevenueTransaction(id: string, data: Partial<any>): Promise<RevenueTransaction | null> {
    const existing = await prisma.revenueTransaction.findUnique({
      where: { id },
      include: { deductions: true }
    });
    if (!existing) return null;

    const grossAmount = data.grossAmount !== undefined ? Math.max(0, Number(data.grossAmount)) : num(existing.grossAmount);
    const deductions = data.deductions !== undefined ? data.deductions : existing.deductions.map(d => ({
      name: d.name,
      deductionType: d.deductionType,
      amount: num(d.amount),
      proofUrl: d.proofUrl
    }));
    const totalDeductions = deductions.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
    const netAmount = Math.max(0, grossAmount - totalDeductions);

    const payoutMode = data.payoutMode || existing.payoutMode;
    const nextPersonnelId = data.personnelId !== undefined ? Number(data.personnelId) : existing.personnelId;
    await assertBusinessPersonnel(nextPersonnelId);
    const personnel = await prisma.personnel.findUnique({
      where: { id: nextPersonnelId },
      select: { personnelType: true, cooperationType: true }
    });
    const isExternalService = isExternalServicePersonnel(personnel);
    const idolShareRate = isExternalService ? 0 : (data.idolShareRate !== undefined ? Number(data.idolShareRate) : num(existing.idolShareRate));
    const fixedPayoutAmount = isExternalService ? 0 : (data.fixedPayoutAmount !== undefined ? Number(data.fixedPayoutAmount) : num(existing.fixedPayoutAmount));

    let idolPayoutAmount = 0;
    if (payoutMode === 'fixed') {
      idolPayoutAmount = fixedPayoutAmount;
    } else if (payoutMode === 'hybrid') {
      idolPayoutAmount = fixedPayoutAmount + (netAmount * (idolShareRate / 100));
    } else {
      idolPayoutAmount = netAmount * (idolShareRate / 100);
    }
    const companyProfitAmount = Math.max(0, netAmount - idolPayoutAmount);

    if (data.deductions !== undefined) {
      await prisma.revenueDeductionItem.deleteMany({ where: { transactionId: id } });
    }

    const updated = await prisma.revenueTransaction.update({
      where: { id },
      data: {
        personnelId: data.personnelId !== undefined ? nextPersonnelId : undefined,
        period: data.period !== undefined ? data.period : undefined,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
        categoryId: data.categoryId !== undefined ? Number(data.categoryId) : undefined,
        platformId: data.platformId !== undefined ? Number(data.platformId) : undefined,
        title: data.title !== undefined ? data.title : undefined,
        contractRef: data.contractRef !== undefined ? data.contractRef : undefined,
        payoutMode,
        grossAmount: new Prisma.Decimal(grossAmount),
        totalDeductions: new Prisma.Decimal(totalDeductions),
        netAmount: new Prisma.Decimal(netAmount),
        idolShareRate: new Prisma.Decimal(idolShareRate),
        fixedPayoutAmount: new Prisma.Decimal(fixedPayoutAmount),
        idolPayoutAmount: new Prisma.Decimal(idolPayoutAmount),
        companyProfitAmount: new Prisma.Decimal(companyProfitAmount),
        rateOverrideReason: data.rateOverrideReason !== undefined ? data.rateOverrideReason : undefined,
        status: data.status !== undefined ? data.status : undefined,
        proofUrl: data.proofUrl !== undefined ? data.proofUrl : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        approvedById: data.approvedById !== undefined ? data.approvedById : undefined,
        deductions: data.deductions !== undefined ? {
          create: deductions.map((d: any) => ({
            name: d.name,
            deductionType: d.deductionType || 'platform_fee',
            amount: new Prisma.Decimal(Number(d.amount) || 0),
            proofUrl: d.proofUrl
          }))
        } : undefined
      },
      include: {
        personnel: true,
        category: true,
        platform: true,
        deductions: true
      }
    });

    return mapRevenueTransaction(updated);
  },

  async deleteRevenueTransaction(id: string): Promise<boolean> {
    try {
      await prisma.revenueTransaction.update({ where: { id }, data: { status: 'cancelled' } });
      return true;
    } catch {
      return false;
    }
  },

  async getRevenueSummary(period: string): Promise<RevenueSummary> {
    const transactions = await prisma.revenueTransaction.findMany({
      where: { period, personnel: businessPersonnelRelation },
      include: { personnel: true }
    });
    const externalPersonnelIds = new Set(
      (await prisma.personnel.findMany({
        where: { OR: [{ personnelType: 'Dịch vụ ngoài' }, { cooperationType: 'service_guest' }] },
        select: { id: true }
      })).map(personnel => personnel.id)
    );

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalIdolPayout = 0;
    let totalCompanyProfit = 0;
    let verifiedCount = 0;
    let syncedCount = 0;

    for (const tx of transactions) {
      if (tx.status !== 'cancelled') {
        totalGross += num(tx.grossAmount);
        totalDeductions += num(tx.totalDeductions);
        totalNet += num(tx.netAmount);
        const externalService = externalPersonnelIds.has(tx.personnelId) || isExternalServicePersonnel(tx.personnel);
        totalIdolPayout += externalService ? 0 : num(tx.idolPayoutAmount);
        totalCompanyProfit += externalService ? num(tx.netAmount) : num(tx.companyProfitAmount);
      }
      if (tx.status === 'verified') verifiedCount++;
      if (tx.status === 'synced_to_payroll') syncedCount++;
    }

    return {
      period,
      totalGross,
      totalDeductions,
      totalNet,
      totalIdolPayout,
      totalCompanyProfit,
      totalTransactions: transactions.length,
      verifiedCount,
      syncedCount
    };
  },

  async syncRevenueToPayroll(period: string, userAccountId?: number): Promise<{ syncedCount: number; updatedRecords: number }> {
    const transactions = await prisma.revenueTransaction.findMany({
      where: {
        period,
        status: { in: ['verified', 'draft'] }
      },
      include: {
        category: true,
        personnel: true
      }
    });

    const payrollTransactions = transactions.filter(tx => !isExternalServicePersonnel(tx.personnel));

    if (payrollTransactions.length === 0) {
      return { syncedCount: 0, updatedRecords: 0 };
    }

    // Group totals by personnelId
    const personnelTotals: Record<number, { commissionGmv: number; giftShare: number }> = {};
    for (const tx of payrollTransactions) {
      const pId = tx.personnelId;
      if (!personnelTotals[pId]) {
        personnelTotals[pId] = { commissionGmv: 0, giftShare: 0 };
      }
      const idolAmount = num(tx.idolPayoutAmount);
      if (tx.category.code === 'PK_DONATE') {
        personnelTotals[pId].giftShare += idolAmount;
      } else {
        personnelTotals[pId].commissionGmv += idolAmount;
      }
    }

    const periodId = `payroll-${period}`;
    let payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: periodId }
    });

    if (!payrollPeriod) {
      await this.syncPayrollPeriod(period);
      payrollPeriod = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    }
    if (!payrollPeriod) throw new Error('Khong tao duoc ky luong de dong bo doanh thu');
    assertPayrollPeriodMutable(payrollPeriod.status);

    const txIds = payrollTransactions.map(t => t.id);
    const syncedAt = new Date();
    const updatedRecordsCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const [pIdStr, amounts] of Object.entries(personnelTotals)) {
        const pId = Number(pIdStr);
        const record = await tx.payrollRecord.findFirst({
          where: {
            periodId,
            personnelId: pId
          }
        });
        if (!record) continue;

        const existingEarnings = (record.earningsDetail as any) || {};
        const existingDeductions = (record.deductionsDetail as any) || {};
        const contractSalary = Number(existingEarnings.contractBaseSalary) || num(record.contractSalarySnapshot) || 0;

        const nextCommissionGmv = amounts.commissionGmv;
        const nextGiftShare = amounts.giftShare;

        const {
          earnings,
          deductions,
          totalGross: newGross,
          totalDeductions: newTotalDeductions,
          netSalary: newNet,
          companyInsurance,
          companyLaborCost
        } = recalculatePayrollRecordFinancials({
          earnings: {
            ...existingEarnings,
            baseSalary: existingEarnings.baseSalary ?? num(record.baseSalary),
            overtimePay: existingEarnings.overtimePay ?? num(record.overtimePay),
            kpiBonus: existingEarnings.kpiBonus ?? num(record.kpiBonus),
            hotBonus: existingEarnings.hotBonus ?? num(record.hotBonus),
            commissionGmv: nextCommissionGmv,
            giftShare: nextGiftShare
          },
          deductions: existingDeductions,
          contractSalary,
          personnelType: record.personnelType
        });

        const logs = Array.isArray(record.adjustmentLogs) ? [...(record.adjustmentLogs as any[])] : [];
        logs.push({
          timestamp: syncedAt.toISOString(),
          actor: userAccountId ? `User #${userAccountId} (Revenue Auto-Sync)` : 'Hệ thống Doanh Thu (Auto-Sync)',
          note: `Đồng bộ hoa hồng từ phân hệ Doanh thu: +${nextCommissionGmv.toLocaleString('vi-VN')}đ (commissionGmv), +${nextGiftShare.toLocaleString('vi-VN')}đ (giftShare)`
        });

        await tx.payrollRecord.update({
          where: { id: record.id },
          data: {
            commissionGmv: new Prisma.Decimal(nextCommissionGmv),
            giftShare: new Prisma.Decimal(nextGiftShare),
            totalGross: new Prisma.Decimal(newGross),
            totalDeductions: new Prisma.Decimal(newTotalDeductions),
            netSalary: new Prisma.Decimal(newNet),
            companyInsurance: new Prisma.Decimal(companyInsurance),
            companyLaborCost: new Prisma.Decimal(companyLaborCost),
            earningsDetail: earnings,
            deductionsDetail: deductions,
            adjustmentLogs: logs
          }
        });
        count++;
      }

      await tx.revenueTransaction.updateMany({
        where: { id: { in: txIds } },
        data: {
          status: 'synced_to_payroll',
          syncedAt
        }
      });

      await this.recalculatePeriodTotals(periodId, tx);
      return count;
    });

    return {
      syncedCount: payrollTransactions.length,
      updatedRecords: updatedRecordsCount
    };
  },

  async reset(): Promise<void> {
    // Reset database to default
    // We already have scripts/migrate-json-to-pg-v2.ts to reseed
  },

  // ==========================================
  // 12. PHÂN HỆ QUẢN LÝ CHI PHÍ & TÀI CHÍNH DOANH NGHIỆP
  // ==========================================
  async getCompanyExpenses(filter?: {
    period?: string;
    category?: string;
    status?: string;
    facilityType?: string;
  }): Promise<CompanyExpense[]> {
    const where: any = {};
    if (filter?.period && filter.period !== 'all') where.period = filter.period;
    if (filter?.category && filter.category !== 'all') where.category = filter.category;
    if (filter?.status && filter.status !== 'all') where.status = filter.status;
    if (filter?.facilityType && filter.facilityType !== 'all') where.facilityType = filter.facilityType;

    const list = await prisma.companyExpense.findMany({
      where,
      include: { createdBy: true },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }]
    });

    return list.map(mapCompanyExpense);
  },

  async seedInitialExpenses(): Promise<void> {
    const periodsToSeed = ['2025-07', '2025-08', '2025-09', '2025-10', '2026-10'];
    const sampleTemplates = [
      {
        cat: 'FACILITY',
        label: 'Mặt bằng & Tiện ích Studio',
        title: 'Tiền thuê mặt bằng Studio Livestream & Trụ sở Aura Talent',
        amount: 45000000,
        facilityType: 'rented',
        recipient: 'Chủ tòa nhà Landmark Tower',
        notes: 'Tiền thuê trụ sở văn phòng & 3 phòng live studio'
      },
      {
        cat: 'FACILITY',
        label: 'Mặt bằng & Tiện ích Studio',
        title: 'Đường truyền Internet FTTH chuyên dụng livestream 1Gbps',
        amount: 3500000,
        facilityType: 'rented',
        recipient: 'VNPT Telecom',
        notes: 'Gói cáp quang tốc độ cao băng thông quốc tế cho phiên live'
      },
      {
        cat: 'FACILITY',
        label: 'Mặt bằng & Tiện ích Studio',
        title: 'Tiền điện công suất lớn cho dàn PC & Đèn Studio',
        amount: 7800000,
        facilityType: 'rented',
        recipient: 'EVN Hà Nội',
        notes: 'Tiền điện 3 phòng live chạy đèn công suất lớn & điều hòa'
      },
      {
        cat: 'INVESTMENT_CAPEX',
        label: 'Đầu tư thiết bị (CapEx)',
        title: 'Trang thiết bị Micro Shure SM7B & Soundcard GoXLR Studio',
        amount: 28000000,
        facilityType: null,
        recipient: 'HANOICOMPUTER / GearVN',
        notes: 'Nâng cấp micro chuẩn phòng thu phát sóng chuyên nghiệp'
      },
      {
        cat: 'OPERATIONS_OPEX',
        label: 'Đi lại, Dụng cụ & Sửa chữa',
        title: 'Chi phí đưa đón idol & quay ngoại cảnh nhãn hàng',
        amount: 5200000,
        facilityType: null,
        recipient: 'Ekip sản xuất & Vận chuyển',
        notes: 'Xe di chuyển, phụ cấp ăn trưa và phụ kiện chụp ngoại cảnh'
      },
      {
        cat: 'OPERATIONS_OPEX',
        label: 'Đi lại, Dụng cụ & Sửa chữa',
        title: 'Bảo trì, căn chỉnh âm thanh & vệ sinh tản nhiệt dàn PC',
        amount: 2200000,
        facilityType: null,
        recipient: 'Kỹ thuật viên âm thanh',
        notes: 'Bảo dưỡng định kỳ thiết bị phòng live'
      },
      {
        cat: 'DYNAMIC_EVENT',
        label: 'Phát sinh sự kiện & Ads',
        title: 'Chi phí chạy TikTok Ads đẩy traffic phiên Mega Live',
        amount: 14500000,
        facilityType: null,
        recipient: 'TikTok Ads Agency',
        notes: 'Chạy phễu traffic đẩy doanh số phiên Live Commerce'
      }
    ];

    for (const p of periodsToSeed) {
      const existingCount = await prisma.companyExpense.count({ where: { period: p } });
      if (existingCount === 0) {
        let idx = 1;
        for (const t of sampleTemplates) {
          const code = `EXP-${p.replace('-', '')}-${String(idx).padStart(4, '0')}`;
          await prisma.companyExpense.create({
            data: {
              expenseCode: code,
              period: p,
              expenseDate: new Date(`${p}-${String(idx * 3).padStart(2, '0')}`),
              category: t.cat as any,
              categoryLabel: t.label,
              title: `${t.title} (${p})`,
              amount: new Prisma.Decimal(t.amount),
              facilityType: t.facilityType as any,
              paymentMethod: 'bank_transfer',
              recipient: t.recipient,
              invoiceRef: `INV-${p.replace('-', '')}-${idx}`,
              status: 'paid',
              notes: t.notes
            }
          });
          idx++;
        }
      }
    }

    // Seed baseline revenue for 2025-07, 2025-08, 2025-09 if missing to make trends continuous
    const historicalRevenue = [
      { period: '2025-07', gross: 185000000, net: 172000000, idolShare: 68000000, title: 'Mega Live Hè & Booking Nhãn Hàng T7/2025' },
      { period: '2025-08', gross: 215000000, net: 202000000, idolShare: 79000000, title: 'Chuỗi Live Back to School & Thương Mại T8/2025' },
      { period: '2025-09', gross: 250000000, net: 236000000, idolShare: 92000000, title: 'Đại Tiệc Live 9.9 & Booking Thời Trang T9/2025' }
    ];

    for (const hr of historicalRevenue) {
      const existing = await prisma.revenueTransaction.count({ where: { period: hr.period } });
      if (existing === 0) {
        const cat = await prisma.revenueCategory.findFirst();
        const plat = await prisma.revenuePlatform.findFirst();
        const idol = await prisma.personnel.findFirst({ where: { isIdol: true } });
        if (cat && plat && idol) {
          await prisma.revenueTransaction.create({
            data: {
              transactionCode: `REV-${hr.period.replace('-', '')}-0001`,
              period: hr.period,
              transactionDate: new Date(`${hr.period}-15`),
              categoryId: cat.id,
              platformId: plat.id,
              personnelId: idol.id,
              title: hr.title,
              grossAmount: new Prisma.Decimal(hr.gross),
              totalDeductions: new Prisma.Decimal(hr.gross - hr.net),
              netAmount: new Prisma.Decimal(hr.net),
              idolPayoutAmount: new Prisma.Decimal(hr.idolShare),
              companyProfitAmount: new Prisma.Decimal(hr.net - hr.idolShare),
              idolShareRate: 60,
              status: 'completed'
            }
          });
        }
      }
    }
  },

  async createCompanyExpense(data: {
    period: string;
    expenseDate: string;
    category: CompanyExpenseCategory;
    categoryLabel?: string;
    title: string;
    amount: number;
    facilityType?: 'fixed' | 'rented' | null;
    paymentMethod?: 'bank_transfer' | 'cash';
    recipient?: string;
    invoiceRef?: string;
    proofUrl?: string;
    status?: 'pending' | 'approved' | 'paid' | 'cancelled';
    notes?: string;
    createdById?: number;
  }, db: DbClient = prisma): Promise<CompanyExpense> {
    if (db === prisma) return prisma.$transaction((tx) => this.createCompanyExpense(data, tx));
    const cleanPeriod = data.period || new Date().toISOString().slice(0, 7);
    const codePrefix = `EXP-${cleanPeriod.replace('-', '')}-`;
    await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${codePrefix}))`);
    const nextCodeRows = await db.$queryRaw<Array<{ nextNumber: number | bigint }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING("expenseCode" FROM '[0-9]+$') AS INTEGER)), 0) + 1 AS "nextNumber"
      FROM "company_expenses"
      WHERE "expenseCode" LIKE ${`${codePrefix}%`}
    `);
    const nextCodeNumber = Number(nextCodeRows[0]?.nextNumber || 1);
    const expenseCode = `${codePrefix}${String(nextCodeNumber).padStart(4, '0')}`;

    const created = await db.companyExpense.create({
      data: {
        expenseCode,
        period: cleanPeriod,
        expenseDate: new Date(data.expenseDate || new Date()),
        category: data.category,
        categoryLabel: data.categoryLabel || getExpenseCategoryLabel(data.category),
        title: data.title,
        amount: new Prisma.Decimal(Math.max(0, Number(data.amount) || 0)),
        facilityType: data.facilityType || null,
        paymentMethod: data.paymentMethod || 'bank_transfer',
        recipient: data.recipient || null,
        invoiceRef: data.invoiceRef || null,
        proofUrl: data.proofUrl || null,
        status: data.status || 'paid',
        notes: data.notes || null,
        createdById: data.createdById ? Number(data.createdById) : null
      },
      include: { createdBy: true }
    });

    return mapCompanyExpense(created);
  },

  async updateCompanyExpense(id: string, data: Partial<CompanyExpense>): Promise<CompanyExpense | null> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(Math.max(0, Number(data.amount) || 0));
    if (data.category !== undefined) {
      updateData.category = data.category;
      updateData.categoryLabel = getExpenseCategoryLabel(data.category);
    }
    if (data.period !== undefined) updateData.period = data.period;
    if (data.expenseDate !== undefined) updateData.expenseDate = new Date(data.expenseDate);
    if (data.facilityType !== undefined) updateData.facilityType = data.facilityType;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.recipient !== undefined) updateData.recipient = data.recipient;
    if (data.invoiceRef !== undefined) updateData.invoiceRef = data.invoiceRef;
    if (data.proofUrl !== undefined) updateData.proofUrl = data.proofUrl;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.companyExpense.update({
      where: { id },
      data: updateData,
      include: { createdBy: true }
    });

    return mapCompanyExpense(updated);
  },

  async deleteCompanyExpense(id: string): Promise<boolean> {
    try {
      await prisma.companyExpense.update({ where: { id }, data: { status: 'cancelled' } });
      return true;
    } catch {
      return false;
    }
  },

  async getFinancePnLSummary(scope: 'month' | 'quarter' | 'year' | 'all' = 'month', periodRef?: string): Promise<FinancePnLSummary> {
    const resolvedPeriodRef = periodRef || (await getEffectiveSystemDate()).toISOString().slice(0, 7);
    // 1. Resolve list of periods YYYY-MM
    let periodList: string[] | null = null;
    if (scope === 'month') {
      periodList = [resolvedPeriodRef];
    } else if (scope === 'quarter') {
      const [year, qPart] = resolvedPeriodRef.split('-');
      const qNum = Number((qPart || 'Q4').replace('Q', '')) || 4;
      const startM = (qNum - 1) * 3 + 1;
      periodList = [startM, startM + 1, startM + 2].map(m => `${year}-${String(m).padStart(2, '0')}`);
    } else if (scope === 'year') {
      const year = resolvedPeriodRef;
      periodList = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    } else {
      periodList = null; // 'all'
    }

    const txWhere: any = { status: { not: 'cancelled' } };
    const expWhere: any = { status: { not: 'cancelled' } };
    const payrollWhere: any = { personnel: businessPersonnelRelation };

    if (periodList) {
      txWhere.period = { in: periodList };
      txWhere.personnel = businessPersonnelRelation;
      expWhere.period = { in: periodList };
      payrollWhere.period = { in: periodList };
    }

    // 2. Fetch data
    const [transactions, expenses, payrollRecords, externalPersonnel] = await Promise.all([
      prisma.revenueTransaction.findMany({ where: txWhere, include: { category: true, personnel: true } }),
      prisma.companyExpense.findMany({ where: expWhere }),
      prisma.payrollRecord.findMany({ where: payrollWhere }),
      prisma.personnel.findMany({
        where: { OR: [{ personnelType: 'Dịch vụ ngoài' }, { cooperationType: 'service_guest' }] },
        select: { id: true }
      })
    ]);
    const externalPersonnelIds = new Set(externalPersonnel.map(personnel => personnel.id));

    // 3. Aggregate Revenue
    let grossRevenue = 0;
    let platformFees = 0;
    let netRevenue = 0;
    let idolPayout = 0;
    const byCategory = {
      booking: 0,
      liveCommerce: 0,
      pkDonate: 0,
      externalService: 0,
      other: 0
    };

    for (const tx of transactions) {
      const gross = num(tx.grossAmount);
      const ded = num(tx.totalDeductions);
      const net = num(tx.netAmount);
      const externalService = externalPersonnelIds.has(tx.personnelId) || isExternalServicePersonnel(tx.personnel);
      const payout = externalService ? 0 : num(tx.idolPayoutAmount);

      grossRevenue += gross;
      platformFees += ded;
      netRevenue += net;
      idolPayout += payout;

      const code = tx.category.code;
      if (externalService || code === 'EXTERNAL_SERVICE' || code === 'SERVICE') byCategory.externalService += net;
      else if (code === 'BOOKING' || code === 'BRAND_BOOKING') byCategory.booking += net;
      else if (code === 'COMMERCE' || code === 'LIVE_COMMERCE') byCategory.liveCommerce += net;
      else if (code === 'PK_DONATE') byCategory.pkDonate += net;
      else byCategory.other += net;
    }

    const productionCost = 0;
    const totalDirectCost = idolPayout + productionCost;
    const grossProfit = Math.max(0, netRevenue - totalDirectCost);
    const grossMarginPercent = netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(1)) : 0;

    // 4. Aggregate Payroll & Labor Costs
    let netSalaryPayout = 0;
    let employeeInsuranceDeduction = 0;
    let companyInsurancePaid = 0;
    let totalCompanyLaborCost = 0;

    for (const p of payrollRecords) {
      const earnings = (p.earningsDetail as any) || {};
      const deductions = (p.deductionsDetail as any) || {};
      const baseSalary = num(p.baseSalary) || Number(earnings.baseSalary) || 0;
      const totalGross = num(p.totalGross);
      const net = num(p.netSalary);

      netSalaryPayout += net;
      employeeInsuranceDeduction += (Number(deductions.insurance) || 0);

      // Company insurance (21.5% for 'Công ty')
      const isOfficial = p.personnelType === 'Công ty';
      const cIns = (p as any).companyInsurance ? num((p as any).companyInsurance) : (isOfficial ? Math.round(baseSalary * 0.215) : 0);
      companyInsurancePaid += cIns;
      totalCompanyLaborCost += (totalGross + cIns);
    }

    // 5. Aggregate Company Expenses
    let facilityCost = 0;
    let facilityRent = 0;
    let facilityFixed = 0;
    let utilitiesCost = 0;
    let equipmentCapEx = 0;
    let operationsOpEx = 0;
    let dynamicEventCost = 0;
    let otherExpenses = 0;

    for (const exp of expenses) {
      const amount = num(exp.amount);
      if (exp.category === 'FACILITY') {
        facilityCost += amount;
        if (exp.facilityType === 'rented') facilityRent += amount;
        else if (exp.facilityType === 'fixed') facilityFixed += amount;
        else utilitiesCost += amount;
      } else if (exp.category === 'INVESTMENT_CAPEX') {
        equipmentCapEx += amount;
      } else if (exp.category === 'OPERATIONS_OPEX') {
        operationsOpEx += amount;
      } else if (exp.category === 'DYNAMIC_EVENT') {
        dynamicEventCost += amount;
      } else if (exp.category === 'LABOR_INSURANCE') {
        companyInsurancePaid += amount;
        totalCompanyLaborCost += amount;
      } else {
        otherExpenses += amount;
      }
    }

    // Chi phí hoạt động văn phòng (OpEx) = Lương văn phòng + BHXH + Mặt bằng + Thiết bị + Đi lại + Sự kiện + Khác
    const officeLaborCost = Math.max(0, totalCompanyLaborCost - idolPayout);
    const totalOpEx = officeLaborCost + facilityCost + equipmentCapEx + operationsOpEx + dynamicEventCost + otherExpenses;

    const operatingProfit = grossProfit - totalOpEx;
    const corporateTax = operatingProfit > 0 ? Math.round(operatingProfit * 0.2) : 0;
    const netProfit = operatingProfit - corporateTax;
    const netMarginPercent = netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(1)) : 0;

    return {
      scope,
      periodRef: resolvedPeriodRef,
      revenue: {
        grossRevenue,
        platformFees,
        netRevenue,
        byCategory
      },
      directCost: {
        idolPayout,
        productionCost,
        totalDirectCost
      },
      grossProfit,
      grossMarginPercent,
      expenses: {
        netSalaryPayout,
        employeeInsuranceDeduction,
        companyInsurancePaid,
        totalCompanyLaborCost,
        facilityCost,
        facilityRent,
        facilityFixed,
        utilitiesCost,
        equipmentCapEx,
        operationsOpEx,
        dynamicEventCost,
        otherExpenses,
        totalOpEx
      },
      operatingProfit,
      corporateTax,
      netProfit,
      netMarginPercent,
      transactionCount: transactions.length,
      expenseCount: expenses.length,
      payrollPersonnelCount: payrollRecords.length
    };
  },

  async getFinanceTrendSeries(periodRef?: string, count: number = 6): Promise<FinanceTrendData> {
    const resolvedPeriodRef = periodRef && periodRef.length >= 7
      ? periodRef
      : (await getEffectiveSystemDate()).toISOString().slice(0, 7);
    // 1. Generate list of consecutive periods ending at resolvedPeriodRef
    const [refYStr, refMStr] = resolvedPeriodRef.split('-');
    let refY = Number(refYStr) || new Date().getFullYear();
    let refM = Number(refMStr) || new Date().getMonth() + 1;

    const periods: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      let m = refM - i;
      let y = refY;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      periods.push(`${y}-${String(m).padStart(2, '0')}`);
    }

    // 2. Fetch or compute PnL summary for each period
    const series: FinanceTrendPoint[] = [];
    for (const p of periods) {
      const pnl = await this.getFinancePnLSummary('month', p);
      const [y, m] = p.split('-');
      const label = `T${Number(m)}/${y}`;
      const cogsCost = pnl.directCost.totalDirectCost;
      const opExCost = pnl.expenses.totalOpEx;
      const totalExpenses = cogsCost + opExCost;

      series.push({
        period: p,
        label,
        grossRevenue: pnl.revenue.grossRevenue,
        netRevenue: pnl.revenue.netRevenue,
        cogsCost,
        opExCost,
        totalExpenses,
        grossProfit: pnl.grossProfit,
        netProfit: pnl.netProfit,
        grossMarginPercent: pnl.grossMarginPercent,
        netMarginPercent: pnl.netMarginPercent
      });
    }

    // 3. Compute growth between current period and previous period
    const curr = series[series.length - 1];
    const prev = series.length >= 2 ? series[series.length - 2] : null;

    let revenueGrowthPercent: number | null = null;
    let expensesGrowthPercent: number | null = null;
    let netProfitGrowthPercent: number | null = null;
    let netMarginDiffPercent: number | null = null;

    if (prev && prev.netRevenue > 0) {
      revenueGrowthPercent = Number((((curr.netRevenue - prev.netRevenue) / prev.netRevenue) * 100).toFixed(1));
    }
    if (prev && prev.totalExpenses > 0) {
      expensesGrowthPercent = Number((((curr.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100).toFixed(1));
    }
    if (prev && prev.netProfit !== 0) {
      netProfitGrowthPercent = Number((((curr.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100).toFixed(1));
    }
    if (prev) {
      netMarginDiffPercent = Number((curr.netMarginPercent - prev.netMarginPercent).toFixed(1));
    }

    return {
      series,
      currentPeriod: curr?.period || resolvedPeriodRef,
      previousPeriod: prev?.period || null,
      growth: {
        revenueGrowthPercent,
        expensesGrowthPercent,
        netProfitGrowthPercent,
        netMarginDiffPercent
      }
    };
  }
};

function getExpenseCategoryLabel(cat: string): string {
  switch (cat) {
    case 'LABOR_INSURANCE': return 'Bảo hiểm & Lương';
    case 'FACILITY': return 'Mặt bằng & Tiện ích Studio';
    case 'INVESTMENT_CAPEX': return 'Đầu tư thiết bị (CapEx)';
    case 'OPERATIONS_OPEX': return 'Đi lại, Dụng cụ & Sửa chữa';
    case 'DYNAMIC_EVENT': return 'Phát sinh sự kiện & Ads';
    default: return 'Chi phí khác';
  }
}

function mapCompanyExpense(e: any): CompanyExpense {
  return {
    id: e.id,
    expenseCode: e.expenseCode,
    period: e.period,
    expenseDate: e.expenseDate instanceof Date ? e.expenseDate.toISOString().slice(0, 10) : String(e.expenseDate).slice(0, 10),
    category: e.category,
    categoryLabel: e.categoryLabel || getExpenseCategoryLabel(e.category),
    title: e.title,
    amount: num(e.amount),
    facilityType: e.facilityType as any,
    paymentMethod: e.paymentMethod as any,
    recipient: e.recipient || undefined,
    invoiceRef: e.invoiceRef || undefined,
    proofUrl: e.proofUrl || undefined,
    status: e.status as any,
    notes: e.notes || undefined,
    createdById: e.createdById || undefined,
    createdByName: e.createdBy?.username || undefined,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString()
  };
}

