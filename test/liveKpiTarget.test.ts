import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAdjustedLiveKpiTarget } from '../src/utils/liveKpiTarget.ts';

const schedule = (dayOfWeek: number, startTime = '09:00', endTime = '13:00') => ({
  dayOfWeek,
  startTime,
  endTime,
  repeatType: 'fixed_month',
  specificMonth: '2025-12',
  isActive: true
});

test('keeps the live target at zero when there is no configured live schedule', () => {
  const result = calculateAdjustedLiveKpiTarget('2025-12', 0, [], []);
  assert.deepEqual(result, { originalTarget: 0, reducedHours: 0, adjustedTarget: 0, affectedShifts: 0 });
});

test('reduces live KPI target by scheduled hours replaced by a three-day assignment', () => {
  const result = calculateAdjustedLiveKpiTarget(
    '2025-12',
    216,
    [1, 2, 3, 4, 5].map((day) => schedule(day, '09:00', '17:00')),
    [{ startAt: '2025-12-08T00:00:00Z', endAt: '2025-12-11T00:00:00Z', status: 'published', assigneeResponseStatus: 'accepted' }]
  );
  assert.equal(result.reducedHours, 24);
  assert.equal(result.adjustedTarget, 192);
  assert.equal(result.affectedShifts, 3);
});

test('does not reduce target for a declined or cancelled assignment', () => {
  const result = calculateAdjustedLiveKpiTarget(
    '2025-12',
    216,
    [schedule(1, '09:00', '17:00')],
    [
      { startAt: '2025-12-08T00:00:00Z', endAt: '2025-12-09T00:00:00Z', status: 'cancelled', assigneeResponseStatus: 'accepted' },
      { startAt: '2025-12-15T00:00:00Z', endAt: '2025-12-16T00:00:00Z', status: 'published', assigneeResponseStatus: 'declined' }
    ]
  );
  assert.equal(result.reducedHours, 0);
  assert.equal(result.adjustedTarget, 216);
});

test('reduces only the overlapping part of a live shift', () => {
  const result = calculateAdjustedLiveKpiTarget(
    '2025-12',
    216,
    [schedule(1, '09:00', '17:00')],
    [{ startAt: '2025-12-08T13:00:00Z', endAt: '2025-12-08T15:00:00Z', status: 'published', assigneeResponseStatus: 'completed' }]
  );
  assert.equal(result.reducedHours, 2);
  assert.equal(result.adjustedTarget, 214);
});

test('does not double-count overlapping assignments on the same shift', () => {
  const result = calculateAdjustedLiveKpiTarget(
    '2025-12',
    216,
    [schedule(1, '09:00', '17:00')],
    [
      { startAt: '2025-12-08T09:00:00Z', endAt: '2025-12-08T12:00:00Z', status: 'published', assigneeResponseStatus: 'accepted' },
      { startAt: '2025-12-08T11:00:00Z', endAt: '2025-12-08T14:00:00Z', status: 'published', assigneeResponseStatus: 'accepted' }
    ]
  );
  assert.equal(result.reducedHours, 5);
});
