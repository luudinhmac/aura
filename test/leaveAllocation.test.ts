import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLeaveAllocation, getRemainingAnnualLeaveDays, getReservedAnnualLeaveDays } from '../src/utils/leaveAllocation.ts';

test('allocates annual leave before unpaid leave when the quota is insufficient', () => {
  assert.deepEqual(calculateLeaveAllocation('annual', 5, 1, true), {
    annualLeaveDays: 1,
    unpaidLeaveDays: 4,
    requiresConfirmation: false
  });
  assert.equal(calculateLeaveAllocation('annual', 5, 1, false).requiresConfirmation, true);
});

test('treats personal and sick leave as unpaid for this allocation flow', () => {
  assert.deepEqual(calculateLeaveAllocation('personal', 2, 10, false), {
    annualLeaveDays: 0,
    unpaidLeaveDays: 2,
    requiresConfirmation: false
  });
  assert.deepEqual(calculateLeaveAllocation('sick', 2, 10, false), {
    annualLeaveDays: 0,
    unpaidLeaveDays: 2,
    requiresConfirmation: false
  });
});

test('reserves annual days for pending and approved requests but not rejected requests', () => {
  const requests = [
    { leaveType: 'annual' as const, status: 'approved' as const, totalDays: 2 },
    { leaveType: 'annual' as const, status: 'pending' as const, totalDays: 1, annualLeaveDays: 1 },
    { leaveType: 'annual' as const, status: 'rejected' as const, totalDays: 4 },
    { leaveType: 'personal' as const, status: 'approved' as const, totalDays: 3 }
  ];

  assert.equal(getReservedAnnualLeaveDays({ totalAnnualDays: 10, requests }), 3);
  assert.equal(getRemainingAnnualLeaveDays({ totalAnnualDays: 10, requests }), 7);
});
