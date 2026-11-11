import { prisma } from '../server/db/prisma.ts';
import { hasCliFlag, isProductionEnvironment } from './environment-guards.ts';

async function main(): Promise<void> {
  if (!isProductionEnvironment() && !hasCliFlag('allow-nonproduction')) {
    throw new Error('Production preflight cần APP_ENV=production hoặc --allow-nonproduction');
  }
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL');

  await prisma.$queryRaw`SELECT 1`;
  const [systemAdmins, systemAdminProfiles, migrations] = await Promise.all([
    prisma.userAccount.count({ where: { accountType: 'system_admin' } }),
    prisma.personnel.count({ where: { user: { accountType: 'system_admin' } } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`
  ]);

  if (systemAdmins < 1) throw new Error('Chưa có system admin bootstrap');
  if (systemAdminProfiles !== 0) throw new Error('System Admin vẫn đang gắn personnel profile');
  if (Number(migrations[0]?.count || 0) === 0) throw new Error('Không tìm thấy migration đã apply');

  console.log(JSON.stringify({
    ok: true,
    environment: process.env.APP_ENV || process.env.NODE_ENV,
    systemAdmins,
    systemAdminProfiles,
    appliedMigrations: Number(migrations[0].count)
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
