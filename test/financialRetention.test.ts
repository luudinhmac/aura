import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../server/db/prisma.ts';
import { pgStore } from '../server/db/pgStore.ts';

test('financial deletes are cancellation updates and protected personnel cannot be hard-deleted', async () => {
  const revenue = await prisma.revenueTransaction.findFirst({ select: { id: true, status: true, personnelId: true } });
  const expense = await prisma.companyExpense.findFirst({ select: { id: true, status: true } });
  assert.ok(revenue);
  assert.ok(expense);
  try {
    assert.equal(await pgStore.deleteRevenueTransaction(revenue.id), true);
    assert.equal((await prisma.revenueTransaction.findUnique({ where: { id: revenue.id } }))?.status, 'cancelled');
    assert.equal(await pgStore.deleteCompanyExpense(expense.id), true);
    assert.equal((await prisma.companyExpense.findUnique({ where: { id: expense.id } }))?.status, 'cancelled');
    assert.equal(await pgStore.deleteIdol(String(revenue.personnelId)), false);
  } finally {
    await prisma.revenueTransaction.update({ where: { id: revenue.id }, data: { status: revenue.status } });
    await prisma.companyExpense.update({ where: { id: expense.id }, data: { status: expense.status } });
  }
});
