import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Settings,
  Shield,
  Sliders,
  Tag,
  Users,
  XCircle,
} from 'lucide-react';
import {
  MOCK_ADMIN_APPROVALS,
  MOCK_ADMIN_CRITERIA,
  MOCK_ADMIN_DEPARTMENTS,
  MOCK_ADMIN_LEAVES,
  MOCK_ADMIN_PERSONNEL_TYPES,
  MOCK_ADMIN_STATUSES,
  MOCK_ADMIN_USERS,
  MOCK_AUDIT_LOGS,
  MOCK_ROSTER_COLUMNS,
  MOCK_SYSTEM_CLOCK_LABEL,
} from './mockShowcaseData.ts';

export type PreviewAdminSubTab =
  | 'leave_management'
  | 'approvals'
  | 'users'
  | 'departments'
  | 'personnel_types'
  | 'statuses'
  | 'criteria'
  | 'settings'
  | 'column_headers'
  | 'audit_logs';

interface PreviewAdminTabsProps {
  onNotify: (msg: string) => void;
  onOpenAuditSection?: () => void;
}

export const PreviewAdminTabs: React.FC<PreviewAdminTabsProps> = ({
  onNotify,
  onOpenAuditSection,
}) => {
  const [subTab, setSubTab] = useState<PreviewAdminSubTab>('leave_management');
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [userViewMode, setUserViewMode] = useState<'rbac' | 'user_list'>('rbac');
  const [scoreMode, setScoreMode] = useState<'sum' | 'weighted'>('sum');
  const [brandName, setBrandName] = useState('Aura Talent');
  const [brandTagline, setBrandTagline] = useState('Hệ thống Quản trị Nghệ sĩ & Vận hành');

  const pendingApprovals = MOCK_ADMIN_APPROVALS.filter((a) => a.status === 'pending').length;
  const pendingLeaves = MOCK_ADMIN_LEAVES.filter((l) => l.status === 'pending').length;

  const filteredLeaves = MOCK_ADMIN_LEAVES.filter((item) =>
    leaveFilter === 'all' ? true : item.status === leaveFilter,
  );

  const tabs: { id: PreviewAdminSubTab; label: string; badge?: number; group: string }[] = [
    { id: 'leave_management', label: 'Duyệt Nghỉ Phép', badge: pendingLeaves, group: 'queue' },
    { id: 'approvals', label: 'Duyệt Yêu Cầu', badge: pendingApprovals, group: 'queue' },
    { id: 'users', label: 'Tài Khoản & Phân Quyền', badge: MOCK_ADMIN_USERS.length, group: 'org' },
    { id: 'departments', label: 'Cơ Cấu Đơn Vị', badge: MOCK_ADMIN_DEPARTMENTS.length, group: 'org' },
    { id: 'personnel_types', label: 'Loại Nhân Sự', badge: MOCK_ADMIN_PERSONNEL_TYPES.length, group: 'org' },
    { id: 'statuses', label: 'Trạng Thái', badge: MOCK_ADMIN_STATUSES.length, group: 'org' },
    { id: 'criteria', label: 'Tiêu Chí Đánh Giá', badge: MOCK_ADMIN_CRITERIA.length, group: 'sys' },
    { id: 'settings', label: 'Thiết Lập Hệ Thống', group: 'sys' },
    { id: 'column_headers', label: 'Hiển Thị Danh Sách', group: 'sys' },
    { id: 'audit_logs', label: 'Nhật Ký Hệ Thống (MỚI)', badge: MOCK_AUDIT_LOGS.length, group: 'new' },
  ];

  return (
    <div className="space-y-4">
      {/* Header + 4 Stat Pills */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Trung Tâm Quản Trị & Cấu Hình Hệ Thống</h3>
            <p className="text-[11px] text-slate-500">
              Đầy đủ 9 phân hệ quản trị hiện hữu + tab Nhật Ký Hệ Thống (AuditLog) bổ sung ở Nhóm 3.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-center">
              <div className="text-[10px] font-medium text-rose-700">Yêu Cầu Chờ Duyệt</div>
              <div className="text-sm font-black text-rose-800">{pendingApprovals}</div>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-center">
              <div className="text-[10px] font-medium text-purple-700">Phép Chờ Duyệt</div>
              <div className="text-sm font-black text-purple-800">{pendingLeaves}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-center">
              <div className="text-[10px] font-medium text-sky-700">Tài Khoản</div>
              <div className="text-sm font-black text-sky-800">{MOCK_ADMIN_USERS.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
              <div className="text-[10px] font-medium text-slate-600">Đơn Vị</div>
              <div className="text-sm font-black text-slate-800">{MOCK_ADMIN_DEPARTMENTS.length}</div>
            </div>
          </div>
        </div>

        {/* All 10 Sub-tabs wrap nicely */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
          {tabs.map((item) => {
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-rose-700 border border-rose-200 shadow-2xs'
                    : item.group === 'new'
                      ? 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Leave Management */}
      {subTab === 'leave_management' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="h-3.5 w-3.5 text-purple-600" /> Chờ Duyệt
              </div>
              <div className="mt-1 text-xl font-black text-purple-700">{pendingLeaves}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-3">
              <div className="text-amber-700 font-semibold">Cần Giám Đốc Duyệt</div>
              <div className="mt-1 text-xl font-black text-amber-700">1</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-3">
              <div className="text-emerald-700 font-semibold">Tự Động Duyệt (1d)</div>
              <div className="mt-1 text-xl font-black text-emerald-700">1</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1 text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-sky-600" /> Đã Nghỉ Năm Nay
              </div>
              <div className="mt-1 text-xl font-black text-sky-700">7 ngày</div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-950">
            <strong>Quy chế Phép Năm Aura Talent:</strong> Mới vào (&lt;12 tháng): 1 ngày/tháng · Đủ 12 tháng: 14 ngày/năm · Nghỉ 1 ngày tự động duyệt nếu còn phép · 2 ngày Trưởng phòng duyệt · &ge;3 ngày Giám đốc duyệt.
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'pending', 'approved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setLeaveFilter(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer ${
                  leaveFilter === st ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {st === 'all' ? 'Tất cả đơn' : st === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredLeaves.map((lv) => (
              <div key={lv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{lv.employeeName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{lv.department}</span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">{lv.days} ngày · {lv.range}</span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    {lv.type} · Lý do: {lv.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {lv.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onNotify(`Đã duyệt đơn nghỉ phép của ${lv.employeeName} (mô phỏng)`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => onNotify(`Đã từ chối đơn của ${lv.employeeName} (mô phỏng)`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Từ chối
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700">Đã phê duyệt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Approvals */}
      {subTab === 'approvals' && (
        <div className="space-y-2.5">
          {MOCK_ADMIN_APPROVALS.map((req) => (
            <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">{req.actionType}</span>
                  <span className="font-bold text-slate-900">{req.targetName}</span>
                  <span className="text-slate-400">· Đề xuất bởi {req.requester}</span>
                </div>
                <p className="mt-1 text-slate-600">{req.detail}</p>
              </div>
              {req.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onNotify(`Đã phê duyệt ${req.id} (update_idol được phép chạy chuẩn Nhóm 2)`)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white cursor-pointer"
                  >
                    Phê duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => onNotify(`Đã từ chối ${req.id}`)}
                    className="rounded-lg border border-rose-200 px-2.5 py-1 font-bold text-rose-600 cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">Đã duyệt</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. Users & RBAC */}
      {subTab === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-600" />
              <span className="font-bold text-slate-900">Tài Khoản & Ma Trận Phân Quyền RBAC</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUserViewMode('rbac')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                  userViewMode === 'rbac' ? 'bg-rose-600 text-white' : 'border border-slate-200 text-slate-600'
                }`}
              >
                Ma trận RBAC
              </button>
              <button
                type="button"
                onClick={() => setUserViewMode('user_list')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                  userViewMode === 'user_list' ? 'bg-rose-600 text-white' : 'border border-slate-200 text-slate-600'
                }`}
              >
                Danh sách Tài khoản
              </button>
              <button
                type="button"
                onClick={() => onNotify('Đã đồng bộ tài khoản nhân sự & RBAC (mô phỏng)')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Đồng bộ Users
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-2 pr-3">Tài khoản</th>
                  <th className="py-2 pr-3">Vai trò</th>
                  <th className="py-2 pr-3">Đơn vị</th>
                  <th className="py-2">{userViewMode === 'rbac' ? 'Quyền hành động (allowedActions)' : 'Trạng thái'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_ADMIN_USERS.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">@{u.username}</div>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-indigo-700">{u.role}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{u.department}</td>
                    <td className="py-2.5">
                      {userViewMode === 'rbac' ? (
                        <div className="flex flex-wrap gap-1">
                          {u.actions.map((act) => (
                            <span key={act} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                              {act}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">Đang hoạt động</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Departments */}
      {subTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {MOCK_ADMIN_DEPARTMENTS.map((dept) => (
            <div key={dept.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Building2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>{dept.name}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Khối: {dept.block} · Phụ trách: {dept.lead}
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
                {dept.headcount} nhân sự
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 5 & 6. Personnel Types / Statuses */}
      {(subTab === 'personnel_types' || subTab === 'statuses') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              {subTab === 'personnel_types' ? <Layers className="h-4 w-4 text-rose-600" /> : <Tag className="h-4 w-4 text-rose-600" />}
              <span>{subTab === 'personnel_types' ? 'Danh mục Loại Hình Nhân Sự' : 'Danh mục Trạng Thái Làm Việc'}</span>
            </div>
            <button
              type="button"
              onClick={() => onNotify('Đã mở hộp thoại thêm danh mục mới (mô phỏng)')}
              className="rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white cursor-pointer"
            >
              + Thêm mới
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(subTab === 'personnel_types' ? MOCK_ADMIN_PERSONNEL_TYPES : MOCK_ADMIN_STATUSES).map((item) => (
              <span key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 7. Criteria */}
      {subTab === 'criteria' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sliders className="h-4 w-4 text-rose-600" />
              <span>Bộ Tiêu Chí Chấm Điểm & Trọng Số</span>
            </div>
            <span className="font-semibold text-emerald-700">Tổng trọng số: 100%</span>
          </div>
          {MOCK_ADMIN_CRITERIA.map((cr) => (
            <div key={cr.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-bold text-slate-900">{cr.name}</span>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">Trọng số {cr.weight}%</span>
                <span className="text-slate-500">Thang {cr.maxScore}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. System Settings */}
      {subTab === 'settings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Settings className="h-4 w-4 text-rose-600" />
            <span>Thiết Lập Thương Hiệu, Đồng Hồ Hệ Thống & Công Thức Tính Điểm</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="admin-brand-name" className="block font-semibold text-slate-700 mb-1">
                Tên thương hiệu hiển thị
              </label>
              <input
                id="admin-brand-name"
                name="adminBrandName"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="admin-brand-tagline" className="block font-semibold text-slate-700 mb-1">
                Tagline (Sidebar / Header)
              </label>
              <input
                id="admin-brand-tagline"
                name="adminBrandTagline"
                type="text"
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
            <div>
              <div className="font-bold text-sky-900">Đồng hồ tham chiếu hệ thống (Reference Clock)</div>
              <div className="text-sky-700 font-mono text-[11px]">{MOCK_SYSTEM_CLOCK_LABEL}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Cách tính điểm:</span>
              <button
                type="button"
                onClick={() => setScoreMode('sum')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${scoreMode === 'sum' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}
              >
                Tổng điểm (sum)
              </button>
              <button
                type="button"
                onClick={() => setScoreMode('weighted')}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${scoreMode === 'weighted' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}
              >
                Trọng số % (weighted)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Column Headers */}
      {subTab === 'column_headers' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
          <div className="font-bold text-slate-900">Tùy Chỉnh Tên Cột Hiển Thị Trên Danh Sách Nhân Sự</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MOCK_ROSTER_COLUMNS.map((col) => (
              <div key={col.key}>
                <label htmlFor={`col-header-${col.key}`} className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Key: <code className="font-mono">{col.key}</code>
                </label>
                <input
                  id={`col-header-${col.key}`}
                  name={`colHeader_${col.key}`}
                  type="text"
                  defaultValue={col.label}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. New AuditLog Tab */}
      {subTab === 'audit_logs' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Shield className="h-4 w-4 text-rose-600" />
                <span>Nhật Ký Hệ Thống (`GET /api/admin/audit-logs`)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Theo dõi các thao tác thay đổi dữ liệu & sự kiện RBAC (403).
              </p>
            </div>
            {onOpenAuditSection && (
              <button
                type="button"
                onClick={onOpenAuditSection}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                Mở AuditLog Viewer đầy đủ
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {MOCK_AUDIT_LOGS.slice(0, 4).map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">{log.method}</span>
                  <span className="font-semibold text-slate-900">{log.action}</span>
                  <span className="text-slate-400">bởi {log.actorName}</span>
                </div>
                <span className={`font-mono text-[11px] font-bold ${log.statusCode >= 400 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  HTTP {log.statusCode} · {log.createdAt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

