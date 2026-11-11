import type { PayrollStatus, PayrollRecord } from '../types/index.ts';

export type PayrollDisplayStatus = 'pending_approval' | 'pending_payment' | 'paid';

/** Derives row status from the payroll period workflow. */
export function getPayrollDisplayStatus(
  periodStatus: PayrollStatus | null | undefined,
  paymentStatus: PayrollRecord['paymentStatus']
): PayrollDisplayStatus {
  if (periodStatus === 'locked_paid') return 'paid';
  if (periodStatus === 'approved') return 'pending_payment';
  if (periodStatus === 'draft' || periodStatus === 'pending_approval') return 'pending_approval';

  // Preserve payment-based behavior for non-monthly/legacy callers without a period.
  return paymentStatus === 'paid' ? 'paid' : 'pending_payment';
}

export const PAYROLL_DISPLAY_STATUS_LABELS: Record<PayrollDisplayStatus, string> = {
  pending_approval: 'Chờ duyệt',
  pending_payment: 'Chờ chi',
  paid: 'Đã chi'
};
