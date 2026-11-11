import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayrollSalaryBackfillPlan } from '../src/utils/payrollSalaryBackfill.ts';

const baseRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'record-1',
  periodId: 'payroll-2024-12',
  period: '2024-12',
  periodStatus: 'locked_paid',
  paymentStatus: 'paid',
  contractSalarySnapshot: null,
  earningsDetail: {},
  adjustmentLogs: [],
  ...overrides
});

test('plans a backfill only from explicit earnings evidence', () => {
  const plan = buildPayrollSalaryBackfillPlan([
    baseRecord({ earningsDetail: { contractBaseSalary: 30000000 } })
  ]);

  assert.equal(plan.summary.candidateCount, 1);
  assert.equal(plan.candidates[0].proposedContractSalary, 30000000);
  assert.equal(plan.candidates[0].evidence[0].source, 'earningsDetail.contractBaseSalary');
});

test('does not use the current salary or overwrite an existing snapshot', () => {
  const plan = buildPayrollSalaryBackfillPlan([
    baseRecord({ earningsDetail: { baseSalary: 40000000 } }),
    baseRecord({ id: 'record-2', contractSalarySnapshot: 30000000, earningsDetail: { contractBaseSalary: 40000000 } })
  ]);

  assert.equal(plan.summary.candidateCount, 0);
  assert.equal(plan.summary.missingEvidenceCount, 1);
  assert.equal(plan.summary.alreadySnapshottedCount, 1);
});

test('quarantines conflicting evidence for manual review', () => {
  const plan = buildPayrollSalaryBackfillPlan([
    baseRecord({
      earningsDetail: { contractBaseSalary: 30000000 },
      adjustmentLogs: [{ contractSalarySnapshot: 40000000 }]
    })
  ]);

  assert.equal(plan.summary.conflictingEvidenceCount, 1);
  assert.equal(plan.candidates.length, 0);
  assert.equal(plan.skipped[0].reason, 'conflicting_evidence');
});

test('allows a backup record as evidence without changing the proposed amount', () => {
  const plan = buildPayrollSalaryBackfillPlan([
    baseRecord({ backupContractSalary: 30000000 })
  ]);

  assert.equal(plan.summary.candidateCount, 1);
  assert.equal(plan.candidates[0].evidence[0].source, 'backup.payrollRecord');
});
