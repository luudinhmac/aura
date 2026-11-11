import type { AppActionPermission, AppTabPermission } from './index.ts';

export interface RolePreset {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  category: 'leadership' | 'talent_management' | 'specialized_group' | 'shared_support';
  role: 'super_admin' | 'director' | 'manager' | 'viewer' | 'custom';
  description: string;
  isSuperAdmin?: boolean;
  defaultTabs: AppTabPermission[];
  defaultActions: AppActionPermission[];
  defaultDepartments: string[]; // ['*'] hoặc danh sách phòng ban
}

// 2 Khối Tổ Chức Chuẩn Của Toàn Bộ Hệ Thống Aura Talent
export const ORG_BLOCKS = [
  {
    id: 'idol_block',
    name: 'Khối Idol',
    icon: '⭐',
    description: 'Bao gồm 3 nhóm Idol chuyên biệt trực thuộc công ty',
    departments: [
      'Nhóm Idol Gaming & Gear',
      'Nhóm Idol Biểu Diễn & Donate (PK)',
      'Nhóm Idol Live Commerce & Chốt Đơn'
    ]
  },
  {
    id: 'corporate_block',
    name: 'Khối Phòng Ban Quản Lý & Vận Hành',
    icon: '🏢',
    description: 'Bao gồm 7 phòng ban quản lý, sản xuất, booking và điều hành',
    departments: [
      'Ban Giám Đốc',
      'HR & Kế Toán',
      'Phòng Quản Lý & Phát Triển Idol',
      'Marketing & Truyền Thông',
      'Kinh Doanh Nhãn Hàng',
      'Nội Dung & Sản Xuất',
      'Vận Hành Livestream'
    ]
  }
] as const;

export const IDOL_TEAMS = [
  'Nhóm Idol Gaming & Gear',
  'Nhóm Idol Biểu Diễn & Donate (PK)',
  'Nhóm Idol Live Commerce & Chốt Đơn'
] as const;

export const CORPORATE_DEPARTMENTS = [
  'Ban Giám Đốc',
  'HR & Kế Toán',
  'Phòng Quản Lý & Phát Triển Idol',
  'Marketing & Truyền Thông',
  'Kinh Doanh Nhãn Hàng',
  'Nội Dung & Sản Xuất',
  'Vận Hành Livestream'
] as const;

// Danh mục tất cả 10 đơn vị chuẩn
export const ORG_DEPARTMENTS = [
  ...CORPORATE_DEPARTMENTS,
  ...IDOL_TEAMS
] as const;

// Danh sách các Phòng Ban Cấp 1 (Main Departments) của công ty
export const MAIN_DEPARTMENTS = CORPORATE_DEPARTMENTS;

// Bản đồ quan hệ mặc định: 3 Nhóm Idol trực thuộc Khối Idol / Phòng Quản Lý & Phát Triển Idol
export const DEFAULT_DEPARTMENT_PARENT_MAP: Record<string, string> = {
  'Nhóm Idol Gaming & Gear': 'Khối Idol',
  'Nhóm Idol Biểu Diễn & Donate (PK)': 'Khối Idol',
  'Nhóm Idol Live Commerce & Chốt Đơn': 'Khối Idol',
};

/**
 * Kiểm tra xem một đơn vị có thuộc Khối Nhóm Idol hay không
 */
export const isIdolDepartment = (dept?: string): boolean => {
  if (!dept) return false;
  return (IDOL_TEAMS as readonly string[]).includes(dept.trim());
};

/**
 * Kiểm tra xem một phòng ban có thuộc Khối Cán Bộ / Quản Lý / Vận Hành hay không
 */
export const isStaffDepartment = (dept?: string): boolean => {
  if (!dept) return false;
  const clean = dept.trim().toLowerCase();
  if (clean.includes('dịch vụ ngoài') || clean.includes('khách')) {
    return false;
  }
  return !isIdolDepartment(dept);
};

