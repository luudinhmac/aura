import type { NavTab } from '../components/Navbar.tsx';
import type { ScoreCalculationMode } from '../types/index.ts';

export type PreviewRoleId = 'super_admin' | 'hr_accounting' | 'manager' | 'idol';

export interface PreviewRoleProfile {
  id: PreviewRoleId;
  label: string;
  userName: string;
  roleTitle: string;
  email: string;
  department: string;
  isSuperAdmin: boolean;
  allowedTabs: NavTab[];
  summary: string;
}

export interface PreviewNavItem {
  tab: NavTab;
  label: string;
  subLabel: string;
  iconKey:
    | 'users'
    | 'sparkles'
    | 'briefcase'
    | 'calendar'
    | 'checkSquare'
    | 'award'
    | 'trophy'
    | 'barChart'
    | 'trendingUp'
    | 'coins'
    | 'banknote'
    | 'fileText'
    | 'target'
    | 'shield';
  iconColor: string;
  iconBg: string;
  badge?: number;
}

export interface PreviewNavGroup {
  id: string;
  label: string;
  items: PreviewNavItem[];
}

export interface PreviewAuditLogRow {
  id: string;
  requestId: string;
  createdAt: string;
  actorUsername: string;
  actorName: string;
  actorRole: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  action: string;
  resource: string;
  resourceId: string;
  statusCode: number;
  metadata: Record<string, unknown>;
}

export const PREVIEW_ROLES: PreviewRoleProfile[] = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    userName: 'Nguyễn Quản Trị',
    roleTitle: 'Quản Trị Viên Tối Cao',
    email: 'admin@auratalent.vn',
    department: 'Ban Điều Hành',
    isSuperAdmin: true,
    allowedTabs: [
      'roster',
      'my_dashboard',
      'work_assignments',
      'schedule',
      'tasks',
      'scoring',
      'leaderboard',
      'analytics',
      'finance',
      'revenue',
      'service_usage',
      'payroll',
      'payroll_disputes',
      'kpi',
      'admin',
    ],
    summary: 'Toàn quyền tất cả phân hệ, bao gồm tab Nhật Ký Hệ Thống (AuditLog).',
  },
  {
    id: 'hr_accounting',
    label: 'HR & Kế Toán',
    userName: 'Lê Minh Thư',
    roleTitle: 'Trưởng Nhóm HR & Kế Toán',
    email: 'hr@auratalent.vn',
    department: 'Kế Toán & Nhân Sự',
    isSuperAdmin: false,
    allowedTabs: [
      'roster',
      'my_dashboard',
      'work_assignments',
      'schedule',
      'analytics',
      'finance',
      'revenue',
      'service_usage',
      'payroll',
      'payroll_disputes',
      'kpi',
      'admin',
    ],
    summary: 'Quản lý nhân sự, lương, P&L, doanh thu, duyệt nghỉ phép (ẩn AuditLog & Bảng Điểm).',
  },
  {
    id: 'manager',
    label: 'Quản Lý Team',
    userName: 'Phạm Hoàng Nam',
    roleTitle: 'Trưởng Nhóm PK & Biểu Diễn',
    email: 'nam.lead@auratalent.vn',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    isSuperAdmin: false,
    allowedTabs: ['roster', 'my_dashboard', 'work_assignments', 'schedule', 'tasks', 'analytics', 'kpi'],
    summary: 'Phạm vi phòng ban: quản lý lịch làm việc, giao việc, nhiệm vụ và KPI team.',
  },
  {
    id: 'idol',
    label: 'Idol / Talent',
    userName: 'Minh Anh (Aria)',
    roleTitle: 'Main Vocal & Performance PK',
    email: 'anhtm@auratalent.vn',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'work_assignments', 'schedule', 'tasks'],
    summary: 'Không gian cá nhân tối giản: dashboard cá nhân, ca công tác, lịch live và nhiệm vụ.',
  },
];

