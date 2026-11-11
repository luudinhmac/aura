import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Info,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { formatDateVN, calculateTenure, calculateAnnualLeaveQuota } from '../utils/dateUtils.ts';
import type { ApprovalRequest, Idol, LeaveRequest, UserAccount } from '../types/index.ts';
import { DEFAULT_BLANK_AVATAR } from '../types/roles.ts';

export type ApprovalSubTab = 'leave_management' | 'approvals';

function canApproveDirectorLeave(user: UserAccount): boolean {
  if (user.isSuperAdmin) return true;
  const roleTitle = user.roleTitle?.toLowerCase() || '';
  const department = user.department?.toLowerCase() || '';
  return user.role === 'director' || roleTitle.includes('giám đốc') || department.includes('ban giám đốc');
}

interface ApprovalCenterViewProps {
  currentUser: UserAccount;
  approvals: ApprovalRequest[];
  leaveRequests?: LeaveRequest[];
  departments: string[];
  idols: Idol[];
  onApproveRequest: (id: string, note?: string) => Promise<void>;
  onRejectRequest: (id: string, reason?: string) => Promise<void>;
  onDeleteApproval: (id: string) => Promise<void>;
  onApproveLeaveRequest?: (id: string, note?: string) => Promise<void>;
  onRejectLeaveRequest?: (id: string, note?: string) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({
  currentUser,
  approvals,
  leaveRequests = [],
  departments,
  idols,
  onApproveRequest,
  onRejectRequest,
  onDeleteApproval,
  onApproveLeaveRequest,
  onRejectLeaveRequest,
  onDeleteLeaveRequest,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ApprovalSubTab>(() => {
    try {
      const saved = localStorage.getItem('aura_approval_subtab') as ApprovalSubTab | null;
      if (saved === 'leave_management' || saved === 'approvals') return saved;
    } catch {
      // ignore storage failure
    }
    return 'leave_management';
  });

  useEffect(() => {
    try {
      localStorage.setItem('aura_approval_subtab', activeSubTab);
    } catch {
      // ignore storage failure
    }
  }, [activeSubTab]);

  // Personnel approval state
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingApprId, setProcessingApprId] = useState<string | null>(null);
  const [selectedApprDetail, setSelectedApprDetail] = useState<ApprovalRequest | null>(null);
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    request: ApprovalRequest;
    mode: 'approve' | 'reject';
    note: string;
  } | null>(null);
  const [approvalToast, setApprovalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Leave approval state
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leavePolicyFilter, setLeavePolicyFilter] = useState<'all' | 'director' | 'manager' | 'auto'>('all');
  const [leaveDeptFilter, setLeaveDeptFilter] = useState<string>('all');
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);
  const [leaveActionModal, setLeaveActionModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest;
    mode: 'approve' | 'reject';
    note: string;
  } | null>(null);
  const [leaveToast, setLeaveToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const pendingCount = useMemo(() => approvals.filter((a) => a.status === 'pending').length, [approvals]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchStatus = approvalStatusFilter === 'all' || a.status === approvalStatusFilter;
      const term = approvalSearch.toLowerCase().trim();
      const matchSearch =
        !term ||
        a.targetName.toLowerCase().includes(term) ||
        a.requestedBy.name.toLowerCase().includes(term) ||
        (a.reason && a.reason.toLowerCase().includes(term)) ||
        (a.data?.department && a.data.department.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });
  }, [approvals, approvalStatusFilter, approvalSearch]);

  const pendingLeavesCount = useMemo(() => leaveRequests.filter((l) => l.status === 'pending').length, [leaveRequests]);

  const directorPendingLeavesCount = useMemo(
    () => leaveRequests.filter((l) => l.status === 'pending' && l.totalDays >= 3).length,
    [leaveRequests],
  );

  const autoApprovedLeavesCount = useMemo(
    () => leaveRequests.filter((l) => l.autoApproved || (l.totalDays === 1 && l.status === 'approved')).length,
    [leaveRequests],
  );

  const approvedLeavesDays = useMemo(
    () => leaveRequests.filter((l) => l.status === 'approved').reduce((acc, l) => acc + (l.totalDays || 0), 0),
    [leaveRequests],
  );

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((l) => {
      const term = leaveSearch.toLowerCase().trim();
      const matchSearch =
        !term ||
        l.idolName.toLowerCase().includes(term) ||
        l.department.toLowerCase().includes(term) ||
        (l.reason && l.reason.toLowerCase().includes(term));

      const matchStatus = leaveStatusFilter === 'all' || l.status === leaveStatusFilter;
      const matchDept = leaveDeptFilter === 'all' || l.department === leaveDeptFilter;

      let matchPolicy = true;
      if (leavePolicyFilter === 'director') matchPolicy = l.totalDays >= 3;
      else if (leavePolicyFilter === 'manager') matchPolicy = l.totalDays === 2;
      else if (leavePolicyFilter === 'auto') matchPolicy = l.totalDays === 1;

      return matchSearch && matchStatus && matchDept && matchPolicy;
    });
  }, [leaveRequests, leaveSearch, leaveStatusFilter, leaveDeptFilter, leavePolicyFilter]);

  const openApproveModal = (req: ApprovalRequest) => {
    setApprovalModal({
      isOpen: true,
      request: req,
      mode: 'approve',
      note: 'Đã kiểm tra và phê duyệt hồ sơ.',
    });
  };

  const openRejectModal = (req: ApprovalRequest) => {
    setApprovalModal({
      isOpen: true,
      request: req,
      mode: 'reject',
      note: 'Chưa đạt yêu cầu quy chuẩn của công ty.',
    });
  };

  const handleConfirmApprovalModal = async () => {
    if (!approvalModal) return;
    const { request, mode, note } = approvalModal;
    try {
      setProcessingApprId(request.id);
      if (mode === 'approve') {
        await onApproveRequest(request.id, note);
        setApprovalToast({
          type: 'success',
          message: `Đã phê duyệt thành công yêu cầu "${request.targetName}" vào hệ thống!`,
        });
      } else {
        await onRejectRequest(request.id, note);
        setApprovalToast({
          type: 'success',
          message: `Đã từ chối yêu cầu "${request.targetName}".`,
        });
      }
      setApprovalModal(null);
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err) {
      setApprovalToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi xử lý yêu cầu',
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } finally {
      setProcessingApprId(null);
    }
  };

  const handleQuickApprove = async (req: ApprovalRequest) => {
    try {
      setProcessingApprId(req.id);
      await onApproveRequest(req.id, 'Phê duyệt nhanh');
      setApprovalToast({
        type: 'success',
        message: `Đã phê duyệt nhanh thành công "${req.targetName}"!`,
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err) {
      setApprovalToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi phê duyệt',
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } finally {
      setProcessingApprId(null);
    }
  };

  const handleExecuteLeaveAction = async () => {
    if (!leaveActionModal) return;
    const { request, mode, note } = leaveActionModal;
    try {
      setProcessingLeaveId(request.id);
      if (mode === 'approve') {
        if (onApproveLeaveRequest) {
          await onApproveLeaveRequest(request.id, note || 'Đã phê duyệt đơn nghỉ phép');
        }
        setLeaveToast({
          type: 'success',
          message: `Đã phê duyệt thành công đơn nghỉ của "${request.idolName}" (${request.totalDays} ngày)!`,
        });
      } else {
        if (onRejectLeaveRequest) {
          await onRejectLeaveRequest(request.id, note || 'Từ chối đơn nghỉ phép');
        }
        setLeaveToast({
          type: 'success',
          message: `Đã từ chối đơn nghỉ phép của "${request.idolName}".`,
        });
      }
      setLeaveActionModal(null);
      setTimeout(() => setLeaveToast(null), 4000);
    } catch (err) {
      setLeaveToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi xử lý đơn nghỉ phép',
      });
      setTimeout(() => setLeaveToast(null), 4000);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-purple-700 flex items-center justify-center text-white shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">Phê Duyệt Nhân Sự &amp; Nghỉ Phép</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide">
                  Approval Center
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Xét duyệt đơn xin nghỉ phép và các đề xuất thêm/sửa/xóa hồ sơ nhân sự thuộc phạm vi phụ trách.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-center">
              <div className="text-[10px] font-medium text-purple-600">Phép Chờ Duyệt</div>
              <div className="text-sm font-extrabold text-purple-700">{pendingLeavesCount}</div>
            </div>
            <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <div className="text-[10px] font-medium text-rose-600">Yêu Cầu Chờ Duyệt</div>
              <div className="text-sm font-extrabold text-rose-700">{pendingCount}</div>
            </div>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="mt-5 border-t border-slate-100 pt-3.5">
          <div className="inline-flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveSubTab('leave_management')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'leave_management'
                  ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <CalendarClock className={`w-4 h-4 ${activeSubTab === 'leave_management' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>Duyệt Nghỉ Phép</span>
              {pendingLeavesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-purple-600 text-white">
                  {pendingLeavesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('approvals')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'approvals'
                  ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className={`w-4 h-4 ${activeSubTab === 'approvals' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>Duyệt Yêu Cầu</span>
              {pendingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-600 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PANEL 1: LEAVE MANAGEMENT */}
      {activeSubTab === 'leave_management' && (
        <div className="space-y-4">
          {leaveToast && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in ${
                leaveToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {leaveToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{leaveToast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setLeaveToast(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Chờ Duyệt</span>
              </div>
              <div className="text-2xl font-black text-purple-700">{pendingLeavesCount}</div>
              <div className="text-[10px] text-slate-400">Đơn cần xem xét</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-amber-200/90 shadow-2xs space-y-1">
              <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                <span>👑</span>
                <span>Cần Giám Đốc Duyệt</span>
              </div>
              <div className="text-2xl font-black text-amber-700">{directorPendingLeavesCount}</div>
              <div className="text-[10px] text-slate-400">Nghỉ dài ngày (≥ 3 ngày)</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-emerald-200/90 shadow-2xs space-y-1">
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Tự Động Duyệt</span>
              </div>
              <div className="text-2xl font-black text-emerald-700">{autoApprovedLeavesCount}</div>
              <div className="text-[10px] text-slate-400">Đơn 1 ngày còn phép năm</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Đã Nghỉ Trong Năm</span>
              </div>
              <div className="text-2xl font-black text-sky-700">
                {approvedLeavesDays} <span className="text-xs font-normal">ngày</span>
              </div>
              <div className="text-[10px] text-slate-400">Đã chốt trừ phép năm</div>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Quy chế Phê duyệt Nghỉ phép &amp; Tích lũy Phép năm Aura Talent</span>
              </div>
              <p className="text-[11px] text-purple-900 leading-relaxed">
                • <strong>Mới vào (&lt; 12 tháng)</strong>: 1 ngày/tháng thâm niên • <strong>Đủ 12 tháng</strong>: 14 ngày phép năm • <strong>Mỗi năm thêm</strong>: +1 ngày phép.<br />
                • <strong>Nghỉ 1 ngày</strong>: Tự động phê duyệt nếu còn phép năm • <strong>Nghỉ 2 ngày</strong>: Trưởng Phòng duyệt • <strong>Nghỉ ≥ 3 ngày</strong>: Giám Đốc trực tiếp phê duyệt.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={leaveSearch}
                  onChange={(e) => setLeaveSearch(e.target.value)}
                  placeholder="Tìm theo tên Idol, nghệ danh, lý do..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Phòng ban:</span>
                <select
                  value={leaveDeptFilter}
                  onChange={(e) => setLeaveDeptFilter(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700"
                >
                  <option value="all">Tất cả đơn vị</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Trạng thái:</span>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'pending', label: 'Chờ duyệt', count: pendingLeavesCount },
                  { id: 'approved', label: 'Đã duyệt' },
                  { id: 'rejected', label: 'Từ chối' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setLeaveStatusFilter(st.id as 'all' | 'pending' | 'approved' | 'rejected')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      leaveStatusFilter === st.id
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {st.label} {st.count !== undefined && st.count > 0 && `(${st.count})`}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Cấp duyệt:</span>
                {[
                  { id: 'all', label: 'Tất cả cấp' },
                  { id: 'director', label: '👑 Giám Đốc (≥ 3 ngày)' },
                  { id: 'manager', label: '👔 Trưởng Phòng (2 ngày)' },
                  { id: 'auto', label: '⚡ Tự Động (1 ngày)' },
                ].map((pol) => (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => setLeavePolicyFilter(pol.id as 'all' | 'director' | 'manager' | 'auto')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      leavePolicyFilter === pol.id
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pol.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredLeaves.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
                <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Không tìm thấy đơn nghỉ phép nào</h4>
                <p className="text-xs text-slate-400">Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa khác</p>
              </div>
            ) : (
              filteredLeaves.map((req) => {
                const idol = idols.find((i) => i.id === req.idolId);
                const quota = calculateAnnualLeaveQuota(idol?.joinDate);
                const tenure = calculateTenure(idol?.joinDate);
                const isDirectorRequired = req.totalDays >= 3;
                const canCurrentApprove = isDirectorRequired ? canApproveDirectorLeave(currentUser) : true;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={idol?.avatarUrl || DEFAULT_BLANK_AVATAR}
                          alt={req.idolName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{req.idolName}</span>
                            {idol?.realName && <span className="text-xs text-slate-400">({idol.realName})</span>}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {req.department}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>Thâm niên: <strong>{tenure.shortText}</strong></span>
                            <span>•</span>
                            <span title={quota.formulaExplanation} className="text-purple-700 font-medium">
                              Quỹ phép năm: <strong>{quota.totalDays} ngày</strong> ({quota.formulaExplanation})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            req.totalDays >= 3
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : req.totalDays === 2
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {req.totalDays >= 3
                            ? '👑 Cần Giám Đốc Duyệt (≥ 3 ngày)'
                            : req.totalDays === 2
                            ? '👔 Cần Trưởng Phòng Duyệt'
                            : '⚡ Tự Động Phê Duyệt'}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {req.status === 'approved' ? '✓ Đã Duyệt' : req.status === 'rejected' ? '✕ Từ Chối' : '⏳ Chờ Duyệt'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span className="font-bold text-slate-900">
                            {req.leaveType === 'annual' ? '🌴 Phép Năm' : req.leaveType === 'sick' ? '🏥 Nghỉ Ốm' : '💼 Việc Riêng'}
                          </span>
                          <span>•</span>
                          <span className="font-mono font-bold text-purple-800">
                            {req.totalDays} ngày ({formatDateVN(req.startDate)} → {formatDateVN(req.endDate)})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Nộp ngày: {formatDateVN(req.createdAt?.split('T')[0])}
                        </span>
                      </div>

                      {(req.annualLeaveDays !== undefined || req.unpaidLeaveDays !== undefined) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
                          <span>Phép năm: {req.annualLeaveDays ?? 0} ngày</span>
                          <span>Nghỉ không lương: {req.unpaidLeaveDays ?? 0} ngày</span>
                          {req.allocationConfirmed && req.unpaidLeaveDays ? (
                            <span className="text-amber-700">Đã xác nhận phân bổ</span>
                          ) : null}
                        </div>
                      )}

                      <div className="text-slate-700">
                        <span className="font-semibold text-slate-500">Lý do nghỉ:</span> {req.reason}
                      </div>

                      {req.reviewNote && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 mt-1">
                          <strong>Ghi chú duyệt ({req.reviewedBy?.name || 'Hệ thống'}):</strong> {req.reviewNote}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      {req.status === 'pending' && (
                        <>
                          {!canCurrentApprove && (
                            <span className="text-[11px] text-amber-700 font-semibold mr-auto">
                              ⚠️ Đơn ≥ 3 ngày cần tài khoản Giám Đốc Điều Hành (CEO) duyệt
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={!canCurrentApprove || processingLeaveId === req.id}
                            onClick={() =>
                              setLeaveActionModal({
                                isOpen: true,
                                request: req,
                                mode: 'approve',
                                note: 'Đồng ý phê duyệt',
                              })
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer ${
                              canCurrentApprove
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Phê Duyệt</span>
                          </button>

                          <button
                            type="button"
                            disabled={processingLeaveId === req.id}
                            onClick={() =>
                              setLeaveActionModal({
                                isOpen: true,
                                request: req,
                                mode: 'reject',
                                note: '',
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Từ Chối</span>
                          </button>
                        </>
                      )}

                      {onDeleteLeaveRequest && (
                        <button
                          type="button"
                          onClick={() => onDeleteLeaveRequest(req.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa bản ghi đơn nghỉ phép"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PANEL 2: APPROVALS QUEUE */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4">
          {approvalToast && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in ${
                approvalToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {approvalToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{approvalToast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setApprovalToast(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={approvalSearch}
                onChange={(e) => setApprovalSearch(e.target.value)}
                placeholder="Tìm yêu cầu theo tên, người gửi..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 mr-1">Bộ lọc:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => {
                const label =
                  st === 'all'
                    ? 'Tất cả'
                    : st === 'pending'
                    ? `Chờ duyệt (${pendingCount})`
                    : st === 'approved'
                    ? 'Đã duyệt'
                    : 'Đã từ chối';
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setApprovalStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      approvalStatusFilter === st
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredApprovals.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Không có yêu cầu phê duyệt nào</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Khi các nhân viên cấp dưới (quản lý, giám khảo, trợ lý) thực hiện thêm hoặc xóa nhân sự, các yêu cầu sẽ hiển thị tại đây để bộ phận nhân sự xét duyệt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredApprovals.map((req) => {
                const isPending = req.status === 'pending';
                const isCreate = req.type === 'create_idol';

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-xl border p-4 transition-all shadow-2xs hover:shadow-xs ${
                      isPending
                        ? 'border-amber-200 bg-amber-50/10'
                        : req.status === 'approved'
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : 'border-rose-200 bg-rose-50/10'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {req.data?.avatarUrl ? (
                          <img
                            src={req.data.avatarUrl}
                            alt={req.targetName}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 font-bold">
                            {req.targetName.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isCreate
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {isCreate ? 'Yêu Cầu Thêm Nhân Sự' : 'Yêu Cầu Xóa Nhân Sự'}
                            </span>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isPending ? '⏳ Chờ Duyệt (Pending)' : req.status === 'approved' ? '✓ Đã Duyệt' : '✕ Từ Chối'}
                            </span>

                            <span className="text-[11px] text-slate-400">
                              {new Date(req.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                            <span>{req.targetName}</span>
                            {req.data?.realName && (
                              <span className="text-xs font-normal text-slate-500">({req.data.realName})</span>
                            )}
                            {req.data?.department && (
                              <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                {req.data.department}
                              </span>
                            )}
                          </h3>

                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              Người gửi đề xuất: <strong>{req.requestedBy.name}</strong> ({req.requestedBy.roleTitle})
                            </span>
                          </div>

                          {req.reason && (
                            <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              &ldquo;{req.reason}&rdquo;
                            </p>
                          )}

                          {req.reviewNote && (
                            <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700">Phản hồi của người duyệt:</span>
                              <span className="text-slate-600 font-medium">{req.reviewNote}</span>
                              {req.reviewedBy && (
                                <span className="text-[11px] text-slate-400">(bởi {req.reviewedBy.name})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {req.data && (
                          <button
                            type="button"
                            onClick={() => setSelectedApprDetail(req)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Xem Chi Tiết
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(req)}
                              disabled={processingApprId === req.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Duyệt nhanh với ghi chú chuẩn"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt Nhanh</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openApproveModal(req)}
                              disabled={processingApprId === req.id}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isCreate ? 'Duyệt Thêm Roster' : 'Duyệt Xóa Roster'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openRejectModal(req)}
                              disabled={processingApprId === req.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Từ Chối</span>
                            </button>
                          </>
                        )}

                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => onDeleteApproval(req.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa yêu cầu khỏi lịch sử"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* APPROVAL DETAIL MODAL */}
      {selectedApprDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Chi Tiết Hồ Sơ Đề Xuất Phê Duyệt</span>
              </h3>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setSelectedApprDetail(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {selectedApprDetail.data?.avatarUrl ? (
                  <img
                    src={selectedApprDetail.data.avatarUrl}
                    alt={selectedApprDetail.targetName}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-base">
                    {selectedApprDetail.targetName.slice(0, 2)}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedApprDetail.targetName}</h4>
                  <p className="text-slate-500 font-medium">
                    Tên thật: {selectedApprDetail.data?.realName || 'Chưa cung cấp'}
                  </p>
                  <p className="text-slate-500">
                    Đơn vị: <strong>{selectedApprDetail.data?.department}</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Ngày sinh</span>
                  <span className="font-semibold text-slate-800">{formatDateVN(selectedApprDetail.data?.dob) || 'N/A'}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Nghề nghiệp / Vai trò</span>
                  <span className="font-semibold text-slate-800">{selectedApprDetail.data?.role || 'N/A'}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Chiều cao / Cân nặng</span>
                  <span className="font-semibold text-slate-800">
                    {selectedApprDetail.data?.height || 0}cm · {selectedApprDetail.data?.weight || 0}kg
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Quê quán / Nơi sống</span>
                  <span className="font-semibold text-slate-800">
                    {selectedApprDetail.data?.hometown} / {selectedApprDetail.data?.currentLiving}
                  </span>
                </div>
              </div>

              {selectedApprDetail.data?.bio && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] mb-0.5">Tiểu sử &amp; Giới thiệu</span>
                  <p className="text-slate-700 leading-relaxed">{selectedApprDetail.data.bio}</p>
                </div>
              )}

              {selectedApprDetail.reason && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-700 font-bold block text-[10px] mb-0.5">Lý do đề xuất từ cấp dưới</span>
                  <p className="text-amber-900 italic">&ldquo;{selectedApprDetail.reason}&rdquo;</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedApprDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
              {selectedApprDetail.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedApprDetail;
                      setSelectedApprDetail(null);
                      openApproveModal(req);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Duyệt Yêu Cầu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedApprDetail;
                      setSelectedApprDetail(null);
                      openRejectModal(req);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Từ Chối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL / REJECTION INTERACTIVE ACTION MODAL */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {approvalModal.mode === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Phê Duyệt Yêu Cầu Nhân Sự</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Từ Chối Yêu Cầu Nhân Sự</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setApprovalModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className={`p-3 rounded-xl border ${
                  approvalModal.mode === 'approve'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}
              >
                <div className="font-extrabold text-sm mb-1">{approvalModal.request.targetName}</div>
                <div className="text-[11px] opacity-80">
                  {approvalModal.request.type === 'create_idol' ? 'Yêu cầu thêm mới nhân sự' : 'Yêu cầu xóa nhân sự'}
                  {' · '}Đề xuất bởi: <strong>{approvalModal.request.requestedBy.name}</strong> ({approvalModal.request.requestedBy.roleTitle})
                </div>
                {approvalModal.request.reason && (
                  <div className="mt-2 text-[11px] italic bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    Lý do đề xuất: &ldquo;{approvalModal.request.reason}&rdquo;
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {approvalModal.mode === 'approve' ? 'Ghi chú phê duyệt:' : 'Lý do từ chối yêu cầu:'}
                </label>
                <textarea
                  rows={3}
                  value={approvalModal.note}
                  onChange={(e) => setApprovalModal({ ...approvalModal, note: e.target.value })}
                  placeholder={
                    approvalModal.mode === 'approve'
                      ? 'Nhập căn cứ hoặc ghi chú phê duyệt...'
                      : 'Nhập lý do không chấp thuận...'
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModal(null)}
                disabled={processingApprId === approvalModal.request.id}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovalModal}
                disabled={processingApprId === approvalModal.request.id}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  approvalModal.mode === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {processingApprId === approvalModal.request.id ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    {approvalModal.mode === 'approve' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{approvalModal.mode === 'approve' ? 'Xác Nhận Phê Duyệt' : 'Xác Nhận Từ Chối'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE REQUEST APPROVAL / REJECTION MODAL */}
      {leaveActionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {leaveActionModal.mode === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Phê Duyệt Đơn Nghỉ Phép</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Từ Chối Đơn Nghỉ Phép</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setLeaveActionModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className={`p-3.5 rounded-xl border ${
                  leaveActionModal.mode === 'approve'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm">{leaveActionModal.request.idolName}</div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200">
                    {leaveActionModal.request.department}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-semibold">
                    📅 {formatDateVN(leaveActionModal.request.startDate)} → {formatDateVN(leaveActionModal.request.endDate)}
                  </span>
                  <span className="font-extrabold text-rose-600 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                    {leaveActionModal.request.totalDays} ngày nghỉ
                  </span>
                  <span className="text-slate-600">
                    Loại: {leaveActionModal.request.leaveType === 'annual' ? 'Phép năm' : leaveActionModal.request.leaveType === 'sick' ? 'Nghỉ ốm' : 'Nghỉ không lương'}
                  </span>
                </div>

                {(leaveActionModal.request.annualLeaveDays !== undefined || leaveActionModal.request.unpaidLeaveDays !== undefined) && (
                  <div className="mt-1.5 text-[11px] font-semibold text-slate-700">
                    Phân bổ: {leaveActionModal.request.annualLeaveDays ?? 0} ngày phép năm · {leaveActionModal.request.unpaidLeaveDays ?? 0} ngày nghỉ không lương
                  </div>
                )}

                {leaveActionModal.request.reason && (
                  <div className="mt-2.5 text-[11px] bg-white/90 p-2.5 rounded-lg border border-slate-200/70 text-slate-700 italic">
                    Lý do: &ldquo;{leaveActionModal.request.reason}&rdquo;
                  </div>
                )}
              </div>

              {leaveActionModal.mode === 'approve' && leaveActionModal.request.totalDays >= 3 && !canApproveDirectorLeave(currentUser) ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950">Quy định thẩm quyền phê duyệt:</div>
                    <div>
                      Đơn xin nghỉ từ <strong>3 ngày trở lên</strong> bắt buộc phải do <strong>Ban Giám Đốc</strong> phê duyệt.
                      Tài khoản của bạn ({currentUser.name} - {currentUser.roleTitle}) không có thẩm quyền phê duyệt đơn này.
                    </div>
                  </div>
                </div>
              ) : leaveActionModal.mode === 'approve' && leaveActionModal.request.totalDays >= 3 ? (
                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 text-[11px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Đơn này từ 3 ngày trở lên, phê duyệt với thẩm quyền <strong>Ban Giám Đốc</strong>.</span>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {leaveActionModal.mode === 'approve' ? 'Ghi chú phê duyệt nghỉ phép:' : 'Lý do từ chối đơn nghỉ:'}
                </label>
                <textarea
                  rows={3}
                  value={leaveActionModal.note}
                  onChange={(e) => setLeaveActionModal({ ...leaveActionModal, note: e.target.value })}
                  placeholder={
                    leaveActionModal.mode === 'approve'
                      ? 'Nhập ghi chú hoặc yêu cầu bàn giao công việc...'
                      : 'Nhập lý do chưa chấp thuận đơn nghỉ...'
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeaveActionModal(null)}
                disabled={processingLeaveId === leaveActionModal.request.id}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteLeaveAction}
                disabled={
                  processingLeaveId === leaveActionModal.request.id ||
                  (leaveActionModal.mode === 'approve' &&
                    leaveActionModal.request.totalDays >= 3 &&
                    !canApproveDirectorLeave(currentUser))
                }
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                  leaveActionModal.mode === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {processingLeaveId === leaveActionModal.request.id ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    {leaveActionModal.mode === 'approve' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{leaveActionModal.mode === 'approve' ? 'Xác Nhận Phê Duyệt' : 'Xác Nhận Từ Chối'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

