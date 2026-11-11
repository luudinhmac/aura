export type PayrollSnapshotSource = 'explicit_snapshot' | 'legacy_evidence' | 'missing_snapshot';

export interface PayrollSnapshotInput {
  contractSalarySnapshot?: number | null;
  earnings?: {
    contractBaseSalary?: number | null;
  } | null;
}

function isFiniteAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function classifyPayrollSnapshot(record: PayrollSnapshotInput): PayrollSnapshotSource {
  if (isFiniteAmount(record.contractSalarySnapshot)) return 'explicit_snapshot';
  if (isFiniteAmount(record.earnings?.contractBaseSalary)) return 'legacy_evidence';
  return 'missing_snapshot';
}
