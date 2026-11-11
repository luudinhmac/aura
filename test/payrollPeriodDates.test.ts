import assert from 'node:assert/strict';
import test from 'node:test';
import { toPrismaDateOnly } from '../server/db/payrollPeriodDates.ts';

test('converts a date-only payroll calendar value to midnight UTC for Prisma', () => {
  const date = toPrismaDateOnly('2026-11-01');

  assert.equal(date.toISOString(), '2026-11-01T00:00:00.000Z');
});

test('rejects invalid date-only values instead of passing them to Prisma', () => {
  assert.throws(() => toPrismaDateOnly('2026-02-30'), /Invalid date-only value/);
  assert.throws(() => toPrismaDateOnly('2026-11-01T00:00:00Z'), /Invalid date-only value/);
});
