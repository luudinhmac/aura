import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSalaryForPayrollPeriod } from '../src/utils/payrollSalaryResolver.ts';

const history = [
  { id: 'salary-30m', salaryAmount: 30000000, effectiveFrom: '2024-01-01', effectiveTo: '2024-12-31' },
  { id: 'salary-40m', salaryAmount: 40000000, effectiveFrom: '2025-01-01' }
];

test('resolves the historical salary for each payroll year without using the current salary', () => {
  const priorYear = resolveSalaryForPayrollPeriod('2024-10', history, 40000000);
  const newYear = resolveSalaryForPayrollPeriod('2025-01', history, 0);

  assert.equal(priorYear.monthlySalary, 30000000);
  assert.equal(priorYear.proratedSalary, 30000000);
  assert.equal(priorYear.salaryHistoryId, 'salary-30m');
  assert.equal(newYear.monthlySalary, 40000000);
  assert.equal(newYear.proratedSalary, 40000000);
  assert.equal(newYear.salaryHistoryId, 'salary-40m');
});

test('weights a mid-month salary change by working days and preserves segments', () => {
  const resolved = resolveSalaryForPayrollPeriod('2025-01', [
    { id: 'salary-30m', salaryAmount: 30000000, effectiveFrom: '2024-01-01', effectiveTo: '2025-01-15' },
    { id: 'salary-40m', salaryAmount: 40000000, effectiveFrom: '2025-01-16' }
  ], 0);

  assert.equal(resolved.segments.length, 2);
  assert.deepEqual(resolved.segments.map((segment) => segment.workDays), [13, 14]);
  assert.equal(resolved.proratedSalary, Math.round((30000000 * 13 + 40000000 * 14) / 27));
  assert.equal(resolved.salaryHistoryId, 'salary-40m');
  assert.equal(resolved.salaryEffectiveFrom, '2025-01-16');
});

test('clips salary segments to join and resignation dates', () => {
  const resolved = resolveSalaryForPayrollPeriod('2025-01', [
    { id: 'salary-30m', salaryAmount: 30000000, effectiveFrom: '2024-01-01', effectiveTo: '2025-01-15' },
    { id: 'salary-40m', salaryAmount: 40000000, effectiveFrom: '2025-01-16' }
  ], 0, '2025-01-10', '2025-01-24');

  assert.equal(resolved.segments[0].effectiveFrom, '2025-01-10');
  assert.equal(resolved.segments.at(-1)?.effectiveTo, '2025-01-24');
  assert.equal(resolved.segments.reduce((sum, segment) => sum + segment.workDays, 0), 13);
});
