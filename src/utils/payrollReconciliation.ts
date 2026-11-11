import type { Idol } from '../types/index.ts';
import { isEligibleForPayrollPeriod } from './dateUtils.ts';

/**
 * Payroll is built from personnel profiles, not from user accounts.
 * System-admin accounts intentionally have no payroll/personnel record.
 */
export function isPayrollEligiblePersonnel(personnel: Pick<Idol, 'personnelType' | 'cooperationType' | 'joinDate' | 'resignedDate' | 'status'>, period: string): boolean {
  const isExcludedServiceGuest =
    personnel.personnelType === 'Dịch vụ ngoài' || personnel.cooperationType === 'service_guest';

  return !isExcludedServiceGuest && isEligibleForPayrollPeriod(
    period,
    personnel.joinDate,
    personnel.resignedDate,
    personnel.status
  );
}

export function countExpectedPayrollPersonnel(personnel: Idol[], period: string): number {
  return personnel.filter((item) => isPayrollEligiblePersonnel(item, period)).length;
}
