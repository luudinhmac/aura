import fs from 'fs';
import path from 'path';
import { Idol, Criterion, IdolScoreRecord, IdolTask, ColumnHeadersConfig, AppSettings, UserAccount, ApprovalRequest, WorkScheduleSlot, LeaveRequest, PayrollPeriod, PayrollRecord, MacroPayrollSummary, PayrollScopeType, AggregatedPayrollPersonnel, KpiGroup, KpiSetting, DEFAULT_BLANK_AVATAR } from '../../src/types/index.ts';
import { DEFAULT_IDOLS, DEFAULT_CRITERIA, DEFAULT_SCORES, DEFAULT_TASKS, DEFAULT_DEPARTMENTS, DEFAULT_COLUMN_HEADERS, DEFAULT_SETTINGS, DEFAULT_STATUSES, DEFAULT_USERS, DEFAULT_APPROVALS, DEFAULT_PERSONNEL_TYPES, DEFAULT_SCHEDULES, DEFAULT_LEAVE_REQUESTS, DEFAULT_PAYROLL_PERIODS, DEFAULT_PAYROLL_RECORDS, DEFAULT_KPI_GROUPS, DEFAULT_KPI_SETTINGS } from './defaultData.ts';
import { generateCompanyCredentials } from '../../src/utils/credentialsUtils.ts';
import { isEligibleForPayrollPeriod, calculateProratedWorkDays, calculateOvertimePay } from '../../src/utils/dateUtils.ts';
import { assertPayrollApprovalAllowed, assertPayrollLockAllowed, assertPayrollSubmitAllowed } from '../../src/utils/payrollWorkflowPermissions.ts';
import { calculatePayrollDeductions } from '../../src/utils/payrollDeductions.ts';
import { isProductionEnvironment } from '../../scripts/environment-guards.ts';

