import assert from 'node:assert/strict';
import test from 'node:test';
import { findRoutePolicy, hasAction, isDirector, isSuperAdmin } from '../server/auth/authorization.ts';
import { canAccessAdminPortal, canAccessAdminSubTab } from '../src/utils/adminAccess.ts';

test('authorization grants an action to Super Admin and matching users', () => {
  assert.equal(isSuperAdmin({ accountType: 'system_admin', role: 'super_admin' }), true);
  assert.equal(hasAction({ allowedActions: ['manage_schedule'] }, 'manage_schedule'), true);
  assert.equal(hasAction({ allowedActions: ['manage_schedule'] }, 'manage_payroll'), false);
  assert.equal(hasAction({ accountType: 'system_admin', isSuperAdmin: true }, 'manage_payroll'), true);
});

test('business super admin grants business actions without becoming a system admin', () => {
  assert.equal(isSuperAdmin({ accountType: 'personnel', isBusinessAdmin: true }), false);
  assert.equal(hasAction({ accountType: 'personnel', isBusinessAdmin: true }, 'manage_approvals'), true);
});

test('director approval is recognized without requiring system admin', () => {
  assert.equal(isDirector({ accountType: 'personnel', role: 'super_admin', roleTitle: 'Giám Đốc Điều Hành', isSuperAdmin: false }), true);
  assert.equal(isDirector({ accountType: 'personnel', role: 'manager', roleTitle: 'Trưởng Phòng', isSuperAdmin: false }), false);
});

test('route policy maps mutations to the intended permission', () => {
  assert.equal(findRoutePolicy('POST', '/schedules')?.action, 'manage_schedule');
  assert.equal(findRoutePolicy('PUT', '/payrolls/2025-10/records/1/adjust')?.action, 'adjust_payroll');
  assert.equal(findRoutePolicy('POST', '/payrolls/2025-10/approve')?.action, 'approve_payroll');
  assert.equal(findRoutePolicy('POST', '/users')?.superAdminOnly, true);
  assert.equal(findRoutePolicy('POST', '/approvals')?.action, undefined);
  assert.equal(findRoutePolicy('POST', '/approvals/1/approve')?.action, 'manage_approvals');
  assert.equal(findRoutePolicy('POST', '/leave-requests')?.action, undefined);
  assert.equal(findRoutePolicy('PUT', '/leave-requests/abc')?.action, 'manage_approvals');
  assert.equal(findRoutePolicy('DELETE', '/leave-requests/abc')?.action, 'manage_approvals');
  assert.equal(findRoutePolicy('GET', '/idols')?.action, undefined);
});

test('HR personnel-management permission can manage external service usage', () => {
  assert.deepEqual(findRoutePolicy('GET', '/service-usage/assignees')?.anyActions, ['manage_revenue', 'manage_idols']);
  assert.deepEqual(findRoutePolicy('POST', '/service-usage')?.anyActions, ['manage_revenue', 'manage_idols']);
});

test('admin portal separates approval access from system administration', () => {
  const hr = { isSuperAdmin: false, allowedActions: ['manage_approvals'] } as any;
  const systemAdmin = { isSuperAdmin: true, allowedActions: [] } as any;

  assert.equal(canAccessAdminPortal(hr), true);
  assert.equal(canAccessAdminSubTab(hr, 'leave_management'), true);
  assert.equal(canAccessAdminSubTab(hr, 'approvals'), true);
  assert.equal(canAccessAdminSubTab(hr, 'users'), false);
  assert.equal(canAccessAdminSubTab(hr, 'settings'), false);
  assert.equal(canAccessAdminSubTab(hr, 'column_headers'), false);

  assert.equal(canAccessAdminPortal(systemAdmin), true);
  assert.equal(canAccessAdminSubTab(systemAdmin, 'users'), true);
  assert.equal(canAccessAdminSubTab(systemAdmin, 'settings'), true);
});
