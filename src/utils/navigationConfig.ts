import type React from 'react';
import {
  Award,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckSquare,
  Coins,
  FileText,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import type { AppTabPermission, UserAccount } from '../types/index.ts';
import type { NavTab } from '../components/Navbar.tsx';
import { canAccessAdminPortal, canAccessApprovalCenter } from './adminAccess.ts';

export interface NavSubItemConfig {
  tab: NavTab;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  badge?: string | number;
}

export interface NavGroupConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  items: NavSubItemConfig[];
}

export function canViewSystemSettings(currentUser: UserAccount | null | undefined): boolean {
  return Boolean(
    currentUser?.accountType === 'system_admin' ||
      currentUser?.isSuperAdmin ||
      currentUser?.roleCodes?.includes('system_admin'),
  );
}

export function canAccessNavTab(
  currentUser: UserAccount | null | undefined,
  tab: AppTabPermission,
): boolean {
  const allowedTabs: AppTabPermission[] = currentUser?.allowedTabs || [
    'roster',
    'scoring',
    'leaderboard',
    'schedule',
    'tasks',
    'analytics',
  ];

  // Scoring and Leaderboard are currently restricted to Super Admin
  if (tab === 'scoring' || tab === 'leaderboard') {
    return !!(currentUser?.isSuperAdmin || currentUser?.role === 'super_admin');
  }

  if (tab === 'payroll') {
    return !!(
      currentUser?.isSuperAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'director' ||
      currentUser?.allowedTabs?.includes('payroll') ||
      currentUser?.department?.includes('Kế Toán') ||
      currentUser?.department?.includes('HR') ||
      currentUser?.roleTitle?.includes('Kế toán') ||
      currentUser?.roleTitle?.includes('Nhân Sự')
    );
  }

  if (tab === 'payroll_disputes') {
    return !!(
      currentUser?.isSuperAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'director' ||
      currentUser?.allowedTabs?.includes('payroll_disputes') ||
      currentUser?.allowedTabs?.includes('payroll') ||
      currentUser?.allowedActions?.includes('manage_payroll') ||
      currentUser?.allowedActions?.includes('adjust_payroll') ||
      currentUser?.allowedActions?.includes('approve_payroll') ||
      currentUser?.department?.includes('Kế Toán') ||
      currentUser?.department?.includes('HR') ||
      currentUser?.roleTitle?.includes('Kế toán') ||
      currentUser?.roleTitle?.includes('Nhân sự')
    );
  }

  if (tab === 'finance') {
    return !!(
      currentUser?.isSuperAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'director' ||
      currentUser?.allowedTabs?.includes('finance') ||
      currentUser?.department?.includes('Kế Toán') ||
      currentUser?.roleTitle?.includes('Kế toán') ||
      currentUser?.roleTitle?.includes('Giám Đốc')
    );
  }

  if (tab === 'work_assignments') {
    return !!(
      currentUser?.isSuperAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'director' ||
      currentUser?.role === 'manager' ||
      currentUser?.allowedTabs?.includes('work_assignments') ||
      currentUser?.allowedTabs?.includes('my_dashboard') ||
      currentUser?.allowedActions?.includes('manage_work_assignments')
    );
  }

  if (tab === 'service_usage') {
    return !!(
      currentUser?.isSuperAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'director' ||
      currentUser?.allowedTabs?.includes('service_usage') ||
      currentUser?.allowedActions?.includes('manage_revenue') ||
      currentUser?.department?.includes('Kế Toán') ||
      currentUser?.department?.includes('HR') ||
      currentUser?.roleTitle?.includes('Kế toán') ||
      currentUser?.roleTitle?.includes('Giám đốc')
    );
  }

  if (tab === 'kpi') {
    return !!(
      currentUser?.isSuperAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'director' ||
      currentUser?.role === 'manager' ||
      currentUser?.department?.includes('Kế Toán') ||
      currentUser?.department?.includes('HR') ||
      currentUser?.roleTitle?.includes('Kế toán') ||
      currentUser?.roleTitle?.includes('Nhân Sự') ||
      currentUser?.allowedTabs?.includes('kpi') ||
      allowedTabs.includes('kpi')
    );
  }

  if (currentUser?.isSuperAdmin) {
    return true;
  }

  if (tab === 'approvals') {
    return canAccessApprovalCenter(currentUser);
  }

  if (tab === 'admin') {
    return canAccessAdminPortal(currentUser);
  }

  return allowedTabs.includes(tab);
}

export function getHomeNavTab(currentUser: UserAccount | null | undefined): NavTab {
  if (currentUser?.allowedTabs?.includes('my_dashboard') && !currentUser?.isSuperAdmin) {
    return 'my_dashboard';
  }
  if (canAccessNavTab(currentUser, 'roster')) {
    return 'roster';
  }
  if (currentUser?.allowedTabs && currentUser.allowedTabs.length > 0) {
    const first = currentUser.allowedTabs.find((t) => canAccessNavTab(currentUser, t));
    return (first || 'my_dashboard') as NavTab;
  }
  return 'my_dashboard';
}

