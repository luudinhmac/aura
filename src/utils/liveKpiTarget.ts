export interface LiveKpiSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  repeatType?: string | null;
  specificMonth?: string | null;
  specificDate?: Date | string | null;
}

export interface LiveKpiAssignment {
  status?: string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  assigneeResponseStatus?: string | null;
}

export interface LiveKpiTargetAdjustment {
  originalTarget: number;
  reducedHours: number;
  adjustedTarget: number;
  affectedShifts: number;
}

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const result = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
};

const parseTime = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const periodBounds = (period: string) => {
  const start = new Date(`${period}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

const scheduleAppliesOn = (schedule: LiveKpiSchedule, date: Date, period: string): boolean => {
  if (schedule.isActive === false) return false;
  const dayOfWeek = date.getUTCDay() || 7;
  if (schedule.dayOfWeek !== dayOfWeek) return false;
  if (schedule.repeatType === 'specific_date') {
    const specificDate = schedule.specificDate instanceof Date
      ? schedule.specificDate.toISOString().slice(0, 10)
      : schedule.specificDate;
    return specificDate === date.toISOString().slice(0, 10);
  }
  if (schedule.repeatType === 'fixed_month') return !schedule.specificMonth || schedule.specificMonth === period;
  return true;
};

const overlapMinutes = (start: Date, end: Date, assignments: LiveKpiAssignment[]): number => {
  const intervals = assignments.flatMap((assignment) => {
    if (assignment.status === 'cancelled' || assignment.assigneeResponseStatus === 'declined') return [];
    const assignmentStart = toDate(assignment.startAt);
    const assignmentEnd = toDate(assignment.endAt);
    if (!assignmentStart || !assignmentEnd || assignmentEnd <= assignmentStart) return [];
    const intervalStart = Math.max(start.getTime(), assignmentStart.getTime());
    const intervalEnd = Math.min(end.getTime(), assignmentEnd.getTime());
    return intervalEnd > intervalStart ? [{ start: intervalStart, end: intervalEnd }] : [];
  }).sort((left, right) => left.start - right.start);
  let coveredMilliseconds = 0;
  let current: { start: number; end: number } | null = null;
  for (const interval of intervals) {
    if (!current) {
      current = interval;
    } else if (interval.start <= current.end) {
      current.end = Math.max(current.end, interval.end);
    } else {
      coveredMilliseconds += current.end - current.start;
      current = interval;
    }
  }
  if (current) coveredMilliseconds += current.end - current.start;
  return coveredMilliseconds / 60000;
};

export const calculateAdjustedLiveKpiTarget = (
  period: string,
  originalTarget: number,
  schedules: LiveKpiSchedule[],
  assignments: LiveKpiAssignment[]
): LiveKpiTargetAdjustment => {
  const bounds = periodBounds(period);
  if (!bounds || originalTarget <= 0 || schedules.length === 0 || assignments.length === 0) {
    return { originalTarget, reducedHours: 0, adjustedTarget: Math.max(0, originalTarget), affectedShifts: 0 };
  }

  let reducedMinutes = 0;
  let affectedShifts = 0;
  for (let cursor = new Date(bounds.start); cursor < bounds.end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    for (const schedule of schedules) {
      if (!scheduleAppliesOn(schedule, cursor, period)) continue;
      const startMinutes = parseTime(schedule.startTime);
      const endMinutes = parseTime(schedule.endTime);
      if (startMinutes === null || endMinutes === null) continue;
      const shiftStart = new Date(cursor);
      shiftStart.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      const shiftEnd = new Date(cursor);
      const durationMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes;
      shiftEnd.setTime(shiftStart.getTime() + durationMinutes * 60000);
      const shiftReduction = overlapMinutes(shiftStart, shiftEnd, assignments);
      const cappedReduction = Math.min(durationMinutes, shiftReduction);
      if (cappedReduction > 0) {
        reducedMinutes += cappedReduction;
        affectedShifts += 1;
      }
    }
  }

  const reducedHours = Math.round((reducedMinutes / 60) * 10) / 10;
  return {
    originalTarget,
    reducedHours,
    adjustedTarget: Math.max(0, Math.round((originalTarget - reducedHours) * 10) / 10),
    affectedShifts
  };
};
