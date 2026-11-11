import test from 'node:test';
import assert from 'node:assert/strict';
import { canLockOrPayPayroll, canSubmitOrApprovePayroll, getPayrollCalendarDates } from '../src/utils/payrollCalendar.ts';

test('builds the payroll calendar in the month after the payroll period', () => {
  assert.deepEqual(getPayrollCalendarDates('2025-12'), {
    feedbackStartsAt: '2026-01-01',
    approvalStartsAt: '2026-01-04',
    lockStartsAt: '2026-01-05'
  });
});

test('approval starts on day four and lock/pay starts on day five only after approval', () => {
  const calendar = getPayrollCalendarDates('2025-12');
  assert.equal(canSubmitOrApprovePayroll('2026-01-03', calendar), false);
  assert.equal(canSubmitOrApprovePayroll('2026-01-04', calendar), true);
  assert.equal(canLockOrPayPayroll('draft', '2026-01-05', calendar), false);
  assert.equal(canLockOrPayPayroll('approved', '2026-01-04', calendar), false);
  assert.equal(canLockOrPayPayroll('approved', '2026-01-05', calendar), true);
});
