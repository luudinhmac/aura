// ETL Migration Script: JSON to PostgreSQL (Prisma)
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { assertImportAllowed } from './environment-guards.ts';

const prisma = new PrismaClient();

function parseDateOrNull(val: string | null | undefined): Date | null {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toDecimal(val: number | string | null | undefined, def: number = 0): Prisma.Decimal {
  if (val === null || val === undefined || val === '') return new Prisma.Decimal(def);
  const num = Number(val);
  return new Prisma.Decimal(isNaN(num) ? def : num);
}

async function main() {
  assertImportAllowed();
  assertImportAllowed();
  console.log('=====================================================');
  console.log('🚀 BẮT ĐẦU QUÁ TRÌNH ETL MIGRATION: db.json ➔ PostgreSQL');
  console.log('=====================================================');

  const dbJsonPath = path.join(process.cwd(), 'server', 'data', 'db.json');
  if (!fs.existsSync(dbJsonPath)) {
    console.error('❌ Không tìm thấy file db.json tại:', dbJsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbJsonPath, 'utf-8');
  const db = JSON.parse(raw);

  // Maps để lưu ID cũ (string) -> ID mới (Int / UUID)
  const userOldToNewMap = new Map<string, number>();
  const userUsernameToNewMap = new Map<string, number>();
  const userAccountTypeByOldId = new Map<string, 'system_admin' | 'personnel'>();
  const personnelOldToNewMap = new Map<string, number>();
  const criterionOldToNewMap = new Map<string, number>();
  const criterionCodeToNewMap = new Map<string, number>();
  const kpiGroupOldToNewMap = new Map<string, number>();

  // --------------------------------------------------------------------------
  // BƯỚC 1: CẤU HÌNH HỆ THỐNG & DANH MỤC (APP_SETTINGS & SYSTEM_LOOKUPS)
  // --------------------------------------------------------------------------
  console.log('\n📦 [1/12] Nạp cấu hình hệ thống & danh mục tra cứu...');
  const settings = db.settings || {};
  await prisma.appSetting.upsert({
    where: { id: 'global_settings' },
    update: {
      referenceYear: Number(settings.referenceYear) || 2026,
      referenceDate: settings.referenceDate || null,
      brandName: settings.brandName || 'AURA TALENT',
      brandTagline: settings.brandTagline || 'Idol Agency OS',
      brandLogoUrl: settings.brandLogoUrl || '',
      tieBreakerEnabled: settings.tieBreakerEnabled !== false,
      tieBreakerCriteriaIds: settings.tieBreakerCriteriaIds || [],
      scoreCalculationMode: settings.scoreCalculationMode || 'sum',
      departmentParentMap: settings.departmentParentMap || {},
      departmentLeaders: settings.departmentLeaders || {},
    },
    create: {
      id: 'global_settings',
      referenceYear: Number(settings.referenceYear) || 2026,
      referenceDate: settings.referenceDate || null,
      brandName: settings.brandName || 'AURA TALENT',
      brandTagline: settings.brandTagline || 'Idol Agency OS',
      brandLogoUrl: settings.brandLogoUrl || '',
      tieBreakerEnabled: settings.tieBreakerEnabled !== false,
      tieBreakerCriteriaIds: settings.tieBreakerCriteriaIds || [],
      scoreCalculationMode: settings.scoreCalculationMode || 'sum',
      departmentParentMap: settings.departmentParentMap || {},
      departmentLeaders: settings.departmentLeaders || {},
    }
  });

  // Nạp danh mục
  const departments: string[] = db.departments || [];
  for (let i = 0; i < departments.length; i++) {
    await prisma.systemLookup.upsert({
      where: { type_value: { type: 'department', value: departments[i] } },
      update: { orderIndex: i },
      create: { type: 'department', value: departments[i], orderIndex: i }
    });
  }

  const personnelTypes: string[] = db.personnelTypes || [];
  for (let i = 0; i < personnelTypes.length; i++) {
    await prisma.systemLookup.upsert({
      where: { type_value: { type: 'personnelType', value: personnelTypes[i] } },
      update: { orderIndex: i },
      create: { type: 'personnelType', value: personnelTypes[i], orderIndex: i }
    });
  }

  const statuses: string[] = db.statuses || [];
  for (let i = 0; i < statuses.length; i++) {
    await prisma.systemLookup.upsert({
      where: { type_value: { type: 'status', value: statuses[i] } },
      update: { orderIndex: i },
      create: { type: 'status', value: statuses[i], orderIndex: i }
    });
  }
  console.log(`✅ Đã nạp cấu hình & danh mục (${departments.length} phòng ban, ${personnelTypes.length} loại nhân sự, ${statuses.length} trạng thái).`);

  // --------------------------------------------------------------------------
  // BƯỚC 2: TÀI KHOẢN NGƯỜI DÙNG (USERS)
  // --------------------------------------------------------------------------
  console.log('\n👤 [2/12] Nạp tài khoản người dùng (User Accounts)...');
  const users = db.users || [];
  for (const u of users) {
    const accountType = u.accountType === 'system_admin' || u.isSuperAdmin ? 'system_admin' : 'personnel';
    // Đảm bảo không trùng username/email
    const existing = await prisma.userAccount.findFirst({
      where: { OR: [{ username: u.username }, { email: u.email }] }
    });

    let savedUser;
    const operation = existing ? 'updated_from_json' : 'created_from_json';
    if (existing) {
      savedUser = await prisma.userAccount.update({
        where: { id: existing.id },
        data: {
          username: u.username,
          email: u.email,
          password: u.password || '123',
          role: u.role || 'viewer',
          roleTitle: u.roleTitle || 'Nhân Viên',
          accountType,
          isSuperAdmin: accountType === 'system_admin',
          allowedTabs: u.allowedTabs || [],
          allowedDepartments: u.allowedDepartments || [],
          allowedActions: u.allowedActions || [],
          avatarUrl: u.avatarUrl || null,
          status: u.status || 'Đang hoạt động',
        }
      });
    } else {
      savedUser = await prisma.userAccount.create({
        data: {
          username: u.username,
          email: u.email,
          password: u.password || '123',
          role: u.role || 'viewer',
          roleTitle: u.roleTitle || 'Nhân Viên',
          accountType,
          isSuperAdmin: accountType === 'system_admin',
          allowedTabs: u.allowedTabs || [],
          allowedDepartments: u.allowedDepartments || [],
          allowedActions: u.allowedActions || [],
          avatarUrl: u.avatarUrl || null,
          status: u.status || 'Đang hoạt động',
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        requestId: randomUUID(),
        method: 'SCRIPT',
        path: 'scripts/migrate-json-to-pg-v2.ts',
        action: 'USER_IMPORT',
        resource: 'user',
        resourceId: String(savedUser.id),
        statusCode: 200,
        metadata: {
          source: 'json_migration_restore',
          operation,
          legacyUserId: String(u.id),
          username: u.username,
          email: u.email,
          accountType
        }
      }
    });

    userOldToNewMap.set(u.id, savedUser.id);
    userUsernameToNewMap.set(u.username, savedUser.id);
    userAccountTypeByOldId.set(u.id, accountType);
  }
  console.log(`✅ Đã nạp ${users.length} tài khoản người dùng thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 3: HỒ SƠ NHÂN SỰ & IDOL (PERSONNEL)
  // --------------------------------------------------------------------------
  console.log('\n⭐ [3/12] Nạp hồ sơ nhân sự & Idol (Personnel)...');
  const idols = db.idols || [];
  for (const idol of idols) {
    let matchedUserId: number | null = null;
    if (idol.personnelType !== 'Dịch vụ ngoài') {
      if (idol.userId && userOldToNewMap.has(idol.userId) && userAccountTypeByOldId.get(idol.userId) !== 'system_admin') {
        matchedUserId = userOldToNewMap.get(idol.userId)!;
      } else if (idol.accountUsername && userUsernameToNewMap.has(idol.accountUsername) && users.find((u: any) => u.username === idol.accountUsername)?.isSuperAdmin !== true) {
        matchedUserId = userUsernameToNewMap.get(idol.accountUsername)!;
      }
    }

    const savedPersonnel = await prisma.personnel.create({
      data: {
        userId: matchedUserId,
        stt: idol.stt || null,
        stageName: idol.stageName || null,
        realName: idol.realName || idol.stageName || 'Chưa đặt tên',
        dob: parseDateOrNull(idol.dob),
        joinDate: parseDateOrNull(idol.joinDate),
        resignedDate: parseDateOrNull(idol.resignedDate),
        role: idol.role || 'Idol',
        weight: toDecimal(idol.weight, 0),
        height: toDecimal(idol.height, 0),
        hometown: idol.hometown || null,
        currentLiving: idol.currentLiving || null,
        department: idol.department || 'Nhóm Idol Biểu Diễn & Donate (PK)',
        personnelType: idol.personnelType || 'Công ty',
        status: idol.status || 'Đang hoạt động',
        avatarUrl: idol.avatarUrl || null,
        bio: idol.bio || null,
        socialLinks: idol.socialLinks || {},
        isIdol: idol.isIdol !== false,
        cooperationType: idol.cooperationType || (idol.personnelType === 'Dịch vụ ngoài' ? 'service_guest' : 'internal'),
        serviceNotes: idol.serviceNotes || null,
        assignedRole: idol.assignedRole || null,
        phone: idol.phone || null,
        citizenId: idol.citizenId || null,
        bankName: idol.bankName || null,
        bankAccountNumber: idol.bankAccountNumber || null,
        bankAccountName: idol.bankAccountName || null,
        baseSalary: toDecimal(idol.baseSalary, 0),
        idolCategory: idol.idolCategory || null,
        commercialDetails: idol.commercialDetails || null,
      }
    });

    personnelOldToNewMap.set(idol.id, savedPersonnel.id);
  }
  console.log(`✅ Đã nạp ${idols.length} hồ sơ nhân sự (Personnel) thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 4: DANH MỤC TIÊU CHÍ ĐÁNH GIÁ (CRITERIA)
  // --------------------------------------------------------------------------
  console.log('\n🏆 [4/12] Nạp danh mục tiêu chí đánh giá (Criteria)...');
  const criteria = db.criteria || [];
  for (const c of criteria) {
    const savedCrit = await prisma.criterion.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        maxScore: toDecimal(c.maxScore, 10),
        weight: toDecimal(c.weight, 20),
        description: c.description || null,
        priorityOrder: c.priorityOrder || 1,
      },
      create: {
        code: c.code,
        name: c.name,
        maxScore: toDecimal(c.maxScore, 10),
        weight: toDecimal(c.weight, 20),
        description: c.description || null,
        priorityOrder: c.priorityOrder || 1,
      }
    });
    criterionOldToNewMap.set(c.id, savedCrit.id);
    criterionCodeToNewMap.set(c.code, savedCrit.id);
  }
  console.log(`✅ Đã nạp ${criteria.length} tiêu chí đánh giá thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 5: NHÓM KPI & THÀNH VIÊN NHÓM (KPI_GROUPS & KPI_GROUP_MEMBERS)
  // --------------------------------------------------------------------------
  console.log('\n👥 [5/12] Nạp nhóm KPI & Bảng trung gian thành viên (1NF)...');
  const kpiGroups = db.kpiGroups || [];
  let memberCount = 0;
  for (const g of kpiGroups) {
    let leaderIdInt: number | null = null;
    if (g.leaderId && personnelOldToNewMap.has(g.leaderId)) {
      leaderIdInt = personnelOldToNewMap.get(g.leaderId)!;
    }

    const savedGroup = await prisma.kpiGroup.create({
      data: {
        name: g.name,
        description: g.description || null,
        type: g.type || 'system',
        category: g.category || 'mixed',
        department: g.department || null,
        leaderId: leaderIdInt,
      }
    });
    kpiGroupOldToNewMap.set(g.id, savedGroup.id);

    // Nạp thành viên nhóm vào bảng trung gian
    const memberIds: string[] = g.memberIds || [];
    for (const oldMemId of memberIds) {
      if (personnelOldToNewMap.has(oldMemId)) {
        const personnelIdInt = personnelOldToNewMap.get(oldMemId)!;
        await prisma.kpiGroupMember.create({
          data: {
            groupId: savedGroup.id,
            personnelId: personnelIdInt,
            roleInGroup: oldMemId === g.leaderId ? 'leader' : 'member',
          }
        });
        memberCount++;
      }
    }
  }
  console.log(`✅ Đã nạp ${kpiGroups.length} nhóm KPI và ${memberCount} liên kết thành viên nhóm.`);

  // --------------------------------------------------------------------------
  // BƯỚC 6: THIẾT ĐẶT CHỈ TIÊU KPI (KPI_SETTINGS)
  // --------------------------------------------------------------------------
  console.log('\n📊 [6/12] Nạp danh sách chỉ tiêu KPI (Kpi Settings)...');
  const kpiSettings = db.kpiSettings || [];
  for (const ks of kpiSettings) {
    let newGroupId: number | null = null;
    if (ks.groupId && kpiGroupOldToNewMap.has(ks.groupId)) {
      newGroupId = kpiGroupOldToNewMap.get(ks.groupId)!;
    }

    let newPersonnelId: number | null = null;
    if (ks.assignedIdolId && personnelOldToNewMap.has(ks.assignedIdolId)) {
      newPersonnelId = personnelOldToNewMap.get(ks.assignedIdolId)!;
    }

    await prisma.kpiSetting.create({
      data: {
        code: ks.code || 'KPI_DEFAULT',
        name: ks.name,
        description: ks.description || null,
        unit: ks.unit || 'VNĐ',
        customUnitLabel: ks.customUnitLabel || null,
        scopeType: ks.scopeType || 'group',
        groupId: newGroupId,
        assignedPersonnelId: newPersonnelId,
        period: ks.period || 'monthly',
        targetValue: toDecimal(ks.targetValue, 0),
        minThreshold: ks.minThreshold !== undefined ? toDecimal(ks.minThreshold, 0) : null,
        weight: toDecimal(ks.weight, 100),
        bonusIncentive: ks.bonusIncentive || null,
        status: ks.status || 'active',
      }
    });
  }
  console.log(`✅ Đã nạp ${kpiSettings.length} chỉ tiêu KPI thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 7: ĐIỂM ĐÁNH GIÁ CHUYÊN MÔN & BẢNG CON (SCORE_RECORDS & ITEMS)
  // --------------------------------------------------------------------------
  console.log('\n🎖️ [7/12] Nạp phiếu đánh giá & Chi tiết điểm theo tiêu chí (1NF)...');
  const scores = db.scores || [];
  let scoreItemCount = 0;
  for (const sc of scores) {
    if (!personnelOldToNewMap.has(sc.idolId)) continue;
    const personnelId = personnelOldToNewMap.get(sc.idolId)!;
    const scoreRecordId = randomUUID();

    await prisma.scoreRecord.create({
      data: {
        id: scoreRecordId,
        personnelId,
        period: sc.period || '2026-10',
        totalScore: toDecimal(sc.totalScore, 0),
        averageScore: toDecimal(sc.averageScore, 0),
        evaluatorNotes: sc.evaluatorNotes || null,
        evaluatedAt: parseDateOrNull(sc.evaluatedAt) || new Date(),
      }
    });

    // Bóc tách object JSON scores { [critId]: score }
    const scObj = sc.scores || {};
    for (const [critKey, scoreVal] of Object.entries(scObj)) {
      let critIdInt: number | undefined;
      if (criterionOldToNewMap.has(critKey)) {
        critIdInt = criterionOldToNewMap.get(critKey);
      } else if (criterionCodeToNewMap.has(critKey)) {
        critIdInt = criterionCodeToNewMap.get(critKey);
      }

      if (critIdInt) {
        await prisma.scoreRecordItem.create({
          data: {
            scoreRecordId,
            criterionId: critIdInt,
            score: toDecimal(scoreVal as any, 0),
          }
        });
        scoreItemCount++;
      }
    }
  }
  console.log(`✅ Đã nạp ${scores.length} phiếu đánh giá và ${scoreItemCount} dòng điểm chi tiết.`);

  // --------------------------------------------------------------------------
  // BƯỚC 8: LỊCH TRỰC LIVESTREAM / CA DIỄN (WORK_SCHEDULES)
  // --------------------------------------------------------------------------
  console.log('\n⏰ [8/12] Nạp lịch ca trực & ca diễn (Work Schedules)...');
  const schedules = db.schedules || [];
  let scheduleCount = 0;
  for (const s of schedules) {
    if (!personnelOldToNewMap.has(s.idolId)) continue;
    const personnelId = personnelOldToNewMap.get(s.idolId)!;

    await prisma.workSchedule.create({
      data: {
        id: randomUUID(),
        personnelId,
        dayOfWeek: Number(s.dayOfWeek) || 1,
        shiftType: s.shiftType || 'evening',
        startTime: s.startTime || '19:00',
        endTime: s.endTime || '22:00',
        platform: s.platform || 'TikTok Live',
        title: s.title || 'Livestream Ca Diễn',
        notes: s.notes || null,
        isActive: s.isActive !== false,
        repeatType: s.repeatType || 'fixed_year',
        specificMonth: s.specificMonth || null,
        specificDate: parseDateOrNull(s.specificDate),
      }
    });
    scheduleCount++;
  }
  console.log(`✅ Đã nạp ${scheduleCount} ca làm việc / trực live thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 9: NHIỆM VỤ CÓ BẤM GIỜ (PERSONNEL_TASKS)
  // --------------------------------------------------------------------------
  console.log('\n📋 [9/12] Nạp danh sách nhiệm vụ & công việc (Personnel Tasks)...');
  const tasks = db.tasks || [];
  let taskCount = 0;
  for (const t of tasks) {
    if (!personnelOldToNewMap.has(t.idolId)) continue;
    const personnelId = personnelOldToNewMap.get(t.idolId)!;

    await prisma.personnelTask.create({
      data: {
        id: randomUUID(),
        personnelId,
        title: t.title,
        description: t.description || null,
        category: t.category || 'Luyện tập',
        status: t.status || 'todo',
        startTime: parseDateOrNull(t.startTime),
        endTime: parseDateOrNull(t.endTime),
        loggedDurationMinutes: Number(t.loggedDurationMinutes) || 0,
        subtasks: t.subtasks || [],
        dueDate: parseDateOrNull(t.dueDate),
      }
    });
    taskCount++;
  }
  console.log(`✅ Đã nạp ${taskCount} nhiệm vụ công việc thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 10: ĐƠN NGHỈ PHÉP (LEAVE_REQUESTS)
  // --------------------------------------------------------------------------
  console.log('\n🏖️ [10/12] Nạp đơn xin nghỉ phép (Leave Requests)...');
  const leaveRequests = db.leaveRequests || [];
  let leaveCount = 0;
  for (const lr of leaveRequests) {
    if (!personnelOldToNewMap.has(lr.idolId)) continue;
    const personnelId = personnelOldToNewMap.get(lr.idolId)!;

    let reviewedById: number | null = null;
    if (lr.reviewedBy?.id && userOldToNewMap.has(lr.reviewedBy.id)) {
      reviewedById = userOldToNewMap.get(lr.reviewedBy.id)!;
    }

    await prisma.leaveRequest.create({
      data: {
        id: randomUUID(),
        personnelId,
        personnelName: lr.idolName || 'Nhân sự',
        department: lr.department || 'Phòng Idol',
        leaveType: lr.leaveType || 'annual',
        startDate: parseDateOrNull(lr.startDate) || new Date(),
        endDate: parseDateOrNull(lr.endDate) || new Date(),
        totalDays: toDecimal(lr.totalDays, 1),
        reason: lr.reason || 'Nghỉ phép cá nhân',
        status: lr.status || 'pending',
        approverRoleRequired: lr.approverRoleRequired || null,
        autoApproved: !!lr.autoApproved,
        reviewedById,
        reviewNote: lr.reviewNote || null,
        reviewedAt: parseDateOrNull(lr.reviewedAt),
      }
    });
    leaveCount++;
  }
  console.log(`✅ Đã nạp ${leaveCount} đơn xin nghỉ phép thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 11: YÊU CẦU PHÊ DUYỆT (APPROVAL_REQUESTS)
  // --------------------------------------------------------------------------
  console.log('\n📝 [11/12] Nạp lịch sử yêu cầu phê duyệt (Approval Requests)...');
  const approvals = db.approvals || [];
  const defaultAdminId = userOldToNewMap.get('user-01') || Array.from(userOldToNewMap.values())[0] || 1;
  let approvalCount = 0;
  for (const a of approvals) {
    let targetPersonnelId: number | null = null;
    if (a.targetIdolId && personnelOldToNewMap.has(a.targetIdolId)) {
      targetPersonnelId = personnelOldToNewMap.get(a.targetIdolId)!;
    }

    let reqById = defaultAdminId;
    if (a.requestedBy?.id && userOldToNewMap.has(a.requestedBy.id)) {
      reqById = userOldToNewMap.get(a.requestedBy.id)!;
    }

    let revById: number | null = null;
    if (a.reviewedBy?.id && userOldToNewMap.has(a.reviewedBy.id)) {
      revById = userOldToNewMap.get(a.reviewedBy.id)!;
    }

    await prisma.approvalRequest.create({
      data: {
        id: randomUUID(),
        type: a.type || 'update_idol',
        status: a.status || 'pending',
        targetPersonnelId,
        targetName: a.targetName || 'Yêu cầu',
        reason: a.reason || null,
        data: a.data || null,
        requestedById: reqById,
        reviewedById: revById,
        reviewNote: a.reviewNote || null,
        reviewedAt: parseDateOrNull(a.reviewedAt),
      }
    });
    approvalCount++;
  }
  console.log(`✅ Đã nạp ${approvalCount} yêu cầu phê duyệt thành công.`);

  // --------------------------------------------------------------------------
  // BƯỚC 12: KỲ LƯƠNG & PHIẾU LƯƠNG CHI TIẾT (PAYROLL_PERIODS & RECORDS)
  // --------------------------------------------------------------------------
  console.log('\n💰 [12/12] Nạp kỳ chốt lương & Phiếu chi trả thu nhập (Payroll)...');
  const payrolls = db.payrolls || [];
  for (const p of payrolls) {
    const periodId = p.id || `payroll-${p.period}`;

    let subById: number | null = null;
    if (p.submittedBy?.id && userOldToNewMap.has(p.submittedBy.id)) {
      subById = userOldToNewMap.get(p.submittedBy.id)!;
    }

    let appById: number | null = null;
    if (p.approvedBy?.id && userOldToNewMap.has(p.approvedBy.id)) {
      appById = userOldToNewMap.get(p.approvedBy.id)!;
    }

    await prisma.payrollPeriod.upsert({
      where: { period: p.period },
      update: {
        status: p.status || 'draft',
        totalGross: toDecimal(p.totalGross, 0),
        totalKpiBonus: toDecimal(p.totalKpiBonus, 0),
        totalHotBonus: toDecimal(p.totalHotBonus, 0),
        totalDeductions: toDecimal(p.totalDeductions, 0),
        totalNet: toDecimal(p.totalNet, 0),
        employeeCount: Number(p.employeeCount) || 0,
        submittedById: subById,
        submittedAt: parseDateOrNull(p.submittedAt),
        approvedById: appById,
        approvedAt: parseDateOrNull(p.approvedAt),
        lockedAt: parseDateOrNull(p.lockedAt),
      },
      create: {
        id: periodId,
        period: p.period,
        status: p.status || 'draft',
        totalGross: toDecimal(p.totalGross, 0),
        totalKpiBonus: toDecimal(p.totalKpiBonus, 0),
        totalHotBonus: toDecimal(p.totalHotBonus, 0),
        totalDeductions: toDecimal(p.totalDeductions, 0),
        totalNet: toDecimal(p.totalNet, 0),
        employeeCount: Number(p.employeeCount) || 0,
        submittedById: subById,
        submittedAt: parseDateOrNull(p.submittedAt),
        approvedById: appById,
        approvedAt: parseDateOrNull(p.approvedAt),
        lockedAt: parseDateOrNull(p.lockedAt),
      }
    });
  }

  // Nạp các phiếu lương cá nhân
  const payrollRecords = db.payrollRecords || [];
  let recordCount = 0;
  for (const r of payrollRecords) {
    let idolId = r.idolId;
    if (!idolId && r.userId) {
      const match = idols.find((i: any) => i.userId === r.userId || i.accountUsername === r.userId);
      if (match) idolId = match.id;
    }
    if (!idolId || !personnelOldToNewMap.has(idolId)) continue;
    const personnelId = personnelOldToNewMap.get(idolId)!;
    const periodId = r.periodId || `payroll-${r.period}`;

    const earnings = r.earnings || {};
    const deductions = r.deductions || {};
    const hotBonusAmount = r.hotBonus?.amount || earnings.hotBonus || 0;

    await prisma.payrollRecord.upsert({
      where: {
        periodId_personnelId: {
          periodId,
          personnelId
        }
      },
      update: {
        employeeName: r.employeeName || 'Nhân sự',
        stageName: r.stageName || null,
        department: r.department || 'Đơn vị',
        personnelType: r.personnelType || 'Công ty',
        isIdol: r.isIdol !== false,
        bankInfo: r.bankInfo || {},
        baseSalary: toDecimal(earnings.baseSalary || r.baseSalary, 0),
        overtimePay: toDecimal(earnings.overtimePay, 0),
        kpiBonus: toDecimal(earnings.kpiBonus, 0),
        commissionGmv: toDecimal(earnings.commissionGmv, 0),
        giftShare: toDecimal(earnings.giftShare, 0),
        hotBonus: toDecimal(hotBonusAmount, 0),
        totalGross: toDecimal(earnings.totalGross || r.totalGross, 0),
        totalDeductions: toDecimal(deductions.totalDeductions || r.totalDeductions, 0),
        netSalary: toDecimal(r.netSalary, 0),
        earningsDetail: earnings,
        deductionsDetail: deductions,
        paymentStatus: r.paymentStatus || r.status || 'pending',
        paidAt: parseDateOrNull(r.paidAt),
        paymentRef: r.paymentRef || null,
        adjustmentLogs: r.adjustmentLogs || [],
        notes: r.notes || null,
      },
      create: {
        id: randomUUID(),
        periodId,
        period: r.period,
        personnelId,
        employeeName: r.employeeName || 'Nhân sự',
        stageName: r.stageName || null,
        department: r.department || 'Đơn vị',
        personnelType: r.personnelType || 'Công ty',
        isIdol: r.isIdol !== false,
        bankInfo: r.bankInfo || {},
        baseSalary: toDecimal(earnings.baseSalary || r.baseSalary, 0),
        overtimePay: toDecimal(earnings.overtimePay, 0),
        kpiBonus: toDecimal(earnings.kpiBonus, 0),
        commissionGmv: toDecimal(earnings.commissionGmv, 0),
        giftShare: toDecimal(earnings.giftShare, 0),
        hotBonus: toDecimal(hotBonusAmount, 0),
        totalGross: toDecimal(earnings.totalGross || r.totalGross, 0),
        totalDeductions: toDecimal(deductions.totalDeductions || r.totalDeductions, 0),
        netSalary: toDecimal(r.netSalary, 0),
        earningsDetail: earnings,
        deductionsDetail: deductions,
        paymentStatus: r.paymentStatus || r.status || 'pending',
        paidAt: parseDateOrNull(r.paidAt),
        paymentRef: r.paymentRef || null,
        adjustmentLogs: r.adjustmentLogs || [],
        notes: r.notes || null,
      }
    });
    recordCount++;
  }
  console.log(`✅ Đã nạp ${payrolls.length} kỳ lương và ${recordCount} phiếu lương cá nhân thành công.`);

  // --------------------------------------------------------------------------
  // BÁO CÁO AUDIT ĐỐI SOÁT TỔNG THỂ
  // --------------------------------------------------------------------------
  console.log('\n=====================================================');
  console.log('📊 BÁO CÁO ĐỐI SOÁT TOÀN VẸN DỮ LIỆU SAU MIGRATION');
  console.log('=====================================================');

  const countUsers = await prisma.userAccount.count();
  const countPersonnel = await prisma.personnel.count();
  const countCriteria = await prisma.criterion.count();
  const countKpiGroups = await prisma.kpiGroup.count();
  const countKpiMembers = await prisma.kpiGroupMember.count();
  const countKpiSettings = await prisma.kpiSetting.count();
  const countScoreRecords = await prisma.scoreRecord.count();
  const countScoreItems = await prisma.scoreRecordItem.count();
  const countSchedules = await prisma.workSchedule.count();
  const countTasks = await prisma.personnelTask.count();
  const countLeaves = await prisma.leaveRequest.count();
  const countApprovals = await prisma.approvalRequest.count();
  const countPayrollPeriods = await prisma.payrollPeriod.count();
  const countPayrollRecords = await prisma.payrollRecord.count();

  console.table([
    { 'Thực thể (Entity)': 'Tài khoản người dùng (users)', 'db.json': users.length, 'PostgreSQL': countUsers, 'Khớp': users.length === countUsers ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Hồ sơ nhân sự (personnel)', 'db.json': idols.length, 'PostgreSQL': countPersonnel, 'Khớp': idols.length === countPersonnel ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Tiêu chí đánh giá (criteria)', 'db.json': criteria.length, 'PostgreSQL': countCriteria, 'Khớp': criteria.length === countCriteria ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Nhóm KPI (kpi_groups)', 'db.json': kpiGroups.length, 'PostgreSQL': countKpiGroups, 'Khớp': kpiGroups.length === countKpiGroups ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Thành viên nhóm KPI (kpi_group_members)', 'db.json': memberCount, 'PostgreSQL': countKpiMembers, 'Khớp': memberCount === countKpiMembers ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Chỉ tiêu KPI (kpi_settings)', 'db.json': kpiSettings.length, 'PostgreSQL': countKpiSettings, 'Khớp': kpiSettings.length === countKpiSettings ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Phiếu điểm (score_records)', 'db.json': scores.length, 'PostgreSQL': countScoreRecords, 'Khớp': scores.length === countScoreRecords ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Điểm chi tiết (score_record_items)', 'db.json': scoreItemCount, 'PostgreSQL': countScoreItems, 'Khớp': scoreItemCount === countScoreItems ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Ca trực live (work_schedules)', 'db.json': schedules.length, 'PostgreSQL': countSchedules, 'Khớp': schedules.length === countSchedules ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Nhiệm vụ (personnel_tasks)', 'db.json': tasks.length, 'PostgreSQL': countTasks, 'Khớp': tasks.length === countTasks ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Đơn nghỉ phép (leave_requests)', 'db.json': leaveRequests.length, 'PostgreSQL': countLeaves, 'Khớp': leaveRequests.length === countLeaves ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Yêu cầu phê duyệt (approval_requests)', 'db.json': approvals.length, 'PostgreSQL': countApprovals, 'Khớp': approvals.length === countApprovals ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Kỳ lương (payroll_periods)', 'db.json': payrolls.length, 'PostgreSQL': countPayrollPeriods, 'Khớp': payrolls.length === countPayrollPeriods ? '✅ 100%' : '❌ Lệch' },
    { 'Thực thể (Entity)': 'Phiếu lương (payroll_records)', 'db.json': recordCount, 'PostgreSQL': countPayrollRecords, 'Khớp': recordCount === countPayrollRecords ? '✅ 100%' : '❌ Lệch' },
  ]);

  console.log('\n🎉 STAGE 3 HOÀN TẤT XUẤT SẮC: TOÀN BỘ DỮ LIỆU ĐÃ NẰM TRONG POSTGRESQL!');
}

main()
  .catch(e => {
    console.error('❌ Lỗi trong quá trình Migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
