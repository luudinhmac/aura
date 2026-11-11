import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAYROLL_DISPUTE_CATEGORY_LABELS,
  PAYROLL_DISPUTE_STATUS_LABELS,
  formatPayrollCalendarDate,
  getPayrollFeedbackDeadline,
  formatPayrollDisputeValue
} from '../src/utils/payrollDisputePresentation.ts';

test('payroll dispute presentation covers every supported category and status', () => {
  assert.equal(Object.keys(PAYROLL_DISPUTE_CATEGORY_LABELS).length, 7);
  assert.equal(PAYROLL_DISPUTE_CATEGORY_LABELS.attendance, 'Lệch công / ngày công');
  assert.equal(Object.keys(PAYROLL_DISPUTE_STATUS_LABELS).length, 6);
  assert.equal(PAYROLL_DISPUTE_STATUS_LABELS.submitted, 'Chờ tiếp nhận');
});

test('formats payroll dispute values without exposing technical JSON keys', () => {
  assert.deepEqual(formatPayrollDisputeValue({ baseSalary: 20000000, netSalary: 14537037, actualWorkDays: 27 }), [
    { label: 'Lương cơ bản', value: '20.000.000 đ' },
    { label: 'Thực nhận', value: '14.537.037 đ' },
    { label: 'Ngày công thực tế', value: '27' }
  ]);
  assert.deepEqual(formatPayrollDisputeValue({ description: 'Kiểm tra lại KPI' }), [{ label: 'Đề nghị', value: 'Kiểm tra lại KPI' }]);
});

test('formats payroll calendar dates as Vietnamese day/month/year', () => {
  assert.equal(formatPayrollCalendarDate('2026-01-05'), '05/01/2026');
  assert.equal(formatPayrollCalendarDate('invalid'), 'invalid');
  assert.equal(getPayrollFeedbackDeadline('2026-01-01', '2026-01-04'), '03/01/2026');
});