export const PREVIEW_NAV_GROUPS: PreviewNavGroup[] = [
  {
    id: 'talent',
    label: 'Hồ Sơ',
    items: [
      {
        tab: 'roster',
        label: 'Danh sách hồ sơ',
        subLabel: 'Idol, nhân viên, cộng tác viên & đối tác',
        iconKey: 'users',
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50',
        badge: 21,
      },
      {
        tab: 'my_dashboard',
        label: 'Dashboard cá nhân',
        subLabel: 'Không gian làm việc & thành tích cá nhân',
        iconKey: 'sparkles',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        tab: 'work_assignments',
        label: 'Giao việc & Công tác',
        subLabel: 'Timeline, nhận ca & công tác ngoài giờ',
        iconKey: 'briefcase',
        iconColor: 'text-sky-600',
        iconBg: 'bg-sky-50',
        badge: 3,
      },
      {
        tab: 'schedule',
        label: 'Lịch Làm Việc & Ca Live',
        subLabel: 'Lịch phát sóng, sự kiện & booking',
        iconKey: 'calendar',
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Vận Hành',
    items: [
      {
        tab: 'tasks',
        label: 'Quản Lý Nhiệm Vụ',
        subLabel: 'Giao việc, Pomodoro & duyệt kết quả',
        iconKey: 'checkSquare',
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
      },
      {
        tab: 'scoring',
        label: 'Bảng Điểm Đánh Giá',
        subLabel: 'Chấm điểm định kỳ theo tiêu chí',
        iconKey: 'award',
        iconColor: 'text-sky-600',
        iconBg: 'bg-sky-50',
      },
      {
        tab: 'leaderboard',
        label: 'Bảng Xếp Hạng Idol',
        subLabel: 'Vinh danh bảng vàng & phân hạng Tier',
        iconKey: 'trophy',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        tab: 'analytics',
        label: 'Báo Cáo & Thống Kê',
        subLabel: 'Hiệu suất tăng trưởng & xu hướng',
        iconKey: 'barChart',
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Tài Chính',
    items: [
      {
        tab: 'finance',
        label: 'Tài Chính & Lợi Nhuận',
        subLabel: 'Báo cáo P&L, thu chi & chi phí công ty',
        iconKey: 'trendingUp',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        tab: 'revenue',
        label: 'Quản Lý Doanh Thu',
        subLabel: 'Booking nhãn hàng & thanh toán theo đợt',
        iconKey: 'coins',
        iconColor: 'text-sky-600',
        iconBg: 'bg-sky-50',
      },
      {
        tab: 'service_usage',
        label: 'Lịch Sử Dịch Vụ Ngoài',
        subLabel: 'Hồ sơ khách ngoài & thu tiền theo đợt',
        iconKey: 'briefcase',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        tab: 'payroll',
        label: 'Bảng Tính Lương & Thù Lao',
        subLabel: 'Phiếu lương idol, tạm ứng & khấu trừ',
        iconKey: 'banknote',
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
      },
      {
        tab: 'payroll_disputes',
        label: 'Phản ánh bảng lương',
        subLabel: 'Danh sách, chi tiết và xử lý phản ánh',
        iconKey: 'fileText',
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50',
        badge: 2,
      },
      {
        tab: 'kpi',
        label: 'Thiết Đặt Định Mức & KPI',
        subLabel: 'Chỉ tiêu doanh thu, giờ live & thưởng',
        iconKey: 'target',
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50',
      },
    ],
  },
  {
    id: 'system',
    label: 'Hệ Thống',
    items: [
      {
        tab: 'admin',
        label: 'Quản Trị Hệ Thống',
        subLabel: 'Duyệt đơn, tài khoản, phân quyền & AuditLog',
        iconKey: 'shield',
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50',
        badge: 4,
      },
    ],
  },
];

export const MOCK_ROSTER_ROWS = [
  {
    id: '1',
    stageName: 'Minh Anh (Aria)',
    realName: 'Trần Minh Anh',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    role: 'Main Vocal & PK',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    baseSalary: 12000000,
    kpiPercent: 108,
  },
  {
    id: '2',
    stageName: 'Khánh Vy (Vivi)',
    realName: 'Nguyễn Khánh Vy',
    department: 'Nhóm Live Commerce & Review',
    role: 'Host Livestream',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    baseSalary: 10500000,
    kpiPercent: 102,
  },
  {
    id: '3',
    stageName: 'Tuấn Kiệt (Kay)',
    realName: 'Lê Tuấn Kiệt',
    department: 'Nhóm Streamer Gaming & Gear',
    role: 'Gaming Creator',
    personnelType: 'Cộng tác viên',
    status: 'Đang hoạt động',
    baseSalary: 8000000,
    kpiPercent: 94,
  },
  {
    id: '4',
    stageName: 'Bảo Ngọc (Luna)',
    realName: 'Vũ Bảo Ngọc',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    role: 'Dancer & Visual',
    personnelType: 'Công ty',
    status: 'Tạm nghỉ',
    baseSalary: 9500000,
    kpiPercent: 76,
  },
  {
    id: '5',
    stageName: 'Lê Minh Thư',
    realName: 'Lê Minh Thư',
    department: 'Kế Toán & Nhân Sự',
    role: 'Trưởng nhóm HR & Kế toán',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    baseSalary: 18000000,
    kpiPercent: 100,
  },
  {
    id: '6',
    stageName: 'Studio Alpha Brand',
    realName: 'Công ty TNHH Alpha',
    department: 'Đối Tác Dịch Vụ Ngoài',
    role: 'Thuê Studio & Ekip',
    personnelType: 'Dịch vụ ngoài',
    status: 'Đang hoạt động',
    baseSalary: 0,
    kpiPercent: 0,
  },
];

export const MOCK_WORK_ASSIGNMENTS = [
  {
    id: 'wa-1',
    title: 'Đêm Gala PK Cuối Tháng 11',
    type: 'Bắt buộc',
    assignee: 'Minh Anh (Aria)',
    dateLabel: '14/11/2026 · 19:00 - 22:30',
    status: 'Chờ phản hồi',
    allowancePay: '1.250.000 đ (OT 2.0x)',
  },
  {
    id: 'wa-2',
    title: 'Livestream Mega Sale 11.11 Nhãn hàng X',
    type: 'Công tác ngoài',
    assignee: 'Khánh Vy (Vivi)',
    dateLabel: '11/11/2026 · 13:00 - 17:00',
    status: 'Đã nhận ca',
    allowancePay: '950.000 đ (OT 1.5x)',
  },
  {
    id: 'wa-3',
    title: 'Quay Review Studio Micro Razer',
    type: 'Tự chọn',
    assignee: 'Tuấn Kiệt (Kay)',
    dateLabel: '10/11/2026 · 09:00 - 12:00',
    status: 'Hoàn thành',
    allowancePay: '720.000 đ',
  },
  {
    id: 'wa-4',
    title: 'Tập duyệt đội hình Showcase Q4',
    type: 'Bắt buộc',
    assignee: 'Bảo Ngọc (Luna)',
    dateLabel: '08/11/2026 · 14:00 - 17:00',
    status: 'Quá hạn / Đang xét',
    allowancePay: 'Khấu trừ dự kiến 300.000 đ',
  },
];

export const MOCK_WEEKLY_SCHEDULE = [
  { day: 'Thứ 2', slot: '19:30 - 22:30', idol: 'Minh Anh (Aria)', type: 'Live PK Studio A', tone: 'rose' as const },
  { day: 'Thứ 3', slot: '14:00 - 17:00', idol: 'Khánh Vy (Vivi)', type: 'Live Commerce TikTok', tone: 'sky' as const },
  { day: 'Thứ 4', slot: '20:00 - 23:00', idol: 'Tuấn Kiệt (Kay)', type: 'Stream Gaming FPS', tone: 'indigo' as const },
  { day: 'Thứ 5', slot: '19:30 - 22:30', idol: 'Minh Anh (Aria)', type: 'Song Ca & Acoustic', tone: 'rose' as const },
  { day: 'Thứ 6', slot: '15:00 - 18:00', idol: 'Khánh Vy (Vivi)', type: 'Chốt Deal Nhãn Hàng', tone: 'emerald' as const },
  { day: 'Thứ 7', slot: '19:00 - 22:30', idol: 'Minh Anh (Aria)', type: 'Gala Cuối Tuần', tone: 'amber' as const },
];

export const MOCK_TASKS = [
  {
    id: 't-101',
    title: 'Chuẩn bị setlist & trang phục Gala PK tháng 11',
    assignee: 'Minh Anh (Aria)',
    category: 'Biểu diễn / PK',
    priority: 'Cao',
    status: 'in_progress' as const,
    subtasksDone: 3,
    subtasksTotal: 4,
    loggedMinutes: 135,
  },
  {
    id: 't-102',
    title: 'Chốt kịch bản Mega Live Serum Vitamin C',
    assignee: 'Khánh Vy (Vivi)',
    category: 'Live Commerce',
    priority: 'Cao',
    status: 'completed' as const,
    subtasksDone: 5,
    subtasksTotal: 5,
    loggedMinutes: 190,
  },
  {
    id: 't-103',
    title: 'Test âm thanh micro + OBS Scene mới cho Gaming',
    assignee: 'Tuấn Kiệt (Kay)',
    category: 'Gaming & Gear',
    priority: 'Trung bình',
    status: 'todo' as const,
    subtasksDone: 1,
    subtasksTotal: 3,
    loggedMinutes: 45,
  },
  {
    id: 't-104',
    title: 'Quay 3 clip ngắn TikTok trước chiến dịch 15.11',
    assignee: 'Minh Anh (Aria)',
    category: 'Truyền thông',
    priority: 'Trung bình',
    status: 'in_progress' as const,
    subtasksDone: 2,
    subtasksTotal: 3,
    loggedMinutes: 80,
  },
];

export const MOCK_SCORING_BOARD = [
  {
    id: 'sc-1',
    stageName: 'Minh Anh (Aria)',
    department: 'Biểu Diễn & PK',
    vocalOrSkill: 92,
    liveInteraction: 95,
    gmvScore: 90,
    discipline: 94,
    weightedTotal: 92.6,
    sumTotal: 138,
    tier: 'S-Tier',
  },
  {
    id: 'sc-2',
    stageName: 'Khánh Vy (Vivi)',
    department: 'Live Commerce',
    vocalOrSkill: 86,
    liveInteraction: 89,
    gmvScore: 94,
    discipline: 88,
    weightedTotal: 89.2,
    sumTotal: 129,
    tier: 'A-Tier',
  },
  {
    id: 'sc-3',
    stageName: 'Tuấn Kiệt (Kay)',
    department: 'Gaming & Gear',
    vocalOrSkill: 84,
    liveInteraction: 81,
    gmvScore: 78,
    discipline: 85,
    weightedTotal: 81.8,
    sumTotal: 118,
    tier: 'A-Tier',
  },
  {
    id: 'sc-4',
    stageName: 'Bảo Ngọc (Luna)',
    department: 'Biểu Diễn & PK',
    vocalOrSkill: 82,
    liveInteraction: 80,
    gmvScore: 76,
    discipline: 79,
    weightedTotal: 79.4,
    sumTotal: 114,
    tier: 'B-Tier',
  },
];

export const MOCK_REVENUE_TRANSACTIONS = [
  {
    code: 'REV-2026-108',
    title: 'Hợp đồng Booking Brand Mỹ phẩm L',
    idol: 'Khánh Vy (Vivi)',
    category: 'Booking nhãn hàng',
    platform: 'TikTok Live',
    gross: 85000000,
    deductions: 8500000,
    idolShare: 22950000,
    companyProfit: 53550000,
    status: 'synced_to_payroll' as const,
  },
  {
    code: 'REV-2026-112',
    title: 'Doanh thu PK Gala tuần 2 tháng 10',
    idol: 'Minh Anh (Aria)',
    category: 'PK Donate',
    platform: 'Bigo Live',
    gross: 64000000,
    deductions: 12800000,
    idolShare: 20480000,
    companyProfit: 30720000,
    status: 'verified' as const,
  },
  {
    code: 'REV-2026-115',
    title: 'Phiên Mega Live Stream Gear 10.10',
    idol: 'Tuấn Kiệt (Kay)',
    category: 'Live Commerce',
    platform: 'Shopee Live',
    gross: 32000000,
    deductions: 3200000,
    idolShare: 8640000,
    companyProfit: 20160000,
    status: 'draft' as const,
  },
  {
    code: 'EXT-2026-019',
    title: 'Thuê Studio + Ánh sáng trọn gói Studio Alpha',
    idol: 'Studio Alpha Brand',
    category: 'Dịch vụ ngoài',
    platform: 'Offline Studio',
    gross: 20000000,
    deductions: 0,
    idolShare: 0,
    companyProfit: 20000000,
    status: 'verified' as const,
  },
];

export const MOCK_SERVICE_USAGE_ROWS = [
  {
    id: 'su-1',
    client: 'Studio Alpha Brand',
    serviceName: 'Thuê Studio A + Kỹ thuật ánh sáng (8h)',
    usageDate: '24/10/2026',
    netAmount: 20000000,
    paidAmount: 15000000,
    paymentStatus: 'partially_paid' as const,
  },
  {
    id: 'su-2',
    client: 'Agency Media Beta',
    serviceName: 'Makeup & Ekip quay MV ngắn',
    usageDate: '19/10/2026',
    netAmount: 14500000,
    paidAmount: 14500000,
    paymentStatus: 'paid' as const,
  },
  {
    id: 'su-3',
    client: 'Local Brand Coco',
    serviceName: 'Gói dựng Livestream Studio + Kịch bản',
    usageDate: '29/10/2026',
    netAmount: 9800000,
    paidAmount: 0,
    paymentStatus: 'unpaid' as const,
  },
];

export const MOCK_PAYROLL_ROWS = [
  {
    id: 'pr-1',
    idol: 'Minh Anh (Aria)',
    department: 'Biểu Diễn & PK',
    baseSalary: 12000000,
    commissionAndGift: 14200000,
    kpiBonus: 2000000,
    deductions: 3550000,
    netSalary: 24650000,
  },
  {
    id: 'pr-2',
    idol: 'Khánh Vy (Vivi)',
    department: 'Live Commerce',
    baseSalary: 10500000,
    commissionAndGift: 16400000,
    kpiBonus: 1500000,
    deductions: 2890000,
    netSalary: 25510000,
  },
  {
    id: 'pr-3',
    idol: 'Tuấn Kiệt (Kay)',
    department: 'Gaming & Gear',
    baseSalary: 8000000,
    commissionAndGift: 8640000,
    kpiBonus: 800000,
    deductions: 644000,
    netSalary: 16796000,
  },
  {
    id: 'pr-4',
    idol: 'Lê Minh Thư',
    department: 'Kế Toán & Nhân Sự',
    baseSalary: 18000000,
    commissionAndGift: 0,
    kpiBonus: 2500000,
    deductions: 2840000,
    netSalary: 17660000,
  },
];

export const MOCK_PAYROLL_DISPUTES = [
  {
    id: 'pd-1',
    period: '2026-10',
    idol: 'Minh Anh (Aria)',
    category: 'Hoa hồng GMV / Quà PK',
    reason: 'Chưa cộng thưởng nóng trận PK giao hữu ngày 21/10 (+1.000.000 đ).',
    status: 'open' as const,
  },
  {
    id: 'pd-2',
    period: '2026-10',
    idol: 'Tuấn Kiệt (Kay)',
    category: 'Phụ cấp công tác / OT',
    reason: 'Đề nghị rà soát 3 giờ OT quay review ngoài giờ ngày 18/10.',
    status: 'reviewing' as const,
  },
  {
    id: 'pd-3',
    period: '2026-09',
    idol: 'Khánh Vy (Vivi)',
    category: 'Khấu trừ & BHXH',
    reason: 'Đã đối soát xong chứng từ phụ cấp ăn trưa.',
    status: 'resolved' as const,
  },
];

export const MOCK_KPI_RULES = [
  {
    code: 'KPI_LIVE_HOURS',
    name: 'Tổng giờ phát sóng hàng tháng',
    scope: 'Nhóm Biểu Diễn & PK',
    target: '80 giờ',
    adjustedNote: 'Tự động bù -4h từ Công tác ngoài được duyệt',
    bonus: '+2.000.000 đ',
  },
  {
    code: 'KPI_GMV_COMMERCE',
    name: 'Doanh số GMV phiên Live Commerce',
    scope: 'Nhóm Live Commerce',
    target: '150.000.000 đ',
    adjustedNote: 'Áp dụng trọng số 45% điểm đánh giá tháng',
    bonus: '+3.500.000 đ',
  },
  {
    code: 'KPI_STREAM_STREAK',
    name: 'Số buổi lên sóng đúng lịch',
    scope: 'Nhóm Gaming & Gear',
    target: '24 buổi / tháng',
    adjustedNote: 'Tối thiểu 20 buổi để giữ thưởng chuyên cần',
    bonus: '+1.000.000 đ',
  },
];

export const MOCK_ADMIN_APPROVALS = [
  {
    id: 'apr-412',
    actionType: 'update_idol',
    targetName: 'Bảo Ngọc (Luna)',
    requester: 'Lê Minh Thư (HR)',
    detail: 'Cập nhật trạng thái sang Tạm nghỉ phép năm + chuyển tổ phụ trách',
    status: 'pending' as const,
  },
  {
    id: 'apr-413',
    actionType: 'leave_request',
    targetName: 'Minh Anh (Aria)',
    requester: 'Minh Anh (Aria)',
    detail: 'Nghỉ phép năm 2 ngày (18/11 - 19/11/2026) · Lý do việc gia đình',
    status: 'pending' as const,
  },
  {
    id: 'apr-410',
    actionType: 'create_idol',
    targetName: 'Hải Đăng (Leo)',
    requester: 'Phạm Hoàng Nam',
    detail: 'Đề xuất tiếp nhận Thực tập sinh Nhóm Gaming & Gear',
    status: 'approved' as const,
  },
];

export const MOCK_SEARCH_IDOLS = [
  { id: '1', stageName: 'Minh Anh (Aria)', realName: 'Trần Minh Anh', department: 'Nhóm Idol Biểu Diễn & Donate (PK)', role: 'Main Vocal' },
  { id: '2', stageName: 'Khánh Vy (Vivi)', realName: 'Nguyễn Khánh Vy', department: 'Nhóm Live Commerce & Review', role: 'Host Live' },
  { id: '3', stageName: 'Tuấn Kiệt (Kay)', realName: 'Lê Tuấn Kiệt', department: 'Nhóm Streamer Gaming & Gear', role: 'Streamer' },
];

export const MOCK_SEARCH_TASKS = [
  { id: 't1', title: 'Phiên Live PK tháng 11 - Đêm Gala', idolName: 'Minh Anh (Aria)', category: 'Biểu diễn / PK' },
  { id: 't2', title: 'Quay Review Studio Micro mới', idolName: 'Tuấn Kiệt (Kay)', category: 'Gaming & Gear' },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    title: '2 phản ánh bảng lương chờ xử lý',
    description: 'Kỳ lương 2026-10 có yêu cầu đối soát hoa hồng GMV từ Idol.',
    tone: 'warning' as const,
    unread: true,
    targetTab: 'payroll_disputes' as NavTab,
  },
  {
    id: 'n2',
    title: '4 đề xuất duyệt nhân sự & nghỉ phép',
    description: 'Có 1 yêu cầu update_idol và 3 đơn nghỉ phép năm chờ phê duyệt.',
    tone: 'info' as const,
    unread: true,
    targetTab: 'admin' as NavTab,
  },
  {
    id: 'n3',
    title: 'Đã đồng bộ doanh thu kỳ 2026-10',
    description: '14 giao dịch booking & PK đã được đối soát tự động vào bảng lương.',
    tone: 'success' as const,
    unread: false,
    targetTab: 'payroll' as NavTab,
  },
];

export const MOCK_ANALYTICS_SCORES: Record<
  ScoreCalculationMode,
  { avg: number; maxScale: number; items: { name: string; score: number }[] }
> = {
  sum: {
    avg: 126.4,
    maxScale: 150,
    items: [
      { name: 'Minh Anh (Aria)', score: 138 },
      { name: 'Khánh Vy (Vivi)', score: 129 },
      { name: 'Tuấn Kiệt (Kay)', score: 118 },
      { name: 'Bảo Ngọc (Luna)', score: 121 },
    ],
  },
  weighted: {
    avg: 84.5,
    maxScale: 100,
    items: [
      { name: 'Minh Anh (Aria)', score: 92 },
      { name: 'Khánh Vy (Vivi)', score: 86 },
      { name: 'Tuấn Kiệt (Kay)', score: 79 },
      { name: 'Bảo Ngọc (Luna)', score: 81 },
    ],
  },
};

export const MOCK_AUDIT_LOGS: PreviewAuditLogRow[] = [
  {
    id: 'log-1',
    requestId: 'req-9f2a81c4',
    createdAt: '2026-11-11 16:41:18',
    actorUsername: 'admin',
    actorName: 'Nguyễn Quản Trị',
    actorRole: 'Super Admin',
    method: 'POST',
    path: '/api/revenue/sync-to-payroll',
    action: 'sync_revenue_to_payroll',
    resource: 'payroll',
    resourceId: '2026-10',
    statusCode: 200,
    metadata: {
      period: '2026-10',
      syncedTransactions: 14,
      updatedPayrollRecords: 9,
      recalculatedDeductions: true,
    },
  },
  {
    id: 'log-2',
    requestId: 'req-7d4b120e',
    createdAt: '2026-11-11 16:38:04',
    actorUsername: 'hr_admin',
    actorName: 'Lê Minh Thư',
    actorRole: 'HR & Kế Toán',
    method: 'PUT',
    path: '/api/payrolls/period-2026-10/records/rec-104/adjust',
    action: 'adjust_payroll_record',
    resource: 'payroll_record',
    resourceId: 'rec-104',
    statusCode: 200,
    metadata: {
      reason: 'Bổ sung phụ cấp quay ngoại cảnh tháng 10',
      allowanceDelta: 1500000,
      netSalaryAfter: 18420000,
    },
  },
  {
    id: 'log-3',
    requestId: 'req-3e19ca88',
    createdAt: '2026-11-11 16:22:51',
    actorUsername: 'anhtm',
    actorName: 'Minh Anh (Aria)',
    actorRole: 'Idol / Talent',
    method: 'PUT',
    path: '/api/auth/profile',
    action: 'update_profile',
    resource: 'auth_profile',
    resourceId: '6',
    statusCode: 403,
    metadata: {
      reason: 'Không được phép cập nhật hồ sơ của người dùng khác',
      attemptedUserId: '1',
      authenticatedUserId: '6',
    },
  },
  {
    id: 'log-4',
    requestId: 'req-55b0f91a',
    createdAt: '2026-11-11 15:54:12',
    actorUsername: 'admin',
    actorName: 'Nguyễn Quản Trị',
    actorRole: 'Super Admin',
    method: 'POST',
    path: '/api/approvals/apr-412/approve',
    action: 'approve_approval_request',
    resource: 'approval_request',
    resourceId: 'apr-412',
    statusCode: 200,
    metadata: {
      actionType: 'update_idol',
      targetIdolId: '4',
      appliedFields: ['department', 'role', 'status'],
    },
  },
  {
    id: 'log-5',
    requestId: 'req-12a8e431',
    createdAt: '2026-11-11 15:10:09',
    actorUsername: 'hr_admin',
    actorName: 'Lê Minh Thư',
    actorRole: 'HR & Kế Toán',
    method: 'DELETE',
    path: '/api/finance/expenses/exp-209',
    action: 'cancel_company_expense',
    resource: 'company_expense',
    resourceId: 'exp-209',
    statusCode: 200,
    metadata: {
      previousStatus: 'approved',
      newStatus: 'cancelled',
      amount: 4200000,
    },
  },
  {
    id: 'log-6',
    requestId: 'req-88c31a7d',
    createdAt: '2026-11-11 14:33:47',
    actorUsername: 'nam_lead',
    actorName: 'Phạm Hoàng Nam',
    actorRole: 'Quản Lý Team',
    method: 'POST',
    path: '/api/work-assignments/wa-19/complete',
    action: 'complete_work_assignment',
    resource: 'work_assignment',
    resourceId: 'wa-19',
    statusCode: 409,
    metadata: {
      error: 'Phân công chưa tới thời gian kết thúc hoặc thiếu người xác nhận',
    },
  },
];

export const MOCK_SYSTEM_CLOCK_LABEL = '11/11/2026 · 14:30:00 (Mock Clock)';

export const MOCK_SEARCH_DEPARTMENTS = [
  { id: 'dept-1', name: 'Nhóm Idol Biểu Diễn & Donate (PK)', memberCount: 8, lead: 'Phạm Hoàng Nam' },
  { id: 'dept-2', name: 'Nhóm Live Commerce & Review', memberCount: 6, lead: 'Trần Thu Hà' },
  { id: 'dept-3', name: 'Kế Toán & Nhân Sự', memberCount: 4, lead: 'Lê Minh Thư' },
];

export const MOCK_ROSTER_COLUMNS = [
  { key: 'stageName', label: 'Nghệ danh / Họ tên', isCore: true, defaultVisible: true },
  { key: 'department', label: 'Đơn vị / Khối', isCore: true, defaultVisible: true },
  { key: 'personnelType', label: 'Loại nhân sự', isCore: false, defaultVisible: true },
  { key: 'role', label: 'Chức danh', isCore: false, defaultVisible: true },
  { key: 'status', label: 'Trạng thái', isCore: true, defaultVisible: true },
  { key: 'baseSalary', label: 'Lương cơ bản', isCore: false, defaultVisible: true },
  { key: 'kpiPercent', label: 'Hiệu suất KPI', isCore: false, defaultVisible: true },
  { key: 'joinDate', label: 'Ngày gia nhập', isCore: false, defaultVisible: false },
];

export const MOCK_ASSIGNED_SERVICES = [
  {
    id: 'srv-a1',
    usageCode: 'EXT-2026-019',
    serviceName: 'Thuê Studio A + Kỹ thuật ánh sáng (8h)',
    clientName: 'Studio Alpha Brand',
    schedule: '14/11/2026 · 08:30 - 16:30',
    location: 'Studio A · Quận 7',
    assignedStaff: 'Phạm Hoàng Nam, Minh Anh (Aria)',
    paymentStatus: 'partially_paid' as const,
  },
  {
    id: 'srv-a2',
    usageCode: 'EXT-2026-022',
    serviceName: 'Gói dựng Livestream Studio + Kịch bản',
    clientName: 'Local Brand Coco',
    schedule: '16/11/2026 · 13:00 - 17:30',
    location: 'Studio B · Phú Nhuận',
    assignedStaff: 'Khánh Vy (Vivi)',
    paymentStatus: 'unpaid' as const,
  },
];

export const MOCK_SERVICE_ACCOUNTING_QUEUE = [
  {
    id: 'su-1',
    usageCode: 'EXT-2026-019',
    personnelName: 'Studio Alpha Brand',
    serviceName: 'Thuê Studio A + Kỹ thuật ánh sáng (8h)',
    status: 'completed' as const,
    paymentStatus: 'partially_paid' as const,
    outstandingAmount: 5000000,
  },
  {
    id: 'su-3',
    usageCode: 'EXT-2026-022',
    personnelName: 'Local Brand Coco',
    serviceName: 'Gói dựng Livestream Studio + Kịch bản',
    status: 'completed' as const,
    paymentStatus: 'unpaid' as const,
    outstandingAmount: 9800000,
  },
];

export const MOCK_REVENUE_CATEGORIES = [
  { id: 'rc-1', name: 'Booking nhãn hàng', defaultSharePercent: 30, count: 12 },
  { id: 'rc-2', name: 'PK Donate', defaultSharePercent: 40, count: 28 },
  { id: 'rc-3', name: 'Live Commerce', defaultSharePercent: 25, count: 19 },
  { id: 'rc-4', name: 'Dịch vụ ngoài', defaultSharePercent: 0, count: 6 },
];

export const MOCK_REVENUE_PLATFORMS = [
  { id: 'rp-1', name: 'TikTok Live', feePercent: 10, settlementCycle: 'Hàng tuần' },
  { id: 'rp-2', name: 'Bigo Live', feePercent: 20, settlementCycle: '15 ngày' },
  { id: 'rp-3', name: 'Shopee Live', feePercent: 10, settlementCycle: 'Cuối tháng' },
  { id: 'rp-4', name: 'Offline Studio', feePercent: 0, settlementCycle: 'Theo hợp đồng' },
];

export const MOCK_FINANCE_SCOPES: Record<
  'month' | 'quarter' | 'year' | 'all',
  {
    label: string;
    grossRevenue: number;
    platformFees: number;
    netRevenue: number;
    idolPayout: number;
    grossProfit: number;
    grossMarginPercent: number;
    netSalaryPayout: number;
    totalCompanyExpense: number;
    operatingFixedCost: number;
    laborInsuranceCost: number;
    netProfit: number;
    revenueGrowth: number;
    expenseGrowth: number;
  }
> = {
  month: {
    label: 'Tháng 10/2026',
    grossRevenue: 201000000,
    platformFees: 24500000,
    netRevenue: 176500000,
    idolPayout: 52070000,
    grossProfit: 124430000,
    grossMarginPercent: 70.5,
    netSalaryPayout: 84616000,
    totalCompanyExpense: 112600000,
    operatingFixedCost: 19500000,
    laborInsuranceCost: 8484000,
    netProfit: 11830000,
    revenueGrowth: 14.2,
    expenseGrowth: 4.8,
  },
  quarter: {
    label: 'Quý 4/2026 (Lũy kế)',
    grossRevenue: 589000000,
    platformFees: 71200000,
    netRevenue: 517800000,
    idolPayout: 149500000,
    grossProfit: 368300000,
    grossMarginPercent: 71.1,
    netSalaryPayout: 248900000,
    totalCompanyExpense: 318400000,
    operatingFixedCost: 58500000,
    laborInsuranceCost: 24100000,
    netProfit: 49900000,
    revenueGrowth: 18.6,
    expenseGrowth: 6.1,
  },
  year: {
    label: 'Năm 2026',
    grossRevenue: 2145000000,
    platformFees: 262000000,
    netRevenue: 1883000000,
    idolPayout: 541200000,
    grossProfit: 1341800000,
    grossMarginPercent: 71.3,
    netSalaryPayout: 912400000,
    totalCompanyExpense: 1168200000,
    operatingFixedCost: 214000000,
    laborInsuranceCost: 89600000,
    netProfit: 173600000,
    revenueGrowth: 24.4,
    expenseGrowth: 9.2,
  },
  all: {
    label: 'Toàn thời gian (2024 - 2026)',
    grossRevenue: 4920000000,
    platformFees: 601000000,
    netRevenue: 4319000000,
    idolPayout: 1218000000,
    grossProfit: 3101000000,
    grossMarginPercent: 71.8,
    netSalaryPayout: 2064000000,
    totalCompanyExpense: 2684000000,
    operatingFixedCost: 486000000,
    laborInsuranceCost: 204000000,
    netProfit: 417000000,
    revenueGrowth: 31.0,
    expenseGrowth: 11.4,
  },
};

export const MOCK_FINANCE_TREND_POINTS = [
  { label: '06/2026', revenue: 142, expenses: 118, profit: 24 },
  { label: '07/2026', revenue: 158, expenses: 126, profit: 32 },
  { label: '08/2026', revenue: 164, expenses: 131, profit: 33 },
  { label: '09/2026', revenue: 171, expenses: 139, profit: 32 },
  { label: '10/2026', revenue: 177, expenses: 165, profit: 12 },
];

export const MOCK_FINANCE_EXPENSES = [
  { id: 'exp-1', date: '05/10/2026', title: 'Thuê mặt bằng Studio Q7 + Phòng Live', category: 'Vận hành & Mặt bằng', facility: 'Cơ sở Quận 7', amount: 28000000, status: 'paid' as const },
  { id: 'exp-2', date: '12/10/2026', title: 'Chạy Ads đẩy livestream Mega 10.10', category: 'Marketing & Ads', facility: 'Toàn hệ thống', amount: 14500000, status: 'approved' as const },
  { id: 'exp-3', date: '19/10/2026', title: 'Bảo trì micro Neumann & đèn Studio A', category: 'Thiết bị & Kỹ thuật', facility: 'Cơ sở Phú Nhuận', amount: 6400000, status: 'paid' as const },
  { id: 'exp-4', date: '25/10/2026', title: 'Mua trang phục biểu diễn Gala Q4', category: 'Phục trang & Makeup', facility: 'Cơ sở Quận 7', amount: 8900000, status: 'pending' as const },
];

export const MOCK_PAYROLL_PERIODS = [
  { id: 'per-2026-10', period: '2026-10', status: 'pending_approval' as const, employeeCount: 6, actualCount: 6, calendarNotice: 'Theo lịch trả lương 2026-10: Đã mở trình & phê duyệt từ 01/11/2026.' },
  { id: 'per-2026-09', period: '2026-09', status: 'locked_paid' as const, employeeCount: 6, actualCount: 6, calendarNotice: 'Kỳ lương 09/2026 đã chốt sổ và giải ngân hoàn tất.' },
  { id: 'per-2026-11', period: '2026-11', status: 'draft' as const, employeeCount: 7, actualCount: 6, calendarNotice: 'Chỉ được gửi duyệt từ 01/12/2026; đang phát hiện 1 nhân sự mới cần đồng bộ.' },
];

export const MOCK_ADMIN_LEAVES = [
  { id: 'lv-1', employeeName: 'Minh Anh (Aria)', department: 'Nhóm Idol Biểu Diễn & Donate (PK)', type: 'Nghỉ phép năm', days: 2, range: '18/11 - 19/11/2026', policyTier: 'manager' as const, status: 'pending' as const, reason: 'Việc gia đình tại Đà Nẵng' },
  { id: 'lv-2', employeeName: 'Bảo Ngọc (Luna)', department: 'Nhóm Idol Biểu Diễn & Donate (PK)', type: 'Nghỉ dài ngày', days: 4, range: '22/11 - 25/11/2026', policyTier: 'director' as const, status: 'pending' as const, reason: 'Điều trị chấn thương cổ chân' },
  { id: 'lv-3', employeeName: 'Tuấn Kiệt (Kay)', department: 'Nhóm Streamer Gaming & Gear', type: 'Nghỉ phép năm', days: 1, range: '09/11/2026', policyTier: 'auto' as const, status: 'approved' as const, reason: 'Khám sức khỏe định kỳ (Tự động duyệt 1 ngày)' },
];

export const MOCK_ADMIN_USERS = [
  { id: 'u-1', username: 'admin', name: 'Nguyễn Quản Trị', role: 'Super Admin', department: 'Ban Điều Hành', status: 'active' as const, actions: ['Tất cả quyền hệ thống (isSuperAdmin)'] },
  { id: 'u-2', username: 'hr_admin', name: 'Lê Minh Thư', role: 'HR & Kế Toán', department: 'Kế Toán & Nhân Sự', status: 'active' as const, actions: ['manage_payroll', 'manage_finance', 'manage_revenue', 'manage_leave_approvals'] },
  { id: 'u-3', username: 'nam_lead', name: 'Phạm Hoàng Nam', role: 'Quản Lý Team', department: 'Nhóm Idol Biểu Diễn & Donate (PK)', status: 'active' as const, actions: ['manage_schedule', 'manage_tasks', 'manage_work_assignments', 'manage_kpi'] },
  { id: 'u-4', username: 'anhtm', name: 'Minh Anh (Aria)', role: 'Idol / Talent', department: 'Nhóm Idol Biểu Diễn & Donate (PK)', status: 'active' as const, actions: ['view_personal_dashboard', 'view_personal_payroll', 'submit_disputes'] },
];

export const MOCK_ADMIN_DEPARTMENTS = [
  { id: 'd-1', name: 'Nhóm Idol Biểu Diễn & Donate (PK)', block: 'Khối Nghệ Sĩ', lead: 'Phạm Hoàng Nam', headcount: 8 },
  { id: 'd-2', name: 'Nhóm Live Commerce & Review', block: 'Khối Nghệ Sĩ', lead: 'Trần Thu Hà', headcount: 6 },
  { id: 'd-3', name: 'Nhóm Streamer Gaming & Gear', block: 'Khối Nghệ Sĩ', lead: 'Tuấn Kiệt (Kay)', headcount: 5 },
  { id: 'd-4', name: 'Kế Toán & Nhân Sự', block: 'Khối Văn Phòng', lead: 'Lê Minh Thư', headcount: 4 },
  { id: 'd-5', name: 'Đối Tác Dịch Vụ Ngoài', block: 'Đối Tác', lead: 'Nguyễn Quản Trị', headcount: 3 },
];

export const MOCK_ADMIN_PERSONNEL_TYPES = ['Công ty', 'Cộng tác viên', 'Thực tập sinh', 'Outsource', 'Dịch vụ ngoài'];
export const MOCK_ADMIN_STATUSES = ['Đang hoạt động', 'Tạm nghỉ', 'Thử việc', 'Đã nghỉ việc'];

export const MOCK_ADMIN_CRITERIA = [
  { id: 'cr-1', name: 'Kỹ năng Biểu diễn / Sản xuất Nội dung', weight: 30, maxScore: 100 },
  { id: 'cr-2', name: 'Tương tác Live & Giữ Chân Khán Giả', weight: 25, maxScore: 100 },
  { id: 'cr-3', name: 'Doanh số GMV / Donate PK', weight: 30, maxScore: 100 },
  { id: 'cr-4', name: 'Kỷ luật & Giờ Lên Sóng', weight: 15, maxScore: 100 },
];

