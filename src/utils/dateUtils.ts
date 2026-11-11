/**
 * Lấy ngày mốc hệ thống (System Current Date / Today ISO String).
 * Nếu trong Cài đặt hệ thống có mốc thời gian tùy chọn (referenceDate, VD: 2025-01-28),
 * toàn bộ hệ thống sẽ coi ngày này là thời gian hiện tại chuẩn.
 */
const SYSTEM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function zonedParts(value: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYSTEM_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(value);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function zonedDateTimeToDate(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number): Date {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let timestamp = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = zonedParts(new Date(timestamp));
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, millisecond);
    const correction = targetAsUtc - representedAsUtc;
    timestamp += correction;
    if (correction === 0) break;
  }
  return new Date(timestamp);
}

function isoDateInSystemZone(value: Date): string {
  const parts = zonedParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function parseIsoDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() + 1 === month && check.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function resolveReferenceDate(referenceDateString?: string): string {
  if (referenceDateString && referenceDateString.trim() !== '') {
    return referenceDateString.trim();
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('aura_system_reference_date');
      if (saved && saved.trim() !== '') {
        return saved.trim();
      }
    }
  } catch {
    // fallback
  }
  return isoDateInSystemZone(new Date());
}

function readReferenceClockAnchor(anchorAt?: string): string | undefined {
  if (anchorAt) return anchorAt;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('aura_system_reference_clock_anchor') || undefined;
    }
  } catch { /* fallback */ }
  return undefined;
}

export function getSystemNow(
  referenceDateString?: string,
  referenceTimeString?: string,
  referenceClockAnchorAt?: string,
  realNow: Date = new Date()
): Date {
  const iso = resolveReferenceDate(referenceDateString);
  let configuredTime = referenceTimeString;
  if (!configuredTime) {
    try { configuredTime = window.localStorage.getItem('aura_system_reference_time') || undefined; } catch { /* fallback */ }
  }
  const anchorValue = readReferenceClockAnchor(referenceClockAnchorAt);
  const anchorAt = anchorValue ? new Date(anchorValue) : undefined;
  const parts = iso.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    const timeMatch = configuredTime?.match(/^(\d{1,2}):(\d{2})$/);
    if (anchorAt && !Number.isNaN(anchorAt.getTime())) {
      const anchorParts = zonedParts(anchorAt);
      const hour = timeMatch ? Number(timeMatch[1]) : anchorParts.hour;
      const minute = timeMatch ? Number(timeMatch[2]) : anchorParts.minute;
      const simulatedStart = zonedDateTimeToDate(y, m + 1, d, hour, minute, timeMatch ? 0 : anchorParts.second, timeMatch ? 0 : anchorAt.getMilliseconds());
      if (!Number.isNaN(simulatedStart.getTime())) {
        return new Date(simulatedStart.getTime() + Math.max(0, realNow.getTime() - anchorAt.getTime()));
      }
    }
    const nowParts = zonedParts(realNow);
    const hour = timeMatch ? Number(timeMatch[1]) : nowParts.hour;
    const minute = timeMatch ? Number(timeMatch[2]) : nowParts.minute;
    const parsed = zonedDateTimeToDate(y, m + 1, d, hour, minute, timeMatch ? 0 : nowParts.second, timeMatch ? 0 : realNow.getMilliseconds());
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return realNow;
}

export function getTodayIsoDate(
  referenceDateString?: string,
  referenceTimeString?: string,
  referenceClockAnchorAt?: string,
  realNow: Date = new Date()
): string {
  const baseDate = resolveReferenceDate(referenceDateString);
  const anchorAt = readReferenceClockAnchor(referenceClockAnchorAt);
  if (anchorAt && baseDate) {
    const current = getSystemNow(baseDate, referenceTimeString, anchorAt, realNow);
    return isoDateInSystemZone(current);
  }
  return baseDate;
}

export function getMillisecondsUntilSystemMidnight(
  referenceDateString?: string,
  referenceTimeString?: string,
  referenceClockAnchorAt?: string,
  realNow: Date = new Date()
): number {
  const current = getSystemNow(referenceDateString, referenceTimeString, referenceClockAnchorAt, realNow);
  const parts = zonedParts(current);
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const midnight = zonedDateTimeToDate(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate(), 0, 0, 0, 0);
  return Math.max(1, midnight.getTime() - current.getTime() + 25);
}

