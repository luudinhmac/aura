import type { AppActionPermission, UserAccount } from '../types/index.ts';

export type AdminSubTab =
  | 'personnel_types'
  | 'users'
  | 'departments'
  | 'statuses'
  | 'criteria'
  | 'settings'
  | 'column_headers'
  | 'audit_logs';

function hasAction(user: UserAccount | null | undefined, action: AppActionPermission): boolean {
  return !!(user?.isSuperAdmin || user?.allowedActions?.includes(action));
}

export function canAccessApprovalCenter(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  return !!(
    user.isSuperAdmin ||
    user.role === 'director' ||
    user.allowedTabs?.includes('approvals') ||
    hasAction(user, 'manage_approvals')
  );
}

export function canAccessAdminPortal(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  return !!(
    user.isSuperAdmin ||
    hasAction(user, 'manage_settings') ||
    hasAction(user, 'manage_departments') ||
    hasAction(user, 'manage_criteria')
  );
}

export function canAccessAdminSubTab(
  user: UserAccount | null | undefined,
  tab: AdminSubTab,
): boolean {
  if (user?.isSuperAdmin) return true;

  if (tab === 'criteria') {
    return hasAction(user, 'manage_criteria');
  }

  if (tab === 'departments') {
    return hasAction(user, 'manage_departments');
  }

  if (tab === 'settings' || tab === 'personnel_types' || tab === 'statuses') {
    return hasAction(user, 'manage_settings');
  }

  return false;
}
