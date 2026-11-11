import type { PayrollStatus } from '../types/index.ts';

export const PAYROLL_FEEDBACK_START_DAY = 1;
export const PAYROLL_APPROVAL_START_DAY = 4;
export const PAYROLL_LOCK_START_DAY = 5;

export interface PayrollCalendarDates {
  feedbackStartsAt: string;
  approvalStartsAt: string;
  lockStartsAt: string;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getPayrollCalendarDates(period: string): PayrollCalendarDates {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error('Kỳ lương không hợp lệ');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error('Kỳ lương không hợp lệ');
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return {
    feedbackStartsAt: formatDate(new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), PAYROLL_FEEDBACK_START_DAY))),
    approvalStartsAt: formatDate(new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), PAYROLL_APPROVAL_START_DAY))),
    lockStartsAt: formatDate(new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), PAYROLL_LOCK_START_DAY)))
  };
}

export function isOnOrAfter(referenceDate: string, boundaryDate: string): boolean {
  return referenceDate >= boundaryDate;
}

export function canSubmitOrApprovePayroll(referenceDate: string, calendar: PayrollCalendarDates): boolean {
  return isOnOrAfter(referenceDate, calendar.approvalStartsAt);
}

export function canLockOrPayPayroll(status: PayrollStatus, referenceDate: string, calendar: PayrollCalendarDates): boolean {
  return status === 'approved' && isOnOrAfter(referenceDate, calendar.lockStartsAt);
}
