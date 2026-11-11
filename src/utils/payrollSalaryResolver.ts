export interface SalaryHistoryForPayroll {
  id?: string;
  salaryAmount: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface SalarySegmentResolution {
  effectiveFrom: string;
  effectiveTo: string;
  salaryAmount: number;
  workDays: number;
}

export interface PayrollSalaryResolution {
  monthlySalary: number;
  proratedSalary: number;
  salaryHistoryId?: string;
  salaryEffectiveFrom?: string;
  segments: SalarySegmentResolution[];
}

function toIsoDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function compareDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function getPeriodBounds(period: string): { start: string; end: string } {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(period);
  if (!match) throw new Error(`Invalid payroll period: ${period}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Invalid payroll period: ${period}`);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${match[1]}-${match[2]}-01`, end: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}` };
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function countWorkingDays(start: string, end: string): number {
  if (compareDate(start, end) > 0) return 0;
  const cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  let count = 0;
  while (cursor <= endDate) {
    if (cursor.getUTCDay() !== 0) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function selectHistory(histories: SalaryHistoryForPayroll[], date: string, fallbackSalary: number): SalaryHistoryForPayroll {
  const applicable = histories
    .filter((history) => {
      const from = toIsoDate(history.effectiveFrom);
      const to = history.effectiveTo ? toIsoDate(history.effectiveTo) : undefined;
      return compareDate(from, date) <= 0 && (!to || compareDate(date, to) <= 0);
    })
    .sort((a, b) => compareDate(toIsoDate(b.effectiveFrom), toIsoDate(a.effectiveFrom)));
  return applicable[0] || { salaryAmount: Math.max(0, fallbackSalary), effectiveFrom: date };
}

/** Resolve a payroll month's salary without reading a later mutable salary value. */
export function resolveSalaryForPayrollPeriod(
  period: string,
  histories: SalaryHistoryForPayroll[],
  fallbackSalary: number,
  joinDate?: string,
  resignedDate?: string
): PayrollSalaryResolution {
  const { start: periodStart, end: periodEnd } = getPeriodBounds(period);
  const activeStart = joinDate && compareDate(joinDate, periodStart) > 0 ? toIsoDate(joinDate) : periodStart;
  const activeEnd = resignedDate && compareDate(resignedDate, periodEnd) < 0 ? toIsoDate(resignedDate) : periodEnd;
  const standardWorkDays = countWorkingDays(periodStart, periodEnd);
  const actualWorkDays = countWorkingDays(activeStart, activeEnd);
  if (actualWorkDays === 0 || standardWorkDays === 0) {
    return { monthlySalary: Math.max(0, fallbackSalary), proratedSalary: 0, segments: [] };
  }

  const boundaries = new Set<string>([activeStart]);
  histories.forEach((history) => {
    const effectiveFrom = toIsoDate(history.effectiveFrom);
    if (compareDate(effectiveFrom, activeStart) > 0 && compareDate(effectiveFrom, activeEnd) <= 0) boundaries.add(effectiveFrom);
  });

  const segments: SalarySegmentResolution[] = [];
  let weightedSalaryDays = 0;
  let latestApplied: SalaryHistoryForPayroll | undefined;
  [...boundaries].sort(compareDate).forEach((segmentStart, index, sorted) => {
    const nextStart = sorted[index + 1];
    const segmentEnd = nextStart ? addDays(nextStart, -1) : activeEnd;
    const workDays = countWorkingDays(segmentStart, segmentEnd);
    if (workDays === 0) return;
    const history = selectHistory(histories, segmentStart, fallbackSalary);
    const salaryAmount = Math.max(0, Number(history.salaryAmount) || 0);
    if (history.id) latestApplied = history;
    weightedSalaryDays += salaryAmount * workDays;
    segments.push({ effectiveFrom: segmentStart, effectiveTo: segmentEnd, salaryAmount, workDays });
  });

  return {
    monthlySalary: Math.round(weightedSalaryDays / actualWorkDays),
    proratedSalary: Math.round(weightedSalaryDays / standardWorkDays),
    salaryHistoryId: latestApplied?.id,
    salaryEffectiveFrom: latestApplied ? toIsoDate(latestApplied.effectiveFrom) : undefined,
    segments
  };
}
