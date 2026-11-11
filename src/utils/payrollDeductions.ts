import type { PayrollRecord } from '../types/index.ts';

export const PERSONAL_INCOME_TAX_THRESHOLD = 11_000_000;
export const PERSONAL_INCOME_TAX_RATE = 0.1;
export const EMPLOYEE_INSURANCE_RATE = 0.105;
export const COMPANY_INSURANCE_RATE = 0.215;

export interface PayrollDeductionInput {
  contractSalary: number;
  taxableIncome?: number;
  personnelType?: string;
}

export interface PayrollDeductions {
  tax: number;
  employeeInsurance: number;
  companyInsurance: number;
}

export function calculatePayrollDeductions({ contractSalary, taxableIncome, personnelType }: PayrollDeductionInput): PayrollDeductions {
  const salary = Math.max(0, Math.round(Number(contractSalary) || 0));
  const taxableBase = Math.max(0, Math.round(Number(taxableIncome ?? contractSalary) || 0));
  const isCompanyPersonnel = personnelType === 'Công ty';

  return {
    tax: Math.max(0, Math.round((taxableBase - PERSONAL_INCOME_TAX_THRESHOLD) * PERSONAL_INCOME_TAX_RATE)),
    employeeInsurance: isCompanyPersonnel ? Math.round(salary * EMPLOYEE_INSURANCE_RATE) : 0,
    companyInsurance: isCompanyPersonnel ? Math.round(salary * COMPANY_INSURANCE_RATE) : 0
  };
}

export interface PayrollRecordRecalcInput {
  earnings: Partial<PayrollRecord['earnings']> & Record<string, any>;
  deductions: Partial<PayrollRecord['deductions']> & Record<string, any>;
  contractSalary: number;
  personnelType?: string;
}

export interface PayrollRecordRecalcResult {
  earnings: PayrollRecord['earnings'];
  deductions: PayrollRecord['deductions'];
  totalGross: number;
  totalDeductions: number;
  netSalary: number;
  companyInsurance: number;
  companyLaborCost: number;
}

/**
 * Recomputes gross earnings, statutory PIT/insurance deductions, net pay,
 * and total employer labor cost consistently across sync and adjustment flows.
 */
export function recalculatePayrollRecordFinancials({
  earnings,
  deductions,
  contractSalary,
  personnelType
}: PayrollRecordRecalcInput): PayrollRecordRecalcResult {
  const baseSalary = Number(earnings.baseSalary) || 0;
  const overtimePay = Number(earnings.overtimePay) || 0;
  const kpiBonus = Number(earnings.kpiBonus) || 0;
  const commissionGmv = Number(earnings.commissionGmv) || 0;
  const giftShare = Number(earnings.giftShare) || 0;
  const allowance = Number(earnings.allowance) || 0;
  const hotBonus = Number(earnings.hotBonus) || 0;
  const workAssignmentPay = Number(earnings.workAssignmentPay) || 0;
  const otherBonus = Number(earnings.otherBonus) || 0;

  const totalGross =
    baseSalary +
    overtimePay +
    kpiBonus +
    commissionGmv +
    giftShare +
    allowance +
    hotBonus +
    workAssignmentPay +
    otherBonus;

  const nextEarnings: PayrollRecord['earnings'] = {
    ...earnings,
    baseSalary,
    kpiBonus,
    allowance,
    totalGross
  };

  const automaticDeductions = calculatePayrollDeductions({
    contractSalary,
    taxableIncome: totalGross,
    personnelType
  });

  const liveHoursPenalty = Number(deductions.liveHoursPenalty) || 0;
  const unpaidLeaveDeduction = Number(deductions.unpaidLeaveDeduction) || 0;
  const advancePayment = Number(deductions.advancePayment) || 0;
  const otherPenalty = Number(deductions.otherPenalty) || 0;
  const otherDeduction = Number(deductions.otherDeduction) || 0;

  const totalDeductions =
    liveHoursPenalty +
    unpaidLeaveDeduction +
    advancePayment +
    automaticDeductions.tax +
    automaticDeductions.employeeInsurance +
    otherPenalty +
    otherDeduction;

  const nextDeductions: PayrollRecord['deductions'] = {
    ...deductions,
    tax: automaticDeductions.tax,
    insurance: automaticDeductions.employeeInsurance,
    totalDeductions
  };

  const netSalary = Math.max(0, totalGross - totalDeductions);
  const companyInsurance = automaticDeductions.companyInsurance;
  const companyLaborCost = totalGross + companyInsurance;

  return {
    earnings: nextEarnings,
    deductions: nextDeductions,
    totalGross,
    totalDeductions,
    netSalary,
    companyInsurance,
    companyLaborCost
  };
}
