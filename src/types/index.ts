export type IdolStatus = string;

export interface SocialLinks {
  email?: string;
  linkedin?: string;
  instagram?: string;
  tiktok?: string;
  phone?: string;
}

// 3 Loại hình Idol chuyên biệt của Agency
export type IdolCategoryType =
  | 'gaming_gear'          // 1. Idol Nữ chơi game, quảng bá game & thiết bị/dụng cụ chơi game -> gắn giỏ hàng
  | 'performance_donate'   // 2. Nhảy, hát, làm theo yêu cầu, kiếm donate từ kèo/fan, lồng ghép đồ nhãn hàng gửi -> gắn giỏ hàng
  | 'live_commerce';       // 3. Giới thiệu sản phẩm thời trang, mỹ phẩm,... chốt đơn trên live

export interface CommercialDetails {
  // Loại 1: Gaming & Gear
  gameTitles?: string[]; // Tựa game quảng bá (Liên Quân, Valorant, Genshin...)
  gearBrands?: string[]; // Thiết bị chơi game (Tai nghe, Bàn phím, Chuột, Ghế gaming, Tay cầm...)
  cartLinkGaming?: string;

  // Loại 2: Performance & Donate
  talents?: string[]; // Hát, Nhảy, Làm theo yêu cầu, PK đấu kèo...
  sponsorBrands?: string[]; // Đồ nhãn hàng gửi: Quần áo, thời trang, mỹ phẩm, trang sức...
  cartLinkSponsor?: string;

  // Loại 3: Live Commerce
  commerceCategories?: string[]; // Thời trang, Mỹ phẩm, Skincare, Phụ kiện...
  targetGmvPerLive?: number; // Target doanh số / phiên live (VNĐ)
  cartLinkCommerce?: string;
}

export type PersonnelColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean';

export type PersonnelFieldSensitivity = 'public' | 'internal' | 'sensitive';

export type PersonnelCustomFieldValue = string | number | boolean | null;

export type PersonnelCustomFields = Record<string, PersonnelCustomFieldValue>;

export interface PersonnelColumn {
  id: string;
  key: string;
  label: string;
  type: PersonnelColumnType;
  options?: string[];
  required: boolean;
  isVisible: boolean;
  isActive: boolean;
  sortOrder: number;
  showInRoster: boolean;
  showInProfile: boolean;
  sensitivity?: PersonnelFieldSensitivity;
  isSystem?: boolean;
}

export const IDOL_CATEGORIES_CONFIG: Record<IdolCategoryType, {
  id: IdolCategoryType;
  label: string;
  shortLabel: string;
  icon: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  defaultDepartment: string;
}> = {
  gaming_gear: {
    id: 'gaming_gear',
    label: 'Idol Nữ Gaming & Gear',
    shortLabel: 'Gaming & Gear',
    icon: '🎮',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-700',
    description: 'Nữ chơi game, quảng bá tựa game & thiết bị chơi game (tai nghe, chuột, phím cơ, ghế...) gắn giỏ hàng',
    defaultDepartment: 'Nhóm Idol Gaming & Gear'
  },
  performance_donate: {
    id: 'performance_donate',
    label: 'Idol Biểu Diễn & Donate (PK)',
    shortLabel: 'Biểu Diễn & Donate',
    icon: '🎤',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText: 'text-rose-700',
    description: 'Hát, nhảy, làm theo yêu cầu, kiếm donate từ kèo PK/fan, lồng ghép đồ nhãn hàng gửi gắn giỏ hàng',
    defaultDepartment: 'Nhóm Idol Biểu Diễn & Donate (PK)'
  },
  live_commerce: {
    id: 'live_commerce',
    label: 'Idol Live Commerce Chốt Đơn',
    shortLabel: 'Live Commerce',
    icon: '🛍️',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-700',
    description: 'Giới thiệu sản phẩm thời trang, mỹ phẩm, skincare... chốt đơn trực tiếp trên live',
    defaultDepartment: 'Nhóm Idol Live Commerce & Chốt Đơn'
  }
};

