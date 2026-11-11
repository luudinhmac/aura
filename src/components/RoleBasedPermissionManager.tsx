import React, { useState, useMemo } from 'react';
import { confirmDialog, notify } from '../utils/uiFeedback.ts';
import {
  Shield,
  Users,
  UserCheck,
  Building2,
  Sparkles,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  Search,
  Lock,
  Layers,
  AlertCircle,
  CheckCircle2,
  Zap,
  X,
  ChevronRight,
  UserPlus,
  KeyRound,
  LayoutGrid,
  Filter
} from 'lucide-react';
import { UserAccount, Idol, AppTabPermission, AppActionPermission } from '../types/index.ts';
import { ROLE_PRESETS, RolePreset, DEFAULT_BLANK_AVATAR } from '../types/roles.ts';

interface RoleBasedPermissionManagerProps {
  currentUser: UserAccount;
  users: UserAccount[];
  idols: Idol[];
  departments: string[];
  onSaveUser: (userData: Partial<UserAccount>) => Promise<void>;
}

const TAB_OPTIONS: { id: AppTabPermission; label: string; desc: string; icon: string }[] = [
  { id: 'roster', label: 'Danh Sách Nhân Sự', desc: 'Xem danh bạ nghệ sĩ & cán bộ', icon: '👥' },
  { id: 'my_dashboard', label: 'Dashboard Idol', desc: 'Bàn làm việc cá nhân của Idol', icon: '🌟' },
  { id: 'scoring', label: 'Bảng Điểm', desc: 'Chấm điểm và đánh giá nghệ sĩ', icon: '⭐' },
  { id: 'leaderboard', label: 'Xếp Hạng', desc: 'Bảng xếp hạng nghệ sĩ toàn công ty', icon: '🏆' },
  { id: 'schedule', label: 'Lịch Làm Việc & Ca Trực', desc: 'Xem & điều phối ca làm việc', icon: '📅' },
  { id: 'tasks', label: 'Nhiệm Vụ', desc: 'Quản lý công việc và chỉ tiêu', icon: '📋' },
  { id: 'payroll', label: 'Bảng Lương', desc: 'Quản lý bảng tính lương & phiếu lương', icon: '💵' },
  { id: 'kpi', label: 'Chỉ Số KPI', desc: 'Thiết lập & theo dõi chỉ số hiệu suất', icon: '🎯' },
  { id: 'analytics', label: 'Thống Kê', desc: 'Báo cáo chỉ số toàn diện', icon: '📊' },
  { id: 'admin', label: 'Trang Quản Trị', desc: 'Cấu hình hệ thống & phân quyền user', icon: '⚙️' }
];

const ACTION_OPTIONS: { id: AppActionPermission; label: string; desc: string }[] = [
  { id: 'manage_idols', label: 'Quản Lý Nhân Sự', desc: 'Thêm mới, chỉnh sửa và xóa hồ sơ Idol/Cán bộ' },
  { id: 'manage_scores', label: 'Chấm Điểm Nghệ Sĩ', desc: 'Nhập điểm và lưu phiếu đánh giá' },
  { id: 'manage_criteria', label: 'Quản Lý Tiêu Chí', desc: 'Tạo và cập nhật thang điểm đánh giá' },
  { id: 'manage_schedule', label: 'Điều Phối Ca Live & Lịch', desc: 'Xếp phòng stream, duyệt ca trực' },
  { id: 'manage_tasks', label: 'Quản Lý Nhiệm Vụ', desc: 'Giao task, bấm giờ và duyệt hoàn thành' },
  { id: 'manage_departments', label: 'Quản Lý Đơn Vị & Khối', desc: 'Cơ cấu tổ chức phòng ban và trạng thái' },
  { id: 'manage_settings', label: 'Cấu Hình Hệ Thống', desc: 'Cài đặt thương hiệu và quy tắc hệ thống' },
  { id: 'manage_approvals', label: 'Phê Duyệt Yêu Cầu', desc: 'Duyệt đề xuất nhân sự và đơn xin nghỉ phép' },
  { id: 'manage_payroll', label: 'Quản Trị Bảng Lương', desc: 'Tính lương, chốt kỳ và ban hành phiếu lương' },
  { id: 'approve_payroll', label: 'Phê Duyệt Bảng Lương', desc: 'Ký duyệt bảng lương chuyển khoản' },
  { id: 'hot_bonus', label: 'Thưởng Nóng Nghệ Sĩ', desc: 'Cấp thưởng nóng cho Idol xuất sắc' },
  { id: 'manage_kpi', label: 'Quản Lý Chỉ Số KPI', desc: 'Thiết lập chỉ tiêu doanh số và ca live' }
];

