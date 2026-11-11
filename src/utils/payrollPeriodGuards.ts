export type PayrollMutationPeriodStatus = 'draft' | 'pending_approval' | 'approved' | 'locked_paid' | string;

export function canMutatePayrollAmounts(status: PayrollMutationPeriodStatus): boolean {
  return status === 'draft' || status === 'pending_approval';
}

export function assertPayrollPeriodMutable(status: PayrollMutationPeriodStatus): void {
  if (!canMutatePayrollAmounts(status)) {
    throw new Error('Khong the thay doi tien trong ky luong da duyet hoac da khoa');
  }
}
