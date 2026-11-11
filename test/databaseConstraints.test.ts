import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prisma } from '../server/db/prisma.ts';
import { Prisma } from '../prisma/client/index.js';

test('database rejects negative personnel compensation values', async () => {
  const personnel = await prisma.personnel.findFirst({ orderBy: { id: 'asc' } });
  assert.ok(personnel);

  await assert.rejects(
    prisma.personnel.update({
      where: { id: personnel.id },
      data: { baseSalary: new Prisma.Decimal(-1) }
    }),
  );
});
