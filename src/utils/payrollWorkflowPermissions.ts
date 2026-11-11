export type PayrollWorkflowStatus = 'draft' | 'pending_approval' | 'approved' | 'locked_paid';

export type PayrollWorkflowUser = {
  id?: string | number;
  name?: string;
  accountType?: string;
  isSuperAdmin?: boolean;
  role?: string;
  roleTitle?: string;
  allowedActions?: string[];
  department?: string;
};

const hasText = (value: string | undefined, text: string) => value?.toLowerCase().includes(text) === true;

export function isPayrollDirector(user?: PayrollWorkflowUser): boolean {
  return !!(
    user?.isSuperAdmin ||
    user?.accountType === 'system_admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'director' ||
    hasText(user?.roleTitle, 'giám đốc') ||
    hasText(user?.roleTitle, 'giam doc') ||
    user?.allowedActions?.includes('approve_payroll')
  );
}

export function canSubmitPayroll(user?: PayrollWorkflowUser): boolean {
  if (!user || isPayrollDirector(user)) return false;
  return !!(
    user.allowedActions?.includes('manage_payroll') ||
    hasText(user.department, 'kế toán') || hasText(user.department, 'ke toan') || hasText(user.department, 'hr') ||
    hasText(user.roleTitle, 'kế toán') || hasText(user.roleTitle, 'ke toan') ||
    hasText(user.roleTitle, 'nhân sự') || hasText(user.roleTitle, 'nhan su')
  );
}

export function canApprovePayroll(user?: PayrollWorkflowUser): boolean {
  return isPayrollDirector(user);
}

export function assertPayrollSubmitAllowed(status: PayrollWorkflowStatus, user?: PayrollWorkflowUser): void {
  if (!canSubmitPayroll(user)) throw new Error('Giám đốc chỉ được phê duyệt, không được trình bảng lương');
  if (status !== 'draft') throw new Error('Chỉ bảng lương ở trạng thái dự thảo mới được trình duyệt');
}

export function assertPayrollApprovalAllowed(status: PayrollWorkflowStatus, user?: PayrollWorkflowUser): void {
  if (!canApprovePayroll(user)) throw new Error('Tài khoản không có quyền phê duyệt bảng lương');
  if (status !== 'pending_approval') throw new Error('Chỉ bảng lương đã được trình mới được phê duyệt');
}

export function assertPayrollLockAllowed(status: PayrollWorkflowStatus, user?: PayrollWorkflowUser): void {
  if (!canApprovePayroll(user)) throw new Error('Chỉ Giám đốc mới được khóa sổ bảng lương');
  if (status !== 'approved') throw new Error('Chỉ bảng lương đã được phê duyệt mới được khóa sổ');
}
