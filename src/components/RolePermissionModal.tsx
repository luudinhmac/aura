import React, { useState } from 'react';
import { X, Shield, Plus, Check, Trash2, Edit2, Users, Building2, Sliders, CheckSquare, Sparkles } from 'lucide-react';
import { UserAccount, AppTabPermission, AppActionPermission, DEFAULT_BLANK_AVATAR } from '../types/index.ts';

interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  departments: string[];
  onSaveUser: (user: Partial<UserAccount>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

const TAB_OPTIONS: { id: AppTabPermission; label: string; desc: string }[] = [
  { id: 'roster', label: 'Danh Sách Nhân Sự', desc: 'Xem hồ sơ nhân sự, tuổi, ảnh' },
  { id: 'scoring', label: 'Bảng Điểm', desc: 'Xem bảng điểm và tiêu chí đánh giá' },
  { id: 'leaderboard', label: 'Xếp Hạng', desc: 'Xem bảng xếp hạng và tiêu chí tie-breaker' },
  { id: 'schedule', label: 'Lịch Làm Việc & Ca Trực', desc: 'Xem lịch livestream, tập luyện và ca trực' },
  { id: 'tasks', label: 'Nhiệm Vụ & Bấm Giờ', desc: 'Xem danh sách task, bấm giờ và subtask' },
  { id: 'analytics', label: 'Thống Kê & Báo Cáo', desc: 'Xem dashboard biểu đồ bar & pie chart' },
  { id: 'my_dashboard', label: 'Bàn Làm Việc Idol', desc: 'Không gian cá nhân của Idol: giờ live, KPI, lương, xin nghỉ phép' },
  { id: 'work_assignments', label: 'Giao việc & Công tác', desc: 'Theo dõi timeline, trạng thái và chi tiết công việc được giao' },
  { id: 'admin', label: 'Trung Tâm Quản Trị', desc: 'Hàng đợi phê duyệt, phân quyền tài khoản & hệ thống' }
];

const ACTION_OPTIONS: { id: AppActionPermission; label: string; desc: string }[] = [
  { id: 'manage_idols', label: 'Quản lý Idol', desc: 'Thêm, sửa, xóa hồ sơ idol và upload ảnh đại diện' },
  { id: 'manage_scores', label: 'Chấm điểm & Lưu điểm', desc: 'Nhập điểm trực tiếp và lưu bảng điểm định kỳ' },
  { id: 'manage_criteria', label: 'Quản lý Tiêu chí', desc: 'Thêm mới, sửa trọng số và xóa các tiêu chí chấm điểm' },
  { id: 'manage_schedule', label: 'Thiết lập Lịch làm việc', desc: 'Tạo ca live, xếp lịch tập luyện và ca trực' },
  { id: 'manage_tasks', label: 'Quản lý Nhiệm vụ & Bấm giờ', desc: 'Tạo task, subtask, ghi thời gian thực hiện' },
  { id: 'manage_departments', label: 'Quản lý Đơn vị & Trạng thái', desc: 'Thêm, đổi tên, xóa danh mục đơn vị và trạng thái' },
  { id: 'manage_settings', label: 'Cài đặt Hệ thống', desc: 'Đổi mốc năm tính tuổi, đổi tiêu đề cột, cài đặt tie-breaker' },
  { id: 'manage_approvals', label: 'Phê duyệt Nhân sự', desc: 'Duyệt yêu cầu thêm/xóa nhân sự gửi từ nhân viên cấp dưới' }
];

export const RolePermissionModal: React.FC<RolePermissionModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  departments,
  onSaveUser,
  onDeleteUser
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserAccount>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isImmutableRootAdmin = !isCreating && formData.username === 'admin';

  if (!isOpen) return null;

  const handleStartEdit = (user: UserAccount) => {
    setIsCreating(false);
    setEditingUserId(user.id);
    setFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roleTitle: user.roleTitle,
      role: user.role,
      accountType: user.accountType,
      isSuperAdmin: user.isSuperAdmin,
      allowedTabs: [...(user.allowedTabs || [])],
      allowedDepartments: user.allowedDepartments ? [...user.allowedDepartments] : ['*'],
      allowedActions: user.allowedActions ? [...user.allowedActions] : [],
      password: ''
    });
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingUserId('new');
    setFormData({
      name: '',
      username: '',
      email: '',
      roleTitle: 'Điều Phối Viên Đơn Vị',
      role: 'manager',
      accountType: 'personnel',
      isSuperAdmin: false,
      allowedTabs: ['roster', 'tasks'],
      allowedDepartments: departments.length > 0 ? [departments[0]] : ['*'],
      allowedActions: ['manage_idols', 'manage_tasks'],
      password: '123'
    });
  };

  // Quick preset helper
  const applyPreset = (preset: 'admin' | 'judge' | 'manager' | 'viewer') => {
    if (preset === 'admin') {
      setFormData((prev) => ({
        ...prev,
        roleTitle: 'Giám Đốc Điều Hành (Super Admin)',
        accountType: 'system_admin',
        isSuperAdmin: true,
        role: isCreating ? 'super_admin' : prev.role,
        allowedTabs: ['roster', 'scoring', 'leaderboard', 'schedule', 'tasks', 'analytics', 'admin', 'my_dashboard', 'payroll', 'payroll_disputes', 'kpi', 'revenue', 'finance'],
        allowedDepartments: ['*'],
        allowedActions: [
          'manage_idols',
          'manage_scores',
          'manage_criteria',
          'manage_schedule',
          'manage_tasks',
          'manage_departments',
          'manage_settings',
          'manage_approvals',
          'manage_payroll',
          'adjust_payroll',
          'approve_payroll',
          'hot_bonus',
          'manage_kpi',
          'manage_revenue'
        ]
      }));
    } else if (preset === 'judge') {
      setFormData((prev) => ({
        ...prev,
        role: 'judge',
        roleTitle: 'Huấn Luyện Viên / Trưởng Giám Khảo',
        accountType: 'personnel',
        isSuperAdmin: false,
        allowedTabs: ['scoring', 'leaderboard', 'tasks'],
        allowedDepartments: ['*'],
        allowedActions: ['manage_scores', 'manage_criteria', 'manage_tasks']
      }));
    } else if (preset === 'manager') {
      setFormData((prev) => ({
        ...prev,
        role: 'manager',
        roleTitle: 'Quản Lý Đơn Vị & Idol',
        accountType: 'personnel',
        isSuperAdmin: false,
        allowedTabs: ['roster', 'tasks', 'analytics'],
        allowedDepartments: departments.slice(0, 2),
        allowedActions: ['manage_idols', 'manage_tasks']
      }));
    } else if (preset === 'viewer') {
      setFormData((prev) => ({
        ...prev,
        role: 'viewer',
        roleTitle: 'Quan Sát Viên (Chỉ Xem)',
        accountType: 'personnel',
        isSuperAdmin: false,
        allowedTabs: ['leaderboard', 'analytics'],
        allowedDepartments: ['*'],
        allowedActions: []
      }));
    }
  };

  // Tab permission toggles
  const toggleTabPermission = (tab: AppTabPermission) => {
    const current = formData.allowedTabs || [];
    if (current.includes(tab)) {
      setFormData({
        ...formData,
        allowedTabs: current.filter((t) => t !== tab)
      });
    } else {
      setFormData({
        ...formData,
        allowedTabs: [...current, tab]
      });
    }
  };

  // Department permission toggles
  const isAllDepartments = !formData.allowedDepartments || formData.allowedDepartments.includes('*');

  const setAllDepartments = (all: boolean) => {
    if (all) {
      setFormData({
        ...formData,
        allowedDepartments: ['*']
      });
    } else {
      setFormData({
        ...formData,
        allowedDepartments: departments.slice(0, 1)
      });
    }
  };

  const toggleDepartmentPermission = (dept: string) => {
    let current = formData.allowedDepartments || [];
    if (current.includes('*')) {
      current = [...departments];
    }
    if (current.includes(dept)) {
      const next = current.filter((d) => d !== dept);
      setFormData({
        ...formData,
        allowedDepartments: next.length === 0 ? [] : next
      });
    } else {
      setFormData({
        ...formData,
        allowedDepartments: [...current, dept]
      });
    }
  };

  // Action capability toggles
  const toggleActionPermission = (action: AppActionPermission) => {
    const current = formData.allowedActions || [];
    if (current.includes(action)) {
      setFormData({
        ...formData,
        allowedActions: current.filter((a) => a !== action)
      });
    } else {
      setFormData({
        ...formData,
        allowedActions: [...current, action]
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.username?.trim()) {
      setFormError('Vui lòng điền đầy đủ họ tên, username và email');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      const existingUser = !isCreating && editingUserId
        ? users.find((user) => user.id === editingUserId)
        : undefined;
      const payload = formData.accountType === 'system_admin' && existingUser
        ? {
          ...formData,
          role: existingUser.role,
          roleTitle: existingUser.roleTitle,
          department: existingUser.department
        }
        : formData;
      await onSaveUser(payload);
      setEditingUserId(null);
      setIsCreating(false);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setFormError(null);
      await onDeleteUser(id);
    } catch (err: any) {
      setFormError(err.message || 'Không thể xóa tài khoản');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Phân Quyền Người Dùng & Quản Trị Hệ Thống
              </h3>
              <p className="text-xs text-slate-500">
                Tạo user, gán quyền được xem mục nào, thuộc đơn vị nào và được thực hiện những thao tác gì
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {editingUserId ? (
            /* Edit / Create Form */
            <form onSubmit={handleSave} className="space-y-5 bg-slate-50/90 p-5 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {isCreating ? 'Tạo Tài Khoản Người Dùng Mới' : `Chỉnh Sửa Quyền Hạn: ${formData.name}`}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Thiết lập thông tin đăng nhập, phạm vi đơn vị và quyền hành động
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Mẫu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('admin')}
                    disabled={isImmutableRootAdmin}
                    className="px-2 py-1 text-[10px] font-bold rounded bg-amber-100 text-amber-900 hover:bg-amber-200"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('judge')}
                    disabled={isImmutableRootAdmin}
                    className="px-2 py-1 text-[10px] font-bold rounded bg-sky-100 text-sky-900 hover:bg-sky-200"
                  >
                    Giám Khảo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('manager')}
                    disabled={isImmutableRootAdmin}
                    className="px-2 py-1 text-[10px] font-bold rounded bg-rose-100 text-rose-900 hover:bg-rose-200"
                  >
                    Quản Lý
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('viewer')}
                    disabled={isImmutableRootAdmin}
                    className="px-2 py-1 text-[10px] font-bold rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
                  >
                    Chỉ Xem
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chức danh / Vai trò hiển thị
                  </label>
                  <input
                    type="text"
                    value={formData.roleTitle || ''}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email đăng nhập <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu {isCreating ? '(Mặc định 123)' : '(Để trống nếu giữ nguyên)'}
                  </label>
                  <input
                    type="password"
                    placeholder="VD: 123"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* SECTION 1: TAB PERMISSIONS */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-rose-600" />
                    <span>1. Các mục (Tab) được phép xem & truy cập:</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, allowedTabs: ['roster', 'scoring', 'leaderboard', 'tasks', 'analytics'] })}
                      disabled={isImmutableRootAdmin}
                      className="text-sky-700 hover:underline font-semibold"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, allowedTabs: [] })}
                      disabled={isImmutableRootAdmin}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TAB_OPTIONS.map((tab) => {
                    const isChecked = (formData.allowedTabs || []).includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        onClick={() => toggleTabPermission(tab.id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${isImmutableRootAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${
                          isChecked
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-white border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            disabled={isImmutableRootAdmin}
                            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 block truncate">{tab.label}</span>
                            <span className="text-[10px] text-slate-500 truncate block">{tab.desc}</span>
                          </div>
                        </div>

                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isChecked ? 'MỞ' : 'KHÓA'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: DEPARTMENT SCOPE PERMISSIONS */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>2. Phạm vi xem theo Đơn Vị / Phòng Ban:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAllDepartments(true)}
                      disabled={isImmutableRootAdmin}
                      className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                        isAllDepartments
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Toàn bộ đơn vị ({departments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllDepartments(false)}
                      disabled={isImmutableRootAdmin}
                      className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                        !isAllDepartments
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Chỉ định đơn vị cụ thể
                    </button>
                  </div>
                </div>

                {isAllDepartments ? (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>
                      Tài khoản này được phép xem <strong>tất cả các idol thuộc mọi đơn vị</strong> trong toàn cơ quan / công ty.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] font-semibold text-slate-600 mb-1">
                      Chọn các đơn vị được phép hiển thị cho tài khoản này:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {departments.map((dept) => {
                        const isChecked = (formData.allowedDepartments || []).includes(dept);
                        return (
                          <div
                            key={dept}
                            onClick={() => toggleDepartmentPermission(dept)}
                            className={`p-2 rounded border flex items-center gap-2 transition-colors ${isImmutableRootAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${
                              isChecked
                                ? 'bg-sky-50/80 border-sky-300 text-sky-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              disabled={isImmutableRootAdmin}
                              className="w-3.5 h-3.5 text-sky-600 rounded focus:ring-sky-500 cursor-pointer shrink-0"
                            />
                            <span className="text-xs truncate">{dept}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: ACTION / CAPABILITY PERMISSIONS */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Quyền thao tác & Chức năng (Được làm gì):</span>
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        allowedActions: [
                          'manage_idols',
                          'manage_scores',
                          'manage_criteria',
                          'manage_tasks',
                          'manage_departments',
                          'manage_settings'
                        ]
                      })}
                      disabled={isImmutableRootAdmin}
                      className="text-emerald-700 hover:underline font-semibold"
                    >
                      Cấp tất cả quyền
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, allowedActions: [] })}
                      disabled={isImmutableRootAdmin}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Chỉ cho xem (Không sửa)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACTION_OPTIONS.map((action) => {
                    const isChecked = (formData.allowedActions || []).includes(action.id);
                    return (
                      <div
                        key={action.id}
                        onClick={() => toggleActionPermission(action.id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${isImmutableRootAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${
                          isChecked
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-white border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            disabled={isImmutableRootAdmin}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 block truncate">{action.label}</span>
                            <span className="text-[10px] text-slate-500 truncate block">{action.desc}</span>
                          </div>
                        </div>

                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isChecked ? 'ĐƯỢC PHÉP' : 'CẤM'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUserId(null);
                    setIsCreating(false);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Quay lại danh sách
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu Quyền Hạn Tài Khoản'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* User Accounts List */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Danh Sách Tài Khoản Trong Hệ Thống ({users.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Bấm "Phân quyền" để điều chỉnh mục được xem, đơn vị phụ trách và quyền thao tác
                  </p>
                </div>
                <button
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Tài Khoản Mới</span>
                </button>
              </div>

              <div className="space-y-3">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isAllDepts = !u.allowedDepartments || u.allowedDepartments.includes('*');

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all flex flex-col gap-3 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || DEFAULT_BLANK_AVATAR}
                            alt={u.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                                  Bạn đang đăng nhập
                                </span>
                              )}
                              {u.isSuperAdmin && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {u.roleTitle} · <span className="font-mono text-slate-400">{u.username}</span> ({u.email})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-rose-600" />
                            <span>Phân quyền</span>
                          </button>
                          {u.username !== 'admin' && !u.isSuperAdmin && !isCurrent && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Detail Badges: Tabs, Departments, Actions */}
                      <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                        {/* Allowed Tabs */}
                        <div>
                          <span className="text-slate-400 font-bold block mb-1">Mục được xem:</span>
                          <div className="flex flex-wrap gap-1">
                            {u.allowedTabs?.map((tabId) => {
                              const match = TAB_OPTIONS.find((t) => t.id === tabId);
                              return (
                                <span
                                  key={tabId}
                                  className="font-medium px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                                >
                                  {match?.label || tabId}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Allowed Departments */}
                        <div>
                          <span className="text-slate-400 font-bold block mb-1">Đơn vị được xem:</span>
                          {isAllDepts ? (
                            <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                              Tất cả đơn vị (Toàn công ty)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {u.allowedDepartments?.map((dept) => (
                                <span
                                  key={dept}
                                  className="font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100"
                                >
                                  {dept}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Allowed Actions */}
                        <div>
                          <span className="text-slate-400 font-bold block mb-1">Được phép làm:</span>
                          {(!u.allowedActions || u.allowedActions.length === 0) ? (
                            <span className="text-slate-400 italic">Chỉ xem dữ liệu</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {u.allowedActions?.map((act) => {
                                const match = ACTION_OPTIONS.find((a) => a.id === act);
                                return (
                                  <span
                                    key={act}
                                    className="font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100"
                                  >
                                    {match?.label || act}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="text-[11px] text-slate-500">
            * Chỉ Quản trị viên (Super Admin) mới có quyền truy cập và phân bổ quyền trong bảng điều khiển này.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
