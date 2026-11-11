import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isIsoDateWithinPersonnelPeriod } from '../src/utils/scheduleUtils.ts';

describe('personnel schedule date window', () => {
  it('allows future recurring periods for active personnel after join date', () => {
    assert.equal(isIsoDateWithinPersonnelPeriod('2026-01-05', '2025-03-15'), true);
  });

  it('blocks dates before join date', () => {
    assert.equal(isIsoDateWithinPersonnelPeriod('2025-03-14', '2025-03-15'), false);
  });

  it('allows the join date and dates before resignation', () => {
    assert.equal(isIsoDateWithinPersonnelPeriod('2025-03-15', '2025-03-15', '2025-09-16'), true);
    assert.equal(isIsoDateWithinPersonnelPeriod('2025-09-15', '2025-03-15', '2025-09-16'), true);
  });

  it('blocks the resignation date and dates after it', () => {
    assert.equal(isIsoDateWithinPersonnelPeriod('2025-09-16', '2025-03-15', '2025-09-16'), false);
    assert.equal(isIsoDateWithinPersonnelPeriod('2026-01-01', '2025-03-15', '2025-09-16'), false);
  });
});
