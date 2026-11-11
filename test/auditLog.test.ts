import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../server/db/prisma.ts';
import { pgStore } from '../server/db/pgStore.ts';

test('audit log roundtrip persists request metadata', async () => {
  const requestId = `test-${randomUUID()}`;
  await pgStore.createAuditLog({
    requestId,
    method: 'POST',
    path: '/api/test',
    action: 'POST /api/test',
    resource: 'test',
    statusCode: 201,
    metadata: { test: true },
  });
  try {
    const row = await prisma.auditLog.findUnique({ where: { requestId } });
    assert.equal(row?.statusCode, 201);
    assert.deepEqual(row?.metadata, { test: true });
  } finally {
    await prisma.auditLog.delete({ where: { requestId } });
  }
});