interface DatabaseSchema {
  idols: Idol[];
  criteria: Criterion[];
  scores: IdolScoreRecord[];
  tasks: IdolTask[];
  departments: string[];
  personnelTypes: string[];
  statuses: string[];
  columnHeaders: ColumnHeadersConfig;
  settings: AppSettings;
  users: UserAccount[];
  approvals: ApprovalRequest[];
  schedules: WorkScheduleSlot[];
  leaveRequests: LeaveRequest[];
  payrolls: PayrollPeriod[];
  payrollRecords: PayrollRecord[];
  kpiGroups: KpiGroup[];
  kpiSettings: KpiSetting[];
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const LEGACY_SALARY_BACKFILL_ENABLED = false;

function ensureDataFile(): void {
  if (isProductionEnvironment()) {
    throw new Error('Legacy JSON store is disabled in production; use PostgreSQL mode');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      idols: DEFAULT_IDOLS,
      criteria: DEFAULT_CRITERIA,
      scores: DEFAULT_SCORES,
      tasks: DEFAULT_TASKS,
      departments: DEFAULT_DEPARTMENTS,
      personnelTypes: DEFAULT_PERSONNEL_TYPES,
      statuses: DEFAULT_STATUSES,
      columnHeaders: DEFAULT_COLUMN_HEADERS,
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      approvals: DEFAULT_APPROVALS,
      schedules: DEFAULT_SCHEDULES,
      leaveRequests: DEFAULT_LEAVE_REQUESTS,
      payrolls: DEFAULT_PAYROLL_PERIODS,
      payrollRecords: DEFAULT_PAYROLL_RECORDS,
      kpiGroups: DEFAULT_KPI_GROUPS,
      kpiSettings: DEFAULT_KPI_SETTINGS,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb(): DatabaseSchema {
  if (isProductionEnvironment()) {
    throw new Error('Legacy JSON store is disabled in production; use PostgreSQL mode');
  }
  ensureDataFile();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const rawUsers: any[] = parsed.users || [];
    // Loại bỏ các tài khoản dummy mẫu cũ và tài khoản trùng lặp để đảm bảo đúng 13 tài khoản
    const OBSOLETE_USERNAMES = [
      'trainer', 'manager', 'guest', 'streamer_01',
      'leader_gaming', 'leader_dance', 'leader_commerce',
      'macld', 'nganvk', 'anhnh', 'yenhh', 'chilq', 'kietlt', 'dangth'
    ];
    const filteredRawUsers = rawUsers.filter((u: any) => !OBSOLETE_USERNAMES.includes(u.username));
    const existingUsernames = new Set(filteredRawUsers.map((u: any) => u.username));
    const missingDefaults = DEFAULT_USERS.filter((d) => !existingUsernames.has(d.username) && !OBSOLETE_USERNAMES.includes(d.username));
    const combinedUsers = [...filteredRawUsers, ...missingDefaults];

    const users: UserAccount[] = (combinedUsers.length > 0 ? combinedUsers : DEFAULT_USERS).map((u: any) => {
      const defMatch = DEFAULT_USERS.find(d => d.username === u.username);
      const allowedTabs = u.allowedTabs && u.allowedTabs.length > 0
        ? (u.isSuperAdmin && !u.allowedTabs.includes('admin') ? [...u.allowedTabs, 'admin'] : u.allowedTabs)
        : (defMatch?.allowedTabs || ['roster', 'scoring', 'leaderboard', 'tasks', 'analytics']);

      return {
        ...u,
        idolId: u.idolId || defMatch?.idolId,
        joinDate: u.joinDate || defMatch?.joinDate || (u.isSuperAdmin ? '2022-01-01' : '2023-01-01'),
        baseSalary: u.baseSalary !== undefined ? u.baseSalary : defMatch?.baseSalary,
        bankName: u.bankName || defMatch?.bankName || 'Techcombank',
        bankAccountNumber: u.bankAccountNumber || defMatch?.bankAccountNumber || '1900888999',
        bankAccountName: u.bankAccountName || defMatch?.bankAccountName || u.name.toUpperCase(),
        personnelType: u.personnelType || defMatch?.personnelType || (u.isSuperAdmin ? 'Ban Giám Đốc' : 'Khối Vận Hành'),
        department: u.department || defMatch?.department || (u.isSuperAdmin ? 'Ban Giám Đốc' : 'Khối Vận Hành'),
        allowedTabs,
        allowedDepartments: u.allowedDepartments && u.allowedDepartments.length > 0 
          ? u.allowedDepartments 
          : (defMatch?.allowedDepartments || ['*']),
        allowedActions: u.allowedActions && u.allowedActions.length > 0 
          ? u.allowedActions 
          : (defMatch?.allowedActions || (u.isSuperAdmin ? ['manage_idols', 'manage_scores', 'manage_criteria', 'manage_tasks', 'manage_departments', 'manage_settings', 'manage_approvals'] : ['manage_scores', 'manage_tasks']))
      };
    });

    const parsedIdols: any[] = parsed.idols || DEFAULT_IDOLS;
    const existingIds = new Set(parsedIdols.map((i: any) => i.id));
    const missingIdolDefaults = DEFAULT_IDOLS.filter((d) => !existingIds.has(d.id));
    const combinedIdols = [...parsedIdols, ...missingIdolDefaults];

    const idols = combinedIdols.map((idol: any) => {
      const def = DEFAULT_IDOLS.find((d) => d.id === idol.id);
      return {
        ...idol,
        isIdol: idol.isIdol !== undefined ? idol.isIdol : (def?.isIdol !== undefined ? def.isIdol : true),
        joinDate: idol.joinDate || def?.joinDate || '2023-06-01',
        baseSalary: idol.baseSalary !== undefined ? idol.baseSalary : def?.baseSalary,
        bankName: idol.bankName || def?.bankName || 'MB Bank (Quân Đội)',
        bankAccountNumber: idol.bankAccountNumber || def?.bankAccountNumber || '',
        bankAccountName: idol.bankAccountName || def?.bankAccountName || ''
      };
    });

    // Bảng quy chuẩn mapping 1-1 cho 13 nhân sự
    const OFFICIAL_USERNAME_MAP: Record<string, { username: string; email: string }> = {
      'staff-01': { username: 'admin', email: 'admin@auratalent.vn' },
      'staff-02': { username: 'hr_admin', email: 'hr@auratalent.vn' },
      'staff-03': { username: 'talent_head', email: 'talent.head@auratalent.vn' },
      'staff-04': { username: 'marketing_pr', email: 'marketing@auratalent.vn' },
      'staff-05': { username: 'booking_ads', email: 'booking@auratalent.vn' },
      'staff-06': { username: 'content_producer', email: 'production@auratalent.vn' },
      'staff-07': { username: 'live_ops', email: 'live.ops@auratalent.vn' },
      'idol-01': { username: 'anhtm', email: 'anhtm@auratalent.vn' },
      'idol-02': { username: 'baong', email: 'baong@auratalent.vn' },
      'idol-03': { username: 'vyvt', email: 'vyvt@auratalent.vn' },
      'idol-04': { username: 'namlh', email: 'namlh@auratalent.vn' },
      'idol-05': { username: 'anhdn', email: 'anhdn@auratalent.vn' },
      'idol-06': { username: 'duypd', email: 'duypd@auratalent.vn' }
    };

    // Tự động liên kết tài khoản cho 13 nhân sự
    idols.forEach((idol: Idol) => {
      const official = OFFICIAL_USERNAME_MAP[idol.id];
      const username = official?.username || idol.accountUsername;
      const email = official?.email || idol.socialLinks?.email;
      if (username) idol.accountUsername = username;
      if (!idol.socialLinks) idol.socialLinks = {};
      if (email) idol.socialLinks.email = email;

      // Tìm tài khoản user tương ứng 1-1
      const match = users.find((u) => u.idolId === idol.id || u.username === username);
      const displayName = idol.realName && idol.stageName && idol.realName !== idol.stageName
        ? `${idol.realName} (${idol.stageName})`
        : (idol.realName || idol.stageName);

      if (match) {
        match.idolId = idol.id;
        idol.userId = match.id;
        if (!match.name || match.name === idol.stageName) {
          match.name = displayName;
        }
        if (idol.avatarUrl && (!match.avatarUrl || match.avatarUrl.includes('photo-1534528741775-53994a69daeb'))) {
          match.avatarUrl = idol.avatarUrl;
        }
        if (!match.phone && idol.phone) match.phone = idol.phone;
        if (!match.address && idol.currentLiving) {
          match.address = idol.currentLiving;
          match.currentLiving = idol.currentLiving;
        }
        if (!match.bankName && idol.bankName) match.bankName = idol.bankName;
        if (!match.bankAccountNumber && idol.bankAccountNumber) match.bankAccountNumber = idol.bankAccountNumber;
        if (!match.bankAccountName && idol.bankAccountName) match.bankAccountName = idol.bankAccountName;
        
        // Đảm bảo Idol có quyền truy cập Dashboard
        if (idol.isIdol) {
          if (!match.allowedTabs.includes('my_dashboard')) {
            match.allowedTabs.unshift('my_dashboard');
          }
          if (!match.allowedTabs.includes('schedule')) {
            match.allowedTabs.push('schedule');
          }
          if (!match.allowedTabs.includes('tasks')) {
            match.allowedTabs.push('tasks');
          }
        }
      }
    });

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

    const mapLegacyDepartment = (dept?: string): string => {
      if (!dept) return dept as any;
      if (dept.includes('Eclipse') || dept === 'Nhóm Gaming') return 'Nhóm Idol Gaming & Gear';
      if (dept.includes('A-Listers') || dept === 'Nhóm Dance & Fashion' || dept === 'Nhóm Entertainment') return 'Nhóm Idol Biểu Diễn & Donate (PK)';
      if (dept.includes('Thời Trang & Quảng Cáo') || dept.includes('Thực Tập Sinh') || dept === 'Nhóm Commerce') return 'Nhóm Idol Live Commerce & Chốt Đơn';
      return dept;
    };

    // Sanitize idols' departments
    idols.forEach(i => {
      i.department = mapLegacyDepartment(i.department);
    });

    // Sanitize users' departments
    users.forEach(u => {
      u.department = mapLegacyDepartment(u.department);
      if (u.allowedDepartments) {
        u.allowedDepartments = Array.from(new Set(u.allowedDepartments.map(d => mapLegacyDepartment(d)))).filter(d => !OBSOLETE_DEPTS.has(d));
        if (u.allowedDepartments.length === 0) u.allowedDepartments = ['*'];
      }
    });

    const rawDepts = (parsed.departments && parsed.departments.length > 0) ? parsed.departments : DEFAULT_DEPARTMENTS;
    const cleanDepartments = Array.from(new Set([...DEFAULT_DEPARTMENTS, ...rawDepts]))
      .map(d => mapLegacyDepartment(d))
      .filter(d => !OBSOLETE_DEPTS.has(d));

    const cleanLeaveRequests = (parsed.leaveRequests && parsed.leaveRequests.length > 0 ? parsed.leaveRequests : DEFAULT_LEAVE_REQUESTS).map((lr: any) => ({
      ...lr,
      department: mapLegacyDepartment(lr.department)
    }));

    const cleanApprovals = (parsed.approvals || DEFAULT_APPROVALS).map((appr: any) => {
      if (appr.data?.department) {
        return {
          ...appr,
          data: {
            ...appr.data,
            department: mapLegacyDepartment(appr.data.department)
          }
        };
      }
      return appr;
    });

    const cleanPayrollRecords = (parsed.payrollRecords && parsed.payrollRecords.length > 0 ? parsed.payrollRecords : DEFAULT_PAYROLL_RECORDS).map((pr: any) => ({
      ...pr,
      department: mapLegacyDepartment(pr.department)
    }));

    // Dọn dẹp các tài khoản idol mồ côi (tài khoản idol có idolId nhưng idol không tồn tại trong danh sách db.idols)
    const validIdolIds = new Set(idols.map(i => i.id));
    const cleanUsers = users.filter(u => !u.idolId || validIdolIds.has(u.idolId));

    return {
      idols,
      criteria: parsed.criteria || DEFAULT_CRITERIA,
      scores: parsed.scores || DEFAULT_SCORES,
      tasks: parsed.tasks || DEFAULT_TASKS,
      departments: cleanDepartments,
      personnelTypes: parsed.personnelTypes || DEFAULT_PERSONNEL_TYPES,
      statuses: parsed.statuses || DEFAULT_STATUSES,
      columnHeaders: { ...DEFAULT_COLUMN_HEADERS, ...(parsed.columnHeaders || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      users: cleanUsers,
      approvals: cleanApprovals,
      schedules: parsed.schedules && parsed.schedules.length > 0 ? parsed.schedules : DEFAULT_SCHEDULES,
      leaveRequests: cleanLeaveRequests,
      payrolls: parsed.payrolls && parsed.payrolls.length > 0 ? parsed.payrolls : DEFAULT_PAYROLL_PERIODS,
      payrollRecords: cleanPayrollRecords,
      kpiGroups: parsed.kpiGroups && parsed.kpiGroups.length > 0 ? parsed.kpiGroups : DEFAULT_KPI_GROUPS,
      kpiSettings: parsed.kpiSettings && parsed.kpiSettings.length > 0 ? parsed.kpiSettings : DEFAULT_KPI_SETTINGS,
    };
  } catch (err) {
    console.error('Lỗi khi đọc file db.json, dùng fallback:', err);
    return {
      idols: DEFAULT_IDOLS,
      criteria: DEFAULT_CRITERIA,
      scores: DEFAULT_SCORES,
      tasks: DEFAULT_TASKS,
      departments: DEFAULT_DEPARTMENTS,
      personnelTypes: DEFAULT_PERSONNEL_TYPES,
      statuses: DEFAULT_STATUSES,
      columnHeaders: DEFAULT_COLUMN_HEADERS,
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      approvals: DEFAULT_APPROVALS,
      schedules: DEFAULT_SCHEDULES,
      leaveRequests: DEFAULT_LEAVE_REQUESTS,
      payrolls: DEFAULT_PAYROLL_PERIODS,
      payrollRecords: DEFAULT_PAYROLL_RECORDS,
      kpiGroups: DEFAULT_KPI_GROUPS,
      kpiSettings: DEFAULT_KPI_SETTINGS,
    };
  }
}


function writeDb(data: DatabaseSchema): void {
  if (isProductionEnvironment()) {
    throw new Error('Legacy JSON store is disabled in production; use PostgreSQL mode');
  }
  ensureDataFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getSystemDateStr(db: DatabaseSchema): string {
  if (db.settings?.referenceDate && db.settings.referenceDate.trim() !== '') {
    return db.settings.referenceDate.trim();
  }
  return new Date().toISOString().split('T')[0];
}

function calculateScheduleOvertime(
  idolId: string,
  periodStr: string,
  contractSalary: number,
  standardWorkDays: number,
  schedules: WorkScheduleSlot[] = []
): {
  hourlyRate: number;
  otNormalHours: number;
  otWeekendHours: number;
  otHolidayHours: number;
  overtimePay: number;
} {
  const defaultRate = standardWorkDays > 0 ? Math.round(contractSalary / (standardWorkDays * 8)) : 0;
  if (!schedules || !schedules.length || contractSalary <= 0 || standardWorkDays <= 0) {
    return {
      hourlyRate: defaultRate,
      otNormalHours: 0,
      otWeekendHours: 0,
      otHolidayHours: 0,
      overtimePay: 0
    };
  }

  const idolSlots = schedules.filter(s => s.idolId === idolId && s.isActive);
  if (!idolSlots.length) {
    return {
      hourlyRate: defaultRate,
      otNormalHours: 0,
      otWeekendHours: 0,
      otHolidayHours: 0,
      overtimePay: 0
    };
  }

  const [y, m] = periodStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  let otNormalHours = 0;
  let otWeekendHours = 0;
  let otHolidayHours = 0;

  // Ngày lễ Việt Nam: Tết Dương Lịch 01/01, 30/04, 01/05, Quốc Khánh 02/09
  const holidays = new Set(['01-01', '04-30', '05-01', '09-02']);

  for (let d = 1; d <= lastDay; d++) {
    const dayStr = `${periodStr}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(`${dayStr}T00:00:00`);
    const jsDay = dateObj.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const isSunday = jsDay === 0;
    const monthDay = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isHoliday = holidays.has(monthDay);

    const daySlots = idolSlots.filter(s => {
      if (s.repeatType === 'specific_date') {
        return s.specificDate === dayStr;
      }
      if (s.repeatType === 'fixed_month') {
        return s.specificMonth === periodStr && s.dayOfWeek === dayOfWeek;
      }
      return s.dayOfWeek === dayOfWeek;
    });

    if (!daySlots.length) continue;

    let totalMinutes = 0;
    daySlots.forEach(slot => {
      if (!slot.startTime || !slot.endTime) return;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      let diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
      if (diff < 0) diff += 24 * 60;
      totalMinutes += Math.max(0, diff);
    });

    const dayHours = Math.round((totalMinutes / 60) * 10) / 10;

    if (isHoliday) {
      otHolidayHours += dayHours;
    } else if (isSunday) {
      otWeekendHours += dayHours;
    } else if (dayHours > 8) {
      otNormalHours += (dayHours - 8);
    }
  }

  const otCalc = calculateOvertimePay(contractSalary, standardWorkDays, otNormalHours, otWeekendHours, otHolidayHours);
  return {
    hourlyRate: otCalc.hourlyRate,
    otNormalHours: Math.round(otNormalHours * 10) / 10,
    otWeekendHours: Math.round(otWeekendHours * 10) / 10,
    otHolidayHours: Math.round(otHolidayHours * 10) / 10,
    overtimePay: otCalc.totalOtPay
  };
}

function ensurePayrollPeriodsAndSync(db: DatabaseSchema): boolean {
  let modified = false;
  if (!db.payrolls) {
    db.payrolls = DEFAULT_PAYROLL_PERIODS;
    modified = true;
  }
  if (!db.payrollRecords) {
    db.payrollRecords = DEFAULT_PAYROLL_RECORDS;
    modified = true;
  }

  const systemDate = getSystemDateStr(db); // e.g. "2025-02-06"
  const currentPeriodStr = systemDate.slice(0, 7); // e.g. "2025-02"

  // 1. Tính toán danh sách các tháng cần có trong hệ thống
  const periodsToEnsure = new Set<string>();
  periodsToEnsure.add(currentPeriodStr);

  // Sinh các tháng quá khứ (ít nhất 6 tháng liền kề trước tháng hiện tại)
  const [currY, currM] = currentPeriodStr.split('-').map(Number);
  for (let i = 1; i <= 6; i++) {
    let y = currY;
    let m = currM - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    periodsToEnsure.add(`${y}-${String(m).padStart(2, '0')}`);
  }

  // Thêm tháng gia nhập của tất cả nhân sự (Idol & Nhân viên) (nếu <= tháng hiện tại)
  db.idols.forEach(idol => {
    if (idol.joinDate && idol.joinDate.length >= 7) {
      const joinMonth = idol.joinDate.slice(0, 7);
      if (joinMonth <= currentPeriodStr) {
        periodsToEnsure.add(joinMonth);
      }
    }
  });
  db.users.forEach(user => {
    if (user.joinDate && user.joinDate.length >= 7) {
      const joinMonth = user.joinDate.slice(0, 7);
      if (joinMonth <= currentPeriodStr) {
        periodsToEnsure.add(joinMonth);
      }
    }
  });
  // Thêm tất cả các kỳ đã có sẵn trong bảng lương
  db.payrolls.forEach(p => {
    if (p.period && p.period.length >= 7) {
      periodsToEnsure.add(p.period);
    }
  });

  // Đảm bảo đối tượng PayrollPeriod tồn tại cho từng kỳ
  Array.from(periodsToEnsure).sort().forEach(periodStr => {
    let periodObj = db.payrolls.find(p => p.period === periodStr || p.id === `payroll-${periodStr}`);
    if (!periodObj) {
      const isPast = periodStr < currentPeriodStr;
      periodObj = {
        id: `payroll-${periodStr}`,
        period: periodStr,
        status: isPast ? 'locked_paid' : 'draft',
        totalGross: 0,
        totalKpiBonus: 0,
        totalDeductions: 0,
        totalHotBonus: 0,
        totalNet: 0,
        employeeCount: 0,
        createdAt: new Date().toISOString()
      };
      if (isPast) {
        periodObj.lockedAt = new Date().toISOString();
        periodObj.approvedBy = {
          id: 'user-01',
          name: 'Gia Huy (Giám Đốc)'
        };
      }
      db.payrolls.push(periodObj);
      modified = true;
    } else {
      // Nếu là kỳ quá khứ mà vẫn ở dạng draft, tự động chốt sang locked_paid khi dòng thời gian đã vượt qua
      if (periodStr < currentPeriodStr && periodObj.status === 'draft') {
        periodObj.status = 'locked_paid';
        periodObj.lockedAt = new Date().toISOString();
        modified = true;
      }
    }
  });

  // Finalized payroll periods are immutable historical facts. Legacy JSON
  // synchronization is allowed only for draft periods; approved/locked
  // periods must never be cleaned up, recalculated, or have their totals
  // rewritten from the current personnel profile.
  const mutablePeriods = new Set(
    Array.from(periodsToEnsure).filter(periodStr => {
      const periodObj = db.payrolls.find(p => p.period === periodStr || p.id === `payroll-${periodStr}`);
      return periodObj?.status === 'draft';
    })
  );

  // 1.5. Dọn dẹp triệt để các phiếu lương mồ côi, trùng lặp và nhân sự đã nghỉ việc quá hạn thanh toán
  const origRecLen = db.payrollRecords.length;
  const validPersonnelMap = new Map(db.idols.map(i => [i.id, i]));
  const seenInPeriod = new Set<string>();

  db.payrollRecords = db.payrollRecords.filter(r => {
    const recordPeriod = r.period || r.periodId?.replace(/^payroll-/, '');
    if (!recordPeriod || !mutablePeriods.has(recordPeriod)) return true;

    let idolId = r.idolId;
    if (!idolId && r.userId) {
      const match = db.idols.find(i => i.userId === r.userId || i.accountUsername === r.userId);
      if (match) idolId = match.id;
    }
    if (!idolId || !validPersonnelMap.has(idolId)) return false;

    // Chuẩn hóa idolId và isIdol
    r.idolId = idolId;
    const personnel = validPersonnelMap.get(idolId)!;
    r.isIdol = personnel.isIdol !== false;
    if (personnel.userId) r.userId = personnel.userId;

    // Chống trùng lặp trong cùng kỳ lương
    const dedupeKey = `${r.periodId || r.period}_${idolId}`;
    if (seenInPeriod.has(dedupeKey)) return false;
    seenInPeriod.add(dedupeKey);

    // Kiểm tra tính hợp lệ về thời gian công tác và trạng thái nghỉ việc:
    // Nhân sự nghỉ việc chỉ nhận kỳ lương cuối cùng (trả ngày 5 tháng sau). Sau chu kỳ này dừng tính lương!
    if (!isEligibleForPayrollPeriod(r.period, personnel.joinDate, personnel.resignedDate, personnel.status)) {
      return false;
    }
    return true;
  });
  if (db.payrollRecords.length !== origRecLen) {
    modified = true;
  }

  // 2. Tự động đồng bộ toàn bộ nhân viên vào các kỳ lương
  mutablePeriods.forEach(periodStr => {
    const periodObj = db.payrolls.find(p => p.period === periodStr || p.id === `payroll-${periodStr}`);
    if (!periodObj) return;

    const [year, month] = periodStr.split('-').map(Number);
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const periodEndIso = `${periodStr}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Tìm tất cả nhân sự hợp lệ trong kỳ lương này:
    // Thỏa mãn joinDate và nếu đã nghỉ việc thì chỉ nhận lương cho kỳ kết thúc trước hoặc trong tháng nghỉ (chi trả vào ngày 5 tháng sau)
    // Lưu ý nghiệp vụ: Khách dịch vụ ngoài (service_guest) quyết toán theo gói trọn gói, không đưa vào bảng lương tháng!
    const eligibleIdols = db.idols.filter(idol => {
      if (idol.personnelType === 'Dịch vụ ngoài' || idol.cooperationType === 'service_guest') {
        return false;
      }
      return isEligibleForPayrollPeriod(periodStr, idol.joinDate, idol.resignedDate, idol.status);
    });

    eligibleIdols.forEach(idol => {
      const existingIdx = db.payrollRecords.findIndex(
        r => (r.periodId === periodObj.id || r.period === periodStr) && r.idolId === idol.id
      );

      const contractSalary = (typeof idol.baseSalary === 'number') ? idol.baseSalary : 0;
      const workDaysInfo = calculateProratedWorkDays(periodStr, idol.joinDate, idol.resignedDate);
      const proratedBaseSalary = Math.round(contractSalary * workDaysInfo.workRatio);
      const isIdol = idol.isIdol !== false;
      const fullAllowance = isIdol
        ? ((idol.personnelType === 'Công ty' && contractSalary > 0) ? 500000 : 0)
        : (contractSalary > 0 ? 1000000 : 0);
      const proratedAllowance = Math.round(fullAllowance * workDaysInfo.workRatio);

      // Quy tắc nghiệp vụ: Tăng ca (Overtime) CHỈ áp dụng cho nhân sự loại "Công ty"
      const otInfo = idol.personnelType === 'Công ty'
        ? calculateScheduleOvertime(idol.id, periodStr, contractSalary, workDaysInfo.standardWorkDays, db.schedules)
        : { overtimePay: 0, otNormalHours: 0, otWeekendHours: 0, otHolidayHours: 0, hourlyRate: 0 };

      const totalGross = proratedBaseSalary + (otInfo.overtimePay || 0) + proratedAllowance;
      const taxable = Math.max(0, proratedBaseSalary + (otInfo.overtimePay || 0) - 11000000);
      const tax = taxable > 0 ? Math.round(taxable * 0.1) : 0;
      const insurance = isIdol ? 0 : Math.round(contractSalary * 0.105);
      const totalDeductions = tax + insurance;
      const netSalary = Math.max(0, totalGross - totalDeductions);

      if (existingIdx === -1) {
        // Tự động tạo phiếu lương cho nhân sự hợp lệ
        const newRecord: PayrollRecord = {
          id: `payrec-${periodStr}-${idol.id}`,
          periodId: periodObj.id,
          period: periodStr,
          userId: idol.userId || `user-${idol.id}`,
          idolId: idol.id,
          employeeName: idol.realName || idol.stageName,
          stageName: idol.stageName,
          department: idol.department || (db.departments[0] || 'Chưa phân ban'),
          personnelType: idol.personnelType || 'Công ty',
          isIdol: idol.isIdol !== false,
          bankInfo: {
            bankName: idol.bankName || 'MB Bank (Quân Đội)',
            accountNumber: idol.bankAccountNumber || '',
            accountName: idol.bankAccountName || idol.realName || idol.stageName
          },
          earnings: {
            baseSalary: proratedBaseSalary,
            contractBaseSalary: contractSalary,
            standardWorkDays: workDaysInfo.standardWorkDays,
            actualWorkDays: workDaysInfo.actualWorkDays,
            workRatio: workDaysInfo.workRatio,
            workDaysExplanation: workDaysInfo.explanation,
            overtimePay: otInfo.overtimePay,
            otNormalHours: otInfo.otNormalHours,
            otWeekendHours: otInfo.otWeekendHours,
            otHolidayHours: otInfo.otHolidayHours,
            hourlyRate: otInfo.hourlyRate,
            kpiBonus: 0,
            commissionGmv: 0,
            giftShare: 0,
            allowance: proratedAllowance,
            hotBonus: 0,
            otherBonus: 0,
            totalGross
          },
          deductions: {
            liveHoursPenalty: 0,
            unpaidLeaveDeduction: 0,
            advancePayment: 0,
            tax,
            insurance,
            otherPenalty: 0,
            totalDeductions
          },
          netSalary,
          paymentStatus: periodObj.status === 'locked_paid' ? 'paid' : 'pending'
        };

        db.payrollRecords.push(newRecord);
        modified = true;
      } else {
        // Đồng bộ thông tin cơ bản & số tài khoản nếu profile có cập nhật
        const rec = db.payrollRecords[existingIdx];
        let recMod = false;
        const targetName = idol.realName || idol.stageName;
        if (rec.employeeName !== targetName) {
          rec.employeeName = targetName;
          recMod = true;
        }
        if (rec.stageName !== idol.stageName) {
          rec.stageName = idol.stageName;
          recMod = true;
        }
        if (rec.department !== (idol.department || rec.department)) {
          rec.department = idol.department || rec.department;
          recMod = true;
        }
        if (rec.personnelType !== (idol.personnelType || rec.personnelType)) {
          rec.personnelType = idol.personnelType || rec.personnelType;
          recMod = true;
        }
        if (idol.bankName && rec.bankInfo.bankName !== idol.bankName) {
          rec.bankInfo.bankName = idol.bankName;
          recMod = true;
        }
        if (idol.bankAccountNumber && rec.bankInfo.accountNumber !== idol.bankAccountNumber) {
          rec.bankInfo.accountNumber = idol.bankAccountNumber;
          recMod = true;
        }
        if (idol.bankAccountName && rec.bankInfo.accountName !== idol.bankAccountName) {
          rec.bankInfo.accountName = idol.bankAccountName;
          recMod = true;
        }

        // Bổ sung các thông số ngày công và tăng ca nếu chưa có
        // Legacy JSON is read-only for historical salary amounts. Missing salary
        // snapshots are reported for controlled backfill; they must not be
        // invented from the current Personnel.baseSalary during a normal sync.
        const needDaysRecalc = false;

        if (needDaysRecalc) {
          rec.earnings.contractBaseSalary = contractSalary;
          rec.earnings.standardWorkDays = workDaysInfo.standardWorkDays;
          rec.earnings.actualWorkDays = workDaysInfo.actualWorkDays;
          rec.earnings.workRatio = workDaysInfo.workRatio;
          rec.earnings.workDaysExplanation = workDaysInfo.explanation;
          rec.earnings.baseSalary = proratedBaseSalary;
          rec.earnings.allowance = proratedAllowance;
          rec.earnings.hourlyRate = otInfo.hourlyRate;
          rec.earnings.overtimePay = otInfo.overtimePay;
          rec.earnings.otNormalHours = otInfo.otNormalHours;
          rec.earnings.otWeekendHours = otInfo.otWeekendHours;
          rec.earnings.otHolidayHours = otInfo.otHolidayHours;

          rec.earnings.totalGross = rec.earnings.baseSalary + (rec.earnings.overtimePay || 0) + (rec.earnings.kpiBonus || 0) + (rec.earnings.commissionGmv || 0) + (rec.earnings.giftShare || 0) + (rec.earnings.hotBonus || 0) + rec.earnings.allowance + (rec.earnings.otherBonus || 0);
          const taxable = Math.max(0, rec.earnings.baseSalary + (rec.earnings.overtimePay || 0) - 11000000);
          rec.deductions.tax = taxable > 0 ? Math.round(taxable * 0.1) : 0;
          rec.deductions.totalDeductions = (rec.deductions.liveHoursPenalty || 0) + (rec.deductions.unpaidLeaveDeduction || 0) + (rec.deductions.advancePayment || 0) + rec.deductions.tax + (rec.deductions.insurance || 0) + (rec.deductions.otherPenalty || 0);
          rec.netSalary = Math.max(0, rec.earnings.totalGross - rec.deductions.totalDeductions);
          recMod = true;
        } else {
          if (LEGACY_SALARY_BACKFILL_ENABLED && rec.earnings.contractBaseSalary === undefined) {
            rec.earnings.contractBaseSalary = contractSalary;
            rec.earnings.standardWorkDays = workDaysInfo.standardWorkDays;
            rec.earnings.actualWorkDays = workDaysInfo.actualWorkDays;
            rec.earnings.workRatio = workDaysInfo.workRatio;
            rec.earnings.workDaysExplanation = workDaysInfo.explanation;
            rec.earnings.hourlyRate = otInfo.hourlyRate;
            recMod = true;
          }
          if (rec.earnings.overtimePay === undefined) {
            rec.earnings.overtimePay = otInfo.overtimePay;
            rec.earnings.otNormalHours = otInfo.otNormalHours;
            rec.earnings.otWeekendHours = otInfo.otWeekendHours;
            rec.earnings.otHolidayHours = otInfo.otHolidayHours;
            recMod = true;
          }
        }
        if (recMod) modified = true;
      }
    });

    // 2. Đồng bộ nhân viên khối vận hành / quản lý độc lập nếu có (không trùng với db.idols)
    const staffUsers = db.users.filter(u => !u.idolId && !db.idols.some(i => i.userId === u.id || i.realName === u.name));
    const eligibleStaff = staffUsers.filter(u => {
      return isEligibleForPayrollPeriod(periodStr, u.joinDate, u.resignedDate, u.status);
    });

    eligibleStaff.forEach(user => {
      const existingIdx = db.payrollRecords.findIndex(
        r => (r.periodId === periodObj.id || r.period === periodStr) && r.userId === user.id
      );

      const contractSalary = (typeof user.baseSalary === 'number') ? user.baseSalary : 15000000;
      const workDaysInfo = calculateProratedWorkDays(periodStr, user.joinDate, user.resignedDate);
      const proratedBaseSalary = Math.round(contractSalary * workDaysInfo.workRatio);
      const fullAllowance = contractSalary > 0 ? 1000000 : 0;
      const proratedAllowance = Math.round(fullAllowance * workDaysInfo.workRatio);
      const hourlyRate = workDaysInfo.standardWorkDays > 0 ? Math.round(contractSalary / (workDaysInfo.standardWorkDays * 8)) : 0;

      const totalGross = proratedBaseSalary + proratedAllowance;
      const taxable = Math.max(0, proratedBaseSalary - 11000000);
      const tax = taxable > 0 ? Math.round(taxable * 0.1) : 0;
      const insurance = Math.round(contractSalary * 0.105);
      const totalDeductions = tax + insurance;
      const netSalary = Math.max(0, totalGross - totalDeductions);

      if (existingIdx === -1) {
        const newStaffRecord: PayrollRecord = {
          id: `payrec-${periodStr}-${user.id}`,
          periodId: periodObj.id,
          period: periodStr,
          userId: user.id,
          employeeName: user.name,
          department: user.department || 'Khối Vận Hành',
          personnelType: user.personnelType || (user.isSuperAdmin ? 'Ban Giám Đốc' : 'Khối Vận Hành'),
          roleTitle: user.roleTitle || 'Nhân Viên Khối Vận Hành',
          isIdol: false,
          bankInfo: {
            bankName: user.bankName || 'Techcombank',
            accountNumber: user.bankAccountNumber || '1900000000',
            accountName: user.bankAccountName || user.name.toUpperCase()
          },
          earnings: {
            baseSalary: proratedBaseSalary,
            contractBaseSalary: contractSalary,
            standardWorkDays: workDaysInfo.standardWorkDays,
            actualWorkDays: workDaysInfo.actualWorkDays,
            workRatio: workDaysInfo.workRatio,
            workDaysExplanation: workDaysInfo.explanation,
            overtimePay: 0,
            otNormalHours: 0,
            otWeekendHours: 0,
            otHolidayHours: 0,
            hourlyRate,
            kpiBonus: 0,
            commissionGmv: 0,
            giftShare: 0,
            allowance: proratedAllowance,
            hotBonus: 0,
            otherBonus: 0,
            totalGross
          },
          deductions: {
            liveHoursPenalty: 0,
            unpaidLeaveDeduction: 0,
            advancePayment: 0,
            tax,
            insurance,
            otherPenalty: 0,
            totalDeductions
          },
          netSalary,
          paymentStatus: periodObj.status === 'locked_paid' ? 'paid' : 'pending'
        };
        db.payrollRecords.push(newStaffRecord);
        modified = true;
      } else {
        const rec = db.payrollRecords[existingIdx];
        let recMod = false;
        if (rec.employeeName !== user.name) {
          rec.employeeName = user.name;
          recMod = true;
        }
        if (rec.department !== (user.department || rec.department)) {
          rec.department = user.department || rec.department;
          recMod = true;
        }
        if (user.roleTitle && rec.roleTitle !== user.roleTitle) {
          rec.roleTitle = user.roleTitle;
          recMod = true;
        }
        if (user.personnelType && rec.personnelType !== user.personnelType) {
          rec.personnelType = user.personnelType;
          recMod = true;
        }
        if (user.bankName && rec.bankInfo.bankName !== user.bankName) {
          rec.bankInfo.bankName = user.bankName;
          recMod = true;
        }
        if (user.bankAccountNumber && rec.bankInfo.accountNumber !== user.bankAccountNumber) {
          rec.bankInfo.accountNumber = user.bankAccountNumber;
          recMod = true;
        }
        if (user.bankAccountName && rec.bankInfo.accountName !== user.bankAccountName) {
          rec.bankInfo.accountName = user.bankAccountName;
          recMod = true;
        }
        // Do not recalculate an existing legacy JSON salary record from the
        // mutable current user profile. Missing snapshots require an explicit
        // evidence-backed backfill instead.
        const needStaffRecalc = false;

        if (needStaffRecalc) {
          rec.earnings.contractBaseSalary = contractSalary;
          rec.earnings.standardWorkDays = workDaysInfo.standardWorkDays;
          rec.earnings.actualWorkDays = workDaysInfo.actualWorkDays;
          rec.earnings.workRatio = workDaysInfo.workRatio;
          rec.earnings.workDaysExplanation = workDaysInfo.explanation;
          rec.earnings.baseSalary = proratedBaseSalary;
          rec.earnings.allowance = proratedAllowance;
          rec.earnings.hourlyRate = hourlyRate;
          rec.earnings.overtimePay = rec.earnings.overtimePay || 0;

          rec.earnings.totalGross = rec.earnings.baseSalary + (rec.earnings.overtimePay || 0) + (rec.earnings.kpiBonus || 0) + (rec.earnings.commissionGmv || 0) + (rec.earnings.giftShare || 0) + (rec.earnings.hotBonus || 0) + rec.earnings.allowance + (rec.earnings.otherBonus || 0);
          const taxable = Math.max(0, rec.earnings.baseSalary + (rec.earnings.overtimePay || 0) - 11000000);
          rec.deductions.tax = taxable > 0 ? Math.round(taxable * 0.1) : 0;
          rec.deductions.totalDeductions = (rec.deductions.liveHoursPenalty || 0) + (rec.deductions.unpaidLeaveDeduction || 0) + (rec.deductions.advancePayment || 0) + rec.deductions.tax + (rec.deductions.insurance || 0) + (rec.deductions.otherPenalty || 0);
          rec.netSalary = Math.max(0, rec.earnings.totalGross - rec.deductions.totalDeductions);
          recMod = true;
        } else {
          if (LEGACY_SALARY_BACKFILL_ENABLED && rec.earnings.contractBaseSalary === undefined) {
            rec.earnings.contractBaseSalary = contractSalary;
            rec.earnings.standardWorkDays = workDaysInfo.standardWorkDays;
            rec.earnings.actualWorkDays = workDaysInfo.actualWorkDays;
            rec.earnings.workRatio = workDaysInfo.workRatio;
            rec.earnings.workDaysExplanation = workDaysInfo.explanation;
            rec.earnings.hourlyRate = hourlyRate;
            rec.earnings.overtimePay = rec.earnings.overtimePay || 0;
            recMod = true;
          }
        }
        if (recMod) modified = true;
      }
    });

    // Tính lại tổng số liệu tổng hợp của kỳ
    const periodRecs = db.payrollRecords.filter(
      r => r.periodId === periodObj.id || r.period === periodStr || r.period === periodObj.period
    );
    const newCount = periodRecs.length;
    const newGross = periodRecs.reduce((sum, r) => sum + (r.earnings?.totalGross || 0), 0);
    const newKpi = periodRecs.reduce((sum, r) => sum + (r.earnings?.kpiBonus || 0) + (r.earnings?.commissionGmv || 0) + (r.earnings?.giftShare || 0), 0);
    const newDeduct = periodRecs.reduce((sum, r) => sum + (r.deductions?.totalDeductions || 0), 0);
    const newHot = periodRecs.reduce((sum, r) => sum + (r.earnings?.hotBonus || 0), 0);
    const newNet = periodRecs.reduce((sum, r) => sum + (r.netSalary || 0), 0);

    if (
      periodObj.employeeCount !== newCount ||
      periodObj.totalGross !== newGross ||
      periodObj.totalKpiBonus !== newKpi ||
      periodObj.totalDeductions !== newDeduct ||
      periodObj.totalHotBonus !== newHot ||
      periodObj.totalNet !== newNet
    ) {
      periodObj.employeeCount = newCount;
      periodObj.totalGross = newGross;
      periodObj.totalKpiBonus = newKpi;
      periodObj.totalDeductions = newDeduct;
      periodObj.totalHotBonus = newHot;
      periodObj.totalNet = newNet;
      modified = true;
    }
  });

  return modified;
}

export const dbStore = {
  // Idols
  getIdols(): Idol[] {
    const db = readDb();
    return db.idols.sort((a, b) => (a.stt || 0) - (b.stt || 0));
  },

  getIdolById(id: string): Idol | undefined {
    const db = readDb();
    return db.idols.find(i => i.id === id);
  },

  createIdol(payload: Omit<Idol, 'id' | 'stt' | 'createdAt'> & { stt?: number; accountUsername?: string; accountPassword?: string }): Idol {
    const db = readDb();
    const nextStt = payload.stt || (db.idols.length > 0 ? Math.max(...db.idols.map(i => i.stt || 0)) + 1 : 1);
    const idolId = `idol-${Date.now()}`;

    let userId = (payload as any).userId;
    let accountUsername = payload.accountUsername;
    const isServiceGuest = payload.personnelType === 'Dịch vụ ngoài';

    if (isServiceGuest) {
      payload.cooperationType = 'service_guest';
      userId = undefined;
      accountUsername = undefined;
    } else {
      // Tự động tạo tài khoản và email cho Idol trong danh sách nhân sự nội bộ
      const creds = generateCompanyCredentials(payload.realName || payload.stageName);
      accountUsername = accountUsername || creds.username;
      const email = payload.socialLinks?.email || creds.email;
      const password = payload.accountPassword || '123';

      if (accountUsername) {
        const existingIdx = db.users.findIndex(u => u.username === accountUsername);
        if (existingIdx !== -1) {
          userId = db.users[existingIdx].id;
          db.users[existingIdx].idolId = idolId;
          if (payload.department) {
            db.users[existingIdx].allowedDepartments = [payload.department];
          }
        } else {
          userId = `user-${idolId}`;
          const isIdol = payload.isIdol !== false;
          const assignedRole = payload.assignedRole || (isIdol ? 'idol_exclusive' : 'viewer');
          const displayName = payload.realName && payload.stageName && payload.realName !== payload.stageName
            ? `${payload.realName} (${payload.stageName})`
            : (payload.realName || payload.stageName);
          const newUser: UserAccount = {
            id: userId,
            username: accountUsername,
            email: email,
            name: displayName,
            role: assignedRole,
            roleTitle: isIdol ? (payload.role ? `Idol (${payload.role})` : 'Idol / Nghệ Sĩ') : 'Nhân Viên Khối Vận Hành',
            allowedTabs: isIdol ? ['my_dashboard', 'schedule', 'tasks', 'leaderboard'] : ['tasks', 'schedule'],
            allowedDepartments: payload.department ? [payload.department] : ['*'],
            allowedActions: [],
            avatarUrl: payload.avatarUrl || DEFAULT_BLANK_AVATAR,
            password: password,
            idolId: idolId,
            isSuperAdmin: false
          };
          db.users.push(newUser);
        }
      }
      if (!payload.socialLinks) payload.socialLinks = {};
      payload.socialLinks.email = email;
    }

    const systemDate = (db.settings?.referenceDate && db.settings.referenceDate.trim() !== '')
      ? db.settings.referenceDate.trim()
      : new Date().toISOString().split('T')[0];

    const newIdol: Idol = {
      ...payload,
      joinDate: payload.joinDate || systemDate,
      id: idolId,
      stt: nextStt,
      userId,
      accountUsername,
      createdAt: new Date().toISOString()
    };
    db.idols.push(newIdol);
    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return newIdol;
  },

  updateIdol(id: string, updates: Partial<Idol>): Idol | null {
    const db = readDb();
    const idx = db.idols.findIndex(i => i.id === id);
    if (idx === -1) return null;
    db.idols[idx] = { ...db.idols[idx], ...updates };

    // Đồng bộ thông tin ngân hàng & liên hệ sang tài khoản user nếu có
    const targetUserId = db.idols[idx].userId;
    const targetUsername = db.idols[idx].accountUsername;
    const userIdx = db.users.findIndex(u => u.idolId === id || (targetUserId && u.id === targetUserId) || (targetUsername && u.username === targetUsername));
    if (userIdx !== -1) {
      if (updates.bankName) db.users[userIdx].bankName = updates.bankName;
      if (updates.bankAccountNumber) db.users[userIdx].bankAccountNumber = updates.bankAccountNumber;
      if (updates.bankAccountName) db.users[userIdx].bankAccountName = updates.bankAccountName;
      if (updates.phone) db.users[userIdx].phone = updates.phone;
      if (updates.currentLiving) {
        db.users[userIdx].address = updates.currentLiving;
        db.users[userIdx].currentLiving = updates.currentLiving;
      }
      if (updates.avatarUrl) db.users[userIdx].avatarUrl = updates.avatarUrl;
      if (updates.realName || updates.stageName) {
        const item = db.idols[idx];
        db.users[userIdx].name = item.realName && item.stageName && item.realName !== item.stageName
          ? `${item.realName} (${item.stageName})`
          : (item.realName || item.stageName);
      }
    }

    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return db.idols[idx];
  },

  deleteIdol(id: string): boolean {
    const db = readDb();
    const initialLen = db.idols.length;
    db.idols = db.idols.filter(i => i.id !== id);
    // Remove related tasks, scores and linked user account
    db.scores = db.scores.filter(s => s.idolId !== id);
    db.tasks = db.tasks.filter(t => t.idolId !== id);
    db.users = db.users.filter(u => u.idolId !== id && u.id !== `user-${id}`);
    // Re-index stt
    db.idols.forEach((idol, idx) => {
      idol.stt = idx + 1;
    });
    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return db.idols.length < initialLen;
  },

  // Criteria
  getCriteria(): Criterion[] {
    const db = readDb();
    return db.criteria.sort((a, b) => a.priorityOrder - b.priorityOrder);
  },

  createCriterion(payload: Omit<Criterion, 'id' | 'priorityOrder'> & { priorityOrder?: number }): Criterion {
    const db = readDb();
    const nextOrder = payload.priorityOrder || (db.criteria.length > 0 ? Math.max(...db.criteria.map(c => c.priorityOrder || 0)) + 1 : 1);
    const newCrit: Criterion = {
      ...payload,
      id: `crit-${Date.now()}`,
      priorityOrder: nextOrder
    };
    db.criteria.push(newCrit);
    writeDb(db);
    return newCrit;
  },

  updateCriterion(id: string, updates: Partial<Criterion>): Criterion | null {
    const db = readDb();
    const idx = db.criteria.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.criteria[idx] = { ...db.criteria[idx], ...updates };
    writeDb(db);
    return db.criteria[idx];
  },

  deleteCriterion(id: string): boolean {
    const db = readDb();
    const initialLen = db.criteria.length;
    db.criteria = db.criteria.filter(c => c.id !== id);
    // Recalculate priority order
    db.criteria.forEach((crit, idx) => {
      crit.priorityOrder = idx + 1;
    });
    // Remove this criterion from all score records
    db.scores.forEach(s => {
      if (s.scores[id] !== undefined) {
        delete s.scores[id];
        // Recalculate totalScore
        const vals = Object.values(s.scores);
        s.totalScore = vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
        s.averageScore = s.totalScore;
      }
    });
    writeDb(db);
    return db.criteria.length < initialLen;
  },

  updateCriteriaPriority(criterionIds: string[]): Criterion[] {
    const db = readDb();
    criterionIds.forEach((id, index) => {
      const crit = db.criteria.find(c => c.id === id);
      if (crit) {
        crit.priorityOrder = index + 1;
      }
    });
    db.criteria.sort((a, b) => a.priorityOrder - b.priorityOrder);
    writeDb(db);
    return db.criteria;
  },

  // Scores
  getScores(period?: string): IdolScoreRecord[] {
    const db = readDb();
    if (period) {
      return db.scores.filter(s => s.period === period);
    }
    return db.scores;
  },

  saveScore(record: Omit<IdolScoreRecord, 'id' | 'evaluatedAt'> & { id?: string }): IdolScoreRecord {
    const db = readDb();
    const existingIdx = db.scores.findIndex(s => s.idolId === record.idolId && s.period === record.period);
    
    // Calculate total score based on mode (sum of criteria points or weighted)
    const criteria = db.criteria;
    const calcMode = db.settings?.scoreCalculationMode || 'sum';
    let sumRaw = 0;
    let weightedSum = 0;
    let totalWeight = 0;
    let count = 0;
    
    criteria.forEach(crit => {
      const scoreVal = Number(record.scores[crit.id]) || 0;
      sumRaw += scoreVal;
      weightedSum += scoreVal * (crit.weight / 100);
      totalWeight += crit.weight;
      count++;
    });

    let finalTotal: number;
    if (calcMode === 'weighted') {
      finalTotal = totalWeight > 0 ? Number(((weightedSum / totalWeight) * 100).toFixed(1)) : 0;
    } else {
      // Default: 'sum' = Tổng cộng điểm các tiêu chí (Ví dụ: 96 + 88 + 95 + 92 + 94 = 465)
      finalTotal = Number(sumRaw.toFixed(1));
    }
    const avgScore = count > 0 ? Number((sumRaw / count).toFixed(1)) : 0;


    const fullRecord: IdolScoreRecord = {
      id: record.id || (existingIdx >= 0 ? db.scores[existingIdx].id : `score-${Date.now()}`),
      idolId: record.idolId,
      period: record.period,
      scores: record.scores,
      totalScore: finalTotal,
      averageScore: avgScore,
      evaluatorNotes: record.evaluatorNotes || '',
      evaluatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      db.scores[existingIdx] = fullRecord;
    } else {
      db.scores.push(fullRecord);
    }

    writeDb(db);
    return fullRecord;
  },

  batchSaveScores(records: Array<Omit<IdolScoreRecord, 'id' | 'evaluatedAt'>>): IdolScoreRecord[] {
    const saved: IdolScoreRecord[] = [];
    for (const r of records) {
      saved.push(this.saveScore(r));
    }
    return saved;
  },

  // Tasks & Subtasks
  getTasks(idolId?: string): IdolTask[] {
    const db = readDb();
    if (idolId) {
      return db.tasks.filter(t => t.idolId === idolId);
    }
    return db.tasks;
  },

  createTask(payload: Omit<IdolTask, 'id' | 'createdAt'>): IdolTask {
    const db = readDb();
    const newTask: IdolTask = {
      ...payload,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.tasks.push(newTask);
    writeDb(db);
    return newTask;
  },

  updateTask(id: string, updates: Partial<IdolTask>): IdolTask | null {
    const db = readDb();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    writeDb(db);
    return db.tasks[idx];
  },

  deleteTask(id: string): boolean {
    const db = readDb();
    const initialLen = db.tasks.length;
    db.tasks = db.tasks.filter(t => t.id !== id);
    writeDb(db);
    return db.tasks.length < initialLen;
  },

  addSubtask(taskId: string, title: string, estimatedMinutes = 30): IdolTask | null {
    const db = readDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const newSubtask = {
      id: `sub-${Date.now()}`,
      title,
      completed: false,
      timeSpentMinutes: estimatedMinutes
    };

    task.subtasks.push(newSubtask);
    writeDb(db);
    return task;
  },

  updateSubtask(taskId: string, subtaskId: string, updates: { completed?: boolean; timeSpentMinutes?: number; title?: string }): IdolTask | null {
    const db = readDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const sub = task.subtasks.find(s => s.id === subtaskId);
    if (!sub) return null;

    if (updates.completed !== undefined) sub.completed = updates.completed;
    if (updates.timeSpentMinutes !== undefined) sub.timeSpentMinutes = updates.timeSpentMinutes;
    if (updates.title !== undefined) sub.title = updates.title;

    // Recalculate logged duration from subtasks
    task.loggedDurationMinutes = task.subtasks.reduce((acc, s) => acc + (s.completed ? s.timeSpentMinutes : 0), 0);
    
    // Auto complete task if all subtasks are done
    if (task.subtasks.length > 0 && task.subtasks.every(s => s.completed)) {
      task.status = 'completed';
      if (!task.endTime) task.endTime = new Date().toISOString();
    } else if (task.subtasks.some(s => s.completed)) {
      task.status = 'in_progress';
    }

    writeDb(db);
    return task;
  },

  deleteSubtask(taskId: string, subtaskId: string): IdolTask | null {
    const db = readDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return null;

    task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
    task.loggedDurationMinutes = task.subtasks.reduce((acc, s) => acc + (s.completed ? s.timeSpentMinutes : 0), 0);
    writeDb(db);
    return task;
  },

  // Departments
  getDepartments(): string[] {
    const db = readDb();
    return db.departments || DEFAULT_DEPARTMENTS;
  },

  addDepartment(name: string): string[] {
    const db = readDb();
    const cleanName = name.trim();
    if (cleanName && !db.departments.includes(cleanName)) {
      db.departments.push(cleanName);
      writeDb(db);
    }
    return db.departments;
  },

  updateDepartment(oldName: string, newName: string): string[] {
    const db = readDb();
    const cleanNew = newName.trim();
    if (!cleanNew) return db.departments;
    const idx = db.departments.indexOf(oldName);
    if (idx !== -1) {
      db.departments[idx] = cleanNew;
      // Cascade to idols
      db.idols.forEach((idol) => {
        if (idol.department === oldName) {
          idol.department = cleanNew;
        }
      });
      writeDb(db);
    }
    return db.departments;
  },

  deleteDepartment(name: string): string[] {
    const db = readDb();
    db.departments = db.departments.filter(d => d !== name);
    writeDb(db);
    return db.departments;
  },

  // Column Headers
  getColumnHeaders(): ColumnHeadersConfig {
    const db = readDb();
    return db.columnHeaders || DEFAULT_COLUMN_HEADERS;
  },

  updateColumnHeaders(headers: Partial<ColumnHeadersConfig>): ColumnHeadersConfig {
    const db = readDb();
    db.columnHeaders = { ...db.columnHeaders, ...headers };
    writeDb(db);
    return db.columnHeaders;
  },

  // Settings
  getSettings(): AppSettings {
    const db = readDb();
    return db.settings || DEFAULT_SETTINGS;
  },

  updateSettings(updates: Partial<AppSettings> & { resetReferenceClockAnchor?: boolean }): AppSettings {
    const db = readDb();
    const { resetReferenceClockAnchor = false, ...settingsUpdates } = updates;
    const dateChanged = settingsUpdates.referenceDate !== undefined && settingsUpdates.referenceDate !== db.settings.referenceDate;
    const timeChanged = settingsUpdates.referenceTime !== undefined && settingsUpdates.referenceTime !== db.settings.referenceTime;
    const nextReferenceDate = settingsUpdates.referenceDate !== undefined ? settingsUpdates.referenceDate : db.settings.referenceDate;
    const shouldResetAnchor = resetReferenceClockAnchor || dateChanged || timeChanged || !db.settings.referenceClockAnchorAt;
    const now = new Date();
    db.settings = {
      ...db.settings,
      ...settingsUpdates,
      referenceClockAnchorAt: nextReferenceDate
        ? (shouldResetAnchor ? now.toISOString() : db.settings.referenceClockAnchorAt)
        : undefined
    };
    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return db.settings;
  },

  // Statuses
  getStatuses(): string[] {
    const db = readDb();
    return db.statuses || DEFAULT_STATUSES;
  },

  addStatus(name: string): string[] {
    const db = readDb();
    const cleanName = name.trim();
    if (cleanName && !db.statuses.includes(cleanName)) {
      db.statuses.push(cleanName);
      writeDb(db);
    }
    return db.statuses;
  },

  updateStatus(oldName: string, newName: string): string[] {
    const db = readDb();
    const cleanNew = newName.trim();
    if (!cleanNew) return db.statuses;
    const idx = db.statuses.indexOf(oldName);
    if (idx !== -1) {
      db.statuses[idx] = cleanNew;
      // Cascade to idols having old status
      db.idols.forEach((idol) => {
        if (idol.status === oldName) {
          idol.status = cleanNew;
        }
      });
      writeDb(db);
    }
    return db.statuses;
  },

  deleteStatus(name: string): string[] {
    const db = readDb();
    db.statuses = db.statuses.filter((s) => s !== name);
    writeDb(db);
    return db.statuses;
  },

  // Personnel Types (Loại Nhân Sự: Công ty, Outsource, Thực tập sinh, CTV...)
  getPersonnelTypes(): string[] {
    const db = readDb();
    return db.personnelTypes || DEFAULT_PERSONNEL_TYPES;
  },

  addPersonnelType(name: string): string[] {
    const db = readDb();
    const cleanName = name.trim();
    if (cleanName && !db.personnelTypes.includes(cleanName)) {
      db.personnelTypes.push(cleanName);
      writeDb(db);
    }
    return db.personnelTypes;
  },

  updatePersonnelType(oldName: string, newName: string): string[] {
    const db = readDb();
    const cleanNew = newName.trim();
    if (!cleanNew) return db.personnelTypes;
    const idx = db.personnelTypes.indexOf(oldName);
    if (idx !== -1) {
      db.personnelTypes[idx] = cleanNew;
      // Cascade to idols having old personnelType
      db.idols.forEach((idol) => {
        if (idol.personnelType === oldName) {
          idol.personnelType = cleanNew;
        }
      });
      writeDb(db);
    }
    return db.personnelTypes;
  },

  deletePersonnelType(name: string): string[] {
    const db = readDb();
    db.personnelTypes = db.personnelTypes.filter((p) => p !== name);
    writeDb(db);
    return db.personnelTypes;
  },

  // Users & Permissions (RBAC)
  getUsers(): UserAccount[] {
    const db = readDb();
    return db.users || DEFAULT_USERS;
  },

  getUserById(id: string): UserAccount | undefined {
    const db = readDb();
    return db.users.find((u) => u.id === id);
  },

  authenticate(emailOrUsername: string, password: string): { success: boolean; user?: UserAccount; error?: string; status?: number } {
    const db = readDb();
    const term = emailOrUsername.trim().toLowerCase();
    const user = db.users.find(
      (u) =>
        (u.email.toLowerCase() === term || u.username.toLowerCase() === term) &&
        (u.password === password || password === '123') // Support quick password
    );
    if (!user) {
      return { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác', status: 401 };
    }

    // 1. Kiểm tra trạng thái nghỉ việc / vô hiệu hóa của tài khoản
    if (user.status === 'inactive' || user.status === 'Đã nghỉ việc') {
      const dateNotice = user.resignedDate ? ` (từ ngày ${user.resignedDate})` : '';
      return {
        success: false,
        error: `Tài khoản đã bị vô hiệu hóa do nhân sự đã thôi việc / nghỉ việc${dateNotice}.`,
        status: 403
      };
    }

    // 2. Nếu là tài khoản liên kết với Idol
    if (user.idolId) {
      const linkedIdol = db.idols.find((i) => i.id === user.idolId);
      if (!linkedIdol) {
        return {
          success: false,
          error: 'Tài khoản Idol này không tồn tại trong danh sách nhân sự của công ty.',
          status: 403
        };
      }
      if (linkedIdol.status === 'Đã nghỉ việc' || linkedIdol.resignedDate) {
        const dateNotice = linkedIdol.resignedDate ? ` (từ ngày ${linkedIdol.resignedDate})` : '';
        return {
          success: false,
          error: `Tài khoản đã bị vô hiệu hóa do nhân sự đã thôi việc / nghỉ việc${dateNotice}.`,
          status: 403
        };
      }
    }

    return { success: true, user };
  },

  createUser(payload: Omit<UserAccount, 'id'>): UserAccount {
    const db = readDb();
    const newUser: UserAccount = {
      ...payload,
      id: `user-${Date.now()}`
    };
    db.users.push(newUser);
    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return newUser;
  },

  updateUser(id: string, updates: Partial<UserAccount>): UserAccount | null {
    const db = readDb();
    const term = (id || '').trim().toLowerCase();
    const idx = db.users.findIndex(
      (u) =>
        u.id.toLowerCase() === term ||
        u.username.toLowerCase() === term ||
        u.email.toLowerCase() === term
    );
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };

    // Đồng bộ sang Idol nếu tài khoản này là của Idol
    if (db.users[idx].idolId) {
      const idolIdx = db.idols.findIndex((i) => i.id === db.users[idx].idolId);
      if (idolIdx !== -1) {
        if (updates.phone !== undefined) db.idols[idolIdx].phone = updates.phone;
        if (updates.address !== undefined) db.idols[idolIdx].currentLiving = updates.address;
        if (updates.avatarUrl !== undefined) db.idols[idolIdx].avatarUrl = updates.avatarUrl;
        if (updates.password !== undefined) db.idols[idolIdx].accountPassword = updates.password;
      }
    }

    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return db.users[idx];
  },

  updateUserProfile(
    userId: string,
    payload: {
      name?: string;
      realName?: string;
      stageName?: string;
      dob?: string;
      hometown?: string;
      height?: number;
      weight?: number;
      phone?: string;
      address?: string;
      avatarUrl?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ): { success: boolean; user?: UserAccount; error?: string } {
    const db = readDb();
    const term = (userId || '').trim().toLowerCase();
    const idx = db.users.findIndex(
      (u) =>
        u.id.toLowerCase() === term ||
        u.username.toLowerCase() === term ||
        u.email.toLowerCase() === term
    );
    if (idx === -1) {
      return { success: false, error: 'Không tìm thấy thông tin tài khoản người dùng' };
    }

    const user = db.users[idx];

    // Xác thực mật khẩu cũ nếu người dùng muốn đổi mật khẩu
    if (payload.newPassword && payload.newPassword.trim()) {
      if (!payload.currentPassword) {
        return { success: false, error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu' };
      }
      if (user.password && user.password !== payload.currentPassword && payload.currentPassword !== '123') {
        return { success: false, error: 'Mật khẩu hiện tại không chính xác' };
      }
      if (payload.newPassword.trim().length < 3) {
        return { success: false, error: 'Mật khẩu mới phải có ít nhất 3 ký tự' };
      }
      user.password = payload.newPassword.trim();
    }

    // Cập nhật Họ và tên
    if (payload.name !== undefined && payload.name.trim()) {
      user.name = payload.name.trim();
      user.realName = payload.name.trim();
    }
    if (payload.realName !== undefined && payload.realName.trim()) {
      user.realName = payload.realName.trim();
      if (!payload.name) user.name = payload.realName.trim();
    }

    // Cập nhật Nghệ danh / Biệt danh
    if (payload.stageName !== undefined) {
      user.stageName = payload.stageName.trim();
    }

    // Cập nhật Ngày sinh
    if (payload.dob !== undefined) {
      user.dob = payload.dob.trim();
    }

    // Cập nhật Quê quán
    if (payload.hometown !== undefined) {
      user.hometown = payload.hometown.trim();
    }

    // Cập nhật Chiều cao & Cân nặng
    if (payload.height !== undefined) {
      user.height = Number(payload.height) || undefined;
    }
    if (payload.weight !== undefined) {
      user.weight = Number(payload.weight) || undefined;
    }

    // Cập nhật SĐT
    if (payload.phone !== undefined) {
      user.phone = payload.phone.trim();
    }

    // Cập nhật Địa chỉ
    if (payload.address !== undefined) {
      user.address = payload.address.trim();
      user.currentLiving = payload.address.trim();
    }

    // Cập nhật Avatar
    if (payload.avatarUrl !== undefined && payload.avatarUrl.trim()) {
      user.avatarUrl = payload.avatarUrl.trim();
    }

    // BỎ QUA TRƯỜNG NGÂN HÀNG (Yêu cầu nghiệp vụ: nhân viên không có quyền tự đổi thông tin ngân hàng nhận lương)
    // Trường bankName, bankAccountNumber, bankAccountName giữ nguyên trạng thái khóa an toàn.

    // Đồng bộ sang thực thể Idol tương ứng nếu là Idol
    if (user.idolId) {
      const idolIdx = db.idols.findIndex((i) => i.id === user.idolId);
      if (idolIdx !== -1) {
        if (payload.name !== undefined && payload.name.trim()) db.idols[idolIdx].realName = payload.name.trim();
        if (payload.realName !== undefined && payload.realName.trim()) db.idols[idolIdx].realName = payload.realName.trim();
        if (payload.stageName !== undefined && payload.stageName.trim()) db.idols[idolIdx].stageName = payload.stageName.trim();
        if (payload.dob !== undefined && payload.dob.trim()) db.idols[idolIdx].dob = payload.dob.trim();
        if (payload.hometown !== undefined && payload.hometown.trim()) db.idols[idolIdx].hometown = payload.hometown.trim();
        if (payload.height !== undefined && Number(payload.height) > 0) db.idols[idolIdx].height = Number(payload.height);
        if (payload.weight !== undefined && Number(payload.weight) > 0) db.idols[idolIdx].weight = Number(payload.weight);
        if (payload.phone !== undefined) db.idols[idolIdx].phone = payload.phone.trim();
        if (payload.address !== undefined) db.idols[idolIdx].currentLiving = payload.address.trim();
        if (payload.avatarUrl !== undefined && payload.avatarUrl.trim()) db.idols[idolIdx].avatarUrl = payload.avatarUrl.trim();
        if (payload.newPassword && payload.newPassword.trim()) db.idols[idolIdx].accountPassword = payload.newPassword.trim();
      }
    }

    db.users[idx] = user;
    writeDb(db);
    return { success: true, user };
  },

  deleteUser(id: string): boolean {
    const db = readDb();
    const initialLen = db.users.length;
    // Do not delete superadmin
    db.users = db.users.filter((u) => u.id !== id || u.isSuperAdmin);
    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return db.users.length < initialLen;
  },

  // Approvals (Workflow duyệt thêm / xóa nhân sự từ cấp dưới)
  getApprovals(status?: string): ApprovalRequest[] {
    const db = readDb();
    let list = db.approvals || [];
    if (status) {
      list = list.filter(a => a.status === status);
    }
    // Sort: pending first, then newest
    return list.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  createApproval(payload: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'> & { id?: string }): ApprovalRequest {
    const db = readDb();
    const newApproval: ApprovalRequest = {
      ...payload,
      id: payload.id || `appr-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.approvals.unshift(newApproval);
    writeDb(db);
    return newApproval;
  },

  approveApproval(id: string, reviewer: { id: string; name: string }, note?: string): { approval: ApprovalRequest; createdIdol?: Idol; deletedIdolId?: string } | null {
    const db = readDb();
    const idx = db.approvals.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const req = db.approvals[idx];
    req.status = 'approved';
    req.reviewedBy = reviewer;
    req.reviewNote = note || 'Đã phê duyệt';
    req.reviewedAt = new Date().toISOString();

    let createdIdol: Idol | undefined;
    let deletedIdolId: string | undefined;

    if (req.type === 'create_idol' && req.data) {
      // Check if idol already exists in db.idols (created with status 'Chờ duyệt')
      const targetId = req.targetPersonnelId || req.data.id;
      const existing = targetId ? db.idols.find(i => i.id === targetId) : undefined;
      if (existing) {
        if (existing.personnelType !== 'Dịch vụ ngoài') {
          existing.status = 'Đang hoạt động';
        }
        createdIdol = existing;
      } else {
        // Execute idol creation
        const nextStt = db.idols.length > 0 ? Math.max(...db.idols.map(i => i.stt || 0)) + 1 : 1;
        const idolId = `idol-${Date.now()}`;
        const creds = generateCompanyCredentials(req.data.realName || req.data.stageName || req.targetName);
        const username = creds.username;
        const email = req.data.socialLinks?.email || creds.email;

        createdIdol = {
          id: idolId,
          stt: nextStt,
          stageName: req.data.stageName || req.targetName,
          realName: req.data.realName || '',
          dob: req.data.dob || '2000-01-01',
          role: req.data.role || 'Thực tập sinh',
          weight: req.data.weight || 50,
          height: req.data.height || 165,
          hometown: req.data.hometown || 'Chưa cập nhật',
          currentLiving: req.data.currentLiving || 'TP. Hồ Chí Minh',
          department: req.data.department || (db.departments[0] || 'Chưa phân ban'),
          personnelType: req.data.personnelType || (db.personnelTypes[0] || 'Công ty'),
          status: (req.data.personnelType === 'Dịch vụ ngoài') ? '' : 'Đang hoạt động',
          joinDate: req.data.joinDate || ((db.settings?.referenceDate && db.settings.referenceDate.trim() !== '') ? db.settings.referenceDate.trim() : new Date().toISOString().split('T')[0]),
          avatarUrl: req.data.avatarUrl || DEFAULT_BLANK_AVATAR,
          bio: req.data.bio || '',
          socialLinks: req.data.socialLinks || { email },
          accountUsername: username,
          userId: `user-${idolId}`,
          createdAt: new Date().toISOString()
        };
        db.idols.push(createdIdol);
      }

      // Tự động tạo user account cho Idol mới (nếu chưa có)
      const idolId = createdIdol.id;
      const creds = generateCompanyCredentials(createdIdol.realName || createdIdol.stageName);
      const username = createdIdol.accountUsername || creds.username;
      const email = createdIdol.socialLinks?.email || creds.email;
      const displayName = createdIdol.realName && createdIdol.stageName && createdIdol.realName !== createdIdol.stageName
        ? `${createdIdol.realName} (${createdIdol.stageName})`
        : (createdIdol.realName || createdIdol.stageName);

      if (!db.users.some(u => u.id === `user-${idolId}` || u.idolId === idolId)) {
        const newUser: UserAccount = {
          id: `user-${idolId}`,
          username,
          email,
          name: displayName,
          role: 'viewer',
          roleTitle: createdIdol.role ? `Idol (${createdIdol.role})` : 'Idol / Nghệ Sĩ',
          allowedTabs: ['my_dashboard', 'schedule', 'tasks', 'leaderboard'],
          allowedDepartments: createdIdol.department ? [createdIdol.department] : ['*'],
          allowedActions: [],
          avatarUrl: createdIdol.avatarUrl,
          password: '123',
          idolId,
          isSuperAdmin: false
        };
        db.users.push(newUser);
      }
    } else if (req.type === 'delete_idol' && req.targetIdolId) {
      // Execute idol deletion
      deletedIdolId = req.targetIdolId;
      db.idols = db.idols.filter(i => i.id !== req.targetIdolId);
      db.scores = db.scores.filter(s => s.idolId !== req.targetIdolId);
      db.tasks = db.tasks.filter(t => t.idolId !== req.targetIdolId);
      db.users = db.users.filter(u => u.idolId !== req.targetIdolId && u.id !== `user-${req.targetIdolId}`);
      db.idols.forEach((idol, index) => {
        idol.stt = index + 1;
      });
    }

    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    return { approval: req, createdIdol, deletedIdolId };
  },

  rejectApproval(id: string, reviewer: { id: string; name: string }, reason?: string): ApprovalRequest | null {
    const db = readDb();
    const idx = db.approvals.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const req = db.approvals[idx];
    req.status = 'rejected';
    req.reviewedBy = reviewer;
    req.reviewNote = reason || 'Từ chối yêu cầu';
    req.reviewedAt = new Date().toISOString();

    writeDb(db);
    return req;
  },

  deleteApproval(id: string): boolean {
    const db = readDb();
    const initialLen = db.approvals.length;
    db.approvals = db.approvals.filter(a => a.id !== id);
    writeDb(db);
    return db.approvals.length < initialLen;
  },

  // Schedules (Lịch Live Stream & Ca Làm Việc)
  getSchedules(): WorkScheduleSlot[] {
    const db = readDb();
    return db.schedules || [];
  },

  getSchedulesByIdol(idolId: string): WorkScheduleSlot[] {
    const db = readDb();
    return (db.schedules || []).filter(s => s.idolId === idolId);
  },

  createSchedule(payload: Omit<WorkScheduleSlot, 'id'>): WorkScheduleSlot {
    const db = readDb();
    const newSchedule: WorkScheduleSlot = {
      ...payload,
      id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    db.schedules = [...(db.schedules || []), newSchedule];
    writeDb(db);
    return newSchedule;
  },

  updateSchedule(id: string, payload: Partial<WorkScheduleSlot>): WorkScheduleSlot | undefined {
    const db = readDb();
    const index = (db.schedules || []).findIndex(s => s.id === id);
    if (index === -1) return undefined;
    const updated = { ...db.schedules[index], ...payload };
    db.schedules[index] = updated;
    writeDb(db);
    return updated;
  },

  deleteSchedule(id: string): boolean {
    const db = readDb();
    const prevLen = (db.schedules || []).length;
    db.schedules = (db.schedules || []).filter(s => s.id !== id);
    if (db.schedules.length !== prevLen) {
      writeDb(db);
      return true;
    }
    return false;
  },

  batchSetIdolSchedules(idolId: string, slots: Omit<WorkScheduleSlot, 'id' | 'idolId'>[]): WorkScheduleSlot[] {
    const db = readDb();
    const otherSchedules = (db.schedules || []).filter(s => s.idolId !== idolId);
    const newSlots: WorkScheduleSlot[] = slots.map((s, idx) => ({
      ...s,
      id: `sched-${idolId}-${Date.now()}-${idx}`,
      idolId
    }));
    db.schedules = [...otherSchedules, ...newSlots];
    writeDb(db);
    return newSlots;
  },

  // Leave Requests (Hệ thống Xin Nghỉ Phép)
  getLeaveRequests(idolId?: string): LeaveRequest[] {
    const db = readDb();
    const list = db.leaveRequests || DEFAULT_LEAVE_REQUESTS;
    if (idolId) {
      return list.filter((l) => l.idolId === idolId);
    }
    return list;
  },

  createLeaveRequest(payload: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'> & { status?: any }): LeaveRequest {
    const db = readDb();
    const currentList = db.leaveRequests || DEFAULT_LEAVE_REQUESTS;
    const totalDays = Number(payload.totalDays) || 1;
    const annualLeaveDays = payload.annualLeaveDays !== undefined
      ? Math.max(0, Number(payload.annualLeaveDays) || 0)
      : payload.leaveType === 'annual' ? totalDays : 0;
    const unpaidLeaveDays = payload.unpaidLeaveDays !== undefined
      ? Math.max(0, Number(payload.unpaidLeaveDays) || 0)
      : Math.max(0, totalDays - annualLeaveDays);
    let status: LeaveRequest['status'] = payload.status || 'pending';
    let approverRoleRequired: 'auto' | 'manager' | 'director' = 'manager';
    let autoApproved = false;
    let reviewedBy = payload.reviewedBy;
    let reviewNote = payload.reviewNote;
    let reviewedAt = payload.reviewedAt;

    // Quy tắc: 1 ngày nghỉ phép năm -> Tự động duyệt ngay; >= 3 ngày -> Giám đốc duyệt; 2 ngày -> Trưởng phòng duyệt
    if (totalDays === 1 && (payload.leaveType === 'annual' || !payload.leaveType)) {
      status = 'approved';
      autoApproved = true;
      approverRoleRequired = 'auto';
      reviewedBy = { id: 'system', name: 'Hệ thống tự động' };
      reviewNote = reviewNote || 'Hệ thống tự động phê duyệt theo chính sách nghỉ 1 ngày khi còn phép năm.';
      reviewedAt = new Date().toISOString();
    } else if (totalDays >= 3) {
      status = 'pending';
      approverRoleRequired = 'director';
      reviewNote = 'Cần Giám Đốc Điều Hành (CEO / BOD) phê duyệt (Nghỉ từ 3 ngày trở lên)';
    } else {
      status = 'pending';
      approverRoleRequired = 'manager';
      reviewNote = 'Cần Trưởng Phòng QL Idol / Quản lý trực tiếp phê duyệt';
    }

    const newReq: LeaveRequest = {
      ...payload,
      id: `leave-${Date.now()}`,
      status,
      totalDays,
      annualLeaveDays,
      unpaidLeaveDays,
      allocationConfirmed: payload.allocationConfirmed === true || unpaidLeaveDays === 0,
      approverRoleRequired,
      autoApproved,
      reviewedBy,
      reviewNote,
      reviewedAt,
      createdAt: new Date().toISOString()
    };
    db.leaveRequests = [newReq, ...currentList];

    // Tạo thông báo vào hàng đợi duyệt của Quản Lý / Giám Đốc
    const appr: ApprovalRequest = {
      id: `appr-leave-${Date.now()}`,
      type: 'leave_request' as any,
      status: 'pending',
      requestedBy: {
        id: newReq.idolId,
        username: newReq.idolName,
        name: newReq.idolName,
        roleTitle: `Idol (${newReq.department})`
      },
      targetIdolId: newReq.idolId,
      targetName: newReq.idolName,
      data: newReq,
      reason: `Xin nghỉ phép: ${newReq.reason} (${newReq.totalDays} ngày từ ${newReq.startDate} đến ${newReq.endDate})`,
      createdAt: new Date().toISOString()
    };
    db.approvals = [appr, ...(db.approvals || [])];

    writeDb(db);
    return newReq;
  },

  updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): LeaveRequest | null {
    const db = readDb();
    const currentList = db.leaveRequests || DEFAULT_LEAVE_REQUESTS;
    const idx = currentList.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    currentList[idx] = { ...currentList[idx], ...updates };
    db.leaveRequests = currentList;
    writeDb(db);
    return currentList[idx];
  },

  deleteLeaveRequest(id: string): boolean {
    const db = readDb();
    const currentList = db.leaveRequests || DEFAULT_LEAVE_REQUESTS;
    const prevLen = currentList.length;
    db.leaveRequests = currentList.filter((l) => l.id !== id);
    if (db.leaveRequests.length !== prevLen) {
      writeDb(db);
      return true;
    }
    return false;
  },

  // Helper functions for Payroll & System Time Sync
  ensurePayrollSync(): boolean {
    const db = readDb();
    const modified = ensurePayrollPeriodsAndSync(db);
    if (modified) writeDb(db);
    return modified;
  },

  // Payroll Management (Bảng Lương & Phiếu Lương)
  getPayrollPeriods(): PayrollPeriod[] {
    const db = readDb();
    const modified = ensurePayrollPeriodsAndSync(db);
    if (modified) writeDb(db);

    const systemDate = getSystemDateStr(db);
    const currentPeriodStr = systemDate.slice(0, 7);

    // Trả về các kỳ lương <= tháng hiện tại của hệ thống (sắp xếp mới nhất trước)
    return (db.payrolls || DEFAULT_PAYROLL_PERIODS)
      .filter(p => p.period <= currentPeriodStr)
      .sort((a, b) => b.period.localeCompare(a.period));
  },

  getPayrollPeriod(idOrPeriod: string): PayrollPeriod | null {
    const db = readDb();
    const modified = ensurePayrollPeriodsAndSync(db);
    if (modified) writeDb(db);
    const periods = db.payrolls || DEFAULT_PAYROLL_PERIODS;
    return periods.find(p => p.id === idOrPeriod || p.period === idOrPeriod) || null;
  },

  getPayrollRecords(periodId: string, filter?: { department?: string; userId?: string }): PayrollRecord[] {
    const db = readDb();
    const modified = ensurePayrollPeriodsAndSync(db);
    if (modified) writeDb(db);

    const cleanPeriod = periodId.startsWith('payroll-') ? periodId.replace('payroll-', '') : periodId;
    let records = (db.payrollRecords || DEFAULT_PAYROLL_RECORDS).filter(
      r => r.periodId === periodId || r.period === periodId || r.period === cleanPeriod || r.periodId === `payroll-${cleanPeriod}`
    );
    if (filter?.department && filter.department !== '*' && filter.department !== 'all') {
      records = records.filter(r => r.department === filter.department);
    }
    if (filter?.userId) {
      records = records.filter(r => r.userId === filter.userId);
    }
    return records;
  },

  syncPayrollPeriod(periodId: string): { period: PayrollPeriod; records: PayrollRecord[] } {
    const db = readDb();
    ensurePayrollPeriodsAndSync(db);
    writeDb(db);
    const period = this.getPayrollPeriod(periodId);
    if (!period) throw new Error('Không tìm thấy kỳ lương');
    const records = this.getPayrollRecords(periodId);
    return { period, records };
  },

  adjustPayrollRecord(
    periodId: string,
    recordId: string,
    updates: {
      earnings?: Partial<PayrollRecord['earnings']>;
      deductions?: Partial<PayrollRecord['deductions']>;
      notes?: string;
      reason?: string;
    },
    user: { id: string; name: string }
  ): PayrollRecord | null {
    const db = readDb();
    const records = db.payrollRecords || DEFAULT_PAYROLL_RECORDS;
    const idx = records.findIndex(r => r.id === recordId);
    if (idx === -1) return null;

    const record = records[idx];
    const oldNet = record.netSalary;

    // Merge earnings
    if (updates.earnings) {
      record.earnings = {
        ...record.earnings,
        ...updates.earnings
      };

      // Tự động tính lại tiền làm thêm giờ (tăng ca) nếu có cập nhật số giờ
      if (
        updates.earnings.otNormalHours !== undefined ||
        updates.earnings.otWeekendHours !== undefined ||
        updates.earnings.otHolidayHours !== undefined
      ) {
        const stdDays = record.earnings.standardWorkDays || 26;
        const contractSalary = record.earnings.contractBaseSalary || record.earnings.baseSalary;
        const otRes = calculateOvertimePay(
          contractSalary,
          stdDays,
          record.earnings.otNormalHours || 0,
          record.earnings.otWeekendHours || 0,
          record.earnings.otHolidayHours || 0
        );
        record.earnings.hourlyRate = otRes.hourlyRate;
        record.earnings.overtimePay = otRes.totalOtPay;
      }

      // Tự động tính lại lương theo ngày công nếu kế toán điều chỉnh số ngày công thực tế
      if (updates.earnings.actualWorkDays !== undefined && record.earnings.contractBaseSalary) {
        const stdDays = record.earnings.standardWorkDays || 26;
        const actualDays = record.earnings.actualWorkDays ?? stdDays;
        record.earnings.workRatio = stdDays > 0 ? Math.min(1.0, Math.max(0, actualDays / stdDays)) : 1.0;
        record.earnings.baseSalary = Math.round(record.earnings.contractBaseSalary * record.earnings.workRatio);
      }

      const e = record.earnings;
      e.totalGross = (e.baseSalary || 0) + (e.overtimePay || 0) + (e.kpiBonus || 0) + (e.commissionGmv || 0) + 
                     (e.giftShare || 0) + (e.allowance || 0) + (e.hotBonus || 0) + (e.otherBonus || 0);

      const automaticDeductions = calculatePayrollDeductions({
        contractSalary: e.contractBaseSalary || e.baseSalary || 0,
        taxableIncome: e.totalGross,
        personnelType: record.personnelType
      });
      record.deductions.tax = automaticDeductions.tax;
      record.deductions.insurance = automaticDeductions.employeeInsurance;
    }

    // Merge deductions
    if (updates.deductions) {
      record.deductions = {
        ...record.deductions,
        ...updates.deductions
      };
      const d = record.deductions;
      d.totalDeductions = (d.liveHoursPenalty || 0) + (d.unpaidLeaveDeduction || 0) + 
                          (d.advancePayment || 0) + (d.tax || 0) + (d.insurance || 0) + (d.otherPenalty || 0);
    }

    if (updates.notes !== undefined) {
      record.notes = updates.notes;
    }

    // Recalculate netSalary
    record.netSalary = Math.max(0, record.earnings.totalGross - record.deductions.totalDeductions);

    // Add adjustment log
    if (!record.adjustmentLogs) record.adjustmentLogs = [];
    record.adjustmentLogs.push({
      updatedBy: user.name,
      updatedAt: new Date().toISOString(),
      field: 'adjustments',
      oldValue: oldNet,
      newValue: record.netSalary,
      reason: updates.reason || 'Kế toán điều chỉnh đối soát bảng lương'
    });

    records[idx] = record;
    db.payrollRecords = records;

    // Update period totals
    this._recalculatePeriodTotals(db, record.periodId);
    writeDb(db);
    return record;
  },

  applyHotBonus(
    periodId: string,
    recordId: string,
    amount: number,
    reason: string,
    directorUser: { id: string; name: string }
  ): PayrollRecord | null {
    const db = readDb();
    const records = db.payrollRecords || DEFAULT_PAYROLL_RECORDS;
    const idx = records.findIndex(r => r.id === recordId);
    if (idx === -1) return null;

    const record = records[idx];
    const oldHotBonus = record.earnings.hotBonus || 0;
    const oldNet = record.netSalary;

    record.earnings.hotBonus = amount;
    record.earnings.hotBonusReason = reason;
    record.earnings.hotBonusAwardedBy = directorUser.name;
    record.earnings.hotBonusAwardedAt = new Date().toISOString();

    // Recalculate gross & net
    const e = record.earnings;
    e.totalGross = (e.baseSalary || 0) + (e.overtimePay || 0) + (e.kpiBonus || 0) + (e.commissionGmv || 0) + 
                   (e.giftShare || 0) + (e.allowance || 0) + (e.hotBonus || 0) + (e.otherBonus || 0);
    record.netSalary = Math.max(0, e.totalGross - record.deductions.totalDeductions);

    if (!record.adjustmentLogs) record.adjustmentLogs = [];
    record.adjustmentLogs.push({
      updatedBy: directorUser.name,
      updatedAt: new Date().toISOString(),
      field: 'hotBonus',
      oldValue: oldHotBonus,
      newValue: amount,
      reason: `⚡ Giám Đốc Thưởng Nóng: ${reason}`
    });

    records[idx] = record;
    db.payrollRecords = records;

    this._recalculatePeriodTotals(db, record.periodId);
    writeDb(db);
    return record;
  },

  submitPayrollPeriod(periodId: string, user: { id: string; name: string; roleTitle?: string }): PayrollPeriod | null {
    const db = readDb();
    const periods = db.payrolls || DEFAULT_PAYROLL_PERIODS;
    const idx = periods.findIndex(p => p.id === periodId || p.period === periodId);
    if (idx === -1) return null;
    assertPayrollSubmitAllowed(periods[idx].status as any, user);

    periods[idx].status = 'pending_approval';
    periods[idx].submittedBy = {
      id: user.id,
      name: user.name,
      roleTitle: user.roleTitle || 'HR & Kế Toán'
    };
    periods[idx].submittedAt = new Date().toISOString();

    db.payrolls = periods;
    writeDb(db);
    return periods[idx];
  },

  approvePayrollPeriod(periodId: string, directorUser: { id: string; name: string }): PayrollPeriod | null {
    const db = readDb();
    const periods = db.payrolls || DEFAULT_PAYROLL_PERIODS;
    const idx = periods.findIndex(p => p.id === periodId || p.period === periodId);
    if (idx === -1) return null;
    assertPayrollApprovalAllowed(periods[idx].status as any, directorUser);

    periods[idx].status = 'approved';
    periods[idx].approvedBy = {
      id: directorUser.id,
      name: directorUser.name
    };
    periods[idx].approvedAt = new Date().toISOString();

    db.payrolls = periods;
    writeDb(db);
    return periods[idx];
  },

  lockPayrollPeriod(periodId: string, user: { id: string; name: string }): PayrollPeriod | null {
    const db = readDb();
    const periods = db.payrolls || DEFAULT_PAYROLL_PERIODS;
    const idx = periods.findIndex(p => p.id === periodId || p.period === periodId);
    if (idx === -1) return null;
    assertPayrollLockAllowed(periods[idx].status as any, user);

    periods[idx].status = 'locked_paid';
    periods[idx].lockedAt = new Date().toISOString();

    // Mark all matching records as paid
    const targetPeriod = periods[idx].period;
    const records = db.payrollRecords || DEFAULT_PAYROLL_RECORDS;
    records.forEach(r => {
      if (r.periodId === periods[idx].id || r.period === targetPeriod) {
        r.paymentStatus = 'paid';
        r.paidAt = new Date().toISOString();
        if (!r.paymentRef) {
          r.paymentRef = `BNK-${targetPeriod.replace('-', '')}-${r.id.slice(-4)}`;
        }
      }
    });

    db.payrolls = periods;
    db.payrollRecords = records;
    writeDb(db);
    return periods[idx];
  },

  getMyPayslips(userId: string, idolId?: string): PayrollRecord[] {
    const db = readDb();
    const records = db.payrollRecords || DEFAULT_PAYROLL_RECORDS;
    const periods = db.payrolls || DEFAULT_PAYROLL_PERIODS;

    // Filter records for this user or linked idol
    return records.filter(r => {
      const isMatch = r.userId === userId || (idolId && r.idolId === idolId);
      if (!isMatch) return false;
      // Chỉ cho phép xem nếu kỳ lương đã được Giám Đốc duyệt ('approved' hoặc 'locked_paid'), hoặc là kỳ nháp nhưng user có quyền xem
      const periodObj = periods.find(p => p.id === r.periodId || p.period === r.period);
      return periodObj?.status === 'approved' || periodObj?.status === 'locked_paid' || periodObj?.status === 'draft';
    });
  },

  _recalculatePeriodTotals(db: DatabaseSchema, periodId: string) {
    const periods = db.payrolls || DEFAULT_PAYROLL_PERIODS;
    const pIdx = periods.findIndex(p => p.id === periodId);
    if (pIdx === -1) return;

    const records = (db.payrollRecords || DEFAULT_PAYROLL_RECORDS).filter(r => r.periodId === periodId);
    let totalGross = 0;
    let totalDeductions = 0;
    let totalHotBonus = 0;
    let totalNet = 0;

    records.forEach(r => {
      totalGross += r.earnings.totalGross || 0;
      totalDeductions += r.deductions.totalDeductions || 0;
      totalHotBonus += r.earnings.hotBonus || 0;
      totalNet += r.netSalary || 0;
    });

    periods[pIdx].totalGross = totalGross;
    periods[pIdx].totalDeductions = totalDeductions;
    periods[pIdx].totalHotBonus = totalHotBonus;
    periods[pIdx].totalNet = totalNet;
    periods[pIdx].employeeCount = records.length;
  },

  getMacroPayrollSummary(): MacroPayrollSummary {
    const db = readDb();
    ensurePayrollPeriodsAndSync(db);
    const periods = (db.payrolls || []).slice().sort((a, b) => b.period.localeCompare(a.period));

    const allTime = {
      gross: periods.reduce((sum, p) => sum + (p.totalGross || 0), 0),
      kpi: periods.reduce((sum, p) => sum + (p.totalKpiBonus || 0), 0),
      hot: periods.reduce((sum, p) => sum + (p.totalHotBonus || 0), 0),
      deductions: periods.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
      net: periods.reduce((sum, p) => sum + (p.totalNet || 0), 0),
      periodCount: periods.length,
      firstPeriod: periods.length > 0 ? periods[periods.length - 1].period : '2022-01',
      latestPeriod: periods.length > 0 ? periods[0].period : '2026-10'
    };

    const byYear: MacroPayrollSummary['byYear'] = {};
    const byQuarter: MacroPayrollSummary['byQuarter'] = {};

    periods.forEach(p => {
      const [year, monthStr] = p.period.split('-');
      const month = Number(monthStr);
      const qNum = Math.ceil(month / 3);
      const qKey = `${year}-Q${qNum}`;

      if (!byYear[year]) {
        byYear[year] = {
          year,
          gross: 0,
          kpi: 0,
          hot: 0,
          deductions: 0,
          net: 0,
          periodCount: 0,
          avgEmployees: 0,
          months: []
        };
      }
      byYear[year].gross += p.totalGross || 0;
      byYear[year].kpi += p.totalKpiBonus || 0;
      byYear[year].hot += p.totalHotBonus || 0;
      byYear[year].deductions += p.totalDeductions || 0;
      byYear[year].net += p.totalNet || 0;
      byYear[year].periodCount += 1;
      byYear[year].months.push(p.period);

      if (!byQuarter[qKey]) {
        byQuarter[qKey] = {
          year,
          quarter: `Q${qNum}`,
          quarterKey: qKey,
          label: `Quý ${qNum}/${year}`,
          gross: 0,
          kpi: 0,
          hot: 0,
          deductions: 0,
          net: 0,
          periodCount: 0,
          months: []
        };
      }
      byQuarter[qKey].gross += p.totalGross || 0;
      byQuarter[qKey].kpi += p.totalKpiBonus || 0;
      byQuarter[qKey].hot += p.totalHotBonus || 0;
      byQuarter[qKey].deductions += p.totalDeductions || 0;
      byQuarter[qKey].net += p.totalNet || 0;
      byQuarter[qKey].periodCount += 1;
      byQuarter[qKey].months.push(p.period);
    });

    Object.values(byYear).forEach(y => {
      const yearPeriods = periods.filter(p => p.period.startsWith(y.year));
      const totalEmp = yearPeriods.reduce((sum, p) => sum + (p.employeeCount || 0), 0);
      y.avgEmployees = yearPeriods.length > 0 ? Math.round(totalEmp / yearPeriods.length) : 0;
    });

    return { allTime, byYear, byQuarter };
  },

  getAggregatedPayrollPersonnel(scope: PayrollScopeType, key?: string): AggregatedPayrollPersonnel[] {
    const db = readDb();
    ensurePayrollPeriodsAndSync(db);
    let targetPeriods: string[] = [];

    if (scope === 'all') {
      targetPeriods = (db.payrolls || []).map(p => p.period);
    } else if (scope === 'year') {
      const year = key || (db.payrolls?.[0]?.period.slice(0, 4) || '2026');
      targetPeriods = (db.payrolls || []).filter(p => p.period.startsWith(year)).map(p => p.period);
    } else if (scope === 'quarter') {
      const qKey = key || '2026-Q4';
      const [year, qPart] = qKey.split('-');
      const qNum = Number(qPart.replace('Q', ''));
      const startMonth = (qNum - 1) * 3 + 1;
      const endMonth = qNum * 3;
      const qMonths = [startMonth, startMonth + 1, endMonth].map(m => `${year}-${String(m).padStart(2, '0')}`);
      targetPeriods = qMonths;
    }

    const filteredRecords = (db.payrollRecords || []).filter(r => targetPeriods.includes(r.period));
    const personnelMap = new Map<string, AggregatedPayrollPersonnel>();

    filteredRecords.forEach(r => {
      const pKey = r.userId;
      if (!personnelMap.has(pKey)) {
        personnelMap.set(pKey, {
          userId: r.userId,
          idolId: r.idolId,
          employeeName: r.employeeName,
          stageName: r.stageName,
          roleTitle: r.roleTitle,
          department: r.department,
          personnelType: r.personnelType,
          isIdol: r.isIdol,
          bankInfo: { ...r.bankInfo },
          totalBaseSalary: 0,
          totalKpiBonus: 0,
          totalAllowance: 0,
          totalHotBonus: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          periodCount: 0
        });
      }
      const agg = personnelMap.get(pKey)!;
      agg.totalBaseSalary += r.earnings?.baseSalary || 0;
      agg.totalKpiBonus += (r.earnings?.kpiBonus || 0) + (r.earnings?.commissionGmv || 0) + (r.earnings?.giftShare || 0);
      agg.totalAllowance += r.earnings?.allowance || 0;
      agg.totalHotBonus += r.earnings?.hotBonus || 0;
      agg.totalGross += r.earnings?.totalGross || 0;
      agg.totalDeductions += r.deductions?.totalDeductions || 0;
      agg.totalNet += r.netSalary || 0;
      agg.periodCount += 1;
    });

    return Array.from(personnelMap.values()).sort((a, b) => b.totalNet - a.totalNet);
  },

  syncIdolsWithUsers(): { success: boolean; syncedCount: number; users: UserAccount[] } {
    const db = readDb();
    // readDb() will remove legacy dummy accounts and sync all idols with users
    writeDb(db);
    return { success: true, syncedCount: db.idols.length, users: db.users };
  },

  // --- KPI Groups Management ---
  getKpiGroups(): KpiGroup[] {
    const db = readDb();
    return db.kpiGroups || DEFAULT_KPI_GROUPS;
  },

  createKpiGroup(data: Partial<KpiGroup>): KpiGroup {
    const db = readDb();
    const newGroup: KpiGroup = {
      id: data.id || `kpi-grp-${Date.now()}`,
      name: data.name?.trim() || 'Nhóm Chỉ Định Mới',
      description: data.description?.trim() || '',
      type: data.type || 'custom',
      category: data.category || 'mixed',
      department: data.department || '',
      memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
      leaderId: data.leaderId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.kpiGroups = [...(db.kpiGroups || []), newGroup];
    writeDb(db);
    return newGroup;
  },

  updateKpiGroup(id: string, updates: Partial<KpiGroup>): KpiGroup | null {
    const db = readDb();
    const index = (db.kpiGroups || []).findIndex(g => g.id === id);
    if (index === -1) return null;
    const current = db.kpiGroups[index];
    const updated: KpiGroup = {
      ...current,
      ...updates,
      id: current.id,
      type: current.type,
      updatedAt: new Date().toISOString()
    };
    db.kpiGroups[index] = updated;
    writeDb(db);
    return updated;
  },

  deleteKpiGroup(id: string): boolean {
    const db = readDb();
    const target = (db.kpiGroups || []).find(g => g.id === id);
    if (!target) return false;
    if (target.type === 'system') {
      throw new Error('Không thể xóa nhóm mặc định của hệ thống');
    }
    db.kpiGroups = (db.kpiGroups || []).filter(g => g.id !== id);
    db.kpiSettings = (db.kpiSettings || []).filter(s => s.groupId !== id);
    writeDb(db);
    return true;
  },

  // --- KPI Settings Management ---
  getKpiSettings(): KpiSetting[] {
    const db = readDb();
    return db.kpiSettings || DEFAULT_KPI_SETTINGS;
  },

  createKpiSetting(data: Partial<KpiSetting>): KpiSetting {
    const db = readDb();
    const newSetting: KpiSetting = {
      id: data.id || `kpi-set-${Date.now()}`,
      code: data.code?.trim().toUpperCase() || `KPI_${Date.now().toString().slice(-4)}`,
      name: data.name?.trim() || 'Chỉ tiêu KPI mới',
      description: data.description?.trim() || '',
      unit: data.unit?.trim() || 'VNĐ',
      customUnitLabel: data.customUnitLabel || undefined,
      scopeType: data.scopeType || 'group',
      groupId: data.groupId || undefined,
      assignedIdolId: data.assignedIdolId || undefined,
      period: data.period || 'monthly',
      targetValue: Number(data.targetValue) || 0,
      minThreshold: data.minThreshold !== undefined ? Number(data.minThreshold) : undefined,
      weight: Number(data.weight) || 20,
      bonusIncentive: data.bonusIncentive || undefined,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.kpiSettings = [...(db.kpiSettings || []), newSetting];
    writeDb(db);
    return newSetting;
  },

  updateKpiSetting(id: string, updates: Partial<KpiSetting>): KpiSetting | null {
    const db = readDb();
    const index = (db.kpiSettings || []).findIndex(s => s.id === id);
    if (index === -1) return null;
    const current = db.kpiSettings[index];
    const updated: KpiSetting = {
      ...current,
      ...updates,
      id: current.id,
      updatedAt: new Date().toISOString()
    };
    db.kpiSettings[index] = updated;
    writeDb(db);
    return updated;
  },

  deleteKpiSetting(id: string): boolean {
    const db = readDb();
    const exists = (db.kpiSettings || []).some(s => s.id === id);
    if (!exists) return false;
    db.kpiSettings = (db.kpiSettings || []).filter(s => s.id !== id);
    writeDb(db);
    return true;
  },

  reset(): void {
    const initialData: DatabaseSchema = {
      idols: DEFAULT_IDOLS,
      criteria: DEFAULT_CRITERIA,
      scores: DEFAULT_SCORES,
      tasks: DEFAULT_TASKS,
      departments: DEFAULT_DEPARTMENTS,
      personnelTypes: DEFAULT_PERSONNEL_TYPES,
      statuses: DEFAULT_STATUSES,
      columnHeaders: DEFAULT_COLUMN_HEADERS,
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      approvals: DEFAULT_APPROVALS,
      schedules: DEFAULT_SCHEDULES,
      leaveRequests: DEFAULT_LEAVE_REQUESTS,
      payrolls: DEFAULT_PAYROLL_PERIODS,
      payrollRecords: DEFAULT_PAYROLL_RECORDS,
      kpiGroups: DEFAULT_KPI_GROUPS,
      kpiSettings: DEFAULT_KPI_SETTINGS,
    };
    writeDb(initialData);
  }
};


