import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Gauge,
  LockKeyhole,
  Send,
  X,
  Settings2,
  ShieldCheck,
  Users,
  Video
} from 'lucide-react';
import {
  ApprovalRequest,
  Criterion,
  Idol,
  IdolScoreRecord,
  IdolTask,
  LeaveRequest,
  LeaveType,
  PayrollPeriod,
  UserAccount,
  WorkScheduleSlot,
  WorkAssignment,
  ServiceUsageRecord
} from '../types/index.ts';
import { getDashboardPersona, DashboardPersona } from '../utils/dashboardPersona.ts';
import { IdolDashboardView } from './IdolDashboardView.tsx';
import { DateInput } from '../components/DateInput.tsx';
import { calculateAnnualLeaveQuota, formatDateTimeVN, getTodayIsoDate } from '../utils/dateUtils.ts';
import { SystemClockText } from '../components/SystemClockText.tsx';
import { calculateLeaveAllocation, getRemainingAnnualLeaveDays } from '../utils/leaveAllocation.ts';
import { api } from '../services/api.ts';
import { getPersonalWorkAssignmentStatus, getWorkAssignmentStatus } from '../utils/workAssignmentStatus.ts';

interface RoleDashboardViewProps {
  currentUser: UserAccount;
  idols: Idol[];
  schedules: WorkScheduleSlot[];
  scores: IdolScoreRecord[];
  tasks: IdolTask[];
  criteria: Criterion[];
  leaveRequests: LeaveRequest[];
  payrollPeriods?: PayrollPeriod[];
  payrollDisputeCount?: number;
  users?: UserAccount[];
  approvals?: ApprovalRequest[];
  onCreateLeaveRequest: (req: Partial<LeaveRequest>) => Promise<void>;
  onUpdateLeaveRequest?: (id: string, updates: Partial<LeaveRequest>) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
  onOpenProfileModal?: () => void;
  onOpenPayslip?: () => void;
  onNavigateToTab?: (tab: string, target?: { personnelId: number; usageId: string }) => void;
  workAssignments: WorkAssignment[];
  onCreateWorkAssignment: (data: Partial<WorkAssignment> & { assigneePersonnelIds: string[] }) => Promise<void>;
  onUpdateWorkAssignment?: (id: string, data: Partial<WorkAssignment> & { assigneePersonnelIds?: string[] }) => Promise<void>;
  onRespondWorkAssignment: (id: string, status: 'accepted' | 'declined', note?: string) => Promise<void>;
  onCompleteWorkAssignment: (id: string, note?: string) => Promise<void>;
  onReviewWorkAssignmentViolation?: (assignmentId: string, personnelId: string, action: 'confirm' | 'waive', note?: string) => Promise<void>;
  onCancelWorkAssignment?: (assignmentId: string, reason: string) => Promise<void>;
  onRequestWorkAssignmentWaiver?: (assignmentId: string, reason: string) => Promise<void>;
  onReviewWorkAssignmentWaiver?: (assignmentId: string, personnelId: string, action: 'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty', note?: string, penaltyRate?: number) => Promise<void>;
  referenceDate?: string;
}

const personaLabels: Record<DashboardPersona, string> = {
  system_admin: 'System Admin',
  director: 'Ban Giám đốc',
  talent_management: 'Quản lý & Phát triển Idol',
  team_leader: 'Trưởng nhóm',
  hr_finance: 'HR & Kế toán',
  commercial: 'Kinh doanh & Thương mại',
  content_production: 'Nội dung & Sản xuất',
  livestream_operations: 'Vận hành Livestream',
  idol: 'Idol / Nghệ sĩ',
  staff: 'Nhân sự vận hành'
};