export const RoleBasedPermissionManager: React.FC<RoleBasedPermissionManagerProps> = ({
  currentUser,
  users,
  idols,
  departments,
  onSaveUser
}) => {
  // Active Role State
  const [selectedRoleId, setSelectedRoleId] = useState<string>(ROLE_PRESETS[0]?.id || 'director');
  const [roleSearch, setRoleSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable Role Permissions (Customizable per role)
  const [customRolePermissions, setCustomRolePermissions] = useState<Record<string, {
    tabs: AppTabPermission[];
    actions: AppActionPermission[];
    departments: string[];
  }>>(() => {
    const map: Record<string, { tabs: AppTabPermission[]; actions: AppActionPermission[]; departments: string[] }> = {};
    ROLE_PRESETS.forEach(p => {
      map[p.id] = {
        tabs: [...p.defaultTabs],
        actions: [...p.defaultActions],
        departments: [...p.defaultDepartments]
      };
    });
    return map;
  });

  // Modals for Assigning
  const [isDeptAssignModalOpen, setIsDeptAssignModalOpen] = useState(false);
  const [isBulkUserModalOpen, setIsBulkUserModalOpen] = useState(false);
  const [selectedDeptToAssign, setSelectedDeptToAssign] = useState<string>('');
  const [selectedUserIdsToAssign, setSelectedUserIdsToAssign] = useState<string[]>([]);
  const [userModalSearch, setUserModalSearch] = useState('');
  const [userModalFilter, setUserModalFilter] = useState<'all' | 'staff' | 'idols'>('all');

  const selectedRole = useMemo(() => {
    return ROLE_PRESETS.find(p => p.id === selectedRoleId) || ROLE_PRESETS[0];
  }, [selectedRoleId]);

  const activePermissions = useMemo(() => {
    return customRolePermissions[selectedRole.id] || {
      tabs: selectedRole.defaultTabs,
      actions: selectedRole.defaultActions,
      departments: selectedRole.defaultDepartments
    };
  }, [customRolePermissions, selectedRole]);
  const isSystemAdminRole = selectedRole.id === 'system_admin';

  // Helper: map which role each user currently belongs to
  // Matches either by roleTitle, role, or department preset logic
  const isBusinessAssignableUser = (_user: UserAccount) => true;
  const isAssignableToRole = (_user: UserAccount, _role: RolePreset) => true;

  const isUserInRole = (user: UserAccount, role: RolePreset) => {
    if (!isAssignableToRole(user, role)) return false;
    // System Admin is an account authority, independent of the person's
    // business title. Keep the linked personnel visible in the admin role.
    if (role.id === 'system_admin') {
      return user.accountType === 'system_admin' || user.isSuperAdmin === true || user.roleCodes?.includes('system_admin') === true;
    }
    if (user.roleCodes && user.roleCodes.length > 0) return user.roleCodes.includes(role.id);
    if (role.id === 'director') {
      return !!(user.role === 'super_admin' || user.roleTitle?.toLowerCase().includes('giám đốc'));
    }
    if (user.roleTitle && role.roleTitle && user.roleTitle.trim().toLowerCase() === role.roleTitle.trim().toLowerCase()) {
      return true;
    }
    if (role.department && user.department && user.department.trim().toLowerCase() === role.department.trim().toLowerCase()) {
      // If it's a manager role or staff role matching department
      if (role.role === 'manager' && (user.role === 'manager' || user.roleTitle?.toLowerCase().includes('trưởng'))) {
        return true;
      }
      if (role.role === 'custom' && user.department === role.department) {
        return true;
      }
      if (role.role === 'viewer' && user.department === role.department) {
        return true;
      }
    }
    return false;
  };

  // Assigned members for current selected role
  const assignedUsers = useMemo(() => {
    return users.filter(u => isUserInRole(u, selectedRole));
  }, [users, selectedRole]);

  // Filtered assigned members by search query
  const filteredAssignedUsers = useMemo(() => {
    const term = memberSearch.toLowerCase().trim();
    if (!term) return assignedUsers;
    return assignedUsers.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.roleTitle && u.roleTitle.toLowerCase().includes(term))
    );
  }, [assignedUsers, memberSearch]);

  // Filtered Role presets
  const filteredRoles = useMemo(() => {
    const term = roleSearch.toLowerCase().trim();
    if (!term) return ROLE_PRESETS;
    return ROLE_PRESETS.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.roleTitle.toLowerCase().includes(term) ||
      p.department.toLowerCase().includes(term)
    );
  }, [roleSearch]);

  // Count members per role
  const roleMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ROLE_PRESETS.forEach(r => {
      counts[r.id] = users.filter(u => isUserInRole(u, r)).length;
    });
    return counts;
  }, [users]);

  // Show Toast
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle Tab in current role
  const toggleTab = (tabId: AppTabPermission) => {
    if (isSystemAdminRole) return;
    const cur = activePermissions.tabs;
    const next = cur.includes(tabId) ? cur.filter(t => t !== tabId) : [...cur, tabId];
    setCustomRolePermissions(prev => ({
      ...prev,
      [selectedRole.id]: {
        ...activePermissions,
        tabs: next
      }
    }));
  };

  // Toggle Action in current role
  const toggleAction = (actId: AppActionPermission) => {
    if (isSystemAdminRole) return;
    const cur = activePermissions.actions;
    const next = cur.includes(actId) ? cur.filter(a => a !== actId) : [...cur, actId];
    setCustomRolePermissions(prev => ({
      ...prev,
      [selectedRole.id]: {
        ...activePermissions,
        actions: next
      }
    }));
  };

  // Toggle Department Scope
  const toggleDepartmentScope = (dept: string) => {
    if (isSystemAdminRole) return;
    if (dept === '*') {
      const isAll = activePermissions.departments.includes('*');
      setCustomRolePermissions(prev => ({
        ...prev,
        [selectedRole.id]: {
          ...activePermissions,
          departments: isAll ? [departments[0] || 'Ban Giám Đốc'] : ['*']
        }
      }));
      return;
    }

    const cur = activePermissions.departments.filter(d => d !== '*');
    const next = cur.includes(dept) ? cur.filter(d => d !== dept) : [...cur, dept];
    setCustomRolePermissions(prev => ({
      ...prev,
      [selectedRole.id]: {
        ...activePermissions,
        departments: next.length === 0 ? ['*'] : next
      }
    }));
  };

  // Save Role Permissions and Sync to all members
  const handleSaveAndSyncRolePermissions = async () => {
    try {
      if (isSystemAdminRole) {
        showToast('success', 'Quyền System Admin là quyền hệ thống cố định và không thể chỉnh sửa tại đây.');
        return;
      }
      if (selectedRole.isSuperAdmin && !await confirmDialog('Bạn sắp cấp toàn quyền System Admin. Bạn có chắc chắn muốn tiếp tục?', 'Cảnh báo cấp quyền cao')) return;
      setSavingBatch(true);
      const membersToUpdate = assignedUsers;
      if (membersToUpdate.length === 0) {
        showToast('success', `Đã lưu bộ quyền cho vai trò "${selectedRole.name}". Chưa có nhân sự nào để đồng bộ.`);
        return;
      }

      // Update every member assigned to this role
      await Promise.all(
        membersToUpdate.map(u => {
          return onSaveUser({
            ...u,
            allowedTabs: [...activePermissions.tabs],
            allowedActions: [...activePermissions.actions],
            allowedDepartments: [...activePermissions.departments],
            roleCodes: [...new Set([...(u.roleCodes || []), selectedRole.id])],
            isBusinessAdmin: selectedRole.isSuperAdmin ? false : u.isBusinessAdmin,
            isSuperAdmin: selectedRole.isSuperAdmin || u.isSuperAdmin,
            accountType: selectedRole.isSuperAdmin ? 'system_admin' : u.accountType
          });
        })
      );

      showToast(
        'success',
        `Đã lưu & đồng bộ tức thì bộ quyền mới cho toàn bộ ${membersToUpdate.length} nhân sự thuộc vai trò "${selectedRole.name}"!`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi đồng bộ quyền nhân sự');
    } finally {
      setSavingBatch(false);
    }
  };

  // Assign entire department to this role
  const handleAssignEntireDepartment = async () => {
    if (!selectedDeptToAssign) {
      notify('Vui lòng chọn một phòng ban', 'warning');
      return;
    }

    try {
      if (selectedRole.isSuperAdmin && !await confirmDialog('Bạn sắp cấp System Admin cho toàn bộ phòng ban. Bạn có chắc chắn muốn tiếp tục?', 'Cảnh báo cấp quyền cao')) return;
      setSavingBatch(true);
      const targetUsers = users.filter(
        u => isAssignableToRole(u, selectedRole) && u.department && u.department.trim().toLowerCase() === selectedDeptToAssign.trim().toLowerCase()
      );

      if (targetUsers.length === 0) {
        notify(`Không tìm thấy nhân sự nào thuộc phòng ban "${selectedDeptToAssign}".`, 'warning');
        return;
      }

      await Promise.all(
        targetUsers.map(u => {
          return onSaveUser({
            ...u,
            ...(selectedRole.isSuperAdmin ? {} : {
              roleTitle: selectedRole.roleTitle,
              department: selectedRole.department || u.department,
              role: selectedRole.role
            }),
            roleCodes: [...new Set([...(u.roleCodes || []), selectedRole.id])],
            isBusinessAdmin: selectedRole.isSuperAdmin ? false : u.isBusinessAdmin,
            isSuperAdmin: selectedRole.isSuperAdmin || u.isSuperAdmin,
            accountType: selectedRole.isSuperAdmin ? 'system_admin' : u.accountType,
            allowedTabs: [...activePermissions.tabs],
            allowedActions: [...activePermissions.actions],
            allowedDepartments: [...activePermissions.departments]
          });
        })
      );

      setIsDeptAssignModalOpen(false);
      setSelectedDeptToAssign('');
      showToast(
        'success',
        `Đã gán thành công toàn bộ ${targetUsers.length} nhân sự phòng "${selectedDeptToAssign}" vào vai trò "${selectedRole.name}"!`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi gán phòng ban');
    } finally {
      setSavingBatch(false);
    }
  };

  // Assign selected bulk users to this role
  const handleAssignBulkUsers = async () => {
    if (selectedUserIdsToAssign.length === 0) {
      notify('Vui lòng chọn ít nhất 1 nhân sự', 'warning');
      return;
    }

    try {
      if (selectedRole.isSuperAdmin && !await confirmDialog('Bạn sắp cấp System Admin cho nhiều tài khoản. Bạn có chắc chắn muốn tiếp tục?', 'Cảnh báo cấp quyền cao')) return;
      setSavingBatch(true);
      const targetUsers = users.filter(u => isAssignableToRole(u, selectedRole) && selectedUserIdsToAssign.includes(u.id));

      await Promise.all(
        targetUsers.map(u => {
          return onSaveUser({
            ...u,
            ...(selectedRole.isSuperAdmin ? {} : {
              roleTitle: selectedRole.roleTitle,
              department: selectedRole.department || u.department,
              role: selectedRole.role
            }),
            roleCodes: [...new Set([...(u.roleCodes || []), selectedRole.id])],
            isBusinessAdmin: selectedRole.isSuperAdmin ? false : u.isBusinessAdmin,
            isSuperAdmin: selectedRole.isSuperAdmin || u.isSuperAdmin,
            accountType: selectedRole.isSuperAdmin ? 'system_admin' : u.accountType,
            allowedTabs: [...activePermissions.tabs],
            allowedActions: [...activePermissions.actions],
            allowedDepartments: [...activePermissions.departments]
          });
        })
      );

      setIsBulkUserModalOpen(false);
      setSelectedUserIdsToAssign([]);
      showToast(
        'success',
        `Đã gán thành công ${targetUsers.length} nhân sự vào vai trò "${selectedRole.name}"!`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi gán nhân sự');
    } finally {
      setSavingBatch(false);
    }
  };

  // Remove a single user from this role
  const handleRemoveUserFromRole = async (user: UserAccount) => {
    if (user.username === 'admin') {
      notify('Tài khoản Super Admin gốc (admin) không được gỡ bỏ để đảm bảo an toàn hệ thống.', 'warning');
      return;
    }

    if (!await confirmDialog(`Bạn có chắc muốn gỡ vai trò "${selectedRole.name}" khỏi tài khoản "${user.name}"?`, 'Gỡ vai trò')) {
      return;
    }

    try {
      // Revoke the selected role; keep the person's business role when
      // removing system_admin access from a personnel account.
      const nextRoleCodes = (user.roleCodes || []).filter((code) => code !== selectedRole.id);
      const keepsSystemAdmin = nextRoleCodes.includes('system_admin');
      await onSaveUser({
        ...user,
        roleCodes: nextRoleCodes,
        accountType: keepsSystemAdmin ? 'system_admin' : 'personnel',
        isSuperAdmin: keepsSystemAdmin,
        isBusinessAdmin: keepsSystemAdmin ? false : user.isBusinessAdmin,
      });

      showToast('success', `Đã gỡ vai trò của "${user.name}".`);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi gỡ vai trò');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-bold animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main 2-Column RBAC Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Role Presets List (4/12 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Danh Sách Vai Trò Chuẩn
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {ROLE_PRESETS.length} chức danh theo phòng ban
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                RBAC
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                placeholder="Tìm vai trò hoặc phòng ban..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 text-slate-800"
              />
            </div>
          </div>

          {/* Role List */}
          <div className="p-2 space-y-1 max-h-[640px] overflow-y-auto">
            {filteredRoles.map(role => {
              const isSelected = role.id === selectedRole.id;
              const memberCount = roleMemberCounts[role.id] || 0;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50/90 border border-rose-300 ring-2 ring-rose-100 shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${isSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                        {role.name}
                      </span>
                      {role.isSuperAdmin && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          System Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-medium flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{role.department}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        memberCount > 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {memberCount} người
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-rose-600 translate-x-0.5' : 'text-slate-300'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Role Details, Permissions Matrix & Assigned Members (8/12 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Role Header Banner */}
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                  Phòng Ban: {selectedRole.department}
                </span>
                {selectedRole.isSuperAdmin && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-xs dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/40">
                    👑 Quản Trị Tối Cao
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{selectedRole.name}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                {selectedRole.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveAndSyncRolePermissions}
              disabled={savingBatch || isSystemAdminRole}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 active:scale-95 font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4 text-white" />
              <span>{isSystemAdminRole ? 'Quyền hệ thống cố định' : (savingBatch ? 'Đang đồng bộ...' : 'Lưu & Đồng Bộ Quyền')}</span>
            </button>
          </div>

          {/* Section 1: Standard Permissions Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>1. Bộ Quyền Chuẩn Của Vai Trò Này</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tất cả nhân sự được gán vào vai trò này sẽ tự động nhận các quyền được tick bên dưới
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {activePermissions.tabs.length} Tab · {activePermissions.actions.length} Quyền
              </span>
            </div>

            {/* Sub-section: Navigation Tabs */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Mục Được Phép Xem & Truy Cập (Navigation Tabs)</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {activePermissions.tabs.length}/{TAB_OPTIONS.length} mục
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {TAB_OPTIONS.map(tab => {
                  const checked = activePermissions.tabs.includes(tab.id);
                  return (
                    <label
                      key={tab.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${isSystemAdminRole ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${
                        checked
                          ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-semibold shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTab(tab.id)}
                        disabled={isSystemAdminRole}
                        className="accent-rose-600 rounded mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span>{tab.icon}</span>
                          <span className="truncate">{tab.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {tab.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sub-section: Action Permissions */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Hành Động Thao Tác Được Phép (Action Permissions)</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {activePermissions.actions.length}/{ACTION_OPTIONS.length} quyền
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTION_OPTIONS.map(act => {
                  const checked = activePermissions.actions.includes(act.id);
                  return (
                    <label
                      key={act.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${isSystemAdminRole ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${
                        checked
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAction(act.id)}
                        disabled={isSystemAdminRole}
                        className="accent-indigo-600 rounded mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{act.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {act.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sub-section: Department Scope */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Phạm Vi Đơn Vị Được Phép Xem (Department Access Control)</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleDepartmentScope('*')}
                  disabled={isSystemAdminRole}
                  className="text-xs font-bold text-sky-700 hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activePermissions.departments.includes('*')
                    ? 'Chuyển sang chỉ định đơn vị'
                    : 'Cho phép xem tất cả (*)'}
                </button>
              </div>

              {activePermissions.departments.includes('*') ? (
                <div className="p-3 bg-sky-50 text-sky-800 rounded-xl border border-sky-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Vai trò này được phép xem và làm việc với nhân sự của <strong>TẤT CẢ các phòng ban & nhóm Idol</strong> trong công ty.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {departments.map(dept => {
                    const checked = activePermissions.departments.includes(dept);
                    return (
                      <label
                        key={dept}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${isSystemAdminRole ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${
                          checked
                            ? 'bg-sky-50 border-sky-300 text-sky-900 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDepartmentScope(dept)}
                          disabled={isSystemAdminRole}
                          className="accent-sky-600 rounded"
                        />
                        <span className="truncate">{dept}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Assigned Personnel List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span>2. Nhân Sự Đang Được Gán Vai Trò Này ({assignedUsers.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thêm bớt nhân viên hoặc gán cả phòng ban vào vai trò này
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-Click Department Assign */}
                <button
                  type="button"
                  onClick={() => setIsDeptAssignModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Gán toàn bộ nhân viên thuộc một phòng ban vào vai trò này chỉ với 1 click"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ Gán Cả Phòng Ban</span>
                </button>

                {/* Bulk Select Users */}
                <button
                  type="button"
                  onClick={() => setIsBulkUserModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Chọn Thêm Nhân Sự</span>
                </button>
              </div>
            </div>

            {/* Filter Search for Members */}
            {assignedUsers.length > 5 && (
              <div className="relative max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Lọc nhân sự trong vai trò này..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Members List Table / Cards */}
            {assignedUsers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">Chưa có nhân sự nào giữ vai trò này</div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Sử dụng nút <strong>"⚡ Gán Cả Phòng Ban"</strong> hoặc <strong>"+ Chọn Thêm Nhân Sự"</strong> ở góc phải trên để gán nhân sự nhanh chóng.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {filteredAssignedUsers.map(u => (
                  <div
                    key={u.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          u.avatarUrl ||
                          DEFAULT_BLANK_AVATAR
                        }
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">{u.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                          {(u.isSuperAdmin || u.accountType === 'system_admin') && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              System Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate font-medium flex items-center gap-1 mt-0.5">
                          <span>{u.roleTitle || selectedRole.roleTitle}</span>
                          <span>·</span>
                          <span className="text-slate-400">{u.department || selectedRole.department}</span>
                          <span>·</span>
                          <span className="text-slate-400 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveUserFromRole(u)}
                      disabled={u.username === 'admin'}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        u.username === 'admin'
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
                      title={u.username === 'admin' ? 'Tài khoản System Admin gốc không thể gỡ' : 'Gỡ nhân sự này khỏi vai trò'}
                      aria-label={u.username === 'admin' ? 'Tài khoản System Admin gốc không thể gỡ' : 'Gỡ nhân sự này khỏi vai trò'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: GÁN TOÀN BỘ PHÒNG BAN VÀO VAI TRÒ NÀY (1-CLICK) */}
      {isDeptAssignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Gán Toàn Bộ Phòng Ban</h4>
                  <p className="text-[11px] text-slate-500">
                    Vào vai trò: <strong className="text-rose-600">{selectedRole.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Chọn một phòng ban bên dưới. Toàn bộ nhân sự trực thuộc phòng ban đó sẽ được <strong>tự động đồng bộ quyền và gán chức danh</strong> theo vai trò này:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn phòng ban / Nhóm Idol:
                </label>
                <select
                  value={selectedDeptToAssign}
                  onChange={e => setSelectedDeptToAssign(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-rose-500 cursor-pointer shadow-2xs"
                >
                  <option value="">-- Chọn phòng ban cần gán --</option>
                  {departments.map(d => {
                    const count = users.filter(u => isBusinessAssignableUser(u) && u.department === d).length;
                    return (
                      <option key={d} value={d}>
                        {d} ({count} nhân sự)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedDeptToAssign && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>
                      Đã phát hiện {users.filter(u => isBusinessAssignableUser(u) && u.department === selectedDeptToAssign).length} nhân sự
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Khi xác nhận, tất cả nhân sự thuộc phòng "{selectedDeptToAssign}" sẽ được cập nhật bộ quyền của vai trò "{selectedRole.name}".
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeptAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAssignEntireDepartment}
                disabled={!selectedDeptToAssign || savingBatch}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingBatch ? 'Đang gán...' : 'Xác Nhận Gán Toàn Phòng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHỌN & GÁN HÀNG LOẠT NHÂN SỰ VÀO VAI TRÒ (MULTI-SELECT) */}
      {isBulkUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Chọn Nhân Sự Gán Vào Vai Trò: {selectedRole.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tick chọn một hoặc nhiều nhân sự để gán đồng loạt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-2.5 shrink-0 bg-white">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userModalSearch}
                  onChange={e => setUserModalSearch(e.target.value)}
                  placeholder="Tìm theo tên, username, email..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <select
                value={userModalFilter}
                onChange={e => setUserModalFilter(e.target.value as any)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium cursor-pointer"
              >
                <option value="all">Tất cả nhân sự</option>
                <option value="staff">Chỉ Cán bộ / Quản lý</option>
                <option value="idols">Chỉ Idol nghệ sĩ</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const filtered = users.filter(u => {
                    if (!isBusinessAssignableUser(u)) return false;
                    const matchSearch =
                      !userModalSearch ||
                      u.name.toLowerCase().includes(userModalSearch.toLowerCase()) ||
                      u.username.toLowerCase().includes(userModalSearch.toLowerCase());
                    const isStaff = !u.idolId;
                    const matchType =
                      userModalFilter === 'all' ||
                      (userModalFilter === 'staff' && isStaff) ||
                      (userModalFilter === 'idols' && !isStaff);
                    return matchSearch && matchType;
                  });
                  const allIds = filtered.map(u => u.id);
                  if (selectedUserIdsToAssign.length === allIds.length) {
                    setSelectedUserIdsToAssign([]);
                  } else {
                    setSelectedUserIdsToAssign(allIds);
                  }
                }}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
              >
                {selectedUserIdsToAssign.length > 0 ? 'Bỏ chọn hết' : 'Chọn tất cả'}
              </button>
            </div>

            {/* Modal Body: User List */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100">
              {users
                .filter(u => {
                  if (!isBusinessAssignableUser(u)) return false;
                  const matchSearch =
                    !userModalSearch ||
                    u.name.toLowerCase().includes(userModalSearch.toLowerCase()) ||
                    u.username.toLowerCase().includes(userModalSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(userModalSearch.toLowerCase());
                  const isStaff = !u.idolId;
                  const matchType =
                    userModalFilter === 'all' ||
                    (userModalFilter === 'staff' && isStaff) ||
                    (userModalFilter === 'idols' && !isStaff);
                  return matchSearch && matchType;
                })
                .map(u => {
                  const isAlreadyAssigned = isUserInRole(u, selectedRole);
                  const isChecked = selectedUserIdsToAssign.includes(u.id);

                  return (
                    <label
                      key={u.id}
                      className={`p-2.5 flex items-center justify-between rounded-xl cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-rose-50/70'
                          : isAlreadyAssigned
                          ? 'bg-emerald-50/40 opacity-70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedUserIdsToAssign(prev => [...prev, u.id]);
                            } else {
                              setSelectedUserIdsToAssign(prev => prev.filter(id => id !== u.id));
                            }
                          }}
                          className="accent-rose-600 rounded"
                        />
                        <img
                          src={
                            u.avatarUrl ||
                            DEFAULT_BLANK_AVATAR
                          }
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">{u.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                            {isAlreadyAssigned && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                Đang có vai trò này
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate font-medium">
                            {u.roleTitle} · {u.department || 'Chưa gán'}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
              <span className="text-xs font-semibold text-slate-600">
                Đã chọn: <strong className="text-rose-600">{selectedUserIdsToAssign.length}</strong> nhân sự
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAssignBulkUsers}
                  disabled={selectedUserIdsToAssign.length === 0 || savingBatch}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingBatch ? 'Đang gán...' : `Gán Vào Vai Trò (${selectedUserIdsToAssign.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
