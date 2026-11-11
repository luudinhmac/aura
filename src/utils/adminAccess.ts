import type { AppActionPermission, UserAccount } from '../types/index.ts';

export type AdminSubTab =
  | 'leave_management'
  | 'approvals'
  | 'personnel_types'
  | 'users'
  | 'departments'
  | 'statuses'
  | 'criteria'
  | 'settings'
  | 'column_headers';

function hasAction(user: UserAccount | null | undefined, action: AppActionPermission): boolean {
  return !!(user?.isSuperAdmin || user?.allowedActions?.includes(action));
}

export function canAccessAdminPortal(user: UserAccount | null | undefined): boolean {
  return hasAction(user, 'manage_approvals');
}

export function canAccessAdminSubTab(
  user: UserAccount | null | undefined,
  tab: AdminSubTab,
): boolean {
  if (user?.isSuperAdmin) return true;

  if (tab === 'leave_management' || tab === 'approvals') {
    return hasAction(user, 'manage_approvals');
  }

  if (tab === 'criteria') {
    return hasAction(user, 'manage_criteria');
  }

  return false;
}
