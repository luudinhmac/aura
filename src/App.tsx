import React, { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Idol,
  Criterion,
  IdolScoreRecord,
  IdolTask,
  ColumnHeadersConfig,
  AppSettings,
  AppSettingsUpdate,
  UserAccount,
  AppTabPermission,
  ScoreCalculationMode,
  ApprovalRequest,
  WorkScheduleSlot,
  LeaveRequest,
  KpiGroup,
  KpiSetting,
  PersonnelColumn,
  PayrollPeriod,
  PayrollDisputeInboxItem,
  WorkAssignment,
  DEFAULT_BLANK_AVATAR
} from './types/index.ts';
import { api } from './services/api.ts';
import { canAccessAdminPortal } from './utils/adminAccess.ts';
import { getMillisecondsUntilSystemMidnight } from './utils/dateUtils.ts';
import { Navbar, NavTab, NotificationItem } from './components/Navbar.tsx';
import { IdolHoverCard } from './components/IdolHoverCard.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { PayrollRecord } from './types/index.ts';
import { Loader2, AlertCircle, ShieldAlert, AlertTriangle, Trash2, Clock, RotateCcw } from 'lucide-react';
import { confirmDialog, notify } from './utils/uiFeedback.ts';

const IdolListView = lazy(() => import('./views/IdolListView.tsx').then(({ IdolListView }) => ({ default: IdolListView })));
const ScoringSheetView = lazy(() => import('./views/ScoringSheetView.tsx').then(({ ScoringSheetView }) => ({ default: ScoringSheetView })));
const LeaderboardView = lazy(() => import('./views/LeaderboardView.tsx').then(({ LeaderboardView }) => ({ default: LeaderboardView })));
const TaskManagementView = lazy(() => import('./views/TaskManagementView.tsx').then(({ TaskManagementView }) => ({ default: TaskManagementView })));
const WorkScheduleView = lazy(() => import('./views/WorkScheduleView.tsx').then(({ WorkScheduleView }) => ({ default: WorkScheduleView })));
const AnalyticsDashboardView = lazy(() => import('./views/AnalyticsDashboardView.tsx').then(({ AnalyticsDashboardView }) => ({ default: AnalyticsDashboardView })));
const AdminPortalView = lazy(() => import('./views/AdminPortalView.tsx').then(({ AdminPortalView }) => ({ default: AdminPortalView })));
const RoleDashboardView = lazy(() => import('./views/RoleDashboardView.tsx').then(({ RoleDashboardView }) => ({ default: RoleDashboardView })));
const KpiSettingsView = lazy(() => import('./views/KpiSettingsView.tsx').then(({ KpiSettingsView }) => ({ default: KpiSettingsView })));
const PayrollManagementView = lazy(() => import('./views/PayrollManagementView.tsx').then(({ PayrollManagementView }) => ({ default: PayrollManagementView })));
const PayrollDisputesView = lazy(() => import('./views/PayrollDisputesView.tsx').then(({ PayrollDisputesView }) => ({ default: PayrollDisputesView })));
const RevenueManagementView = lazy(() => import('./views/RevenueManagementView.tsx').then(({ RevenueManagementView }) => ({ default: RevenueManagementView })));
const FinanceManagementView = lazy(() => import('./views/FinanceManagementView.tsx').then(({ FinanceManagementView }) => ({ default: FinanceManagementView })));
const ServiceUsageHistoryView = lazy(() => import('./views/ServiceUsageHistoryView.tsx').then(({ ServiceUsageHistoryView }) => ({ default: ServiceUsageHistoryView })));
const WorkAssignmentsView = lazy(() => import('./views/WorkAssignmentsView.tsx').then(({ WorkAssignmentsView }) => ({ default: WorkAssignmentsView })));
const IdolModal = lazy(() => import('./components/IdolModal.tsx').then(({ IdolModal }) => ({ default: IdolModal })));
const IdolDetailModal = lazy(() => import('./components/IdolDetailModal.tsx').then(({ IdolDetailModal }) => ({ default: IdolDetailModal })));
const UserProfileModal = lazy(() => import('./components/UserProfileModal.tsx').then(({ UserProfileModal }) => ({ default: UserProfileModal })));
const ChangePasswordModal = lazy(() => import('./components/ChangePasswordModal.tsx').then(({ ChangePasswordModal }) => ({ default: ChangePasswordModal })));
const PayslipModal = lazy(() => import('./components/PayslipModal.tsx').then(({ PayslipModal }) => ({ default: PayslipModal })));

const ViewLoading = () => (
  <div className="min-h-[320px] flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
      Đang tải phân hệ...
    </div>
  </div>
);

const DEFAULT_HEADERS: ColumnHeadersConfig = {
  stt: 'STT',
  stageName: 'Nghệ Danh & Ảnh',
  realName: 'Tên Thật',
  age: 'Tuổi',
  dob: 'Ngày Sinh',
  role: 'Nghề Nghiệp',
  height: 'Chiều Cao',
  weight: 'Cân Nặng',
  hometown: 'Quê Quán',
  currentLiving: 'Nơi Sống',
  department: 'Thuộc Đơn Vị',
  status: 'Trạng Thái',
  actions: 'Thao Tác'
};

