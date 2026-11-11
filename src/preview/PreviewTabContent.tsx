import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckSquare,
  Columns3,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
} from 'lucide-react';
import type { NavTab } from '../components/Navbar.tsx';
import type { ScoreCalculationMode } from '../types/index.ts';
import {
  MOCK_ANALYTICS_SCORES,
  MOCK_ASSIGNED_SERVICES,
  MOCK_KPI_RULES,
  MOCK_ROSTER_COLUMNS,
  MOCK_ROSTER_ROWS,
  MOCK_SCORING_BOARD,
  MOCK_SYSTEM_CLOCK_LABEL,
  MOCK_TASKS,
  MOCK_WEEKLY_SCHEDULE,
  MOCK_WORK_ASSIGNMENTS,
  type PreviewRoleProfile,
} from './mockShowcaseData.ts';
import { PreviewAdminTabs } from './PreviewAdminTabs.tsx';
import {
  PreviewDisputesAndServiceTabs,
  PreviewFinanceTab,
  PreviewPayrollTab,
  PreviewRevenueTab,
} from './PreviewFinancePayrollTabs.tsx';

interface PreviewTabContentProps {
  activeTab: NavTab;
  role: PreviewRoleProfile;
  onNotify: (message: string) => void;
  onOpenAuditSection?: () => void;
  onOpenProfileModal?: () => void;
  onOpenPayslipModal?: () => void;
  onOpenLeaveModal?: () => void;
}

