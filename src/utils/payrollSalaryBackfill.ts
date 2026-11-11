export type SalaryBackfillEvidenceSource =
  | 'earningsDetail.contractBaseSalary'
  | 'earningsDetail.contractSalarySnapshot'
  | 'adjustmentLogs.contractBaseSalary'
  | 'adjustmentLogs.contractSalarySnapshot'
  | 'backup.payrollRecord';

export type SalaryBackfillEvidence = {
  source: SalaryBackfillEvidenceSource;
  amount: number;
};

export type PayrollSalaryBackfillInput = {
  id: string;
  periodId: string;
  period: string;
  periodStatus: string;
  paymentStatus: string;
  contractSalarySnapshot: number | null;
  earningsDetail: unknown;
  adjustmentLogs: unknown;
  backupContractSalary?: number | null;
};

export type PayrollSalaryBackfillCandidate = {
  recordId: string;
  periodId: string;
  period: string;
  periodStatus: string;
  paymentStatus: string;
  proposedContractSalary: number;
  evidence: SalaryBackfillEvidence[];
};

export type PayrollSalaryBackfillPlan = {
  generatedAt: string;
  readOnly: true;
  summary: {
    recordCount: number;
    alreadySnapshottedCount: number;
    candidateCount: number;
    missingEvidenceCount: number;
    conflictingEvidenceCount: number;
  };
  candidates: PayrollSalaryBackfillCandidate[];
  skipped: Array<{
    recordId: string;
    period: string;
    reason: 'already_snapshotted' | 'missing_evidence' | 'conflicting_evidence';
    evidence?: SalaryBackfillEvidence[];
  }>;
};

function finiteMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function collectEvidenceFromObject(
  value: unknown,
  sourcePrefix: 'earningsDetail' | 'adjustmentLogs',
  evidence: SalaryBackfillEvidence[]
): void {
  const object = objectValue(value);
  if (!object) return;

  for (const field of ['contractBaseSalary', 'contractSalarySnapshot'] as const) {
    const amount = finiteMoney(object[field]);
    if (amount === null) continue;
    evidence.push({
      source: `${sourcePrefix}.${field}` as SalaryBackfillEvidenceSource,
      amount
    });
  }
}

function collectEvidence(record: PayrollSalaryBackfillInput): SalaryBackfillEvidence[] {
  const evidence: SalaryBackfillEvidence[] = [];
  collectEvidenceFromObject(record.earningsDetail, 'earningsDetail', evidence);

  if (Array.isArray(record.adjustmentLogs)) {
    record.adjustmentLogs.forEach((log) => collectEvidenceFromObject(log, 'adjustmentLogs', evidence));
  }

  const backupAmount = finiteMoney(record.backupContractSalary);
  if (backupAmount !== null) evidence.push({ source: 'backup.payrollRecord', amount: backupAmount });
  return evidence;
}

export function buildPayrollSalaryBackfillPlan(
  records: PayrollSalaryBackfillInput[],
  generatedAt = new Date().toISOString()
): PayrollSalaryBackfillPlan {
  const candidates: PayrollSalaryBackfillCandidate[] = [];
  const skipped: PayrollSalaryBackfillPlan['skipped'] = [];

  for (const record of records) {
    if (record.contractSalarySnapshot !== null) {
      skipped.push({ recordId: record.id, period: record.period, reason: 'already_snapshotted' });
      continue;
    }

    const evidence = collectEvidence(record);
    const distinctAmounts = [...new Set(evidence.map((item) => item.amount))];
    if (distinctAmounts.length === 0) {
      skipped.push({ recordId: record.id, period: record.period, reason: 'missing_evidence' });
      continue;
    }
    if (distinctAmounts.length !== 1) {
      skipped.push({ recordId: record.id, period: record.period, reason: 'conflicting_evidence', evidence });
      continue;
    }

    candidates.push({
      recordId: record.id,
      periodId: record.periodId,
      period: record.period,
      periodStatus: record.periodStatus,
      paymentStatus: record.paymentStatus,
      proposedContractSalary: distinctAmounts[0],
      evidence
    });
  }

  return {
    generatedAt,
    readOnly: true,
    summary: {
      recordCount: records.length,
      alreadySnapshottedCount: skipped.filter((item) => item.reason === 'already_snapshotted').length,
      candidateCount: candidates.length,
      missingEvidenceCount: skipped.filter((item) => item.reason === 'missing_evidence').length,
      conflictingEvidenceCount: skipped.filter((item) => item.reason === 'conflicting_evidence').length
    },
    candidates,
    skipped
  };
}
