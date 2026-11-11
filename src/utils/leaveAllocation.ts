import type { LeaveRequest, LeaveType } from '../types/index.ts';

export interface LeaveAllocation {
  annualLeaveDays: number;
  unpaidLeaveDays: number;
  requiresConfirmation: boolean;
}

export interface LeaveBalanceInput {
  totalAnnualDays: number;
  requests: Pick<LeaveRequest, 'leaveType' | 'status' | 'totalDays' | 'annualLeaveDays'>[];
}

function positiveDays(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Pending and approved annual leave reserve the annual quota. Rejected
 * requests never consume it. Legacy annual requests without allocation data
 * are treated as fully annual for backward compatibility.
 */
export function getReservedAnnualLeaveDays({ totalAnnualDays, requests }: LeaveBalanceInput): number {
  const used = requests
    .filter((request) => request.leaveType === 'annual' && request.status !== 'rejected')
    .reduce((sum, request) => sum + positiveDays(request.annualLeaveDays ?? request.totalDays), 0);

  return Math.min(positiveDays(totalAnnualDays), used);
}

export function getRemainingAnnualLeaveDays(input: LeaveBalanceInput): number {
  return Math.max(0, positiveDays(input.totalAnnualDays) - getReservedAnnualLeaveDays(input));
}

export function calculateLeaveAllocation(
  leaveType: LeaveType,
  totalDays: number,
  remainingAnnualDays: number,
  overflowConfirmed: boolean
): LeaveAllocation {
  const requestedDays = Math.max(0, Math.floor(totalDays));
  const availableDays = Math.max(0, Math.floor(remainingAnnualDays));

  if (leaveType !== 'annual') {
    return {
      annualLeaveDays: 0,
      unpaidLeaveDays: requestedDays,
      requiresConfirmation: false
    };
  }

  const annualLeaveDays = Math.min(requestedDays, availableDays);
  const unpaidLeaveDays = requestedDays - annualLeaveDays;

  return {
    annualLeaveDays,
    unpaidLeaveDays,
    requiresConfirmation: unpaidLeaveDays > 0 && !overflowConfirmed
  };
}
