import type { UserAccount } from '../types/index.ts';

export type PayrollDisputePolicyUser = Pick<UserAccount, 'id'> & Partial<Pick<UserAccount, 'accountType' | 'isBusinessAdmin' | 'role' | 'roleTitle' | 'department' | 'allowedActions'>>;

const hasAction = (user: PayrollDisputePolicyUser | undefined, action: string) => user?.allowedActions?.includes(action as any) === true;
const hasText = (value: string | undefined, text: string) => value?.toLowerCase().includes(text) === true;

export function canManagePayrollDisputes(user?: PayrollDisputePolicyUser): boolean {
  if (!user) return false;
  if (user.accountType === 'system_admin' || user.isBusinessAdmin) return true;
  return hasAction(user, 'manage_payroll') || hasAction(user, 'adjust_payroll') || hasAction(user, 'approve_payroll') ||
    user.role === 'director' || hasText(user.roleTitle, 'giám đốc') || hasText(user.roleTitle, 'giam doc') ||
    hasText(user.department, 'ban giám đốc') || hasText(user.department, 'ban giam doc');
}

export function canCancelPayrollDispute(status: string, disputeUserId: string | number | undefined, viewerId: string | number | undefined): boolean {
  return status === 'submitted' && disputeUserId !== undefined && viewerId !== undefined && String(disputeUserId) === String(viewerId);
}

export function canReviewPayrollDispute(user?: PayrollDisputePolicyUser): boolean {
  return canManagePayrollDisputes(user);
}

export function canSubmitPayrollDispute(periodStatus: string | undefined): boolean {
  return periodStatus === 'pending_approval';
}
