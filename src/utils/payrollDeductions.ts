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
