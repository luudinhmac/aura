import test from 'node:test';
import assert from 'node:assert/strict';
import { UserAccount } from '../src/types/index.ts';
import { getDashboardPersona } from '../src/utils/dashboardPersona.ts';

const user = (overrides: Partial<UserAccount>): UserAccount => ({
  id: 'u1',
  username: 'user',
  email: 'user@aura.test',
  name: 'User',
  role: 'viewer',
  roleTitle: 'Nhân viên',
  allowedTabs: ['my_dashboard'],
  ...overrides
});

test('routes a linked Idol account to the personal Idol dashboard', () => {
  assert.equal(getDashboardPersona(user({ idolId: 'idol-1', roleCodes: ['idol_gaming_gear'], department: 'Nhóm Idol Gaming & Gear' })), 'idol');
});

test('routes system admin by explicit system role even when personnel metadata is present', () => {
  assert.equal(getDashboardPersona(user({ accountType: 'system_admin', roleCodes: ['system_admin'], department: 'Ban Giám đốc' })), 'system_admin');
});

test('keeps director and operational departments separate', () => {
  assert.equal(getDashboardPersona(user({ roleCodes: ['director'], department: 'Ban Giám đốc', roleTitle: 'Giám đốc Điều hành' })), 'director');
  assert.equal(getDashboardPersona(user({ department: 'HR & Kế toán', roleTitle: 'Chuyên viên Nhân sự' })), 'hr_finance');
  assert.equal(getDashboardPersona(user({ department: 'Vận hành Livestream', roleTitle: 'Kỹ thuật vận hành' })), 'livestream_operations');
});

test('routes team and talent management roles to scoped management dashboards', () => {
  assert.equal(getDashboardPersona(user({ roleCodes: ['leader_gaming_gear'], roleTitle: 'Trưởng nhóm Gaming & Gear' })), 'team_leader');
  assert.equal(getDashboardPersona(user({ roleCodes: ['talent_head'], department: 'Phòng Quản lý & Phát triển Idol' })), 'talent_management');
});

test('does not treat an unlinked staff account as an Idol', () => {
  assert.notEqual(getDashboardPersona(user({ department: 'Khối Vận hành', roleTitle: 'Nhân viên vận hành' })), 'idol');
});
