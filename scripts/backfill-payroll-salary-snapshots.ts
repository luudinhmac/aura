import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../server/db/prisma.ts';
import {
  buildPayrollSalaryBackfillPlan,
  PayrollSalaryBackfillInput
} from '../src/utils/payrollSalaryBackfill.ts';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cliValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`--${name} can co gia tri`);
  return value;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function extractBackupRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as { payrollRecords?: unknown[] }).payrollRecords)) {
    return (value as { payrollRecords: unknown[] }).payrollRecords;
  }
  return [];
}

async function loadBackupAmounts(backupPath: string | undefined): Promise<Map<string, number>> {
  if (!backupPath) return new Map();
  const resolvedPath = path.resolve(process.cwd(), backupPath);
  const parsed = JSON.parse(await fs.readFile(resolvedPath, 'utf8')) as unknown;
  const result = new Map<string, number>();
  for (const item of extractBackupRecords(parsed)) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : undefined;
    const earnings = record.earnings && typeof record.earnings === 'object'
      ? record.earnings as Record<string, unknown>
      : null;
    const amount = earnings?.contractBaseSalary ?? record.contractSalarySnapshot;
    const numericAmount = Number(amount);
    if (id && Number.isFinite(numericAmount) && numericAmount >= 0) result.set(id, numericAmount);
  }
  return result;
}

function totalsFromPeriod(period: { totalGross: unknown; totalDeductions: unknown; totalNet: unknown; employeeCount: number }) {
  return {
    totalGross: toNumber(period.totalGross),
    totalDeductions: toNumber(period.totalDeductions),
    totalNet: toNumber(period.totalNet),
    employeeCount: period.employeeCount
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('Thieu DATABASE_URL');

  const apply = hasFlag('apply');
  const actorUserIdValue = cliValue('actor-user-id');
  if (apply && (!actorUserIdValue || !Number.isInteger(Number(actorUserIdValue)))) {
    throw new Error('Backfill apply can --actor-user-id cua Super Admin');
  }

  const backupAmounts = await loadBackupAmounts(cliValue('backup'));
  const records = await prisma.payrollRecord.findMany({
    select: {
      id: true,
      periodId: true,
      period: true,
      paymentStatus: true,
      contractSalarySnapshot: true,
      earningsDetail: true,
      adjustmentLogs: true,
      periodRel: { select: { status: true } }
    },
    orderBy: [{ period: 'desc' }, { id: 'asc' }]
  });

  const input: PayrollSalaryBackfillInput[] = records.map((record) => ({
    id: record.id,
    periodId: record.periodId,
    period: record.period,
    periodStatus: record.periodRel.status,
    paymentStatus: record.paymentStatus,
    contractSalarySnapshot: record.contractSalarySnapshot === null ? null : toNumber(record.contractSalarySnapshot),
    earningsDetail: record.earningsDetail,
    adjustmentLogs: record.adjustmentLogs,
    backupContractSalary: backupAmounts.get(record.id) ?? null
  }));
  const plan = buildPayrollSalaryBackfillPlan(input);

  const outputPath = cliValue('out');
  if (outputPath) {
    const resolvedPath = path.resolve(process.cwd(), outputPath);
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    console.error(`Da ghi backfill plan: ${resolvedPath}`);
  }

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const actorUserId = Number(actorUserIdValue);
  const actor = await prisma.userAccount.findUnique({
    where: { id: actorUserId },
    select: { id: true, accountType: true, isSuperAdmin: true }
  });
  if (!actor || actor.accountType !== 'system_admin' || actor.isSuperAdmin !== true) {
    throw new Error('Backfill chi duoc phep boi Super Admin he thong');
  }
  if (plan.candidates.length === 0) {
    console.log('Khong co record hop le de backfill. Khong co thay doi.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    const periodIds = [...new Set(plan.candidates.map((candidate) => candidate.periodId))];
    const beforePeriods = await tx.payrollPeriod.findMany({
      where: { id: { in: periodIds } },
      select: { id: true, totalGross: true, totalDeductions: true, totalNet: true, employeeCount: true }
    });
    const beforeById = new Map(beforePeriods.map((period) => [period.id, totalsFromPeriod(period)]));

    for (const candidate of plan.candidates) {
      const updated = await tx.payrollRecord.updateMany({
        where: { id: candidate.recordId, contractSalarySnapshot: null },
        data: {
          contractSalarySnapshot: candidate.proposedContractSalary,
          salarySnapshotAt: new Date()
        }
      });
      if (updated.count !== 1) throw new Error(`Record ${candidate.recordId} da thay doi; transaction backfill bi huy`);

      await tx.auditLog.create({
        data: {
          requestId: randomUUID(),
          actorUserId,
          method: 'SCRIPT',
          path: 'scripts/backfill-payroll-salary-snapshots.ts',
          action: 'payroll.salary_snapshot.backfill',
          resource: 'payroll_record',
          resourceId: candidate.recordId,
          statusCode: 200,
          metadata: {
            periodId: candidate.periodId,
            period: candidate.period,
            evidence: candidate.evidence,
            proposedContractSalary: candidate.proposedContractSalary,
            moneyFieldsChanged: false
          }
        }
      });
    }

    const afterPeriods = await tx.payrollPeriod.findMany({
      where: { id: { in: periodIds } },
      select: { id: true, totalGross: true, totalDeductions: true, totalNet: true, employeeCount: true }
    });
    for (const period of afterPeriods) {
      const before = beforeById.get(period.id);
      const after = totalsFromPeriod(period);
      if (!before || JSON.stringify(before) !== JSON.stringify(after)) {
        throw new Error(`Tong tien ky ${period.id} thay doi trong backfill; transaction bi huy`);
      }
    }
  });

  console.log(JSON.stringify({ applied: plan.candidates.length, moneyFieldsChanged: false }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