const MetricCard: React.FC<{ label: string; value: string | number; hint: string; icon: React.ReactNode; tone?: string }> = ({ label, value, hint, icon, tone = 'text-sky-300' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
      </div>
      <span className={`rounded-xl bg-slate-100 p-2.5 ${tone} dark:bg-slate-800`}>{icon}</span>
    </div>
    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{hint}</p>
  </div>
);

const QuickLink: React.FC<{ label: string; description: string; icon: React.ReactNode; onClick?: () => void }> = ({ label, description, icon, onClick }) => (
  <button type="button" onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-default disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-sky-400/70 dark:hover:bg-slate-800">
    <span className="rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-slate-800 dark:text-sky-300">{icon}</span>
    <span>
      <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{label}</span>
      <span className="block text-xs text-slate-600 dark:text-slate-400">{description}</span>
    </span>
  </button>
);

type FocusFilter = 'all' | 'personnel' | 'payroll';
type FocusItem = { id: string; title: string; status: string; category: 'personnel' | 'payroll'; tab?: string; target?: { personnelId: number; usageId: string } };
type ProfileDataIssue = { idol: Idol; missing: string[]; mismatches: string[] };

const RoleDashboardView: React.FC<RoleDashboardViewProps> = (props) => {
  const persona = getDashboardPersona(props.currentUser);

  if (persona === 'idol') {
    return <IdolDashboardView {...props} />;
  }

  const { currentUser, idols, schedules, scores, tasks, leaveRequests, payrollPeriods = [], payrollDisputeCount = 0, users = [], approvals = [], onNavigateToTab, referenceDate, workAssignments, onCreateWorkAssignment, onUpdateWorkAssignment, onRespondWorkAssignment, onCompleteWorkAssignment, onReviewWorkAssignmentViolation, onCancelWorkAssignment, onRequestWorkAssignmentWaiver, onReviewWorkAssignmentWaiver } = props;
  const canManagePersonnel = currentUser.isSuperAdmin || currentUser.allowedActions?.includes('manage_idols') === true;
  const canViewPayroll = currentUser.isSuperAdmin || currentUser.allowedActions?.some((action) => ['manage_payroll', 'adjust_payroll', 'approve_payroll'].includes(action)) === true;
  const canViewApprovals = currentUser.isSuperAdmin || currentUser.role === 'director' || currentUser.allowedTabs?.includes('approvals') === true || currentUser.allowedActions?.includes('manage_approvals') === true;
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');
  const [showProfileIssues, setShowProfileIssues] = useState(true);
  const [showServiceUsage, setShowServiceUsage] = useState(true);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [leaveStartDate, setLeaveStartDate] = useState(referenceDate || getTodayIsoDate());
  const [leaveEndDate, setLeaveEndDate] = useState(referenceDate || getTodayIsoDate());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAllocationConfirmed, setLeaveAllocationConfirmed] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [serviceUsageRecords, setServiceUsageRecords] = useState<ServiceUsageRecord[]>([]);
  const today = getTodayIsoDate(referenceDate);
  const canViewServiceUsage = persona === 'hr_finance' || persona === 'director' || persona === 'talent_management' || currentUser.isSuperAdmin;
  useEffect(() => {
    if (!canViewServiceUsage) return undefined;
    let cancelled = false;
    const externalPersonnel = idols.filter((idol) => idol.personnelType === 'Dịch vụ ngoài');
    Promise.all(externalPersonnel.map((idol) => api.getServiceUsageRecords(idol.id)))
      .then((groups) => { if (!cancelled) setServiceUsageRecords(groups.flat().filter((record) => record.status !== 'cancelled')); })
      .catch(() => { if (!cancelled) setServiceUsageRecords([]); });
    return () => { cancelled = true; };
  }, [canViewServiceUsage, idols]);
  const currentMonth = today.slice(0, 7);
  const activePersonnel = useMemo(() => idols.filter((idol) => idol.status !== 'Đã nghỉ việc'), [idols]);
  const personalProfile = useMemo(() => idols.find((idol) => idol.id === currentUser.idolId || idol.userId === currentUser.id), [currentUser.id, currentUser.idolId, idols]);
  const personalLeaveRequests = useMemo(() => leaveRequests.filter((request) => request.idolId === personalProfile?.id), [leaveRequests, personalProfile?.id]);
  const personalLeaveQuota = useMemo(() => calculateAnnualLeaveQuota(personalProfile?.joinDate, today), [personalProfile?.joinDate, today]);
  const personalRemainingLeave = useMemo(() => getRemainingAnnualLeaveDays({ totalAnnualDays: personalLeaveQuota.totalDays, requests: personalLeaveRequests }), [personalLeaveQuota.totalDays, personalLeaveRequests]);
  const leavePreviewDays = useMemo(() => {
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [leaveEndDate, leaveStartDate]);
  const leaveAllocationPreview = useMemo(() => calculateLeaveAllocation(leaveType, leavePreviewDays, personalRemainingLeave, leaveAllocationConfirmed), [leaveAllocationConfirmed, leavePreviewDays, leaveType, personalRemainingLeave]);
  const pendingPersonnel = useMemo(() => idols.filter((idol) => idol.status === 'Chờ duyệt'), [idols]);
  const newJoinersThisMonth = useMemo(() => idols.filter((idol) => idol.joinDate?.startsWith(currentMonth)), [currentMonth, idols]);
  const profileDataIssues = useMemo<ProfileDataIssue[]>(() => idols.flatMap((idol) => {
    const missing: string[] = [];
    const mismatches: string[] = [];
    if (!idol.joinDate) missing.push('Thiếu ngày vào');
    if (!idol.department) missing.push('Thiếu đơn vị');
    if (!idol.personnelType) missing.push('Thiếu loại nhân sự');
    if (idol.personnelType === 'Công ty') {
      if (!idol.baseSalary || idol.baseSalary <= 0) missing.push('Thiếu lương hợp đồng');
      if (!idol.bankName) missing.push('Thiếu ngân hàng');
      if (!idol.bankAccountNumber) missing.push('Thiếu số tài khoản');
    }
    if (idol.resignedDate && idol.status !== 'Đã nghỉ việc') mismatches.push('Có ngày nghỉ nhưng trạng thái chưa nghỉ việc');
    if (idol.status === 'Đã nghỉ việc' && !idol.resignedDate) mismatches.push('Đã nghỉ việc nhưng thiếu ngày nghỉ');
    if (idol.joinDate && idol.resignedDate && idol.joinDate >= idol.resignedDate) mismatches.push('Ngày vào/ngày nghỉ không hợp lệ');
    return missing.length || mismatches.length ? [{ idol, missing, mismatches }] : [];
  }), [idols, schedules]);
  const incompleteProfiles = useMemo(() => profileDataIssues.filter((issue) => issue.missing.length > 0), [profileDataIssues]);
  const mismatchedProfiles = useMemo(() => profileDataIssues.filter((issue) => issue.mismatches.length > 0), [profileDataIssues]);
  const resignedWithSchedules = useMemo(() => idols.filter((idol) => {
    if (!idol.resignedDate || idol.resignedDate > today) return false;
    return schedules.some((schedule) => schedule.isActive && schedule.idolId === idol.id);
  }), [idols, schedules, today]);
  const latestPayroll = useMemo(() => [...payrollPeriods].sort((a, b) => b.period.localeCompare(a.period))[0], [payrollPeriods]);
  const payrollStatusLabel: Record<string, string> = {
    draft: 'Dự thảo',
    pending_approval: 'Chờ duyệt',
    approved: 'Đã duyệt',
    locked_paid: 'Đã khoá / đã chi'
  };
  const activeSchedules = useMemo(() => schedules.filter((schedule) => schedule.isActive), [schedules]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed'), [tasks]);
  const pendingLeaves = useMemo(() => leaveRequests.filter((request) => request.status === 'pending'), [leaveRequests]);
  const averageScore = useMemo(() => {
    if (!scores.length) return '0';
    return (scores.reduce((sum, score) => sum + score.averageScore, 0) / scores.length).toFixed(1);
  }, [scores]);
  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending').length;
  const serviceFocusItems = useMemo<FocusItem[]>(() => serviceUsageRecords
    .filter((record) => record.status !== 'cancelled' && !(record.status === 'completed' && record.paymentStatus === 'paid'))
    .sort((a, b) => {
      const priority = (record: ServiceUsageRecord) => record.status === 'completed' ? 0 : record.status === 'in_progress' ? 1 : 2;
      return priority(a) - priority(b);
    })
    .map((record) => {
      const needsPayment = record.status === 'completed';
      return {
        id: `service-usage-${record.id}`,
        title: needsPayment ? `${record.usageCode} · Kiểm tra xác nhận thanh toán` : `${record.usageCode} · Theo dõi dịch vụ ngoài`,
        status: needsPayment ? 'Chờ xác nhận thanh toán' : record.status === 'in_progress' ? 'Đang thực hiện' : 'Theo dõi lịch',
        category: needsPayment ? 'payroll' : 'personnel',
        tab: 'service_usage',
        target: { personnelId: record.personnelId, usageId: record.id }
      };
    }), [serviceUsageRecords]);
  const visibleWorkAssignments = useMemo(() => workAssignments.filter((assignment) => currentUser.isSuperAdmin || currentUser.allowedActions?.includes('manage_work_assignments') || assignment.assignees.some((assignee) => assignee.personnelId === currentUser.idolId)), [currentUser.allowedActions, currentUser.idolId, currentUser.isSuperAdmin, workAssignments]);
  const workAssignmentSummary = useMemo(() => {
    const isManager = currentUser.isSuperAdmin || currentUser.allowedActions?.includes('manage_work_assignments') === true;
    const statusOf = (assignment: WorkAssignment) => isManager
      ? getWorkAssignmentStatus(assignment)
      : getPersonalWorkAssignmentStatus(assignment, currentUser.idolId);
    return {
      total: visibleWorkAssignments.length,
      open: visibleWorkAssignments.filter((assignment) => !['completed', 'cancelled'].includes(statusOf(assignment))).length,
      completed: visibleWorkAssignments.filter((assignment) => statusOf(assignment) === 'completed').length
    };
  }, [currentUser.allowedActions, currentUser.idolId, currentUser.isSuperAdmin, visibleWorkAssignments]);
  const personalTimeline: Array<{ id: string; kind: 'work' | 'service'; startAt?: string; endAt?: string; title: string; subject: string; location?: string; status: string }> = [];
  const visibleUsers = users.length || '—';
  const allFocusItems = useMemo<FocusItem[]>(() => {
    if (persona === 'system_admin' || persona === 'director') {
      return approvals
        .filter((approval) => approval.status === 'pending')
        .slice(0, 5)
        .map((approval) => ({ id: approval.id, title: approval.targetName, status: 'Chờ phê duyệt', category: 'personnel', tab: canViewApprovals ? 'approvals' : undefined }));
    }
    if (persona === 'hr_finance') {
      const items = [
        ...(canViewApprovals ? pendingLeaves.slice(0, 3).map((request) => ({ id: request.id, title: `${request.idolName} · Đơn nghỉ phép`, status: 'Chờ xử lý', category: 'personnel' as const, tab: 'approvals' })) : []),
        ...(canManagePersonnel ? pendingPersonnel.slice(0, 2).map((idol) => ({ id: `pending-${idol.id}`, title: `${idol.stageName || idol.realName} · Hồ sơ chờ duyệt`, status: 'Chờ duyệt', category: 'personnel' as const, tab: 'roster' })) : []),
        ...(canManagePersonnel && profileDataIssues.length > 0 ? [{ id: 'profile-data-issues', title: `${incompleteProfiles.length} hồ sơ thiếu · ${mismatchedProfiles.length} hồ sơ lệch dữ liệu`, status: 'Cần kiểm tra', category: 'personnel' as const, tab: 'roster' }] : []),
        ...(resignedWithSchedules.length > 0 ? [{ id: 'resigned-schedules', title: `${resignedWithSchedules.length} hồ sơ còn lịch sau ngày nghỉ`, status: 'Ưu tiên', category: 'personnel' as const, tab: 'schedule' }] : []),
        ...(canViewPayroll && payrollDisputeCount > 0 ? [{ id: 'payroll-disputes', title: `${payrollDisputeCount} tranh chấp bảng lương đang mở`, status: 'Ưu tiên', category: 'payroll' as const, tab: 'payroll_disputes' }] : []),
        ...(canViewPayroll && latestPayroll ? [{ id: `payroll-${latestPayroll.id}`, title: `Kỳ lương ${latestPayroll.period}`, status: payrollStatusLabel[latestPayroll.status] || latestPayroll.status, category: 'payroll' as const, tab: 'payroll' }] : [])
      ];
      return items.slice(0, 5);
    }
    if (persona === 'staff') return [];
    return openTasks.slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status === 'in_progress' ? 'Đang làm' : 'Chưa làm',
      category: 'personnel' as const
    }));
  }, [approvals, canManagePersonnel, canViewApprovals, canViewPayroll, incompleteProfiles.length, latestPayroll, mismatchedProfiles.length, payrollDisputeCount, pendingLeaves, pendingPersonnel, persona, payrollStatusLabel, profileDataIssues.length, resignedWithSchedules.length, openTasks, serviceFocusItems]);
  const focusItems = useMemo(() => {
    if (persona !== 'hr_finance' || focusFilter === 'all') return allFocusItems;
    return allFocusItems.filter((item) => item.category === focusFilter);
  }, [allFocusItems, focusFilter, persona]);
  const visibleServiceFocusItems = persona === 'hr_finance' && (focusFilter === 'all' || focusFilter === 'personnel') ? serviceFocusItems : [];
  const focusHeading = persona === 'system_admin' ? 'Kiểm soát hệ thống' : persona === 'director' ? 'Việc cần điều hành' : persona === 'hr_finance' ? 'Việc cần xử lý' : persona === 'talent_management' ? 'Điều phối Idol' : persona === 'team_leader' ? 'Công việc của nhóm' : persona === 'commercial' ? 'Hoạt động thương mại' : persona === 'content_production' ? 'Sản xuất cần theo dõi' : persona === 'livestream_operations' ? 'Vận hành cần theo dõi' : 'Công việc của tôi';
  const focusDescription = persona === 'system_admin' ? 'Các yêu cầu và quyền cần kiểm soát trong toàn hệ thống' : persona === 'director' ? 'Các yêu cầu phê duyệt và việc cần quyết định' : persona === 'hr_finance' ? 'Hồ sơ, phê duyệt và dữ liệu lương theo quyền của bạn' : persona === 'talent_management' ? 'Nhiệm vụ và hoạt động của Idol trong phạm vi quản lý' : persona === 'team_leader' ? 'Nhiệm vụ cần cập nhật trong nhóm phụ trách' : persona === 'commercial' ? 'Nhiệm vụ và hoạt động kinh doanh đang mở' : persona === 'content_production' ? 'Nhiệm vụ sản xuất và lịch liên quan' : persona === 'livestream_operations' ? 'Ca vận hành và nhiệm vụ cần phối hợp' : 'Nhiệm vụ và lịch được giao cho bạn';
  const focusEmptyMessage = persona === 'hr_finance'
    ? focusFilter === 'personnel' ? 'Không có hồ sơ hoặc yêu cầu nhân sự cần xử lý.' : focusFilter === 'payroll' ? 'Không có dữ liệu bảng lương cần xử lý.' : 'Không có hồ sơ, đơn nghỉ phép hoặc bảng lương cần xử lý.'
    : persona === 'system_admin' || persona === 'director'
      ? 'Chưa có yêu cầu chờ phê duyệt.'
      : 'Chưa có công việc cần xử lý.';

  const personaMetrics: Record<Exclude<DashboardPersona, 'idol'>, Array<{ label: string; value: string | number; hint: string; icon: React.ReactNode; tone?: string }>> = {
    system_admin: [
      { label: 'Tài khoản hệ thống', value: visibleUsers, hint: 'Tài khoản đã được đồng bộ', icon: <Users className="h-5 w-5" />, tone: 'text-violet-300' },
      { label: 'Quyền đang chờ rà soát', value: pendingApprovals, hint: 'Yêu cầu cần xử lý', icon: <ShieldCheck className="h-5 w-5" />, tone: 'text-rose-300' },
      { label: 'Đơn vị trong phạm vi', value: 'Toàn hệ thống', hint: 'Không gắn hồ sơ lương cá nhân', icon: <LockKeyhole className="h-5 w-5" />, tone: 'text-amber-300' }
    ],
    director: [
      { label: 'Nhân sự / Idol', value: idols.length, hint: 'Trong phạm vi được cấp', icon: <Users className="h-5 w-5" /> },
      { label: 'Ca đang hoạt động', value: activeSchedules.length, hint: 'Theo lịch vận hành', icon: <CalendarClock className="h-5 w-5" />, tone: 'text-emerald-300' },
      { label: 'Việc cần điều hành', value: openTasks.length, hint: 'Đang chờ hoàn tất', icon: <ClipboardList className="h-5 w-5" />, tone: 'text-amber-300' }
    ],
    talent_management: [
      { label: 'Idol trong phạm vi', value: idols.length, hint: 'Ba nhóm Idol chuyên biệt', icon: <Users className="h-5 w-5" /> },
      { label: 'Điểm KPI trung bình', value: averageScore, hint: 'Từ dữ liệu đã chấm', icon: <Gauge className="h-5 w-5" />, tone: 'text-violet-300' },
      { label: 'Lịch & nhiệm vụ', value: activeSchedules.length + openTasks.length, hint: 'Đang cần điều phối', icon: <Activity className="h-5 w-5" />, tone: 'text-emerald-300' }
    ],
    team_leader: [
      { label: 'Thành viên nhóm', value: idols.length, hint: 'Theo phạm vi nhóm', icon: <Users className="h-5 w-5" /> },
      { label: 'Ca đã gán', value: activeSchedules.length, hint: 'Cần theo dõi trong tuần', icon: <Video className="h-5 w-5" />, tone: 'text-emerald-300' },
      { label: 'Nhiệm vụ mở', value: openTasks.length, hint: 'Cần cập nhật tiến độ', icon: <ClipboardList className="h-5 w-5" />, tone: 'text-amber-300' }
    ],
    hr_finance: [
      { label: 'Nhân sự đang hoạt động', value: activePersonnel.length, hint: `${newJoinersThisMonth.length} mới vào trong tháng`, icon: <Users className="h-5 w-5" /> },
      { label: 'Cần xử lý', value: pendingLeaves.length + pendingPersonnel.length, hint: `${pendingLeaves.length} đơn nghỉ · ${pendingPersonnel.length} hồ sơ chờ duyệt`, icon: <CalendarClock className="h-5 w-5" />, tone: 'text-amber-300' },
      ...(canViewPayroll ? [{ label: 'Kỳ lương hiện tại', value: latestPayroll ? payrollStatusLabel[latestPayroll.status] || latestPayroll.status : 'Chưa có', hint: latestPayroll ? `${latestPayroll.employeeCount} hồ sơ trong kỳ ${latestPayroll.period}` : 'Chưa tạo kỳ lương', icon: <DollarSign className="h-5 w-5" />, tone: 'text-emerald-300' }] : []),
      { label: 'Cảnh báo dữ liệu', value: profileDataIssues.length + resignedWithSchedules.length, hint: `${incompleteProfiles.length} thiếu · ${mismatchedProfiles.length} lệch · ${resignedWithSchedules.length} lịch cần kiểm tra`, icon: <AlertTriangle className="h-5 w-5" />, tone: 'text-rose-300' }
    ],
    commercial: [
      { label: 'Đối tượng thương mại', value: idols.length, hint: 'Idol trong phạm vi', icon: <Users className="h-5 w-5" /> },
      { label: 'Hoạt động đang chạy', value: activeSchedules.length, hint: 'Live / booking cần theo dõi', icon: <BriefcaseBusiness className="h-5 w-5" />, tone: 'text-amber-300' },
      { label: 'Nhiệm vụ hoàn tất', value: tasks.filter((task) => task.status === 'completed').length, hint: 'Trong dữ liệu hiện tại', icon: <CheckCircle2 className="h-5 w-5" />, tone: 'text-emerald-300' }
    ],
    content_production: [
      { label: 'Nhiệm vụ sản xuất', value: tasks.length, hint: 'Theo phạm vi được cấp', icon: <ClipboardList className="h-5 w-5" /> },
      { label: 'Đang thực hiện', value: tasks.filter((task) => task.status === 'in_progress').length, hint: 'Cần cập nhật tiến độ', icon: <Activity className="h-5 w-5" />, tone: 'text-amber-300' },
      { label: 'Ca / lịch liên quan', value: activeSchedules.length, hint: 'Lịch quay và phát sóng', icon: <Video className="h-5 w-5" />, tone: 'text-emerald-300' }
    ],
    livestream_operations: [
      { label: 'Ca vận hành', value: activeSchedules.length, hint: 'Lịch đang hoạt động', icon: <Video className="h-5 w-5" /> },
      { label: 'Idol cần điều phối', value: idols.length, hint: 'Theo phạm vi được cấp', icon: <Users className="h-5 w-5" />, tone: 'text-violet-300' },
      { label: 'Việc đang mở', value: openTasks.length, hint: 'Cần cập nhật trạng thái', icon: <ClipboardList className="h-5 w-5" />, tone: 'text-amber-300' }
    ],
    staff: [
      { label: 'Công việc được giao', value: openTasks.length, hint: 'Chưa hoàn tất', icon: <ClipboardList className="h-5 w-5" /> },
      { label: 'Lịch liên quan', value: activeSchedules.length, hint: 'Theo phạm vi được cấp', icon: <CalendarClock className="h-5 w-5" />, tone: 'text-emerald-300' },
      { label: 'Trạng thái tài khoản', value: 'Hoạt động', hint: 'Đang đăng nhập an toàn', icon: <ShieldCheck className="h-5 w-5" />, tone: 'text-violet-300' }
    ]
  };

  const canAccessTab = (tab: string) => currentUser.isSuperAdmin || currentUser.allowedTabs?.includes(tab as never) === true;
  const quickLinks = persona === 'system_admin'
    ? [
        { label: 'Tài khoản & phân quyền', description: 'Quản lý role, quyền và phạm vi dữ liệu', icon: <Settings2 className="h-4 w-4" />, tab: 'admin' },
        { label: 'Cấu hình hệ thống', description: 'Thiết lập chung và kiểm tra quyền', icon: <LockKeyhole className="h-4 w-4" />, tab: 'admin' }
      ]
    : persona === 'director'
      ? [
          { label: 'Phê duyệt', description: 'Xem yêu cầu cần quyết định', icon: <ShieldCheck className="h-4 w-4" />, tab: 'approvals' },
          { label: 'Danh sách nhân sự', description: 'Theo dõi toàn bộ nhân sự trong phạm vi', icon: <Users className="h-4 w-4" />, tab: 'roster' },
          { label: 'Lịch làm việc', description: 'Theo dõi lịch vận hành toàn công ty', icon: <CalendarClock className="h-4 w-4" />, tab: 'schedule' }
        ]
      : persona === 'talent_management'
        ? [
            { label: 'Danh sách Idol', description: 'Theo dõi hồ sơ trong phạm vi quản lý', icon: <Users className="h-4 w-4" />, tab: 'roster' },
            { label: 'Chấm điểm KPI', description: 'Cập nhật và đánh giá hiệu suất', icon: <Gauge className="h-4 w-4" />, tab: 'scoring' },
            { label: 'Lịch làm việc', description: 'Điều phối lịch và ca của Idol', icon: <CalendarClock className="h-4 w-4" />, tab: 'schedule' },
            { label: 'Nhiệm vụ', description: 'Giao và theo dõi tiến độ', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' }
          ]
        : persona === 'team_leader'
          ? [
              { label: 'Thành viên nhóm', description: 'Tra cứu nhân sự trong nhóm', icon: <Users className="h-4 w-4" />, tab: 'roster' },
              { label: 'Lịch làm việc', description: 'Theo dõi ca của nhóm', icon: <CalendarClock className="h-4 w-4" />, tab: 'schedule' },
              { label: 'Nhiệm vụ', description: 'Cập nhật tiến độ công việc', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' }
            ]
          : persona === 'commercial'
            ? [
                { label: 'Doanh thu', description: 'Theo dõi booking và doanh thu', icon: <DollarSign className="h-4 w-4" />, tab: 'revenue' },
                { label: 'Nhiệm vụ', description: 'Theo dõi hoạt động kinh doanh', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' },
                { label: 'Phân tích', description: 'Xem số liệu trong phạm vi', icon: <BarChart3 className="h-4 w-4" />, tab: 'analytics' }
              ]
            : persona === 'content_production'
              ? [
                  { label: 'Nhiệm vụ sản xuất', description: 'Cập nhật tiến độ nội dung', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' },
                  { label: 'Lịch quay & phát sóng', description: 'Theo dõi lịch sản xuất', icon: <CalendarClock className="h-4 w-4" />, tab: 'schedule' },
                  { label: 'Phân tích', description: 'Xem số liệu trong phạm vi', icon: <BarChart3 className="h-4 w-4" />, tab: 'analytics' }
                ]
              : persona === 'livestream_operations'
                ? [
                    { label: 'Lịch vận hành', description: 'Theo dõi ca livestream', icon: <Video className="h-4 w-4" />, tab: 'schedule' },
                    { label: 'Nhiệm vụ', description: 'Cập nhật việc cần phối hợp', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' },
                    { label: 'Phân tích', description: 'Xem số liệu vận hành', icon: <BarChart3 className="h-4 w-4" />, tab: 'analytics' }
                  ]
                : persona === 'staff'
                  ? [
                      { label: 'Nhiệm vụ của tôi', description: 'Cập nhật tiến độ công việc', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' },
                      { label: 'Lịch của tôi', description: 'Theo dõi lịch được phân công', icon: <CalendarClock className="h-4 w-4" />, tab: 'schedule' }
                    ]
    : persona === 'hr_finance'
      ? [
          ...(canManagePersonnel ? [{ label: 'Danh sách nhân sự', description: 'Tra cứu và cập nhật hồ sơ trong phạm vi', icon: <Users className="h-4 w-4" />, tab: 'roster' }] : []),
          ...(canViewPayroll ? [{ label: 'Bảng lương', description: 'Theo dõi kỳ lương và xử lý dữ liệu', icon: <DollarSign className="h-4 w-4" />, tab: 'payroll' }] : []),
          ...(resignedWithSchedules.length > 0 ? [{ label: 'Kiểm tra lịch nghỉ việc', description: `${resignedWithSchedules.length} hồ sơ còn lịch hoạt động`, icon: <Video className="h-4 w-4" />, tab: 'schedule' }] : [])
        ]
      : [
          { label: 'Lịch làm việc', description: 'Theo dõi lịch và ca đang gán', icon: <CalendarClock className="h-4 w-4" />, tab: 'schedule' },
          { label: 'Nhiệm vụ', description: 'Cập nhật tiến độ công việc', icon: <ClipboardList className="h-4 w-4" />, tab: 'tasks' },
          { label: 'Phân tích', description: 'Xem số liệu trong phạm vi', icon: <BarChart3 className="h-4 w-4" />, tab: 'analytics' }
        ];
  const visibleQuickLinks = quickLinks.filter((link) => canAccessTab(link.tab));

  const handleSubmitLeave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!personalProfile) {
      setLeaveError('Tài khoản chưa được gắn với hồ sơ nhân sự.');
      return;
    }
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim() || leavePreviewDays === 0) {
      setLeaveError('Vui lòng chọn ngày nghỉ và nhập lý do.');
      return;
    }
    if (leaveAllocationPreview.requiresConfirmation) {
      setLeaveError(`Bạn còn ${personalRemainingLeave} ngày phép năm. Vui lòng xác nhận phần nghỉ không lương còn lại.`);
      return;
    }
    const isAutoApproved = leavePreviewDays === 1 && leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays === 0;
    try {
      setLeaveSubmitting(true);
      setLeaveError(null);
      await props.onCreateLeaveRequest({
        idolId: personalProfile.id,
        idolName: personalProfile.stageName || personalProfile.realName,
        department: personalProfile.department,
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        totalDays: leavePreviewDays,
        annualLeaveDays: leaveAllocationPreview.annualLeaveDays,
        unpaidLeaveDays: leaveAllocationPreview.unpaidLeaveDays,
        allocationConfirmed: leaveAllocationConfirmed || leaveAllocationPreview.unpaidLeaveDays === 0,
        reason: leaveReason.trim(),
        status: isAutoApproved ? 'approved' : 'pending',
        approverRoleRequired: isAutoApproved ? 'auto' : leavePreviewDays >= 3 ? 'director' : 'manager',
        autoApproved: isAutoApproved,
        reviewedBy: isAutoApproved ? { id: 'system', name: 'Hệ thống' } : undefined,
        reviewNote: isAutoApproved ? 'Đã xử lý theo chính sách nghỉ phép.' : undefined,
        reviewedAt: isAutoApproved ? new Date().toISOString() : undefined
      });
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      setLeaveAllocationConfirmed(false);
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : 'Không thể gửi đơn nghỉ phép.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50 p-6 shadow-xl dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Dashboard cá nhân</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">Xin chào, {currentUser.name}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{personaLabels[persona]} · {currentUser.department || 'Toàn hệ thống'}</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-right dark:border-sky-400/30 dark:bg-sky-950/30"><p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Today</p><p className="mt-1 text-base font-black text-slate-900 dark:text-slate-100"><SystemClockText referenceDate={referenceDate} /></p><p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400"></p></div>
        </div>
      </section>

      <section className={`grid grid-cols-1 gap-4 ${persona === 'hr_finance' ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
        {personaMetrics[persona].map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm dark:border-sky-400/30 dark:bg-sky-950/20" aria-labelledby="work-assignments-shortcut-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 id="work-assignments-shortcut-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100"><BriefcaseBusiness className="h-5 w-5 text-sky-600" />Giao việc & Công tác</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Dashboard chỉ hiển thị tổng quan. Mở trang riêng để xem timeline và xử lý từng việc.</p></div>
          <button type="button" onClick={() => onNavigateToTab?.('work_assignments')} disabled={!onNavigateToTab} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-500 disabled:cursor-default disabled:opacity-60">Xem giao việc & công tác</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl border border-sky-200 bg-white/70 p-3 dark:border-sky-400/20 dark:bg-slate-900/50"><p className="text-xl font-black text-slate-900 dark:text-white">{workAssignmentSummary.total}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Tất cả</p></div><div className="rounded-xl border border-sky-200 bg-white/70 p-3 dark:border-sky-400/20 dark:bg-slate-900/50"><p className="text-xl font-black text-amber-600">{workAssignmentSummary.open}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Chưa xong</p></div><div className="rounded-xl border border-sky-200 bg-white/70 p-3 dark:border-sky-400/20 dark:bg-slate-900/50"><p className="text-xl font-black text-emerald-600">{workAssignmentSummary.completed}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Đã xong</p></div></div>
      </section>

      <section className="hidden" aria-labelledby="personal-timeline-title">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700/70">
          <div>
            <h2 id="personal-timeline-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100"><CalendarClock className="h-5 w-5 text-indigo-600" />Lịch công việc của tôi</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Theo dõi thời gian, nội dung và đối tượng của các công việc được giao.</p>
          </div>
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">{personalTimeline.length} lịch</span>
        </div>
        {personalTimeline.length === 0 ? <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">Chưa có công việc hoặc dịch vụ nào được assign cho bạn.</p> : <div className="relative mt-4 space-y-3 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-indigo-200 dark:before:bg-indigo-900/70">{personalTimeline.map((item) => <article key={item.id} className="relative pl-7"><span className="absolute left-0 top-1.5 h-5 w-5 rounded-full border-4 border-white bg-indigo-500 dark:border-slate-900" /><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/30"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-300"><span className="font-semibold">Đối tượng:</span> {item.subject}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">{item.status}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400"><span><span className="font-semibold">Thời gian:</span> {item.startAt ? formatDateTimeVN(item.startAt) : 'Chưa xác định'} → {item.endAt ? formatDateTimeVN(item.endAt) : 'Chưa xác định'}</span>{item.location && <span><span className="font-semibold">Địa điểm:</span> {item.location}</span>}<span>{item.kind === 'service' ? 'Dịch vụ ngoài' : 'Công tác / công việc'}</span></div></div></article>)}</div>}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-700/70 dark:bg-slate-950/40">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700/70">
            <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{focusHeading}</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{focusDescription}</p>
            </div>
            <Activity className="h-5 w-5 text-sky-600 dark:text-sky-300" />
          </div>
          {persona === 'hr_finance' && (
            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Bộ lọc công việc HR và kế toán">
              {(['all', 'personnel', 'payroll'] as const).map((filter) => {
                const count = filter === 'all' ? allFocusItems.length + serviceFocusItems.length : allFocusItems.filter((item) => item.category === filter).length + serviceFocusItems.filter((item) => item.category === filter).length;
                const label = filter === 'all' ? 'Tất cả' : filter === 'personnel' ? 'Nhân sự' : 'Kế toán';
                return (
                  <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={focusFilter === filter}
                    onClick={() => setFocusFilter(filter)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${focusFilter === filter ? 'bg-sky-600 text-white dark:bg-sky-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          )}
          {focusItems.length === 0 && visibleServiceFocusItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">{focusEmptyMessage}</div>
          ) : (
            <div className="space-y-4">
              {visibleServiceFocusItems.length > 0 && <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-400/30 dark:bg-sky-950/20"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Dịch vụ ngoài</h3><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Theo dõi lịch thực hiện và xác nhận thanh toán theo từng đơn.</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-bold text-sky-800 dark:bg-sky-400/10 dark:text-sky-200">{visibleServiceFocusItems.length}</span><button type="button" onClick={() => setShowServiceUsage((visible) => !visible)} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/40 dark:text-sky-200 dark:hover:bg-sky-950/50" aria-expanded={showServiceUsage}>{showServiceUsage ? 'Thu gọn' : 'Mở ra'}</button></div></div>{showServiceUsage && <div className="space-y-2">{visibleServiceFocusItems.map((item) => <button key={item.id} type="button" onClick={item.tab && onNavigateToTab ? () => onNavigateToTab(item.tab!, item.target) : undefined} disabled={!item.tab || !onNavigateToTab} className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 text-left transition enabled:hover:border-sky-500 enabled:hover:bg-sky-50 disabled:cursor-default dark:border-slate-700/70 dark:bg-slate-900/60 dark:enabled:hover:border-sky-400/70 dark:enabled:hover:bg-slate-800"><span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{item.title}</span><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">{item.status}</span></button>)}</div>}</div>}
              {focusItems.length > 0 && <div className="space-y-2">
              {focusItems.map((item) => (
                <button key={item.id} type="button" onClick={item.tab && onNavigateToTab ? () => onNavigateToTab(item.tab!, item.target) : undefined} disabled={!item.tab || !onNavigateToTab} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition enabled:hover:border-sky-400 enabled:hover:bg-sky-50 disabled:cursor-default dark:border-slate-700/70 dark:bg-slate-900/60 dark:enabled:hover:border-sky-400/70 dark:enabled:hover:bg-slate-800">
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">{item.status}</span>
                </button>
              ))}
              </div>}
            </div>
          )}
          {persona === 'hr_finance' && canManagePersonnel && profileDataIssues.length > 0 && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-400/30 dark:bg-rose-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Danh sách hồ sơ cần kiểm tra</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Xem các trường còn thiếu hoặc dữ liệu đang mâu thuẫn.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileIssues((visible) => !visible)}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-400/40 dark:bg-slate-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  aria-expanded={showProfileIssues}
                >
                  {showProfileIssues ? 'Thu gọn' : `Xem ${profileDataIssues.length} hồ sơ`}
                </button>
              </div>
              {showProfileIssues && (
                <div className="mt-3 space-y-2">
                  {profileDataIssues.map(({ idol, missing, mismatches }) => (
                    <button
                      key={idol.id}
                      type="button"
                      onClick={onNavigateToTab ? () => onNavigateToTab('roster') : undefined}
                      disabled={!onNavigateToTab}
                      className="w-full rounded-lg border border-rose-200 bg-white p-3 text-left transition enabled:hover:border-sky-400 enabled:hover:bg-sky-50 disabled:cursor-default dark:border-slate-700 dark:bg-slate-900/70 dark:enabled:hover:border-sky-400/70 dark:enabled:hover:bg-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{idol.stageName || idol.realName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{idol.department || 'Chưa phân đơn vị'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {missing.map((issue) => <span key={issue} className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">{issue}</span>)}
                        {mismatches.map((issue) => <span key={issue} className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-800 dark:bg-rose-400/10 dark:text-rose-300">{issue}</span>)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">Truy cập nhanh</h2>
          {personalProfile && <QuickLink label="Gửi đơn nghỉ phép" description="Tạo và theo dõi yêu cầu nghỉ phép của bạn" icon={<Send className="h-4 w-4" />} onClick={() => { setLeaveError(null); setIsLeaveModalOpen(true); }} />}
          {visibleQuickLinks.map((link) => <QuickLink key={link.label} {...link} onClick={onNavigateToTab ? () => onNavigateToTab(link.tab) : undefined} />)}
        </div>
      </section>
      {isLeaveModalOpen && personalProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div><h2 className="text-base font-black text-slate-900 dark:text-slate-100">Tạo đơn xin nghỉ phép</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gửi yêu cầu cho hồ sơ {personalProfile.stageName || personalProfile.realName}</p></div>
              <button type="button" onClick={() => setIsLeaveModalOpen(false)} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmitLeave} className="space-y-4 overflow-y-auto p-5">
              {leaveError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-950/30 dark:text-rose-200">{leaveError}</div>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(['annual', 'sick', 'personal'] as LeaveType[]).map((type) => <button key={type} type="button" onClick={() => setLeaveType(type)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold ${leaveType === type ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{type === 'annual' ? 'Phép năm' : type === 'sick' ? 'Ốm đau' : 'Việc riêng'}<span className="mt-1 block text-[11px] font-normal opacity-75">{type === 'annual' ? `${personalRemainingLeave} ngày còn lại` : 'Theo quy định'}</span></button>)}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Từ ngày<DateInput required value={leaveStartDate} onChange={setLeaveStartDate} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Đến hết ngày<DateInput required value={leaveEndDate} onChange={setLeaveEndDate} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              </div>
              {leavePreviewDays > 0 && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-400/40 dark:bg-sky-950/30 dark:text-sky-200">Số ngày nghỉ: <strong>{leavePreviewDays} ngày</strong>{leaveType === 'annual' && ` · Phép năm: ${leaveAllocationPreview.annualLeaveDays} · Không lương: ${leaveAllocationPreview.unpaidLeaveDays}`}</div>}
              {leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays > 0 && <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100"><input type="checkbox" checked={leaveAllocationConfirmed} onChange={(event) => setLeaveAllocationConfirmed(event.target.checked)} className="mt-0.5" />Xác nhận phần vượt quỹ phép được tính là nghỉ không lương.</label>}
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lý do nghỉ phép<textarea required value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} rows={3} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" onClick={() => setIsLeaveModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300">Hủy</button><button type="submit" disabled={leaveSubmitting} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />{leaveSubmitting ? 'Đang gửi...' : 'Gửi đơn'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { RoleDashboardView };
