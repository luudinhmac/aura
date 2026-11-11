import test from 'node:test';
import assert from 'node:assert/strict';
import { countExpectedPayrollPersonnel } from '../src/utils/payrollReconciliation.ts';

const personnel = (overrides: Record<string, unknown> = {}) => ({
  personnelType: 'Công ty',
  cooperationType: 'internal',
  joinDate: '2025-01-01',
  resignedDate: undefined,
  status: 'Đang hoạt động',
  ...overrides
}) as any;

test('counts only eligible personnel profiles for payroll reconciliation', () => {
  const records = [
    personnel(),
    personnel({ personnelType: 'Dịch vụ ngoài' }),
    personnel({ joinDate: '2025-11-01' }),
    personnel({ status: 'Đã nghỉ việc', resignedDate: '2025-09-30' })
  ];

  assert.equal(countExpectedPayrollPersonnel(records, '2025-10'), 1);
});

test('does not derive payroll count from standalone user accounts', () => {
  const personnelProfiles = [personnel(), personnel({ joinDate: '2025-10-31' })];

  // A root/system-admin UserAccount is intentionally not represented here.
  assert.equal(countExpectedPayrollPersonnel(personnelProfiles, '2025-10'), 2);
});
