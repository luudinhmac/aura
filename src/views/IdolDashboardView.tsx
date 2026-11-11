import React, { useState, useMemo, useEffect } from 'react';
import {
  Idol,
  UserAccount,
  WorkScheduleSlot,
  IdolScoreRecord,
  IdolTask,
  Criterion,
  LeaveRequest,
  LeaveType,
  OperationalKpiSummary,
  DEFAULT_BLANK_AVATAR,
  WorkAssignment
  , ServiceUsageRecord
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  CalendarClock,
  Clock,
  Award,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Plus,
  Send,
  X,
  FileText,
  User,
  Sparkles,
  TrendingUp,
  Flame,
  CheckSquare,
  HelpCircle,
  Building2,
  Mail,
  ShieldCheck,
  ChevronRight,
  Info,
  ShoppingBag,
  Eye,
  Gift
  , BriefcaseBusiness
} from 'lucide-react';
import { formatDateVN, calculateTenure, getTodayIsoDate, getSystemNow, calculateAnnualLeaveQuota } from '../utils/dateUtils.ts';
import { SystemClockText } from '../components/SystemClockText.tsx';
import { calculateLeaveAllocation, getRemainingAnnualLeaveDays } from '../utils/leaveAllocation.ts';
import { DateInput } from '../components/DateInput.tsx';
import { WorkAssignmentPanel } from '../components/WorkAssignmentPanel.tsx';

interface IdolDashboardViewProps {
  currentUser: UserAccount;
  idols: Idol[];
  schedules: WorkScheduleSlot[];
  scores: IdolScoreRecord[];
  tasks: IdolTask[];
  criteria: Criterion[];
  leaveRequests: LeaveRequest[];
  onCreateLeaveRequest: (req: Partial<LeaveRequest>) => Promise<void>;
  onUpdateLeaveRequest?: (id: string, updates: Partial<LeaveRequest>) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
  onOpenProfileModal?: () => void;
  onOpenPayslip?: () => void;
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

export const IdolDashboardView: React.FC<IdolDashboardViewProps> = ({
  currentUser,
  idols,
  schedules,
  scores,
  tasks,
  criteria,
  leaveRequests,
  onCreateLeaveRequest,
  onOpenProfileModal,
  onOpenPayslip,
  workAssignments,
  onCreateWorkAssignment,
  onUpdateWorkAssignment,
  onRespondWorkAssignment,
  onCompleteWorkAssignment,
  onReviewWorkAssignmentViolation, onCancelWorkAssignment, onRequestWorkAssignmentWaiver, onReviewWorkAssignmentWaiver,
  referenceDate
}) => {
  // 1. Xác định Idol đang được xem (Nếu là Idol thì xem chính mình, nếu là Admin/Manager có thể chọn Idol)
  const myIdol = useMemo(() => {
    if (currentUser.idolId) {
      const found = idols.find((i) => i.id === currentUser.idolId);
      if (found) return found;
      // An toàn: Nếu là tài khoản Idol nhưng không tìm thấy trong mảng idols (ví dụ bị ẩn hoặc tài khoản đặc biệt),
      // tự tạo profile an toàn từ chính currentUser. TUYỆT ĐỐI KHÔNG fallback sang idol khác như idols[0]!
      return {
        id: currentUser.idolId,
        stt: 0,
        realName: currentUser.name || 'Hồ Sơ Idol',
        stageName: currentUser.name || 'Idol',
        department: currentUser.department || 'Nhóm Idol',
        role: currentUser.roleTitle || 'Idol',
        status: currentUser.status === 'inactive' ? 'Đã nghỉ việc' : 'Đang hoạt động',
        avatarUrl: currentUser.avatarUrl || DEFAULT_BLANK_AVATAR,
        joinDate: currentUser.joinDate || '2025-01-01',
        resignedDate: currentUser.resignedDate,
        baseSalary: currentUser.baseSalary || 0,
        commercialDetails: { talents: [], sponsorBrands: [] },
        socialLinks: { email: currentUser.email }
      } as unknown as Idol;
    }
    // Nếu là Admin hoặc người dùng không gắn idolId, mặc định chọn idol đầu tiên
    return null;
  }, [currentUser, idols]);

  const [selectedIdolId, setSelectedIdolId] = useState<string>(myIdol?.id || '');

  const activeIdol = useMemo(() => {
    if (currentUser.idolId) {
      // Tài khoản Idol chỉ xem duy nhất dữ liệu cá nhân của chính mình
      return myIdol;
    }
    return myIdol;
  }, [myIdol, currentUser.idolId]);

  // Modal xin nghỉ phép
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState(() => getTodayIsoDate(referenceDate));
  const [endDate, setEndDate] = useState(() => getTodayIsoDate(referenceDate));
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [allocationConfirmed, setAllocationConfirmed] = useState(false);
  const [assignedServiceUsages, setAssignedServiceUsages] = useState<ServiceUsageRecord[]>([]);

  // Tính số ngày nghỉ dự kiến hiển thị trực tiếp khi chọn ngày
  const previewDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);

