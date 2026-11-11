import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveServiceUsageStatus } from '../server/db/pgStore.ts';

test('service usage status follows start and end times', () => {
  const base = new Date('2026-11-02T12:00:00.000Z');
  const record = { usageDate: '2026-11-02', startAt: '2026-11-02T10:00:00.000Z', endAt: '2026-11-02T14:00:00.000Z' };
  assert.equal(deriveServiceUsageStatus(record, new Date('2026-11-02T09:59:00.000Z')), 'planned');
  assert.equal(deriveServiceUsageStatus(record, base), 'in_progress');
  assert.equal(deriveServiceUsageStatus(record, new Date('2026-11-02T14:01:00.000Z')), 'completed');
});

test('cancelled service usage stays cancelled regardless of time', () => {
  assert.equal(deriveServiceUsageStatus({ status: 'cancelled', usageDate: '2020-01-01' }, new Date('2026-11-02')), 'cancelled');
});

test('date-only service usage is active during its usage day', () => {
  assert.equal(deriveServiceUsageStatus({ usageDate: '2026-11-02' }, new Date('2026-11-02T12:00:00.000Z')), 'in_progress');
  assert.equal(deriveServiceUsageStatus({ usageDate: '2026-11-02' }, new Date('2026-11-03T00:00:01.000Z')), 'completed');
});
