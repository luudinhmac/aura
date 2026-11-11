import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../prisma/migrations/00000000000000_squashed_baseline/migration.sql', import.meta.url), 'utf8');

test('payroll feedback schema keeps period schedule and dispute audit links', () => {
  assert.match(schema, /feedbackStartsAt DateTime\? @db\.Date/);
  assert.match(schema, /approvalStartsAt DateTime\? @db\.Date/);
  assert.match(schema, /lockStartsAt\s+DateTime\? @db\.Date/);
  assert.match(schema, /model PayrollDispute/);
  assert.match(schema, /period\s+PayrollPeriod/);
  assert.match(schema, /record\s+PayrollRecord/);
  assert.match(schema, /submittedBy\s+UserAccount\?/);
  assert.match(schema, /reviewedBy\s+UserAccount\?/);
});

test('payroll feedback migration protects linked records and adds review indexes', () => {
  assert.match(migration, /CREATE TABLE (?:public\.)?"?payroll_disputes"?\s*\(/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /payroll_disputes_periodId_status_idx/);
  assert.match(migration, /payroll_disputes_recordId_status_idx/);
  assert.match(migration, /payroll_disputes_personnelId_createdAt_idx/);
});
