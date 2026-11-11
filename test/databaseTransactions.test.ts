import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pgStore } from '../server/db/pgStore.ts';
import { prisma } from '../server/db/prisma.ts';

test('createKpiGroup rolls back the group when a member insert fails', async () => {
  const name = `transaction-test-${randomUUID()}`;

  await assert.rejects(
    pgStore.createKpiGroup({ name, memberIds: ['2147483647'] }),
  );

  const persisted = await prisma.kpiGroup.findFirst({ where: { name } });
  assert.equal(persisted, null);
});

test('finalized payroll periods reject sync and amount adjustments', async () => {
  const period = await prisma.payrollPeriod.findFirst({
    where: { status: 'locked_paid' },
    include: { records: { take: 1 } }
  });
  assert.ok(period);

  await assert.rejects(
    pgStore.syncPayrollPeriod(period.id),
    /Khong the thay doi tien/
  );

  const record = period.records[0];
  if (record) {
    await assert.rejects(
      pgStore.adjustPayrollRecord(period.id, record.id, { earnings: { baseSalary: 1 } }, { id: '1' }),
      /Khong the thay doi tien/
    );
  }
});

test('createIdol rolls back the account and personnel when activities fail', async () => {
  const token = randomUUID().replaceAll('-', '').slice(0, 16);
  const username = `tx_test_${token}`;
  const email = `${username}@example.invalid`;

  await assert.rejects(
    pgStore.createIdol({
      accountUsername: username,
      accountPassword: 'transaction-test-password',
      realName: `Transaction Test ${token}`,
      stageName: `Transaction Test ${token}`,
      socialLinks: { email },
      activityCodes: ['__missing_activity_for_transaction_test__']
    }),
  );

  const [user, personnel] = await Promise.all([
    prisma.userAccount.findFirst({ where: { username } }),
    prisma.personnel.findFirst({ where: { realName: `Transaction Test ${token}` } })
  ]);

  assert.equal(user, null);
  assert.equal(personnel, null);
});

test('createIdol rejects reusing an account already linked to personnel', async () => {
  const token = randomUUID().replaceAll('-', '').slice(0, 16);
  const username = `linked_test_${token}`;
  const email = `${username}@example.invalid`;
  const created = await pgStore.createIdol({
    accountUsername: username,
    accountPassword: 'linked-test-password',
    realName: `Linked Test ${token}`,
    stageName: `Linked Test ${token}`,
    socialLinks: { email },
    personnelType: 'Công ty',
    isIdol: false
  });

  try {
    await assert.rejects(
      pgStore.createIdol({
        accountUsername: username,
        accountPassword: 'linked-test-password',
        realName: `Linked Test Duplicate ${token}`,
        stageName: `Linked Test Duplicate ${token}`,
        socialLinks: { email },
        personnelType: 'Công ty',
        isIdol: false
      }),
      /đã được gắn với hồ sơ nhân sự/
    );
  } finally {
    await pgStore.deleteIdol(created.id);
    await prisma.userAccount.delete({ where: { username } });
  }
});

test('createIdol accepts pending personnel status for the approval workflow', async () => {
  const token = randomUUID().replaceAll('-', '').slice(0, 16);
  const created = await pgStore.createIdol({
    realName: `Pending Test ${token}`,
    stageName: `Pending Test ${token}`,
    personnelType: 'Dịch vụ ngoài',
    isIdol: false,
    status: 'Chờ duyệt'
  });

  try {
    assert.equal(created.status, 'Chờ duyệt');
  } finally {
    await pgStore.deleteIdol(created.id);
  }
});

test('revenue and expense codes remain unique under concurrent creation', async () => {
  const [personnel, category, platform] = await Promise.all([
    prisma.personnel.findFirst({ orderBy: { id: 'asc' } }),
    prisma.revenueCategory.findFirst({ orderBy: { id: 'asc' } }),
    prisma.revenuePlatform.findFirst({ orderBy: { id: 'asc' } })
  ]);
  assert.ok(personnel && category && platform);

  const token = randomUUID().slice(0, 8);
  const period = '2099-12';
  const revenueTitle = `Stage2 concurrency ${token}`;
  const expenseTitle = `Stage2 expense ${token}`;

  try {
    const revenues = await Promise.all(
      Array.from({ length: 4 }, (_, index) => pgStore.createRevenueTransaction({
        personnelId: personnel.id,
        period,
        transactionDate: '2099-12-01',
        categoryId: category.id,
        platformId: platform.id,
        title: `${revenueTitle}-${index}`,
        grossAmount: 100,
        idolShareRate: 70
      }))
    );
    const expenses = await Promise.all(
      Array.from({ length: 4 }, (_, index) => pgStore.createCompanyExpense({
        period,
        expenseDate: '2099-12-01',
        category: 'OTHER',
        title: `${expenseTitle}-${index}`,
        amount: 100
      }))
    );

    assert.equal(new Set(revenues.map((item) => item.transactionCode)).size, 4);
    assert.equal(new Set(expenses.map((item) => item.expenseCode)).size, 4);
  } finally {
    await prisma.revenueTransaction.deleteMany({ where: { title: { startsWith: revenueTitle } } });
    await prisma.companyExpense.deleteMany({ where: { title: { startsWith: expenseTitle } } });
  }
});

