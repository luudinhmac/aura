import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayrollSnapshotAuditReport } from '../src/utils/payrollSnapshotAudit.ts';

const period = (overrides: Record<string, unknown> = {}) => ({
  id: 'payroll-2024-12',
  period: '2024-12',
  status: 'locked_paid',
  totalGross: 30000000,
  totalDeductions: 0,
  totalNet: 30000000,
  employeeCount: 1,
  ...overrides
});

const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'record-1',
  periodId: 'payroll-2024-12',
  period: '2024-12',
  personnelId: 7,
  paymentStatus: 'paid',
  snapshotContractSalary: 30000000,
  currentPersonnelSalary: 40000000,
  baseSalary: 30000000,
  totalGross: 30000000,
  totalDeductions: 0,
  netSalary: 30000000,
  hasAdjustmentLogs: false,
  ...overrides
});

test('preserves historical mismatch as an audit finding when current salary increases', () => {
  const report = buildPayrollSnapshotAuditReport([period()], [record()]);

  assert.equal(report.summary.currentSalaryMismatchRecordCount, 1);
  assert.equal(report.summary.missingSnapshotRecordCount, 0);
  assert.equal(report.periods[0].totalsMatch, true);
});

test('classifies missing snapshots without inventing a historical salary', () => {
  const report = buildPayrollSnapshotAuditReport([period({ employeeCount: 2, totalGross: 70000000, totalNet: 70000000 })], [
    record(),
    record({ id: 'record-2', personnelId: 8, snapshotContractSalary: null, currentPersonnelSalary: 40000000, baseSalary: 40000000, totalGross: 40000000, netSalary: 40000000 })
  ]);

  assert.equal(report.summary.missingSnapshotRecordCount, 1);
  assert.equal(report.periods[0].records[1].snapshotContractSalary, null);
});

test('reports stored period total drift and adjusted records', () => {
  const report = buildPayrollSnapshotAuditReport([period({ totalGross: 29000000, totalNet: 29000000 })], [record({ hasAdjustmentLogs: true })]);

  assert.equal(report.summary.adjustedRecordCount, 1);
  assert.equal(report.summary.periodsWithTotalMismatchCount, 1);
});
