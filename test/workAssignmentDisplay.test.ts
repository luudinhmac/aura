import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkAssignmentPenaltyDisplay, shouldShowAssignmentPenaltyRule } from '../src/utils/workAssignmentDisplay.ts';

const base = {
  mandatory: true,
  assignmentStatus: 'published',
  penaltyType: 'percentage',
  responseStatus: 'pending',
  possiblePenaltyAmount: 10_000_000,
};

test('does not show a possible penalty for completed work', () => {
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, responseStatus: 'completed' }), null);
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, responseStatus: 'completed', violationStatus: 'waived' }), null);
});

test('shows only the actual amount after a violation is confirmed', () => {
  const display = getWorkAssignmentPenaltyDisplay({
    ...base,
    violationStatus: 'confirmed',
    penaltyAmount: 1_400_000,
  });
  assert.equal(display?.text, 'Đã phạt 1.400.000 đ');
  assert.equal(display?.text.includes('Có thể áp dụng'), false);
});

test('shows the applied rate with a confirmed reduced penalty', () => {
  const display = getWorkAssignmentPenaltyDisplay({
    ...base,
    violationStatus: 'confirmed',
    waiverDecision: 'reduced_penalty',
    penaltyAmount: 1_000_000,
    penaltyRate: 10,
  });
  assert.equal(display?.text, 'Đã phạt 1.000.000 đ · mức áp dụng 10%');
});

test('shows review and waiver states without an estimated amount', () => {
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, violationStatus: 'under_review' })?.text, 'Đang xem xét vi phạm');
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, waiverRequestStatus: 'pending' })?.text, 'Đang chờ xử lý giải trình');
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, violationStatus: 'waived' })?.text, 'Đã miễn phạt');
});

test('labels a non-final amount as conditional, and reports missing salary data', () => {
  assert.equal(getWorkAssignmentPenaltyDisplay(base)?.text, 'Có thể áp dụng 10.000.000 đ nếu vi phạm');
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, possiblePenaltyAmount: 0 })?.text, 'Chưa đủ dữ liệu lương để tính mức phạt');
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, penaltyType: 'fixed', possiblePenaltyAmount: 500_000 })?.text, 'Có thể áp dụng 500.000 đ nếu vi phạm');
});

test('does not show penalty estimates for cancelled or non-mandatory work', () => {
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, assignmentStatus: 'cancelled' }), null);
  assert.equal(getWorkAssignmentPenaltyDisplay({ ...base, mandatory: false }), null);
});

test('hides the configured penalty rule on a completed idol assignment but keeps manager context', () => {
  assert.equal(shouldShowAssignmentPenaltyRule(false, 'completed', 'published'), false);
  assert.equal(shouldShowAssignmentPenaltyRule(false, 'pending', 'published'), true);
  assert.equal(shouldShowAssignmentPenaltyRule(true, 'completed', 'published'), true);
  assert.equal(shouldShowAssignmentPenaltyRule(true, 'pending', 'cancelled'), false);
});
