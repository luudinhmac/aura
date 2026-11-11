import fs from 'fs';
import path from 'path';
import { DEFAULT_IDOLS, DEFAULT_USERS, DEFAULT_KPI_GROUPS, DEFAULT_KPI_SETTINGS } from '../server/data/defaultData.ts';

const DB_FILE = path.join(process.cwd(), 'server', 'data', 'db.json');

const OBSOLETE_DEPTS = new Set([
  'Team A-Listers (Gen 3)',
  'Team A-Listers',
  'Ban Nhạc Eclipse',
  'Đơn vị Thời Trang & Quảng Cáo',
  'Học Viện Đào Tạo Thực Tập Sinh',
  'Nhóm Gaming',
  'Nhóm Dance & Fashion',
  'Nhóm Entertainment',
  'Nhóm Commerce'
]);

const mapDept = (dept?: string): string => {
  if (!dept) return dept as any;
  if (dept.includes('Eclipse') || dept === 'Nhóm Gaming') return 'Nhóm Idol Gaming & Gear';
  if (dept.includes('A-Listers') || dept === 'Nhóm Dance & Fashion' || dept === 'Nhóm Entertainment') return 'Nhóm Idol Biểu Diễn & Donate (PK)';
  if (dept.includes('Thời Trang & Quảng Cáo') || dept.includes('Thực Tập Sinh') || dept === 'Nhóm Commerce') return 'Nhóm Idol Live Commerce & Chốt Đơn';
  return dept;
};

const STANDARD_DEPARTMENTS = [
  'Ban Giám Đốc',
  'HR & Kế Toán',
  'Phòng Quản Lý & Phát Triển Idol',
  'Marketing & Truyền Thông',
  'Kinh Doanh Nhãn Hàng',
  'Nội Dung & Sản Xuất',
  'Vận Hành Livestream',
  'Nhóm Idol Gaming & Gear',
  'Nhóm Idol Biểu Diễn & Donate (PK)',
  'Nhóm Idol Live Commerce & Chốt Đơn'
];

