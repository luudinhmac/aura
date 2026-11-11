export interface IdolKpiEligibilityInput {
  isIdol?: boolean | null;
  personnelType?: string | null;
  department?: string | null;
  hasActiveActivity?: boolean;
}

/**
 * The personal operational KPI is reserved for company Idol profiles that
 * have at least one active activity assignment and are not Board members.
 * Revenue belonging to any other personnel profile remains company revenue,
 * but must not be included in personal Idol KPI calculations.
 */
export function isEligibleForIdolKpi(personnel: IdolKpiEligibilityInput): boolean {
  return personnel.isIdol === true
    && personnel.personnelType === 'Công ty'
    && personnel.department !== 'Ban Giám Đốc'
    && personnel.hasActiveActivity !== false;
}
