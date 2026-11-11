import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssignmentPenalty, getWorkAssignmentAutoPenaltyCutoff, calculateWorkAssignmentRest } from '../src/utils/workAssignmentPolicy.ts';

test('work assignment phase 3 grants half-day rest after a late same-day trip', () => {
    assert.deepEqual(calculateWorkAssignmentRest('2026-11-02T08:00:00.000Z', '2026-11-02T23:00:00.000Z'), {
      restDayDate: '2026-11-03',
      restDayPortion: 'half',
      scheduleOverrideStartDate: '2026-11-02',
      scheduleOverrideEndDate: '2026-11-02'
    });
});

test('work assignment phase 3 moves overnight rest away from a fixed Sunday rest day', () => {
    assert.deepEqual(calculateWorkAssignmentRest('2026-11-06T08:00:00.000Z', '2026-11-07T23:00:00.000Z'), {
      restDayDate: '2026-11-09',
      restDayPortion: 'full',
      scheduleOverrideStartDate: '2026-11-06',
      scheduleOverrideEndDate: '2026-11-07'
    });
});

test('work assignment phase 3 calculates fixed and salary percentage penalties', () => {
    assert.equal(calculateAssignmentPenalty('fixed', 500000, 20000000), 500000);
    assert.equal(calculateAssignmentPenalty('percentage', 10, 20000000), 2000000);
    assert.equal(calculateAssignmentPenalty('none', 10, 20000000), 0);
});

test('work assignment auto-penalty cutoff is exactly three days after the trip end', () => {
    assert.equal(getWorkAssignmentAutoPenaltyCutoff('2026-01-10T12:00:00.000Z').toISOString(), '2026-01-07T12:00:00.000Z');
});