export interface Idol {
  id: string;
  stt?: number; // Dynamic UI sequence order (not hardcoded DB primary identifier)
  stageName: string;
  realName: string;
  dob: string; // YYYY-MM-DD
  joinDate?: string; // YYYY-MM-DD (Thời điểm vào công ty / đơn vị)
  resignedDate?: string; // YYYY-MM-DD (Ngày thôi việc / nghỉ việc chính thức)
  role: string;
  weight: number; // in kg
  height: number; // in cm
  hometown: string;
  currentLiving: string;
  department: string;
  personnelType?: 'Công ty' | 'Outsource' | 'Cộng tác viên' | 'Thực tập sinh' | 'Dịch vụ ngoài' | string;
  status: IdolStatus;
  avatarUrl: string;
  bio: string;
  socialLinks: SocialLinks;
  workSchedule?: WorkScheduleSlot[];
  userId?: string; // ID của tài khoản UserAccount tương ứng
  accountUsername?: string; // Tên đăng nhập nội bộ của Idol
  accountPassword?: string; // Mật khẩu tài khoản nội bộ của Idol
  isIdol?: boolean; // true = Là Idol / Nghệ sĩ công ty; false = Nhân viên vận hành phòng ban
  cooperationType?: 'internal' | 'service_guest' | 'event_contract'; // Phân loại hợp tác: nội bộ vs khách thuê dịch vụ
  serviceNotes?: string; // Ghi chú về gói dịch vụ khách thuê (thuê studio live, chụp ảnh, makeup...)
  assignedRole?: string; // ID Role tương ứng (e.g. 'idol_exclusive', 'streamer_gaming', etc.)
  phone?: string;
  bankName?: string; // Tên ngân hàng nhận lương
  bankAccountNumber?: string; // Số tài khoản ngân hàng
  bankAccountName?: string; // Tên chủ tài khoản
  citizenId?: string; // Số CCCD / CMND
  baseSalary?: number; // Mức lương cứng / trợ cấp thỏa thuận hàng tháng (VNĐ) do HR nhập
  activityCodes?: string[];
  primaryActivityCode?: string;
  activities?: PersonnelActivityProfile[];
  idolCategory?: IdolCategoryType; // 1 trong 3 loại Idol chuyên biệt
  commercialDetails?: CommercialDetails; // Chi tiết giỏ hàng, nhãn hàng, game & tài trợ
  customFields?: PersonnelCustomFields;
  createdAt: string;
}