const DEFAULT_SETTINGS: AppSettings = {
  referenceYear: new Date().getFullYear(),
  tieBreakerEnabled: true,
  tieBreakerCriteriaIds: [],
  scoreCalculationMode: 'sum'
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('aura_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem('aura_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return null;
  });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    localStorage.removeItem('aura_auth_user');
    api.setSessionExpiredHandler(() => {
      if (mounted) setCurrentUser(null);
    });
    api.restoreSession().then((user) => {
      if (mounted) setCurrentUser(user);
    }).finally(() => {
      if (mounted) setAuthReady(true);
    });
    return () => {
      mounted = false;
      api.setSessionExpiredHandler(null);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem('aura_active_tab') as NavTab;
      const validTabs: NavTab[] = ['roster', 'scoring', 'leaderboard', 'schedule', 'tasks', 'analytics', 'admin', 'my_dashboard', 'work_assignments', 'payroll', 'payroll_disputes', 'kpi', 'revenue', 'finance', 'service_usage'];
      if (saved && validTabs.includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'roster';
  });

  useEffect(() => {
    try {
      localStorage.setItem('aura_active_tab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  const [idols, setIdols] = useState<Idol[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<IdolScoreRecord[]>([]);
  const [tasks, setTasks] = useState<IdolTask[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [personnelTypes, setPersonnelTypes] = useState<string[]>(['Công ty', 'Cộng tác viên', 'Thực tập sinh', 'Dịch vụ ngoài']);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleSlot[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [kpiGroups, setKpiGroups] = useState<KpiGroup[]>([]);
  const [kpiSettings, setKpiSettings] = useState<KpiSetting[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<ColumnHeadersConfig>(DEFAULT_HEADERS);
  const [personnelColumns, setPersonnelColumns] = useState<PersonnelColumn[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Đồng bộ mốc ngày chuẩn hệ thống (referenceDate) vào localStorage để toàn bộ ứng dụng dùng chung làm ngày hiện tại
  useEffect(() => {
    try {
      if (settings.referenceDate) {
        localStorage.setItem('aura_system_reference_date', settings.referenceDate);
        if (settings.referenceTime) localStorage.setItem('aura_system_reference_time', settings.referenceTime);
        else localStorage.removeItem('aura_system_reference_time');
        if (settings.referenceClockAnchorAt) localStorage.setItem('aura_system_reference_clock_anchor', settings.referenceClockAnchorAt);
        else localStorage.removeItem('aura_system_reference_clock_anchor');
      } else {
        localStorage.removeItem('aura_system_reference_date');
        localStorage.removeItem('aura_system_reference_time');
        localStorage.removeItem('aura_system_reference_clock_anchor');
      }
    } catch {
      // ignore
    }
  }, [settings.referenceDate, settings.referenceTime, settings.referenceClockAnchorAt]);

  const [, setReferenceDateRefresh] = useState(0);
  useEffect(() => {
    if (!settings.referenceDate || !settings.referenceClockAnchorAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextMidnightRefresh = () => {
      const delay = getMillisecondsUntilSystemMidnight(settings.referenceDate, settings.referenceTime, settings.referenceClockAnchorAt);
      timer = setTimeout(() => {
        setReferenceDateRefresh((value) => value + 1);
        scheduleNextMidnightRefresh();
      }, delay);
    };
    scheduleNextMidnightRefresh();
    return () => clearTimeout(timer);
  }, [settings.referenceDate, settings.referenceTime, settings.referenceClockAnchorAt]);

  const effectiveReferenceDate = settings.referenceDate;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const loadedDataRef = useRef(new Set<string>());

  // Hover Popover State
  const [hoveredIdol, setHoveredIdol] = useState<Idol | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const isHoveringCardRef = useRef(false);
  const hoverTimeoutRef = useRef<any>(null);

  // Modals state
  const [isIdolModalOpen, setIsIdolModalOpen] = useState(false);
  const [idolToEdit, setIdolToEdit] = useState<Idol | null>(null);
  const [detailModalIdol, setDetailModalIdol] = useState<Idol | null>(null);
  const [taskDetailSelectedIdolId, setTaskDetailSelectedIdolId] = useState<string>('');
  const [scheduleSelectedIdolId, setScheduleSelectedIdolId] = useState<string>('');
  const [idolDeleteConfirm, setIdolDeleteConfirm] = useState<{
    target: Idol;
    isSuperAdmin: boolean;
    reason: string;
  } | null>(null);
  const [isDeletingIdol, setIsDeletingIdol] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetConfirmationInput, setResetConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [personalPayslipRecord, setPersonalPayslipRecord] = useState<PayrollRecord | null>(null);
  const [payrollDisputeCount, setPayrollDisputeCount] = useState(0);
  const [personalPayrollDisputes, setPersonalPayrollDisputes] = useState<PayrollDisputeInboxItem[]>([]);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [payrollAdjustmentTarget, setPayrollAdjustmentTarget] = useState<{ periodId: string; recordId: string; disputeId?: string } | null>(null);
  const [payrollDisputeToSelect, setPayrollDisputeToSelect] = useState<string | null>(null);
  const [serviceUsageTarget, setServiceUsageTarget] = useState<{ personnelId: number; usageId: string } | null>(null);
  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setPayrollDisputeCount(0);
      setPersonalPayrollDisputes([]);
      return;
    }
    void Promise.all([api.getPayrollDisputeInbox('open'), api.getPayrollDisputeInbox('all')]).then(([openItems, allItems]) => {
      setPayrollDisputeCount(openItems.length);
      setPersonalPayrollDisputes(currentUser.idolId ? allItems.filter((item) => item.personnelId === currentUser.idolId) : []);
    }).catch(() => {
      setPayrollDisputeCount(0);
      setPersonalPayrollDisputes([]);
    });
  }, [currentUser]);

  const personalNotifications = useMemo<NotificationItem[]>(() => {
    if (!currentUser?.idolId) return [];
    const idolId = currentUser.idolId;
    const currentSchedules = schedules.filter((schedule) => schedule.idolId === idolId && schedule.isActive).slice(0, 5);
    const currentTasks = tasks.filter((task) => task.idolId === idolId && task.status !== 'completed').slice(0, 5);
    const reviewedLeaves = leaveRequests.filter((request) => request.idolId === idolId && (request.status === 'approved' || request.status === 'rejected')).slice(0, 5);
    const disputeNotifications = personalPayrollDisputes.filter((dispute) => ['adjusted', 'resolved', 'rejected'].includes(dispute.status)).slice(0, 5);
    const assignmentNotifications = workAssignments.filter((assignment) => assignment.assignees.some((assignee) => assignee.personnelId === idolId && ['pending', 'accepted', 'in_progress'].includes(assignee.responseStatus))).slice(0, 5);
    return [
      ...assignmentNotifications.map((assignment) => ({ id: `work-assignment-${assignment.id}`, title: assignment.mandatory ? 'Bạn có công việc bắt buộc mới' : 'Bạn được giao công việc mới', description: `${assignment.title}${assignment.location ? ` · ${assignment.location}` : ''}`, tab: 'my_dashboard' as NavTab, targetId: assignment.id, targetType: 'work_assignment' as const, tone: assignment.mandatory ? 'warning' as const : 'info' as const })),
      ...currentSchedules.map((schedule) => ({ id: `schedule-${schedule.id}`, title: 'Bạn đã được thiết lập lịch', description: `${schedule.title} · ${schedule.startTime}–${schedule.endTime}`, tab: 'schedule' as NavTab, targetId: idolId, targetType: 'schedule' as const, tone: 'info' as const })),
      ...currentTasks.map((task) => ({ id: `task-${task.id}`, title: 'Bạn có nhiệm vụ mới hoặc chưa hoàn thành', description: task.title, tab: 'tasks' as NavTab, targetId: idolId, targetType: 'task' as const, tone: 'warning' as const })),
      ...reviewedLeaves.map((request) => ({ id: `leave-${request.id}-${request.status}`, title: `Yêu cầu nghỉ phép đã ${request.status === 'approved' ? 'được phê duyệt' : 'bị từ chối'}`, description: `${request.startDate} · ${request.totalDays} ngày${request.reviewNote ? ` · ${request.reviewNote}` : ''}`, tab: 'my_dashboard' as NavTab, targetId: request.id, targetType: 'leave' as const, tone: request.status === 'approved' ? 'success' as const : 'warning' as const })),
      ...disputeNotifications.map((dispute) => ({ id: `payroll-dispute-${dispute.id}-${dispute.status}`, title: `Phản ánh bảng lương đã ${dispute.status === 'rejected' ? 'bị từ chối' : dispute.status === 'adjusted' ? 'được điều chỉnh' : 'được xử lý'}`, description: `Kỳ ${dispute.period.replace('-', '/')} · ${dispute.resolutionNote || 'Mở để xem kết quả'}`, tab: 'payroll_disputes' as NavTab, targetId: dispute.id, targetType: 'payroll_dispute' as const, tone: dispute.status === 'rejected' ? 'warning' as const : 'success' as const }))
    ];
  }, [currentUser, leaveRequests, personalPayrollDisputes, schedules, tasks, workAssignments]);

  const handleOpenMyPayslip = async () => {
    if (!currentUser?.idolId) return;
    try {
      const payslips = await api.getMyPayslips(currentUser.id);
      if (payslips.length > 0) {
        setPersonalPayslipRecord(payslips[0]);
      } else {
        notify('Chưa có phiếu lương chính thức nào được Giám Đốc phê duyệt cho tài khoản của bạn.', 'info');
      }
    } catch (err: any) {
      notify(err.message || 'Lỗi khi tải phiếu lương', 'error');
    }
  };

  const handleOpenProfileModal = () => {
    if (currentUser?.idolId) setIsProfileModalOpen(true);
  };

  // Initial and tab-scoped data fetch. Core roster/detail data is loaded once;
  // admin, KPI, leave and account datasets are fetched only when their tabs need them.
  const loadAllData = useCallback(async (force = false) => {
    // Protected APIs require the access token restored from the refresh session.
    // Do not start any data request while authentication is unresolved or absent.
    if (!authReady || !currentUser) return;

    try {
      setLoading(true);
      setError(null);
      const shouldLoad = (key: string) => force || !loadedDataRef.current.has(key);
      const get = <T,>(key: string, loader: () => Promise<T>) =>
        shouldLoad(key) ? loader() : Promise.resolve(null as T | null);
      const needsAdminData = activeTab === 'admin';
      const needsKpiData = activeTab === 'kpi' || needsAdminData;
      const needsLeaveData = activeTab === 'my_dashboard' || needsAdminData || !!currentUser?.idolId;
      const needsWorkAssignmentData = activeTab === 'my_dashboard' || activeTab === 'work_assignments' || !!currentUser?.allowedActions?.includes('manage_work_assignments') || !!currentUser?.isSuperAdmin;
      const needsUserData = ((activeTab === 'payroll' || needsAdminData || activeTab === 'my_dashboard') && !!currentUser?.isSuperAdmin)
        || !!currentUser?.allowedActions?.includes('manage_work_assignments')
        || !!currentUser?.isSuperAdmin;
      const canViewPayrollDashboard = !!currentUser && (currentUser.isSuperAdmin || currentUser.allowedActions?.some((action) => ['manage_payroll', 'adjust_payroll', 'approve_payroll'].includes(action)));
      const needsPayrollDashboardData = activeTab === 'my_dashboard' && canViewPayrollDashboard;
      const [
        fetchedIdols,
        fetchedCriteria,
        fetchedScores,
        fetchedTasks,
        fetchedDepts,
        fetchedPersonnelTypes,
        fetchedStatuses,
        fetchedUsers,
        fetchedHeaders,
        fetchedPersonnelColumns,
        fetchedSettings,
        fetchedApprovals,
        fetchedSchedules,
        fetchedLeaveRequests,
        fetchedPayrollPeriods,
        fetchedKpiGroups,
        fetchedKpiSettings,
        fetchedWorkAssignments
      ] = await Promise.all([
        get('idols', api.getIdols),
        get('criteria', api.getCriteria),
        get('scores', api.getScores),
        get('tasks', api.getTasks),
        get('departments', api.getDepartments),
        get('personnelTypes', api.getPersonnelTypes),
        get('statuses', api.getStatuses),
        needsUserData ? get('users', api.getUsers) : Promise.resolve(null),
        get('columnHeaders', api.getColumnHeaders),
        get('personnelColumns', api.getPersonnelColumns),
        get('settings', api.getSettings),
        needsAdminData ? get('approvals', api.getApprovals) : Promise.resolve(null),
        get('schedules', api.getSchedules),
        needsLeaveData ? get('leaveRequests', api.getLeaveRequests) : Promise.resolve(null),
        needsPayrollDashboardData ? get('payrollPeriods', api.getPayrolls) : Promise.resolve(null),
        needsKpiData ? get('kpiGroups', api.getKpiGroups) : Promise.resolve(null),
        needsKpiData ? get('kpiSettings', api.getKpiSettings) : Promise.resolve(null),
        needsWorkAssignmentData ? get('workAssignments', api.getWorkAssignments) : Promise.resolve(null)
      ]);

      if (fetchedIdols !== null) { setIdols(fetchedIdols); loadedDataRef.current.add('idols'); }
      if (fetchedCriteria !== null) { setCriteria(fetchedCriteria); loadedDataRef.current.add('criteria'); }
      if (fetchedScores !== null) { setScores(fetchedScores); loadedDataRef.current.add('scores'); }
      if (fetchedTasks !== null) { setTasks(fetchedTasks); loadedDataRef.current.add('tasks'); }
      if (fetchedDepts !== null) { setDepartments(fetchedDepts); loadedDataRef.current.add('departments'); }
      if (fetchedPersonnelTypes !== null) {
        setPersonnelTypes(fetchedPersonnelTypes);
        loadedDataRef.current.add('personnelTypes');
      }
      if (fetchedStatuses !== null) { setStatuses(fetchedStatuses); loadedDataRef.current.add('statuses'); }
      if (fetchedUsers !== null) { setUsers(fetchedUsers); loadedDataRef.current.add('users'); }
      if (fetchedHeaders !== null) { setColumnHeaders({ ...DEFAULT_HEADERS, ...(fetchedHeaders || {}) }); loadedDataRef.current.add('columnHeaders'); }
      if (fetchedPersonnelColumns !== null) { setPersonnelColumns(fetchedPersonnelColumns || []); loadedDataRef.current.add('personnelColumns'); }
      if (fetchedSettings !== null) { setSettings({ ...DEFAULT_SETTINGS, ...(fetchedSettings || {}) }); loadedDataRef.current.add('settings'); }
      if (fetchedApprovals !== null) { setApprovals(fetchedApprovals); loadedDataRef.current.add('approvals'); }
      if (fetchedSchedules !== null) { setSchedules(fetchedSchedules || []); loadedDataRef.current.add('schedules'); }
      if (fetchedLeaveRequests !== null) { setLeaveRequests(fetchedLeaveRequests || []); loadedDataRef.current.add('leaveRequests'); }
      if (fetchedPayrollPeriods !== null) { setPayrollPeriods(fetchedPayrollPeriods || []); loadedDataRef.current.add('payrollPeriods'); }
      if (fetchedKpiGroups !== null) { setKpiGroups(fetchedKpiGroups || []); loadedDataRef.current.add('kpiGroups'); }
      if (fetchedKpiSettings !== null) { setKpiSettings(fetchedKpiSettings || []); loadedDataRef.current.add('kpiSettings'); }
      if (fetchedWorkAssignments !== null) { setWorkAssignments(fetchedWorkAssignments || []); loadedDataRef.current.add('workAssignments'); }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu từ máy chủ:', err);
      setError('Không thể kết nối đến máy chủ API. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, authReady, currentUser, currentUser?.isSuperAdmin, currentUser?.id, currentUser?.allowedActions?.join(','), personnelTypes]);

  useEffect(() => {
    if (!authReady || !currentUser) return;
    loadAllData();
  }, [authReady, currentUser, loadAllData]);

  // Adjust active tab if user lacks permission — only run when currentUser changes (login/logout/permission update)
  // NOTE: Do NOT add activeTab to deps here — it causes an infinite flicker loop when navigating to tabs
  // that require permission checks. We use a ref to read the current tab value without re-triggering.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (currentUser && currentUser.allowedTabs && currentUser.allowedTabs.length > 0) {
      const allowed = currentUser.allowedTabs;
      const currentTab = activeTabRef.current;
      if (currentTab === 'admin') {
        if (!currentUser.isSuperAdmin && !allowed.includes('admin')) {
          setActiveTab(allowed[0] as NavTab);
        }
      } else if (
        !['payroll', 'revenue', 'finance', 'service_usage', 'kpi'].includes(currentTab) &&
        !allowed.includes(currentTab as AppTabPermission)
      ) {
        setActiveTab(allowed[0] as NavTab);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Department-level scope filtering
  const isAllDepartments = !currentUser?.allowedDepartments || currentUser.allowedDepartments.includes('*');
  const isTaskManagerUser = Boolean(!currentUser?.isIdol && (currentUser?.isSuperAdmin || currentUser?.isBusinessAdmin || currentUser?.allowedActions?.includes('manage_tasks')));

  const permittedIdols = useMemo(() => {
    if (!currentUser) return idols;
    if (currentUser.isIdol && currentUser.idolId) return idols.filter((idol) => idol.id === currentUser.idolId);
    if (currentUser.isSuperAdmin || isAllDepartments) return idols;
    const allowedDepts = currentUser.allowedDepartments || [];
    return idols.filter((idol) => allowedDepts.includes(idol.department));
  }, [idols, currentUser, isAllDepartments, isTaskManagerUser]);

  const assignableDepartments = useMemo(() => {
    if (!currentUser || currentUser.isSuperAdmin || isAllDepartments) return departments;
    const allowed = currentUser.allowedDepartments || [];
    return departments.filter((d) => allowed.includes(d));
  }, [departments, currentUser, isAllDepartments]);

  const permittedTasks = useMemo(() => {
    const permittedIdolIds = new Set(permittedIdols.map((i) => i.id));
    return tasks.filter((t) => permittedIdolIds.has(t.idolId));
  }, [tasks, permittedIdols]);

  // Action capabilities
  const canManageIdols = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_idols');
  const isHrOrFinanceUser = Boolean(
    currentUser && [currentUser.department, currentUser.roleTitle]
      .filter(Boolean)
      .some((value) => /nhân sự|kế toán|hr/i.test(value as string))
  );
  const canDeletePersonnel = Boolean(canManageIdols && !isHrOrFinanceUser);
  const canManageScores = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_scores');
  const canManageCriteria = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_criteria');
  const canManageTasks = isTaskManagerUser;
  const canManageDepartments = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_departments');
  const canManageSettings = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_settings');

  // Authentication Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    // The work-assignment and approval datasets are user-scoped. Clear the
    // loaded markers when switching accounts so a previous user's filtered
    // data cannot remain visible for the next account.
    loadedDataRef.current.clear();
    setCurrentUser(user);
    if (user.idolId && user.allowedTabs?.includes('my_dashboard')) {
      setActiveTab('my_dashboard');
    } else if (user.allowedTabs && user.allowedTabs.length > 0) {
      if (!user.allowedTabs.includes(activeTab as AppTabPermission)) {
        setActiveTab(user.allowedTabs[0] as NavTab);
      }
    }
  };

  const handleLogout = () => {
    void api.logout();
    loadedDataRef.current.clear();
    setCurrentUser(null);
  };

  const handleSaveProfile = async (data: {
    userId: string;
    name?: string;
    realName?: string;
    stageName?: string;
    dob?: string;
    hometown?: string;
    height?: number;
    weight?: number;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const res = await api.updateProfile(data);
    if (res.success && res.user) {
      setCurrentUser(res.user);

      // Đồng bộ vào state idols để tất cả các view (Danh sách Idol, Dashboard) cập nhật ngay tức thì
      if (res.user.idolId) {
        setIdols((prev) =>
          prev.map((i) => {
            if (i.id === res.user.idolId) {
              return {
                ...i,
                realName: data.realName || data.name || i.realName,
                stageName: data.stageName || i.stageName,
                dob: data.dob || i.dob,
                hometown: data.hometown || i.hometown,
                height: data.height !== undefined ? Number(data.height) : i.height,
                weight: data.weight !== undefined ? Number(data.weight) : i.weight,
                phone: data.phone !== undefined ? data.phone : i.phone,
                currentLiving: data.address !== undefined ? data.address : i.currentLiving,
                avatarUrl: data.avatarUrl && data.avatarUrl.trim() ? data.avatarUrl.trim() : i.avatarUrl
              };
            }
            return i;
          })
        );
      }
      return res.user;
    }
    throw new Error('Không thể lưu thông tin hồ sơ');
  };

  // Hover Popover Handlers with debounce
  const handleHoverIdol = (idol: Idol | null, pos: { x: number; y: number } | null) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    if (idol && pos) {
      setHoveredIdol(idol);
      setHoverPosition(pos);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        if (!isHoveringCardRef.current) {
          setHoveredIdol(null);
          setHoverPosition(null);
        }
      }, 150);
    }
  };

  // Idol CRUD with Pending Approval Intercept for Lower Roles
  const handleOpenAddModal = () => {
    setIdolToEdit(null);
    setIsIdolModalOpen(true);
  };

  const handleOpenEditModal = (idol: Idol) => {
    setIdolToEdit(idol);
    setIsIdolModalOpen(true);
  };

  const handleIdolSaved = (savedIdol: Idol) => {
    setIdols((prev) => {
      const idx = prev.findIndex((i) => i.id === savedIdol.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedIdol;
        return copy;
      }
      return [...prev, savedIdol].sort((a, b) => (a.stt || 0) - (b.stt || 0));
    });
  };

  const handleDeleteIdol = async (id: string) => {
    if (isHrOrFinanceUser) {
      notify('HR chỉ được thêm và sửa nhân sự; chỉ System Admin được phép xoá nhân sự.', 'error');
      return;
    }
    const targetIdol = idols.find((i) => i.id === id);
    if (!targetIdol) return;

    // Nếu nhân sự đang ở trạng thái 'Chờ duyệt', cho phép hủy đề xuất ngay lập tức
    if (targetIdol.status === 'Chờ duyệt') {
      if (await confirmDialog(`Bạn có chắc chắn muốn hủy đề xuất thêm nhân sự "${targetIdol.stageName}"?`, 'Hủy đề xuất nhân sự')) {
        try {
          await api.deleteIdol(targetIdol.id);
          setIdols((prev) => prev.filter((i) => i.id !== targetIdol.id));
          setApprovals((prev) => prev.filter((a) => a.targetPersonnelId !== targetIdol.id && a.targetIdolId !== targetIdol.id));
        } catch (e: any) {
          notify('Không thể hủy đề xuất: ' + (e.message || 'Lỗi không xác định'), 'error');
        }
      }
      return;
    }

    setIdolDeleteConfirm({
      target: targetIdol,
      isSuperAdmin: !!currentUser?.isSuperAdmin,
      reason: 'Hết hạn hợp đồng đào tạo / chuyển sang đơn vị khác'
    });
  };

  const handleConfirmDeleteIdol = async () => {
    if (!idolDeleteConfirm) return;
    const { target, isSuperAdmin, reason } = idolDeleteConfirm;
    try {
      setIsDeletingIdol(true);
      if (isSuperAdmin) {
        await api.deleteIdol(target.id);
        setIdols((prev) => prev.filter((i) => i.id !== target.id));
        setScores((prev) => prev.filter((s) => s.idolId !== target.id));
        setTasks((prev) => prev.filter((t) => t.idolId !== target.id));
      } else {
        const newAppr = await api.createApproval({
          type: 'delete_idol',
          targetIdolId: target.id,
          targetName: target.stageName,
          data: target,
          requestedBy: {
            id: currentUser?.id || 'staff',
            username: currentUser?.username || 'staff',
            name: currentUser?.name || 'Nhân viên',
            roleTitle: currentUser?.roleTitle || 'Điều Phối Viên'
          },
          reason: reason || 'Đề xuất xóa nhân sự'
        });
        setApprovals((prev) => [newAppr, ...prev]);
      }
      setIdolDeleteConfirm(null);
    } catch (err: any) {
      console.error('Lỗi khi xóa nhân sự:', err);
    } finally {
      setIsDeletingIdol(false);
    }
  };

  // Approvals Workflow Handlers
  const handleApproveRequest = async (id: string, note?: string) => {
    if (!currentUser) return;
    const res = await api.approveRequest(id, { id: currentUser.id, name: currentUser.name }, note);
    setApprovals((prev) => prev.map((a) => (a.id === id ? res.approval : a)));

    // Cascade creation, update or deletion in state
    if (res.createdIdol) {
      setIdols((prev) => {
        const exists = prev.some((i) => i.id === res.createdIdol!.id);
        if (exists) {
          return prev.map((i) => (i.id === res.createdIdol!.id ? res.createdIdol! : i));
        }
        return [...prev, res.createdIdol!].sort((a, b) => (a.stt || 0) - (b.stt || 0));
      });
      if (res.createdIdol.userId) {
        setUsers((prev) =>
          prev.map((u) => (u.id === res.createdIdol!.userId || u.username === res.createdIdol!.accountUsername ? { ...u, status: 'Đang hoạt động' } : u))
        );
      }
    }
    if (res.deletedIdolId) {
      setIdols((prev) => prev.filter((i) => i.id !== res.deletedIdolId));
      setScores((prev) => prev.filter((s) => s.idolId !== res.deletedIdolId));
      setTasks((prev) => prev.filter((t) => t.idolId !== res.deletedIdolId));
    }
  };

  const handleRejectRequest = async (id: string, reason?: string) => {
    if (!currentUser) return;
    const res = await api.rejectRequest(id, { id: currentUser.id, name: currentUser.name }, reason);
    setApprovals((prev) => prev.map((a) => (a.id === id ? res.approval : a)));
  };

  const handleDeleteApproval = async (id: string) => {
    if (!await confirmDialog('Bạn có chắc muốn xoá yêu cầu này khỏi lịch sử phê duyệt?', 'Xác nhận xoá yêu cầu')) return;
    await api.deleteApproval(id);
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  // Reference Year Handler (đúng ngày tháng tròn mới đủ tuổi)
  const handleUpdateReferenceYear = async (year: number) => {
    const updated = { ...settings, referenceYear: year };
    setSettings(updated);
    try {
      await api.updateSettings({ referenceYear: year });
    } catch (err) {
      console.error('Lỗi lưu mốc năm:', err);
    }
  };

  // Column Headers Handler
  const handleSaveColumnHeaders = async (newHeaders: ColumnHeadersConfig) => {
    const saved = await api.updateColumnHeaders(newHeaders, currentUser?.id);
    setColumnHeaders(saved);
  };

  // Departments CRUD
  const handleAddDepartment = async (name: string) => {
    const updated = await api.addDepartment(name);
    setDepartments(updated);
  };

  const handleUpdateDepartment = async (oldName: string, newName: string) => {
    const updated = await api.updateDepartment(oldName, newName);
    setDepartments(updated);
    setIdols((prev) =>
      prev.map((i) => (i.department === oldName ? { ...i, department: newName } : i))
    );
  };

  const handleDeleteDepartment = async (name: string) => {
    const updated = await api.deleteDepartment(name);
    setDepartments(updated);
  };

  // Statuses CRUD
  const handleAddStatus = async (name: string) => {
    const updated = await api.addStatus(name);
    setStatuses(updated);
  };

  const handleUpdateStatus = async (oldName: string, newName: string) => {
    const updated = await api.updateStatus(oldName, newName);
    setStatuses(updated);
    setIdols((prev) =>
      prev.map((i) => (i.status === oldName ? { ...i, status: newName } : i))
    );
  };

  const handleDeleteStatus = async (name: string) => {
    const updated = await api.deleteStatus(name);
    setStatuses(updated);
  };

  // Personnel Types CRUD
  const handleAddPersonnelType = async (name: string) => {
    const updated = await api.addPersonnelType(name);
    setPersonnelTypes(updated);
  };

  const handleUpdatePersonnelType = async (oldName: string, newName: string) => {
    const updated = await api.updatePersonnelType(oldName, newName);
    setPersonnelTypes(updated);
    setIdols((prev) =>
      prev.map((i) => (i.personnelType === oldName ? { ...i, personnelType: newName } : i))
    );
  };

  const handleDeletePersonnelType = async (name: string) => {
    if (!await confirmDialog(`Bạn có chắc muốn xoá loại nhân sự "${name}"? Thao tác này không thể hoàn tác.`, 'Xác nhận xoá loại nhân sự')) return;
    const updated = await api.deletePersonnelType(name);
    setPersonnelTypes(updated);
  };

  // Users & Permissions Management
  const handleSaveUser = async (userData: Partial<UserAccount>) => {
    if (userData.id && userData.id !== 'new') {
      const updated = await api.updateUser(userData.id, userData);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (currentUser && currentUser.id === updated.id) {
        setCurrentUser(updated);
      }
    } else {
      const created = await api.createUser(userData);
      setUsers((prev) => [...prev, created]);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const targetUser = users.find((user) => user.id === id);
    if (!await confirmDialog(`Bạn có chắc muốn xoá tài khoản "${targetUser?.name || targetUser?.username || id}"?`, 'Xác nhận xoá tài khoản')) return;
    await api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSyncUsers = async () => {
    await api.syncUsersWithIdols();
    await loadAllData(true);
  };

  // Criteria CRUD
  const handleCreateCriterion = async (critData: Partial<Criterion>) => {
    const created = await api.createCriterion(critData);
    setCriteria((prev) => [...prev, created].sort((a, b) => a.priorityOrder - b.priorityOrder));
  };

  const handleUpdateCriterion = async (id: string, critData: Partial<Criterion>) => {
    const updated = await api.updateCriterion(id, critData);
    setCriteria((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteCriterion = async (id: string) => {
    await api.deleteCriterion(id);
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    const newScores = await api.getScores();
    setScores(newScores);
  };

  const handleUpdatePriorityOrder = async (criterionIds: string[]) => {
    const updated = await api.updateCriteriaPriority(criterionIds);
    setCriteria(updated);
  };

  const handleUpdateSettings = async (updates: AppSettingsUpdate) => {
    const updated = await api.updateSettings(updates);
    setSettings(updated);
  };

  // Scores batch save
  const handleSaveScores = async (records: Partial<IdolScoreRecord>[]) => {
    const saved = await api.batchSaveScores(records);
    setScores((prev) => {
      const map = new Map(prev.map((s) => [s.idolId + '_' + s.period, s]));
      saved.forEach((s) => map.set(s.idolId + '_' + s.period, s));
      return Array.from(map.values());
    });
  };

  // Tasks & Subtasks
  const handleAddTask = async (taskData: Partial<IdolTask>) => {
    const created = await api.createTask(taskData);
    setTasks((prev) => [created, ...prev]);
  };

  const handleUpdateTask = async (id: string, updates: Partial<IdolTask>) => {
    const updated = await api.updateTask(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleStartTaskTimer = useCallback(async (id: string) => {
    const updated = await api.startTaskTimer(id);
    setTasks((prev) => prev.map((task) => task.id === id ? updated : task));
    return updated;
  }, []);

  const handleStopTaskTimer = useCallback(async (id: string) => {
    const updated = await api.stopTaskTimer(id);
    setTasks((prev) => prev.map((task) => task.id === id ? updated : task));
    return updated;
  }, []);

  const handleRefreshTasks = useCallback(async () => {
    const latest = await api.getTasks();
    setTasks(latest);
  }, []);

  const handleDeleteTask = async (id: string) => {
    const targetTask = tasks.find((task) => task.id === id);
    if (!await confirmDialog(`Bạn có chắc muốn xoá nhiệm vụ "${targetTask?.title || id}"?`, 'Xác nhận xoá nhiệm vụ')) return;
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddSubtask = async (taskId: string, title: string, minutes: number) => {
    const updated = await api.addSubtask(taskId, title, minutes);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const handleUpdateSubtask = async (taskId: string, subtaskId: string, data: any) => {
    const updated = await api.updateSubtask(taskId, subtaskId, data);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    if (!await confirmDialog('Bạn có chắc muốn xoá công việc nhỏ này?', 'Xác nhận xoá công việc nhỏ')) return;
    const updated = await api.deleteSubtask(taskId, subtaskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  // Reset demo dataset
  const handleOpenResetModal = () => {
    setResetConfirmationInput('');
    setIsResetConfirmOpen(true);
  };

  const handleConfirmResetData = async () => {
    try {
      setIsResetting(true);
      await api.resetDatabase();
      await loadAllData(true);
      setIsResetConfirmOpen(false);
    } catch (err) {
      console.error('Lỗi khôi phục dữ liệu:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleGoToTasks = (idolId: string) => {
    setTaskDetailSelectedIdolId(idolId);
    setActiveTab('tasks');
  };

  const handleSaveSchedule = async (scheduleData: Partial<WorkScheduleSlot>) => {
    if (scheduleData.id) {
      const updated = await api.updateSchedule(scheduleData.id, scheduleData);
      setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await api.createSchedule(scheduleData);
      setSchedules((prev) => [...prev, created]);
    }
  };

  const handleDeleteSchedule = async (id: string, skipConfirmation = false) => {
    if (!skipConfirmation && !await confirmDialog('Bạn có chắc muốn xoá ca/lịch này?', 'Xác nhận xoá lịch')) return;
    await api.deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleBatchSetSchedules = async (idolId: string, slots: Omit<WorkScheduleSlot, 'id' | 'idolId'>[]) => {
    const updated = await api.batchSetSchedules(idolId, slots);
    setSchedules((prev) => [...prev.filter((s) => s.idolId !== idolId), ...updated]);
  };

  const handleGoToSchedule = (idolId: string) => {
    setScheduleSelectedIdolId(idolId);
    setActiveTab('schedule');
  };

  const handleCreateWorkAssignment = async (data: Partial<WorkAssignment> & { assigneePersonnelIds: string[] }) => {
    const created = await api.createWorkAssignment(data);
    setWorkAssignments((prev) => [created, ...prev]);
  };

  const handleUpdateWorkAssignment = async (id: string, data: Partial<WorkAssignment> & { assigneePersonnelIds?: string[] }) => {
    const updated = await api.updateWorkAssignment(id, data);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };
  const handleCancelWorkAssignment = async (id: string, reason: string) => {
    const updated = await api.cancelWorkAssignment(id, reason);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };

  const handleRespondWorkAssignment = async (id: string, status: 'accepted' | 'declined', note?: string) => {
    const updated = await api.respondToWorkAssignment(id, status, note);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };

  const handleCompleteWorkAssignment = async (id: string, note?: string) => {
    const updated = await api.completeWorkAssignment(id, note);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };

  const handleReviewWorkAssignmentViolation = async (assignmentId: string, personnelId: string, action: 'confirm' | 'waive', note?: string) => {
    const updated = await api.reviewWorkAssignmentViolation(assignmentId, personnelId, action, note);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };
  const handleRequestWorkAssignmentWaiver = async (id: string, reason: string) => {
    const updated = await api.requestWorkAssignmentWaiver(id, reason);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };
  const handleReviewWorkAssignmentWaiver = async (assignmentId: string, personnelId: string, action: 'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty', note?: string, penaltyRate?: number) => {
    const updated = await api.reviewWorkAssignmentWaiver(assignmentId, personnelId, action, note, penaltyRate);
    setWorkAssignments((prev) => prev.map((item) => item.id === updated.id ? updated : item));
  };

  const handleSelectNotification = (notification: NotificationItem) => {
    if (notification.targetType === 'schedule' && notification.targetId) setScheduleSelectedIdolId(notification.targetId);
    if (notification.targetType === 'task' && notification.targetId) setTaskDetailSelectedIdolId(notification.targetId);
    if (notification.targetType === 'payroll_dispute' && notification.targetId) setPayrollDisputeToSelect(notification.targetId);
    setActiveTab(notification.tab);
  };

  const handleCreateLeaveRequest = async (req: Partial<LeaveRequest>) => {
    try {
      const created = await api.createLeaveRequest(req as any);
      setLeaveRequests((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Lỗi gửi đơn nghỉ phép:', err);
      throw err;
    }
  };

  const handleUpdateLeaveRequest = async (id: string, updates: Partial<LeaveRequest>) => {
    try {
      const updated = await api.updateLeaveRequest(id, updates);
      setLeaveRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error('Lỗi cập nhật đơn nghỉ phép:', err);
    }
  };

  const handleDeleteLeaveRequest = async (id: string) => {
    try {
      if (!await confirmDialog('Bạn có chắc muốn xoá đơn nghỉ phép này?', 'Xác nhận xoá đơn nghỉ phép')) return;
      await api.deleteLeaveRequest(id);
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Lỗi xóa đơn nghỉ phép:', err);
    }
  };

  // KPI Handlers (Nhóm Chỉ Định & Chỉ Tiêu KPI)
  const handleCreateKpiGroup = async (data: Partial<KpiGroup>) => {
    try {
      const created = await api.createKpiGroup(data);
      setKpiGroups((prev) => [...prev, created]);
    } catch (err: any) {
      console.error('Lỗi tạo nhóm KPI:', err);
      throw err;
    }
  };

  const handleUpdateKpiGroup = async (id: string, data: Partial<KpiGroup>) => {
    try {
      const updated = await api.updateKpiGroup(id, data);
      setKpiGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err: any) {
      console.error('Lỗi cập nhật nhóm KPI:', err);
      throw err;
    }
  };

  const handleDeleteKpiGroup = async (id: string) => {
    try {
      await api.deleteKpiGroup(id);
      setKpiGroups((prev) => prev.filter((g) => g.id !== id));
      setKpiSettings((prev) => prev.filter((s) => s.groupId !== id));
    } catch (err: any) {
      console.error('Lỗi xóa nhóm KPI:', err);
      throw err;
    }
  };

  const handleCreateKpiSetting = async (data: Partial<KpiSetting>) => {
    try {
      const created = await api.createKpiSetting(data);
      setKpiSettings((prev) => [...prev, created]);
    } catch (err: any) {
      console.error('Lỗi tạo chỉ tiêu KPI:', err);
      throw err;
    }
  };

  const handleUpdateKpiSetting = async (id: string, data: Partial<KpiSetting>) => {
    try {
      const updated = await api.updateKpiSetting(id, data);
      setKpiSettings((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err: any) {
      console.error('Lỗi cập nhật chỉ tiêu KPI:', err);
      throw err;
    }
  };

  const handleDeleteKpiSetting = async (id: string) => {
    try {
      await api.deleteKpiSetting(id);
      setKpiSettings((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error('Lỗi xóa chỉ tiêu KPI:', err);
      throw err;
    }
  };

  // Check tab permission (Bảng điểm và Xếp hạng hiện tại chỉ mỗi Super Admin được thao tác và xem)
  const isSuperAdminUser = currentUser?.accountType === 'system_admin';
  const isCurrentTabAllowed =
    isSuperAdminUser ||
    ((activeTab === 'scoring' || activeTab === 'leaderboard')
      ? false
      : activeTab === 'admin'
      ? canAccessAdminPortal(currentUser)
      : activeTab === 'payroll' || activeTab === 'payroll_disputes'
      ? !!(
          currentUser?.isSuperAdmin ||
          currentUser?.role === 'super_admin' ||
          currentUser?.role === 'director' ||
          currentUser?.allowedTabs?.includes('payroll') ||
          currentUser?.department?.includes('Kế Toán') ||
          currentUser?.department?.includes('HR') ||
          currentUser?.roleTitle?.includes('Kế toán') ||
          currentUser?.roleTitle?.includes('Nhân Sự')
        )
      : activeTab === 'revenue'
      ? !!(
          currentUser?.isSuperAdmin ||
          currentUser?.role === 'super_admin' ||
          currentUser?.role === 'director' ||
          currentUser?.allowedTabs?.includes('revenue') ||
          currentUser?.allowedTabs?.includes('payroll') ||
          currentUser?.department?.includes('Kế Toán') ||
          currentUser?.department?.includes('Kinh Doanh') ||
          currentUser?.roleTitle?.includes('Kế toán') ||
          currentUser?.roleTitle?.includes('Giám Đốc')
        )
      : activeTab === 'finance'
      ? !!(
          currentUser?.isSuperAdmin ||
          currentUser?.role === 'super_admin' ||
          currentUser?.role === 'director' ||
          currentUser?.allowedTabs?.includes('finance') ||
          currentUser?.department?.includes('Kế Toán') ||
          currentUser?.roleTitle?.includes('Kế toán') ||
          currentUser?.roleTitle?.includes('Giám Đốc')
        )
      : activeTab === 'work_assignments'
      ? !!(
          currentUser?.isSuperAdmin ||
          currentUser?.role === 'super_admin' ||
          currentUser?.role === 'director' ||
          currentUser?.role === 'manager' ||
          currentUser?.allowedTabs?.includes('work_assignments') ||
          currentUser?.allowedTabs?.includes('my_dashboard') ||
          currentUser?.allowedActions?.includes('manage_work_assignments')
        )
      : activeTab === 'service_usage'
      ? !!(
          currentUser?.isSuperAdmin ||
          currentUser?.role === 'super_admin' ||
          currentUser?.role === 'director' ||
          currentUser?.allowedTabs?.includes('service_usage') ||
          currentUser?.allowedActions?.includes('manage_revenue') ||
          currentUser?.department?.includes('Káº¿ ToÃ¡n') ||
          currentUser?.department?.includes('HR') ||
          currentUser?.roleTitle?.includes('Káº¿ toÃ¡n') ||
          currentUser?.roleTitle?.includes('GiÃ¡m Äá»‘c')
        )
      : activeTab === 'kpi'
      ? !!(
          currentUser?.isSuperAdmin ||
          currentUser?.role === 'super_admin' ||
          currentUser?.role === 'director' ||
          currentUser?.role === 'manager' ||
          currentUser?.department?.includes('Kế Toán') ||
          currentUser?.department?.includes('HR') ||
          currentUser?.roleTitle?.includes('Kế toán') ||
          currentUser?.roleTitle?.includes('Nhân Sự') ||
          currentUser?.allowedTabs?.includes('kpi')
        )
      : currentUser?.allowedTabs?.includes(activeTab as AppTabPermission));

  // Tự động chuyển hướng sang trang được phép (Dashboard / Trang chủ) nếu nhấn nhầm vào trang không có quyền
  useEffect(() => {
    if (!loading && currentUser && !isCurrentTabAllowed) {
      const targetTab: NavTab =
        currentUser.allowedTabs?.includes('my_dashboard') && !isSuperAdminUser
          ? 'my_dashboard'
          : currentUser.allowedTabs?.includes('roster')
          ? 'roster'
          : (currentUser.allowedTabs?.find((t) => t !== 'scoring' && t !== 'leaderboard') as NavTab) || 'my_dashboard';
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
    }
  }, [loading, currentUser, isCurrentTabAllowed, activeTab, isSuperAdminUser]);

  // If user is not logged in, show LoginPage
  if (!authReady) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Đang khôi phục phiên đăng nhập...</div>;
  }
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} onLoginApi={api.login} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      {/* Top Navbar with Ubiquitous Universal Search */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddModal={handleOpenAddModal}
        totalIdols={permittedIdols.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfileModal={handleOpenProfileModal}
        onOpenPayslip={currentUser.idolId ? handleOpenMyPayslip : undefined}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        idols={permittedIdols}
        tasks={permittedTasks}
        departments={departments}
        brandName={settings.brandName}
        brandTagline={settings.brandTagline}
        pendingApprovalsCount={
          approvals.filter((a) => a.status === 'pending').length +
          leaveRequests.filter((l) => l.status === 'pending').length
        }
        payrollDisputesCount={payrollDisputeCount}
        notifications={personalNotifications}
        onSelectNotification={handleSelectNotification}
        onSelectTaskFromSearch={(task) => {
          setTaskDetailSelectedIdolId(task.idolId);
          setActiveTab('tasks');
        }}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Đang tải dữ liệu hồ sơ nghệ sĩ, bảng điểm và hệ thống...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Lỗi kết nối máy chủ</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              onClick={() => loadAllData(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Thử lại ngay
            </button>
          </div>
        ) : !isCurrentTabAllowed ? (
          <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center max-w-md mx-auto space-y-4 my-12 shadow-xs">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Đang chuyển bạn về trang chính...</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản của bạn ({currentUser.name}) đang được tự động chuyển hướng về mục được phân quyền ({currentUser.allowedTabs?.includes('my_dashboard') ? 'Dashboard cá nhân' : 'Trang chủ'}).
            </p>
            {currentUser.allowedTabs && currentUser.allowedTabs.length > 0 && (
              <button
                onClick={() => {
                  const target: NavTab = currentUser.allowedTabs?.includes('my_dashboard') && !isSuperAdminUser
                    ? 'my_dashboard'
                    : (currentUser.allowedTabs[0] as NavTab) || 'my_dashboard';
                  setActiveTab(target);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Về ngay mục được phân quyền
              </button>
            )}
          </div>
        ) : (
          <Suspense fallback={<ViewLoading />}>
            <>
            {activeTab === 'roster' && (
              <IdolListView
                idols={permittedIdols}
                departments={departments}
                personnelTypes={personnelTypes}
                statuses={statuses}
                columnHeaders={columnHeaders}
                personnelColumns={personnelColumns}
                referenceYear={settings.referenceYear || new Date().getFullYear()}
                referenceDate={effectiveReferenceDate}
                canManageIdols={canManageIdols}
                canDeletePersonnel={canDeletePersonnel}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteIdol}
                onViewDetails={(idol) => setDetailModalIdol(idol)}
                onOpenAddModal={handleOpenAddModal}
                onHoverIdol={handleHoverIdol}
                onGoToSchedule={handleGoToSchedule}
              />
            )}

            {activeTab === 'scoring' && (
              <ScoringSheetView
                idols={permittedIdols}
                criteria={criteria}
                scores={scores}
                calcMode={settings.scoreCalculationMode || 'sum'}
                onUpdateCalcMode={(mode: ScoreCalculationMode) =>
                  handleUpdateSettings({ scoreCalculationMode: mode })
                }
                canManageScores={canManageScores}
                canManageCriteria={canManageCriteria}
                onSaveScores={handleSaveScores}
                onCreateCriterion={handleCreateCriterion}
                onUpdateCriterion={handleUpdateCriterion}
                onDeleteCriterion={handleDeleteCriterion}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView
                idols={permittedIdols}
                criteria={criteria}
                scores={scores}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onUpdatePriorityOrder={handleUpdatePriorityOrder}
                onViewDetails={(idol) => setDetailModalIdol(idol)}
              />
            )}

            {activeTab === 'schedule' && (
              <WorkScheduleView
                idols={permittedIdols}
                departments={departments}
                schedules={schedules}
                workAssignments={workAssignments}
                currentUser={currentUser}
                referenceDate={effectiveReferenceDate}
                initialSelectedIdolId={scheduleSelectedIdolId}
                onSaveSchedule={handleSaveSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onBatchSetSchedules={handleBatchSetSchedules}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManagementView
                idols={permittedIdols}
                tasks={permittedTasks}
                currentUser={currentUser}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onAddSubtask={handleAddSubtask}
                onUpdateSubtask={handleUpdateSubtask}
                onDeleteSubtask={handleDeleteSubtask}
                onStartTimer={handleStartTaskTimer}
                onStopTimer={handleStopTaskTimer}
                onRefreshTasks={handleRefreshTasks}
                selectedIdolId={taskDetailSelectedIdolId}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboardView
                idols={permittedIdols}
                criteria={criteria}
                scores={scores}
                tasks={permittedTasks}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPortalView
                currentUser={currentUser}
                users={users}
                approvals={approvals}
                leaveRequests={leaveRequests}
                onApproveLeaveRequest={async (id, note) => {
                  await handleUpdateLeaveRequest(id, {
                    status: 'approved',
                    reviewedBy: { id: currentUser.id, name: currentUser.name },
                    reviewNote: note || 'Đã phê duyệt',
                    reviewedAt: new Date().toISOString()
                  });
                }}
                onRejectLeaveRequest={async (id, note) => {
                  await handleUpdateLeaveRequest(id, {
                    status: 'rejected',
                    reviewedBy: { id: currentUser.id, name: currentUser.name },
                    reviewNote: note || 'Từ chối',
                    reviewedAt: new Date().toISOString()
                  });
                }}
                onDeleteLeaveRequest={handleDeleteLeaveRequest}
                departments={departments}
                personnelTypes={personnelTypes}
                statuses={statuses}
                criteria={criteria}
                idols={idols}
                scores={scores}
                settings={settings}
                columnHeaders={columnHeaders}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onDeleteApproval={handleDeleteApproval}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onAddDepartment={handleAddDepartment}
                onUpdateDepartment={handleUpdateDepartment}
                onDeleteDepartment={handleDeleteDepartment}
                onAddPersonnelType={handleAddPersonnelType}
                onUpdatePersonnelType={handleUpdatePersonnelType}
                onDeletePersonnelType={handleDeletePersonnelType}
                onAddStatus={handleAddStatus}
                onUpdateStatus={handleUpdateStatus}
                onDeleteStatus={handleDeleteStatus}
                onCreateCriterion={handleCreateCriterion}
                onUpdateCriterion={handleUpdateCriterion}
                onDeleteCriterion={handleDeleteCriterion}
                onUpdatePriorityOrder={handleUpdatePriorityOrder}
                onUpdateSettings={handleUpdateSettings}
                onSaveColumnHeaders={handleSaveColumnHeaders}
                onSyncUsers={handleSyncUsers}
                onResetData={handleOpenResetModal}
              />
            )}
            {activeTab === 'finance' && (
              <FinanceManagementView
                currentUser={currentUser}
                referenceDate={effectiveReferenceDate}
              />
            )}

            {activeTab === 'revenue' && (
              <RevenueManagementView
                idols={idols}
                currentUser={currentUser}
                onNavigateToPayroll={() => setActiveTab('payroll')}
              />
            )}

            {activeTab === 'service_usage' && (
              <ServiceUsageHistoryView idols={permittedIdols} users={users} currentUser={currentUser} initialTarget={serviceUsageTarget} onInitialTargetConsumed={() => setServiceUsageTarget(null)} />
            )}

            {activeTab === 'work_assignments' && (
              <WorkAssignmentsView
                currentUser={currentUser}
                idols={permittedIdols}
                users={users}
                assignments={workAssignments}
                referenceDate={effectiveReferenceDate}
                onCreate={handleCreateWorkAssignment}
                onUpdate={handleUpdateWorkAssignment}
                onRespond={handleRespondWorkAssignment}
                onComplete={handleCompleteWorkAssignment}
                onReviewViolation={handleReviewWorkAssignmentViolation}
                onCancel={handleCancelWorkAssignment}
                onRequestWaiver={handleRequestWorkAssignmentWaiver}
                onReviewWaiver={handleReviewWorkAssignmentWaiver}
              />
            )}

            {activeTab === 'payroll' && (
              <PayrollManagementView
                currentUser={currentUser}
                departments={departments}
                personnelTypes={personnelTypes}
                idols={idols}
                users={users}
                referenceDate={effectiveReferenceDate}
                initialAdjustmentTarget={payrollAdjustmentTarget}
                onAdjustmentTargetConsumed={() => setPayrollAdjustmentTarget(null)}
                onAdjustmentCompleted={(disputeId) => {
                  setPayrollDisputeToSelect(disputeId);
                  setActiveTab('payroll_disputes');
                }}
              />
            )}

            {activeTab === 'payroll_disputes' && (
              <PayrollDisputesView
                currentUser={currentUser}
                onOpenCountChange={setPayrollDisputeCount}
                initialSelectedDisputeId={payrollDisputeToSelect}
                onInitialSelectedDisputeConsumed={() => setPayrollDisputeToSelect(null)}
                onOpenPayrollAdjustment={(item) => {
                  setPayrollAdjustmentTarget({ periodId: item.periodId, recordId: item.recordId, disputeId: item.id });
                  setActiveTab('payroll');
                }}
              />
            )}

            {activeTab === 'kpi' && (
              <KpiSettingsView
                idols={idols}
                groups={kpiGroups}
                kpiSettings={kpiSettings}
                canManage={isSuperAdminUser || !!currentUser?.allowedActions?.includes('manage_kpi') || currentUser?.role === 'manager' || currentUser?.role === 'director'}
                onCreateGroup={handleCreateKpiGroup}
                onUpdateGroup={handleUpdateKpiGroup}
                onDeleteGroup={handleDeleteKpiGroup}
                onCreateKpi={handleCreateKpiSetting}
                onUpdateKpi={handleUpdateKpiSetting}
                onDeleteKpi={handleDeleteKpiSetting}
              />
            )}

            {activeTab === 'my_dashboard' && (
              <RoleDashboardView
                currentUser={currentUser}
                idols={permittedIdols}
                schedules={schedules}
                scores={scores}
                tasks={permittedTasks}
                criteria={criteria}
                leaveRequests={leaveRequests}
                payrollPeriods={payrollPeriods}
                payrollDisputeCount={payrollDisputeCount}
                users={users}
                approvals={approvals}
                onCreateLeaveRequest={handleCreateLeaveRequest}
                onUpdateLeaveRequest={handleUpdateLeaveRequest}
                onDeleteLeaveRequest={handleDeleteLeaveRequest}
                onOpenProfileModal={handleOpenProfileModal}
                onOpenPayslip={currentUser.idolId ? handleOpenMyPayslip : undefined}
                onNavigateToTab={(tab, target) => { if (target) setServiceUsageTarget(target); setActiveTab(tab as NavTab); }}
                workAssignments={workAssignments}
                onCreateWorkAssignment={handleCreateWorkAssignment}
                onUpdateWorkAssignment={handleUpdateWorkAssignment}
                onRespondWorkAssignment={handleRespondWorkAssignment}
                onCompleteWorkAssignment={handleCompleteWorkAssignment}
                onReviewWorkAssignmentViolation={handleReviewWorkAssignmentViolation}
                onCancelWorkAssignment={handleCancelWorkAssignment}
                onRequestWorkAssignmentWaiver={handleRequestWorkAssignmentWaiver}
                onReviewWorkAssignmentWaiver={handleReviewWorkAssignmentWaiver}
                referenceDate={effectiveReferenceDate}
              />
            )}
            </>
          </Suspense>
        )}
      </main>

      {/* Floating Hover Popover Card for Idols */}
      <IdolHoverCard
        idol={hoveredIdol}
        position={hoverPosition}
        onMouseEnterPopover={() => {
          isHoveringCardRef.current = true;
        }}
        onMouseLeavePopover={() => {
          isHoveringCardRef.current = false;
          setHoveredIdol(null);
          setHoverPosition(null);
        }}
      />

      {/* Add / Edit Idol Modal (with approval routing for lower-role users) */}
      {isIdolModalOpen && (
        <IdolModal
          isOpen={isIdolModalOpen}
          onClose={() => setIsIdolModalOpen(false)}
          idolToEdit={idolToEdit}
          onSuccess={handleIdolSaved}
          existingIdolsCount={idols.length}
          departments={assignableDepartments}
          personnelTypes={personnelTypes}
          statuses={statuses}
          currentUser={currentUser}
          onApprovalCreated={(newAppr) => setApprovals((prev) => [newAppr, ...prev])}
          onNotifyPending={(msg) => {
            setAppToast({ message: msg, type: 'info' });
            setTimeout(() => setAppToast(null), 5000);
          }}
          referenceDate={effectiveReferenceDate}
        />
      )}

      {/* Full Detail Modal */}
      {detailModalIdol && (
        <IdolDetailModal
          isOpen
          onClose={() => setDetailModalIdol(null)}
          idol={detailModalIdol}
          criteria={criteria}
          scoreRecord={scores.find((s) => s.idolId === detailModalIdol.id)}
          tasks={tasks}
          schedules={schedules}
          personnelColumns={personnelColumns}
          referenceDate={effectiveReferenceDate}
          onEdit={handleOpenEditModal}
          onGoToTasks={handleGoToTasks}
          onGoToSchedule={handleGoToSchedule}
          canManageIdols={canManageIdols}
          canManageSchedule={canManageIdols || currentUser?.allowedTabs?.includes('schedule')}
          users={users}
        />
      )}

      {/* Delete / Propose Delete Confirmation Modal (In-App Dialog, no window.confirm or prompt) */}
      {idolDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0 my-auto">
            <div
              className={`p-5 ${
                idolDeleteConfirm.isSuperAdmin
                  ? 'bg-rose-50 border-b border-rose-100'
                  : 'bg-amber-50 border-b border-amber-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    idolDeleteConfirm.isSuperAdmin
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {idolDeleteConfirm.isSuperAdmin
                      ? 'Xác Nhận Xóa Nhân Sự'
                      : 'Gửi Yêu Cầu Phê Duyệt Xóa'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {idolDeleteConfirm.isSuperAdmin
                      ? 'Thao tác dành cho Super Admin'
                      : `Tài khoản vai trò: ${currentUser?.roleTitle}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Target info card */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={
                    idolDeleteConfirm.target.avatarUrl ||
                    DEFAULT_BLANK_AVATAR
                  }
                  alt={idolDeleteConfirm.target.stageName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {idolDeleteConfirm.target.stageName}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({idolDeleteConfirm.target.realName})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium text-[11px]">
                      {idolDeleteConfirm.target.department}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium text-[11px]">
                      {idolDeleteConfirm.target.personnelType || 'Công ty'}
                    </span>
                  </div>
                </div>
              </div>

              {!idolDeleteConfirm.isSuperAdmin ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <strong>Lưu ý quy trình phê duyệt:</strong> Do bạn chưa phải Super Admin, thao tác này sẽ gửi yêu cầu phê duyệt vào danh sách <strong>Chờ Duyệt</strong> trong mục Quản Trị. Nhân sự chỉ bị xóa khi Quản Trị Viên phê duyệt.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lý do đề xuất xóa nhân sự <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={idolDeleteConfirm.reason}
                      onChange={(e) =>
                        setIdolDeleteConfirm({ ...idolDeleteConfirm, reason: e.target.value })
                      }
                      placeholder="Nhập lý do (VD: Hết hạn hợp đồng, chuyển đơn vị, thôi việc...)"
                      rows={2}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn đang thao tác với quyền <strong>Quản Trị Viên Tối Cao</strong>. Nhân sự này cùng điểm đánh giá và nhiệm vụ liên quan sẽ bị xóa trực tiếp khỏi hệ thống.
                </p>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIdolDeleteConfirm(null)}
                disabled={isDeletingIdol}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteIdol}
                disabled={isDeletingIdol}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                  idolDeleteConfirm.isSuperAdmin
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-200'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-200'
                }`}
              >
                {isDeletingIdol ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : idolDeleteConfirm.isSuperAdmin ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Xác Nhận Xóa Vĩnh Viễn
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Gửi Phê Duyệt Xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Data Confirmation Modal (Two-Step Confirmation Modal) */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] shadow-2xl border border-rose-300 overflow-hidden flex flex-col min-h-0 animate-in zoom-in-95 duration-150 my-auto">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">Khôi Phục Dữ Liệu Ban Đầu</h3>
                <p className="text-xs text-rose-700">Hành động nguy hiểm · Xác nhận 2 bước</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-800 leading-relaxed">
                <strong>Cảnh báo quan trọng:</strong> Hành động này sẽ khôi phục toàn bộ hệ thống về dữ liệu mẫu ban đầu và <strong>xóa sạch mọi dữ liệu thay đổi hiện tại</strong> (nhân sự mới, điểm số, lịch trực, nhiệm vụ tự tạo...).
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Để xác nhận, vui lòng nhập chính xác từ khóa{' '}
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    RESET
                  </span>{' '}
                  hoặc{' '}
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    XAC NHAN
                  </span>
                  :
                </label>
                <input
                  type="text"
                  value={resetConfirmationInput}
                  onChange={(e) => setResetConfirmationInput(e.target.value)}
                  placeholder="Gõ RESET hoặc XAC NHAN..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none font-mono font-bold text-slate-800 tracking-wider"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetData}
                disabled={
                  isResetting ||
                  (resetConfirmationInput.trim().toUpperCase() !== 'RESET' &&
                    resetConfirmationInput.trim().toUpperCase() !== 'XAC NHAN')
                }
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  resetConfirmationInput.trim().toUpperCase() === 'RESET' ||
                  resetConfirmationInput.trim().toUpperCase() === 'XAC NHAN'
                    ? 'text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer active:scale-95'
                    : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                }`}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang khôi phục...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Xác Nhận Khôi Phục
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Personal Profile Modal (Cho phép nhân sự quản lý địa chỉ, SĐT, thể trạng, avatar) */}
      {currentUser && isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          activeIdol={idols.find((i) => i.id === currentUser.idolId) || null}
          onSaveProfile={handleSaveProfile}
          onOpenPayslip={currentUser.idolId ? handleOpenMyPayslip : undefined}
          onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        />
      )}

      {/* Dedicated Change Password Modal (Đơn giản, trực quan, không trùng lặp) */}
      {currentUser && isChangePasswordModalOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordModalOpen}
          onClose={() => setIsChangePasswordModalOpen(false)}
          currentUser={currentUser}
          onSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
        />
      )}

      {/* Personal Payslip Modal (Dành cho bất kỳ nhân viên / Idol nào xem phiếu lương cá nhân của chính mình) */}
      {personalPayslipRecord && (
        <PayslipModal
          isOpen
          onClose={() => setPersonalPayslipRecord(null)}
          record={personalPayslipRecord}
          currentUser={currentUser}
        />
      )}

      {/* Global In-App Toast Message */}
      {appToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-md">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs font-medium leading-relaxed text-slate-200">
              {appToast.message}
            </div>
            <button
              onClick={() => setAppToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