export function buildNavGroups(
  currentUser: UserAccount | null | undefined,
  counts: {
    totalIdols: number;
    payrollDisputesCount: number;
    pendingApprovalsCount: number;
  },
  options?: { includeSystemGroup?: boolean },
): NavGroupConfig[] {
  const talentItems: NavSubItemConfig[] = [
    {
      tab: 'roster',
      label: 'Danh sách hồ sơ',
      subLabel: 'Idol, nhân viên, cộng tác viên & đối tác dịch vụ',
      icon: Users,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      badge: counts.totalIdols,
    },
    {
      tab: 'my_dashboard',
      label: 'Dashboard cá nhân',
      subLabel: 'Không gian làm việc & thành tích cá nhân',
      icon: Sparkles,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
    },
    {
      tab: 'work_assignments',
      label: 'Giao việc & Công tác',
      subLabel: 'Timeline, trạng thái và chi tiết công việc được giao',
      icon: BriefcaseBusiness,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
    },
    {
      tab: 'schedule',
      label: 'Lịch Làm Việc & Ca Live',
      subLabel: 'Lịch phát sóng, sự kiện & booking',
      icon: CalendarClock,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
    },
    {
      tab: 'approvals',
      label: 'Phê Duyệt Nhân Sự',
      subLabel: 'Duyệt hồ sơ nhân sự & đơn nghỉ phép',
      icon: Shield,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      badge: counts.pendingApprovalsCount > 0 ? counts.pendingApprovalsCount : undefined,
    },
  ];

  const operationItems: NavSubItemConfig[] = [
    {
      tab: 'tasks',
      label: 'Quản Lý Nhiệm Vụ',
      subLabel: 'Giao việc, nhắc hẹn & duyệt kết quả',
      icon: CheckSquare,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      tab: 'scoring',
      label: 'Bảng Điểm Đánh Giá',
      subLabel: 'Chấm điểm định kỳ theo tiêu chí',
      icon: Award,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
    },
    {
      tab: 'leaderboard',
      label: 'Bảng Xếp Hạng Idol',
      subLabel: 'Vinh danh bảng vàng & phân hạng Tier',
      icon: Trophy,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
    },
    {
      tab: 'analytics',
      label: 'Báo Cáo & Thống Kê',
      subLabel: 'Hiệu suất tăng trưởng & xu hướng',
      icon: BarChart3,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
  ];

  const financeItems: NavSubItemConfig[] = [
    {
      tab: 'finance',
      label: 'Tài Chính & Lợi Nhuận',
      subLabel: 'Báo cáo P&L, thu chi & chi phí công ty',
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      tab: 'revenue',
      label: 'Quản Lý Doanh Thu',
      subLabel: 'Booking nhãn hàng & thanh toán theo đợt',
      icon: Coins,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
    },
    {
      tab: 'service_usage',
      label: 'Lịch Sử Dịch Vụ Ngoài',
      subLabel: 'Danh sách hồ sơ và các lần sử dụng dịch vụ',
      icon: BriefcaseBusiness,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      tab: 'payroll',
      label: 'Bảng Tính Lương & Thù Lao',
      subLabel: 'Phiếu lương idol, tạm ứng & khấu trừ',
      icon: Banknote,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      tab: 'payroll_disputes',
      label: 'Phản ánh bảng lương',
      subLabel: 'Danh sách, chi tiết và xử lý phản ánh',
      icon: FileText,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      badge: counts.payrollDisputesCount > 0 ? counts.payrollDisputesCount : undefined,
    },
    {
      tab: 'kpi',
      label: 'Thiết Đặt Định Mức & KPI',
      subLabel: 'Chỉ tiêu doanh thu, giờ live & thưởng',
      icon: Target,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
    },
  ];

  const groups: NavGroupConfig[] = [
    {
      id: 'talent',
      label: 'Hồ Sơ',
      icon: Users,
      iconColor: 'text-rose-600',
      items: talentItems.filter((item) => canAccessNavTab(currentUser, item.tab)),
    },
    {
      id: 'operations',
      label: 'Vận Hành',
      icon: CheckSquare,
      iconColor: 'text-sky-600',
      items: operationItems.filter((item) => canAccessNavTab(currentUser, item.tab)),
    },
    {
      id: 'finance',
      label: 'Tài Chính',
      icon: Coins,
      iconColor: 'text-amber-600',
      items: financeItems.filter((item) => canAccessNavTab(currentUser, item.tab)),
    },
  ];

  if (options?.includeSystemGroup && canAccessNavTab(currentUser, 'admin')) {
    groups.push({
      id: 'system',
      label: 'Hệ Thống',
      icon: Shield,
      iconColor: 'text-rose-600',
      items: [
        {
          tab: 'admin',
          label: 'Quản Trị Hệ Thống',
          subLabel: 'Tài khoản, phân quyền, danh mục & cấu hình',
          icon: Shield,
          iconColor: 'text-rose-600',
          iconBg: 'bg-rose-50',
        },
      ],
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