export interface PersonnelActivityType {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface PersonnelActivityProfile {
  id: string;
  activityTypeId: string;
  code: string;
  name: string;
  isPrimary: boolean;
  metadata?: Record<string, unknown>;
}

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'custom';
export type ScheduleRepeatType = 'fixed_year' | 'fixed_month' | 'specific_date';

export interface WorkScheduleSlot {
  id: string;
  idolId: string;
  activityCode?: string;
  dayOfWeek: number; // 1 = Thứ Hai, 2 = Thứ Ba, 3 = Thứ Tư, 4 = Thứ Năm, 5 = Thứ Sáu, 6 = Thứ Bảy, 7 = Chủ Nhật
  shiftType: ShiftType; // 'morning' (Ca Sáng), 'afternoon' (Ca Chiều), 'evening' (Ca Tối), 'custom' (Khung giờ tùy chỉnh)
  startTime: string; // "09:00", "14:00", "19:30"
  endTime: string; // "12:00", "18:00", "23:30"
  platform: string; // "TikTok Live", "Bigo Live", "Shopee Live", "Facebook Live", "Studio Agency", "Tại Nhà"
  title: string; // "Live Stream PK", "Live Hát & Giao Lưu", "Live Bán Hàng", "Tập Luyện"
  notes?: string;
  isActive: boolean;
  repeatType?: ScheduleRepeatType; // 'fixed_year' (Cả năm / lặp tuần) | 'fixed_month' (Cả tháng) | 'specific_date' (Ngày cụ thể)
  specificMonth?: string; // YYYY-MM (Ví dụ: "2026-10") khi áp dụng cố định cho cả tháng
  specificDate?: string; // YYYY-MM-DD (Ví dụ: "2026-10-28") khi áp dụng cho ngày cụ thể
}

export interface Criterion {
  id: string;
  name: string;
  code: string;
  maxScore: number;
  weight: number; // percentage, e.g., 20
  description?: string;
  priorityOrder: number; // For tie-breaker resolution (1 = highest priority)
}

export interface ScoreItem {
  criterionId: string;
  score: number;
}

export interface IdolScoreRecord {
  id: string;
  idolId: string;
  period: string; // e.g. "2026-Q3", "2026-10", "all"
  scores: Record<string, number>; // criterionId -> numeric score
  totalScore: number;
  averageScore: number;
  evaluatorNotes?: string;
  evaluatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  timeSpentMinutes: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskCategory =
  | 'Luyện tập'
  | 'Biểu diễn'
  | 'PK & Donate'
  | 'Livestream & Gaming'
  | 'Livestream & Chốt đơn'
  | 'Quay chụp & Phỏng vấn'
  | 'Quảng bá sản phẩm'
  | 'Ghi âm & Sản xuất'
  | 'Học tập & Vũ đạo';

export interface IdolTask {
  id: string;
  idolId: string;
  activityCode?: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  startTime?: string; // ISO date-time string
  endTime?: string; // ISO date-time string
  loggedDurationMinutes: number;
  subtasks: Subtask[];
  createdAt: string;
  dueDate?: string;
}

export type WorkAssignmentType = 'business_trip' | 'client_meeting' | 'brand_change' | 'shoot_with_manager' | 'event' | 'other';
export type WorkAssignmentStatus = 'published' | 'cancelled' | 'completed';
export type WorkAssignmentResponseStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'overdue';
export type WorkAssignmentPenaltyType = 'none' | 'fixed' | 'percentage';
export type WorkAssignmentRestPortion = 'none' | 'half' | 'full';

export interface WorkAssignmentAssignee {
  id: string;
  assignmentId: string;
  personnelId: string;
  personnelName: string;
  stageName?: string;
  department: string;
  /** Contract salary snapshot used to preview percentage penalties for this assignee. */
  contractSalary?: number;
  responseStatus: WorkAssignmentResponseStatus;
  responseNote?: string;
  respondedAt?: string;
  completedAt?: string;
  completedNote?: string;
  violationStatus: 'none' | 'under_review' | 'confirmed' | 'waived';
  penaltyAmount?: number;
  violationNote?: string;
  reviewedAt?: string;
  waiverRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  /** Legacy display alias retained for timeline consumers. */
  waiverStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  waiverRequestReason?: string;
  waiverRequestedAt?: string;
  waiverDecision?: 'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty';
  penaltyRate?: number;
  waiverReviewedAt?: string;
  waiverReviewedById?: string;
  waiverReviewNote?: string;
  restDayDate?: string;
  restDayPortion?: WorkAssignmentRestPortion;
}

export interface WorkAssignment {
  id: string;
  title: string;
  description?: string;
  assignmentType: WorkAssignmentType | string;
  mandatory: boolean;
  penaltyType?: WorkAssignmentPenaltyType;
  penaltyValue?: number;
  startAt?: string;
  endAt?: string;
  acceptanceDeadline?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledById?: string;
  location?: string;
  restDayDate?: string;
  restDayPortion?: WorkAssignmentRestPortion;
  status: WorkAssignmentStatus | string;
  createdById: string;
  createdByName?: string;
  assignees: WorkAssignmentAssignee[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardRank {
  rank: number;
  idol: Idol;
  scoreRecord: IdolScoreRecord;
  totalScore: number;
  tieBreakerApplied: boolean;
  tieBreakerReason?: string;
}

export interface ColumnHeadersConfig {
  stt: string;
  stageName: string;
  realName: string;
  age: string;
  dob: string;
  joinDate?: string; // Thời điểm vào
  tenure?: string;   // Thâm niên
  role: string;
  height: string;
  weight: string;
  hometown: string;
  currentLiving: string;
  department: string;
  personnelType?: string;
  status: string;
  actions: string;
}

export type ScoreCalculationMode = 'sum' | 'weighted';
export type PeriodFilterMode = 'month' | 'quarter' | 'all';

export interface AppSettings {
  referenceYear: number;
  referenceDate?: string; // YYYY-MM-DD. Mốc tính tuổi và thâm niên chính xác theo ngày. Nếu trống, mặc định lấy ngày hiện tại.
  referenceTime?: string; // HH:mm. Giờ nghiệp vụ chuẩn khi dùng referenceDate.
  referenceClockAnchorAt?: string; // ISO timestamp thực làm mốc để đồng hồ tham chiếu chạy liên tục.
  brandName?: string;     // Tên banner / thương hiệu bên trên (e.g. AURA TALENT)
  brandTagline?: string;  // Biểu ngữ / slogan (e.g. Idol Agency OS)
  brandLogoUrl?: string;  // Logo công ty
  tieBreakerEnabled: boolean;
  tieBreakerCriteriaIds: string[];
  scoreCalculationMode?: ScoreCalculationMode; // 'sum' = Tổng điểm cộng dồn các tiêu chí, 'weighted' = Điểm theo trọng số %
  departmentParentMap?: Record<string, string>; // Ánh xạ Nhóm con -> Phòng ban mẹ (VD: { 'Nhóm Gaming': 'Phòng Quản Lý & Phát Triển Idol' })
  departmentLeaders?: Record<string, { id: string; name: string; title?: string }>; // Trưởng phòng / Leader của từng đơn vị
}

/** Request-only command flag; never persisted as an AppSettings field. */
export type AppSettingsUpdate = Partial<AppSettings> & {
  resetReferenceClockAnchor?: boolean;
};

export type AppTabPermission = 'roster' | 'scoring' | 'leaderboard' | 'schedule' | 'tasks' | 'analytics' | 'admin' | 'my_dashboard' | 'work_assignments' | 'payroll' | 'payroll_disputes' | 'kpi' | 'revenue' | 'finance' | 'service_usage';

export type AppActionPermission =
  | 'manage_idols'        // Thêm, sửa, xóa hồ sơ nhân sự
  | 'manage_scores'       // Nhập điểm và lưu bảng điểm
  | 'manage_criteria'     // Thêm, sửa, xóa tiêu chí chấm điểm
  | 'manage_schedule'     // Thiết lập lịch làm việc & ca live
  | 'manage_tasks'        // Thêm, sửa, xóa nhiệm vụ & bấm giờ
  | 'manage_work_assignments' // Giao công tác/công việc cho nhân sự
  | 'manage_departments'  // Quản lý danh mục đơn vị & trạng thái
  | 'manage_settings'     // Cấu hình năm tham chiếu, tiêu đề cột, tie-breaker
  | 'manage_approvals'    // Phê duyệt yêu cầu thêm/xóa nhân sự
  | 'manage_payroll'      // Xem và lập dự thảo bảng lương
  | 'adjust_payroll'      // Kế toán điều chỉnh các khoản thu chi
  | 'approve_payroll'     // Giám đốc phê duyệt bảng lương
  | 'hot_bonus'           // Giám đốc thưởng nóng cho nhân sự
  | 'manage_kpi'          // Quản lý nhóm chỉ định và thiết đặt chỉ tiêu KPI
  | 'manage_revenue';     // Quản lý doanh thu, tỷ lệ chia sẻ & đối soát hoa hồng

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string; // 'super_admin' | 'judge' | 'manager' | 'viewer' | 'custom'
  roleTitle: string; // e.g. 'Giám Đốc Điều Hành', 'Huấn Luyện Viên', 'Quản Lý Nghệ Sĩ'
  accountType?: 'system_admin' | 'personnel';
  department?: string; // Phòng ban / Đơn vị công tác chính
  allowedTabs: AppTabPermission[];
  allowedDepartments?: string[]; // Danh sách đơn vị được phép xem. Nếu rỗng hoặc chứa '*' là xem tất cả
  allowedActions?: AppActionPermission[]; // Danh sách hành động được phép thực hiện
  avatarUrl?: string;
  password?: string;
  isSuperAdmin?: boolean;
  isBusinessAdmin?: boolean;
  roleCodes?: string[]; // Các role được gán trực tiếp; một tài khoản có thể có nhiều role
  idolId?: string; // Liên kết trực tiếp tới ID của Idol nếu tài khoản này là của Idol
  isIdol?: boolean; // Phân biệt tài khoản Idol với tài khoản vận hành có hồ sơ nhân sự liên kết
  phone?: string;
  address?: string;
  currentLiving?: string;
  stageName?: string;
  realName?: string;
  dob?: string;
  hometown?: string;
  height?: number;
  weight?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  citizenId?: string;
  baseSalary?: number; // Mức lương cứng hợp đồng hàng tháng
  joinDate?: string; // Ngày gia nhập công ty (YYYY-MM-DD)
  resignedDate?: string; // Ngày thôi việc / nghỉ việc chính thức (YYYY-MM-DD)
  status?: string; // Trạng thái: 'Đang hoạt động' | 'Tạm dừng' | 'Đã nghỉ việc'
  personnelType?: string; // Khối Vận Hành, Ban Giám Đốc, Công ty...
}

export type ApprovalType = 'create_idol' | 'delete_idol' | 'update_idol' | 'leave_request';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  requestedBy: {
    id: string;
    username: string;
    name: string;
    roleTitle: string;
  };
  targetIdolId?: string;
  targetPersonnelId?: string;
  targetName: string;
  data?: any;
  reason?: string;
  reviewedBy?: {
    id: string;
    name: string;
  };
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

// Hệ thống Xin Nghỉ Phép (Leave Request) dành cho Idol
export type LeaveType = 'annual' | 'sick' | 'personal';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  idolId: string;
  idolName: string;
  department: string;
  leaveType: LeaveType; // 'annual' = Phép năm, 'sick' = Ốm đau, 'personal' = Việc riêng
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  annualLeaveDays?: number;
  unpaidLeaveDays?: number;
  allocationConfirmed?: boolean;
  reason: string;
  status: LeaveStatus;
  approverRoleRequired?: 'auto' | 'manager' | 'director'; // 'auto' (1 ngày), 'manager' (2 ngày), 'director' (>= 3 ngày)
  autoApproved?: boolean;
  createdAt: string;
  reviewedBy?: {
    id: string;
    name: string;
  };
  reviewNote?: string;
  reviewedAt?: string;
}

export interface IdolLeaveBalance {
  totalAnnualDays: number;
  usedDays: number;
  remainingDays: number;
  formulaExplanation?: string;
}

// Bảng Lương (Payroll Management)
export type PayrollStatus = 'draft' | 'pending_approval' | 'approved' | 'locked_paid';

export interface PayrollPeriod {
  id: string; // e.g. "payroll-2026-10"
  period: string; // "2026-10"
  status: PayrollStatus;
  totalGross: number; // Tổng lương gộp
  totalKpiBonus?: number; // Tổng thưởng KPI & hoa hồng
  totalDeductions: number; // Tổng giảm trừ
  totalHotBonus: number; // Tổng thưởng nóng từ Giám Đốc
  totalNet: number; // Tổng thực chi
  employeeCount: number;
  feedbackStartsAt?: string;
  approvalStartsAt?: string;
  lockStartsAt?: string;
  submittedBy?: {
    id: string;
    name: string;
    roleTitle: string;
  };
  submittedAt?: string;
  approvedBy?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  lockedAt?: string;
  createdAt: string;
}

export interface PayrollAdjustmentLog {
  updatedBy: string;
  updatedAt: string;
  field: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
}

export interface PayrollRecord {
  id: string;
  periodId: string;
  period: string; // "2026-10"
  /** Workflow status of the payroll period that owns this payslip. */
  periodStatus?: PayrollStatus;
  userId: string;
  idolId?: string;
  employeeName: string;
  stageName?: string;
  department: string;
  personnelType: string;
  roleTitle?: string;
  isIdol: boolean;

