import assert from 'node:assert/strict';
import test from 'node:test';
import { findRoutePolicy, hasAction, hasAnyAction, isDirector, isSuperAdmin } from '../server/auth/authorization.ts';
import { canAccessAdminPortal, canAccessAdminSubTab, canAccessApprovalCenter } from '../src/utils/adminAccess.ts';

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

test('admin portal separates approval center from system administration', () => {
  const hr = { isSuperAdmin: false, allowedActions: ['manage_approvals'] } as any;
  const director = { isSuperAdmin: false, role: 'director', allowedActions: ['manage_departments', 'manage_settings', 'manage_criteria', 'manage_approvals'] } as any;
  const systemAdmin = { isSuperAdmin: true, allowedActions: [] } as any;

  assert.equal(canAccessApprovalCenter(hr), true);
  assert.equal(canAccessAdminPortal(hr), false);
  assert.equal(canAccessAdminSubTab(hr, 'users'), false);
  assert.equal(canAccessAdminSubTab(hr, 'settings'), false);
  assert.equal(canAccessAdminSubTab(hr, 'column_headers'), false);
  assert.equal(canAccessAdminSubTab(hr, 'audit_logs'), false);

  assert.equal(canAccessApprovalCenter(director), true);
  assert.equal(canAccessAdminPortal(director), true);
  assert.equal(canAccessAdminSubTab(director, 'departments'), true);
  assert.equal(canAccessAdminSubTab(director, 'criteria'), true);
  assert.equal(canAccessAdminSubTab(director, 'settings'), true);
  assert.equal(canAccessAdminSubTab(director, 'users'), false);

  assert.equal(canAccessApprovalCenter(systemAdmin), true);
  assert.equal(canAccessAdminPortal(systemAdmin), true);
  assert.equal(canAccessAdminSubTab(systemAdmin, 'users'), true);
  assert.equal(canAccessAdminSubTab(systemAdmin, 'settings'), true);
  assert.equal(canAccessAdminSubTab(systemAdmin, 'audit_logs'), true);
  assert.equal(findRoutePolicy('GET', '/admin/audit-logs')?.superAdminOnly, true);
});

test('sensitive GET endpoints and self-service routes match expected route policies', () => {
  assert.equal(hasAnyAction({ allowedActions: ['adjust_payroll'] }, ['manage_payroll', 'adjust_payroll']), true);
  assert.equal(hasAnyAction({ allowedActions: ['manage_tasks'] }, ['manage_payroll', 'adjust_payroll']), false);

  assert.deepEqual(findRoutePolicy('GET', '/payrolls')?.anyActions, ['manage_payroll', 'adjust_payroll', 'approve_payroll', 'hot_bonus']);
  assert.deepEqual(findRoutePolicy('GET', '/payrolls/2026-10/records')?.anyActions, ['manage_payroll', 'adjust_payroll', 'approve_payroll', 'hot_bonus']);
  assert.equal(findRoutePolicy('GET', '/payrolls/my-payslips/12')?.action, undefined);
  assert.notEqual(findRoutePolicy('GET', '/payrolls/my-payslips/12'), undefined);
  assert.equal(findRoutePolicy('GET', '/payrolls/2026-10/disputes')?.action, undefined);
  assert.deepEqual(findRoutePolicy('GET', '/finance/pnl-summary')?.anyActions, ['adjust_payroll', 'manage_payroll', 'approve_payroll', 'manage_revenue']);
  assert.deepEqual(findRoutePolicy('GET', '/revenue/transactions')?.anyActions, ['manage_revenue', 'adjust_payroll', 'manage_payroll', 'approve_payroll']);
  assert.deepEqual(findRoutePolicy('GET', '/approvals')?.anyActions, ['manage_approvals', 'manage_criteria', 'manage_settings']);
  assert.equal(findRoutePolicy('GET', '/idols/5/salary-history')?.action, undefined);
  assert.notEqual(findRoutePolicy('GET', '/idols/5/salary-history'), undefined);
  assert.equal(findRoutePolicy('POST', '/upload')?.action, undefined);
  assert.notEqual(findRoutePolicy('POST', '/upload'), undefined);
});
