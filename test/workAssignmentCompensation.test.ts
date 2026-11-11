import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkAssignmentCompensation } from '../src/utils/workAssignmentCompensation.ts';

test('calculates one 15-hour work trip as 8 hours at 1.5x and 7 hours at 2x', () => {
  const result = calculateWorkAssignmentCompensation({
    startAt: '2026-11-03T08:00:00+07:00',
    endAt: '2026-11-03T23:00:00+07:00',
    contractBaseSalary: 20_800_000,
    standardWorkDays: 26
  });
  assert.equal(result.calendarDays, 1);
  assert.equal(result.totalHours, 15);
  assert.equal(result.baseHours, 8);
  assert.equal(result.premiumHours, 7);
  assert.equal(result.hourlyRate, 100_000);
  assert.equal(result.totalPay, 2_600_000);
});

test('calculates a three-day trip with 24 base hours and shifts Sunday rest day', () => {
  const result = calculateWorkAssignmentCompensation({
    startAt: '2026-11-05T08:00:00+07:00',
    endAt: '2026-11-07T23:00:00+07:00',
    contractBaseSalary: 20_800_000,
    standardWorkDays: 26
  });
  assert.equal(result.calendarDays, 3);
  assert.equal(result.baseHours, 24);
  assert.equal(result.premiumHours, 39);
  assert.equal(result.restDayDate, '2026-11-09');
});

test('returns zero compensation for incomplete or reversed trip times', () => {
  const result = calculateWorkAssignmentCompensation({ contractBaseSalary: 20_800_000, startAt: '2026-11-03T10:00:00+07:00', endAt: '2026-11-03T09:00:00+07:00' });
  assert.equal(result.totalPay, 0);
  assert.equal(result.totalHours, 0);
});
