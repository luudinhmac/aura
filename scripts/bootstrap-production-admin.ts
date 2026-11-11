import { prisma } from '../server/db/prisma.ts';
import { hashPassword } from '../server/auth/password.ts';
import { hasCliFlag, isProductionEnvironment } from './environment-guards.ts';
import { randomUUID } from 'crypto';

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : undefined;
}

async function main(): Promise<void> {
  if (!isProductionEnvironment() && !hasCliFlag('allow-nonproduction')) {
    throw new Error('Production admin bootstrap cần APP_ENV=production hoặc --allow-nonproduction');
  }
  const username = option('username') || 'admin';
  const email = option('email') || 'admin@auratalent.vn';
  const password = (option('password') || process.env.BOOTSTRAP_ADMIN_PASSWORD || '').trim();
  const onlyIfEmpty = hasCliFlag('only-if-empty') || process.env.BOOTSTRAP_ADMIN_IF_EMPTY === 'true';
  if (!password || password.length < 12) throw new Error('Cần mật khẩu bootstrap tối thiểu 12 ký tự');

  if (onlyIfEmpty && await prisma.userAccount.count() > 0) {
    console.log('Production admin bootstrap skipped: database already contains user accounts.');
    return;
  }

  const existing = await prisma.userAccount.findUnique({
    where: { username },
    include: { personnelProfile: { select: { id: true } } }
  });
  if (existing?.personnelProfile) throw new Error('Không thể bootstrap: username đang gắn personnel');
  if (existing && existing.accountType !== 'system_admin') {
    throw new Error('Không tự động nâng account hiện hữu thành root; cần migration có mapping');
  }

  const saved = existing
    ? await prisma.userAccount.update({
        where: { id: existing.id },
        data: { email, password: await hashPassword(password), accountType: 'system_admin', isSuperAdmin: true, role: 'super_admin', roleTitle: 'System Administrator' }
      })
    : await prisma.userAccount.create({
        data: {
          username,
          email,
          password: await hashPassword(password),
          accountType: 'system_admin',
          isSuperAdmin: true,
          role: 'super_admin',
          roleTitle: 'System Administrator',
          allowedTabs: [],
          allowedDepartments: [],
          allowedActions: [],
          status: 'Đang hoạt động'
        }
      });

  const systemAdminRole = await prisma.role.findUnique({ where: { code: 'system_admin' } });
  if (!systemAdminRole) throw new Error('Thiếu role system_admin; hãy chạy migrate-rbac-roles trước bootstrap.');
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: saved.id, roleId: systemAdminRole.id } },
    update: {},
    create: { userId: saved.id, roleId: systemAdminRole.id }
  });

  await prisma.auditLog.create({
    data: {
      requestId: randomUUID(),
      method: 'SCRIPT',
      path: 'scripts/bootstrap-production-admin.ts',
      action: 'USER_BOOTSTRAP',
      resource: 'user',
      resourceId: String(saved.id),
      statusCode: 200,
      metadata: {
        source: 'production_bootstrap',
        operation: existing ? 'updated' : 'created',
        username: saved.username,
        accountType: saved.accountType
      }
    }
  });
  console.log(`Production admin bootstrap OK: ${saved.username} (id=${saved.id}), không tạo dữ liệu personnel/demo.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