export function formatDateTimeVN(value?: string | Date): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatSystemDateTimeVN(value?: Date): string {
  if (!value || Number.isNaN(value.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYSTEM_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(value);
  const formatted = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${formatted.day}/${formatted.month}/${formatted.year} ${formatted.hour}:${formatted.minute}`;
}

export function formatDateTimeInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseDateTimeVN(value: string): string {
  const match = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) return '';
  const [, dayText, monthText, yearText, hourText = '00', minuteText = '00'] = match;
  const day = Number(dayText); const month = Number(monthText); const year = Number(yearText);
  const hour = Number(hourText); const minute = Number(minuteText);
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || hour > 23 || minute > 59) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Calculates exact full age according to birthdate and reference date.
 * If referenceDate is empty or not provided, uses the system current reference date.
 * An individual only turns age X if the reference date has reached or passed their birthday.
 */
export function calculateExactAge(dobString?: string, referenceDateString?: string): number {
  if (!dobString) return 0;
  const birth = parseIsoDateParts(dobString);
  if (!birth) return 0;

  const ref = getSystemNow(referenceDateString);

  const refParts = zonedParts(ref);
  let age = refParts.year - birth.year;
  const monthDiff = refParts.month - birth.month;
  if (monthDiff < 0 || (monthDiff === 0 && refParts.day < birth.day)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Calculates seniority / tenure (thâm niên) in exact years, months, and days.
 */
export function calculateTenure(joinDateString?: string, referenceDateString?: string): {
  years: number;
  months: number;
  days: number;
  formattedText: string;
  shortText: string;
} {
  if (!joinDateString || joinDateString.trim() === '') {
    return { years: 0, months: 0, days: 0, formattedText: 'Chưa cập nhật', shortText: '-' };
  }

  const startParts = parseIsoDateParts(joinDateString);
  if (!startParts) {
    return { years: 0, months: 0, days: 0, formattedText: 'Không hợp lệ', shortText: '-' };
  }

  const start = zonedDateTimeToDate(startParts.year, startParts.month, startParts.day, 0, 0, 0, 0);
  const end = getSystemNow(referenceDateString);

  if (isNaN(end.getTime()) || end < start) {
    return { years: 0, months: 0, days: 0, formattedText: 'Mới gia nhập (0 ngày)', shortText: '0 ngày' };
  }

  const endParts = zonedParts(end);
  let years = endParts.year - startParts.year;
  let months = endParts.month - startParts.month;
  let days = endParts.day - startParts.day;

  if (days < 0) {
    months--;
    const prevMonthLastDay = new Date(endParts.year, endParts.month - 1, 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} năm`);
  if (months > 0) parts.push(`${months} tháng`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);

  const formattedText = parts.join(' ');
  const shortText = years > 0
    ? `${years}n ${months > 0 ? months + 't' : ''}`.trim()
    : months > 0
    ? `${months}t ${days > 0 ? days + 'ng' : ''}`.trim()
    : `${days} ngày`;

  return { years, months, days, formattedText, shortText };
}

/**
 * Formats date from YYYY-MM-DD to DD/MM/YYYY for Vietnamese display
 */
export function formatDateVN(dateString?: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/** Parse a user-entered Vietnamese date (DD/MM/YYYY or DD-MM-YYYY) to ISO. */
export function parseDateVN(value: string): string {
  const match = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return '';
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Tính toán quỹ phép năm (Annual Leave Quota) theo chính sách của Aura Talent:
 * - Mới vào (< 12 tháng): Mỗi tháng thâm niên có 1 ngày nghỉ phép năm (VD: 5 tháng = 5 ngày, mới vào < 1 tháng = 1 ngày)
 * - Đủ 12 tháng (1 năm): Có 14 ngày phép năm tiêu chuẩn
 * - Thâm niên > 1 năm: Cứ mỗi năm làm việc tăng thêm thì được cộng thêm 1 ngày phép năm
 *   (VD: 1 năm = 14 ngày, 2 năm = 15 ngày, 3 năm = 16 ngày, 4 năm = 17 ngày...)
 */
export function calculateAnnualLeaveQuota(joinDateString?: string, referenceDateString?: string): {
  totalDays: number;
  tenureYears: number;
  tenureMonths: number;
  formulaExplanation: string;
} {
  const tenure = calculateTenure(joinDateString, referenceDateString);
  if (tenure.years === 0) {
    const months = Math.max(1, tenure.months);
    return {
      totalDays: months,
      tenureYears: 0,
      tenureMonths: months,
      formulaExplanation: `Thâm niên ${tenure.shortText} (< 1 năm): tích lũy 1 ngày/tháng (${months} ngày)`
    };
  }

  // Đủ 12 tháng trở lên: 14 ngày chuẩn + 1 ngày cho mỗi năm thâm niên tăng thêm sau năm đầu
  const additionalYears = Math.max(0, tenure.years - 1);
  const totalDays = 14 + additionalYears;
  return {
    totalDays,
    tenureYears: tenure.years,
    tenureMonths: tenure.months,
    formulaExplanation: tenure.years === 1
      ? 'Đủ 12 tháng thâm niên: 14 ngày phép năm chuẩn'
      : `Thâm niên ${tenure.years} năm: 14 ngày chuẩn + ${additionalYears} ngày thâm niên (${totalDays} ngày)`
  };
}

/**
 * Đếm số ngày làm việc thực tế trong khoảng [startDateStr, endDateStr] (không tính Chủ Nhật).
 * Chế độ làm việc: Thứ 2 đến Thứ 7 là ngày làm việc tiêu chuẩn (6 ngày/tuần).
 */
export function getWorkingDaysCount(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr || startDateStr > endDateStr) return 0;
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    // 0 = Chủ Nhật (ngày nghỉ tuần)
    if (cur.getDay() !== 0) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Kiểm tra xem nhân sự có đủ điều kiện nhận lương trong kỳ periodStr (YYYY-MM) hay không:
 * 1. Ngày gia nhập (joinDate) phải <= ngày cuối tháng của kỳ.
 * 2. Nếu nhân sự đã nghỉ việc (status === 'Đã nghỉ việc' hoặc có resignedDate):
 *    - Nhân sự chỉ nhận lương cho các kỳ mà ngày nghỉ việc >= ngày đầu tháng của kỳ.
 *    - Ví dụ: Nghỉ việc ngày 31/07 -> Kỳ tháng 07 vẫn được chi trả vào 05/08.
 *    - Sau kỳ chi trả (tức từ kỳ tháng 08 trở đi): KHÔNG TÍNH LƯƠNG NỮA.
 */
export function isEligibleForPayrollPeriod(
  periodStr: string,
  joinDateStr?: string,
  resignedDateStr?: string,
  status?: string
): boolean {
  const [y, m] = periodStr.split('-').map(Number);
  if (!y || !m) return false;
  const lastDayOfMonth = new Date(y, m, 0).getDate();
  const periodStartIso = `${periodStr}-01`;
  const periodEndIso = `${periodStr}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const joinDate = joinDateStr || '2022-01-01';
  // Chưa vào công ty tại thời điểm kỳ lương kết thúc
  if (joinDate > periodEndIso) return false;

  const isResigned = status === 'Đã nghỉ việc' || !!resignedDateStr;
  if (isResigned) {
    // Nếu có resignedDate, so sánh với ngày bắt đầu kỳ
    // Nếu nhân sự nghỉ việc trước ngày đầu kỳ -> Không tính lương nữa
    const effectiveResignDate = resignedDateStr || joinDate;
    if (effectiveResignDate < periodStartIso) {
      return false;
    }
  }

  return true;
}

/**
 * Tính toán số ngày công chuẩn và ngày công thực tế của nhân sự trong kỳ periodStr (YYYY-MM):
 * - Nếu nhân sự làm việc trọn tháng: actualWorkDays = standardWorkDays, workRatio = 1.0.
 * - Nếu nhân sự vào giữa tháng (VD: join 20/07, chốt 31/07):
 *   tính actualWorkDays từ ngày vào đến cuối tháng / standardWorkDays.
 * - Nếu nhân sự nghỉ việc giữa tháng (VD: nghỉ 15/07):
 *   tính actualWorkDays từ đầu tháng đến ngày nghỉ / standardWorkDays.
 */
export function calculateProratedWorkDays(
  periodStr: string,
  joinDateStr?: string,
  resignedDateStr?: string
): {
  standardWorkDays: number;
  actualWorkDays: number;
  workRatio: number;
  isPartialMonth: boolean;
  explanation: string;
} {
  const [y, m] = periodStr.split('-').map(Number);
  if (!y || !m) {
    return { standardWorkDays: 26, actualWorkDays: 26, workRatio: 1, isPartialMonth: false, explanation: 'Chuẩn cả tháng' };
  }
  const lastDay = new Date(y, m, 0).getDate();
  const periodStartIso = `${periodStr}-01`;
  const periodEndIso = `${periodStr}-${String(lastDay).padStart(2, '0')}`;

  const standardWorkDays = getWorkingDaysCount(periodStartIso, periodEndIso);

  const workStart = (joinDateStr && joinDateStr > periodStartIso) ? joinDateStr : periodStartIso;
  const workEnd = (resignedDateStr && resignedDateStr < periodEndIso) ? resignedDateStr : periodEndIso;

  if (workStart > workEnd) {
    return {
      standardWorkDays,
      actualWorkDays: 0,
      workRatio: 0,
      isPartialMonth: true,
      explanation: 'Không có ngày công phát sinh trong kỳ'
    };
  }

  const actualWorkDays = getWorkingDaysCount(workStart, workEnd);
  const workRatio = standardWorkDays > 0 ? Math.min(1.0, Math.max(0, actualWorkDays / standardWorkDays)) : 1.0;
  const isPartialMonth = actualWorkDays < standardWorkDays;

  let explanation = `Đi làm trọn kỳ: ${actualWorkDays}/${standardWorkDays} ngày công (100%)`;
  if (isPartialMonth) {
    if (joinDateStr && joinDateStr > periodStartIso && resignedDateStr && resignedDateStr < periodEndIso) {
      explanation = `Vào ${formatDateVN(joinDateStr)} & Nghỉ ${formatDateVN(resignedDateStr)}: ${actualWorkDays}/${standardWorkDays} ngày công (${(workRatio * 100).toFixed(1)}%)`;
    } else if (joinDateStr && joinDateStr > periodStartIso) {
      explanation = `Gia nhập ngày ${formatDateVN(joinDateStr)}: ${actualWorkDays}/${standardWorkDays} ngày công (${(workRatio * 100).toFixed(1)}%)`;
    } else if (resignedDateStr && resignedDateStr < periodEndIso) {
      explanation = `Thôi việc ngày ${formatDateVN(resignedDateStr)}: ${actualWorkDays}/${standardWorkDays} ngày công (${(workRatio * 100).toFixed(1)}%)`;
    } else {
      explanation = `Số công thực tế: ${actualWorkDays}/${standardWorkDays} ngày công (${(workRatio * 100).toFixed(1)}%)`;
    }
  }

  return { standardWorkDays, actualWorkDays, workRatio, isPartialMonth, explanation };
}

/**
 * Tính tiền làm thêm giờ (tăng ca - Overtime) theo quy định Luật Lao Động Việt Nam:
 * - Ngày làm việc bình thường (quá 8h/ngày): Hệ số 150% (1.5x)
 * - Ngày nghỉ hàng tuần (Chủ Nhật): Hệ số 200% (2.0x)
 * - Ngày nghỉ Lễ, Tết: Hệ số 300% (3.0x)
 */
export function calculateOvertimePay(
  contractBaseSalary: number,
  standardWorkDays: number = 26,
  otNormalHours: number = 0,
  otWeekendHours: number = 0,
  otHolidayHours: number = 0
): {
  hourlyRate: number;
  otNormalPay: number;
  otWeekendPay: number;
  otHolidayPay: number;
  totalOtPay: number;
} {
  const safeBase = Math.max(0, contractBaseSalary || 0);
  const safeDays = Math.max(1, standardWorkDays || 26);
  // Đơn giá 1 giờ làm việc bình thường: Lương hợp đồng / (Số ngày công chuẩn * 8 giờ)
  const hourlyRate = Math.round(safeBase / (safeDays * 8));

  const otNormalPay = Math.round((otNormalHours || 0) * 1.5 * hourlyRate);
  const otWeekendPay = Math.round((otWeekendHours || 0) * 2.0 * hourlyRate);
  const otHolidayPay = Math.round((otHolidayHours || 0) * 3.0 * hourlyRate);
  const totalOtPay = otNormalPay + otWeekendPay + otHolidayPay;

  return {
    hourlyRate,
    otNormalPay,
    otWeekendPay,
    otHolidayPay,
    totalOtPay
  };
}

