import assert from 'node:assert/strict';
import test from 'node:test';
import { isEligibleForIdolKpi } from '../src/utils/kpiEligibility.ts';

test('eligible company Idol with an activity is included in personal KPI', () => {
  assert.equal(isEligibleForIdolKpi({
    isIdol: true,
    personnelType: 'Công ty',
    department: 'Nhóm Idol Gaming & Gear',
    hasActiveActivity: true
  }), true);
});

test('external service customer revenue is excluded from personal KPI', () => {
  assert.equal(isEligibleForIdolKpi({
    isIdol: false,
    personnelType: 'Dịch vụ ngoài',
    department: 'Khách dịch vụ ngoài',
    hasActiveActivity: false
  }), false);
});

test('company staff and Board members are excluded from Idol KPI', () => {
  assert.equal(isEligibleForIdolKpi({
    isIdol: false,
    personnelType: 'Công ty',
    department: 'Vận Hành Livestream'
  }), false);
  assert.equal(isEligibleForIdolKpi({
    isIdol: true,
    personnelType: 'Công ty',
    department: 'Ban Giám Đốc',
    hasActiveActivity: true
  }), false);
});

test('an Idol without an activity assignment is excluded', () => {
  assert.equal(isEligibleForIdolKpi({
    isIdol: true,
    personnelType: 'Công ty',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    hasActiveActivity: false
  }), false);
});
