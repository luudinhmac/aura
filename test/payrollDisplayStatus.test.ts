import test from 'node:test';
import assert from 'node:assert/strict';
import { getPayrollDisplayStatus, PAYROLL_DISPLAY_STATUS_LABELS } from '../src/utils/payrollDisplayStatus.ts';

test('shows payroll rows as pending approval before director approval', () => {
  assert.equal(getPayrollDisplayStatus('draft', 'pending'), 'pending_approval');
  assert.equal(getPayrollDisplayStatus('pending_approval', 'pending'), 'pending_approval');
  assert.equal(PAYROLL_DISPLAY_STATUS_LABELS.pending_approval, 'Chờ duyệt');
});

test('shows payroll rows as pending payment after director approval', () => {
  assert.equal(getPayrollDisplayStatus('approved', 'pending'), 'pending_payment');
  assert.equal(PAYROLL_DISPLAY_STATUS_LABELS.pending_payment, 'Chờ chi');
});

test('shows paid status only after payment or period lock', () => {
  assert.equal(getPayrollDisplayStatus('locked_paid', 'pending'), 'paid');
  assert.equal(getPayrollDisplayStatus('approved', 'paid'), 'pending_payment');
  assert.equal(PAYROLL_DISPLAY_STATUS_LABELS.paid, 'Đã chi');
});

test('keeps legacy payment-based behavior when period status is unavailable', () => {
  assert.equal(getPayrollDisplayStatus(undefined, 'pending'), 'pending_payment');
  assert.equal(getPayrollDisplayStatus(null, 'paid'), 'paid');
});

test('does not show a paid payslip before the payroll period is locked', () => {
  assert.equal(getPayrollDisplayStatus('draft', 'paid'), 'pending_approval');
  assert.equal(getPayrollDisplayStatus('pending_approval', 'paid'), 'pending_approval');
  assert.equal(getPayrollDisplayStatus('approved', 'paid'), 'pending_payment');
});
