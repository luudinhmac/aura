import { Idol, WorkScheduleSlot } from '../types/index.ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDateWithinPersonnelPeriod = (
  scheduleDate: string,
  joinDate?: string,
  resignedDate?: string
): boolean => {
  if (!ISO_DATE_PATTERN.test(scheduleDate)) return false;
  if (joinDate && ISO_DATE_PATTERN.test(joinDate) && scheduleDate < joinDate) return false;
  if (resignedDate && ISO_DATE_PATTERN.test(resignedDate) && scheduleDate >= resignedDate) return false;
  return true;
};

export const isScheduleAllowedForPersonnel = (schedule: WorkScheduleSlot, idol: Idol): boolean => {
  if (schedule.repeatType !== 'specific_date' || !schedule.specificDate) return true;
  return isIsoDateWithinPersonnelPeriod(schedule.specificDate, idol.joinDate, idol.resignedDate);
};
