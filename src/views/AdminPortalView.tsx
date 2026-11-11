import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { confirmDialog, notify } from '../utils/uiFeedback.ts';
import {
  Shield,
  Users,
  Building2,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  Settings,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Info,
  Calendar,
  Layers,
  Sparkles,
  UserCheck,
  UserX,
  FileCheck,
  FileX,
  Save,
  Check,
  Loader2,
  Palette,
  Globe,
  Building,
  ShieldAlert,
  Lock,
  CalendarCheck2,
  CalendarX2,
  CalendarClock,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  FolderTree,
  User,
  Briefcase,
  Award,
  Crown,
  ArrowRight,
  CornerDownRight,
  RefreshCw,
  RotateCcw,
  KeyRound
} from 'lucide-react';
import { getTodayIsoDate, formatDateVN, calculateTenure, calculateAnnualLeaveQuota } from '../utils/dateUtils.ts';
import { DateInput } from '../components/DateInput.tsx';
import {
  UserAccount,
  ApprovalRequest,
  Criterion,
  Idol,
  IdolScoreRecord,
  AppSettings,
  AppSettingsUpdate,
  ColumnHeadersConfig,
  PersonnelColumn,
  PersonnelColumnType,
  ScoreCalculationMode,
  AppTabPermission,
  AppActionPermission,
  ROLE_PRESETS,
  RolePreset,
  LeaveRequest
} from '../types/index.ts';
import {
  MAIN_DEPARTMENTS,
  DEFAULT_DEPARTMENT_PARENT_MAP,
  isStaffDepartment,
  isIdolDepartment,
  DEFAULT_BLANK_AVATAR
} from '../types/roles.ts';
import { RoleBasedPermissionManager } from '../components/RoleBasedPermissionManager.tsx';
import { api } from '../services/api.ts';
import { canAccessAdminSubTab, type AdminSubTab } from '../utils/adminAccess.ts';

function canApproveDirectorLeave(user: UserAccount): boolean {
  if (user.isSuperAdmin) return true;
  const roleTitle = user.roleTitle?.toLowerCase() || '';
  const department = user.department?.toLowerCase() || '';
  return user.role === 'director' || roleTitle.includes('giám đốc') || department.includes('ban giám đốc');
}

type AdminTab = AdminSubTab;

