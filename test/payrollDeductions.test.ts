import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayrollDeductions } from '../src/utils/payrollDeductions.ts';

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
