import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppActionPermission, AppTabPermission } from '../src/types/index.ts';
import {
  ACTION_PERMISSION_OPTIONS,
  TAB_PERMISSION_OPTIONS,
} from '../src/utils/permissionCatalog.ts';

test('permission catalog covers every AppTabPermission and AppActionPermission without duplicates', () => {
  const expectedTabs: AppTabPermission[] = [
    'roster',
    'scoring',
    'leaderboard',
    'schedule',
    'tasks',
    'analytics',
    'approvals',
    'admin',
    'my_dashboard',
    'work_assignments',
    'payroll',
    'payroll_disputes',
    'kpi',
    'revenue',
    'finance',
    'service_usage',
  ];

  const expectedActions: AppActionPermission[] = [
    'manage_idols',
    'manage_scores',
    'manage_criteria',
    'manage_schedule',
    'manage_tasks',
    'manage_work_assignments',
    'manage_departments',
    'manage_settings',
    'manage_approvals',
    'manage_payroll',
    'adjust_payroll',
    'approve_payroll',
    'hot_bonus',
    'manage_kpi',
    'manage_revenue',
  ];

  const tabIds = TAB_PERMISSION_OPTIONS.map((item) => item.id);
  const actionIds = ACTION_PERMISSION_OPTIONS.map((item) => item.id);

  assert.equal(new Set(tabIds).size, expectedTabs.length);
  assert.equal(new Set(actionIds).size, expectedActions.length);

  for (const tab of expectedTabs) {
    assert.ok(tabIds.includes(tab), `Missing tab permission in catalog: ${tab}`);
  }
  for (const action of expectedActions) {
    assert.ok(actionIds.includes(action), `Missing action permission in catalog: ${action}`);
  }
});

