import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateVN, parseDateVN, formatDateTimeInput, parseDateTimeVN, formatSystemDateTimeVN } from '../src/utils/dateUtils.ts';

test('formats ISO dates for Vietnamese display', () => {
  assert.equal(formatDateVN('2025-12-01'), '01/12/2025');
});

test('formats the simulated system clock in Vietnam time regardless of host timezone', () => {
  assert.equal(formatSystemDateTimeVN(new Date('2026-01-10T17:00:00.000Z')), '11/01/2026 00:00');
});

test('parses Vietnamese dates back to ISO for storage and APIs', () => {
  assert.equal(parseDateVN('01/12/2025'), '2025-12-01');
  assert.equal(parseDateVN('1-12-2025'), '2025-12-01');
  assert.equal(parseDateVN('31/02/2025'), '');
assert.equal(formatDateTimeInput('2025-12-01T09:05'), '01/12/2025 09:05');
assert.equal(parseDateTimeVN('1/12/2025 9:05'), '2025-12-01T09:05');
assert.equal(parseDateTimeVN('31/02/2025 09:05'), '');
});
