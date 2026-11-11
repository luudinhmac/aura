import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../server/db/prisma.ts';
import { buildPayrollSnapshotAuditReport, PayrollSnapshotAuditRecord } from '../src/utils/payrollSnapshotAudit.ts';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readOutputPath(): string | undefined {
  const outputIndex = process.argv.indexOf('--out');
  if (outputIndex === -1) return undefined;
  const outputPath = process.argv[outputIndex + 1];
  if (!outputPath || outputPath.startsWith('--')) throw new Error('--out cần có đường dẫn file');
  return outputPath;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL');

  const [periods, records] = await Promise.all([
    prisma.payrollPeriod.findMany({
      select: { id: true, period: true, status: true, totalGross: true, totalDeductions: true, totalNet: true, employeeCount: true },
      orderBy: { period: 'desc' }
    }),
    prisma.payrollRecord.findMany({
      select: {
        id: true,
        periodId: true,
        period: true,
        personnelId: true,
        paymentStatus: true,
        baseSalary: true,
        contractSalarySnapshot: true,
        totalGross: true,
        totalDeductions: true,
        netSalary: true,
        earningsDetail: true,
        adjustmentLogs: true,
        personnel: { select: { baseSalary: true } }
      },
      orderBy: [{ period: 'desc' }, { personnelId: 'asc' }]
    })
  ]);

  const auditRecords: PayrollSnapshotAuditRecord[] = records.map((record) => {
    const earnings = record.earningsDetail && typeof record.earningsDetail === 'object' && !Array.isArray(record.earningsDetail)
      ? record.earningsDetail as Record<string, unknown>
      : {};
    const snapshot = record.contractSalarySnapshot ?? earnings.contractBaseSalary;
    return {
      id: record.id,
      periodId: record.periodId,
      period: record.period,
      personnelId: record.personnelId,
      paymentStatus: record.paymentStatus,
      snapshotContractSalary: snapshot === undefined || snapshot === null ? null : toNumber(snapshot),
      currentPersonnelSalary: toNumber(record.personnel.baseSalary),
      baseSalary: toNumber(record.baseSalary),
      totalGross: toNumber(record.totalGross),
      totalDeductions: toNumber(record.totalDeductions),
      netSalary: toNumber(record.netSalary),
      hasAdjustmentLogs: Array.isArray(record.adjustmentLogs) && record.adjustmentLogs.length > 0
    };
  });

  const report = buildPayrollSnapshotAuditReport(
    periods.map((period) => ({
      id: period.id,
      period: period.period,
      status: period.status,
      totalGross: toNumber(period.totalGross),
      totalDeductions: toNumber(period.totalDeductions),
      totalNet: toNumber(period.totalNet),
      employeeCount: period.employeeCount
    })),
    auditRecords
  );

  const outputPath = readOutputPath();
  if (outputPath) {
    const resolvedPath = path.resolve(process.cwd(), outputPath);
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.error(`Đã ghi báo cáo audit chỉ đọc: ${resolvedPath}`);
  }
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
