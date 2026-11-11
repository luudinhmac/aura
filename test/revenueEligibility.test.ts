import assert from 'node:assert/strict';
import test from 'node:test';
import { isExternalServicePersonnel } from '../src/utils/revenueEligibility.ts';

test('classifies service customers as external revenue personnel', () => {
  assert.equal(isExternalServicePersonnel({ personnelType: 'Dịch vụ ngoài', cooperationType: 'service_guest' }), true);
  assert.equal(isExternalServicePersonnel({ personnelType: 'Công ty', cooperationType: 'service_guest' }), true);
});

test('keeps company personnel eligible for revenue payout classification', () => {
  assert.equal(isExternalServicePersonnel({ personnelType: 'Công ty', cooperationType: 'internal' }), false);
  assert.equal(isExternalServicePersonnel(undefined), false);
});
