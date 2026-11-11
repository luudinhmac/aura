import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTaskCategoriesForIdolCategory,
  isTaskCategoryAllowedForActivity,
  isTaskCategoryAllowedForIdol
} from '../src/utils/taskTaxonomy.ts';

test('performance idols receive performance and PK-oriented task categories', () => {
  const categories = getTaskCategoriesForIdolCategory('performance_donate');
  assert.ok(categories.includes('Biểu diễn'));
  assert.ok(categories.includes('PK & Donate'));
  assert.ok(!categories.includes('Livestream & Gaming'));
});

test('KPI activities are constrained by the selected task category', () => {
  assert.equal(isTaskCategoryAllowedForActivity('PK & Donate', 'pk_donate'), true);
  assert.equal(isTaskCategoryAllowedForActivity('Ghi âm & Sản xuất', 'pk_donate'), false);
  assert.equal(isTaskCategoryAllowedForActivity('Biểu diễn', 'performance'), true);
  assert.equal(isTaskCategoryAllowedForActivity('Biểu diễn', 'custom_activity'), true);
});

test('task category validation uses the Idol category', () => {
  assert.equal(isTaskCategoryAllowedForIdol('live_commerce', 'Livestream & Chốt đơn'), true);
  assert.equal(isTaskCategoryAllowedForIdol('gaming_gear', 'PK & Donate'), false);
});

