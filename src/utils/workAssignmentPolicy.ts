import { getSystemNow } from './dateUtils.ts';

export type WorkAssignmentPenaltyType = 'none' | 'fixed' | 'percentage';
export type WorkAssignmentRestPortion = 'none' | 'half' | 'full';

export const WORK_ASSIGNMENT_AUTO_PENALTY_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

export function getWorkAssignmentAutoPenaltyCutoff(now: Date | string): Date {
  const effectiveNow = new Date(now);
  return new Date(effectiveNow.getTime() - WORK_ASSIGNMENT_AUTO_PENALTY_DELAY_MS);
}

export function isWorkAssignmentAcceptanceOpen(acceptanceDeadline?: string, referenceDate?: string): boolean {
  if (!acceptanceDeadline) return true;
  const deadline = new Date(acceptanceDeadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() >= getSystemNow(referenceDate).getTime();
}

export function validateWorkAssignmentResponse(mandatory: boolean, responseStatus: string, note?: string): void {
  if (!['accepted', 'declined'].includes(responseStatus)) throw new Error('Trạng thái phản hồi không hợp lệ');
  if (mandatory && responseStatus === 'declined') throw new Error('Công việc bắt buộc không thể từ chối trực tiếp');
  if (!mandatory && responseStatus === 'declined' && !String(note || '').trim()) throw new Error('Từ chối công việc phải có lý do');
}

export interface WorkAssignmentRestPolicy {
  restDayDate?: string;
  restDayPortion: WorkAssignmentRestPortion;
  scheduleOverrideStartDate?: string;
  scheduleOverrideEndDate?: string;
}

const toDate = (value: string | Date): Date => new Date(value);

const isoDate = (value: Date): string => value.toISOString().slice(0, 10);

/**
 * Calculates the compensatory rest day for a trip. Sunday is the default
 * fixed rest day; the next working day is selected when the calculated day
 * falls on Sunday.
 */
export function calculateWorkAssignmentRest(
  startAt?: string | Date,
  endAt?: string | Date,
  fixedRestWeekdays: number[] = [0]
): WorkAssignmentRestPolicy {
  if (!startAt || !endAt) return { restDayPortion: 'none' };
  const start = toDate(startAt);
  const end = toDate(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { restDayPortion: 'none' };
  }

  const startDate = isoDate(start);
  const endDate = isoDate(end);
  const sameCalendarDay = startDate === endDate;
  const endHour = end.getUTCHours() + end.getUTCMinutes() / 60;
  const restDayPortion: WorkAssignmentRestPortion = !sameCalendarDay
    ? 'full'
    : endHour >= 22
      ? 'half'
      : 'none';

  if (restDayPortion === 'none') {
    return { restDayPortion, scheduleOverrideStartDate: startDate, scheduleOverrideEndDate: endDate };
  }

  const restDate = new Date(`${endDate}T00:00:00.000Z`);
  restDate.setUTCDate(restDate.getUTCDate() + 1);
  while (fixedRestWeekdays.includes(restDate.getUTCDay())) {
    restDate.setUTCDate(restDate.getUTCDate() + 1);
  }

  return {
    restDayDate: isoDate(restDate),
    restDayPortion,
    scheduleOverrideStartDate: startDate,
    scheduleOverrideEndDate: endDate
  };
}

export function calculateAssignmentPenalty(
  penaltyType: WorkAssignmentPenaltyType,
  penaltyValue: number,
  contractSalary: number
): number {
  if (!Number.isFinite(penaltyValue) || penaltyValue <= 0) return 0;
  if (penaltyType === 'fixed') return Math.round(penaltyValue);
  if (penaltyType === 'percentage') return Math.round(Math.max(0, contractSalary) * penaltyValue / 100);
  return 0;
}

