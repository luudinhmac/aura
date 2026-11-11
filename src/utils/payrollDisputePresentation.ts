import type { PayrollDisputeCategory, PayrollDisputeStatus } from '../types/index.ts';

export const PAYROLL_DISPUTE_CATEGORY_LABELS: Record<PayrollDisputeCategory, string> = {
  attendance: 'Lệch công / ngày công',
  live_hours: 'Sai giờ live',
  leave: 'Sai ngày nghỉ phép',
  deduction: 'Bị trừ sai',
  salary: 'Sai lương / hợp đồng',
  kpi_bonus: 'Sai KPI / thưởng',
  other: 'Khác'
};

export const PAYROLL_DISPUTE_STATUS_LABELS: Record<PayrollDisputeStatus, string> = {
  submitted: 'Chờ tiếp nhận',
  under_review: 'Đang xử lý',
  adjusted: 'Đã điều chỉnh',
  resolved: 'Đã xử lý',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy'
};

export function formatPayrollCalendarDate(value: string): string {
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

export function getPayrollFeedbackDeadline(feedbackStartsAt: string, approvalStartsAt: string): string {
  const approvalDate = new Date(`${approvalStartsAt}T00:00:00Z`);
  if (Number.isNaN(approvalDate.getTime())) return approvalStartsAt;
  approvalDate.setUTCDate(approvalDate.getUTCDate() - 1);
  return formatPayrollCalendarDate(approvalDate.toISOString().slice(0, 10));
}

const VALUE_LABELS: Record<string, string> = {
  baseSalary: 'Lương cơ bản',
  contractBaseSalary: 'Lương hợp đồng',
  totalDeductions: 'Tổng giảm trừ',
  netSalary: 'Thực nhận',
  actualWorkDays: 'Ngày công thực tế',
  standardWorkDays: 'Ngày công chuẩn',
  kpiBonus: 'Thưởng KPI',
  commissionGmv: 'Hoa hồng doanh số',
  giftShare: 'Chia sẻ quà tặng',
  allowance: 'Phụ cấp',
  liveHoursPenalty: 'Phạt thiếu giờ live',
  unpaidLeaveDeduction: 'Trừ nghỉ không lương',
  advancePayment: 'Tạm ứng',
  tax: 'Thuế TNCN',
  insurance: 'Bảo hiểm',
  description: 'Đề nghị'
};

const MONEY_KEYS = new Set(['baseSalary', 'contractBaseSalary', 'totalDeductions', 'netSalary', 'kpiBonus', 'commissionGmv', 'giftShare', 'allowance', 'liveHoursPenalty', 'unpaidLeaveDeduction', 'advancePayment', 'tax', 'insurance']);

export function formatPayrollDisputeValue(value: Record<string, unknown> | undefined): Array<{ label: string; value: string }> {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([, raw]) => raw !== null && raw !== undefined && raw !== '')
    .map(([key, raw]) => {
      const label = VALUE_LABELS[key] || key;
      const valueText = typeof raw === 'number' && MONEY_KEYS.has(key)
        ? `${raw.toLocaleString('vi-VN')} đ`
        : typeof raw === 'boolean'
          ? (raw ? 'Có' : 'Không')
          : String(raw);
      return { label, value: valueText };
    });
}
