import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkAssignmentResponse } from '../src/utils/workAssignmentPolicy.ts';

test('mandatory work assignments cannot be declined directly', () => {
  assert.throws(() => validateWorkAssignmentResponse(true, 'declined', 'Bận lịch cá nhân'), /không thể từ chối/);
});

test('optional work assignment declines require a reason', () => {
  assert.throws(() => validateWorkAssignmentResponse(false, 'declined'), /phải có lý do/);
  assert.doesNotThrow(() => validateWorkAssignmentResponse(false, 'declined', 'Đã có lịch đã được duyệt'));
});