test('personnel JSON updates use optimistic locking', async () => {
  const token = randomUUID().slice(0, 8);
  const created = await pgStore.createIdol({
    realName: `Stage2 lock ${token}`,
    stageName: `Stage2 lock ${token}`,
    personnelType: 'Dịch vụ ngoài',
    isIdol: false
  });

  try {
    const results = await Promise.allSettled([
      pgStore.updateIdol(created.id, { customFields: { stage2_value: 'first' } }),
      pgStore.updateIdol(created.id, { customFields: { stage2_value: 'second' } })
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  } finally {
    await pgStore.deleteIdol(created.id);
  }
});

test('salary changes create dated history without mutating current salary for future-effective changes', async () => {
  const token = randomUUID().slice(0, 8);
  const created = await pgStore.createIdol({
    realName: `Stage2 salary ${token}`,
    stageName: `Stage2 salary ${token}`,
    personnelType: 'Dịch vụ ngoài',
    isIdol: false,
    baseSalary: 30000000
  });
  const admin = (await pgStore.getUsers()).find((user) => user.accountType === 'system_admin');
  assert.ok(admin);

  try {
    const history = await pgStore.changePersonnelSalary(created.id, {
      salaryAmount: 40000000,
      effectiveFrom: '2099-01-01',
      reason: 'Kiểm thử thay đổi lương có ngày hiệu lực',
      source: 'test'
    }, admin);

    assert.equal(history.salaryAmount, 40000000);
    assert.equal(history.effectiveFrom, '2099-01-01');

    const current = await prisma.personnel.findUnique({ where: { id: Number(created.id) }, select: { baseSalary: true } });
    assert.equal(current?.baseSalary.toNumber(), 30000000);

    const historyRows = await pgStore.getPersonnelSalaryHistory(created.id);
    assert.equal(historyRows.some((row) => row.effectiveFrom === '2099-01-01' && row.salaryAmount === 40000000), true);

    await assert.rejects(
      pgStore.changePersonnelSalary(created.id, {
        salaryAmount: 45000000,
        effectiveFrom: '2099-01-01',
        reason: 'Trùng ngày hiệu lực'
      }, admin),
      /cùng ngày hiệu lực/
    );
  } finally {
    await prisma.personnelSalaryHistory.deleteMany({ where: { personnelId: Number(created.id) } });
    await pgStore.deleteIdol(created.id);
  }
});

test('salary changes reject retroactive dates when a payroll period is already approved or locked', async () => {
  const [personnel, admin] = await Promise.all([
    prisma.personnel.findFirst({ orderBy: { id: 'asc' } }),
    pgStore.getUsers().then((users) => users.find((user) => user.accountType === 'system_admin'))
  ]);
  assert.ok(personnel && admin);

  await assert.rejects(
    pgStore.changePersonnelSalary(String(personnel.id), {
      salaryAmount: 40000000,
      effectiveFrom: '2020-01-01',
      reason: 'Kiểm thử chặn hồi tố'
    }, admin),
    /hồi tố lương/
  );
});

test('payroll sync resolves the salary history for new records and snapshots it', async () => {
  const token = randomUUID().slice(0, 8);
  const periods = [
    { id: `payroll-2098-10-${token}`, period: '2098-10' },
    { id: `payroll-2099-02-${token}`, period: '2099-02' }
  ];
  const created = await pgStore.createIdol({
    realName: `Stage3 salary ${token}`,
    stageName: `Stage3 salary ${token}`,
    personnelType: 'Công ty',
    isIdol: false,
    joinDate: '2098-01-01',
    baseSalary: 40000000
  });
  const linkedUserId = (await prisma.personnel.findUnique({
    where: { id: Number(created.id) },
    select: { userId: true }
  }))?.userId;

  try {
    await prisma.personnelSalaryHistory.createMany({
      data: [
        { personnelId: Number(created.id), salaryAmount: 30000000, effectiveFrom: new Date('2098-01-01T00:00:00.000Z'), effectiveTo: new Date('2098-12-31T00:00:00.000Z'), reason: 'Stage3 old salary', source: 'test' },
        { personnelId: Number(created.id), salaryAmount: 40000000, effectiveFrom: new Date('2099-01-01T00:00:00.000Z'), reason: 'Stage3 new salary', source: 'test' }
      ]
    });
    await prisma.payrollPeriod.createMany({ data: periods });

    const oldPeriod = await pgStore.syncPayrollPeriod(periods[0].id);
    const newPeriod = await pgStore.syncPayrollPeriod(periods[1].id);
    const oldRecord = oldPeriod.records.find((record) => record.idolId === created.id);
    const newRecord = newPeriod.records.find((record) => record.idolId === created.id);

    assert.equal(oldRecord?.contractSalarySnapshot, 30000000);
    assert.equal(oldRecord?.salaryEffectiveFromSnapshot, '2098-01-01');
    assert.equal(newRecord?.contractSalarySnapshot, 40000000);
    assert.equal(newRecord?.salaryEffectiveFromSnapshot, '2099-01-01');
  } finally {
    await prisma.payrollPeriod.deleteMany({ where: { id: { in: periods.map((period) => period.id) } } });
    await prisma.personnelSalaryHistory.deleteMany({ where: { personnelId: Number(created.id) } });
    await pgStore.deleteIdol(created.id);
    if (linkedUserId) {
      await prisma.userAccount.delete({ where: { id: linkedUserId } });
      assert.equal(await prisma.userAccount.findUnique({ where: { id: linkedUserId } }), null);
    }
  }
});
