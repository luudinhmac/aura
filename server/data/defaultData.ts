import { DEFAULT_BLANK_AVATAR, Idol, Criterion, IdolScoreRecord, IdolTask, UserAccount, ApprovalRequest, WorkScheduleSlot, LeaveRequest, PayrollPeriod, PayrollRecord, KpiGroup, KpiSetting } from '../../src/types/index.ts';

export const DEFAULT_IDOLS: Idol[] = [
  // 1. Nhóm Biểu Diễn & Donate (PK)
  {
    id: 'idol-01',
    stt: 1,
    stageName: 'Minh Anh (Aria)',
    realName: 'Trần Minh Anh',
    dob: '2003-04-18',
    role: 'Main Vocal & Performance PK',
    weight: 47,
    height: 168,
    hometown: 'Đà Nẵng',
    currentLiving: 'Quận 1, TP. Hồ Chí Minh',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2023-03-15',
    baseSalary: 15000000,
    bankName: 'MB Bank (Quân Đội)',
    bankAccountNumber: '1900889988',
    bankAccountName: 'TRAN MINH ANH',
    idolCategory: 'performance_donate',
    commercialDetails: {
      talents: ['Hát Live chuyên nghiệp', 'Vũ đạo gợi cảm', 'PK Đấu kèo fan', 'Thử thách trực tiếp'],
      sponsorBrands: ['Trang sức PNJ Silver', 'Đầm tiệc IVY moda', 'Son môi YSL Beauty'],
      cartLinkSponsor: 'https://vt.tiktok.com/ZS_aria_sponsor'
    },
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Idol giọng hát nội lực 3.5 quãng tám, chuyên hát live theo yêu cầu và thi đấu PK thu hút quà tặng/donate khủng từ cộng đồng fan. Lồng ghép khéo léo trang sức và thời trang nhãn hàng tài trợ.',
    socialLinks: {
      email: 'minhanh.aria@auratalent.vn',
      instagram: 'instagram.com/aria.minhanh',
      tiktok: 'tiktok.com/@aria_official',
      linkedin: 'linkedin.com/in/tran-minh-anh-aria'
    },
    createdAt: '2025-01-15T08:00:00.000Z'
  },
  {
    id: 'idol-03',
    stt: 2,
    stageName: 'Chloe Vũ',
    realName: 'Vũ Thảo Vy',
    dob: '2004-11-25',
    role: 'Main Dancer & PK Thử Thách',
    weight: 48,
    height: 169,
    hometown: 'Hải Phòng',
    currentLiving: 'Bình Thạnh, TP. Hồ Chí Minh',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    personnelType: 'Outsource',
    status: 'Đang hoạt động',
    joinDate: '2023-11-10',
    baseSalary: 14000000,
    bankName: 'Vietcombank',
    bankAccountNumber: '0071001234567',
    bankAccountName: 'VU THAO VY',
    idolCategory: 'performance_donate',
    commercialDetails: {
      talents: ['Vũ đạo K-Pop bùng nổ', 'Nhảy theo yêu cầu donate', 'PK Đấu top BXH', 'Cosplay'],
      sponsorBrands: ['Maybelline New York', 'Thời trang L Seoul', 'Nước hoa Charme'],
      cartLinkSponsor: 'https://vt.tiktok.com/ZS_chloevu_pk'
    },
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Vũ công solo triệu view TikTok, chuyên nhảy cover và thực hiện các thử thách vũ đạo khó từ donate của fan trong các trận PK kịch tính. Gắn link giỏ hàng các set đồ thời trang hot trend.',
    socialLinks: {
      email: 'thaovy.chloe@auratalent.vn',
      instagram: 'instagram.com/chloevu.official',
      tiktok: 'tiktok.com/@chloevu_dance',
      linkedin: 'linkedin.com/in/vu-thao-vy-chloe'
    },
    createdAt: '2025-02-01T10:00:00.000Z'
  },

  // 2. Nhóm Idol Nữ Gaming & Gear
  {
    id: 'idol-02',
    stt: 3,
    stageName: 'Bảo Vy (G-Leo)',
    realName: 'Lê Bảo Vy',
    dob: '2003-09-12',
    role: 'Nữ Streamer Gaming & Review Gear',
    weight: 49,
    height: 167,
    hometown: 'Hà Nội',
    currentLiving: 'Cầu Giấy, Hà Nội',
    department: 'Nhóm Idol Gaming & Gear',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2022-07-01',
    baseSalary: 18000000,
    bankName: 'Techcombank',
    bankAccountNumber: '1903668822',
    bankAccountName: 'LE BAO VY',
    idolCategory: 'gaming_gear',
    commercialDetails: {
      gameTitles: ['Liên Quân Mobile', 'Valorant', 'Liên Minh Tốc Chiến', 'Naraka'],
      gearBrands: ['Tai nghe Razer BlackShark', 'Bàn phím cơ Akko Dragon', 'Chuột Logitech G Pro', 'Ghế Gaming E-Dra Hercules'],
      cartLinkGaming: 'https://shopee.vn/gleo_gaming_gear'
    },
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Nữ streamer game kỹ năng cao top Thách Đấu, tính cách hài hước duyên dáng. Chuyên quảng bá tựa game mới, gắn giỏ hàng tai nghe, chuột phím cơ và thiết bị livestream cho game thủ.',
    socialLinks: {
      email: 'baovy.gleo@auratalent.vn',
      instagram: 'instagram.com/gleo_gamer',
      tiktok: 'tiktok.com/@gleo_livegaming',
      linkedin: 'linkedin.com/in/le-bao-vy-gleo'
    },
    createdAt: '2025-01-20T09:00:00.000Z'
  },
  {
    id: 'idol-04',
    stt: 4,
    stageName: 'Khánh An (Kenzo)',
    realName: 'Đặng Khánh An',
    dob: '2004-07-08',
    role: 'Nữ Gamer & Quảng Bá Game/Gear',
    weight: 48,
    height: 165,
    hometown: 'Đà Nẵng',
    currentLiving: 'Quận 7, TP. Hồ Chí Minh',
    department: 'Nhóm Idol Gaming & Gear',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2024-02-20',
    baseSalary: 13500000,
    bankName: 'ACB',
    bankAccountNumber: '22889911',
    bankAccountName: 'DANG KHANH AN',
    idolCategory: 'gaming_gear',
    commercialDetails: {
      gameTitles: ['Genshin Impact', 'PUBG Mobile', 'Honkai Star Rail', 'Free Fire'],
      gearBrands: ['Tay cầm Gamesir T4 Pro', 'Mic thu âm HyperX QuadCast', 'Quạt tản nhiệt sò lạnh BlackShark'],
      cartLinkGaming: 'https://vt.tiktok.com/ZS_kenzo_gear'
    },
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Idol nữ chuyên gacha game và game sinh tồn mobile. Tương tác khán giả tự nhiên, thường xuyên test và gắn giỏ hàng phụ kiện tay cầm, mic thu âm, thiết bị hỗ trợ chơi game điện thoại.',
    socialLinks: {
      email: 'khanhan.kenzo@auratalent.vn',
      instagram: 'instagram.com/khanhan.kenzo',
      tiktok: 'tiktok.com/@kenzo_stream',
      linkedin: 'linkedin.com/in/dang-khanh-an-kenzo'
    },
    createdAt: '2025-02-10T11:00:00.000Z'
  },

  // 3. Nhóm Idol Live Commerce & Chốt Đơn
  {
    id: 'idol-05',
    stt: 5,
    stageName: 'Luna Đoàn',
    realName: 'Đoàn Ngọc Ánh',
    dob: '2005-02-14',
    role: 'Chuyên Gia Live Commerce Thời Trang',
    weight: 46,
    height: 172,
    hometown: 'Cần Thơ',
    currentLiving: 'Quận 2, TP. Hồ Chí Minh',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    personnelType: 'Cộng tác viên',
    status: 'Đang hoạt động',
    joinDate: '2024-08-05',
    baseSalary: 8000000,
    bankName: 'VPBank',
    bankAccountNumber: '158992211',
    bankAccountName: 'DOAN NGOC ANH',
    idolCategory: 'live_commerce',
    commercialDetails: {
      commerceCategories: ['Thời trang Nữ thiết kế', 'Váy đầm công sở & dạo phố', 'Túi xách & Giày dép cao cấp'],
      targetGmvPerLive: 150000000,
      cartLinkCommerce: 'https://vt.tiktok.com/ZS_lunadoan_shop'
    },
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Top KOC thời trang với khả năng lên đồ phối trang phục đỉnh cao và chốt đơn thần tốc. Tỷ lệ giữ chân người xem trung bình 6.8 phút/phiên, đạt GMV trung bình trên 150 triệu mỗi ca live.',
    socialLinks: {
      email: 'ngocanh.luna@auratalent.vn',
      instagram: 'instagram.com/luna.doan',
      tiktok: 'tiktok.com/@lunadoan_style',
      linkedin: 'linkedin.com/in/doan-ngoc-anh-luna'
    },
    createdAt: '2025-02-18T14:30:00.000Z'
  },
  {
    id: 'idol-06',
    stt: 6,
    stageName: 'Hà My (K-Jun)',
    realName: 'Trịnh Hà My',
    dob: '2004-05-20',
    role: 'Host Live Chốt Đơn Mỹ Phẩm & Skincare',
    weight: 47,
    height: 168,
    hometown: 'TP. Hồ Chí Minh',
    currentLiving: 'Quận 3, TP. Hồ Chí Minh',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2024-04-15',
    baseSalary: 12000000,
    bankName: 'TPBank',
    bankAccountNumber: '0344556677',
    bankAccountName: 'TRINH HA MY',
    idolCategory: 'live_commerce',
    commercialDetails: {
      commerceCategories: ['Mỹ phẩm Skincare Hàn Quốc', 'Serum & Kem chống nắng', 'Set trang điểm Make-up look'],
      targetGmvPerLive: 200000000,
      cartLinkCommerce: 'https://vt.tiktok.com/ZS_hamy_skincare'
    },
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'KOL có kiến thức sâu rộng về da liễu và hoạt chất mỹ phẩm, hoạt ngôn và chốt deal độc quyền nhãn hàng trực tiếp trên live. Từng lập kỷ lục chốt 2.500 đơn serum trong 1 phiên live 3 tiếng.',
    socialLinks: {
      email: 'hamy.kjun@auratalent.vn',
      instagram: 'instagram.com/hamy.beauty',
      tiktok: 'tiktok.com/@hamy_skincaretips',
      linkedin: 'linkedin.com/in/trinh-ha-my-beauty'
    },
    createdAt: '2025-03-01T08:00:00.000Z'
  },

  // ========================================================
  // 🏢 KHỐI PHÒNG BAN QUẢN LÝ & VẬN HÀNH (7 CÁN BỘ / NHÂN SỰ)
  // ========================================================
  {
    id: 'staff-01',
    stt: 7,
    stageName: 'khangvisual (Giám Đốc)',
    realName: 'Minh Khang',
    dob: '1995-01-28',
    role: 'Giám Đốc Điều Hành (CEO)',
    weight: 68,
    height: 175,
    hometown: 'Đăk Lăk',
    currentLiving: 'Quận 1, TP. Hồ Chí Minh',
    department: 'Ban Giám Đốc',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2022-01-01',
    baseSalary: 35000000,
    bankName: 'Vietcombank',
    bankAccountNumber: '0071001234567',
    bankAccountName: 'MINH KHANG',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Nhà sáng lập & Giám Đốc Điều Hành Aura Talent. Điều hành chiến lược, chỉ số KPI và quản trị toàn bộ hệ sinh thái nghệ sĩ.',
    socialLinks: {
      email: 'admin@auratalent.vn',
      linkedin: 'linkedin.com/in/minhkhang'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  },
  {
    id: 'staff-02',
    stt: 8,
    stageName: 'Vũ Kim Ngân',
    realName: 'Vũ Kim Ngân',
    dob: '1995-10-12',
    role: 'Chuyên Viên Nhân Sự & Kế Toán',
    weight: 50,
    height: 162,
    hometown: 'Hải Phòng',
    currentLiving: 'Bình Thạnh, TP. Hồ Chí Minh',
    department: 'HR & Kế Toán',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2022-10-01',
    baseSalary: 18000000,
    bankName: 'Techcombank',
    bankAccountNumber: '1902883399',
    bankAccountName: 'VU KIM NGAN',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Phụ trách nhân sự, chế độ đãi ngộ, hợp đồng biểu diễn và tính lương thưởng cho toàn bộ cán bộ và idol.',
    socialLinks: {
      email: 'hr@auratalent.vn',
      linkedin: 'linkedin.com/in/vukimngan-hr'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  },
  {
    id: 'staff-03',
    stt: 9,
    stageName: 'Nguyễn Hà Anh',
    realName: 'Nguyễn Hà Anh',
    dob: '1992-06-15',
    role: 'Trưởng Phòng QL & Phát Triển Idol',
    weight: 52,
    height: 166,
    hometown: 'Nam Định',
    currentLiving: 'Quận 2, TP. Hồ Chí Minh',
    department: 'Phòng Quản Lý & Phát Triển Idol',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2022-06-01',
    baseSalary: 25000000,
    bankName: 'Techcombank',
    bankAccountNumber: '1903668822',
    bankAccountName: 'NGUYEN HA ANH',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Trưởng Phòng Quản Lý & Phát Triển Idol. Định hướng chuyên môn, đào tạo phong cách và giám sát hiệu suất 3 nhóm idol chuyên biệt.',
    socialLinks: {
      email: 'talent.head@auratalent.vn',
      linkedin: 'linkedin.com/in/nguyenhaanh-talent'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  },
  {
    id: 'staff-04',
    stt: 10,
    stageName: 'Hoàng Hải Yến',
    realName: 'Hoàng Hải Yến',
    dob: '1997-04-22',
    role: 'Chuyên Viên Marketing & PR',
    weight: 48,
    height: 163,
    hometown: 'Đà Nẵng',
    currentLiving: 'Quận 7, TP. Hồ Chí Minh',
    department: 'Marketing & Truyền Thông',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2023-04-01',
    baseSalary: 16000000,
    bankName: 'MB Bank',
    bankAccountNumber: '0911223344',
    bankAccountName: 'HOANG HAI YEN',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Xây dựng hình ảnh cá nhân cho nghệ sĩ, phụ trách các chiến dịch truyền thông lan tỏa thương hiệu Aura Talent trên TikTok và Facebook.',
    socialLinks: {
      email: 'marketing@auratalent.vn',
      linkedin: 'linkedin.com/in/hoanghaiyen-marketing'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  },
  {
    id: 'staff-05',
    stt: 11,
    stageName: 'Lê Quỳnh Chi',
    realName: 'Lê Quỳnh Chi',
    dob: '1996-09-08',
    role: 'Chuyên Viên Kinh Doanh Nhãn Hàng',
    weight: 49,
    height: 165,
    hometown: 'Hà Nội',
    currentLiving: 'Quận 3, TP. Hồ Chí Minh',
    department: 'Kinh Doanh Nhãn Hàng',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2023-09-15',
    baseSalary: 15000000,
    bankName: 'TPBank',
    bankAccountNumber: '0344556677',
    bankAccountName: 'LE QUYNH CHI',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Kết nối hợp tác thương mại, tìm kiếm nhãn hàng tài trợ, booking quảng cáo và đàm phán hợp đồng thương hiệu cho idol.',
    socialLinks: {
      email: 'booking@auratalent.vn',
      linkedin: 'linkedin.com/in/lequynhchi-sales'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  },
  {
    id: 'staff-06',
    stt: 12,
    stageName: 'Lê Tuấn Kiệt',
    realName: 'Lê Tuấn Kiệt',
    dob: '1994-11-30',
    role: 'Đạo Diễn & Sản Xuất Video',
    weight: 65,
    height: 174,
    hometown: 'Cần Thơ',
    currentLiving: 'Phú Nhuận, TP. Hồ Chí Minh',
    department: 'Nội Dung & Sản Xuất',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2023-03-01',
    baseSalary: 17000000,
    bankName: 'Techcombank',
    bankAccountNumber: '1903882211',
    bankAccountName: 'LE TUAN KIET',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Chịu trách nhiệm biên tập kịch bản, quay dựng video ngắn viral, chụp lookbook thời trang và điều phối sản xuất hậu trường.',
    socialLinks: {
      email: 'production@auratalent.vn',
      linkedin: 'linkedin.com/in/letuankiet-director'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  },
  {
    id: 'staff-07',
    stt: 13,
    stageName: 'Trần Hải Đăng',
    realName: 'Trần Hải Đăng',
    dob: '1998-08-14',
    role: 'Kỹ Thuật Viên Vận Hành Livestream',
    weight: 62,
    height: 172,
    hometown: 'Vũng Tàu',
    currentLiving: 'Quận 4, TP. Hồ Chí Minh',
    department: 'Vận Hành Livestream',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    joinDate: '2023-08-01',
    baseSalary: 16000000,
    bankName: 'Vietcombank',
    bankAccountNumber: '0451000889977',
    bankAccountName: 'TRAN HAI DANG',
    isIdol: false,
    avatarUrl: DEFAULT_BLANK_AVATAR,
    bio: 'Phụ trách hệ thống phòng live, âm thanh, ánh sáng, máy quay và xử lý đường truyền đảm bảo các phiên livestream mượt mà nhất.',
    socialLinks: {
      email: 'live.ops@auratalent.vn',
      linkedin: 'linkedin.com/in/tranhaidang-ops'
    },
    createdAt: '2025-01-01T08:00:00.000Z'
  }
];

export const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: 'crit-01',
    name: 'Kỹ năng Thanh nhạc & Live',
    code: 'VOCAL',
    maxScore: 100,
    weight: 25,
    description: 'Khả năng giữ nhịp, cao độ, hơi thở, cảm xúc bài hát và độ ổn định khi hát live trên sân khấu.',
    priorityOrder: 1
  },
  {
    id: 'crit-02',
    name: 'Vũ đạo & Làm chủ Sân khấu',
    code: 'DANCE',
    maxScore: 100,
    weight: 25,
    description: 'Kỹ thuật hình thể, độ dứt khoát của động tác, đồng bộ nhịp điệu và năng lượng biểu diễn trực tiếp.',
    priorityOrder: 2
  },
  {
    id: 'crit-03',
    name: 'Tương tác Fan & Độ phủ MXH',
    code: 'ENGAGEMENT',
    maxScore: 100,
    weight: 20,
    description: 'Chỉ số tương tác TikTok/Instagram, thái độ giao lưu fan meeting, mức độ thiện cảm công chúng.',
    priorityOrder: 3
  },
  {
    id: 'crit-04',
    name: 'Kỷ luật & Tác phong Chuyên nghiệp',
    code: 'DISCIPLINE',
    maxScore: 100,
    weight: 15,
    description: 'Đúng giờ luyện tập, giữ gìn hình ảnh đời tư, tinh thần đồng đội và chấp hành nội quy công ty.',
    priorityOrder: 4
  },
  {
    id: 'crit-05',
    name: 'Giá trị Thương mại & Doanh số',
    code: 'COMMERCIAL',
    maxScore: 100,
    weight: 15,
    description: 'Doanh số vé, hợp đồng tài trợ nhãn hàng, lượng hàng merchandise bán ra và tiềm năng doanh thu.',
    priorityOrder: 5
  }
];

export const DEFAULT_SCORES: IdolScoreRecord[] = [
  {
    id: 'score-01',
    idolId: 'idol-01',
    period: '2026-10',
    scores: {
      'crit-01': 96,
      'crit-02': 88,
      'crit-03': 95,
      'crit-04': 92,
      'crit-05': 94
    },
    totalScore: 465,
    averageScore: 93.0,
    evaluatorNotes: 'Giọng hát live xuất sắc, tương tác mạng xã hội tăng trưởng 140% sau MV mới.',
    evaluatedAt: '2026-10-20T10:00:00.000Z'
  },
  {
    id: 'score-02',
    idolId: 'idol-03',
    period: '2026-10',
    scores: {
      'crit-01': 86,
      'crit-02': 98,
      'crit-03': 92,
      'crit-04': 94,
      'crit-05': 88
    },
    totalScore: 458,
    averageScore: 91.6,
    evaluatorNotes: 'Vũ đạo đỉnh cao, làm chủ sân khấu hoàn hảo trong mọi show diễn.',
    evaluatedAt: '2026-10-21T11:00:00.000Z'
  },
  {
    id: 'score-03',
    idolId: 'idol-02',
    period: '2026-10',
    scores: {
      'crit-01': 90,
      'crit-02': 85,
      'crit-03': 94,
      'crit-04': 95,
      'crit-05': 93
    },
    totalScore: 457,
    averageScore: 91.4,
    evaluatorNotes: 'Tác phong lãnh đạo nhóm tuyệt vời, kỷ luật luyện tập nghiêm túc.',
    evaluatedAt: '2026-10-21T14:00:00.000Z'
  },
  {
    id: 'score-04',
    idolId: 'idol-04',
    period: '2026-10',
    scores: {
      'crit-01': 92,
      'crit-02': 82,
      'crit-03': 88,
      'crit-04': 90,
      'crit-05': 86
    },
    totalScore: 438,
    averageScore: 87.6,
    evaluatorNotes: 'Giọng hát ấm áp, cần rèn luyện thêm sự linh hoạt trong vũ đạo nhóm.',
    evaluatedAt: '2026-10-22T09:30:00.000Z'
  },
  {
    id: 'score-05',
    idolId: 'idol-05',
    period: '2026-10',
    scores: {
      'crit-01': 80,
      'crit-02': 84,
      'crit-03': 93,
      'crit-04': 91,
      'crit-05': 96
    },
    totalScore: 444,
    averageScore: 88.8,
    evaluatorNotes: 'Sức hút thương mại rất cao, thu hút nhiều hợp đồng quảng cáo độc quyền.',
    evaluatedAt: '2026-10-22T15:00:00.000Z'
  },
  {
    id: 'score-06',
    idolId: 'idol-06',
    period: '2026-10',
    scores: {
      'crit-01': 78,
      'crit-02': 90,
      'crit-03': 82,
      'crit-04': 88,
      'crit-05': 75
    },
    totalScore: 413,
    averageScore: 82.6,
    evaluatorNotes: 'Tiến bộ nhanh về hiphop dance, cần tăng cường luyện thanh hàng ngày.',
    evaluatedAt: '2026-10-23T16:00:00.000Z'
  }
];

export const DEFAULT_TASKS: IdolTask[] = [
  {
    id: 'task-01',
    idolId: 'idol-01',
    title: 'Ghi âm ca khúc chủ đề Album Mùa Thu',
    description: 'Thu âm bản vocal chính thức, hòa âm bè và chỉnh sửa nhịp với Giám đốc Âm nhạc',
    category: 'Ghi âm & Sản xuất',
    status: 'completed',
    startTime: '2026-10-22T09:00:00.000Z',
    endTime: '2026-10-22T13:30:00.000Z',
    loggedDurationMinutes: 270,
    createdAt: '2026-10-20T08:00:00.000Z',
    dueDate: '2026-10-23',
    subtasks: [
      { id: 'sub-01', title: 'Khởi động giọng và luyện thanh âm vực cao', completed: true, timeSpentMinutes: 45 },
      { id: 'sub-02', title: 'Thu âm Verse 1 và Chorus chính', completed: true, timeSpentMinutes: 90 },
      { id: 'sub-03', title: 'Thu âm bè hòa âm (Harmony & Ad-libs)', completed: true, timeSpentMinutes: 75 },
      { id: 'sub-04', title: 'Nghe lại bản thô với Producer để chốt take', completed: true, timeSpentMinutes: 60 }
    ]
  },
  {
    id: 'task-02',
    idolId: 'idol-01',
    title: 'Tập luyện vũ đạo sân khấu Music Show tuần này',
    description: 'Chạy đội hình 5 người với vũ đoàn, căn góc quay máy máy camera số 2 và số 4',
    category: 'Biểu diễn',
    status: 'in_progress',
    startTime: '2026-10-24T14:00:00.000Z',
    loggedDurationMinutes: 150,
    createdAt: '2026-10-22T10:00:00.000Z',
    dueDate: '2026-10-25',
    subtasks: [
      { id: 'sub-05', title: 'Tập vũ đạo đồng bộ phần Dance Break', completed: true, timeSpentMinutes: 60 },
      { id: 'sub-06', title: 'Căn chỉnh vị trí mic cài áo và tai nghe in-ear', completed: true, timeSpentMinutes: 30 },
      { id: 'sub-07', title: 'Chạy tổng duyệt toàn bài không ngắt quãng (Full Run)', completed: false, timeSpentMinutes: 60 }
    ]
  },
  {
    id: 'task-03',
    idolId: 'idol-02',
    title: 'Hoàn thiện bản phối khí Beat số 3 cho Concert',
    description: 'Chỉnh sửa bassline, thêm hiệu ứng drop điện tử và viết lời rap intro',
    category: 'Ghi âm & Sản xuất',
    status: 'completed',
    startTime: '2026-10-21T18:00:00.000Z',
    endTime: '2026-10-21T22:30:00.000Z',
    loggedDurationMinutes: 270,
    createdAt: '2026-10-20T12:00:00.000Z',
    dueDate: '2026-10-22',
    subtasks: [
      { id: 'sub-08', title: 'Viết lyric 16 câu verse rap mở màn', completed: true, timeSpentMinutes: 90 },
      { id: 'sub-09', title: 'Thu âm demo gửi Ban giám đốc duyệt beat', completed: true, timeSpentMinutes: 60 }
    ]
  },
  {
    id: 'task-04',
    idolId: 'idol-03',
    title: 'Quay video TikTok Dance Challenge quảng bá',
    description: 'Quay 3 clip ngắn vũ đạo bài hit với trang phục biểu diễn tại studio',
    category: 'Quay chụp & Phỏng vấn',
    status: 'in_progress',
    startTime: '2026-10-24T10:00:00.000Z',
    loggedDurationMinutes: 120,
    createdAt: '2026-10-23T08:00:00.000Z',
    dueDate: '2026-10-25',
    subtasks: [
      { id: 'sub-10', title: 'Trang điểm và đổi layout trang phục hồng phấn', completed: true, timeSpentMinutes: 45 },
      { id: 'sub-11', title: 'Quay clip solo 30s góc cận', completed: true, timeSpentMinutes: 40 },
      { id: 'sub-12', title: 'Quay clip colab cùng idol khách mời', completed: false, timeSpentMinutes: 35 }
    ]
  },
  {
    id: 'task-05',
    idolId: 'idol-05',
    title: 'Chụp lookbook bộ sưu tập Đông 2026',
    description: 'Chụp hình studio cho tạp chí thời trang và catalogue hãng thời trang',
    category: 'Quay chụp & Phỏng vấn',
    status: 'completed',
    startTime: '2026-10-23T08:30:00.000Z',
    endTime: '2026-10-23T15:00:00.000Z',
    loggedDurationMinutes: 390,
    createdAt: '2026-10-21T09:00:00.000Z',
    dueDate: '2026-10-23',
    subtasks: [
      { id: 'sub-13', title: 'Thử đồ fitting 5 trang phục khác nhau', completed: true, timeSpentMinutes: 90 },
      { id: 'sub-14', title: 'Chụp set ảnh ngoại cảnh ánh sáng tự nhiên', completed: true, timeSpentMinutes: 150 },
      { id: 'sub-15', title: 'Phỏng vấn ngắn video hậu trường (Behind the scenes)', completed: true, timeSpentMinutes: 60 }
    ]
  },
  {
    id: 'task-06',
    idolId: 'idol-06',
    title: 'Kiểm tra thể lực và rèn luyện vũ đạo cơ bản',
    description: 'Bài tập thể lực 90 phút và kiểm tra 3 bài nhảy hiphop nền tảng',
    category: 'Luyện tập',
    status: 'todo',
    loggedDurationMinutes: 0,
    createdAt: '2026-10-24T08:00:00.000Z',
    dueDate: '2026-10-26',
    subtasks: [
      { id: 'sub-16', title: 'Chạy bộ 5km và hít đất kiểm tra sức bền', completed: false, timeSpentMinutes: 45 },
      { id: 'sub-17', title: 'Tập uốn dẻo và xoạc ngang cơ bản', completed: false, timeSpentMinutes: 30 },
      { id: 'sub-18', title: 'Kiểm tra độc tấu bài nhảy trước Huấn luyện viên', completed: false, timeSpentMinutes: 45 }
    ]
  }
];

export const DEFAULT_DEPARTMENTS: string[] = [
  // 🏢 Khối Phòng Ban Quản Lý & Vận Hành
  'Ban Giám Đốc',
  'HR & Kế Toán',
  'Phòng Quản Lý & Phát Triển Idol',
  'Marketing & Truyền Thông',
  'Kinh Doanh Nhãn Hàng',
  'Nội Dung & Sản Xuất',
  'Vận Hành Livestream',

  // ⭐ Khối 3 Nhóm Idol Chuyên Biệt
  'Nhóm Idol Gaming & Gear',
  'Nhóm Idol Biểu Diễn & Donate (PK)',
  'Nhóm Idol Live Commerce & Chốt Đơn'
];

export const DEFAULT_COLUMN_HEADERS = {
  stt: 'STT',
  stageName: 'Nghệ Danh & Ảnh',
  realName: 'Tên Thật',
  age: 'Tuổi',
  dob: 'Ngày Sinh',
  joinDate: 'Ngày Vào',
  tenure: 'Thâm Niên',
  role: 'Nghề Nghiệp',
  height: 'Chiều Cao',
  weight: 'Cân Nặng',
  hometown: 'Quê Quán',
  currentLiving: 'Nơi Sống',
  department: 'Thuộc Đơn Vị',
  personnelType: 'Loại Nhân Sự',
  status: 'Trạng Thái',
  actions: 'Thao Tác'
};

export const DEFAULT_PERSONNEL_TYPES: string[] = [
  'Công ty',
  'Outsource',
  'Cộng tác viên',
  'Thực tập sinh',
  'Dịch vụ ngoài'
];

export const DEFAULT_SETTINGS = {
  referenceYear: new Date().getFullYear(),
  referenceDate: '', // If empty, defaults to current date (today)
  brandName: 'AURA TALENT',
  brandTagline: 'Idol Agency OS',
  brandLogoUrl: '', // Default icon
  tieBreakerEnabled: true,
  tieBreakerCriteriaIds: [], // if empty or set, can be configured
  scoreCalculationMode: 'sum' as const // 'sum' = Tổng cộng các tiêu chí, 'weighted' = Điểm theo % trọng số
};

export const DEFAULT_STATUSES: string[] = [
  'Đang hoạt động',
  'Đang lưu diễn',
  'Đang ghi hình',
  'Tạm nghỉ',
  'Đã nghỉ việc'
];

export const DEFAULT_USERS: UserAccount[] = [
  // 🏢 7 CÁN BỘ QUẢN LÝ & VẬN HÀNH
  {
    id: 'user-01',
    username: 'admin',
    email: 'admin@auratalent.vn',
    password: '123',
    name: 'Minh Khang',
    role: 'super_admin',
    roleTitle: 'Giám Đốc Điều Hành (Super Admin)',
    isSuperAdmin: true,
    allowedTabs: ['roster', 'scoring', 'leaderboard', 'schedule', 'tasks', 'analytics', 'payroll', 'kpi', 'admin'],
    allowedDepartments: ['*'],
    allowedActions: [
      'manage_idols',
      'manage_scores',
      'manage_criteria',
      'manage_schedule',
      'manage_tasks',
      'manage_departments',
      'manage_settings',
      'manage_approvals',
      'manage_payroll',
      'manage_kpi'
    ],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 35000000,
    joinDate: '2022-01-01',
    personnelType: 'Ban Giám Đốc',
    department: 'Ban Giám Đốc',
    bankName: 'Vietcombank',
    bankAccountNumber: '0071001234567',
    bankAccountName: 'MINH KHANG',
    idolId: 'staff-01'
  },
  {
    id: 'user-hr',
    username: 'hr_admin',
    email: 'hr@auratalent.vn',
    password: '123',
    name: 'Vũ Kim Ngân',
    role: 'custom',
    roleTitle: 'Chuyên Viên Nhân Sự & Kế Toán',
    isSuperAdmin: false,
    allowedTabs: ['roster', 'schedule', 'analytics', 'payroll', 'kpi'],
    allowedDepartments: ['*'],
    allowedActions: ['manage_idols', 'manage_approvals', 'manage_payroll', 'manage_kpi'],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 18000000,
    joinDate: '2022-10-01',
    personnelType: 'Khối Vận Hành',
    department: 'HR & Kế Toán',
    bankName: 'Techcombank',
    bankAccountNumber: '1902883399',
    bankAccountName: 'VU KIM NGAN',
    idolId: 'staff-02'
  },
  {
    id: 'user-talent-head',
    username: 'talent_head',
    email: 'talent.head@auratalent.vn',
    password: '123',
    name: 'Nguyễn Hà Anh',
    role: 'manager',
    roleTitle: 'Trưởng Phòng QL & Phát Triển Idol',
    isSuperAdmin: false,
    allowedTabs: ['roster', 'schedule', 'tasks', 'analytics', 'kpi'],
    allowedDepartments: [
      'Nhóm Idol Gaming & Gear',
      'Nhóm Idol Biểu Diễn & Donate (PK)',
      'Nhóm Idol Live Commerce & Chốt Đơn'
    ],
    allowedActions: [
      'manage_idols',
      'manage_schedule',
      'manage_tasks',
      'manage_approvals',
      'manage_kpi'
    ],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 25000000,
    joinDate: '2022-06-01',
    personnelType: 'Khối Vận Hành',
    department: 'Phòng Quản Lý & Phát Triển Idol',
    bankName: 'Techcombank',
    bankAccountNumber: '1903668822',
    bankAccountName: 'NGUYEN HA ANH',
    idolId: 'staff-03'
  },
  {
    id: 'user-marketing',
    username: 'marketing_pr',
    email: 'marketing@auratalent.vn',
    password: '123',
    name: 'Hoàng Hải Yến',
    role: 'custom',
    roleTitle: 'Chuyên Viên Marketing & PR',
    isSuperAdmin: false,
    allowedTabs: ['roster', 'schedule', 'tasks', 'analytics'],
    allowedDepartments: ['*'],
    allowedActions: ['manage_tasks'],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 16000000,
    joinDate: '2023-04-01',
    personnelType: 'Khối Vận Hành',
    department: 'Marketing & Truyền Thông',
    bankName: 'MB Bank',
    bankAccountNumber: '0911223344',
    bankAccountName: 'HOANG HAI YEN',
    idolId: 'staff-04'
  },
  {
    id: 'user-booking',
    username: 'booking_ads',
    email: 'booking@auratalent.vn',
    password: '123',
    name: 'Lê Quỳnh Chi',
    role: 'custom',
    roleTitle: 'Chuyên Viên Kinh Doanh Nhãn Hàng',
    isSuperAdmin: false,
    allowedTabs: ['roster', 'schedule', 'tasks', 'analytics'],
    allowedDepartments: ['*'],
    allowedActions: ['manage_tasks', 'manage_schedule'],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 15000000,
    joinDate: '2023-09-15',
    personnelType: 'Khối Vận Hành',
    department: 'Kinh Doanh Nhãn Hàng',
    bankName: 'TPBank',
    bankAccountNumber: '0344556677',
    bankAccountName: 'LE QUYNH CHI',
    idolId: 'staff-05'
  },
  {
    id: 'user-content',
    username: 'content_producer',
    email: 'production@auratalent.vn',
    password: '123',
    name: 'Lê Tuấn Kiệt',
    role: 'custom',
    roleTitle: 'Đạo Diễn & Sản Xuất Video',
    isSuperAdmin: false,
    allowedTabs: ['roster', 'schedule', 'tasks'],
    allowedDepartments: ['*'],
    allowedActions: ['manage_tasks', 'manage_schedule'],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 17000000,
    joinDate: '2023-03-01',
    personnelType: 'Khối Vận Hành',
    department: 'Nội Dung & Sản Xuất',
    bankName: 'Techcombank',
    bankAccountNumber: '1903882211',
    bankAccountName: 'LE TUAN KIET',
    idolId: 'staff-06'
  },
  {
    id: 'user-live-ops',
    username: 'live_ops',
    email: 'live.ops@auratalent.vn',
    password: '123',
    name: 'Trần Hải Đăng',
    role: 'custom',
    roleTitle: 'Kỹ Thuật Viên Vận Hành Livestream',
    isSuperAdmin: false,
    allowedTabs: ['schedule', 'tasks', 'roster'],
    allowedDepartments: ['*'],
    allowedActions: ['manage_schedule', 'manage_tasks'],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    baseSalary: 16000000,
    joinDate: '2023-08-01',
    personnelType: 'Khối Vận Hành',
    department: 'Vận Hành Livestream',
    bankName: 'Vietcombank',
    bankAccountNumber: '0451000889977',
    bankAccountName: 'TRAN HAI DANG',
    idolId: 'staff-07'
  },

  // ⭐ 6 IDOL NGHỆ SĨ
  {
    id: 'user-anhtm',
    username: 'anhtm',
    email: 'anhtm@auratalent.vn',
    password: '123',
    name: 'Trần Minh Anh (Aria)',
    role: 'viewer',
    roleTitle: 'Idol (Vocal Chính & Visual)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'schedule', 'tasks'],
    allowedDepartments: ['Nhóm Idol Biểu Diễn & Donate (PK)'],
    allowedActions: [],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    idolId: 'idol-01'
  },
  {
    id: 'user-baong',
    username: 'baong',
    email: 'baong@auratalent.vn',
    password: '123',
    name: 'Lê Bảo Vy (G-Leo)',
    role: 'viewer',
    roleTitle: 'Idol (Streamer Game & Gear)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'schedule', 'tasks'],
    allowedDepartments: ['Nhóm Idol Gaming & Gear'],
    allowedActions: [],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    idolId: 'idol-02'
  },
  {
    id: 'user-vyvt',
    username: 'vyvt',
    email: 'vyvt@auratalent.vn',
    password: '123',
    name: 'Vũ Thảo Vy (Chloe Vũ)',
    role: 'viewer',
    roleTitle: 'Idol (Vũ Đạo & PK Sôi Nổi)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'schedule', 'tasks'],
    allowedDepartments: ['Nhóm Idol Biểu Diễn & Donate (PK)'],
    allowedActions: [],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    idolId: 'idol-03'
  },
  {
    id: 'user-namlh',
    username: 'namlh',
    email: 'namlh@auratalent.vn',
    password: '123',
    name: 'Đặng Khánh An (Kenzo)',
    role: 'viewer',
    roleTitle: 'Idol (Streamer Gaming PK)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'schedule', 'tasks'],
    allowedDepartments: ['Nhóm Idol Gaming & Gear'],
    allowedActions: [],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    idolId: 'idol-04'
  },
  {
    id: 'user-anhdn',
    username: 'anhdn',
    email: 'anhdn@auratalent.vn',
    password: '123',
    name: 'Đoàn Ngọc Ánh (Luna Đoàn)',
    role: 'viewer',
    roleTitle: 'Idol (Live Commerce Thời Trang)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'schedule', 'tasks'],
    allowedDepartments: ['Nhóm Idol Live Commerce & Chốt Đơn'],
    allowedActions: [],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    idolId: 'idol-05'
  },
  {
    id: 'user-duypd',
    username: 'duypd',
    email: 'duypd@auratalent.vn',
    password: '123',
    name: 'Trịnh Hà My (K-Jun)',
    role: 'viewer',
    roleTitle: 'Idol (Live Commerce Mỹ Phẩm)',
    isSuperAdmin: false,
    allowedTabs: ['my_dashboard', 'schedule', 'tasks'],
    allowedDepartments: ['Nhóm Idol Live Commerce & Chốt Đơn'],
    allowedActions: [],
    avatarUrl: DEFAULT_BLANK_AVATAR,
    idolId: 'idol-06'
  }
];

export const DEFAULT_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'leave-01',
    idolId: 'idol-01',
    idolName: 'Minh Anh (Aria)',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    leaveType: 'annual',
    startDate: '2026-10-27',
    endDate: '2026-10-28',
    totalDays: 2,
    reason: 'Về quê Đà Nẵng dự đám cưới chị gái',
    status: 'approved',
    createdAt: '2026-10-20T08:00:00.000Z',
    reviewedBy: {
      id: 'user-01',
      name: 'Lưu Mạc (Giám Đốc)'
    },
    reviewNote: 'Đồng ý duyệt, chú ý giữ sức khỏe giọng hát.',
    reviewedAt: '2026-10-21T09:30:00.000Z'
  },
  {
    id: 'leave-02',
    idolId: 'idol-02',
    idolName: 'G-Leo (Nguyễn Gia Bảo)',
    department: 'Nhóm Idol Gaming & Gear',
    leaveType: 'sick',
    startDate: '2026-10-29',
    endDate: '2026-10-29',
    totalDays: 1,
    reason: 'Khám kiểm tra thanh quản định kỳ tại bệnh viện Tai Mũi Họng',
    status: 'pending',
    createdAt: '2026-10-24T14:20:00.000Z'
  }
];

export const DEFAULT_APPROVALS: ApprovalRequest[] = [
  {
    id: 'appr-01',
    type: 'create_idol',
    status: 'pending',
    requestedBy: {
      id: 'user-03',
      username: 'manager',
      name: 'Phương Linh',
      roleTitle: 'Điều Phối Viên Lịch Trình & Nghệ Sĩ'
    },
    targetName: 'Minh Khôi (Leo)',
    reason: 'Đề xuất bổ sung thực tập sinh tiềm năng đạt giải Á quân Voice Contest',
    data: {
      stageName: 'Minh Khôi (Leo)',
      realName: 'Đặng Minh Khôi',
      dob: '2005-09-12',
      role: 'Vocalist / Guitarist',
      weight: 64,
      height: 179,
      hometown: 'Đà Nẵng',
      currentLiving: 'TP. Hồ Chí Minh',
      department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
      status: 'Thực tập sinh',
      avatarUrl: DEFAULT_BLANK_AVATAR,
      bio: 'Thực tập sinh triển vọng với chất giọng trầm ấm và khả năng chơi guitar fingerstyle điêu luyện.',
      socialLinks: {
        instagram: 'leo_khoi2005',
        tiktok: '@leo_vocals'
      }
    },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

export const DEFAULT_SCHEDULES: WorkScheduleSlot[] = [
  // Minh Anh (Aria) - idol-01: Live Stream Buổi Tối trên TikTok Live
  {
    id: 'sched-01',
    idolId: 'idol-01',
    dayOfWeek: 1, // Thứ 2
    shiftType: 'evening',
    startTime: '19:30',
    endTime: '23:00',
    platform: 'TikTok Live',
    title: 'Live Stream Giao Lưu Đầu Tuần & Hát Theo Yêu Cầu',
    notes: 'Phòng Live Studio 01. Chuẩn bị mic Shure và đèn hắt 5600K',
    isActive: true
  },
  {
    id: 'sched-02',
    idolId: 'idol-01',
    dayOfWeek: 3, // Thứ 4
    shiftType: 'evening',
    startTime: '20:00',
    endTime: '23:30',
    platform: 'TikTok Live',
    title: 'Live PK Cùng Khách Mời Top Creator',
    notes: 'Trận PK chính thức lúc 21:00',
    isActive: true
  },
  {
    id: 'sched-03',
    idolId: 'idol-01',
    dayOfWeek: 5, // Thứ 6
    shiftType: 'evening',
    startTime: '20:00',
    endTime: '23:45',
    platform: 'TikTok Live',
    title: 'Acoustic Night & Trò Chuyện Đêm Cuối Tuần',
    notes: 'Có nghệ sĩ đệm đàn guitar tại studio',
    isActive: true
  },
  {
    id: 'sched-04',
    idolId: 'idol-01',
    dayOfWeek: 7, // Chủ Nhật
    shiftType: 'afternoon',
    startTime: '14:30',
    endTime: '17:30',
    platform: 'Shopee Live',
    title: 'Live Bán Hàng & Giới Thiệu Sản Phẩm Mỹ Phẩm',
    notes: 'Kịch bản do đối tác nhãn hàng gửi',
    isActive: true
  },

  // G-Leo - idol-02: Live Stream Buổi Sáng & Chiều
  {
    id: 'sched-05',
    idolId: 'idol-02',
    dayOfWeek: 2, // Thứ 3
    shiftType: 'morning',
    startTime: '09:00',
    endTime: '12:00',
    platform: 'Bigo Live',
    title: 'Ca Sáng: Chia Sẻ Sáng Tác Nhạc & Beat-making',
    notes: 'Live trực tiếp từ phòng thu Home Studio',
    isActive: true
  },
  {
    id: 'sched-06',
    idolId: 'idol-02',
    dayOfWeek: 4, // Thứ 5
    shiftType: 'morning',
    startTime: '09:00',
    endTime: '12:00',
    platform: 'Bigo Live',
    title: 'Ca Sáng: Luyện Giọng & Rap Freestyle',
    notes: 'Thực hiện thử thách tương tác fan',
    isActive: true
  },
  {
    id: 'sched-07',
    idolId: 'idol-02',
    dayOfWeek: 6, // Thứ 7
    shiftType: 'evening',
    startTime: '20:00',
    endTime: '23:30',
    platform: 'TikTok Live',
    title: 'Weekend Live Stream & Showmatch Gaming & Gear',
    notes: 'Studio Gaming Room',
    isActive: true
  },

  // Bảo Hân (Chloe) - idol-03: Khung Giờ Tùy Chỉnh (Đêm) & Ca Chiều
  {
    id: 'sched-08',
    idolId: 'idol-03',
    dayOfWeek: 1, // Thứ 2
    shiftType: 'afternoon',
    startTime: '14:00',
    endTime: '17:30',
    platform: 'Studio Agency',
    title: 'Tập Luyện Vũ Đạo & Live Hậu Trường',
    notes: 'Phòng tập Dance Studio A',
    isActive: true
  },
  {
    id: 'sched-09',
    idolId: 'idol-03',
    dayOfWeek: 3, // Thứ 4
    shiftType: 'custom',
    startTime: '21:30',
    endTime: '01:00',
    platform: 'TikTok Live',
    title: 'Late Night Talkshow & ASMR Trò Chuyện Đêm Khuya',
    notes: 'Khung giờ đêm tùy chỉnh theo yêu cầu đối tác nước ngoài',
    isActive: true
  },
  {
    id: 'sched-10',
    idolId: 'idol-03',
    dayOfWeek: 6, // Thứ 7
    shiftType: 'evening',
    startTime: '19:30',
    endTime: '23:00',
    platform: 'TikTok Live',
    title: 'Live Biểu Diễn Vũ Đạo & Thử Thách Xu Hướng',
    notes: 'Trang phục concept Neon',
    isActive: true
  },

  // Khánh Linh (Ruby) - idol-04: Ca Sáng đều đặn
  {
    id: 'sched-11',
    idolId: 'idol-04',
    dayOfWeek: 1, // Thứ 2
    shiftType: 'morning',
    startTime: '08:30',
    endTime: '11:30',
    platform: 'Facebook Live',
    title: 'Chào Buổi Sáng Cùng Ruby: Tán Gẫu & Năng Lượng Tích Cực',
    notes: 'Quán cafe hoặc phòng riêng',
    isActive: true
  },
  {
    id: 'sched-12',
    idolId: 'idol-04',
    dayOfWeek: 3, // Thứ 4
    shiftType: 'morning',
    startTime: '08:30',
    endTime: '11:30',
    platform: 'Facebook Live',
    title: 'Chia Sẻ Tips Làm Đẹp & Skincare Buổi Sáng',
    notes: 'Tài trợ sản phẩm nhãn hàng',
    isActive: true
  },
  {
    id: 'sched-13',
    idolId: 'idol-04',
    dayOfWeek: 5, // Thứ 6
    shiftType: 'evening',
    startTime: '19:30',
    endTime: '22:30',
    platform: 'TikTok Live',
    title: 'Live Hát Nhạc Phim & Tương Tác Cùng Khán Giả',
    notes: 'Phòng Studio 02',
    isActive: true
  }
];

export const DEFAULT_PAYROLL_PERIODS: PayrollPeriod[] = [
  {
    id: 'payroll-2026-10',
    period: '2026-10',
    status: 'draft',
    totalGross: 147200000,
    totalDeductions: 13700000,
    totalHotBonus: 2000000,
    totalNet: 133500000,
    employeeCount: 8,
    submittedBy: {
      id: 'user-05',
      name: 'Lê Thị Mai Hương',
      roleTitle: 'Chuyên Viên Nhân Sự & Kế Toán'
    },
    submittedAt: '2026-10-25T17:00:00.000Z',
    createdAt: '2026-10-25T08:00:00.000Z'
  },
  {
    id: 'payroll-2026-09',
    period: '2026-09',
    status: 'locked_paid',
    totalGross: 142500000,
    totalDeductions: 11200000,
    totalHotBonus: 5000000,
    totalNet: 131300000,
    employeeCount: 8,
    approvedBy: {
      id: 'user-01',
      name: 'Gia Huy (Giám Đốc)'
    },
    approvedAt: '2026-10-05T09:30:00.000Z',
    lockedAt: '2026-10-05T15:00:00.000Z',
    createdAt: '2026-09-28T08:00:00.000Z'
  }
];

export const DEFAULT_PAYROLL_RECORDS: PayrollRecord[] = [
  // 1. Minh Anh (Aria) - idol-01 (Công ty)
  {
    id: 'payrec-2026-10-01',
    periodId: 'payroll-2026-10',
    period: '2026-10',
    userId: 'user-idol-01',
    idolId: 'idol-01',
    employeeName: 'Trần Minh Anh',
    stageName: 'Minh Anh (Aria)',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    personnelType: 'Công ty',
    isIdol: true,
    bankInfo: {
      bankName: 'MB Bank (Quân Đội)',
      accountNumber: '1900889988',
      accountName: 'TRAN MINH ANH'
    },
    earnings: {
      baseSalary: 15000000,
      kpiBonus: 3000000,
      commissionGmv: 4200000,
      giftShare: 1800000,
      allowance: 1000000,
      hotBonus: 2000000,
      hotBonusReason: 'Livestream đạt 10.000 mắt xem kỷ lục và viral top 1 TikTok',
      hotBonusAwardedBy: 'Gia Huy (Giám Đốc)',
      hotBonusAwardedAt: '2026-10-24T14:30:00.000Z',
      otherBonus: 0,
      totalGross: 27000000
    },
    deductions: {
      liveHoursPenalty: 0,
      unpaidLeaveDeduction: 0,
      advancePayment: 0,
      tax: 1200000,
      insurance: 1500000,
      otherPenalty: 0,
      totalDeductions: 2700000
    },
    netSalary: 24300000,
    paymentStatus: 'pending',
    notes: 'Kỳ lương xuất sắc, đề xuất Giám Đốc khen thưởng nóng'
  },

  // 2. Bảo Vy (G-Leo) - idol-02 (Công ty)
  {
    id: 'payrec-2026-10-02',
    periodId: 'payroll-2026-10',
    period: '2026-10',
    userId: 'user-idol-02',
    idolId: 'idol-02',
    employeeName: 'Lê Bảo Vy',
    stageName: 'Bảo Vy (G-Leo)',
    department: 'Nhóm Idol Gaming & Gear',
    personnelType: 'Công ty',
    isIdol: true,
    bankInfo: {
      bankName: 'Techcombank',
      accountNumber: '1903668822',
      accountName: 'LE BAO VY'
    },
    earnings: {
      baseSalary: 18000000,
      kpiBonus: 3000000,
      commissionGmv: 2500000,
      giftShare: 3200000,
      allowance: 1000000,
      hotBonus: 0,
      otherBonus: 0,
      totalGross: 27700000
    },
    deductions: {
      liveHoursPenalty: 0,
      unpaidLeaveDeduction: 0,
      advancePayment: 5000000,
      tax: 1500000,
      insurance: 1800000,
      otherPenalty: 0,
      totalDeductions: 8300000
    },
    netSalary: 19400000,
    paymentStatus: 'pending',
    notes: 'Đã trừ tạm ứng 5.000.000 đ theo phiếu ngày 10/10'
  },

  // 3. Chloe Vũ (Vũ Thảo Vy) - idol-03 (Outsource)
  {
    id: 'payrec-2026-10-03',
    periodId: 'payroll-2026-10',
    period: '2026-10',
    userId: 'user-idol-03',
    idolId: 'idol-03',
    employeeName: 'Vũ Thảo Vy',
    stageName: 'Chloe Vũ',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    personnelType: 'Outsource',
    isIdol: true,
    bankInfo: {
      bankName: 'Vietcombank',
      accountNumber: '0071001234567',
      accountName: 'VU THAO VY'
    },
    earnings: {
      baseSalary: 14000000,
      kpiBonus: 1500000,
      commissionGmv: 1800000,
      giftShare: 800000,
      allowance: 1000000,
      hotBonus: 0,
      otherBonus: 0,
      totalGross: 19100000
    },
    deductions: {
      liveHoursPenalty: 0,
      unpaidLeaveDeduction: 0,
      advancePayment: 0,
      tax: 900000,
      insurance: 0,
      otherPenalty: 0,
      totalDeductions: 900000
    },
    netSalary: 18200000,
    paymentStatus: 'pending'
  },

  // 4. Khánh An (Kenzo) - idol-04 (Công ty)
  {
    id: 'payrec-2026-10-04',
    periodId: 'payroll-2026-10',
    period: '2026-10',
    userId: 'user-idol-04',
    idolId: 'idol-04',
    employeeName: 'Đặng Khánh An',
    stageName: 'Khánh An (Kenzo)',
    department: 'Nhóm Idol Gaming & Gear',
    personnelType: 'Công ty',
    isIdol: true,
    bankInfo: {
      bankName: 'ACB',
      accountNumber: '22889911',
      accountName: 'DANG KHANH AN'
    },
    earnings: {
      baseSalary: 13500000,
      kpiBonus: 1500000,
      commissionGmv: 0,
      giftShare: 1200000,
      allowance: 1000000,
      hotBonus: 0,
      otherBonus: 0,
      totalGross: 17200000
    },
    deductions: {
      liveHoursPenalty: 500000,
      unpaidLeaveDeduction: 0,
      advancePayment: 0,
      tax: 700000,
      insurance: 1350000,
      otherPenalty: 0,
      totalDeductions: 2550000
    },
    netSalary: 14650000,
    paymentStatus: 'pending',
    notes: 'Khấu trừ 500.000 đ do thiếu 6h live so với target 60h'
  },

  // 5. Luna Đoàn (Đoàn Ngọc Ánh) - idol-05 (Cộng tác viên)
  {
    id: 'payrec-2026-10-05',
    periodId: 'payroll-2026-10',
    period: '2026-10',
    userId: 'user-idol-05',
    idolId: 'idol-05',
    employeeName: 'Đoàn Ngọc Ánh',
    stageName: 'Luna Đoàn',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    personnelType: 'Cộng tác viên',
    isIdol: true,
    bankInfo: {
      bankName: 'VPBank',
      accountNumber: '158992211',
      accountName: 'DOAN NGOC ANH'
    },
    earnings: {
      baseSalary: 8000000,
      kpiBonus: 500000,
      commissionGmv: 1500000,
      giftShare: 500000,
      allowance: 500000,
      hotBonus: 0,
      otherBonus: 0,
      totalGross: 11000000
    },
    deductions: {
      liveHoursPenalty: 0,
      unpaidLeaveDeduction: 0,
      advancePayment: 0,
      tax: 500000,
      insurance: 0,
      otherPenalty: 0,
      totalDeductions: 500000
    },
    netSalary: 10500000,
    paymentStatus: 'pending'
  },

  // 6. Hà My (Trịnh Hà My) - idol-06 (Công ty)
  {
    id: 'payrec-2026-10-06',
    periodId: 'payroll-2026-10',
    period: '2026-10',
    userId: 'user-idol-06',
    idolId: 'idol-06',
    employeeName: 'Trịnh Hà My',
    stageName: 'Hà My (K-Jun)',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    personnelType: 'Công ty',
    isIdol: true,
    bankInfo: {
      bankName: 'TPBank',
      accountNumber: '0344556677',
      accountName: 'TRINH HA MY'
    },
    earnings: {
      baseSalary: 5500000,
      kpiBonus: 500000,
      commissionGmv: 0,
      giftShare: 200000,
      allowance: 500000,
      hotBonus: 0,
      otherBonus: 0,
      totalGross: 6700000
    },
    deductions: {
      liveHoursPenalty: 0,
      unpaidLeaveDeduction: 0,
      advancePayment: 0,
      tax: 0,
      insurance: 0,
      otherPenalty: 0,
      totalDeductions: 0
    },
    netSalary: 6700000,
    paymentStatus: 'pending'
  }
];

// Danh mục Nhóm Chỉ Định Mặc Định (Bao gồm các nhóm hệ thống & 1 nhóm chỉ định mẫu)
export const DEFAULT_KPI_GROUPS: KpiGroup[] = [
  // 1. Nhóm Idol Live Commerce & Chốt Đơn
  {
    id: 'kpi-grp-commerce',
    name: 'Nhóm Idol Live Commerce & Chốt Đơn',
    description: 'Đội ngũ Host chuyên nghiệp chốt đơn thời trang, mỹ phẩm trên TikTok Shop & Shopee Live',
    type: 'system',
    category: 'idol',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    memberIds: ['idol-04', 'idol-06'],
    leaderId: 'idol-04',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  // 2. Nhóm Idol Gaming & Gear
  {
    id: 'kpi-grp-gaming',
    name: 'Nhóm Idol Gaming & Gear',
    description: 'Idol nữ streamer game, review thiết bị gaming gear & gắn giỏ hàng công nghệ',
    type: 'system',
    category: 'idol',
    department: 'Nhóm Idol Gaming & Gear',
    memberIds: ['idol-02', 'idol-05'],
    leaderId: 'idol-02',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  // 3. Nhóm Idol Biểu Diễn & Donate (PK)
  {
    id: 'kpi-grp-pk',
    name: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    description: 'Nghệ sĩ biểu diễn ca hát, nhảy theo yêu cầu fan, thi đấu PK liên phòng và nhận donate',
    type: 'system',
    category: 'idol',
    department: 'Nhóm Idol Biểu Diễn & Donate (PK)',
    memberIds: ['idol-01', 'idol-03'],
    leaderId: 'idol-01',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  // 4. Phòng Marketing & Truyền Thông
  {
    id: 'kpi-grp-marketing',
    name: 'Phòng Marketing & Truyền Thông',
    description: 'Xây dựng hình ảnh nghệ sĩ, truyền thông thương hiệu và kéo traffic phiên live',
    type: 'system',
    category: 'corporate',
    department: 'Marketing & Truyền Thông',
    memberIds: ['staff-corp-04'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  // 5. Phòng Kinh Doanh Nhãn Hàng
  {
    id: 'kpi-grp-sales',
    name: 'Phòng Kinh Doanh Nhãn Hàng',
    description: 'Khai thác hợp đồng tài trợ, booking quảng cáo và đàm phán hoa hồng nhãn hàng',
    type: 'system',
    category: 'corporate',
    department: 'Kinh Doanh Nhãn Hàng',
    memberIds: ['staff-corp-05'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  // 6. Nhóm Nhân Viên Chỉ Định (Custom Group ví dụ): Đội Chiến Dịch Mega Sale 11.11
  {
    id: 'kpi-grp-mega-sale',
    name: 'Đội Chiến Dịch Mega Sale 11.11',
    description: 'Tổ xung kích đặc biệt kết hợp các Idol chốt đơn chủ lực và Reviewer công nghệ đẩy doanh số lễ hội mua sắm 11.11',
    type: 'custom',
    category: 'mixed',
    department: 'Nhóm Idol Live Commerce & Chốt Đơn',
    memberIds: ['idol-04', 'idol-06', 'idol-02'],
    leaderId: 'idol-04',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  }
];

// Danh mục Chỉ Tiêu KPI Mặc Định
export const DEFAULT_KPI_SETTINGS: KpiSetting[] = [
  // KPI cho Nhóm Live Commerce
  {
    id: 'kpi-set-01',
    code: 'GMV_LIVE',
    name: 'Doanh số GMV Live Commerce',
    description: 'Tổng giá trị hàng hóa thanh toán thành công qua giỏ hàng các phiên livestream trong tháng',
    unit: 'VNĐ',
    scopeType: 'group',
    groupId: 'kpi-grp-commerce',
    period: 'monthly',
    targetValue: 50000000,
    minThreshold: 30000000,
    weight: 50,
    bonusIncentive: {
      ratePercent: 5,
      flatBonusVnd: 1000000
    },
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'kpi-set-02',
    code: 'LIVE_HOURS_COMMERCE',
    name: 'Số giờ Livestream bán hàng tối thiểu',
    description: 'Tổng số giờ lên sóng thực tế phục vụ các phiên live chốt đơn',
    unit: 'Giờ',
    scopeType: 'group',
    groupId: 'kpi-grp-commerce',
    period: 'monthly',
    targetValue: 60,
    minThreshold: 45,
    weight: 30,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'kpi-set-03',
    code: 'ORDERS_COMPLETED',
    name: 'Số lượng đơn hàng hoàn tất',
    description: 'Số đơn hàng được khách hàng thanh toán và giao nhận thành công',
    unit: 'Đơn hàng',
    scopeType: 'group',
    groupId: 'kpi-grp-commerce',
    period: 'monthly',
    targetValue: 300,
    minThreshold: 200,
    weight: 20,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },

  // KPI cho Nhóm Gaming & Gear
  {
    id: 'kpi-set-04',
    code: 'STREAM_HOURS_GAMING',
    name: 'Giờ livestream game & giao lưu',
    description: 'Thời lượng phát sóng các tựa game định hướng theo lịch phân công',
    unit: 'Giờ',
    scopeType: 'group',
    groupId: 'kpi-grp-gaming',
    period: 'monthly',
    targetValue: 75,
    minThreshold: 50,
    weight: 40,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'kpi-set-05',
    code: 'GEAR_SALES',
    name: 'Doanh số thiết bị & gear qua giỏ hàng',
    description: 'Doanh số bán thiết bị tai nghe, phím cơ, chuột gaming gắn trong phiên live',
    unit: 'VNĐ',
    scopeType: 'group',
    groupId: 'kpi-grp-gaming',
    period: 'monthly',
    targetValue: 30000000,
    minThreshold: 15000000,
    weight: 40,
    bonusIncentive: {
      ratePercent: 4
    },
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'kpi-set-06',
    code: 'NEW_FOLLOWERS',
    name: 'Tăng trưởng người theo dõi mới',
    description: 'Lượng follower tăng thêm trên các kênh chính thức trong tháng',
    unit: 'Followers',
    scopeType: 'group',
    groupId: 'kpi-grp-gaming',
    period: 'monthly',
    targetValue: 5000,
    minThreshold: 2000,
    weight: 20,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },

  // KPI cho Nhóm Biểu Diễn & Donate (PK)
  {
    id: 'kpi-set-07',
    code: 'DONATE_REVENUE',
    name: 'Doanh thu quà tặng & donate PK',
    description: 'Tổng giá trị kim cương/xu donate nhận được từ các trận đấu PK và biểu diễn',
    unit: 'VNĐ',
    scopeType: 'group',
    groupId: 'kpi-grp-pk',
    period: 'monthly',
    targetValue: 40000000,
    minThreshold: 20000000,
    weight: 50,
    bonusIncentive: {
      ratePercent: 6
    },
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'kpi-set-08',
    code: 'PK_MATCHES_WON',
    name: 'Số trận thắng đấu kèo PK liên phòng',
    description: 'Số trận PK giành chiến thắng trước các Idol đối tác/đối thủ',
    unit: 'Trận',
    scopeType: 'group',
    groupId: 'kpi-grp-pk',
    period: 'monthly',
    targetValue: 25,
    minThreshold: 15,
    weight: 30,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'kpi-set-09',
    code: 'SHOW_PERFORMANCES',
    name: 'Số tiết mục biểu diễn mới',
    description: 'Số bài hát, điệu nhảy hoặc tiết mục sáng tạo mới được trình diễn',
    unit: 'Tiết mục',
    scopeType: 'group',
    groupId: 'kpi-grp-pk',
    period: 'monthly',
    targetValue: 10,
    minThreshold: 6,
    weight: 20,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  },

  // KPI cho Nhóm Chỉ Định: Đội Chiến Dịch Mega Sale 11.11
  {
    id: 'kpi-set-10',
    code: 'MEGA_SALE_GMV',
    name: 'Mục tiêu GMV Chiến Dịch 11.11',
    description: 'Doanh số mục tiêu toàn chiến dịch 11.11 áp dụng chung cho cả đội xung kích',
    unit: 'VNĐ',
    scopeType: 'group',
    groupId: 'kpi-grp-mega-sale',
    period: 'monthly',
    targetValue: 150000000,
    minThreshold: 100000000,
    weight: 70,
    bonusIncentive: {
      ratePercent: 7,
      flatBonusVnd: 5000000
    },
    status: 'active',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'kpi-set-11',
    code: 'MEGA_SALE_CONVERSION',
    name: 'Tỷ lệ chuyển đổi đơn hàng phiên sale',
    description: 'Tỷ lệ người xem click giỏ hàng đặt mua thành công',
    unit: '%',
    scopeType: 'group',
    groupId: 'kpi-grp-mega-sale',
    period: 'monthly',
    targetValue: 15,
    minThreshold: 10,
    weight: 30,
    status: 'active',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },

  // KPI riêng cho Cá Nhân Chỉ Định (Ví dụ: Luna Đoàn idol-04 là Host chủ lực)
  {
    id: 'kpi-set-12',
    code: 'STAR_HOST_BONUS',
    name: 'Định mức Top Host Doanh Số Cá Nhân',
    description: 'Chỉ tiêu bứt phá riêng dành cho Host chính Luna Đoàn trong tháng',
    unit: 'VNĐ',
    scopeType: 'individual',
    assignedIdolId: 'idol-04',
    period: 'monthly',
    targetValue: 80000000,
    minThreshold: 50000000,
    weight: 100,
    bonusIncentive: {
      ratePercent: 5,
      flatBonusVnd: 3000000
    },
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z'
  }
];