  // Toggle xem lương tạm tính dự kiến khi chưa hết tháng
  const [showEstimatedSalary, setShowEstimatedSalary] = useState(false);
  const [operationalKpi, setOperationalKpi] = useState<OperationalKpiSummary | null>(null);
  const [operationalKpiLoading, setOperationalKpiLoading] = useState(false);
  const [operationalKpiError, setOperationalKpiError] = useState<string | null>(null);

  // 2. Tính toán ngày hiện tại & kiểm tra cuối tháng
  const today = getSystemNow();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = today.getDate();
  const isMonthEnded = currentDay >= daysInCurrentMonth;
  const currentMonthLabel = `Tháng ${currentMonth + 1}/${currentYear}`;
  const currentPeriod = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    let cancelled = false;
    api.getAssignedServiceUsageRecords().then((records) => { if (!cancelled) setAssignedServiceUsages(records); }).catch(() => { if (!cancelled) setAssignedServiceUsages([]); });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  useEffect(() => {
    let cancelled = false;
    if (!activeIdol?.id) {
      setOperationalKpi(null);
      return;
    }
    setOperationalKpiLoading(true);
    setOperationalKpiError(null);
    api.getOperationalKpi(activeIdol.id, currentPeriod)
      .then(result => {
        if (!cancelled) setOperationalKpi(result);
      })
      .catch(error => {
        if (!cancelled) setOperationalKpiError(error instanceof Error ? error.message : 'Không thể tải KPI vận hành');
      })
      .finally(() => {
        if (!cancelled) setOperationalKpiLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeIdol?.id, currentPeriod]);

  // 3. Tính toán Tổng giờ Live & Ca trực trong tháng
  const idolSchedules = useMemo(() => {
    if (!activeIdol) return [];
    return schedules.filter((s) => s.idolId === activeIdol.id && s.isActive);
  }, [schedules, activeIdol]);

  // Tính số giờ live cam kết theo lịch mỗi tuần
  const weeklyHours = useMemo(() => {
    return idolSchedules.reduce((acc, slot) => {
      try {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        let durationHours = endH + endM / 60 - (startH + startM / 60);
        if (durationHours < 0) durationHours += 24; // Qua đêm
        return acc + durationHours;
      } catch {
        return acc + 3; // Fallback 3h
      }
    }, 0);
  }, [idolSchedules]);

  // Ước lượng 4.3 tuần/tháng
  const targetLiveHoursMonth = operationalKpi?.metrics.liveHours.target ?? 0;
  const originalLiveHoursTarget = operationalKpi?.metrics.liveHours.originalTarget ?? targetLiveHoursMonth;
  const liveTargetReduction = operationalKpi?.metrics.liveHours.adjustedByWorkAssignmentHours ?? 0;
  const scheduledMonthHours = Math.round(weeklyHours * 4.3);

  // Tính số giờ thực tế đã làm từ tasks & ca live
  const idolTasks = useMemo(() => {
    if (!activeIdol) return [];
    return tasks.filter((t) => t.idolId === activeIdol.id);
  }, [tasks, activeIdol]);

  const loggedTaskHours = useMemo(() => {
    const totalMinutes = idolTasks.reduce((acc, t) => acc + (t.loggedDurationMinutes || 0), 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [idolTasks]);

  // Giờ live thực tế tích lũy trong tháng (kết hợp task live + ca trực)
  const actualLiveHours = Math.min(
    scheduledMonthHours,
    Math.round(loggedTaskHours + (currentDay / daysInCurrentMonth) * scheduledMonthHours)
  );

  const liveProgressPercent = targetLiveHoursMonth > 0 ? Math.min(100, Math.round((actualLiveHours / targetLiveHoursMonth) * 100)) : 0;

  // 4. KPI vận hành được tổng hợp từ API theo idol và kỳ hiện tại.
  const totalKpiScore = operationalKpi?.totalScore ?? 0;
  const kpiLabelSummary = operationalKpi?.items?.length
    ? operationalKpi.items.map(item => item.label).join(' · ')
    : 'Chưa có chỉ tiêu hoạt động được cấu hình';

  // 5. Tính toán Tài chính: Lương (do HR nhập theo hợp đồng cá nhân), Thưởng KPI, Phạt, Thực Nhận
  const baseSalary = activeIdol?.baseSalary ?? 0;
  const kpiBonus = totalKpiScore >= 90 ? 3000000 : totalKpiScore >= 80 ? 1500000 : 500000;
  const hoursDeficit = Math.max(0, targetLiveHoursMonth - (operationalKpi?.metrics.liveHours.actual ?? actualLiveHours));
  const penalty = hoursDeficit > 15 ? 1000000 : hoursDeficit > 5 ? 500000 : 0;
  const netEstimatedSalary = baseSalary + kpiBonus - penalty;

  // 6. Quỹ Phép Năm của Idol (Tính tự động theo thâm niên: mới vào 1 ngày/tháng, đủ 12 tháng: 14 ngày, mỗi năm thêm: +1 ngày)
  const todayIso = getTodayIsoDate();
  const leaveQuotaInfo = useMemo(() => {
    return calculateAnnualLeaveQuota(activeIdol?.joinDate, todayIso);
  }, [activeIdol?.joinDate, todayIso]);

  const idolLeaves = useMemo(() => {
    if (!activeIdol) return [];
    return leaveRequests.filter((l) => l.idolId === activeIdol.id);
  }, [leaveRequests, activeIdol]);

  const totalAnnualDays = leaveQuotaInfo.totalDays;
  const remainingAnnualDays = getRemainingAnnualLeaveDays({
    totalAnnualDays,
    requests: idolLeaves
  });
  const usedAnnualDays = Math.max(0, totalAnnualDays - remainingAnnualDays);
  const leaveAllocationPreview = useMemo(
    () => calculateLeaveAllocation(leaveType, previewDays, remainingAnnualDays, allocationConfirmed),
    [leaveType, previewDays, remainingAnnualDays, allocationConfirmed]
  );

  const openLeaveModal = () => {
    setLeaveError(null);
    setAllocationConfirmed(false);
    setIsLeaveModalOpen(true);
  };

  // Xử lý gửi đơn xin nghỉ phép
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIdol) {
      setLeaveError('Tài khoản chưa được gắn với hồ sơ Idol.');
      return;
    }
    if (!startDate || !endDate || !leaveReason.trim()) {
      setLeaveError('Vui lòng chọn ngày nghỉ và nhập lý do');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setLeaveError('Ngày kết thúc không thể trước ngày bắt đầu');
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const allocation = calculateLeaveAllocation(leaveType, totalDays, remainingAnnualDays, allocationConfirmed);
    if (allocation.requiresConfirmation) {
      setLeaveError(`Bạn còn ${remainingAnnualDays} ngày phép năm. Vui lòng xác nhận ${allocation.unpaidLeaveDays} ngày còn lại sẽ chuyển sang nghỉ không lương.`);
      return;
    }

    // Quy chế phê duyệt:
    // - 1 ngày: Tự động phê duyệt ngay nếu còn phép năm
    // - >= 3 ngày: Bắt buộc Giám Đốc phê duyệt
    // - 2 ngày: Trưởng phòng / Quản lý duyệt
    let initialStatus: 'pending' | 'approved' = 'pending';
    let approverRoleRequired: 'auto' | 'manager' | 'director' = 'manager';
    let autoApproved = false;
    let reviewedBy: { id: string; name: string } | undefined = undefined;
    let reviewNote = '';
    let reviewedAt: string | undefined = undefined;

    if (totalDays === 1 && leaveType === 'annual' && allocation.unpaidLeaveDays === 0) {
      initialStatus = 'approved';
      autoApproved = true;
      approverRoleRequired = 'auto';
      reviewedBy = { id: 'system', name: 'Hệ thống tự động' };
      reviewNote = 'Hệ thống tự động phê duyệt theo chính sách nghỉ 1 ngày khi còn phép năm.';
      reviewedAt = new Date().toISOString();
    } else if (totalDays >= 3) {
      initialStatus = 'pending';
      approverRoleRequired = 'director';
      reviewNote = 'Cần Giám Đốc Điều Hành (CEO / BOD) phê duyệt (Nghỉ từ 3 ngày trở lên)';
    } else {
      initialStatus = 'pending';
      approverRoleRequired = 'manager';
      reviewNote = 'Cần Trưởng Phòng QL Idol / Quản lý trực tiếp phê duyệt';
    }

    try {
      setLeaveSubmitting(true);
      setLeaveError(null);
      await onCreateLeaveRequest({
        idolId: activeIdol.id,
        idolName: activeIdol.stageName || activeIdol.realName,
        department: activeIdol.department,
        leaveType,
        startDate,
        endDate,
        totalDays,
        annualLeaveDays: allocation.annualLeaveDays,
        unpaidLeaveDays: allocation.unpaidLeaveDays,
        allocationConfirmed: allocationConfirmed || allocation.unpaidLeaveDays === 0,
        reason: leaveReason.trim(),
        status: initialStatus,
        approverRoleRequired,
        autoApproved,
        reviewedBy,
        reviewNote,
        reviewedAt
      });
      setIsLeaveModalOpen(false);
      setLeaveReason('');
    } catch (err: any) {
      setLeaveError(err.message || 'Lỗi khi gửi đơn xin phép');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  if (!activeIdol) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm">
        Không tìm thấy thông tin hồ sơ Idol trong hệ thống.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Banner & Mode Selector (Nếu là Admin/Manager) */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none transform translate-x-32 -translate-y-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <img
                src={activeIdol.avatarUrl || DEFAULT_BLANK_AVATAR}
                alt={activeIdol.stageName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/80 shadow-md"
              />
              <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white shadow-xs">
                {activeIdol.status || 'Đang hoạt động'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {activeIdol.personnelType || 'Nhân sự Công ty'}
                </span>
                <span className="text-white/80 text-xs flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {activeIdol.department}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{activeIdol.stageName}</span>
                <span className="text-sm sm:text-base font-normal text-rose-100">({activeIdol.realName})</span>
              </h1>
              <p className="text-xs text-rose-100 flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3.5 h-3.5" />
                  {activeIdol.socialLinks?.email || `${activeIdol.accountUsername || 'idol'}@auratalent.vn`}
                </span>
                <span>•</span>
                <span>Thâm niên: {calculateTenure(activeIdol.joinDate).formattedText}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions / Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-right backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-100">Ngày giờ hệ thống</p>
              <p className="mt-1 text-sm font-black text-white"><SystemClockText referenceDate={referenceDate} /></p>
            </div>
            {/* Nếu là Quản Lý hoặc Giám Đốc, cho phép chuyển xem dashboard của bất kỳ Idol nào */}
            {currentUser.isSuperAdmin || !currentUser.idolId ? (
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
                <label className="block text-[10px] font-bold text-rose-200 uppercase tracking-wider mb-1">
                  👁️ Xem Bàn Làm Việc của Idol:
                </label>
                <select
                  value={activeIdol.id}
                  onChange={(e) => setSelectedIdolId(e.target.value)}
                  className="w-full text-xs bg-white text-slate-900 font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer shadow-xs"
                >
                  {idols.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.stageName} ({i.realName}) - {i.department}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl backdrop-blur-md border border-white/30 shadow-md transition-all cursor-pointer whitespace-nowrap"
                title="Xem và chỉnh sửa thông tin cá nhân, số điện thoại, địa chỉ, mật khẩu"
              >
                <User className="w-4 h-4 text-white" />
                <span>Hồ Sơ Của Tôi</span>
              </button>
            )}

            <button
              onClick={openLeaveModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-rose-600" />
              <span>Gửi Đơn Xin Nghỉ Phép</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid 4 Thẻ Thống Kê Chính (KPI / Giờ Live / Tài Chính / Nghỉ Phép) */}
      

      {assignedServiceUsages.length > 0 && <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-base font-black text-indigo-950">Dịch vụ ngoài được giao</h2><p className="mt-1 text-xs text-indigo-800">Các lịch quay/chụp được phân công trực tiếp cho bạn.</p></div><BriefcaseBusiness className="h-5 w-5 text-indigo-600" /></div><div className="mt-3 space-y-2">{assignedServiceUsages.map((record) => <div key={record.id} className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-white p-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><strong>{record.usageCode} · {record.serviceName}</strong><p className="text-slate-500">{record.personnelName || record.stageName} · {formatDateVN(record.usageDate)}{record.location ? ` · ${record.location}` : ''}</p></div><span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-800">{record.status === 'completed' ? 'Hoàn thành' : record.status === 'in_progress' ? 'Đang thực hiện' : 'Sắp tới'}</span></div>)}</div></section>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Giờ Live Trong Tháng */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <Clock className="w-4 h-4 text-rose-600" />
              Giờ Live Tháng Này
            </span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {currentMonthLabel}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{actualLiveHours}h</span>
              <span className="text-xs text-slate-400 font-medium ml-1">/ {targetLiveHoursMonth}h target</span>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
              {liveProgressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                liveProgressPercent >= 100
                  ? 'bg-emerald-500'
                  : liveProgressPercent >= 75
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, liveProgressPercent)}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>{idolSchedules.length} ca live / tuần</span>
            <span>{scheduledMonthHours}h theo lịch</span>
          </div>
          {liveTargetReduction > 0 && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-[11px] text-sky-800">
              Chỉ tiêu đã giảm {liveTargetReduction}h do công tác ({originalLiveHoursTarget}h → {targetLiveHoursMonth}h)
            </div>
          )}
        </div>

        {/* Card 2: Điểm KPI Vận Hành Tháng */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <Award className="w-4 h-4 text-amber-500" />
              Chỉ Số KPI Vận Hành
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Quy Đổi Tháng {currentMonth + 1}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">{totalKpiScore}</span>
              <span className="text-xs text-slate-400 font-medium ml-1">/ 100 điểm KPI</span>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                totalKpiScore >= 90
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : totalKpiScore >= 80
                  ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              {operationalKpi?.grade ?? (operationalKpiLoading ? 'Đang tải' : 'Chưa có dữ liệu')}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed truncate">
            Quy đổi từ: <strong className="text-slate-700">{kpiLabelSummary}</strong>
          </div>

          <div className="pt-1 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
            <span>Thưởng KPI dự kiến:</span>
            <span className="font-bold">+{kpiBonus.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* Card 3: Lương & Thực Nhận Tháng (Có cơ chế Khóa đến ngày cuối tháng) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Thu Nhập Thực Nhận
            </span>
            {isMonthEnded ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Đã Quyết Toán
              </span>
            ) : (
              <span
                className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1"
                title="Tiền thực nhận chỉ mở khóa sau ngày cuối tháng sau khi đánh giá tự động đối soát với Target"
              >
                <Lock className="w-3 h-3 text-amber-600" /> Khóa đến 31/{currentMonth + 1}
              </span>
            )}
          </div>

          {isMonthEnded ? (
            <div>
              <div className="text-3xl font-black text-emerald-600">
                {netEstimatedSalary.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Đã hoàn tất đối soát chỉ số target</div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-400 blur-xs select-none">
                  14.500.000 đ
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  Đang chốt KPI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                🔒 Thực nhận sẽ tự động hiển thị sau ngày cuối tháng so với Target.
              </p>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-100 text-slate-600">
            <span>
              {baseSalary > 0 ? (
                <>Lương cứng: <strong className="text-slate-800">{baseSalary.toLocaleString('vi-VN')} đ</strong></>
              ) : (
                <span className="text-amber-600 font-medium">Lương cứng: Chưa nhập (HR thiết lập)</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowEstimatedSalary(!showEstimatedSalary)}
              className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              {showEstimatedSalary ? 'Ẩn tạm tính' : 'Xem tạm tính'}
            </button>
          </div>

          {showEstimatedSalary && !isMonthEnded && (
            <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 animate-in fade-in">
              <div className="flex justify-between text-slate-600">
                <span>Lương cơ bản (HĐ):</span>
                <span>{baseSalary > 0 ? `+${baseSalary.toLocaleString('vi-VN')} đ` : '0 đ (Chưa nhập)'}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Thưởng KPI:</span>
                <span>+{kpiBonus.toLocaleString('vi-VN')} đ</span>
              </div>
              {penalty > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Khấu trừ giờ thiếu:</span>
                  <span>-{penalty.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Ước tính tạm tính:</span>
                <span className="text-rose-600">{netEstimatedSalary.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          )}

          {onOpenPayslip && (
            <button
              type="button"
              onClick={onOpenPayslip}
              className="w-full mt-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
            >
              <span>📄</span> Xem Phiếu Lương Chi Tiết
            </button>
          )}
        </div>

        {/* Card 4: Quỹ Nghỉ Phép */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-4 h-4 text-purple-600" />
              Quỹ Nghỉ Phép Năm
            </span>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Năm {currentYear}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-purple-700">{remainingAnnualDays}</span>
              <span className="text-xs text-slate-400 font-medium ml-1">ngày còn lại</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Đã nghỉ: <strong>{usedAnnualDays}</strong> / {totalAnnualDays} ngày
            </span>
          </div>

          {/* Leave progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{ width: `${totalAnnualDays > 0 ? Math.round((usedAnnualDays / totalAnnualDays) * 100) : 0}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-500 flex justify-between items-center">
            <span>Tự động trừ khi nộp đơn phép năm</span>
            <button
              onClick={openLeaveModal}
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer"
            >
              + Tạo đơn
            </button>
          </div>
        </div>
      </div>

      {/* Layout 2 cột: Cột Trái (Lịch Ca Trực & Nhiệm Vụ) - Cột Phải (Bảng Điểm Chi Tiết & Lịch Sử Nghỉ Phép) */}
      <WorkAssignmentPanel
        currentUser={currentUser}
        idols={idols}
        assignments={workAssignments}
        referenceDate={referenceDate}
        onCreate={onCreateWorkAssignment}
        onUpdate={onUpdateWorkAssignment}
        onRespond={onRespondWorkAssignment}
        onComplete={onCompleteWorkAssignment}
        onReviewViolation={onReviewWorkAssignmentViolation}
        onCancel={onCancelWorkAssignment}
        onRequestWaiver={onRequestWorkAssignmentWaiver}
        onReviewWaiver={onReviewWorkAssignmentWaiver}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột Trái (2 phần): Lịch Ca Trực Sắp Tới & Nhiệm Vụ Cá Nhân */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Lịch Ca Trực & Livestream Cá Nhân */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-700/70 dark:bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-700/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Lịch Ca Trực & Phiên Livestream Của Tôi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Các ca live cố định trong tuần theo lịch trình được quản lý thiết lập
                  </p>
                </div>
              </div>
              <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {idolSchedules.length} ca live / tuần
              </span>
            </div>

            <div className="p-6">
              {idolSchedules.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Chưa có ca làm việc nào được gán cho bạn trong tuần này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {idolSchedules.map((slot) => {
                    const days = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
                    return (
                      <div
                        key={slot.id}
                        className="space-y-2 rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/50 p-3.5 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:hover:border-indigo-400/70 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-400/10 dark:text-indigo-200">
                            {days[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`}
                          </span>
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-950/70 dark:text-slate-100">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{slot.title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-rose-600 dark:text-rose-300">{slot.platform}</span>
                            {slot.notes && (
                              <>
                                <span className="text-slate-400 dark:text-slate-500">•</span>
                                <span className="truncate">{slot.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section: Nhiệm Vụ Cần Làm & Bấm Giờ */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-700/70 dark:bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-700/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Nhiệm Vụ Cá Nhân Được Giao ({idolTasks.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ghi nhận thời gian thực hiện, báo cáo hoàn thành nội dung và lịch quay
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {idolTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Bạn không có nhiệm vụ nào đang chờ xử lý.
                </div>
              ) : (
                idolTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/70">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {t.status === 'completed' ? 'Hoàn thành' : t.status === 'in_progress' ? 'Đang làm' : 'Chưa làm'}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Hạn nộp: {t.dueDate ? formatDateVN(t.dueDate) : 'Hôm nay'}</span>
                        <span>•</span>
                        <span>Đã làm: <strong>{t.loggedDurationMinutes || 0} phút</strong></span>
                        {t.subtasks && t.subtasks.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length} subtask</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {t.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cột Phải (1 phần): Bảng Điểm Tiêu Chí Chi Tiết & Quản Lý Đơn Nghỉ Phép */}
        <div className="space-y-6">
          {/* Section: Bóc Tách Chỉ Số KPI Vận Hành Tháng Này */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Bóc Tách Chỉ Số KPI Vận Hành</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Quy đổi từ số liệu ca live, bán hàng, tương tác & quà tặng
                </p>
                {operationalKpiError && <p className="text-[10px] text-rose-600 mt-1">{operationalKpiError}</p>}
              </div>
              <span className="text-xs font-bold text-slate-700">
                Tổng: <strong className="text-rose-600 font-black">{totalKpiScore}</strong>/100
              </span>
            </div>

            <div className="p-4 space-y-4">
              {operationalKpi?.items ? (
                operationalKpi.items.length > 0 ? operationalKpi.items.map((item) => {
                  const progress = item.maxScore > 0 ? Math.min(100, (item.score / item.maxScore) * 100) : 0;
                  const Icon = item.metricKey === 'liveHours' ? Clock : item.metricKey === 'sales' ? ShoppingBag : item.metricKey === 'engagement' ? Eye : Gift;
                  const tone = item.metricKey === 'liveHours'
                    ? { icon: 'text-rose-500', bar: 'bg-rose-500' }
                    : item.metricKey === 'sales'
                      ? { icon: 'text-emerald-600', bar: 'bg-emerald-500' }
                      : item.metricKey === 'engagement'
                        ? { icon: 'text-sky-600', bar: 'bg-sky-500' }
                        : { icon: 'text-amber-500', bar: 'bg-amber-500' };
                  const formatValue = (value: number) => item.unit === 'VNĐ' ? `${(value / 1000000).toFixed(1)}Tr` : value.toLocaleString('vi-VN');
                  return (
                    <div key={`${item.code}-${item.activityCode || 'generic'}`} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${tone.icon}`} />
                          {item.label}
                          {item.activityName && <span className="font-normal text-slate-400">· {item.activityName}</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            {formatValue(item.actual)} / {formatValue(item.target)} {item.unit === 'giờ' ? 'giờ' : item.unit === 'VNĐ' ? '' : item.unit}
                            {item.metricKey === 'liveHours' && item.adjustedByWorkAssignmentHours && item.adjustedByWorkAssignmentHours > 0 && <span className="ml-1 text-sky-600">(đã giảm {item.adjustedByWorkAssignmentHours}h)</span>}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {item.score}/{item.maxScore} đ
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    Chưa có chỉ tiêu KPI hoạt động được cấu hình cho hồ sơ này.
                  </div>
                )
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Đang sử dụng dữ liệu KPI tương thích với phiên bản cũ.
                </div>
              )}

              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Các chỉ tiêu và trọng số được lấy từ cấu hình KPI đang áp dụng cho hoạt động của hồ sơ.
                </span>
              </div>
            </div>
          </div>

          {/* Section: Lịch Sử Đơn Nghỉ Phép Của Tôi */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Đơn Nghỉ Phép Đã Gửi ({idolLeaves.length})</span>
              </h3>
              <button
                onClick={openLeaveModal}
                className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                + Gửi đơn
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {idolLeaves.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chưa có đơn nghỉ phép nào được ghi nhận.
                </div>
              ) : (
                idolLeaves.map((l) => (
                  <div key={l.id} className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          l.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : l.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {l.status === 'approved' ? '✓ Đã duyệt' : l.status === 'rejected' ? '✕ Từ chối' : '⏳ Chờ duyệt'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {l.totalDays} ngày ({formatDateVN(l.startDate)} → {formatDateVN(l.endDate)})
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-800">
                      {l.leaveType === 'annual' ? '🌴 Phép năm' : l.leaveType === 'sick' ? '🏥 Nghỉ ốm' : '💼 Việc riêng'}:{' '}
                      <span className="text-slate-600 font-normal">{l.reason}</span>
                    </div>

                    {l.reviewNote && (
                      <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                        💬 Phản hồi: {l.reviewNote}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Note Tính Năng Dự Kiến Hoàn Thiện Tiếp Theo (Roadmap Checklist) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md space-y-2.5">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lộ Trình Nâng Cấp Bàn Làm Việc Idol</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Các tính năng hệ thống đang tiếp tục kết nối để hoàn thiện tự động hóa:
            </p>
            <ul className="text-[11px] space-y-1.5 text-slate-300">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">1.</span>
                <span>Tự động đồng bộ số phút livestream thực tế từ TikTok Live & Bigo Live qua Webhook API.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">2.</span>
                <span>Tự động trừ tiền phạt nếu vắng ca live mà không có đơn xin phép gửi trước 24h.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">3.</span>
                <span>Ký điện tử xác nhận phiếu lương online (E-Signature Payslip) hàng tháng.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">4.</span>
                <span>Tự động đối soát hoa hồng giỏ hàng TikTok Shop / Shopee Affiliate.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal: Đăng Ký Xin Nghỉ Phép */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col min-h-0 my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Tạo Đơn Xin Nghỉ Phép Mới
                </h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto min-h-0">
              {leaveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{leaveError}</span>
                </div>
              )}

              {/* Thông tin nhân sự nộp đơn */}
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Người nộp:</span>{' '}
                  <strong className="text-slate-900">{activeIdol.stageName}</strong> ({activeIdol.realName})
                </div>
                <div className="font-semibold text-purple-800">
                  Phép năm còn lại: <strong>{remainingAnnualDays} ngày</strong>
                </div>
              </div>

              {/* Loại nghỉ phép */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loại Nghỉ Phép <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'annual', label: '🌴 Phép Năm', desc: 'Có lương, trừ quỹ phép' },
                    { id: 'sick', label: '🏥 Ốm Đau', desc: 'Có giấy khám bệnh' },
                    { id: 'personal', label: '💼 Việc Riêng', desc: 'Nghỉ không lương' }
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setLeaveType(t.id as LeaveType)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        leaveType === t.id
                          ? 'border-purple-600 bg-purple-50/80 text-purple-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs">{t.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thời gian nghỉ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Từ ngày <span className="text-rose-600">*</span>
                  </label>
                  <DateInput
                    required
                    value={startDate}
                    onChange={setStartDate}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đến hết ngày <span className="text-rose-600">*</span>
                  </label>
                  <DateInput
                    required
                    value={endDate}
                    onChange={setEndDate}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Hiển thị số ngày nghỉ & Cơ chế phê duyệt theo quy chế */}
              {previewDays > 0 && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  previewDays === 1
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-400/50 dark:text-emerald-100'
                    : previewDays === 2
                    ? 'bg-sky-50/90 border-sky-300 text-sky-950 dark:bg-sky-950/40 dark:border-sky-400/50 dark:text-sky-100'
                    : 'bg-amber-50/90 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-400/50 dark:text-amber-100'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span>Số lượng ngày nghỉ:</span>
                      <strong className="text-sm font-mono text-slate-900">{previewDays} ngày</strong>
                    </span>
                    {!(previewDays === 1 && leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays === 0) && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      previewDays === 1
                        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200'
                        : previewDays === 2
                        ? 'bg-sky-200 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200'
                        : 'bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200'
                    }`}>
                      {previewDays === 1
                        ? (leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays === 0 ? '⚡ Tự Động Phê Duyệt' : '⏳ Cần Phê Duyệt')
                        : previewDays === 2
                        ? '👔 Trưởng Phòng Duyệt'
                        : '👑 Giám Đốc Phê Duyệt'}
                    </span>}
                  </div>

                  {!(previewDays === 1 && leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays === 0) && <div className="text-[11px] leading-relaxed">
                    {previewDays === 1 ? (
                      leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays === 0 ? (
                        <p className="text-emerald-800 dark:text-emerald-200">
                          ⚡ <strong>Chính sách nghỉ 1 ngày:</strong> Đơn xin nghỉ 1 ngày khi còn quỹ phép năm sẽ được hệ thống <strong>TỰ ĐỘNG PHÊ DUYỆT NGAY LẬP TỨC</strong> và trừ 1 ngày vào quỹ phép.
                        </p>
                      ) : (
                        <p className="text-amber-800 dark:text-amber-200">
                          ⚠️ <strong>Lưu ý:</strong> Hết quỹ phép năm hoặc nghỉ việc riêng không lương. Đơn sẽ được chuyển cấp quản lý xét duyệt.
                        </p>
                      )
                    ) : previewDays === 2 ? (
                      <p className="text-sky-800 dark:text-sky-200">
                        ℹ️ <strong>Chính sách nghỉ 2 ngày:</strong> Đơn sẽ được gửi đến <strong>Trưởng Phòng QL & Phát Triển Idol / Quản lý trực tiếp</strong> để bố trí lịch live thay thế và phê duyệt.
                      </p>
                    ) : (
                      <p className="text-amber-900 font-medium dark:text-amber-100">
                        👑 <strong>Chính sách nghỉ từ 3 ngày trở lên:</strong> Theo quy định Aura Talent, đơn nghỉ từ 3 ngày trở lên bắt buộc phải do <strong>GIÁM ĐỐC ĐIỀU HÀNH (CEO / BOD)</strong> trực tiếp phê duyệt.
                      </p>
                    )}
                  </div>}

                  {leaveType === 'annual' && leaveAllocationPreview.unpaidLeaveDays > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-950">
                      <div className="font-bold">Phân bổ đơn nghỉ</div>
                      <div className="mt-0.5">
                        {leaveAllocationPreview.annualLeaveDays} ngày phép năm + {leaveAllocationPreview.unpaidLeaveDays} ngày nghỉ không lương.
                      </div>
                      <label className="mt-2 flex items-start gap-2 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-amber-600"
                          checked={allocationConfirmed}
                          onChange={(event) => {
                            setAllocationConfirmed(event.target.checked);
                            setLeaveError(null);
                          }}
                        />
                        <span>Tôi xác nhận chuyển phần vượt quỹ phép sang nghỉ không lương và gửi đơn để cấp quản lý phê duyệt.</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Lý do nghỉ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do xin nghỉ phép <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể (VD: việc gia đình, đi khám sức khỏe...)"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                ℹ️ <em>Đơn xin nghỉ phép sẽ được gửi tới Ban Giám Đốc và Trưởng Phòng QLPTL để xem xét phê duyệt. Nếu chọn Phép Năm, số ngày nghỉ sẽ được tự động trừ vào quỹ phép sau khi duyệt.</em>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{leaveSubmitting ? 'Đang gửi...' : 'Gửi Đơn Xin Phép'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