interface AdminPortalViewProps {
  currentUser: UserAccount;
  users: UserAccount[];
  approvals: ApprovalRequest[];
  leaveRequests?: LeaveRequest[];
  departments: string[];
  personnelTypes: string[];
  statuses: string[];
  criteria: Criterion[];
  idols: Idol[];
  scores: IdolScoreRecord[];
  settings: AppSettings;
  columnHeaders: ColumnHeadersConfig;
  onApproveRequest: (id: string, note?: string) => Promise<void>;
  onRejectRequest: (id: string, reason?: string) => Promise<void>;
  onDeleteApproval: (id: string) => Promise<void>;
  onApproveLeaveRequest?: (id: string, note?: string) => Promise<void>;
  onRejectLeaveRequest?: (id: string, note?: string) => Promise<void>;
  onDeleteLeaveRequest?: (id: string) => Promise<void>;
  onSaveUser: (userData: Partial<UserAccount>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onAddDepartment: (name: string) => Promise<void>;
  onUpdateDepartment: (oldName: string, newName: string) => Promise<void>;
  onDeleteDepartment: (name: string) => Promise<void>;
  onAddPersonnelType: (name: string) => Promise<void>;
  onUpdatePersonnelType: (oldName: string, newName: string) => Promise<void>;
  onDeletePersonnelType: (name: string) => Promise<void>;
  onAddStatus: (name: string) => Promise<void>;
  onUpdateStatus: (oldName: string, newName: string) => Promise<void>;
  onDeleteStatus: (name: string) => Promise<void>;
  onCreateCriterion: (crit: Partial<Criterion>) => Promise<void>;
  onUpdateCriterion: (id: string, crit: Partial<Criterion>) => Promise<void>;
  onDeleteCriterion: (id: string) => Promise<void>;
  onUpdatePriorityOrder: (criterionIds: string[]) => Promise<void>;
  onUpdateSettings: (settings: AppSettingsUpdate) => Promise<void>;
  onSaveColumnHeaders: (headers: ColumnHeadersConfig) => Promise<void>;
  onSyncUsers?: () => Promise<void>;
  onResetData?: () => void;
}

const TAB_OPTIONS: { id: AppTabPermission; label: string }[] = [
  { id: 'roster', label: 'Danh Sách Nhân Sự' },
  { id: 'my_dashboard', label: 'Dashboard Idol (Cá Nhân)' },
  { id: 'scoring', label: 'Bảng Điểm' },
  { id: 'leaderboard', label: 'Xếp Hạng' },
  { id: 'schedule', label: 'Lịch Làm Việc & Ca Trực' },
  { id: 'tasks', label: 'Nhiệm Vụ' },
  { id: 'payroll', label: 'Bảng Lương' },
  { id: 'analytics', label: 'Thống Kê' },
  { id: 'admin', label: 'Trang Quản Trị' }
];

const ACTION_OPTIONS: { id: AppActionPermission; label: string }[] = [
  { id: 'manage_idols', label: 'Quản lý Nhân Sự (Thêm/Sửa/Xóa Idol)' },
  { id: 'manage_scores', label: 'Chấm Điểm & Lưu Điểm' },
  { id: 'manage_criteria', label: 'Quản lý Tiêu Chí Chấm Điểm' },
  { id: 'manage_schedule', label: 'Thiết Lập Lịch Làm Việc & Ca Live' },
  { id: 'manage_tasks', label: 'Quản lý Nhiệm Vụ & Bấm Giờ' },
  { id: 'manage_departments', label: 'Quản lý Đơn Vị & Trạng Thái' },
  { id: 'manage_settings', label: 'Cấu Hình Hệ Thống' },
  { id: 'manage_approvals', label: 'Phê Duyệt Yêu Cầu Nhân Sự' }
];

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  currentUser,
  users,
  approvals,
  leaveRequests = [],
  departments,
  personnelTypes,
  statuses,
  criteria,
  idols,
  settings,
  columnHeaders,
  onApproveRequest,
  onRejectRequest,
  onDeleteApproval,
  onApproveLeaveRequest,
  onRejectLeaveRequest,
  onDeleteLeaveRequest,
  onSaveUser,
  onDeleteUser,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onAddPersonnelType,
  onUpdatePersonnelType,
  onDeletePersonnelType,
  onAddStatus,
  onUpdateStatus,
  onDeleteStatus,
  onCreateCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
  onUpdatePriorityOrder,
  onUpdateSettings,
  onSaveColumnHeaders,
  onSyncUsers,
  onResetData
}) => {
  const canManageLeaveApprovals = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_approvals');
  const [activeSubTab, setActiveSubTab] = useState<AdminTab>(() => {
    try {
      const saved = localStorage.getItem('aura_admin_subtab') as AdminTab;
      if (saved && canAccessAdminSubTab(currentUser, saved)) return saved;
    } catch {
      // fallback
    }
    return canManageLeaveApprovals ? 'leave_management' : 'approvals';
  });

  const effectiveSubTab = canAccessAdminSubTab(currentUser, activeSubTab)
    ? activeSubTab
    : canManageLeaveApprovals
      ? 'leave_management'
      : 'approvals';

  useEffect(() => {
    if (activeSubTab !== effectiveSubTab) setActiveSubTab(effectiveSubTab);
    try {
      localStorage.setItem('aura_admin_subtab', effectiveSubTab);
    } catch {
      // ignore
    }
  }, [activeSubTab, effectiveSubTab]);

  // Search queries for each section
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userCategoryFilter, setUserCategoryFilter] = useState<'all' | 'staff' | 'idols'>('all');
  const [userPermissionViewMode, setUserPermissionViewMode] = useState<'rbac' | 'user_list'>('rbac');
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deptSearch, setDeptSearch] = useState('');
  const [personnelTypeSearch, setPersonnelTypeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [critSearch, setCritSearch] = useState('');

  // In-app Approval Modal & Toast Feedback
  const [processingApprId, setProcessingApprId] = useState<string | null>(null);
  const [selectedApprDetail, setSelectedApprDetail] = useState<ApprovalRequest | null>(null);
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    request: ApprovalRequest;
    mode: 'approve' | 'reject';
    note: string;
  } | null>(null);
  const [approvalToast, setApprovalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // In-app Leave Management State
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

  // User form modal / state
  const [editingUser, setEditingUser] = useState<Partial<UserAccount> | null>(null);
  const [userFormPassword, setUserFormPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Department inline form & hierarchy state
  const [newDeptName, setNewDeptName] = useState('');
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [newDeptParent, setNewDeptParent] = useState<string>('Phòng Quản Lý & Phát Triển Idol');
  const [editingDept, setEditingDept] = useState<{ oldName: string; newName: string } | null>(null);
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<string | null>(null);
  const [deptPersonnelSearch, setDeptPersonnelSearch] = useState<string>('');
  const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({});

  // Personnel Type inline form
  const [newPersonnelTypeName, setNewPersonnelTypeName] = useState('');
  const [editingPersonnelType, setEditingPersonnelType] = useState<{ oldName: string; newName: string } | null>(null);

  // Status inline form
  const [newStatusName, setNewStatusName] = useState('');
  const [editingStatus, setEditingStatus] = useState<{ oldName: string; newName: string } | null>(null);

  // Criteria modal / state
  // Criteria modal / state
  const [editingCrit, setEditingCrit] = useState<Partial<Criterion> | null>(null);
  const [isNewCrit, setIsNewCrit] = useState(false);
  const [critToDelete, setCritToDelete] = useState<Criterion | null>(null);
  const [isDeletingCrit, setIsDeletingCrit] = useState(false);

  // Settings form state
  const [localRefYear, setLocalRefYear] = useState<number>(settings.referenceYear || new Date().getFullYear());
  const [localRefDate, setLocalRefDate] = useState<string>(settings.referenceDate || '');
  const [localRefTime, setLocalRefTime] = useState<string>(settings.referenceTime || '');
  const [localUseCurrentDate, setLocalUseCurrentDate] = useState<boolean>(!settings.referenceDate);
  const [referenceClockTouched, setReferenceClockTouched] = useState(false);
  const [localBrandName, setLocalBrandName] = useState<string>(settings.brandName || 'AURA TALENT');
  const [localBrandTagline, setLocalBrandTagline] = useState<string>(settings.brandTagline || 'Idol Agency OS');
  const [localBrandLogoUrl, setLocalBrandLogoUrl] = useState<string>(settings.brandLogoUrl || '');
  const [localCalcMode, setLocalCalcMode] = useState<ScoreCalculationMode>(settings.scoreCalculationMode || 'sum');
  const [localHeaders, setLocalHeaders] = useState<ColumnHeadersConfig>(columnHeaders);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [personnelColumns, setPersonnelColumns] = useState<PersonnelColumn[]>([]);
  const [loadingPersonnelColumns, setLoadingPersonnelColumns] = useState(false);
  const [personnelColumnError, setPersonnelColumnError] = useState<string | null>(null);
  const [editingPersonnelColumn, setEditingPersonnelColumn] = useState<PersonnelColumn | null>(null);
  const [personnelColumnDraft, setPersonnelColumnDraft] = useState<Partial<PersonnelColumn>>({
    key: '', label: '', type: 'text', options: [], required: false, isVisible: true,
    isActive: true, showInRoster: true, showInProfile: true, sensitivity: 'public'
  });

  // Sync settings when props change
  React.useEffect(() => {
    setLocalRefYear(settings.referenceYear || new Date().getFullYear());
    setLocalRefDate(settings.referenceDate || '');
    setLocalRefTime(settings.referenceTime || '');
    setLocalUseCurrentDate(!settings.referenceDate);
    setReferenceClockTouched(false);
    setLocalBrandName(settings.brandName || 'AURA TALENT');
    setLocalBrandTagline(settings.brandTagline || 'Idol Agency OS');
    setLocalBrandLogoUrl(settings.brandLogoUrl || '');
    setLocalCalcMode(settings.scoreCalculationMode || 'sum');
    setLocalHeaders(columnHeaders);
  }, [settings, columnHeaders]);

  const canManageCriteria = currentUser?.isSuperAdmin || currentUser?.allowedActions?.includes('manage_criteria');
  const canManagePersonnelColumns = currentUser?.accountType === 'system_admin';

  const loadPersonnelColumns = useCallback(async () => {
    if (!canManagePersonnelColumns) return;
    try {
      setLoadingPersonnelColumns(true);
      setPersonnelColumnError(null);
      const columns = await api.getPersonnelColumns(true, currentUser.id);
      setPersonnelColumns(columns);
    } catch (error) {
      setPersonnelColumnError(error instanceof Error ? error.message : 'Không thể tải cấu hình cột');
    } finally {
      setLoadingPersonnelColumns(false);
    }
  }, [canManagePersonnelColumns, currentUser.id]);

  useEffect(() => {
    if (effectiveSubTab === 'column_headers') void loadPersonnelColumns();
  }, [effectiveSubTab, loadPersonnelColumns]);

  const resetPersonnelColumnDraft = () => {
    setEditingPersonnelColumn(null);
    setPersonnelColumnDraft({
      key: '', label: '', type: 'text', options: [], required: false, isVisible: true,
      isActive: true, showInRoster: true, showInProfile: true, sensitivity: 'public'
    });
  };

  const handleSavePersonnelColumn = async () => {
    try {
      setPersonnelColumnError(null);
      const payload = {
        ...personnelColumnDraft,
        key: String(personnelColumnDraft.key || '').trim(),
        label: String(personnelColumnDraft.label || '').trim(),
        options: personnelColumnDraft.type === 'select'
          ? String(personnelColumnDraft.options || '').split(',').map((item) => item.trim()).filter(Boolean)
          : undefined
      };
      if (!payload.key || !payload.label) throw new Error('Key và tên cột là bắt buộc');
      if (editingPersonnelColumn) {
        await api.updatePersonnelColumn(editingPersonnelColumn.id, payload, currentUser.id);
      } else {
        await api.createPersonnelColumn(payload, currentUser.id);
      }
      await loadPersonnelColumns();
      resetPersonnelColumnDraft();
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2500);
    } catch (error) {
      setPersonnelColumnError(error instanceof Error ? error.message : 'Không thể lưu cột');
    }
  };

  const handleArchiveOrRestorePersonnelColumn = async (column: PersonnelColumn) => {
    try {
      setPersonnelColumnError(null);
      if (column.isSystem && column.isActive) throw new Error('Không thể ngừng sử dụng cột hệ thống');
      if (column.isActive) {
        if (!await confirmDialog(`Ngừng sử dụng cột "${column.label}"? Dữ liệu hiện tại sẽ được giữ lại.`, 'Ngừng sử dụng cột')) return;
        await api.archivePersonnelColumn(column.id, currentUser.id);
      } else {
        await api.restorePersonnelColumn(column.id, currentUser.id);
      }
      await loadPersonnelColumns();
    } catch (error) {
      setPersonnelColumnError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái cột');
    }
  };

  const movePersonnelColumn = async (column: PersonnelColumn, direction: -1 | 1) => {
    const active = personnelColumns.filter((item) => item.isActive);
    const index = active.findIndex((item) => item.id === column.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= active.length) return;
    const next = [...active];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      setPersonnelColumnError(null);
      const updated = await api.reorderPersonnelColumns(next.map((item) => item.id), currentUser.id);
      const inactive = personnelColumns.filter((item) => !item.isActive);
      setPersonnelColumns([...updated, ...inactive]);
    } catch (error) {
      setPersonnelColumnError(error instanceof Error ? error.message : 'Không thể sắp xếp cột');
    }
  };

  // Pending count for badge
  const pendingCount = useMemo(() => {
    return approvals.filter((a) => a.status === 'pending').length;
  }, [approvals]);

  // Filtered approvals
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

  // Leave Management Counts & Filters
  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter((l) => l.status === 'pending').length;
  }, [leaveRequests]);

  const directorPendingLeavesCount = useMemo(() => {
    return leaveRequests.filter((l) => l.status === 'pending' && l.totalDays >= 3).length;
  }, [leaveRequests]);

  const autoApprovedLeavesCount = useMemo(() => {
    return leaveRequests.filter((l) => l.autoApproved || (l.totalDays === 1 && l.status === 'approved')).length;
  }, [leaveRequests]);

  const approvedLeavesDays = useMemo(() => {
    return leaveRequests
      .filter((l) => l.status === 'approved')
      .reduce((acc, l) => acc + (l.totalDays || 0), 0);
  }, [leaveRequests]);

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

  // Helper to determine if an account is a staff account
  const isUserStaff = useCallback(
    (u: UserAccount) => {
      if (u.idolId?.startsWith('staff-')) return true;
      if (u.accountType === 'system_admin' || u.role === 'director' || u.role === 'manager') return true;
      const p = idols.find((i) => i.id === u.idolId);
      if (p && p.isIdol === false) return true;
      if (!u.idolId) return true;
      return false;
    },
    [idols]
  );

  // Filtered users
  const filteredUsers = useMemo(() => {
    let list = users;
    if (userCategoryFilter === 'staff') {
      list = list.filter(isUserStaff);
    } else if (userCategoryFilter === 'idols') {
      list = list.filter((u) => !isUserStaff(u));
    }
    const term = userSearch.toLowerCase().trim();
    if (!term) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.roleTitle.toLowerCase().includes(term) ||
        (u.department && u.department.toLowerCase().includes(term))
    );
  }, [users, userSearch, userCategoryFilter, isUserStaff]);

  // Department parent-child hierarchy map
  const departmentParentMap = useMemo<Record<string, string>>(() => {
    return {
      ...DEFAULT_DEPARTMENT_PARENT_MAP,
      ...(settings.departmentParentMap || {})
    };
  }, [settings.departmentParentMap]);

  // Main departments (Level 1):
  // Any department in `departments` that does NOT have a parent in departmentParentMap
  const mainDepartments = useMemo(() => {
    return departments.filter((d) => !departmentParentMap[d]);
  }, [departments, departmentParentMap]);

  // Sub-groups helper: returns sub-groups belonging to a parent department
  const getSubGroupsForDept = (parentDept: string) => {
    return departments.filter((d) => departmentParentMap[d] === parentDept);
  };

  // Get users belonging to a department or sub-group
  const getUsersForUnit = (unitName: string) => {
    return users.filter((u) => {
      if (u.department && u.department.toLowerCase() === unitName.toLowerCase()) return true;
      if (
        unitName === 'Ban Giám Đốc' &&
        (u.isSuperAdmin ||
          u.role === 'super_admin' ||
          u.roleTitle.toLowerCase().includes('giám đốc') ||
          u.roleTitle.toLowerCase().includes('ceo'))
      ) {
        return true;
      }
      if (u.roleTitle && u.roleTitle.toLowerCase().includes(unitName.toLowerCase())) return true;
      return false;
    });
  };

  // Get idols belonging to a unit
  const getIdolsForUnit = (unitName: string) => {
    return idols.filter(
      (i) =>
        i.isIdol === true &&
        i.status !== 'Đã nghỉ việc' &&
        i.department &&
        i.department.toLowerCase() === unitName.toLowerCase()
    );
  };

  // Organizational personnel are sourced from personnel profiles, not login accounts.
  // This avoids counting system accounts and counting one person twice.
  const getStaffForUnit = (unitName: string) => {
    return idols.filter(
      (i) =>
        i.isIdol === false &&
        i.status !== 'Đã nghỉ việc' &&
        i.cooperationType !== 'service_guest' &&
        i.department &&
        i.department.toLowerCase() === unitName.toLowerCase()
    );
  };

  const getStaffAccountsForUnit = (unitName: string) => {
    return users.filter((user) => {
      const linkedPersonnel = idols.find((person) => person.userId === user.id || user.idolId === person.id);
      if (linkedPersonnel) {
        return getStaffForUnit(unitName).some((person) => person.id === linkedPersonnel.id);
      }
      return (
        user.accountType !== 'system_admin' &&
        user.department?.toLowerCase() === unitName.toLowerCase() &&
        isUserStaff(user)
      );
    });
  };

  // Comprehensive stats for a Main Department: includes direct staff + idols & staff in all sub-groups
  const getMainDeptStats = (mainDept: string) => {
    const subGroups = getSubGroupsForDept(mainDept);
    const directUsers = getStaffForUnit(mainDept);
    const directIdols = getIdolsForUnit(mainDept);

    let subGroupUsersCount = 0;
    let subGroupIdolsCount = 0;

    subGroups.forEach((sg) => {
      subGroupUsersCount += getStaffForUnit(sg).length;
      subGroupIdolsCount += getIdolsForUnit(sg).length;
    });

    const totalUsers = directUsers.length + subGroupUsersCount;
    const totalIdols = directIdols.length + subGroupIdolsCount;
    const totalPersonnel = totalUsers + totalIdols;

    return {
      subGroups,
      directUsers,
      directIdols,
      totalUsers,
      totalIdols,
      totalPersonnel
    };
  };

  const organizationStaffCount = useMemo(
    () =>
      idols.filter(
        (person) =>
          person.isIdol === false &&
          person.status !== 'Đã nghỉ việc' &&
          person.cooperationType !== 'service_guest'
      ).length,
    [idols]
  );

  const organizationIdolCount = useMemo(
    () => idols.filter((person) => person.isIdol === true && person.status !== 'Đã nghỉ việc').length,
    [idols]
  );

  // Filtered Main Departments for the overview grid
  const filteredMainDepartments = useMemo(() => {
    const term = deptSearch.toLowerCase().trim();
    if (!term) return mainDepartments;
    return mainDepartments.filter((d) => {
      if (d.toLowerCase().includes(term)) return true;
      const subGroups = departments.filter((sub) => departmentParentMap[sub] === d);
      return subGroups.some((sub) => sub.toLowerCase().includes(term));
    });
  }, [mainDepartments, departments, departmentParentMap, deptSearch]);

  const getDeptIconAndTheme = (deptName: string) => {
    const lower = deptName.toLowerCase();
    if (lower.includes('giám đốc') || lower.includes('bod')) {
      return {
        icon: Crown,
        bg: 'bg-amber-50 text-amber-600 border-amber-200',
        badge: 'bg-amber-100 text-amber-800',
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent'
      };
    }
    if (lower.includes('quản lý') || lower.includes('idol') || lower.includes('nghệ sĩ')) {
      return {
        icon: Sparkles,
        bg: 'bg-rose-50 text-rose-600 border-rose-200',
        badge: 'bg-rose-100 text-rose-800',
        gradient: 'from-rose-500/10 via-rose-500/5 to-transparent'
      };
    }
    if (lower.includes('kinh doanh') || lower.includes('nhãn hàng')) {
      return {
        icon: Briefcase,
        bg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-800',
        gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent'
      };
    }
    if (lower.includes('sản xuất') || lower.includes('nội dung')) {
      return {
        icon: Layers,
        bg: 'bg-purple-50 text-purple-600 border-purple-200',
        badge: 'bg-purple-100 text-purple-800',
        gradient: 'from-purple-500/10 via-purple-500/5 to-transparent'
      };
    }
    if (lower.includes('vận hành') || lower.includes('livestream')) {
      return {
        icon: Globe,
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
        gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent'
      };
    }
    if (lower.includes('marketing') || lower.includes('truyền thông')) {
      return {
        icon: Palette,
        bg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
        badge: 'bg-cyan-100 text-cyan-800',
        gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent'
      };
    }
    if (lower.includes('kế toán') || lower.includes('hr') || lower.includes('nhân sự')) {
      return {
        icon: Shield,
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        badge: 'bg-slate-200 text-slate-800',
        gradient: 'from-slate-500/10 via-slate-500/5 to-transparent'
      };
    }
    return {
      icon: Building2,
      bg: 'bg-sky-50 text-sky-600 border-sky-200',
      badge: 'bg-sky-100 text-sky-800',
      gradient: 'from-sky-500/10 via-sky-500/5 to-transparent'
    };
  };

  // Department counts
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    departments.forEach((d) => (counts[d] = 0));
    idols.forEach((i) => {
      if (counts[i.department] !== undefined) counts[i.department]++;
    });
    return counts;
  }, [departments, idols]);

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    const term = deptSearch.toLowerCase().trim();
    if (!term) return departments;
    return departments.filter((d) => d.toLowerCase().includes(term));
  }, [departments, deptSearch]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    statuses.forEach((s) => (counts[s] = 0));
    idols.forEach((i) => {
      if (counts[i.status] !== undefined) counts[i.status]++;
    });
    return counts;
  }, [statuses, idols]);

  // Filtered statuses
  const filteredStatuses = useMemo(() => {
    const term = statusSearch.toLowerCase().trim();
    if (!term) return statuses;
    return statuses.filter((s) => s.toLowerCase().includes(term));
  }, [statuses, statusSearch]);

  // Personnel Type counts
  const personnelTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    personnelTypes.forEach((p) => (counts[p] = 0));
    idols.forEach((i) => {
      const type = i.personnelType || 'Công ty';
      if (counts[type] !== undefined) counts[type]++;
      else counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [personnelTypes, idols]);

  // Filtered personnel types
  const filteredPersonnelTypes = useMemo(() => {
    const term = personnelTypeSearch.toLowerCase().trim();
    if (!term) return personnelTypes;
    return personnelTypes.filter((p) => p.toLowerCase().includes(term));
  }, [personnelTypes, personnelTypeSearch]);

  // Filtered criteria
  const filteredCriteria = useMemo(() => {
    const term = critSearch.toLowerCase().trim();
    if (!term) return criteria;
    return criteria.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
    );
  }, [criteria, critSearch]);

  // Handle In-App Approve & Reject Modal
  const openApproveModal = (req: ApprovalRequest) => {
    setApprovalModal({
      isOpen: true,
      request: req,
      mode: 'approve',
      note: 'Đã kiểm tra và phê duyệt hồ sơ.'
    });
  };

  const openRejectModal = (req: ApprovalRequest) => {
    setApprovalModal({
      isOpen: true,
      request: req,
      mode: 'reject',
      note: 'Chưa đạt yêu cầu quy chuẩn của công ty.'
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
          message: `Đã phê duyệt thành công yêu cầu "${request.targetName}" vào hệ thống!`
        });
      } else {
        await onRejectRequest(request.id, note);
        setApprovalToast({
          type: 'success',
          message: `Đã từ chối yêu cầu "${request.targetName}".`
        });
      }
      setApprovalModal(null);
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err: any) {
      setApprovalToast({
        type: 'error',
        message: err.message || 'Lỗi khi xử lý yêu cầu'
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
        message: `Đã phê duyệt nhanh thành công "${req.targetName}"!`
      });
      setTimeout(() => setApprovalToast(null), 4000);
    } catch (err: any) {
      setApprovalToast({
        type: 'error',
        message: err.message || 'Lỗi khi phê duyệt'
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
          message: `Đã phê duyệt thành công đơn nghỉ của "${request.idolName}" (${request.totalDays} ngày)!`
        });
      } else {
        if (onRejectLeaveRequest) {
          await onRejectLeaveRequest(request.id, note || 'Từ chối đơn nghỉ phép');
        }
        setLeaveToast({
          type: 'success',
          message: `Đã từ chối đơn nghỉ phép của "${request.idolName}".`
        });
      }
      setLeaveActionModal(null);
      setTimeout(() => setLeaveToast(null), 4000);
    } catch (err: any) {
      setLeaveToast({
        type: 'error',
        message: err.message || 'Lỗi khi xử lý đơn nghỉ phép'
      });
      setTimeout(() => setLeaveToast(null), 4000);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleQuickApproveLeave = async (req: LeaveRequest) => {
    try {
      setProcessingLeaveId(req.id);
      if (onApproveLeaveRequest) {
        await onApproveLeaveRequest(req.id, 'Phê duyệt nhanh');
      }
      setLeaveToast({
        type: 'success',
        message: `Đã phê duyệt nhanh thành công đơn của "${req.idolName}"!`
      });
      setTimeout(() => setLeaveToast(null), 4000);
    } catch (err: any) {
      setLeaveToast({
        type: 'error',
        message: err.message || 'Lỗi khi phê duyệt'
      });
      setTimeout(() => setLeaveToast(null), 4000);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  // Move criteria priority up/down
  const movePriority = async (critId: string, direction: 'up' | 'down') => {
    const sorted = [...criteria].sort((a, b) => a.priorityOrder - b.priorityOrder);
    const index = sorted.findIndex((c) => c.id === critId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = sorted[index];
    sorted[index] = sorted[swapIdx];
    sorted[swapIdx] = temp;

    const ids = sorted.map((c) => c.id);
    await onUpdatePriorityOrder(ids);
  };

  // Execute criteria delete
  const handleExecuteDeleteCrit = async () => {
    if (!critToDelete) return;
    try {
      setIsDeletingCrit(true);
      await onDeleteCriterion(critToDelete.id);
      setCritToDelete(null);
    } catch (err: any) {
      console.error('Lỗi khi xóa tiêu chí:', err);
    } finally {
      setIsDeletingCrit(false);
    }
  };

  // Save general system settings
  const handleSaveAllSettings = async () => {
    try {
      setSavingSettings(true);
      const resolvedRefDate = localUseCurrentDate ? '' : localRefDate;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('aura_system_reference_date', resolvedRefDate);
        }
      } catch (e) {
        // ignore
      }
      await onUpdateSettings({
        referenceYear: Number(localRefYear) || new Date().getFullYear(),
        referenceDate: resolvedRefDate,
        // Only reset the clock when the user interacted with its date controls.
        // This form also saves branding, so unrelated edits must not restart it.
        ...(referenceClockTouched ? { referenceTime: '', resetReferenceClockAnchor: true } : {}),
        brandName: localBrandName.trim() || 'AURA TALENT',
        brandTagline: localBrandTagline.trim() || 'Idol Agency OS',
        brandLogoUrl: localBrandLogoUrl.trim(),
        scoreCalculationMode: localCalcMode
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Không thể lưu cài đặt:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveColumnHeaders = async () => {
    try {
      setSavingSettings(true);
      await onSaveColumnHeaders(localHeaders);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Không thể lưu tiêu đề cột:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-sky-700 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">
                  {currentUser.isSuperAdmin ? 'Trung Tâm Quản Trị Hệ Thống' : 'Trung Tâm Phê Duyệt & Vận Hành'}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide">
                  {currentUser.isSuperAdmin ? 'Super Admin Console' : 'Approval Center'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.isSuperAdmin
                  ? 'Quản lý phê duyệt nhân sự từ cấp dưới, tài khoản & phân quyền xem theo đơn vị, tiêu chí điểm số và cấu hình hệ thống.'
                  : 'Xem và phê duyệt các đơn nghỉ phép, yêu cầu nhân sự thuộc phạm vi được phân quyền.'}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <div className="text-[10px] font-medium text-rose-600">Yêu Cầu Chờ Duyệt</div>
              <div className="text-sm font-extrabold text-rose-700">{pendingCount}</div>
            </div>
            <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-center">
              <div className="text-[10px] font-medium text-purple-600">Phép Chờ Duyệt</div>
              <div className="text-sm font-extrabold text-purple-700">{pendingLeavesCount}</div>
            </div>
            <div className="px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-center">
              <div className="text-[10px] font-medium text-sky-600">Tài Khoản</div>
              <div className="text-sm font-extrabold text-sky-700">{users.length}</div>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className="text-[10px] font-medium text-slate-600">Đơn Vị</div>
              <div className="text-sm font-extrabold text-slate-700">{departments.length}</div>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation: Phân nhóm 3 cụm chức năng logic, responsive wrap, không bị che/cuộn */}
        <div className="mt-5 border-t border-slate-100 pt-3.5">
          <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-1.5">
            {/* Cụm 1: HÀNG ĐỢI DUYỆT */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveSubTab('leave_management')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'leave_management'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Quản trị và phê duyệt các đơn xin nghỉ phép của nhân sự"
              >
                <CalendarClock className={`w-3.5 h-3.5 ${effectiveSubTab === 'leave_management' ? 'text-rose-600' : 'text-slate-400'}`} />
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'approvals'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Hàng đợi phê duyệt thay đổi thông tin nhân sự từ cấp dưới"
              >
                <Clock className={`w-3.5 h-3.5 ${effectiveSubTab === 'approvals' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Duyệt Yêu Cầu</span>
                {pendingCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-600 text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Phân cách Cụm 1 & Cụm 2 */}
            <div className="h-4 w-px bg-slate-300 hidden md:block mx-0.5" />

            {/* Cụm 2: TỔ CHỨC & PHÂN QUYỀN */}
            {currentUser.isSuperAdmin && (
            <div className="flex items-center gap-1 flex-wrap">
              {currentUser.isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'users'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Danh sách tài khoản hệ thống và ma trận phân quyền"
              >
                <Users className={`w-3.5 h-3.5 ${effectiveSubTab === 'users' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Tài Khoản & Phân Quyền</span>
                <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                  {users.length}
                </span>
              </button>
              )}

              {currentUser.isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('departments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'departments'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Quản lý cây cơ cấu tổ chức và các phòng ban / khối"
              >
                <Building2 className={`w-3.5 h-3.5 ${effectiveSubTab === 'departments' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Cơ Cấu Đơn Vị</span>
                <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                  {departments.length}
                </span>
              </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSubTab('personnel_types')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'personnel_types'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Danh mục loại nhân sự (Công ty, Outsource, CTV, Dịch vụ ngoài...)"
              >
                <Layers className={`w-3.5 h-3.5 ${effectiveSubTab === 'personnel_types' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Loại Nhân Sự</span>
                <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                  {personnelTypes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('statuses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'statuses'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Danh mục trạng thái làm việc của nhân sự"
              >
                <Tag className={`w-3.5 h-3.5 ${effectiveSubTab === 'statuses' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Trạng Thái</span>
                <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                  {statuses.length}
                </span>
              </button>
            </div>
            )}

            {/* Phân cách Cụm 2 & Cụm 3 */}
            <div className="h-4 w-px bg-slate-300 hidden lg:block mx-0.5" />

            {/* Cụm 3: HỆ THỐNG & TIÊU CHÍ */}
            <div className="flex items-center gap-1">
              {canManageCriteria && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('criteria')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    effectiveSubTab === 'criteria'
                      ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title="Danh mục các tiêu chí đánh giá và trọng số điểm"
                >
                  <Sliders className={`w-3.5 h-3.5 ${effectiveSubTab === 'criteria' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Tiêu Chí Đánh Giá</span>
                  <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                    {criteria.length}
                  </span>
                </button>
              )}

              {currentUser.isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'settings'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Thiết lập thương hiệu, mốc thời gian và phương thức tính điểm"
              >
                <Settings className={`w-3.5 h-3.5 ${effectiveSubTab === 'settings' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Thiết Lập Hệ Thống</span>
              </button>
              )}

              {currentUser.isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('column_headers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  effectiveSubTab === 'column_headers'
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Đổi tên các cột hiển thị trên danh sách nhân sự"
              >
                <Layers className={`w-3.5 h-3.5 ${effectiveSubTab === 'column_headers' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Hiển Thị Danh Sách</span>
              </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TAB 0: LEAVE MANAGEMENT (QUẢN TRỊ NGHỈ PHÉP) */}
      {effectiveSubTab === 'leave_management' && (
        <div className="space-y-4">
          {/* Toast Message */}
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
                onClick={() => setLeaveToast(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Stat Cards */}
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
              <div className="text-2xl font-black text-sky-700">{approvedLeavesDays} <span className="text-xs font-normal">ngày</span></div>
              <div className="text-[10px] text-slate-400">Đã chốt trừ phép năm</div>
            </div>
          </div>

          {/* Policy Information Box */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Quy chế Phê duyệt Nghỉ phép & Tích lũy Phép năm Aura Talent</span>
              </div>
              <p className="text-[11px] text-purple-900 leading-relaxed">
                • <strong>Mới vào (&lt; 12 tháng)</strong>: 1 ngày/tháng thâm niên • <strong>Đủ 12 tháng</strong>: 14 ngày phép năm • <strong>Mỗi năm thêm</strong>: +1 ngày phép.<br />
                • <strong>Nghỉ 1 ngày</strong>: Tự động phê duyệt nếu còn phép năm • <strong>Nghỉ 2 ngày</strong>: Trưởng Phòng duyệt • <strong>Nghỉ ≥ 3 ngày</strong>: Giám Đốc trực tiếp phê duyệt.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
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

              {/* Department filter */}
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

            {/* Filter tags */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Trạng thái:</span>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'pending', label: 'Chờ duyệt', count: pendingLeavesCount },
                  { id: 'approved', label: 'Đã duyệt' },
                  { id: 'rejected', label: 'Từ chối' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setLeaveStatusFilter(st.id as any)}
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
                  { id: 'auto', label: '⚡ Tự Động (1 ngày)' }
                ].map((pol) => (
                  <button
                    key={pol.id}
                    onClick={() => setLeavePolicyFilter(pol.id as any)}
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

          {/* Leave Requests List */}
          <div className="space-y-3">
            {filteredLeaves.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
                <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Không tìm thấy đơn nghỉ phép nào</h4>
                <p className="text-xs text-slate-400">
                  Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa khác
                </p>
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
                      {/* Idol info */}
                      <div className="flex items-center gap-3">
                        <img
                          src={idol?.avatarUrl || DEFAULT_BLANK_AVATAR}
                          alt={req.idolName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{req.idolName}</span>
                            {idol?.realName && (
                              <span className="text-xs text-slate-400">({idol.realName})</span>
                            )}
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

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Policy Badge */}
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          req.totalDays >= 3
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : req.totalDays === 2
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          {req.totalDays >= 3
                            ? '👑 Cần Giám Đốc Duyệt (≥ 3 ngày)'
                            : req.totalDays === 2
                            ? '👔 Cần Trưởng Phòng Duyệt'
                            : '⚡ Tự Động Phê Duyệt'}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {req.status === 'approved' ? '✓ Đã Duyệt' : req.status === 'rejected' ? '✕ Từ Chối' : '⏳ Chờ Duyệt'}
                        </span>
                      </div>
                    </div>

                    {/* Details Box */}
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
                          {req.allocationConfirmed && req.unpaidLeaveDays ? <span className="text-amber-700">Đã xác nhận phân bổ</span> : null}
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

                    {/* Actions Bar */}
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
                                note: 'Đồng ý phê duyệt'
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
                                note: ''
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

      {/* SUB-TAB 1: APPROVALS QUEUE */}
      {effectiveSubTab === 'approvals' && (
        <div className="space-y-4">
          {/* Status Toast Banner */}
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
                onClick={() => setApprovalToast(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Controls & Search */}
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

          {/* Approvals List */}
          {filteredApprovals.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Không có yêu cầu phê duyệt nào</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Khi các nhân viên cấp dưới (quản lý, giám khảo, trợ lý) thực hiện thêm hoặc xóa nhân sự,
                các yêu cầu sẽ hiển thị tại đây để Ban Quản Trị xét duyệt.
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
                      {/* Left: Info */}
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
                              <span className="font-semibold text-slate-700">Phản hồi của Admin:</span>
                              <span className="text-slate-600 font-medium">{req.reviewNote}</span>
                              {req.reviewedBy && (
                                <span className="text-[11px] text-slate-400">
                                  (bởi {req.reviewedBy.name})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {req.data && (
                          <button
                            onClick={() => setSelectedApprDetail(req)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Xem Chi Tiết
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(req)}
                              disabled={processingApprId === req.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Duyệt nhanh với ghi chú chuẩn"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt Nhanh</span>
                            </button>

                            <button
                              onClick={() => openApproveModal(req)}
                              disabled={processingApprId === req.id}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isCreate ? 'Duyệt Thêm Roster' : 'Duyệt Xóa Roster'}</span>
                            </button>

                            <button
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

      {/* SUB-TAB 2: USERS & DEPARTMENT PERMISSIONS */}
      {effectiveSubTab === 'users' && currentUser.isSuperAdmin && (
        <div className="space-y-4">
          {syncToast && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
              syncToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{syncToast.message}</span>
              </div>
              <button onClick={() => setSyncToast(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
          )}

          {/* View Mode Switcher: RBAC vs Flat User List */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setUserPermissionViewMode('rbac')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  userPermissionViewMode === 'rbac'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Phân Quyền Theo Vai Trò & Phòng Ban (RBAC)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-extrabold">
                  Khuyên dùng
                </span>
              </button>

              <button
                type="button"
                onClick={() => setUserPermissionViewMode('user_list')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  userPermissionViewMode === 'user_list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Phân quyền theo Tài Khoản ({users.length})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium px-2 hidden sm:block">
              {userPermissionViewMode === 'rbac'
                ? 'Gán quyền đồng loạt theo phòng ban & chức danh chuẩn'
                : 'Xem và chỉnh sửa chi tiết tài khoản cá nhân'}
            </div>
          </div>

          {userPermissionViewMode === 'rbac' ? (
            <RoleBasedPermissionManager
              currentUser={currentUser}
              users={users}
              idols={idols}
              departments={departments}
              onSaveUser={onSaveUser}
            />
          ) : (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm tài khoản theo tên, vai trò..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setUserCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    userCategoryFilter === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({users.length})
                </button>
                <button
                  onClick={() => setUserCategoryFilter('staff')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    userCategoryFilter === 'staff'
                      ? 'bg-white text-indigo-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏢 Cán Bộ & Vận Hành ({users.filter(isUserStaff).length})
                </button>
                <button
                  onClick={() => setUserCategoryFilter('idols')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    userCategoryFilter === 'idols'
                      ? 'bg-white text-amber-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌟 Idol & Nghệ Sĩ ({users.filter((u) => !isUserStaff(u)).length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onSyncUsers && (
                <button
                  onClick={async () => {
                    try {
                      setIsSyncingUsers(true);
                      await onSyncUsers();
                      setSyncToast({
                        type: 'success',
                        message: 'Đã đồng bộ tài khoản 1-1 cho toàn bộ nhân sự và Idol trong hệ thống!'
                      });
                      setTimeout(() => setSyncToast(null), 4000);
                    } catch (err: any) {
                      setSyncToast({
                        type: 'error',
                        message: err.message || 'Không thể đồng bộ tài khoản'
                      });
                    } finally {
                      setIsSyncingUsers(false);
                    }
                  }}
                  disabled={isSyncingUsers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  title="Tự động đồng bộ tài khoản cho mọi Idol có trong danh sách nhân sự"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                  <span>{isSyncingUsers ? 'Đang đồng bộ...' : 'Đồng Bộ Từ Roster'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setEditingUser({
                    name: '',
                    username: '',
                    email: '',
                    department: departments[0] || 'Phòng Quản Lý & Phát Triển Idol',
                    roleTitle: 'Điều Phối Viên Đơn Vị',
                    role: 'manager',
                    accountType: 'personnel',
                    isSuperAdmin: false,
                    allowedTabs: ['roster', 'tasks'],
                    allowedDepartments: departments.length > 0 ? [departments[0]] : ['*'],
                    allowedActions: ['manage_idols', 'manage_tasks']
                  });
                  setUserFormPassword('123');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Tài Khoản Mới</span>
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Tài Khoản & Phân Loại</th>
                    <th className="py-3 px-4">Vai Trò & Chức Danh</th>
                    <th className="py-3 px-4">Đơn Vị Được Phép Xem</th>
                    <th className="py-3 px-4">Mục Được Phép Xem</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isAllDepts = !u.allowedDepartments || u.allowedDepartments.includes('*');
                    const isStaff = isUserStaff(u);
                    const isIdolAccount = !isStaff;
                    const linkedIdol = u.idolId ? idols.find((i) => i.id === u.idolId) : undefined;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                u.avatarUrl ||
                                DEFAULT_BLANK_AVATAR
                              }
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{u.name}</span>
                                {isIdolAccount ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                    <span>Idol</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                    <Building2 className="w-2.5 h-2.5 text-indigo-500" />
                                    <span>Cán Bộ</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">@{u.username} · {u.email}</div>
                              {linkedIdol && linkedIdol.isIdol && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  Nghệ danh: <strong className="text-slate-600">{linkedIdol.stageName}</strong> · Đơn vị: {linkedIdol.department}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{u.roleTitle}</div>
                          {u.department && (
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{u.department}</span>
                            </div>
                          )}
                          {u.isSuperAdmin && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                              Super Admin
                            </span>
                          )}
                        </td>

                        {/* Department Scope */}
                        <td className="py-3 px-4">
                          {isAllDepts ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Toàn bộ công ty (Tất cả đơn vị)</span>
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {u.allowedDepartments?.map((dept) => (
                                <span
                                  key={dept}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200"
                                >
                                  {dept}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Allowed tabs with distinct aesthetic badges */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {u.allowedTabs?.map((t) => {
                              const tabConfig: Record<string, { label: string; cls: string }> = {
                                my_dashboard: { label: 'Dashboard Idol', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
                                schedule: { label: 'Lịch làm việc', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                                tasks: { label: 'Nhiệm vụ', cls: 'bg-teal-50 text-teal-800 border-teal-200' },
                                payroll: { label: 'Bảng lương', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                                roster: { label: 'Danh sách', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
                                scoring: { label: 'Bảng điểm', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
                                leaderboard: { label: 'Xếp hạng', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
                                analytics: { label: 'Thống kê', cls: 'bg-purple-50 text-purple-800 border-purple-200' },
                                admin: { label: 'Quản trị', cls: 'bg-slate-100 text-slate-800 border-slate-200' }
                              };
                              const conf = tabConfig[t] || { label: t, cls: 'bg-slate-100 text-slate-700 border-slate-200' };

                              return (
                                <span
                                  key={t}
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${conf.cls}`}
                                >
                                  {conf.label}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser({
                                  id: u.id,
                                  name: u.name,
                                  username: u.username,
                                  email: u.email,
                                  department: u.department || '',
                                  roleTitle: u.roleTitle,
                                  role: u.role,
                                  accountType: u.accountType,
                                  isSuperAdmin: u.isSuperAdmin,
                                  allowedTabs: [...(u.allowedTabs || [])],
                                  allowedDepartments: u.allowedDepartments
                                    ? [...u.allowedDepartments]
                                    : ['*'],
                                  allowedActions: u.allowedActions ? [...u.allowedActions] : []
                                });
                                setUserFormPassword('');
                              }}
                              className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa tài khoản & phân quyền"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!u.isSuperAdmin && (
                              <button
                                onClick={() => onDeleteUser(u.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )}

      {/* SUB-TAB: PERSONNEL TYPES (Công ty, Outsource, Thực tập sinh, CTV...) */}
      {effectiveSubTab === 'personnel_types' && currentUser.isSuperAdmin && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={personnelTypeSearch}
                onChange={(e) => setPersonnelTypeSearch(e.target.value)}
                placeholder="Tìm loại nhân sự..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={newPersonnelTypeName}
                onChange={(e) => setNewPersonnelTypeName(e.target.value)}
                placeholder="Nhập loại nhân sự mới (VD: CTV, Thời vụ...)"
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-400 flex-1 sm:w-72"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newPersonnelTypeName.trim()) {
                    await onAddPersonnelType(newPersonnelTypeName.trim());
                    setNewPersonnelTypeName('');
                  }
                }}
              />
              <button
                onClick={async () => {
                  if (!newPersonnelTypeName.trim()) return;
                  await onAddPersonnelType(newPersonnelTypeName.trim());
                  setNewPersonnelTypeName('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Loại Nhân Sự</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredPersonnelTypes.map((type) => {
              const count = personnelTypeCounts[type] || 0;
              const isEditing = editingPersonnelType?.oldName === type;

              return (
                <div
                  key={type}
                  className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingPersonnelType.newName}
                          onChange={(e) =>
                            setEditingPersonnelType({ ...editingPersonnelType, newName: e.target.value })
                          }
                          className="px-2 py-1 text-xs border border-indigo-400 rounded-md focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{type}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {count} nhân sự
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={async () => {
                              if (!editingPersonnelType.newName.trim()) return;
                              await onUpdatePersonnelType(editingPersonnelType.oldName, editingPersonnelType.newName.trim());
                              setEditingPersonnelType(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Lưu tên mới"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPersonnelType(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Hủy"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingPersonnelType({ oldName: type, newName: type })}
                            className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                            title="Đổi tên loại nhân sự"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (personnelTypes.length <= 1) {
                                notify('Không thể xóa loại nhân sự duy nhất còn lại.', 'warning');
                                return;
                              }
                              await onDeletePersonnelType(type);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Xóa loại nhân sự"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sample members having this personnel type */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 font-semibold mb-1">Thành viên mẫu:</div>
                    <div className="flex flex-wrap gap-1">
                      {idols
                        .filter((i) => (i.personnelType || 'Công ty') === type)
                        .slice(0, 3)
                        .map((i) => (
                          <span
                            key={i.id}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded"
                          >
                            {i.stageName}
                          </span>
                        ))}
                      {count === 0 && (
                        <span className="text-[10px] text-slate-400 italic">Chưa có nhân sự</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DEPARTMENTS (CƠ CẤU PHÒNG BAN & NHÓM TRỰC THUỘC) */}
      {effectiveSubTab === 'departments' && currentUser.isSuperAdmin && (
        <div className="space-y-4">
          {/* Top Control Bar: Search & Add Unit / Sub-group */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1 max-w-2xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={selectedDeptDetail ? deptPersonnelSearch : deptSearch}
                onChange={(e) => {
                  if (selectedDeptDetail) {
                    setDeptPersonnelSearch(e.target.value);
                  } else {
                    setDeptSearch(e.target.value);
                  }
                }}
                placeholder={
                  selectedDeptDetail
                    ? `Tìm nhân sự trong ${selectedDeptDetail}...`
                    : 'Tìm kiếm phòng ban hoặc nhóm trực thuộc...'
                }
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setNewDeptName('');
                setNewDeptParent(selectedDeptDetail || '');
                setIsAddUnitModalOpen(true);
              }}
              className="inline-flex w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-rose-500 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Phòng ban / Nhóm</span>
            </button>
          </div>

          {/* VIEW MODE 1: TỔNG QUAN PHÒNG BAN CHÍNH (selectedDeptDetail === null) */}
          {!selectedDeptDetail && (
            <div className="space-y-4">
              {/* Thống kê vĩ mô cơ cấu tổ chức */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Phòng Ban Cấp 1
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {mainDepartments.length} phòng ban
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Nhóm Trực Thuộc
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {departments.filter((department) => Boolean(departmentParentMap[department])).length} nhóm / team
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Cán Bộ & Quản Lý
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {organizationStaffCount} nhân sự
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Idol & Nghệ Sĩ
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {organizationIdolCount} idol
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách các Thẻ Phòng Ban Cấp 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMainDepartments.map((dept) => {
                  const stats = getMainDeptStats(dept);
                  const theme = getDeptIconAndTheme(dept);
                  const DeptIcon = theme.icon;
                  const isEditing = editingDept?.oldName === dept;

                  return (
                    <div
                      key={dept}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${theme.bg} border flex items-center justify-center shrink-0 shadow-2xs`}>
                              <DeptIcon className="w-5 h-5" />
                            </div>
                            <div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingDept.newName}
                                  onChange={(e) =>
                                    setEditingDept({ ...editingDept, newName: e.target.value })
                                  }
                                  className="px-2 py-1 text-xs border border-sky-400 rounded-md focus:outline-none bg-white font-bold"
                                  autoFocus
                                />
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{dept}</h4>
                                  </div>
                                  <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                                    Phòng Ban Cấp 1
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={async () => {
                                    if (!editingDept.newName.trim()) return;
                                    await onUpdateDepartment(editingDept.oldName, editingDept.newName.trim());
                                    // Update parentMap references
                                    let mapChanged = false;
                                    const newMap = { ...departmentParentMap };
                                    if (newMap[editingDept.oldName]) {
                                      const p = newMap[editingDept.oldName];
                                      delete newMap[editingDept.oldName];
                                      newMap[editingDept.newName.trim()] = p;
                                      mapChanged = true;
                                    }
                                    Object.keys(newMap).forEach((k) => {
                                      if (newMap[k] === editingDept.oldName) {
                                        newMap[k] = editingDept.newName.trim();
                                        mapChanged = true;
                                      }
                                    });
                                    if (mapChanged) {
                                      await onUpdateSettings({ departmentParentMap: newMap });
                                    }
                                    setEditingDept(null);
                                  }}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Lưu tên mới"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingDept(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                  title="Hủy"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingDept({ oldName: dept, newName: dept })}
                                  className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                  title="Đổi tên phòng ban"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!await confirmDialog(`Bạn có chắc muốn xóa phòng ban "${dept}"?`, 'Xóa phòng ban')) return;
                                    await onDeleteDepartment(dept);
                                    if (departmentParentMap[dept]) {
                                      const newMap = { ...departmentParentMap };
                                      delete newMap[dept];
                                      await onUpdateSettings({ departmentParentMap: newMap });
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                  title="Xóa phòng ban"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Thống kê nhân sự tổng quan */}
                        <div className="mt-3 flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-800">
                            {stats.totalPersonnel} nhân sự
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">
                            {stats.totalUsers} cán bộ
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-rose-700 font-bold">
                            {stats.totalIdols} idol
                          </span>
                        </div>
                      </div>

                      {/* Danh sách các nhóm con (Sub-groups) trực thuộc */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Nhóm trực thuộc ({stats.subGroups.length})</span>
                          </div>

                          {stats.subGroups.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {stats.subGroups.slice(0, 5).map((sg) => {
                                const sgCount =
                                  getStaffForUnit(sg).length + getIdolsForUnit(sg).length;
                                return (
                                  <button
                                    key={sg}
                                    onClick={() => setSelectedDeptDetail(dept)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                                  >
                                    <CornerDownRight className="w-3 h-3 text-slate-400" />
                                    <span>{sg}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">({sgCount})</span>
                                  </button>
                                );
                              })}
                              {stats.subGroups.length > 5 && (
                                <button
                                  onClick={() => setSelectedDeptDetail(dept)}
                                  className="text-[11px] text-slate-500 hover:text-slate-800 font-bold px-1.5 py-1"
                                >
                                  +{stats.subGroups.length - 5} nhóm khác...
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Chưa có nhóm trực thuộc (nhân sự làm việc trực tiếp)
                            </p>
                          )}
                        </div>

                        {/* Nút hành động chính: Xem chi tiết & Danh sách nhân sự */}
                        <button
                          onClick={() => {
                            setSelectedDeptDetail(dept);
                            setDeptPersonnelSearch('');
                          }}
                          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50/70 border border-slate-200 rounded-xl transition-all cursor-pointer group-hover:border-rose-300"
                        >
                          <FolderTree className="w-3.5 h-3.5 text-rose-500" />
                          <span>Xem Danh Sách & Cây Cơ Cấu</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: INTERACTIVE DRILL-DOWN CHI TIẾT PHÒNG BAN & CÂY NHÂN SỰ (selectedDeptDetail !== null) */}
          {selectedDeptDetail && (
            <div className="space-y-4">
              {/* Back Bar & Department Title */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedDeptDetail(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{selectedDeptDetail}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Cấp 1 - Phòng Ban
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          Tổng số {getMainDeptStats(selectedDeptDetail).totalPersonnel} nhân sự trực thuộc
                          ({getMainDeptStats(selectedDeptDetail).totalUsers} cán bộ quản lý,{' '}
                          {getMainDeptStats(selectedDeptDetail).totalIdols} idol nghệ sĩ)
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewDeptName('');
                      setNewDeptParent(selectedDeptDetail);
                      setIsAddUnitModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm nhóm</span>
                  </button>
                </div>

                {/* Sub-groups Filter Pills */}
                {getSubGroupsForDept(selectedDeptDetail).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Các nhóm trực thuộc ({getSubGroupsForDept(selectedDeptDetail).length}):
                    </span>
                    {getSubGroupsForDept(selectedDeptDetail).map((sg) => {
                      const count = getStaffForUnit(sg).length + getIdolsForUnit(sg).length;
                      return (
                        <span
                          key={sg}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-800 rounded-lg border border-rose-200"
                        >
                          <CornerDownRight className="w-3 h-3 text-rose-500" />
                          <span>{sg}</span>
                          <span className="text-[10px] text-rose-600 font-bold">({count})</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 1: CÁN BỘ & BAN QUẢN LÝ TRỰC TIẾP CỦA PHÒNG BAN */}
              {(() => {
                const directStaff = getStaffAccountsForUnit(selectedDeptDetail).filter((u) => {
                  if (!deptPersonnelSearch) return true;
                  const term = deptPersonnelSearch.toLowerCase();
                  return (
                    u.name.toLowerCase().includes(term) ||
                    u.username.toLowerCase().includes(term) ||
                    u.email.toLowerCase().includes(term) ||
                    u.roleTitle.toLowerCase().includes(term)
                  );
                });

                return (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Ban Lãnh Đạo & Cán Bộ Quản Lý Trực Tiếp ({directStaff.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Tài khoản điều hành & quản lý của phòng
                      </span>
                    </div>

                    {directStaff.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {directStaff.map((u) => (
                          <div
                            key={u.id}
                            className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex items-start gap-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="text-xs font-bold text-slate-900 truncate">{u.name}</h5>
                                {u.isSuperAdmin && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 shrink-0">
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-semibold text-rose-700 truncate">{u.roleTitle}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">@{u.username} • {u.email}</p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className="text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  Đang hoạt động
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                        <p className="text-xs text-slate-500">
                          Chưa có tài khoản cán bộ quản lý gán trực tiếp vào phòng ban này.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          (Bạn có thể vào tab <strong>&ldquo;Tài Khoản & Phân Quyền&rdquo;</strong> để gán phòng ban cho nhân sự).
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECTION 2: CÂY CƠ CẤU CÁC NHÓM TRỰC THUỘC & NHÂN SỰ / IDOL */}
              {(() => {
                const subGroups = getSubGroupsForDept(selectedDeptDetail);

                if (subGroups.length === 0) {
                  // Single-tier department (nhân sự idol làm việc trực tiếp nếu có)
                  const directIdols = getIdolsForUnit(selectedDeptDetail).filter((i) => {
                    if (!deptPersonnelSearch) return true;
                    const term = deptPersonnelSearch.toLowerCase();
                    return (
                      i.stageName.toLowerCase().includes(term) ||
                      i.realName.toLowerCase().includes(term) ||
                      (i.role && i.role.toLowerCase().includes(term)) ||
                      (i.personnelType && i.personnelType.toLowerCase().includes(term))
                    );
                  });

                  return (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-sky-600" />
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Nhân Sự & Thành Viên Trực Thuộc ({directIdols.length})
                          </h4>
                        </div>
                      </div>

                      {directIdols.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {directIdols.map((i) => (
                            <div
                              key={i.id}
                              className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:shadow-xs transition-all flex items-start gap-3"
                            >
                              <img
                                src={i.avatarUrl || DEFAULT_BLANK_AVATAR}
                                alt={i.stageName}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="text-xs font-bold text-slate-900 truncate">{i.stageName}</h5>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                                    {i.role || i.personnelType || 'Idol'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{i.realName}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                    {calculateTenure(i.joinDate).formattedText}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                                    {i.status || 'Đang hoạt động'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                          <p className="text-xs text-slate-500">
                            Phòng ban này hiện chưa có idol hay nghệ sĩ trực thuộc.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // Department with sub-groups: Render tree accordion for each sub-group
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-rose-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Cây Cơ Cấu: Các Nhóm Trực Thuộc & Nhân Sự ({subGroups.length} nhóm)
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Phòng ban mẹ ➔ Nhóm chuyên môn ➔ Idol & nhân sự
                      </span>
                    </div>

                    {subGroups.map((sg) => {
                      const sgIdols = getIdolsForUnit(sg).filter((i) => {
                        if (!deptPersonnelSearch) return true;
                        const term = deptPersonnelSearch.toLowerCase();
                        return (
                          i.stageName.toLowerCase().includes(term) ||
                          i.realName.toLowerCase().includes(term) ||
                          (i.role && i.role.toLowerCase().includes(term)) ||
                          (i.personnelType && i.personnelType.toLowerCase().includes(term))
                        );
                      });
                      const sgStaff = getStaffAccountsForUnit(sg).filter((u) => {
                        if (!deptPersonnelSearch) return true;
                        const term = deptPersonnelSearch.toLowerCase();
                        return (
                          u.name.toLowerCase().includes(term) ||
                          u.username.toLowerCase().includes(term) ||
                          u.roleTitle.toLowerCase().includes(term)
                        );
                      });
                      const totalSgMembers = sgIdols.length + sgStaff.length;
                      const isEditing = editingDept?.oldName === sg;

                      return (
                        <div
                          key={sg}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
                        >
                          {/* Sub-group Header */}
                          <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                <CornerDownRight className="w-4 h-4" />
                              </div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingDept.newName}
                                  onChange={(e) =>
                                    setEditingDept({ ...editingDept, newName: e.target.value })
                                  }
                                  className="px-2 py-1 text-xs border border-sky-400 rounded-md focus:outline-none bg-white font-bold"
                                  autoFocus
                                />
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-xs font-bold text-slate-900">{sg}</h5>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                      Nhóm Cấp 2
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {totalSgMembers} thành viên ({sgStaff.length} cán bộ, {sgIdols.length} idol)
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Sub-group Actions */}
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (!editingDept.newName.trim()) return;
                                      await onUpdateDepartment(editingDept.oldName, editingDept.newName.trim());
                                      const newMap = { ...departmentParentMap };
                                      const p = newMap[editingDept.oldName] || selectedDeptDetail;
                                      delete newMap[editingDept.oldName];
                                      newMap[editingDept.newName.trim()] = p;
                                      await onUpdateSettings({ departmentParentMap: newMap });
                                      setEditingDept(null);
                                    }}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Lưu tên nhóm"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingDept(null)}
                                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                    title="Hủy"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingDept({ oldName: sg, newName: sg })}
                                    className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                    title="Đổi tên nhóm"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!await confirmDialog(`Bạn có chắc muốn xóa nhóm "${sg}"?`, 'Xóa nhóm')) return;
                                      await onDeleteDepartment(sg);
                                      const newMap = { ...departmentParentMap };
                                      delete newMap[sg];
                                      await onUpdateSettings({ departmentParentMap: newMap });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                    title="Xóa nhóm"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Member Roster inside this Sub-group */}
                          <div className="p-4">
                            {totalSgMembers > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {/* Idols in this group */}
                                {sgIdols.map((i) => (
                                  <div
                                    key={i.id}
                                    className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-rose-200 hover:shadow-xs transition-all flex items-start gap-2.5"
                                  >
                                    <img
                                      src={i.avatarUrl || DEFAULT_BLANK_AVATAR}
                                      alt={i.stageName}
                                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <h6 className="text-xs font-bold text-slate-900 truncate">{i.stageName}</h6>
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                                          {i.role || i.personnelType || 'Idol'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 truncate">{i.realName}</p>
                                      <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                                        <span className="text-slate-500 font-medium">
                                          {calculateTenure(i.joinDate).formattedText}
                                        </span>
                                        <span className="text-emerald-700 font-bold">
                                          {i.status || 'Hoạt động'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Staff in this group (if any) */}
                                {sgStaff.map((u) => (
                                  <div
                                    key={u.id}
                                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:shadow-xs transition-all flex items-start gap-2.5"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h6 className="text-xs font-bold text-slate-900 truncate">{u.name}</h6>
                                      <p className="text-[10px] text-amber-800 font-semibold truncate">{u.roleTitle}</p>
                                      <p className="text-[9px] text-slate-500 truncate">Cán bộ phụ trách nhóm</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2">
                                Nhóm này hiện chưa có thành viên nào. Bạn có thể thêm idol hoặc đổi phòng ban của idol sang nhóm này.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: STATUSES */}
      {effectiveSubTab === 'statuses' && currentUser.isSuperAdmin && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
                placeholder="Tìm trạng thái..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="Tên trạng thái mới..."
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white flex-1 sm:w-60"
              />
              <button
                onClick={async () => {
                  if (!newStatusName.trim()) return;
                  await onAddStatus(newStatusName.trim());
                  setNewStatusName('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Trạng Thái</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStatuses.map((st) => {
              const count = statusCounts[st] || 0;
              const isEditing = editingStatus?.oldName === st;

              return (
                <div
                  key={st}
                  className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingStatus.newName}
                          onChange={(e) =>
                            setEditingStatus({ ...editingStatus, newName: e.target.value })
                          }
                          className="px-2 py-1 text-xs border border-rose-400 rounded-md focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{st}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {count} nhân sự đang áp dụng
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={async () => {
                              if (!editingStatus.newName.trim()) return;
                              await onUpdateStatus(editingStatus.oldName, editingStatus.newName.trim());
                              setEditingStatus(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Lưu tên mới"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStatus(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Hủy"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingStatus({ oldName: st, newName: st })}
                            className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors"
                            title="Đổi tên trạng thái"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteStatus(st)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Xóa trạng thái"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CRITERIA & SCORING SETTINGS */}
      {effectiveSubTab === 'criteria' && canManageCriteria && (
        !canManageCriteria ? (
          <div className="bg-white rounded-xl border border-amber-200 p-8 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Quyền Hạn Bị Giới Hạn</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Chỉ Quản Trị Viên (Super Admin) hoặc tài khoản được quản trị viên cấp quyền "Quản lý Tiêu chí" mới có thể thêm, chỉnh sửa hoặc xóa tiêu chí đánh giá.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={critSearch}
                onChange={(e) => setCritSearch(e.target.value)}
                placeholder="Tìm tiêu chí đánh giá..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <button
              onClick={() => {
                setIsNewCrit(true);
                setEditingCrit({
                  name: '',
                  code: `CRIT_${Date.now().toString().slice(-4)}`,
                  maxScore: 100,
                  weight: 20,
                  description: ''
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Tiêu Chí Mới</span>
            </button>
          </div>

          {/* Criteria Cards */}
          <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Danh Sách Tiêu Chí & Thứ Tự Ưu Tiên Xếp Hạng (Tie-Breaker)</span>
              <span>Tổng số: {criteria.length} tiêu chí</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredCriteria
                .sort((a, b) => a.priorityOrder - b.priorityOrder)
                .map((crit, idx) => (
                  <div
                    key={crit.id}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        #{crit.priorityOrder || idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{crit.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {crit.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                          <span>Điểm tối đa: {crit.maxScore}</span>
                          <span>Trọng số: {crit.weight}%</span>
                          {crit.description && <span className="italic">{crit.description}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => movePriority(crit.id, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                        title="Đẩy lên mức ưu tiên cao hơn"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => movePriority(crit.id, 'down')}
                        disabled={idx === criteria.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                        title="Hạ mức ưu tiên xuống"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsNewCrit(false);
                          setEditingCrit(crit);
                        }}
                        className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                        title="Chỉnh sửa tiêu chí"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCritToDelete(crit)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Xóa tiêu chí"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        )
      )}

      {/* SUB-TAB 6: SYSTEM SETTINGS */}
      {effectiveSubTab === 'settings' && currentUser.isSuperAdmin && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Cấu Hình Toàn Hệ Thống</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tùy biến tên banner, biểu ngữ khẩu hiệu, logo công ty, mốc tính tuổi tròn & thâm niên chính xác cả ngày và phương thức tính điểm.
            </p>
          </div>

          {/* Section 1: Company Logo & Brand Banner */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-rose-50/30 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Nhận Diện Thương Hiệu & Banner</h4>
                <p className="text-[11px] text-slate-500">Đổi logo công ty, tên thương hiệu bên trên và khẩu hiệu biểu ngữ thanh điều hướng</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên Thương Hiệu (Banner Title)
                </label>
                <input
                  type="text"
                  value={localBrandName}
                  onChange={(e) => setLocalBrandName(e.target.value)}
                  placeholder="VD: AURA TALENT"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Hiển thị nổi bật ở thanh trên cùng (Navbar)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Biểu Ngữ / Khẩu Hiệu (Tagline)
                </label>
                <input
                  type="text"
                  value={localBrandTagline}
                  onChange={(e) => setLocalBrandTagline(e.target.value)}
                  placeholder="VD: Idol Agency OS"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Khẩu hiệu / mô tả phụ nằm dưới tên thương hiệu</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Logo Công Ty (URL Hình Ảnh)
                </label>
                <input
                  type="text"
                  value={localBrandLogoUrl}
                  onChange={(e) => setLocalBrandLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png (hoặc để trống)"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Để trống sẽ dùng biểu tượng mặc định</span>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>Xem trước Banner thanh trên cùng (Live Navbar Preview):</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 max-w-sm">
                {localBrandLogoUrl ? (
                  <img
                    src={localBrandLogoUrl}
                    alt="Logo Preview"
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-black tracking-tight text-slate-900 leading-none">
                    {localBrandName || 'AURA TALENT'}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 tracking-wide mt-0.5 leading-none">
                    {localBrandTagline || 'Idol Agency OS'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Exact Reference Date & Score Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Exact Date Reference */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <label className="text-xs font-bold text-slate-800">
                  Mốc Thời Gian Chuẩn Hệ Thống (Thời Gian Hiện Tại)
                </label>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300">
                  <input
                    type="radio"
                    name="refDateChoice"
                    checked={localUseCurrentDate}
                    onChange={() => {
                      setLocalUseCurrentDate(true);
                      setReferenceClockTouched(true);
                    }}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div>
                    <strong className="text-slate-900">Mặc định: Lấy ngày hiện tại thực tế làm chuẩn</strong>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Hôm nay: <span className="font-mono font-bold text-rose-600">{formatDateVN(getTodayIsoDate(''))}</span> (Tự động cập nhật theo thời gian thực)
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300">
                  <input
                    type="radio"
                    name="refDateChoice"
                    checked={!localUseCurrentDate}
                    onChange={() => {
                      setLocalUseCurrentDate(false);
                      setReferenceClockTouched(true);
                      if (!localRefDate) setLocalRefDate(getTodayIsoDate());
                    }}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div className="flex-1">
                    <strong className="text-slate-900">Tùy chọn: Chọn ngày, tháng, năm làm mốc hiện tại toàn hệ thống</strong>
                    <div className="text-[11px] text-slate-500 mt-0.5 mb-2">
                      Ngày này sẽ được coi như thời gian hiện tại: tự động điền ngày gia nhập (joinDate) khi tạo nhân sự/Idol mới, ngày tạo đơn nghỉ phép, ca trực, hạn nhiệm vụ, tính tuổi tròn và thâm niên.
                    </div>
                    {!localUseCurrentDate && (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <div className="block space-y-1 text-[11px] font-semibold text-slate-600">
                            <span>Ngày mốc (ngày bắt đầu)</span>
                            <DateInput
                              value={localRefDate || getTodayIsoDate()}
                              onChange={(value) => {
                                setLocalRefDate(value);
                                setReferenceClockTouched(true);
                              }}
                              aria-label="Ngày mốc bắt đầu"
                              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono font-semibold"
                            />
                          </div>
                          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-slate-700" aria-live="polite">
                            <div className="font-semibold text-slate-600">Ngày hệ thống hiện tại (đã lưu)</div>
                            <div className="font-mono font-bold text-sky-800">
                              {formatDateVN(getTodayIsoDate(settings.referenceDate, settings.referenceTime, settings.referenceClockAnchorAt))}
                            </div>
                          </div>
                        </div>
                        {localRefDate !== (settings.referenceDate || '') && (
                          <p className="text-[11px] text-amber-700">Ngày mốc mới sẽ có hiệu lực sau khi lưu cài đặt.</p>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                <strong>Quy chuẩn hệ thống:</strong> Toàn bộ thao tác thêm mới nhân sự/Idol sẽ nhận ngày này làm Ngày gia nhập mặc định. Tuổi tròn và thâm niên công tác cũng được tính toán chính xác tới từng ngày dựa trên mốc này.
              </div>
            </div>

            {/* Score Calculation Mode */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Phương Thức Tính Tổng Điểm (Calculation Mode)
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-white border border-slate-200">
                  <input
                    type="radio"
                    name="calcMode"
                    value="sum"
                    checked={localCalcMode === 'sum'}
                    onChange={() => setLocalCalcMode('sum')}
                    className="accent-rose-600"
                  />
                  <span>
                    <strong>Cộng dồn điểm các tiêu chí (Sum)</strong> (Ví dụ: 96 + 88 + 95 + 92 + 94 = 465)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg bg-white border border-slate-200">
                  <input
                    type="radio"
                    name="calcMode"
                    value="weighted"
                    checked={localCalcMode === 'weighted'}
                    onChange={() => setLocalCalcMode('weighted')}
                    className="accent-rose-600"
                  />
                  <span>
                    <strong>Tính theo trọng số % (Weighted)</strong> (Quy về thang 100 điểm)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {settingsSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Đã lưu thành công!</span>
              </span>
            )}
            <button
              onClick={handleSaveAllSettings}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Đang lưu...' : 'Lưu Thay Đổi Cài Đặt'}</span>
            </button>
          </div>

          {/* Section 4: Vùng Nguy Hiểm (Danger Zone) - Khôi Phục Dữ Liệu Ban Đầu */}
          {(currentUser.isSuperAdmin || currentUser.role === 'super_admin') && onResetData && (
            <div className="mt-8 p-5 bg-gradient-to-br from-rose-50/70 via-red-50/30 to-amber-50/20 border-2 border-dashed border-rose-300 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-2">
                      <span>Vùng Nguy Hiểm (Danger Zone)</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                        Chỉ Super Admin
                      </span>
                    </h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Khôi phục toàn bộ danh sách nhân sự, bảng điểm, tiêu chí và dữ liệu hệ thống về mẫu ban đầu.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onResetData}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi Phục Dữ Liệu Ban Đầu</span>
                </button>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-rose-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cảnh báo an toàn:</strong> Khi nhấn nút, hệ thống sẽ yêu cầu bạn <strong>gõ chữ xác nhận 2 bước</strong> để tránh bấm nhầm. Toàn bộ các thay đổi tự tạo trước đó sẽ được thay thế bằng bộ dữ liệu chuẩn mẫu của công ty.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 7: ROSTER DISPLAY / COLUMN HEADERS */}
      {effectiveSubTab === 'column_headers' && currentUser.isSuperAdmin && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Hiển Thị Danh Sách Nhân Sự</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đổi tên các cột hiển thị trên bảng danh sách nhân sự mà không ảnh hưởng đến dữ liệu gốc.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-slate-800 mb-1">Tên cột danh sách nhân sự</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Các thay đổi sẽ áp dụng cho bảng roster trên toàn hệ thống.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(localHeaders).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{key}</span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setLocalHeaders({ ...localHeaders, [key]: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {canManagePersonnelColumns && (
            <div className="p-4 border border-indigo-200 bg-indigo-50/40 rounded-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Cấu hình cột nhân sự động</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Thêm, sửa, sắp xếp hoặc ngừng sử dụng cột mà không xóa dữ liệu cũ.</p>
                </div>
                <button type="button" onClick={resetPersonnelColumnDraft} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Thêm cột
                </button>
              </div>

              {personnelColumnError && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{personnelColumnError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <label className="text-xs font-semibold text-slate-700">Key bất biến
                  <input value={String(personnelColumnDraft.key || '')} disabled={!!editingPersonnelColumn?.isSystem || !!editingPersonnelColumn} onChange={(e) => setPersonnelColumnDraft({ ...personnelColumnDraft, key: e.target.value })} placeholder="maritalStatus" className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg disabled:bg-slate-100" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Tên hiển thị
                  <input value={String(personnelColumnDraft.label || '')} onChange={(e) => setPersonnelColumnDraft({ ...personnelColumnDraft, label: e.target.value })} placeholder="Tình trạng hôn nhân" className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Kiểu dữ liệu
                  <select value={personnelColumnDraft.type || 'text'} disabled={!!editingPersonnelColumn?.isSystem} onChange={(e) => setPersonnelColumnDraft({ ...personnelColumnDraft, type: e.target.value as PersonnelColumnType })} className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg disabled:bg-slate-100">
                    <option value="text">Văn bản</option><option value="number">Số</option><option value="date">Ngày</option><option value="select">Danh sách lựa chọn</option><option value="boolean">Có/Không</option>
                  </select>
                </label>
                {personnelColumnDraft.type === 'select' && (
                  <label className="text-xs font-semibold text-slate-700">Options, phân cách bằng dấu phẩy
                    <input value={Array.isArray(personnelColumnDraft.options) ? personnelColumnDraft.options.join(', ') : String(personnelColumnDraft.options || '')} onChange={(e) => setPersonnelColumnDraft({ ...personnelColumnDraft, options: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Độc thân, Có gia đình" className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg" />
                  </label>
                )}
                <label className="text-xs font-semibold text-slate-700">Mức độ nhạy cảm
                  <select value={personnelColumnDraft.sensitivity || 'public'} onChange={(e) => setPersonnelColumnDraft({ ...personnelColumnDraft, sensitivity: e.target.value as PersonnelColumn['sensitivity'] })} className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg">
                    <option value="public">Công khai</option>
                    <option value="internal">Nội bộ (người dùng đã đăng nhập)</option>
                    <option value="sensitive">Nhạy cảm (Super Admin / Giám đốc / HR)</option>
                  </select>
                </label>
                <div className="lg:col-span-2 flex flex-wrap gap-4 text-xs text-slate-700">
                  {([['required', 'Bắt buộc'], ['showInRoster', 'Hiện ở danh sách'], ['showInProfile', 'Hiện ở hồ sơ']] as const).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={Boolean(personnelColumnDraft[key])} onChange={(e) => setPersonnelColumnDraft({ ...personnelColumnDraft, [key]: e.target.checked })} />{label}</label>
                  ))}
                </div>
                <div className="lg:col-span-2 flex justify-end gap-2">
                  {editingPersonnelColumn && <button type="button" onClick={resetPersonnelColumnDraft} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg">Hủy sửa</button>}
                  <button type="button" onClick={handleSavePersonnelColumn} disabled={loadingPersonnelColumns} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"><Save className="w-3.5 h-3.5" />{editingPersonnelColumn ? 'Lưu thay đổi' : 'Tạo cột'}</button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                {loadingPersonnelColumns ? <div className="p-6 text-center text-xs text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin mr-1" /> Đang tải cấu hình cột...</div> : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2 text-left">Thứ tự</th><th className="p-2 text-left">Key / Tên cột</th><th className="p-2 text-left">Kiểu</th><th className="p-2 text-left">Bảo mật</th><th className="p-2 text-left">Hiển thị</th><th className="p-2 text-right">Thao tác</th></tr></thead>
                    <tbody>{personnelColumns.map((column, index) => <tr key={column.id} className={`border-t border-slate-100 ${!column.isActive ? 'opacity-50' : ''}`}>
                      <td className="p-2 font-mono text-slate-500">{column.sortOrder}</td>
                      <td className="p-2"><div className="font-semibold text-slate-800">{column.label} {column.isSystem && <span className="ml-1 text-[10px] text-indigo-600">Hệ thống</span>}</div><div className="font-mono text-[10px] text-slate-400">{column.key}</div></td>
                      <td className="p-2 text-slate-600">{column.type}{column.required ? ' • bắt buộc' : ''}</td>
                      <td className="p-2 text-slate-600">{column.sensitivity === 'sensitive' ? 'Nhạy cảm' : column.sensitivity === 'internal' ? 'Nội bộ' : 'Công khai'}</td>
                      <td className="p-2 text-slate-600">{column.isActive ? `${column.showInRoster ? 'Danh sách' : ''}${column.showInRoster && column.showInProfile ? ' + ' : ''}${column.showInProfile ? 'Hồ sơ' : ''}` || 'Không hiển thị' : 'Đã lưu trữ'}</td>
                      <td className="p-2"><div className="flex justify-end items-center gap-1">
                        {column.isActive && <><button type="button" title="Đưa lên" disabled={index === 0} onClick={() => void movePersonnelColumn(column, -1)} className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button><button type="button" title="Đưa xuống" disabled={index === personnelColumns.filter((item) => item.isActive).length - 1} onClick={() => void movePersonnelColumn(column, 1)} className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button></>}
                        <button type="button" title="Sửa" onClick={() => { setEditingPersonnelColumn(column); setPersonnelColumnDraft({ ...column }); }} className="p-1.5 text-slate-500 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                        {!column.isSystem && <button type="button" onClick={() => void handleArchiveOrRestorePersonnelColumn(column)} className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded">{column.isActive ? 'Ngừng dùng' : 'Khôi phục'}</button>}
                      </div></td>
                    </tr>)}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {settingsSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Đã lưu thành công!</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveColumnHeaders}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Đang lưu...' : 'Lưu Tên Cột'}</span>
            </button>
          </div>
        </div>
      )}

      {/* USER EDIT / CREATE MODAL */}
      {/* USER EDIT / CREATE MODAL (Wide 2-Column Layout, Fixed Header/Footer, No Scroll Cutoff) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* 1. FIXED HEADER */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {editingUser.id ? `Chỉnh Sửa Tài Khoản: ${editingUser.name}` : 'Tạo Tài Khoản Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {editingUser.username ? `@${editingUser.username} · ${editingUser.email || 'Chưa có email'}` : 'Thiết lập quyền truy cập và phân vai trò'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-xl cursor-pointer transition-colors"
                title="Đóng"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* 2. SCROLLABLE BODY: 2 COLUMNS */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Role Template Selector */}
              <div className="p-4 bg-gradient-to-r from-rose-50/80 via-pink-50/40 to-amber-50/50 border border-rose-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>Chọn Mẫu Vai Trò Theo Phòng Ban (Role Template)</span>
                  </label>
                  <span className="text-[10px] text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200 font-semibold shadow-2xs">
                    Tự động gán quyền chuẩn
                  </span>
                </div>

                <select
                  onChange={(e) => {
                    const preset = ROLE_PRESETS.find((p) => p.id === e.target.value);
                    if (preset) {
                      setEditingUser({
                        ...editingUser,
                        roleTitle: preset.roleTitle,
                        role: preset.role,
                        department: preset.department,
                        // Leadership presets grant Business Super Admin to
                        // personnel accounts; the root System Admin flag is
                        // reserved for the standalone system account.
                        isSuperAdmin: false,
                        isBusinessAdmin: !!preset.isSuperAdmin,
                        allowedTabs: [...preset.defaultTabs],
                        allowedActions: [...preset.defaultActions],
                        allowedDepartments: [...preset.defaultDepartments]
                      });
                    }
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800 cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>-- Chọn chức danh để nạp quyền mặc định nhanh --</option>
                  
                  <optgroup label="👑 Ban Giám Đốc">
                    {ROLE_PRESETS.filter(p => p.category === 'leadership').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>

                  <optgroup label="🌟 Quản Lý & Phát Triển Idol (QLPTL)">
                    {ROLE_PRESETS.filter(p => p.category === 'talent_management').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>

                  <optgroup label="🎯 4 Nhóm Chuyên Môn Trực Thuộc">
                    {ROLE_PRESETS.filter(p => p.category === 'specialized_group').map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.department})</option>
                    ))}
                  </optgroup>

                  <optgroup label="🤝 Khối Phòng Ban Hỗ Trợ Dùng Chung">
                    {ROLE_PRESETS.filter(p => p.category === 'shared_support').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                </select>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  💡 <em>Chọn mẫu vai trò sẽ tự động tích các Tab, Quyền thao tác và Phòng ban mặc định. Sau đó Giám Đốc có thể tick thêm hoặc bỏ bớt bất kỳ quyền nào bên dưới.</em>
                </p>
              </div>

              {/* 2 Columns Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (5/12 cols): Identity, Department & Scope */}
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-rose-500" />
                    <span>Thông Tin Tài Khoản & Đơn Vị</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Họ & Tên
                      </label>
                      <input
                        type="text"
                        value={editingUser.name || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tên Đăng Nhập
                      </label>
                      <input
                        type="text"
                        value={editingUser.username || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Chức Danh / Vai Trò Hiển Thị
                      </label>
                      <input
                        type="text"
                        value={editingUser.roleTitle || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, roleTitle: e.target.value })}
                        placeholder="VD: Quản Lý Nghệ Sĩ, Huấn Luyện Viên..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phòng Ban Trực Thuộc (Tổ Chức)
                      </label>
                      <select
                        value={editingUser.department || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="">-- Chưa gán phòng ban --</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mật Khẩu {editingUser.id && '(để trống nếu không đổi)'}
                      </label>
                      <input
                        type="password"
                        value={userFormPassword}
                        onChange={(e) => setUserFormPassword(e.target.value)}
                        placeholder={editingUser.id ? 'Giữ nguyên mật khẩu cũ' : 'Nhập mật khẩu...'}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                      />
                    </div>

                    {/* System Admin assignment */}
                    <div className="pt-2">
                      {editingUser.username?.toLowerCase() !== 'admin' && editingUser.id !== 'user-01' && (
                        <label className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-xs font-semibold text-slate-800 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={editingUser.accountType === 'system_admin'}
                            onChange={(e) => setEditingUser({
                              ...editingUser,
                              accountType: e.target.checked ? 'system_admin' : 'personnel',
                              isSuperAdmin: e.target.checked,
                              ...(e.target.checked ? { isBusinessAdmin: false, allowedDepartments: ['*'] } : {})
                            })}
                            className="accent-amber-600 rounded"
                          />
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">Giờ chuẩn
                          <input type="time" value={localRefTime || '08:00'} onChange={(event) => setLocalRefTime(event.target.value)} className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono font-semibold" aria-label="Giờ chuẩn hệ thống" />
                        </label>
                          <span>System Admin (full system access)</span>
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                        </label>
                      )}
                    </div>

                    {/* Business Super Admin Checkbox */}
                    <div className="pt-2">
                      {editingUser.username?.toLowerCase() === 'admin' || editingUser.id === 'user-01' ? (
                        <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none">
                            <input
                              type="checkbox"
                              checked={true}
                              disabled={true}
                              className="accent-rose-600 rounded cursor-not-allowed"
                            />
                            <span className="flex items-center gap-1.5 font-bold text-amber-900">
                              <span>System Admin (Toàn quyền root)</span>
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                            </span>
                          </label>
                          <p className="text-[10px] text-amber-700 leading-relaxed">
                            <strong>Khóa cố định:</strong> Đây là tài khoản System Admin. Tài khoản root không được gắn hồ sơ nhân sự hoặc hạ quyền từ màn hình nghiệp vụ.
                          </p>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={!!editingUser.isBusinessAdmin}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, isBusinessAdmin: e.target.checked })
                            }
                            className="accent-rose-600 rounded"
                          />
                          <span>Đặt làm Business Super Admin (toàn quyền nghiệp vụ)</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Department Permission Scope */}
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-sky-600" />
                        <span>Phân Quyền Đơn Vị Được Xem</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const isAll = editingUser.allowedDepartments?.includes('*');
                          setEditingUser({
                            ...editingUser,
                            allowedDepartments: isAll ? [departments[0]] : ['*']
                          });
                        }}
                        className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
                      >
                        {editingUser.allowedDepartments?.includes('*')
                          ? 'Chỉ định đơn vị cụ thể'
                          : 'Cho phép xem tất cả (*)'}
                      </button>
                    </div>

                    {editingUser.allowedDepartments?.includes('*') ? (
                      <p className="text-xs text-sky-700 bg-white p-2.5 rounded-xl border border-sky-100 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Tài khoản này được xem nhân sự của <strong>TẤT CẢ các đơn vị</strong>.</span>
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pt-1">
                        {departments.map((dept) => {
                          const checked = editingUser.allowedDepartments?.includes(dept);
                          return (
                            <label
                              key={dept}
                              className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer ${
                                checked
                                  ? 'bg-white border-sky-300 text-sky-900 font-medium'
                                  : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const cur = editingUser.allowedDepartments || [];
                                  if (e.target.checked) {
                                    setEditingUser({
                                      ...editingUser,
                                      allowedDepartments: [...cur.filter((d) => d !== '*'), dept]
                                    });
                                  } else {
                                    setEditingUser({
                                      ...editingUser,
                                      allowedDepartments: cur.filter((d) => d !== dept)
                                    });
                                  }
                                }}
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

                {/* Right Column (7/12 cols): Tab & Action Permissions */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Tab Permissions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-rose-600" />
                        <span>Các Mục Được Phép Xem & Truy Cập (Tabs)</span>
                      </label>
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        {editingUser.allowedTabs?.length || 0} / {TAB_OPTIONS.length} mục
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TAB_OPTIONS.map((t) => {
                        const checked = editingUser.allowedTabs?.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center gap-2.5 text-xs p-2.5 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-rose-50/70 text-rose-950 border-rose-300 font-semibold shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const cur = editingUser.allowedTabs || [];
                                if (e.target.checked) {
                                  setEditingUser({ ...editingUser, allowedTabs: [...cur, t.id] });
                                } else {
                                  setEditingUser({
                                    ...editingUser,
                                    allowedTabs: cur.filter((x) => x !== t.id)
                                  });
                                }
                              }}
                              className="accent-rose-600 rounded"
                            />
                            <span className="truncate">{t.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Permissions */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-indigo-600" />
                        <span>Hành Động Thao Tác Được Phép (Actions)</span>
                      </label>
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {editingUser.allowedActions?.length || 0} / {ACTION_OPTIONS.length} quyền
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ACTION_OPTIONS.map((a) => {
                        const checked = editingUser.allowedActions?.includes(a.id);
                        return (
                          <label
                            key={a.id}
                            className={`flex items-center gap-2.5 text-xs p-2.5 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-indigo-50/70 text-indigo-950 border-indigo-300 font-semibold shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const cur = editingUser.allowedActions || [];
                                if (e.target.checked) {
                                  setEditingUser({ ...editingUser, allowedActions: [...cur, a.id] });
                                } else {
                                  setEditingUser({
                                    ...editingUser,
                                    allowedActions: cur.filter((x) => x !== a.id)
                                  });
                                }
                              }}
                              className="accent-indigo-600 rounded"
                            />
                            <span className="truncate">{a.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FIXED FOOTER */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingUser.name || !editingUser.username) {
                    notify('Vui lòng nhập Họ tên và Tên đăng nhập', 'warning');
                    return;
                  }
                  try {
                    if (editingUser.accountType === 'system_admin') {
                      const confirmed = await confirmDialog(
                        `CẢNH BÁO QUYỀN HỆ THỐNG\n\n` +
                        `Bạn đang cấp System Admin cho tài khoản "${editingUser.username}".\n` +
                        `Tài khoản này sẽ có toàn quyền quản trị, phân quyền và cấu hình toàn hệ thống.\n\n` +
                        `Bạn có chắc chắn muốn tiếp tục?`,
                        'Cấp System Admin'
                      );
                      if (!confirmed) return;
                    } else if (editingUser.isBusinessAdmin) {
                      const confirmed = await confirmDialog(
                        `CẢNH BÁO QUYỀN NHẠY CẢM\n\n` +
                        `Bạn đang cấp Business Super Admin cho tài khoản "${editingUser.username}".\n` +
                        `Tài khoản này sẽ có toàn quyền nghiệp vụ (nhân sự, phê duyệt, payroll, KPI, doanh thu và tài chính), ` +
                        `nhưng không có quyền System Admin root.\n\n` +
                        `Sau này bước xác nhận này sẽ được thay bằng OTP gửi qua kênh bảo mật.\n\n` +
                        `Bạn có chắc chắn muốn tiếp tục?`
                      );
                      if (!confirmed) return;
                    }
                    setSavingUser(true);
                    const payload: Partial<UserAccount> = {
                      ...editingUser,
                      ...(userFormPassword ? { password: userFormPassword } : {})
                    };
                    await onSaveUser(payload);
                    setEditingUser(null);
                  } catch (err: any) {
                      notify(err.message || 'Lỗi lưu tài khoản', 'error');
                  } finally {
                    setSavingUser(false);
                  }
                }}
                disabled={savingUser}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingUser ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRITERION MODAL */}
      {editingCrit && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {isNewCrit ? 'Thêm Tiêu Chí Đánh Giá Mới' : `Sửa Tiêu Chí: ${editingCrit.name}`}
              </h3>
              <button
                onClick={() => setEditingCrit(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Tiêu Chí
                </label>
                <input
                  type="text"
                  value={editingCrit.name || ''}
                  onChange={(e) => setEditingCrit({ ...editingCrit, name: e.target.value })}
                  placeholder="VD: Thanh Nhạc & Live Performance..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm Tối Đa
                  </label>
                  <input
                    type="number"
                    value={editingCrit.maxScore || 100}
                    onChange={(e) =>
                      setEditingCrit({ ...editingCrit, maxScore: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trọng Số (%)
                  </label>
                  <input
                    type="number"
                    value={editingCrit.weight || 20}
                    onChange={(e) =>
                      setEditingCrit({ ...editingCrit, weight: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả Tiêu Chí
                </label>
                <textarea
                  rows={2}
                  value={editingCrit.description || ''}
                  onChange={(e) => setEditingCrit({ ...editingCrit, description: e.target.value })}
                  placeholder="Ghi chú về chuẩn mực chấm..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingCrit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!editingCrit.name?.trim()) return;
                  if (isNewCrit) {
                    await onCreateCriterion(editingCrit);
                  } else if (editingCrit.id) {
                    await onUpdateCriterion(editingCrit.id, editingCrit);
                  }
                  setEditingCrit(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Lưu Tiêu Chí
              </button>
            </div>
          </div>
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
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {selectedApprDetail.targetName}
                  </h4>
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
                  <span className="font-semibold text-slate-800">
                    {formatDateVN(selectedApprDetail.data?.dob) || 'N/A'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Nghề nghiệp / Vai trò</span>
                  <span className="font-semibold text-slate-800">
                    {selectedApprDetail.data?.role || 'N/A'}
                  </span>
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
                  <span className="text-slate-400 block text-[10px] mb-0.5">Tiểu sử & Giới thiệu</span>
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
                onClick={() => setSelectedApprDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Đóng
              </button>
              {selectedApprDetail.status === 'pending' && (
                <>
                  <button
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
                  {approvalModal.mode === 'approve' ? 'Ghi chú phê duyệt của Ban Quản Trị:' : 'Lý do từ chối yêu cầu:'}
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
                onClick={() => setApprovalModal(null)}
                disabled={processingApprId === approvalModal.request.id}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
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

      {/* Leave Request Approval / Rejection Modal */}
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
                onClick={() => setLeaveActionModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Request Info Card */}
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

              {/* Policy Restriction Check */}
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

      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Thêm phòng ban / nhóm</h3>
                <p className="mt-1 text-xs text-slate-500">Chọn đúng cấp cơ cấu trước khi tạo đơn vị mới.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-4 p-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const name = newDeptName.trim();
                if (!name) return;
                await onAddDepartment(name);
                if (newDeptParent) {
                  await onUpdateSettings({
                    departmentParentMap: { ...departmentParentMap, [name]: newDeptParent }
                  });
                }
                setNewDeptName('');
                setNewDeptParent('');
                setIsAddUnitModalOpen(false);
              }}
            >
              <label className="block text-xs font-bold text-slate-700">
                Tên phòng ban / nhóm
                <input
                  autoFocus
                  type="text"
                  value={newDeptName}
                  onChange={(event) => setNewDeptName(event.target.value)}
                  placeholder="Ví dụ: Hành chính - Hậu cần"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Cấp cơ cấu
                <select
                  value={newDeptParent}
                  onChange={(event) => setNewDeptParent(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
                >
                  <option value="">Phòng ban cấp 1 (độc lập)</option>
                  {mainDepartments.map((department) => (
                    <option key={department} value={department}>
                      Nhóm trực thuộc: {department}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newDeptName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Criterion In-App Confirmation Modal (Replaces window.confirm) */}
      {critToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0 my-auto">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Tiêu Chí</h3>
                <p className="text-xs text-slate-500">Thao tác quản lý cấu hình tiêu chí chấm điểm</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa tiêu chí <strong className="text-slate-900 font-bold">"{critToDelete.name}"</strong> (Mã: {critToDelete.code})?
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Lưu ý quan trọng:</strong> Khi xóa tiêu chí này, toàn bộ điểm số của các nghệ sĩ đã chấm theo tiêu chí này trong tất cả các tháng, các quý và tổng kết sẽ được gỡ bỏ khỏi bảng điểm và bảng xếp hạng.
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCritToDelete(null)}
                disabled={isDeletingCrit}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteCrit}
                disabled={isDeletingCrit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingCrit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Xóa Vĩnh Viễn</span>
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
