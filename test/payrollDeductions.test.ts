import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayrollDeductions, recalculatePayrollRecordFinancials } from '../src/utils/payrollDeductions.ts';

test('calculates tax and insurance from contract salary for company personnel', () => {
  assert.deepEqual(calculatePayrollDeductions({ contractSalary: 20_000_000, personnelType: 'Công ty' }), {
    tax: 900_000,
    employeeInsurance: 2_100_000,
    companyInsurance: 4_300_000
  });
});

test('does not charge tax below the configured threshold', () => {
  assert.deepEqual(calculatePayrollDeductions({ contractSalary: 10_000_000, personnelType: 'Công ty' }), {
    tax: 0,
    employeeInsurance: 1_050_000,
    companyInsurance: 2_150_000
  });
});

test('does not calculate insurance for non-company personnel', () => {
  assert.deepEqual(calculatePayrollDeductions({ contractSalary: 20_000_000, personnelType: 'Cộng tác viên' }), {
    tax: 900_000,
    employeeInsurance: 0,
    companyInsurance: 0
  });
});

test('includes KPI income in automatic personal income tax', () => {
  assert.equal(
    calculatePayrollDeductions({
      contractSalary: 20_000_000,
      taxableIncome: 21_000_000,
      personnelType: 'Công ty'
    }).tax,
    1_000_000
  );
});

test('recalculatePayrollRecordFinancials preserves allowances/workAssignmentPay and recalculates PIT and net salary', () => {
  const result = recalculatePayrollRecordFinancials({
    earnings: {
      baseSalary: 10_000_000,
      overtimePay: 500_000,
      kpiBonus: 1_000_000,
      commissionGmv: 4_000_000,
      giftShare: 500_000,
      allowance: 500_000,
      hotBonus: 0,
      workAssignmentPay: 500_000,
      otherBonus: 0
    },
    deductions: {
      liveHoursPenalty: 0,
      unpaidLeaveDeduction: 0,
      advancePayment: 0,
      otherPenalty: 200_000,
      otherDeduction: 0
    },
    contractSalary: 10_000_000,
    personnelType: 'Công ty'
  });

  // Gross = 10M + 0.5M + 1M + 4M + 0.5M + 0.5M + 0.5M = 17,000,000
  assert.equal(result.totalGross, 17_000_000);
  // PIT = (17M - 11M) * 0.1 = 600,000; Emp Ins = 10M * 0.105 = 1,050,000; otherPenalty = 200,000
  assert.equal(result.deductions.tax, 600_000);
  assert.equal(result.deductions.insurance, 1_050_000);
  assert.equal(result.totalDeductions, 1_850_000);
  assert.equal(result.netSalary, 15_150_000);
  assert.equal(result.companyInsurance, 2_150_000);
  assert.equal(result.companyLaborCost, 19_150_000);
});
