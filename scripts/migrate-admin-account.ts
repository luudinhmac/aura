import { prisma } from '../server/db/prisma.ts';
import { hashPassword } from '../server/auth/password.ts';

type Options = {
  username: string;
  email: string;
  roleTitle: string;
  tempPassword?: string;
  reuseAdminPassword: boolean;
  apply: boolean;
  confirm: boolean;
  allowProduction: boolean;
};

// Business access for the director account. Root-only administration remains
// reserved for the separate system admin account.
const DIRECTOR_BUSINESS_TABS = [
  'roster',
  'schedule',
  'tasks',
  'analytics',
  'payroll',
  'kpi',
  'revenue',
  'finance'
];

const DIRECTOR_BUSINESS_ACTIONS = [
  'manage_idols',
  'manage_schedule',
  'manage_tasks',
  'manage_approvals',
  'manage_payroll',
  'approve_payroll',
  'adjust_payroll',
  'hot_bonus',
  'manage_kpi',
  'manage_revenue',
  'manage_settings'
];

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseOptions(): Options {
  const username = readOption('director-username');
  const email = readOption('director-email');
  if (!username || !email) {
    throw new Error('Bắt buộc --director-username và --director-email để tránh gán nhầm account');
  }

  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const allowProduction = hasFlag('allow-production');
  if (appEnv === 'production' && !allowProduction) {
    throw new Error('Production cần thêm --allow-production sau khi đã backup và đối chiếu mapping');
  }

  return {
    username,
    email,
    roleTitle: readOption('director-role-title') || 'Giám đốc Điều hành',
    tempPassword: readOption('temp-password') || process.env.DIRECTOR_TEMP_PASSWORD,
    reuseAdminPassword: hasFlag('reuse-admin-password'),
    apply: hasFlag('apply'),
    confirm: hasFlag('confirm'),
    allowProduction
  };
}

async function main(): Promise<void> {
  const options = parseOptions();
  const admin = await prisma.userAccount.findFirst({
    where: { OR: [{ username: 'admin' }, { isSuperAdmin: true }] },
    include: { personnelProfile: { select: { id: true, realName: true, stageName: true } } },
    orderBy: { id: 'asc' }
  });
  if (!admin) throw new Error('Không tìm thấy root admin để chuyển đổi');

  const existingDirector = await prisma.userAccount.findFirst({
    where: { OR: [{ username: options.username }, { email: options.email }] },
    include: { personnelProfile: { select: { id: true, realName: true, stageName: true } } }
  });
  if (existingDirector && existingDirector.id === admin.id) {
    throw new Error('Username/email tài khoản Giám đốc không được trùng root admin');
  }
  if (existingDirector?.accountType === 'system_admin' || existingDirector?.isSuperAdmin) {
    throw new Error('Account Giám đốc đã là system admin; không tự động hạ quyền');
  }
  if (existingDirector?.personnelProfile && admin.personnelProfile && existingDirector.personnelProfile.id !== admin.personnelProfile.id) {
    throw new Error('Account Giám đốc đã gắn một personnel khác; cần mapping thủ công');
  }
  if (!existingDirector && options.apply && !options.tempPassword && !options.reuseAdminPassword) {
    throw new Error('Tạo account mới cần --temp-password, DIRECTOR_TEMP_PASSWORD hoặc --reuse-admin-password');
  }

  const payrollCount = admin.personnelProfile
    ? await prisma.payrollRecord.count({ where: { personnelId: admin.personnelProfile.id } })
    : 0;
  const revenueCount = admin.personnelProfile
    ? await prisma.revenueTransaction.count({ where: { personnelId: admin.personnelProfile.id } })
    : 0;

  console.log(JSON.stringify({
    mode: options.apply ? 'apply' : 'dry-run',
    admin: { id: admin.id, username: admin.username, personnelId: admin.personnelProfile?.id ?? null },
    director: existingDirector
      ? { id: existingDirector.id, username: existingDirector.username, email: existingDirector.email, personnelId: existingDirector.personnelProfile?.id ?? null }
      : { username: options.username, email: options.email, personnelId: admin.personnelProfile?.id ?? null, willCreate: true },
    preserved: { payrollCount, revenueCount }
  }, null, 2));

  if (!options.apply) {
    console.log('Dry-run only. Chạy lại với --apply --confirm sau khi kiểm tra mapping.');
    return;
  }
  if (!options.confirm) throw new Error('Ghi dữ liệu cần thêm --confirm');

  await prisma.$transaction(async (tx) => {
    const director = existingDirector
      ? await tx.userAccount.update({
          where: { id: existingDirector.id },
          data: {
            accountType: 'personnel',
            isSuperAdmin: false,
            role: 'director',
            roleTitle: options.roleTitle,
            allowedTabs: DIRECTOR_BUSINESS_TABS,
            allowedActions: DIRECTOR_BUSINESS_ACTIONS,
            allowedDepartments: ['*']
          }
        })
      : await tx.userAccount.create({
          data: {
            username: options.username,
            email: options.email,
            password: options.reuseAdminPassword ? admin.password : await hashPassword(options.tempPassword!),
            accountType: 'personnel',
            isSuperAdmin: false,
            role: 'director',
            roleTitle: options.roleTitle,
            allowedTabs: DIRECTOR_BUSINESS_TABS,
            allowedDepartments: ['*'],
            allowedActions: DIRECTOR_BUSINESS_ACTIONS,
            status: 'Đang hoạt động'
          }
        });

    if (admin.personnelProfile) {
      await tx.personnel.update({
        where: { id: admin.personnelProfile.id },
        data: { userId: director.id }
      });
    }
    await tx.userAccount.update({
      where: { id: admin.id },
      data: { accountType: 'system_admin', isSuperAdmin: true }
    });
  });

  const [adminAfter, directorAfter] = await Promise.all([
    prisma.userAccount.findUnique({ where: { id: admin.id }, include: { personnelProfile: true } }),
    prisma.userAccount.findFirst({ where: { OR: [{ username: options.username }, { email: options.email }] }, include: { personnelProfile: true } })
  ]);
  const expectedPersonnelId = existingDirector?.personnelProfile?.id ?? admin.personnelProfile?.id;
  if (
    !adminAfter ||
    adminAfter.personnelProfile ||
    adminAfter.accountType !== 'system_admin' ||
    (expectedPersonnelId !== undefined && directorAfter?.personnelProfile?.id !== expectedPersonnelId)
  ) {
    throw new Error('Post-check thất bại: mapping account/personnel không đúng');
  }
  console.log('Đã chuyển root admin khỏi personnel và giữ nguyên lịch sử nghiệp vụ.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
