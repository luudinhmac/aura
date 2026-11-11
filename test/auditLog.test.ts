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

    const page = await pgStore.getAuditLogs({ search: requestId, method: 'POST', resource: 'test', statusCode: 201 });
    assert.equal(page.total, 1);
    assert.equal(page.items[0]?.requestId, requestId);
    assert.equal(page.items[0]?.action, 'POST /api/test');

    const dataOnly = await pgStore.getAuditLogs({ search: requestId, category: 'data', statusGroup: '2xx' });
    assert.equal(dataOnly.total, 1);

    const authOnly = await pgStore.getAuditLogs({ search: requestId, category: 'auth' });
    assert.equal(authOnly.total, 0);

    const errOnly = await pgStore.getAuditLogs({ search: requestId, statusGroup: '4xx_5xx' });
    assert.equal(errOnly.total, 0);
  } finally {
    await prisma.auditLog.delete({ where: { requestId } });
  }
});

test('deleteStatus blocks deleting a status that is assigned to personnel', async () => {
  const sample = await prisma.personnel.findFirst({ select: { status: true } });
  assert.ok(sample?.status);

  await assert.rejects(
    pgStore.deleteStatus(sample.status),
    /Không thể xóa trạng thái/
  );
});
