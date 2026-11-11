import test from 'node:test';
import assert from 'node:assert/strict';
import { canCancelPayrollDispute, canManagePayrollDisputes, canReviewPayrollDispute, canSubmitPayrollDispute } from '../src/utils/payrollDisputePolicy.ts';

test('payroll dispute managers include payroll, adjustment and director roles', () => {
  assert.equal(canManagePayrollDisputes({ id: '1', accountType: 'personnel', allowedActions: ['manage_payroll'] }), true);
  assert.equal(canManagePayrollDisputes({ id: '2', accountType: 'personnel', allowedActions: ['adjust_payroll'] }), true);
  assert.equal(canReviewPayrollDispute({ id: '3', accountType: 'personnel', role: 'director' }), true);
  assert.equal(canManagePayrollDisputes({ id: '4', accountType: 'personnel', allowedActions: [] }), false);
});

test('only the submitter can cancel a submitted payroll dispute', () => {
  assert.equal(canCancelPayrollDispute('submitted', '10', '10'), true);
  assert.equal(canCancelPayrollDispute('under_review', '10', '10'), false);
  assert.equal(canCancelPayrollDispute('submitted', '10', '11'), false);
});

test('payroll feedback opens only after attendance is closed and before director approval', () => {
  assert.equal(canSubmitPayrollDispute('draft'), false);
  assert.equal(canSubmitPayrollDispute('pending_approval'), true);
  assert.equal(canSubmitPayrollDispute('approved'), false);
  assert.equal(canSubmitPayrollDispute('locked_paid'), false);
});
