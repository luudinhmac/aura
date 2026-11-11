export interface WorkAssignmentCompensationInput {
  startAt?: string | Date;
  endAt?: string | Date;
  contractBaseSalary: number;
  standardWorkDays?: number;
  fixedRestWeekdays?: number[];
}

export interface WorkAssignmentCompensation {
  calendarDays: number;
  totalHours: number;
  baseHours: number;
  premiumHours: number;
  hourlyRate: number;
  basePay: number;
  premiumPay: number;
  totalPay: number;
  restDayDate?: string;
}

const toDate = (value?: string | Date): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isoDate = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function calculateWorkAssignmentCompensation(input: WorkAssignmentCompensationInput): WorkAssignmentCompensation {
  const start = toDate(input.startAt);
  const end = toDate(input.endAt);
  const standardWorkDays = Math.max(1, Number(input.standardWorkDays) || 26);
  const fixedRestWeekdays = new Set(input.fixedRestWeekdays ?? [0]);
  const hourlyRate = Math.round(Math.max(0, Number(input.contractBaseSalary) || 0) / (standardWorkDays * 8));
  if (!start || !end || end <= start) return { calendarDays: 0, totalHours: 0, baseHours: 0, premiumHours: 0, hourlyRate, basePay: 0, premiumPay: 0, totalPay: 0 };

  const totalHours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const calendarDays = Math.max(1, Math.ceil((endDay.getTime() - startDay.getTime()) / 86400000) + 1);
  const baseHours = Math.min(totalHours, calendarDays * 8);
  const premiumHours = Math.max(0, totalHours - baseHours);
  const basePay = Math.round(baseHours * hourlyRate * 1.5);
  const premiumPay = Math.round(premiumHours * hourlyRate * 2);
  const restDay = new Date(endDay);
  restDay.setDate(restDay.getDate() + 1);
  while (fixedRestWeekdays.has(restDay.getDay())) restDay.setDate(restDay.getDate() + 1);
  return { calendarDays, totalHours, baseHours, premiumHours, hourlyRate, basePay, premiumPay, totalPay: basePay + premiumPay, restDayDate: isoDate(restDay) };
}