if (fs.existsSync(DB_FILE)) {
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(content);

  // 1. Departments array
  db.departments = STANDARD_DEPARTMENTS;

  // 2. Idols (Gộp đủ 6 Idol và 7 Cán bộ nhân sự)
  const existingIdols = Array.isArray(db.idols) ? db.idols : [];
  const existingIds = new Set(existingIdols.map((i: any) => i.id));
  const missingFromDefaults = DEFAULT_IDOLS.filter(d => !existingIds.has(d.id));
  
  db.idols = [...existingIdols, ...missingFromDefaults].map((idol: any) => {
    const def = DEFAULT_IDOLS.find(d => d.id === idol.id);
    return {
      ...idol,
      department: mapDept(idol.department),
      isIdol: idol.isIdol !== undefined ? idol.isIdol : (def?.isIdol !== undefined ? def.isIdol : true)
    };
  });

  // 3. Users: Khóa chặt chuẩn xác đúng 13 tài khoản chính thức (6 Idol + 7 Cán Bộ)
  const OFFICIAL_USER_USERNAMES = new Set(DEFAULT_USERS.map(u => u.username));
  const rawUsers = Array.isArray(db.users) ? db.users : [];
  
  // Lọc chỉ giữ các tài khoản thuộc DEFAULT_USERS
  const filteredUsers = rawUsers.filter((u: any) => OFFICIAL_USER_USERNAMES.has(u.username));
  const existingUsernames = new Set(filteredUsers.map((u: any) => u.username));
  const missingUsers = DEFAULT_USERS.filter(u => !existingUsernames.has(u.username));
  
  db.users = [...filteredUsers, ...missingUsers].map((u: any) => {
    const def = DEFAULT_USERS.find(d => d.username === u.username);
    return {
      ...def,
      ...u,
      id: def?.id || u.id,
      name: def?.name || u.name,
      role: def?.role || u.role,
      roleTitle: def?.roleTitle || u.roleTitle,
      idolId: def?.idolId || u.idolId,
      department: mapDept(u.department || def?.department),
      allowedTabs: def?.allowedTabs || u.allowedTabs,
      allowedActions: def?.allowedActions || u.allowedActions,
      isSuperAdmin: def?.isSuperAdmin || u.isSuperAdmin || false
    };
  });

  // Đồng bộ lại accountUsername & userId trên 13 nhân sự
  const userByUsername = new Map<string, any>(db.users.map((u: any) => [u.username, u]));
  const userByIdolId = new Map<string, any>(db.users.map((u: any) => [u.idolId, u]));
  db.idols.forEach((idol: any) => {
    const u: any = userByIdolId.get(idol.id);
    if (u) {
      idol.userId = u.id;
      idol.accountUsername = u.username;
    }
  });

  // 4. Leave Requests
  if (Array.isArray(db.leaveRequests)) {
    db.leaveRequests.forEach((lr: any) => {
      lr.department = mapDept(lr.department);
    });
  }

  // 5. Approvals
  if (Array.isArray(db.approvals)) {
    db.approvals.forEach((appr: any) => {
      if (appr.data?.department) {
        appr.data.department = mapDept(appr.data.department);
      }
    });
  }

  // 6. Payroll Records: Làm sạch toàn bộ các phiếu lương mồ côi và trùng lặp
  const validPersonnelMap = new Map<string, any>(db.idols.map((i: any) => [i.id, i]));
  const seenInPeriod = new Set<string>();

  if (Array.isArray(db.payrollRecords)) {
    db.payrollRecords = db.payrollRecords.filter((pr: any) => {
      let idolId = pr.idolId;
      if (!idolId && pr.userId) {
        const u = db.users.find((user: any) => user.id === pr.userId);
        if (u?.idolId) idolId = u.idolId;
      }
      if (!idolId) {
        // Tìm theo tên
        const match = db.idols.find((i: any) => i.realName === pr.employeeName || i.stageName === pr.employeeName);
        if (match) idolId = match.id;
      }

      if (!idolId || !validPersonnelMap.has(idolId)) return false;

      // Chuẩn hóa idolId và isIdol
      pr.idolId = idolId;
      const personnel: any = validPersonnelMap.get(idolId)!;
      pr.isIdol = personnel.isIdol !== false;
      pr.roleTitle = personnel.role;
      pr.employeeName = personnel.realName || personnel.stageName;
      pr.stageName = personnel.stageName;
      pr.department = personnel.department;
      if (personnel.userId) pr.userId = personnel.userId;

      // Deduplicate theo từng kỳ lương
      const dedupeKey = `${pr.periodId || pr.period}_${idolId}`;
      if (seenInPeriod.has(dedupeKey)) return false;
      seenInPeriod.add(dedupeKey);

      return true;
    });
  }

  // 7. Tasks
  if (Array.isArray(db.tasks)) {
    db.tasks.forEach((t: any) => {
      if (t.department) t.department = mapDept(t.department);
    });
  }

  // 8. Schedules
  if (Array.isArray(db.schedules)) {
    db.schedules.forEach((s: any) => {
      if (s.title && s.title.includes('Eclipse')) {
        s.title = s.title.replace('Eclipse', 'Gaming & Gear');
      }
      if (s.notes && s.notes.includes('Ban Nhạc')) {
        s.notes = 'Studio Gaming Room';
      }
    });
  }

  // 9. KPI Groups & Settings
  if (!Array.isArray(db.kpiGroups) || db.kpiGroups.length === 0) {
    db.kpiGroups = DEFAULT_KPI_GROUPS;
  }
  if (!Array.isArray(db.kpiSettings) || db.kpiSettings.length === 0) {
    db.kpiSettings = DEFAULT_KPI_SETTINGS;
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  console.log('✅ Sanitized server/data/db.json successfully! Exactly 10 departments.');

  const updatedContent = fs.readFileSync(DB_FILE, 'utf-8');
  const exactMatches = [
    '"Nhóm Gaming"',
    '"Nhóm Dance & Fashion"',
    '"Nhóm Entertainment"',
    '"Nhóm Commerce"',
    '"Ban Nhạc Eclipse"',
    '"Team A-Listers (Gen 3)"',
    '"Team A-Listers"',
    '"Đơn vị Thời Trang & Quảng Cáo"',
    '"Học Viện Đào Tạo Thực Tập Sinh"'
  ];
  let found = 0;
  for (const term of exactMatches) {
    const count = updatedContent.split(term).length - 1;
    if (count > 0) {
      console.log('STILL FOUND ' + term + ': ' + count);
      found += count;
    }
  }
  if (found === 0) {
    console.log('🎯 Verified: 0 obsolete departments remain in db.json!');
  }

  console.log(`📊 Idols: ${db.idols?.length} (Idols: ${db.idols?.filter((i: any) => i.isIdol).length}, Cán Bộ: ${db.idols?.filter((i: any) => !i.isIdol).length})`);
  console.log(`📊 Users: ${db.users?.length}`);
  const oct2026Recs = db.payrollRecords?.filter((r: any) => (r.periodId === 'payroll-2026-10' || r.period === '2026-10'));
  console.log(`📊 Payroll Records 10/2026: ${oct2026Recs?.length}`);
}
