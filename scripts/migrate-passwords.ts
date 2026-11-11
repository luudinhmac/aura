import { prisma } from '../server/db/prisma.ts';
import { hashPassword, isPasswordHash } from '../server/auth/password.ts';

async function main() {
  const users = await prisma.userAccount.findMany({ select: { id: true, password: true } });
  let migrated = 0;

  for (const user of users) {
    if (isPasswordHash(user.password)) continue;
    await prisma.userAccount.update({
      where: { id: user.id },
      data: { password: await hashPassword(user.password) }
    });
    migrated += 1;
  }

  console.log(`Password migration complete: ${migrated} user(s) hashed.`);
}

main()
  .catch((error) => {
    console.error('Password migration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