  // Thông tin ngân hàng nhận lương (bảo mật, chỉ đọc từ hồ sơ)
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  // 1. Các khoản thu nhập (Earnings)
  contractSalarySnapshot?: number;
  salaryEffectiveFromSnapshot?: string;
  salarySnapshotAt?: string;
  salaryHistoryId?: string;
  snapshotSource?: 'explicit_snapshot' | 'legacy_evidence' | 'missing_snapshot';
  earnings: {
    baseSalary: number; // Lương cứng thực tế nhận trong kỳ (đã tính theo tỷ lệ ngày công nếu vào/nghỉ giữa kỳ)
    contractBaseSalary?: number; // Mức lương hợp đồng nguyên tháng do HR nhập
    standardWorkDays?: number; // Tổng số ngày công chuẩn của tháng (VD: 26 hoặc 27 công)
    actualWorkDays?: number; // Số ngày công làm việc thực tế trong kỳ
    workRatio?: number; // Tỷ lệ hưởng lương ngày công (actualWorkDays / standardWorkDays, 0 - 1.0)
    workDaysExplanation?: string; // Diễn giải công thức ngày công

    // Tăng ca & Làm thêm giờ (Overtime)
    overtimePay?: number; // Tiền lương làm thêm giờ (tăng ca)
    otNormalHours?: number; // Giờ tăng ca ngày thường (hệ số 1.5x)
    otWeekendHours?: number; // Giờ làm thêm ngày nghỉ cuối tuần (hệ số 2.0x)
    otHolidayHours?: number; // Giờ làm thêm ngày lễ/Tết (hệ số 3.0x)
    hourlyRate?: number; // Đơn giá lương 1 giờ làm việc tiêu chuẩn
    workAssignmentBaseHours?: number;
    workAssignmentPremiumHours?: number;
    workAssignmentBasePay?: number;
    workAssignmentPremiumPay?: number;
    workAssignmentPay?: number;
    workAssignmentRestDay?: string;

    kpiBonus: number; // Thưởng KPI vận hành
    commissionGmv?: number; // Hoa hồng GMV bán hàng
    giftShare?: number; // Chia sẻ doanh thu quà PK
    allowance: number; // Phụ cấp ăn trưa / ca đêm (đã tính theo công thực tế)
    hotBonus?: number; // ⚡ Thưởng nóng từ Giám Đốc
    hotBonusReason?: string; // Lý do Giám Đốc thưởng nóng
    hotBonusAwardedBy?: string; // Tên Giám Đốc thưởng
    hotBonusAwardedAt?: string;
    otherBonus?: number; // Thưởng khác
    totalGross: number; // Tổng thu nhập trước thuế
  };

