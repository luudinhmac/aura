import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPayrollPeriodMutable, canMutatePayrollAmounts } from '../src/utils/payrollPeriodGuards.ts';
import { classifyPayrollSnapshot } from '../src/utils/payrollSnapshotStatus.ts';
import { assertPayrollApprovalAllowed, assertPayrollLockAllowed, assertPayrollSubmitAllowed, canSubmitPayroll, isPayrollDirector } from '../src/utils/payrollWorkflowPermissions.ts';

test('allows payroll amount changes only before final approval/lock', () => {
  assert.equal(canMutatePayrollAmounts('draft'), true);
  assert.equal(canMutatePayrollAmounts('pending_approval'), true);
  assert.equal(canMutatePayrollAmounts('approved'), false);
  assert.equal(canMutatePayrollAmounts('locked_paid'), false);
});

test('rejects finalized payroll mutation', () => {
  assert.throws(() => assertPayrollPeriodMutable('locked_paid'), /Khong the thay doi tien/);
});

test('classifies explicit, legacy and missing payroll salary snapshots', () => {
  assert.equal(classifyPayrollSnapshot({ contractSalarySnapshot: 40000000, earnings: { contractBaseSalary: 30000000 } }), 'explicit_snapshot');
  assert.equal(classifyPayrollSnapshot({ contractSalarySnapshot: null, earnings: { contractBaseSalary: 30000000 } }), 'legacy_evidence');
  assert.equal(classifyPayrollSnapshot({ contractSalarySnapshot: null, earnings: {} }), 'missing_snapshot');
});

test('separates payroll submitter and director workflow permissions', () => {
  const director = { role: 'director', roleTitle: 'Giám đốc điều hành', allowedActions: ['approve_payroll'] };
  const accountant = { roleTitle: 'Chuyên viên Nhân sự & Kế toán', allowedActions: ['manage_payroll'] };

  assert.equal(isPayrollDirector(director), true);
  assert.equal(canSubmitPayroll(director), false);
  assert.equal(canSubmitPayroll(accountant), true);
  assert.throws(() => assertPayrollSubmitAllowed('draft', director), /không được trình/);
  assert.throws(() => assertPayrollApprovalAllowed('draft', director), /đã được trình/);
  assert.doesNotThrow(() => assertPayrollSubmitAllowed('draft', accountant));
  assert.doesNotThrow(() => assertPayrollApprovalAllowed('pending_approval', director));
  assert.doesNotThrow(() => assertPayrollLockAllowed('approved', director));
});