export const PreviewTabContent: React.FC<PreviewTabContentProps> = ({
  activeTab,
  role,
  onNotify,
  onOpenAuditSection,
  onOpenProfileModal,
  onOpenPayslipModal,
  onOpenLeaveModal,
}) => {
  // Roster (IdolListView parity)
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterBlock, setRosterBlock] = useState<'all' | 'idol' | 'corporate'>('all');
  const [rosterDept, setRosterDept] = useState('all');
  const [rosterType, setRosterType] = useState('all');
  const [rosterStatus, setRosterStatus] = useState('all');
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_ROSTER_COLUMNS.map((c) => [c.key, c.defaultVisible])),
  );

  // Dashboard
  const [dashFocus, setDashFocus] = useState<'all' | 'tasks' | 'finance'>('all');

  // Work Assignments
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'cancelled'>('all');

  // Schedule
  const [scheduleViewMode, setScheduleViewMode] = useState<'matrix' | 'per_idol'>('matrix');
  const [scheduleShiftFilter, setScheduleShiftFilter] = useState('all');

  // Tasks
  const [taskSubTab, setTaskSubTab] = useState<'summary' | 'detail'>('summary');
  const [runningTaskId, setRunningTaskId] = useState<string | null>('t-101');

  // Scoring / Leaderboard / Analytics / KPI
  const [scoringMode, setScoringMode] = useState<ScoreCalculationMode>('sum');
  const [scoringPeriod, setScoringPeriod] = useState<'month' | 'quarter' | 'all'>('month');
  const [showTieBreakerPanel, setShowTieBreakerPanel] = useState(false);
  const [analyticsChartType, setAnalyticsChartType] = useState<'bar' | 'pie'>('bar');
  const [kpiViewMode, setKpiViewMode] = useState<'group' | 'individual'>('group');
  const [kpiBlock, setKpiBlock] = useState<'all' | 'idol' | 'corporate'>('all');

  const departments = useMemo(
    () => Array.from(new Set(MOCK_ROSTER_ROWS.map((row) => row.department))),
    [],
  );

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return MOCK_ROSTER_ROWS.filter((row) => {
      if (rosterBlock === 'idol' && !row.department.includes('Nhóm')) return false;
      if (rosterBlock === 'corporate' && row.department.includes('Nhóm')) return false;
      if (rosterDept !== 'all' && row.department !== rosterDept) return false;
      if (rosterType !== 'all' && row.personnelType !== rosterType) return false;
      if (rosterStatus !== 'all' && row.status !== rosterStatus) return false;
      if (!q) return true;
      return (
        row.stageName.toLowerCase().includes(q) ||
        row.realName.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    });
  }, [rosterSearch, rosterBlock, rosterDept, rosterType, rosterStatus]);

  if (activeTab === 'admin') {
    return <PreviewAdminTabs onNotify={onNotify} onOpenAuditSection={onOpenAuditSection} />;
  }

  if (activeTab === 'finance') {
    return <PreviewFinanceTab onNotify={onNotify} />;
  }

  if (activeTab === 'revenue') {
    return <PreviewRevenueTab onNotify={onNotify} />;
  }

  if (activeTab === 'payroll') {
    return <PreviewPayrollTab onNotify={onNotify} onOpenPayslipModal={() => onOpenPayslipModal?.()} />;
  }

  if (activeTab === 'payroll_disputes' || activeTab === 'service_usage') {
    return <PreviewDisputesAndServiceTabs mode={activeTab} onNotify={onNotify} />;
  }

  if (activeTab === 'roster') {
    const activeColCount = Object.values(visibleColumns).filter(Boolean).length;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Tổng nhân sự hệ thống</div>
            <div className="mt-1 text-2xl font-black text-slate-900">21</div>
            <div className="mt-0.5 text-[11px] font-semibold text-emerald-600">+2 thực tập sinh T11</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Khối Nghệ sĩ / Idol</div>
            <div className="mt-1 text-2xl font-black text-slate-900">14</div>
            <div className="mt-0.5 text-[11px] text-slate-400">PK, Commerce, Gaming</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Khối Văn phòng & Quản lý</div>
            <div className="mt-1 text-2xl font-black text-slate-900">5</div>
            <div className="mt-0.5 text-[11px] text-slate-400">HR, Kế toán, Điều phối</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Đối tác Dịch vụ ngoài</div>
            <div className="mt-1 text-2xl font-black text-slate-900">2</div>
            <div className="mt-0.5 text-[11px] text-slate-400">Studio Alpha, Agency Beta</div>
          </div>
        </div>

        {/* Full IdolListView Filter Bar + Block Switcher + Column Visibility Picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'Tất cả khối' },
                  { id: 'idol', label: 'Khối Idol / Talent' },
                  { id: 'corporate', label: 'Văn phòng & Đối tác' },
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setRosterBlock(b.id)}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                    rosterBlock === b.id ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNotify('Mở modal + Thêm Nhân Sự Mới (mô phỏng)')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Thêm nhân sự</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative flex-1 min-w-[180px]">
              <label htmlFor="mock-roster-search" className="sr-only">Tìm nhân sự theo nghệ danh hoặc họ tên</label>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="mock-roster-search"
                name="rosterSearch"
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Tìm nghệ danh, họ tên..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs"
              />
            </div>

            <div>
              <label htmlFor="mock-roster-dept" className="sr-only">Lọc theo phòng ban</label>
              <select
                id="mock-roster-dept"
                name="rosterDept"
                aria-label="Lọc theo phòng ban"
                value={rosterDept}
                onChange={(e) => setRosterDept(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <option value="all">Tất cả đơn vị</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mock-roster-type" className="sr-only">Lọc loại hình nhân sự</label>
              <select
                id="mock-roster-type"
                name="rosterType"
                value={rosterType}
                onChange={(e) => setRosterType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <option value="all">Tất cả loại hình</option>
                <option value="Công ty">Công ty</option>
                <option value="Cộng tác viên">Cộng tác viên</option>
                <option value="Dịch vụ ngoài">Dịch vụ ngoài</option>
              </select>
            </div>

            <div>
              <label htmlFor="mock-roster-status" className="sr-only">Lọc trạng thái</label>
              <select
                id="mock-roster-status"
                name="rosterStatus"
                value={rosterStatus}
                onChange={(e) => setRosterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đang hoạt động">Đang hoạt động</option>
                <option value="Tạm nghỉ">Tạm nghỉ</option>
              </select>
            </div>

            {/* Interactive Column Visibility Picker Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnPickerOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                  isColumnPickerOpen ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span>Cột ({activeColCount}/{MOCK_ROSTER_COLUMNS.length})</span>
              </button>
              {isColumnPickerOpen && (
                <div className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold text-slate-800">
                    <span>Tùy chọn cột hiển thị</span>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleColumns(Object.fromEntries(MOCK_ROSTER_COLUMNS.map((c) => [c.key, true])))
                      }
                      className="text-[11px] text-rose-600 cursor-pointer"
                    >
                      Hiện hết
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {MOCK_ROSTER_COLUMNS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          id={`toggle-col-${col.key}`}
                          name={`toggleCol_${col.key}`}
                          type="checkbox"
                          checked={Boolean(visibleColumns[col.key])}
                          disabled={col.isCore}
                          onChange={() =>
                            setVisibleColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                          }
                          className="h-3.5 w-3.5 rounded"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <th className="px-4 py-2.5">Hồ sơ</th>
                  <th className="px-4 py-2.5">Đơn vị / Khối</th>
                  {visibleColumns.personnelType && <th className="px-4 py-2.5">Loại hình</th>}
                  {visibleColumns.baseSalary && <th className="px-4 py-2.5 text-right">Lương cứng</th>}
                  {visibleColumns.kpiPercent && <th className="px-4 py-2.5 text-right">KPI</th>}
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-slate-900">{row.stageName}</div>
                      <div className="text-[11px] text-slate-400">
                        {row.realName} {visibleColumns.role ? `· ${row.role}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{row.department}</td>
                    {visibleColumns.personnelType && (
                      <td className="px-4 py-2.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {row.personnelType}
                        </span>
                      </td>
                    )}
                    {visibleColumns.baseSalary && (
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                        {row.baseSalary > 0 ? `${row.baseSalary.toLocaleString('vi-VN')} đ` : 'Theo hợp đồng'}
                      </td>
                    )}
                    {visibleColumns.kpiPercent && (
                      <td className="px-4 py-2.5 text-right font-bold text-indigo-700">
                        {row.kpiPercent > 0 ? `${row.kpiPercent}%` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          row.status === 'Đang hoạt động'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onNotify(`Xem chi tiết / chỉnh sửa hồ sơ ${row.stageName} (mô phỏng)`)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'my_dashboard') {
    return (
      <div className="space-y-4">
        {/* Hero Welcome + SystemClockText */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Dashboard Cá Nhân</span>
              </div>
              <h3 className="mt-1 text-lg font-black text-slate-900">Xin chào, {role.userName}</h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {role.roleTitle} · Đơn vị: {role.department}
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-right">
              <div className="text-[10px] font-bold uppercase text-sky-700">Today · System Clock</div>
              <div className="text-xs font-black text-slate-900 font-mono">{MOCK_SYSTEM_CLOCK_LABEL}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => onOpenProfileModal?.()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hồ Sơ Cá Nhân & BMI
            </button>
            <button
              type="button"
              onClick={() => onOpenPayslipModal?.()}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              Xem Phiếu Lương Của Tôi
            </button>
            <button
              type="button"
              onClick={() => onOpenLeaveModal?.()}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-700 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" /> Gửi Đơn Xin Nghỉ Phép
            </button>
          </div>
        </div>

        {/* Shortcut: Giao việc & Công tác + Focus Filter */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900">Tổng Quan Giao Việc & Công Tác</div>
              <div className="text-slate-600">Theo dõi nhanh ca công tác ngoài giờ và deadline xác nhận</div>
            </div>
            <div className="flex gap-1 rounded-xl bg-white p-1 border border-sky-200">
              {(['all', 'tasks', 'finance'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDashFocus(f)}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                    dashFocus === f ? 'bg-sky-600 text-white' : 'text-slate-600'
                  }`}
                >
                  {f === 'all' ? 'Tất cả' : f === 'tasks' ? 'Công việc' : 'Thu nhập'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-sky-200 bg-white p-2.5">
              <div className="text-lg font-black text-slate-900">4</div>
              <div className="text-[11px] text-slate-500">Tổng công việc</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white p-2.5">
              <div className="text-lg font-black text-amber-600">2</div>
              <div className="text-[11px] text-slate-500">Đang mở / Chưa xong</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white p-2.5">
              <div className="text-lg font-black text-emerald-600">2</div>
              <div className="text-[11px] text-slate-500">Hoàn thành đúng hạn</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {dashFocus !== 'finance' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-slate-500">KPI Giờ Live Tuần</div>
              <div className="mt-1 text-xl font-black text-slate-900">26 / 24 giờ</div>
              <div className="mt-1 font-semibold text-emerald-600">Đạt 108% chỉ tiêu</div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-slate-500">Thu nhập ước tính T10</div>
            <div className="mt-1 text-xl font-black text-indigo-700">24.650.000 đ</div>
            <div className="mt-1 text-slate-400">Bao gồm hoa hồng PK</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-slate-500">Ngày phép năm còn lại</div>
            <div className="mt-1 text-xl font-black text-slate-900">11 / 14 ngày</div>
            <div className="mt-1 text-slate-400">Tự động duyệt đơn 1 ngày</div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'work_assignments') {
    const visibleAssignments = MOCK_WORK_ASSIGNMENTS.filter((item) => {
      if (assignmentFilter === 'all') return true;
      if (assignmentFilter === 'open') return item.status === 'Chờ phản hồi' || item.status === 'Quá hạn / Đang xét';
      if (assignmentFilter === 'in_progress') return item.status === 'Đã nhận ca';
      if (assignmentFilter === 'completed') return item.status === 'Hoàn thành';
      return false;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Giao Việc & Công Tác Timeline</h3>
            <p className="text-[11px] text-slate-500">Theo dõi công việc, phụ cấp OT và dịch vụ ngoài được phân công.</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-900">
            Đồng hồ: {MOCK_SYSTEM_CLOCK_LABEL}
          </div>
        </div>

        {/* 5 Filter Stat Cards matching WorkAssignmentsView */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {(
            [
              { id: 'all', label: 'Tất cả', count: 4 },
              { id: 'open', label: 'Chưa xong', count: 2 },
              { id: 'in_progress', label: 'Đang làm', count: 1 },
              { id: 'completed', label: 'Đã xong', count: 1 },
              { id: 'cancelled', label: 'Đã huỷ', count: 0 },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setAssignmentFilter(f.id)}
              className={`rounded-2xl border p-3 text-left cursor-pointer ${
                assignmentFilter === f.id ? 'border-sky-500 bg-sky-50 font-bold' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-slate-500">{f.label}</div>
              <div className="mt-1 text-lg font-black text-slate-900">{f.count}</div>
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {visibleAssignments.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{item.title}</span>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">{item.type}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {item.assignee} · {item.dateLabel} · <strong className="text-emerald-700">{item.allowancePay}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNotify(`Cập nhật phản hồi công việc ${item.id} (mô phỏng)`)}
                className="rounded-lg bg-slate-900 px-3 py-1 font-bold text-white cursor-pointer"
              >
                {item.status}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom panel matching WorkAssignmentsView: Dịch vụ ngoài được phân công */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2 text-xs">
          <div className="font-black text-amber-950">Dịch Vụ Ngoài Được Phân Công ({MOCK_ASSIGNED_SERVICES.length})</div>
          {MOCK_ASSIGNED_SERVICES.map((srv) => (
            <div key={srv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-3">
              <div>
                <div className="font-bold text-slate-900">{srv.usageCode} · {srv.serviceName}</div>
                <div className="text-[11px] text-slate-500">
                  {srv.clientName} · {srv.schedule} · {srv.location}
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                Phụ trách: {srv.assignedStaff}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'schedule') {
    const filteredSlots = MOCK_WEEKLY_SCHEDULE.filter((s) =>
      scheduleShiftFilter === 'all' ? true : s.tone === scheduleShiftFilter,
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleViewMode('matrix')}
              className={`rounded-xl px-3 py-1.5 font-bold cursor-pointer ${scheduleViewMode === 'matrix' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Ma Trận Tuần
            </button>
            <button
              type="button"
              onClick={() => setScheduleViewMode('per_idol')}
              className={`rounded-xl px-3 py-1.5 font-bold cursor-pointer ${scheduleViewMode === 'per_idol' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Theo Từng Nhân Sự
            </button>
            <div>
              <label htmlFor="schedule-shift-filter" className="sr-only">Lọc nhóm ca</label>
              <select
                id="schedule-shift-filter"
                name="scheduleShiftFilter"
                value={scheduleShiftFilter}
                onChange={(e) => setScheduleShiftFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold"
              >
                <option value="all">Tất cả ca trực</option>
                <option value="rose">Ca Live PK / Evening</option>
                <option value="sky">Ca Commerce</option>
                <option value="indigo">Ca Gaming</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNotify('Mở modal + Thêm Ca Làm Việc Mới (mô phỏng)')}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm Ca Mới
            </button>
            <button
              type="button"
              onClick={() => onNotify('Mở modal Xếp Lịch Lặp Hàng Loạt (mô phỏng)')}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-bold text-indigo-700 cursor-pointer"
            >
              Xếp Lịch Hàng Loạt
            </button>
          </div>
        </div>

        <div className={`grid gap-3 ${scheduleViewMode === 'matrix' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredSlots.map((slot) => (
            <div key={`${slot.day}-${slot.idol}`} className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700">{slot.day}</span>
                <span className="font-mono text-[11px] text-slate-500">{slot.slot}</span>
              </div>
              <div className="font-extrabold text-slate-900">{slot.idol}</div>
              <div className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                {slot.type}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-600" />
            <span className="font-black text-slate-900">Quản Lý Tiến Độ Công Việc & Pomodoro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTaskSubTab('summary')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${taskSubTab === 'summary' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                Tổng Kết Công Việc
              </button>
              <button
                type="button"
                onClick={() => setTaskSubTab('detail')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${taskSubTab === 'detail' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                Chi Tiết & Bấm Giờ Task
              </button>
            </div>
            <button
              type="button"
              onClick={() => onNotify('Mở modal + Giao Task Mới (mô phỏng)')}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              + Giao Task Mới
            </button>
          </div>
        </div>

        {taskSubTab === 'summary' ? (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <th className="px-4 py-2.5">Nhân sự</th>
                  <th className="px-4 py-2.5 text-center">Tổng việc</th>
                  <th className="px-4 py-2.5 text-center">Tiến độ</th>
                  <th className="px-4 py-2.5 text-right">Giờ ghi nhận</th>
                  <th className="px-4 py-2.5 text-right">Mở chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_ROSTER_ROWS.slice(0, 4).map((r, i) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{r.stageName}</td>
                    <td className="px-4 py-2.5 text-center">{4 - (i % 2)}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-emerald-700">{75 + i * 5}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{120 + i * 35} phút</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setTaskSubTab('detail')}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-700 cursor-pointer"
                      >
                        Bấm giờ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            {MOCK_TASKS.map((task) => {
              const isRunning = runningTaskId === task.id;
              return (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{task.title}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {task.assignee} · {task.category} · Subtask {task.subtasksDone}/{task.subtasksTotal} · Đã ghi {task.loggedMinutes} phút
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRunningTaskId(isRunning ? null : task.id)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold cursor-pointer ${
                      isRunning ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{isRunning ? 'Đang bấm giờ (Space)' : 'Bấm giờ'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'scoring' || activeTab === 'leaderboard') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {(['month', 'quarter', 'all'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setScoringPeriod(p)}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${scoringPeriod === p ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  {p === 'month' ? 'Tháng' : p === 'quarter' ? 'Quý' : 'Toàn bộ'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setScoringMode('sum')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${scoringMode === 'sum' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
              >
                Tổng Điểm (`sum`)
              </button>
              <button
                type="button"
                onClick={() => setScoringMode('weighted')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${scoringMode === 'weighted' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
              >
                Trọng Số % (`weighted`)
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {activeTab === 'scoring' ? (
              <button
                type="button"
                onClick={() => onNotify('Mở modal + Thêm Tiêu Chí Chấm Điểm Mới (mô phỏng)')}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm Tiêu Chí
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowTieBreakerPanel((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 font-bold text-amber-800 cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Cấu hình Tie-Breaker
              </button>
            )}
          </div>
        </div>

        {showTieBreakerPanel && activeTab === 'leaderboard' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-amber-950">
              Thứ tự ưu tiên Tie-Breaker khi đồng điểm: Doanh số GMV ➔ Tương tác Live ➔ Kỷ luật lên sóng
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">Đang bật</span>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MOCK_SCORING_BOARD.slice(0, 3).map((row, idx) => (
              <div
                key={row.id}
                className={`rounded-2xl border p-4 ${
                  idx === 0 ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-700">
                    <Trophy className="h-3.5 w-3.5" /> Hạng #{idx + 1}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    {row.tier}
                  </span>
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">{row.stageName}</div>
                <div className="mt-2 text-lg font-black text-rose-600">
                  {scoringMode === 'sum' ? `${row.sumTotal} đ` : `${row.weightedTotal} / 100`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <th className="px-4 py-2.5">Nghệ danh</th>
                <th className="px-4 py-2.5 text-center">Biểu diễn</th>
                <th className="px-4 py-2.5 text-center">Tương tác</th>
                <th className="px-4 py-2.5 text-center">GMV</th>
                <th className="px-4 py-2.5 text-center">Kỷ luật</th>
                <th className="px-4 py-2.5 text-right">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_SCORING_BOARD.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{row.stageName}</td>
                  <td className="px-4 py-2.5 text-center">{row.vocalOrSkill}</td>
                  <td className="px-4 py-2.5 text-center">{row.liveInteraction}</td>
                  <td className="px-4 py-2.5 text-center">{row.gmvScore}</td>
                  <td className="px-4 py-2.5 text-center">{row.discipline}</td>
                  <td className="px-4 py-2.5 text-right font-black text-indigo-700">
                    {scoringMode === 'sum' ? `${row.sumTotal}` : `${row.weightedTotal}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'analytics') {
    const scoreData = MOCK_ANALYTICS_SCORES[scoringMode];
    return (
      <div className="space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Award className="h-4 w-4 text-blue-600" />
            <span>Báo Cáo & Phân Tích Hiệu Suất ({scoringPeriod})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAnalyticsChartType('bar')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${analyticsChartType === 'bar' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'}`}
              >
                Biểu Đồ Cột
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsChartType('pie')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${analyticsChartType === 'pie' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'}`}
              >
                Cơ Cấu Tỉ Trọng
              </button>
            </div>
            <button
              type="button"
              onClick={() => setScoringMode((m) => (m === 'sum' ? 'weighted' : 'sum'))}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-bold text-indigo-700 cursor-pointer"
            >
              Chế độ: {scoringMode === 'sum' ? 'Tổng điểm (sum)' : 'Trọng số (weighted)'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex justify-between font-bold">
            <span>{analyticsChartType === 'bar' ? 'So Sánh Điểm Theo Nhân Sự' : 'Cơ Cấu Đóng Góp Theo Nhóm'}</span>
            <span className="text-indigo-700">
              Trung bình: {scoreData.avg} / {scoreData.maxScale}
            </span>
          </div>
          {scoreData.items.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">{item.name}</span>
                <span className="font-mono font-bold text-indigo-700">
                  {item.score} / {scoreData.maxScale}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-indigo-600"
                  style={{ width: `${Math.min(100, Math.round((item.score / scoreData.maxScale) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Remaining tab: 'kpi' (KpiSettingsView parity)
  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setKpiViewMode('group')}
              className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${kpiViewMode === 'group' ? 'bg-white shadow-2xs text-rose-700' : 'text-slate-600'}`}
            >
              Theo Nhóm KPI
            </button>
            <button
              type="button"
              onClick={() => setKpiViewMode('individual')}
              className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${kpiViewMode === 'individual' ? 'bg-white shadow-2xs text-rose-700' : 'text-slate-600'}`}
            >
              Theo Cá Nhân
            </button>
          </div>
          <div>
            <label htmlFor="kpi-block-filter" className="sr-only">Lọc khối KPI</label>
            <select
              id="kpi-block-filter"
              name="kpiBlockFilter"
              value={kpiBlock}
              onChange={(e) => setKpiBlock(e.target.value as 'all' | 'idol' | 'corporate')}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold"
            >
              <option value="all">Tất cả khối</option>
              <option value="idol">Khối Nghệ sĩ / Idol</option>
              <option value="corporate">Khối Văn phòng</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNotify('Mở modal + Tạo Nhóm KPI Mới (mô phỏng)')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 cursor-pointer"
          >
            + Tạo Nhóm KPI
          </button>
          <button
            type="button"
            onClick={() => onNotify('Mở modal + Thêm Mốc Thưởng/Phạt KPI (mô phỏng)')}
            className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white cursor-pointer"
          >
            + Thêm Mốc KPI
          </button>
        </div>
      </div>

      {MOCK_KPI_RULES.map((rule) => (
        <div key={rule.code} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Target className="h-4 w-4 text-rose-600" />
              <span>{rule.name}</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                {kpiViewMode === 'group' ? rule.scope : 'Áp dụng cá nhân'}
              </span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">
              Thưởng {rule.bonus}
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Mục tiêu: <strong className="text-slate-800">{rule.target}</strong> · {rule.adjustedNote}
          </div>
        </div>
      ))}
    </div>
  );
};