  // 2. Các khoản giảm trừ (Deductions)
  deductions: {
    liveHoursPenalty?: number; // Phạt thiếu giờ live
    unpaidLeaveDeduction?: number; // Trừ ngày nghỉ không phép
    advancePayment?: number; // Tạm ứng trong tháng
    tax?: number; // Thuế TNCN
    insurance?: number; // BHXH, BHYT
    otherPenalty?: number; // Kỷ luật khác
    otherPenaltyReason?: string;
    totalDeductions: number; // Tổng giảm trừ
  };

  // 3. Thực nhận
  netSalary: number; // totalGross - totalDeductions

  // 4. Chi phí Bảo hiểm & Ngân sách Nhân sự Công ty gánh chịu
  companyInsuranceAmount?: number; // 21.5% lương đóng BH (17.5% BHXH + 3% BHYT + 1% BHTN)
  totalCompanyLaborCost?: number; // totalGross + companyInsuranceAmount

  // 5. Trạng thái thanh toán
  paymentStatus: 'pending' | 'paid';
  paidAt?: string;
  paymentRef?: string;
  notes?: string;

  // Lịch sử điều chỉnh của Kế toán & Giám Đốc
  adjustmentLogs?: PayrollAdjustmentLog[];
}

export type PayrollDisputeStatus = 'submitted' | 'under_review' | 'adjusted' | 'resolved' | 'rejected' | 'cancelled';
export type PayrollDisputeCategory = 'attendance' | 'live_hours' | 'leave' | 'deduction' | 'salary' | 'kpi_bonus' | 'other';

export interface PayrollDispute {
  id: string;
  periodId: string;
  recordId: string;
  personnelId: string;
  category: PayrollDisputeCategory;
  systemValue: Record<string, unknown>;
  requestedValue: Record<string, unknown>;
  reason: string;
  evidenceUrl?: string;
  status: PayrollDisputeStatus;
  submittedById?: string;
  submittedByName?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollDisputeInboxItem extends PayrollDispute {
  period: string;
  payrollStatus: PayrollStatus;
  employeeName: string;
  stageName?: string;
  department: string;
  currentValue?: Record<string, unknown>;
}

export type PayrollScopeType = 'month' | 'quarter' | 'year' | 'all';

export interface MacroPayrollSummary {
  allTime: {
    gross: number;
    kpi: number;
    hot: number;
    deductions: number;
    net: number;
    periodCount: number;
    firstPeriod: string;
    latestPeriod: string;
  };
  byYear: Record<string, {
    year: string;
    gross: number;
    kpi: number;
    hot: number;
    deductions: number;
    net: number;
    periodCount: number;
    avgEmployees: number;
    months: string[];
  }>;
  byQuarter: Record<string, {
    year: string;
    quarter: string;
    quarterKey: string;
    label: string;
    gross: number;
    kpi: number;
    hot: number;
    deductions: number;
    net: number;
    periodCount: number;
    months: string[];
  }>;
}

export interface AggregatedPayrollPersonnel {
  userId: string;
  idolId?: string;
  employeeName: string;
  stageName?: string;
  roleTitle?: string;
  department: string;
  personnelType: string;
  isIdol: boolean;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  totalBaseSalary: number;
  totalKpiBonus: number;
  totalAllowance: number;
  totalHotBonus: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  periodCount: number;
}

export type KpiScopeType = 'group' | 'individual';
export type KpiTargetUnit = 'VND' | 'hours' | 'sessions' | 'matches' | 'contracts' | 'percent' | 'points' | 'custom';
export type KpiPeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface KpiGroup {
  id: string;
  name: string;                  // Tên nhóm (VD: "Đội Chiến Dịch Mega Sale 11.11", "Tổ Livestream Đêm")
  description?: string;          // Mục tiêu hoạt động của nhóm
  type: 'system' | 'custom';     // 'system' = Nhóm mặc định hệ thống; 'custom' = Nhóm nhân viên chỉ định do quản lý tự tạo
  category?: 'idol' | 'corporate' | 'mixed'; // Khối Idol, Khối Vận hành, hoặc Hỗn hợp
  department?: string;           // Tên phòng ban liên kết (nếu có)
  memberIds: string[];           // Danh sách ID nhân sự (Idol hoặc Staff) được chỉ định vào nhóm
  leaderId?: string;             // ID của Trưởng nhóm / Leader chỉ định (tùy chọn)
  createdAt: string;
  updatedAt: string;
}

export interface KpiSetting {
  id: string;
  code: string;                  // Mã KPI (VD: GMV_COMMERCE, STREAM_HOURS, PK_WINS, BOOKING_SALES,...)
  name: string;                  // Tên hiển thị (VD: "Doanh số GMV Live Commerce", "Số giờ live tối thiểu")
  description?: string;          // Diễn giải chỉ tiêu
  unit: string;                  // Đơn vị tính: VNĐ, Giờ, Phiên live, Trận PK, Hợp đồng, Video,...
  customUnitLabel?: string;      // Nhãn đơn vị nếu tùy biến