// Danh mục Role Templates mẫu ứng với từng vị trí
const ROLE_PRESET_DEFINITIONS: RolePreset[] = [
  {
    id: 'system_admin',
    name: 'System Admin',
    roleTitle: 'System Administrator',
    department: 'Toàn hệ thống',
    category: 'leadership',
    role: 'super_admin',
    isSuperAdmin: true,
    description: 'Toàn quyền quản trị hệ thống, độc lập với phòng ban và chức danh nghiệp vụ.',
    defaultTabs: ['roster', 'scoring', 'leaderboard', 'schedule', 'tasks', 'analytics', 'approvals', 'admin', 'my_dashboard', 'payroll', 'payroll_disputes', 'kpi', 'revenue', 'finance'],
    defaultActions: ['manage_idols', 'manage_scores', 'manage_criteria', 'manage_schedule', 'manage_tasks', 'manage_work_assignments', 'manage_departments', 'manage_settings', 'manage_approvals', 'manage_payroll', 'adjust_payroll', 'approve_payroll', 'hot_bonus', 'manage_kpi', 'manage_revenue'],
    defaultDepartments: ['*']
  },
  // 1. Ban Giám Đốc
  {
    id: 'director',
    name: 'Giám Đốc Điều Hành (CEO / BOD)',
    roleTitle: 'Giám Đốc Điều Hành',
    department: 'Ban Giám Đốc',
    category: 'leadership',
    role: 'director',
    isSuperAdmin: false,
    description: 'Điều hành chiến lược, KPI và hoạt động doanh nghiệp theo phạm vi được cấp.',
    defaultTabs: ['roster', 'scoring', 'leaderboard', 'schedule', 'tasks', 'analytics', 'approvals', 'admin', 'payroll', 'kpi'],
    defaultActions: [
      'manage_idols',
      'manage_scores',
      'manage_criteria',
      'manage_schedule',
      'manage_tasks',
      'manage_work_assignments',
      'manage_departments',
      'manage_settings',
      'manage_approvals',
      'manage_payroll',
      'approve_payroll',
      'hot_bonus',
      'manage_kpi'
    ],
    defaultDepartments: ['*']
  },

  // 2. Phòng Quản Lý & Phát Triển Idol (QLPTL)
  {
    id: 'talent_head',
    name: 'Trưởng Phòng QL & Phát Triển Idol',
    roleTitle: 'Trưởng Phòng QL & Phát Triển Idol',
    department: 'Phòng Quản Lý & Phát Triển Idol',
    category: 'talent_management',
    role: 'manager',
    description: 'Quản lý toàn bộ chỉ số KPI, lịch trình, tuyển chọn và phê duyệt yêu cầu của 3 nhóm Idol chuyên biệt.',
    defaultTabs: ['roster', 'schedule', 'tasks', 'analytics', 'approvals', 'kpi'],
    defaultActions: [
      'manage_idols',
      'manage_schedule',
      'manage_tasks',
      'manage_work_assignments',
      'manage_approvals',
      'manage_kpi'
    ],
    defaultDepartments: [
      'Nhóm Idol Gaming & Gear',
      'Nhóm Idol Biểu Diễn & Donate (PK)',
      'Nhóm Idol Live Commerce & Chốt Đơn'
    ]
  },
  {
    id: 'talent_executive',
    name: 'Chuyên Viên Tuyển Chọn & Đào Tạo',
    roleTitle: 'Chuyên Viên Quản Lý & Tuyển Chọn Idol',
    department: 'Phòng Quản Lý & Phát Triển Idol',
    category: 'talent_management',
    role: 'manager',
    description: 'Quản lý hồ sơ Idol, theo dõi tiến độ đào tạo và phân lịch ca làm việc.',
    defaultTabs: ['roster', 'schedule', 'tasks'],
    defaultActions: ['manage_idols', 'manage_schedule', 'manage_tasks'],
    defaultDepartments: [
      'Nhóm Idol Gaming & Gear',
      'Nhóm Idol Biểu Diễn & Donate (PK)',
      'Nhóm Idol Live Commerce & Chốt Đơn'
    ]
  },

  // Role Mặc Định Chung cho Tất Cả Idol / Nghệ Sĩ Công Ty
  {
    id: 'idol_exclusive',
    name: 'Idol / Nghệ Sĩ Độc Quyền (Chung)',
    roleTitle: 'Idol / Nghệ Sĩ Độc Quyền',
    department: 'Phòng Quản Lý & Phát Triển Idol',
    category: 'specialized_group',
    role: 'viewer',
    description: 'Dành cho tất cả Idol thuộc công ty: truy cập Bàn làm việc Idol, xem lịch ca trực, điểm KPI và xin nghỉ phép.',
    defaultTabs: ['my_dashboard', 'schedule', 'tasks'],
    defaultActions: [],
    defaultDepartments: ['*']
  },

  // 3. 3 Nhóm Idol Chuyên Biệt Trực Thuộc
  // 3.1 Nhóm Idol Gaming & Gear
  {
    id: 'leader_gaming_gear',
    name: 'Trưởng Nhóm Gaming & Gear (Leader)',
    roleTitle: 'Trưởng Nhóm Gaming & Gear',
    department: 'Nhóm Idol Gaming & Gear',
    category: 'specialized_group',
    role: 'manager',
    description: 'Quản lý Nữ Gamer, xếp ca stream quảng bá game và review thiết bị gắn giỏ hàng.',
    defaultTabs: ['roster', 'schedule', 'tasks'],
    defaultActions: ['manage_schedule', 'manage_tasks', 'manage_work_assignments'],
    defaultDepartments: ['Nhóm Idol Gaming & Gear']
  },
  {
    id: 'idol_gaming_gear',
    name: 'Idol Nữ Gaming & Gear',
    roleTitle: 'Nữ Gamer & Quảng Bá Game/Gear',
    department: 'Nhóm Idol Gaming & Gear',
    category: 'specialized_group',
    role: 'viewer',
    description: 'Theo dõi ca live chơi game, test thiết bị phụ kiện gear và gắn giỏ hàng shop.',
    defaultTabs: ['my_dashboard', 'schedule', 'tasks'],
    defaultActions: [],
    defaultDepartments: ['Nhóm Idol Gaming & Gear']
  },

  // 3.2 Nhóm Idol Biểu Diễn & Donate (PK)
  {
    id: 'leader_performance_donate',
    name: 'Trưởng Nhóm Biểu Diễn & Donate (Leader)',
    roleTitle: 'Trưởng Nhóm Biểu Diễn & Donate (PK)',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    category: 'specialized_group',
    role: 'manager',
    description: 'Quản lý lịch tập vũ đạo, hát live, kèo đấu PK thu hút donate và tài trợ thời trang/trang sức.',
    defaultTabs: ['roster', 'schedule', 'tasks'],
    defaultActions: ['manage_schedule', 'manage_tasks', 'manage_work_assignments'],
    defaultDepartments: ['Nhóm Idol Biểu Diễn & Donate (PK)']
  },
  {
    id: 'idol_performance_donate',
    name: 'Idol Biểu Diễn & Donate (PK)',
    roleTitle: 'Idol Hát/Nhảy Theo Yêu Cầu & PK Kèo',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    category: 'specialized_group',
    role: 'viewer',
    description: 'Theo dõi ca live hát nhảy theo donate của fan, thi đấu PK và lồng ghép đồ tài trợ.',
    defaultTabs: ['my_dashboard', 'schedule', 'tasks'],
    defaultActions: [],
    defaultDepartments: ['Nhóm Idol Biểu Diễn & Donate (PK)']
  },

  // 3.3 Nhóm Idol Live Commerce & Chốt Đơn
  {
    id: 'leader_live_commerce',
    name: 'Trưởng Nhóm Live Commerce & Chốt Đơn (Leader)',
    roleTitle: 'Trưởng Nhóm Live Commerce & Chốt Đơn',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    category: 'specialized_group',
    role: 'manager',
    description: 'Quản lý phiên live bán hàng thời trang/mỹ phẩm, chỉ tiêu GMV và phân ca chốt đơn.',
    defaultTabs: ['roster', 'schedule', 'tasks', 'analytics'],
    defaultActions: ['manage_schedule', 'manage_tasks', 'manage_work_assignments'],
    defaultDepartments: ['Nhóm Idol Live Commerce & Chốt Đơn']
  },
  {
    id: 'idol_live_commerce',
    name: 'Idol Live Commerce Chốt Đơn',
    roleTitle: 'Chuyên Gia Live Commerce Thời Trang & Mỹ Phẩm',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    category: 'specialized_group',
    role: 'viewer',
    description: 'Theo dõi ca live bán hàng thời trang/mỹ phẩm, deal độc quyền nhãn hàng và GMV phiên.',
    defaultTabs: ['my_dashboard', 'schedule', 'tasks'],
    defaultActions: [],
    defaultDepartments: ['Nhóm Idol Live Commerce & Chốt Đơn']
  },

  // 4. Các Phòng Ban Hỗ Trợ Dùng Chung
  {
    id: 'brand_sales',
    name: 'Kinh Doanh Nhãn Hàng (Booking Ads)',
    roleTitle: 'Chuyên Viên Kinh Doanh Nhãn Hàng',
    department: 'Kinh Doanh Nhãn Hàng',
    category: 'shared_support',
    role: 'custom',
    description: 'Lên lịch booking quảng cáo, giao nhiệm vụ tài trợ cho Idol trên toàn công ty.',
    defaultTabs: ['roster', 'schedule', 'tasks', 'analytics'],
    defaultActions: ['manage_tasks', 'manage_schedule'],
    defaultDepartments: ['*']
  },
  {
    id: 'content_production',
    name: 'Nội Dung & Sản Xuất (Media & Script)',
    roleTitle: 'Trưởng/Chuyên Viên Sản Xuất & Nội Dung',
    department: 'Nội Dung & Sản Xuất',
    category: 'shared_support',
    role: 'custom',
    description: 'Điều phối kịch bản, lịch quay, dựng video và quản lý ấn phẩm truyền thông.',
    defaultTabs: ['roster', 'schedule', 'tasks'],
    defaultActions: ['manage_tasks', 'manage_schedule'],
    defaultDepartments: ['*']
  },
  {
    id: 'live_ops',
    name: 'Vận Hành Livestream (Kỹ Thuật & Phòng Live)',
    roleTitle: 'Kỹ Thuật Viên Vận Hành Livestream',
    department: 'Vận Hành Livestream',
    category: 'shared_support',
    role: 'custom',
    description: 'Xếp phòng live, giám sát đường truyền kỹ thuật, hỗ trợ phiên live của mọi nhóm.',
    defaultTabs: ['schedule', 'tasks', 'roster'],
    defaultActions: ['manage_schedule', 'manage_tasks'],
    defaultDepartments: ['*']
  },
  {
    id: 'marketing',
    name: 'Marketing & Truyền Thông',
    roleTitle: 'Chuyên Viên Marketing & PR Fanbase',
    department: 'Marketing & Truyền Thông',
    category: 'shared_support',
    role: 'custom',
    description: 'Lên chiến dịch truyền thông, đẩy viral clip, theo dõi tăng trưởng cộng đồng fan.',
    defaultTabs: ['roster', 'tasks', 'analytics'],
    defaultActions: ['manage_tasks'],
    defaultDepartments: ['*']
  },
  {
    id: 'hr_accounting',
    name: 'HR & Kế Toán (Nhân Sự & Lương Thưởng)',
    roleTitle: 'Chuyên Viên Nhân Sự & Kế Toán',
    department: 'HR & Kế Toán',
    category: 'shared_support',
    role: 'custom',
    description: 'Quản lý hồ sơ nhân sự, hợp đồng, chấm công theo lịch live và tính thưởng KPI.',
    defaultTabs: ['roster', 'schedule', 'analytics', 'approvals', 'payroll', 'kpi'],
    defaultActions: ['manage_idols', 'manage_approvals', 'manage_payroll', 'adjust_payroll'],
    defaultDepartments: ['*']
  }
];

