export type PayrollSnapshotAuditRecord = {
  id: string;
  periodId: string;
  period: string;
  personnelId: number;
  paymentStatus: string;
  snapshotContractSalary: number | null;
  currentPersonnelSalary: number;
  baseSalary: number;
  totalGross: number;
  totalDeductions: number;
  netSalary: number;
  hasAdjustmentLogs: boolean;
};

export type PayrollSnapshotAuditPeriod = {
  id: string;
  period: string;
  status: string;
  storedTotals: {
    gross: number;
    deductions: number;
    net: number;
    employeeCount: number;
  };
  calculatedTotals: {
    gross: number;
    deductions: number;
    net: number;
    employeeCount: number;
  };
  totalsMatch: boolean;
  recordCount: number;
  missingSnapshotCount: number;
  currentSalaryMismatchCount: number;
  adjustedRecordCount: number;
  paidRecordCount: number;
  records: Array<{
    id: string;
    personnelId: number;
    snapshotContractSalary: number | null;
    currentPersonnelSalary: number;
    paymentStatus: string;
    hasAdjustmentLogs: boolean;
  }>;
};

export type PayrollSnapshotAuditReport = {
  generatedAt: string;
  readOnly: true;
  summary: {
    periodCount: number;
    recordCount: number;
    lockedOrPaidPeriodCount: number;
    missingSnapshotRecordCount: number;
    currentSalaryMismatchRecordCount: number;
    adjustedRecordCount: number;
    paidRecordCount: number;
    periodsWithTotalMismatchCount: number;
  };
  periods: PayrollSnapshotAuditPeriod[];
};

type InputPeriod = {
  id: string;
  period: string;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

export function buildPayrollSnapshotAuditReport(
  periods: InputPeriod[],
  records: PayrollSnapshotAuditRecord[],
  generatedAt = new Date().toISOString()
): PayrollSnapshotAuditReport {
  const recordsByPeriod = new Map<string, PayrollSnapshotAuditRecord[]>();
  for (const record of records) {
    const list = recordsByPeriod.get(record.periodId) || [];
    list.push(record);
    recordsByPeriod.set(record.periodId, list);
  }

  const periodReports = periods.map((period) => {
    const periodRecords = recordsByPeriod.get(period.id) || [];
    const calculatedTotals = periodRecords.reduce(
      (totals, record) => ({
        gross: totals.gross + record.totalGross,
        deductions: totals.deductions + record.totalDeductions,
        net: totals.net + record.netSalary,
        employeeCount: totals.employeeCount + 1
      }),
      { gross: 0, deductions: 0, net: 0, employeeCount: 0 }
    );
    const roundedCalculatedTotals = {
      gross: roundMoney(calculatedTotals.gross),
      deductions: roundMoney(calculatedTotals.deductions),
      net: roundMoney(calculatedTotals.net),
      employeeCount: calculatedTotals.employeeCount
    };
    const storedTotals = {
      gross: roundMoney(period.totalGross),
      deductions: roundMoney(period.totalDeductions),
      net: roundMoney(period.totalNet),
      employeeCount: period.employeeCount
    };
    const missingSnapshot = periodRecords.filter((record) => record.snapshotContractSalary === null);
    const currentSalaryMismatch = periodRecords.filter(
      (record) => record.snapshotContractSalary !== null && !closeEnough(record.snapshotContractSalary, record.currentPersonnelSalary)
    );
    const adjusted = periodRecords.filter((record) => record.hasAdjustmentLogs);
    const paid = periodRecords.filter((record) => record.paymentStatus === 'paid');

    return {
      id: period.id,
      period: period.period,
      status: period.status,
      storedTotals,
      calculatedTotals: roundedCalculatedTotals,
      totalsMatch:
        storedTotals.employeeCount === roundedCalculatedTotals.employeeCount &&
        closeEnough(storedTotals.gross, roundedCalculatedTotals.gross) &&
        closeEnough(storedTotals.deductions, roundedCalculatedTotals.deductions) &&
        closeEnough(storedTotals.net, roundedCalculatedTotals.net),
      recordCount: periodRecords.length,
      missingSnapshotCount: missingSnapshot.length,
      currentSalaryMismatchCount: currentSalaryMismatch.length,
      adjustedRecordCount: adjusted.length,
      paidRecordCount: paid.length,
      records: periodRecords.map((record) => ({
        id: record.id,
        personnelId: record.personnelId,
        snapshotContractSalary: record.snapshotContractSalary,
        currentPersonnelSalary: record.currentPersonnelSalary,
        paymentStatus: record.paymentStatus,
        hasAdjustmentLogs: record.hasAdjustmentLogs
      }))
    };
  });

  return {
    generatedAt,
    readOnly: true,
    summary: {
      periodCount: periodReports.length,
      recordCount: records.length,
      lockedOrPaidPeriodCount: periodReports.filter((period) => ['approved', 'locked_paid'].includes(period.status)).length,
      missingSnapshotRecordCount: periodReports.reduce((sum, period) => sum + period.missingSnapshotCount, 0),
      currentSalaryMismatchRecordCount: periodReports.reduce((sum, period) => sum + period.currentSalaryMismatchCount, 0),
      adjustedRecordCount: periodReports.reduce((sum, period) => sum + period.adjustedRecordCount, 0),
      paidRecordCount: periodReports.reduce((sum, period) => sum + period.paidRecordCount, 0),
      periodsWithTotalMismatchCount: periodReports.filter((period) => !period.totalsMatch).length
    },
    periods: periodReports
  };
}
