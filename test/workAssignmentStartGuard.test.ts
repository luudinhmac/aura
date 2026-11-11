import test from 'node:test';
import assert from 'node:assert/strict';
import { getSystemNow, getTodayIsoDate } from '../src/utils/dateUtils.ts';
import { isWorkAssignmentAcceptanceOpen } from '../src/utils/workAssignmentPolicy.ts';
import { isWorkAssignmentExpired } from '../src/utils/workAssignmentStatus.ts';

const canCompleteAt = (startAt: string | undefined, now: number): boolean =>
  !startAt || new Date(startAt).getTime() <= now;

test('work assignment cannot be completed before its start time', () => {
  const now = Date.parse('2026-11-02T08:00:00.000Z');
  assert.equal(canCompleteAt('2026-11-02T09:00:00.000Z', now), false);
  assert.equal(canCompleteAt('2026-11-02T07:59:59.000Z', now), true);
  assert.equal(canCompleteAt(undefined, now), true);
});

test('work assignment UI uses the configured system date as the current time', () => {
  const effectiveNow = getSystemNow('2026-01-01');
  assert.equal(new Date('2025-12-31T23:59:59').getTime() <= effectiveNow.getTime(), true);
  assert.equal(new Date('2026-01-02T00:00:00').getTime() > effectiveNow.getTime(), true);
});

test('work assignment acceptance closes at the configured system date', () => {
  assert.equal(isWorkAssignmentAcceptanceOpen('2025-12-31T12:00:00.000Z', '2026-01-01'), false);
  assert.equal(isWorkAssignmentAcceptanceOpen('2026-01-02T12:00:00.000Z', '2026-01-01'), true);
});

test('hides cancellation at and after the assignment end time, but keeps it before the end', () => {
  const endAt = '2026-11-05T10:00:00.000Z';
  assert.equal(isWorkAssignmentExpired(endAt, new Date('2026-11-05T09:59:59.999Z')), false);
  assert.equal(isWorkAssignmentExpired(endAt, new Date(endAt)), true);
  assert.equal(isWorkAssignmentExpired(endAt, new Date('2026-11-05T10:00:00.001Z')), true);
});

test('does not consider assignments without a valid end time expired', () => {
  const now = new Date('2026-11-05T10:00:00.000Z');
  assert.equal(isWorkAssignmentExpired(undefined, now), false);
  assert.equal(isWorkAssignmentExpired(null, now), false);
  assert.equal(isWorkAssignmentExpired('invalid-date', now), false);
});

test('custom system date advances across midnight from its saved real-time anchor', () => {
  const anchor = new Date('2026-11-05T15:30:00+07:00');
  const oneSecondBeforeMidnight = new Date(anchor.getTime() + (8 * 60 + 29) * 60 * 1000 + 59_000);
  const realNow = new Date(oneSecondBeforeMidnight.getTime() + 1000);
  const beforeMidnight = getSystemNow('2026-01-10', undefined, anchor.toISOString(), oneSecondBeforeMidnight);
  const effectiveNow = getSystemNow('2026-01-10', undefined, anchor.toISOString(), realNow);

  assert.equal(getTodayIsoDate('2026-01-10', undefined, anchor.toISOString(), oneSecondBeforeMidnight), '2026-01-10');
  assert.equal(getTodayIsoDate('2026-01-10', undefined, anchor.toISOString(), realNow), '2026-01-11');
  const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  assert.equal(timeFormatter.format(beforeMidnight), '23:59:59');
  assert.equal(timeFormatter.format(effectiveNow), '00:00:00');
});

test('custom system date remains continuous when the server restarts between reads', () => {
  const anchor = new Date('2026-11-05T15:30:00+07:00');
  const firstRead = getSystemNow('2026-01-10', undefined, anchor.toISOString(), new Date(anchor.getTime() + 1000));
  const laterRead = getSystemNow('2026-01-10', undefined, anchor.toISOString(), new Date(anchor.getTime() + 26 * 60 * 60 * 1000));

  assert.equal(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(firstRead), '2026-01-10');
  assert.equal(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(laterRead), '2026-01-11');
});