// Mọi nhân sự đều có không gian dashboard cá nhân; các role vẫn giữ nguyên
// các quyền nghiệp vụ riêng và chỉ được bổ sung tab dashboard này.
export const ROLE_PRESETS: RolePreset[] = ROLE_PRESET_DEFINITIONS.map((role) => ({
  ...role,
  defaultTabs: role.defaultTabs.includes('my_dashboard')
    ? role.defaultTabs
    : [...role.defaultTabs, 'my_dashboard']
}));

// Ảnh đại diện rỗng mặc định (Neutral SVG Blank Silhouette)
export const DEFAULT_BLANK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23f1f5f9'/%3E%3Ccircle cx='64' cy='48' r='24' fill='%23cbd5e1'/%3E%3Cpath d='M24 112c0-22 18-36 40-36s40 14 40 36' fill='%23cbd5e1'/%3E%3C/svg%3E";

export interface StaffRoleOption {
  value: string;
  label: string;
  isPrimary?: boolean;
}

// Bảng quan hệ chuẩn hóa: Phòng Ban Vận Hành ➔ Danh mục Role tương ứng
export const DEPARTMENT_STAFF_ROLES_MAP: Record<string, StaffRoleOption[]> = {
  'Ban Giám Đốc': [
    { value: 'director', label: '👑 Giám Đốc Điều Hành (CEO / BOD)', isPrimary: true },
    { value: 'staff', label: '💼 Cán Bộ Trợ Lý / Ban Giám Đốc' }
  ],
  'HR & Kế Toán': [
    { value: 'hr_accounting', label: '👥 Chuyên Viên Nhân Sự & Kế Toán', isPrimary: true },
    { value: 'staff', label: '💼 Cán Bộ Hành Chính / Nhân Sự Chung' }
  ],
  'Phòng Quản Lý & Phát Triển Idol': [
    { value: 'talent_head', label: '📋 Trưởng Phòng QL & Phát Triển Idol', isPrimary: true },
    { value: 'talent_manager', label: '📋 Quản Lý Idol & Đào Tạo' },
    { value: 'talent_executive', label: '📋 Chuyên Viên Tuyển Chọn & Đào Tạo' },
    { value: 'staff', label: '💼 Cán Bộ Quản Lý Idol Chung' }
  ],
  'Marketing & Truyền Thông': [
    { value: 'marketing', label: '📢 Chuyên Viên Marketing & PR Fanbase', isPrimary: true },
    { value: 'staff', label: '💼 Cán Bộ Marketing Chung' }
  ],
  'Kinh Doanh Nhãn Hàng': [
    { value: 'brand_sales', label: '🤝 Kinh Doanh Nhãn Hàng & Booking Quảng Cáo', isPrimary: true },
    { value: 'staff', label: '💼 Cán Bộ Booking & Sales Chung' }
  ],
  'Nội Dung & Sản Xuất': [
    { value: 'content_production', label: '🎬 Sản Xuất & Biên Tập Nội Dung (Media & Script)', isPrimary: true },
    { value: 'staff', label: '💼 Cán Bộ Sản Xuất Chung' }
  ],
  'Vận Hành Livestream': [
    { value: 'live_ops', label: '📡 Kỹ Thuật Viên Vận Hành Livestream & Studio', isPrimary: true },
    { value: 'staff', label: '💼 Cán Bộ Kỹ Thuật / Studio Chung' }
  ]
};

export const getRolesForDepartment = (dept?: string): StaffRoleOption[] => {
  if (!dept) return [{ value: 'staff', label: '💼 Chuyên Viên / Cán Bộ Vận Hành Chung', isPrimary: true }];
  const clean = dept.trim();
  const matched = DEPARTMENT_STAFF_ROLES_MAP[clean];
  if (matched && matched.length > 0) return matched;
  return [
    { value: 'staff', label: `💼 Cán Bộ ${clean}`, isPrimary: true },
    { value: 'hr_accounting', label: '👥 Chuyên Viên Nhân Sự & Kế Toán' },
    { value: 'talent_manager', label: '📋 Quản Lý Idol & Đào Tạo' },
    { value: 'live_ops', label: '📡 Kỹ Thuật Viên Livestream & Studio' },
    { value: 'content_production', label: '🎬 Sản Xuất & Nội Dung' },
    { value: 'brand_sales', label: '🤝 Kinh Doanh Nhãn Hàng' },
    { value: 'marketing', label: '📢 Marketing & Truyền Thông' }
  ];
};

