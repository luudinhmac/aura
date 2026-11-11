import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateUnpaidLeaveDeduction } from '../src/utils/payrollLeave.ts';

test('calculates unpaid leave deduction from monthly salary and standard days', () => {
  assert.equal(calculateUnpaidLeaveDeduction(26_000_000, 26, 4), 4_000_000);
});

test('returns zero for invalid or empty payroll inputs', () => {
  assert.equal(calculateUnpaidLeaveDeduction(26_000_000, 0, 4), 0);
  assert.equal(calculateUnpaidLeaveDeduction(-1, 26, 4), 0);
  assert.equal(calculateUnpaidLeaveDeduction(26_000_000, 26, 0), 0);
});
