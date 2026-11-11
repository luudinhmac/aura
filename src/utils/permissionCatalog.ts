import type { AppActionPermission, AppTabPermission } from '../types/index.ts';

export interface TabPermissionOption {
  id: AppTabPermission;
  label: string;
  desc: string;
  icon: string;
  group: 'Hồ sơ & Lịch' | 'Đánh giá & Vận hành' | 'Tài chính & Lương' | 'Hệ thống';
}

export interface ActionPermissionOption {
  id: AppActionPermission;
  label: string;
  desc: string;
  group: 'Nhân sự & Lịch' | 'KPI & Vận hành' | 'Tài chính & Lương' | 'Hệ thống';
}

export const TAB_PERMISSION_OPTIONS: TabPermissionOption[] = [
  { id: 'roster', label: 'Danh Sách Nhân Sự', desc: 'Xem danh bạ nghệ sĩ & cán bộ', icon: '👥', group: 'Hồ sơ & Lịch' },
  { id: 'my_dashboard', label: 'Dashboard Cá Nhân', desc: 'Bàn làm việc cá nhân theo vai trò', icon: '🌟', group: 'Hồ sơ & Lịch' },
  { id: 'work_assignments', label: 'Giao Việc & Công Tác', desc: 'Điều phối công việc, công tác & xử lý vi phạm', icon: '📌', group: 'Hồ sơ & Lịch' },
  { id: 'schedule', label: 'Lịch Làm Việc & Ca Live', desc: 'Xem & điều phối lịch ca làm việc', icon: '📅', group: 'Hồ sơ & Lịch' },
  { id: 'approvals', label: 'Phê Duyệt Nhân Sự & Nghỉ Phép', desc: 'Duyệt đề xuất nhân sự và đơn xin nghỉ phép', icon: '✅', group: 'Hồ sơ & Lịch' },
  { id: 'scoring', label: 'Bảng Điểm Nghệ Sĩ', desc: 'Chấm điểm và lưu đánh giá định kỳ', icon: '⭐', group: 'Đánh giá & Vận hành' },
  { id: 'leaderboard', label: 'Bảng Xếp Hạng', desc: 'Xếp hạng nghệ sĩ toàn công ty', icon: '🏆', group: 'Đánh giá & Vận hành' },
  { id: 'tasks', label: 'Quản Lý Nhiệm Vụ', desc: 'Theo dõi công việc & tiến độ cá nhân', icon: '📋', group: 'Đánh giá & Vận hành' },
  { id: 'kpi', label: 'Thiết Đặt & KPI', desc: 'Quản lý định mức KPI nhóm & cá nhân', icon: '🎯', group: 'Đánh giá & Vận hành' },
  { id: 'analytics', label: 'Báo Cáo & Thống Kê', desc: 'Báo cáo chỉ số vận hành toàn diện', icon: '📊', group: 'Đánh giá & Vận hành' },
  { id: 'revenue', label: 'Quản Lý Doanh Thu', desc: 'Ghi nhận doanh thu & tỷ lệ phân chia', icon: '💹', group: 'Tài chính & Lương' },
  { id: 'finance', label: 'Tài Chính & Lợi Nhuận', desc: 'Báo cáo P&L, chi phí & dòng tiền', icon: '🏦', group: 'Tài chính & Lương' },
  { id: 'service_usage', label: 'Lịch Sử Dịch Vụ Ngoài', desc: 'Theo dõi dịch vụ & đối soát đối tác ngoài', icon: '🤝', group: 'Tài chính & Lương' },
  { id: 'payroll', label: 'Bảng Tính Lương & Thù Lao', desc: 'Tính lương, tạm giữ và phiếu lương', icon: '💵', group: 'Tài chính & Lương' },
  { id: 'payroll_disputes', label: 'Phản Ánh Bảng Lương', desc: 'Tiếp nhận và xử lý khiếu nại bảng lương', icon: '📩', group: 'Tài chính & Lương' },
  { id: 'admin', label: 'Quản Trị Hệ Thống', desc: 'Tài khoản, phân quyền, danh mục, tiêu chí & cấu hình hệ thống', icon: '⚙️', group: 'Hệ thống' },
];

export const ACTION_PERMISSION_OPTIONS: ActionPermissionOption[] = [
  { id: 'manage_idols', label: 'Quản Lý Nhân Sự', desc: 'Thêm mới, chỉnh sửa và xóa hồ sơ Idol/Cán bộ', group: 'Nhân sự & Lịch' },
  { id: 'manage_schedule', label: 'Điều Phối Ca Live & Lịch', desc: 'Xếp phòng stream, duyệt và điều chỉnh ca trực', group: 'Nhân sự & Lịch' },
  { id: 'manage_tasks', label: 'Quản Lý Nhiệm Vụ', desc: 'Tạo task, bấm giờ và cập nhật trạng thái nhiệm vụ', group: 'KPI & Vận hành' },
  { id: 'manage_work_assignments', label: 'Giao Việc & Công Tác', desc: 'Phân công công tác, duyệt giải trình và xử lý vi phạm', group: 'KPI & Vận hành' },
  { id: 'manage_scores', label: 'Chấm Điểm Nghệ Sĩ', desc: 'Nhập điểm và lưu phiếu đánh giá', group: 'KPI & Vận hành' },
  { id: 'manage_criteria', label: 'Quản Lý Tiêu Chí', desc: 'Tạo và cập nhật thang điểm đánh giá', group: 'KPI & Vận hành' },
  { id: 'manage_kpi', label: 'Quản Lý Chỉ Số KPI', desc: 'Thiết lập nhóm KPI, chỉ tiêu doanh số và ca live', group: 'KPI & Vận hành' },
  { id: 'manage_revenue', label: 'Quản Lý Doanh Thu', desc: 'Tạo, duyệt giao dịch doanh thu & đồng bộ sang lương', group: 'Tài chính & Lương' },
  { id: 'manage_payroll', label: 'Quản Trị Bảng Lương', desc: 'Tạo kỳ lương, đồng bộ và ban hành phiếu lương', group: 'Tài chính & Lương' },
  { id: 'adjust_payroll', label: 'Điều Chỉnh Lương & Chi Phí', desc: 'Chỉnh phụ cấp, khấu trừ và hạch toán thu chi tài chính', group: 'Tài chính & Lương' },
  { id: 'approve_payroll', label: 'Phê Duyệt Bảng Lương', desc: 'Ký duyệt và chốt khóa kỳ bảng lương', group: 'Tài chính & Lương' },
  { id: 'hot_bonus', label: 'Thưởng Nóng Nghệ Sĩ', desc: 'Cấp thưởng nóng bổ sung cho Idol/nhân sự', group: 'Tài chính & Lương' },
  { id: 'manage_approvals', label: 'Phê Duyệt Yêu Cầu', desc: 'Duyệt đề xuất nhân sự và đơn xin nghỉ phép', group: 'Hệ thống' },
  { id: 'manage_departments', label: 'Quản Lý Đơn Vị & Danh Mục', desc: 'Cơ cấu phòng ban, loại nhân sự và trạng thái', group: 'Hệ thống' },
  { id: 'manage_settings', label: 'Cấu Hình Hệ Thống', desc: 'Thiết lập thương hiệu, mốc thời gian và tiêu đề cột', group: 'Hệ thống' },
];

