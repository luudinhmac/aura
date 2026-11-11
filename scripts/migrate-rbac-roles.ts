import { prisma } from '../server/db/prisma.ts';
import { ROLE_PRESETS } from '../src/types/roles.ts';

function roleData(role: typeof ROLE_PRESETS[number]) {
  return {
    name: role.name,
    roleTitle: role.roleTitle,
    department: role.department || null,
    category: role.category,
    description: role.description,
    isSystemRole: role.id === 'system_admin',
    defaultTabs: role.defaultTabs,
    defaultActions: role.defaultActions,
    defaultDepartments: role.defaultDepartments
  };
}

async function main(): Promise<void> {
  const roleIds = new Map<string, number>();
  for (const preset of ROLE_PRESETS) {
    const role = await prisma.role.upsert({
      where: { code: preset.id },
      update: roleData(preset),
      create: { code: preset.id, ...roleData(preset) }
    });
    roleIds.set(preset.id, role.id);
  }

  const users = await prisma.userAccount.findMany({
    include: { personnelProfile: { select: { assignedRole: true } } }
  });
  let assigned = 0;

  for (const user of users) {
    const codes = new Set<string>();
    if (user.accountType === 'system_admin' || user.isSuperAdmin) codes.add('system_admin');
    if (ROLE_PRESETS.some((preset) => preset.id === user.role)) codes.add(user.role);
    if (user.personnelProfile?.assignedRole && ROLE_PRESETS.some((preset) => preset.id === user.personnelProfile?.assignedRole)) {
      codes.add(user.personnelProfile.assignedRole);
    }
    const matchingTitle = ROLE_PRESETS.find((preset) => preset.roleTitle.toLowerCase() === user.roleTitle.toLowerCase());
    if (matchingTitle) codes.add(matchingTitle.id);
    if ((user.role === 'director' || user.roleTitle.toLowerCase().includes('giám đốc')) && user.accountType !== 'system_admin') {
      codes.add('director');
    }
    if (codes.size === 0) codes.add('viewer');

    for (const code of codes) {
      const roleId = roleIds.get(code);
      if (!roleId) continue;
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId }
      });
      assigned += 1;
    }
  }

  console.log(`RBAC role migration complete: ${ROLE_PRESETS.length} roles, ${assigned} assignments.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