  // Cấp độ áp dụng
  scopeType: KpiScopeType;
  groupId?: string;              // Áp dụng cho Nhóm chỉ định (KpiGroup)
  assignedIdolId?: string;       // Áp dụng riêng cho Cá nhân cụ thể (Idol hoặc Staff)
  activityCode?: string;          // Hoạt động Idol mà bộ chỉ tiêu này đo lường

  // Mức chỉ tiêu & Trọng số
  period: KpiPeriodType;         // monthly | quarterly | yearly
  targetValue: number;           // Mức chỉ tiêu cần đạt (VD: 50,000,000 hoặc 60)
  minThreshold?: number;         // Ngưỡng tối thiểu cần đạt
  weight: number;                // Trọng số % (1 - 100)

  // Chính sách thưởng
  bonusIncentive?: {
    ratePercent?: number;        // Thưởng % vượt chỉ tiêu
    flatBonusVnd?: number;       // Thưởng nóng cố định (VNĐ) khi hoàn thành 100%
  };

  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}


// ==========================================
// PHÂN HỆ QUẢN LÝ DOANH THU & ĐỐI SOÁT (REVENUE)
// ==========================================

export interface RevenueCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  defaultIdolShareRate: number;
  color?: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface RevenuePlatform {
  id: number;
  code: string;
  name: string;
  defaultFeeRate: number;
  feeType: 'percentage' | 'fixed';
  isActive: boolean;
}

export interface RevenueDeductionItem {
  id?: string;
  transactionId?: string;
  name: string;
  deductionType: 'platform_fee' | 'production_cost' | 'tax' | 'other';
  amount: number;
  proofUrl?: string;
}

export interface RevenueTransaction {
  id: string;
  transactionCode: string;
  personnelId: number;
  personnelName?: string;
  stageName?: string;
  department?: string;
  avatarUrl?: string;
  period: string; // YYYY-MM
  transactionDate: string; // YYYY-MM-DD
  categoryId: number;
  categoryCode?: string;
  categoryName?: string;
  platformId: number;
  platformCode?: string;
  platformName?: string;
  title: string;
  contractRef?: string;
  payoutMode: 'percentage' | 'fixed' | 'hybrid';
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  idolShareRate: number; // CHỈNH SỬA TÙY BIẾN CHO TỪNG DEAL
  fixedPayoutAmount: number;
  idolPayoutAmount: number; // ĐỒNG BỘ SANG BẢNG LƯƠNG
  companyProfitAmount: number;
  rateOverrideReason?: string;
  status: 'draft' | 'verified' | 'synced_to_payroll' | 'cancelled';
  proofUrl?: string;
  notes?: string;
  createdById?: number;
  approvedById?: number;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
  deductions?: RevenueDeductionItem[];
}

export interface RevenueSummary {
  period: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalIdolPayout: number;
  totalCompanyProfit: number;
  totalTransactions: number;
  verifiedCount: number;
  syncedCount: number;
}

export interface ServiceUsageRecord {
  id: string;
  usageCode: string;
  personnelId: number;
  personnelName?: string;
  stageName?: string;
  serviceName: string;
  description?: string;
  usageDate: string;
  startAt?: string;
  endAt?: string;
  quantity: number;
  unit: string;
  location?: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  assignedUserId?: number;
  assignedUserName?: string;
  assignedUserIds?: number[];
  assignedUserNames?: string[];
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  paidAmount: number;
  outstandingAmount: number;
  completionProgress: number;
  contractRef?: string;
  invoiceRef?: string;
  revenueTransactionId?: string;
  notes?: string;
  createdById?: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  paidAt?: string;
  paymentNote?: string;
  payments?: ServiceUsagePayment[];
}

export interface ServiceUsagePayment {
  id: string;
  serviceUsageId: string;
  amount: number;
  paidAt: string;
  paidById?: number;
  paidByName?: string;
  reference?: string;
  note?: string;
}

export type OperationalMetricCode = 'LIVE_HOURS' | 'GMV_LIVE' | 'ENGAGEMENT' | 'GIFT_POINTS';

export interface OperationalMetric {
  id: string;
  personnelId: number;
  period: string;
  metricCode: OperationalMetricCode;
  actualValue: number;
  source?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalKpiMetric {
  actual: number;
  target: number;
  originalTarget?: number;
  adjustedByWorkAssignmentHours?: number;
  affectedWorkAssignmentShifts?: number;
  score: number;
  maxScore: number;
}

export interface OperationalKpiMetricItem extends OperationalKpiMetric {
  code: string;
  label: string;
  unit: string;
  metricKey: 'liveHours' | 'sales' | 'engagement' | 'gifts';
  activityCode?: string;
  activityName?: string;
}

export interface OperationalKpiSummary {
  period: string;
  totalScore: number;
  grade: string;
  items?: OperationalKpiMetricItem[];
  metrics: {
    liveHours: OperationalKpiMetric;
    sales: OperationalKpiMetric;
    engagement: OperationalKpiMetric;
    gifts: OperationalKpiMetric;
  };
}

// ==========================================
// 7. PHÂN HỆ QUẢN LÝ CHI PHÍ & BÁO CÁO TÀI CHÍNH (FINANCE & P&L)
// ==========================================

export type CompanyExpenseCategory =
  | 'LABOR_INSURANCE'
  | 'FACILITY'
  | 'INVESTMENT_CAPEX'
  | 'OPERATIONS_OPEX'
  | 'DYNAMIC_EVENT'
  | 'OTHER';

export interface CompanyExpense {
  id: string;
  expenseCode: string;
  period: string; // YYYY-MM
  expenseDate: string; // YYYY-MM-DD
  category: CompanyExpenseCategory;
  categoryLabel?: string;
  title: string;
  amount: number;
  facilityType?: 'fixed' | 'rented' | null;
  paymentMethod: 'bank_transfer' | 'cash';
  recipient?: string;
  invoiceRef?: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes?: string;
  createdById?: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancePnLSummary {
  scope: 'month' | 'quarter' | 'year' | 'all';
  periodRef: string; // "2026-10", "2026-Q4", "2026", "ALL"

  // 1. Doanh thu
  revenue: {
    grossRevenue: number;
    platformFees: number;
    netRevenue: number;
    byCategory: {
      booking: number;
      liveCommerce: number;
      pkDonate: number;
      externalService: number;
      other: number;
    };
  };

  // 2. Chi phí trực tiếp tạo doanh thu (COGS)
  directCost: {
    idolPayout: number;
    productionCost: number;
    totalDirectCost: number;
  };

  // 3. Lợi nhuận gộp
  grossProfit: number;
  grossMarginPercent: number;

  // 4. Chi phí hoạt động & Vận hành công ty (OpEx)
  expenses: {
    // Chi phí nhân sự & Bảo hiểm
    netSalaryPayout: number; // Lương thực chuyển trả nhân viên & idol
    employeeInsuranceDeduction: number; // 10.5% NV trích đóng
    companyInsurancePaid: number; // 21.5% Công ty nộp cơ quan BHXH
    totalCompanyLaborCost: number; // Tổng chi phí nhân sự thực tế công ty

    // Chi phí mặt bằng & Tiện ích
    facilityCost: number;
    facilityRent: number;
    facilityFixed: number;
    utilitiesCost: number;

    // Chi phí đầu tư thiết bị (CapEx)
    equipmentCapEx: number;

    // Chi phí đi lại, dụng cụ & sửa chữa
    operationsOpEx: number;

    // Chi phí phát sinh động & sự kiện
    dynamicEventCost: number;

    // Chi phí khác
    otherExpenses: number;

    totalOpEx: number;
  };

  // 5. Lợi nhuận thuần trước thuế (Operating Profit / EBIT)
  operatingProfit: number;

  // 6. Thuế TNDN & Lợi nhuận ròng
  corporateTax: number;
  netProfit: number;
  netMarginPercent: number;

  // Thống kê số lượng
  transactionCount: number;
  expenseCount: number;
  payrollPersonnelCount: number;
}

// ==========================================
// BÁO CÁO XU HƯỚNG TĂNG TRƯỞNG & BIỂU ĐỒ (TRENDS & CHARTS)
// ==========================================

export interface FinanceTrendPoint {
  period: string;
  label: string;
  grossRevenue: number;
  netRevenue: number;
  cogsCost: number;       // Giá vốn: Thù lao Idol
  opExCost: number;       // Chi phí hoạt động công ty
  totalExpenses: number;  // cogsCost + opExCost
  grossProfit: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
}

export interface FinanceTrendData {
  series: FinanceTrendPoint[];
  currentPeriod: string;
  previousPeriod: string | null;
  growth: {
    revenueGrowthPercent: number | null; // % tăng trưởng doanh thu
    expensesGrowthPercent: number | null; // % tăng/giảm chi phí
    netProfitGrowthPercent: number | null; // % tăng trưởng lợi nhuận ròng
    netMarginDiffPercent: number | null;  // Điểm % thay đổi biên lợi nhuận ròng
  };
}

export * from './roles.ts';


