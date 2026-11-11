import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../server/db/prisma.ts';

test('application instants use timestamptz while date-only fields stay date', async () => {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string; data_type: string }>>(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND ((table_name = 'personnel' AND column_name IN ('createdAt', 'joinDate'))
        OR (table_name = 'revenue_transactions' AND column_name IN ('createdAt', 'transactionDate')))
    ORDER BY table_name, column_name
  `);
  const byKey = new Map(rows.map((row) => [`${row.table_name}.${row.column_name}`, row.data_type]));
  assert.equal(byKey.get('personnel.createdAt'), 'timestamp with time zone');
  assert.equal(byKey.get('revenue_transactions.createdAt'), 'timestamp with time zone');
  assert.equal(byKey.get('personnel.joinDate'), 'date');
  assert.equal(byKey.get('revenue_transactions.transactionDate'), 'date');
});
