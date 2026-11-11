import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../server/db/prisma.ts';
import { pgStore } from '../server/db/pgStore.ts';

test('personnel-linked accounts can be promoted to system admin and retain root permissions', async () => {
  const personnelUser = await prisma.userAccount.findFirst({
    where: { accountType: 'personnel', personnelProfile: { isNot: null } },
    select: { id: true }
  });
  if (!personnelUser) return;

  try {
    const updated = await pgStore.updateUser(String(personnelUser.id), { accountType: 'system_admin' });
    assert.ok(updated);
    assert.equal(updated.accountType, 'system_admin');
    assert.equal(updated.isSuperAdmin, true);
    assert.equal(updated.isBusinessAdmin, false);
    assert.ok(updated.allowedTabs.includes('admin'));
    assert.ok(updated.allowedActions?.includes('manage_settings'));
  } finally {
    await pgStore.updateUser(String(personnelUser.id), {
      accountType: 'personnel',
      isSuperAdmin: false,
      isBusinessAdmin: false,
      allowedTabs: ['roster'],
      allowedDepartments: ['*'],
      allowedActions: []
    });
  }
});

test('system admin mapping always retains root access', async () => {
  const admin = await prisma.userAccount.findFirst({
    where: { username: 'admin', accountType: 'system_admin' },
    include: { personnelProfile: true }
  });
  if (!admin) return;

  const mapped = await pgStore.getUsers();
  const mappedAdmin = mapped.find((user) => user.username === admin.username);
  assert.ok(mappedAdmin);
  assert.equal(mappedAdmin.accountType, 'system_admin');
  assert.equal(mappedAdmin.isSuperAdmin, true);
  assert.equal(mappedAdmin.isBusinessAdmin, false);
  assert.ok(mappedAdmin.roleCodes?.includes('system_admin'));
});

test('every system admin is visible in the system admin role assignment', async () => {
  const mappedUsers = await pgStore.getUsers();
  for (const user of mappedUsers.filter((candidate) => candidate.accountType === 'system_admin')) {
    assert.ok(user.roleCodes?.includes('system_admin'), `${user.username} is missing system_admin role code`);
  }
});

test('system admin cannot be downgraded by business permission payload', async () => {
  const admin = await prisma.userAccount.findFirst({
    where: { username: 'admin', accountType: 'system_admin' },
    select: { id: true, username: true }
  });
  if (!admin) return;

  await assert.rejects(
    pgStore.updateUser(String(admin.id), {
      accountType: 'personnel',
      isSuperAdmin: false,
      isBusinessAdmin: true
    }),
    /System Admin/
  );
});

test('immutable root admin cannot be deleted', async () => {
  const admin = await prisma.userAccount.findUnique({
    where: { username: 'admin' },
    select: { id: true, accountType: true }
  });
  if (!admin) return;

  assert.equal(admin.accountType, 'system_admin');
  assert.equal(await pgStore.deleteUser(String(admin.id)), false);
  assert.ok(await prisma.userAccount.findUnique({ where: { id: admin.id }, select: { id: true } }));
});

test('non-root system admin can be removed from the system admin group', async () => {
  const admin = await prisma.userAccount.findFirst({
    where: { accountType: 'system_admin', NOT: { username: 'admin' } },
    select: { id: true, role: true, roleTitle: true, personnelProfile: { select: { department: true } } }
  });
  if (!admin) return;

  try {
    const updated = await pgStore.updateUser(String(admin.id), {
      accountType: 'personnel',
      isSuperAdmin: false,
      isBusinessAdmin: false,
      allowedTabs: ['roster', 'schedule', 'tasks'],
      allowedDepartments: admin.personnelProfile?.department ? [admin.personnelProfile.department] : ['*'],
      allowedActions: []
    });
    assert.ok(updated);
    assert.equal(updated.accountType, 'personnel');
    assert.equal(updated.isSuperAdmin, false);
    assert.equal(updated.role, admin.role);
    assert.equal(updated.roleTitle, admin.roleTitle);
  } finally {
    await pgStore.updateUser(String(admin.id), {
      accountType: 'system_admin',
      isSuperAdmin: true
    });
  }
});
