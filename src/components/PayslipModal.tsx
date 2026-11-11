import React, { useEffect, useRef, useState } from 'react';
import { PayrollDispute, PayrollDisputeCategory, PayrollRecord, UserAccount } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatDateVN } from '../utils/dateUtils.ts';
import { getPayrollCalendarDates } from '../utils/payrollCalendar.ts';
import {
  PAYROLL_DISPUTE_CATEGORY_LABELS,
  PAYROLL_DISPUTE_STATUS_LABELS,
  formatPayrollCalendarDate,
  getPayrollFeedbackDeadline
} from '../utils/payrollDisputePresentation.ts';
import { getPayrollDisplayStatus } from '../utils/payrollDisplayStatus.ts';
import { canSubmitPayrollDispute } from '../utils/payrollDisputePolicy.ts';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
  currentUser?: UserAccount | null;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, record, currentUser }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [disputes, setDisputes] = useState<PayrollDispute[]>([]);
  const [disputeFormOpen, setDisputeFormOpen] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSaving, setDisputeSaving] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null);
  const [disputeCategory, setDisputeCategory] = useState<PayrollDisputeCategory>('other');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeRequestedValue, setDisputeRequestedValue] = useState('');
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState('');

  useEffect(() => {
    if (!isOpen || !record || !currentUser) return;
    let cancelled = false;
    setDisputeLoading(true);
    setDisputeError(null);
    void api.getPayrollDisputes(record.periodId)
      .then((items) => {
        if (!cancelled) setDisputes(items.filter((item) => item.recordId === record.id));
      })
      .catch((error) => {
        if (!cancelled) setDisputeError(error instanceof Error ? error.message : 'Không thể tải phản ánh phiếu lương');
      })
      .finally(() => {
        if (!cancelled) setDisputeLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentUser, isOpen, record?.id, record?.periodId]);

  if (!isOpen || !record) return null;

  const { earnings, deductions, bankInfo } = record;
  const displayStatus = getPayrollDisplayStatus(record.periodStatus, record.paymentStatus);
  const calendar = getPayrollCalendarDates(record.period);
  const feedbackDeadline = getPayrollFeedbackDeadline(calendar.feedbackStartsAt, calendar.approvalStartsAt);
  const canSubmitDispute = canSubmitPayrollDispute(record.periodStatus) && record.paymentStatus !== 'paid';
  const payrollPeriodStatusLabel = record.periodStatus === 'draft'
    ? 'Chưa chốt công'
    : record.periodStatus === 'pending_approval'
      ? 'Đã chốt công, chờ Giám đốc duyệt'
      : record.periodStatus === 'approved'
        ? 'Đã được Giám đốc duyệt'
        : 'Đã khóa/đã chi';

  const resetDisputeForm = () => {
    setDisputeFormOpen(false);
    setDisputeCategory('other');
    setDisputeReason('');
    setDisputeRequestedValue('');
    setDisputeEvidenceUrl('');
    setDisputeError(null);
  };

  const handleCreateDispute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitDispute || !disputeReason.trim()) return;
    setDisputeSaving(true);
    setDisputeError(null);
    setDisputeSuccess(null);
    try {
      const created = await api.createPayrollDispute(record.periodId, record.id, {
        category: disputeCategory,
        requestedValue: disputeRequestedValue.trim() ? { description: disputeRequestedValue.trim() } : undefined,
        reason: disputeReason.trim(),
        evidenceUrl: disputeEvidenceUrl.trim() || undefined
      });
      setDisputes((current) => [created, ...current]);
      setDisputeSuccess('Đã gửi phản ánh. Bộ phận phụ trách sẽ kiểm tra trước khi phê duyệt bảng lương.');
      resetDisputeForm();
    } catch (error) {
      setDisputeError(error instanceof Error ? error.message : 'Không thể gửi phản ánh phiếu lương');
    } finally {
      setDisputeSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        ref={printRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Header Thẻ Phiếu Lương */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Aura Talent Agency • Quản Lý Lương & Thưởng
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                PHIẾU LƯƠNG ĐIỆN TỬ
              </h2>
              <p className="text-xs text-slate-300">
                Kỳ chi trả: <strong className="text-amber-300">Tháng {record.period.replace('-', '/')}</strong> • Mã phiếu: #{record.id}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                title="Đóng"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                displayStatus === 'paid'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {displayStatus === 'paid'
                  ? '✓ Đã Chi Trả'
                  : displayStatus === 'pending_approval'
                    ? '⏳ Chờ Duyệt'
                    : '⏳ Chờ Chuyển Khoản'}
              </span>
            </div>
          </div>

          {/* Thông tin nhân viên */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Họ và tên:</span>
              <span className="font-bold text-white">{record.employeeName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Nghệ danh:</span>
              <span className="font-bold text-indigo-200">{record.stageName || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Đơn vị / Nhóm:</span>
              <span className="font-semibold text-slate-200">{record.department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Phân loại:</span>
              <span className="font-semibold text-amber-200">{record.personnelType}</span>
            </div>
          </div>
        </div>

        {/* Nội dung chi tiết thu nhập & khấu trừ */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Badge Thưởng Nóng của Giám Đốc nếu có */}
          {earnings.hotBonus && earnings.hotBonus > 0 ? (
            <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300/80 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs shadow-sm">
                  ⚡
                </span>
                <h4 className="font-black text-rose-950 text-sm tracking-tight">
                  ĐẶC QUYỀN: THƯỞNG NÓNG TỪ GIÁM ĐỐC
                </h4>
                <span className="ml-auto text-xs font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  +{earnings.hotBonus.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <p className="text-[11px] text-rose-900 leading-relaxed font-medium pl-8">
                {earnings.hotBonusReason || 'Khen thưởng đặc biệt vì thành tích xuất sắc đóng góp cho công ty.'}
              </p>
              {earnings.hotBonusAwardedBy && (
                <div className="text-[10px] text-rose-700/80 pl-8 mt-1 flex items-center gap-1.5">
                  <span>Quyết định bởi: <strong>{earnings.hotBonusAwardedBy}</strong></span>
                  {earnings.hotBonusAwardedAt && <span>• {new Date(earnings.hotBonusAwardedAt).toLocaleDateString('vi-VN')}</span>}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Cột 1: Thu nhập (Earnings) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  I. Các Khoản Thu Nhập
                </h3>
                <span className="font-extrabold text-emerald-700">
                  +{earnings.totalGross.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="space-y-2 pt-1 text-slate-600">
                {/* Lương cơ bản theo ngày công */}
                <div className="py-1 border-b border-slate-200/60">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800">Lương cứng theo ngày công:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {earnings.baseSalary.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  {earnings.contractBaseSalary && earnings.contractBaseSalary !== earnings.baseSalary ? (
                    <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200/60 leading-tight">
                      📌 <strong>Tính theo ngày công:</strong> Mức hợp đồng <strong>{earnings.contractBaseSalary.toLocaleString('vi-VN')} đ</strong> • Thực tế <strong>{earnings.actualWorkDays || 0}/{earnings.standardWorkDays || 26} công</strong> ({((earnings.workRatio || 1) * 100).toFixed(1)}%)
                      {earnings.workDaysExplanation && <div className="text-[9px] text-amber-800/80 mt-0.5">{earnings.workDaysExplanation}</div>}
                    </div>
                  ) : earnings.standardWorkDays ? (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                      <span>Đi làm đủ kỳ ({earnings.standardWorkDays} công)</span>
                      <span>Hợp đồng: {earnings.baseSalary.toLocaleString('vi-VN')} đ</span>
                    </div>
                  ) : null}
                </div>

                {/* Tiền Làm Thêm Giờ (Tăng Ca) */}
                {earnings.overtimePay && earnings.overtimePay > 0 ? (
                  <div className="py-1.5 px-2 bg-indigo-50/70 rounded-lg border border-indigo-200/80">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-900 flex items-center gap-1">
                        <span>⏰</span> Tiền Làm Thêm Giờ (Tăng Ca):
                      </span>
                      <span className="font-black text-indigo-700">
                        +{earnings.overtimePay.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-indigo-800 mt-1.5 pt-1 border-t border-indigo-100">
                      <div>
                        <span className="block text-indigo-500 text-[9px]">Ngày thường (150%):</span>
                        <strong>{earnings.otNormalHours || 0} giờ</strong>
                      </div>
                      <div>
                        <span className="block text-indigo-500 text-[9px]">Ngày nghỉ (200%):</span>
                        <strong>{earnings.otWeekendHours || 0} giờ</strong>
                      </div>
                      <div>
                        <span className="block text-indigo-500 text-[9px]">Ngày lễ/Tết (300%):</span>
                        <strong>{earnings.otHolidayHours || 0} giờ</strong>
                      </div>
                    </div>
                    {earnings.hourlyRate && (
                      <div className="text-[9px] text-indigo-600/80 mt-1 text-right">
                        Đơn giá lương giờ: {earnings.hourlyRate.toLocaleString('vi-VN')} đ/h
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex justify-between items-center py-0.5">
                  <span>Thưởng KPI Vận hành:</span>
                  <span className="font-semibold text-emerald-600">
                    +{earnings.kpiBonus.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {earnings.commissionGmv && earnings.commissionGmv > 0 ? (
                  <div className="flex justify-between items-center py-0.5">
                    <span>Hoa hồng GMV bán hàng:</span>
                    <span className="font-semibold text-emerald-600">
                      +{earnings.commissionGmv.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ) : null}
                {earnings.giftShare && earnings.giftShare > 0 ? (
                  <div className="flex justify-between items-center py-0.5">
                    <span>Chia sẻ quà tặng & PK:</span>
                    <span className="font-semibold text-emerald-600">
                      +{earnings.giftShare.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ) : null}
                {earnings.allowance > 0 && (
                  <div className="flex justify-between items-center py-0.5">
                    <span>Phụ cấp (ăn trưa/ca kíp):</span>
                    <span className="font-semibold text-slate-900">
                      +{earnings.allowance.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
                {earnings.hotBonus && earnings.hotBonus > 0 ? (
                  <div className="flex justify-between items-center py-0.5 bg-rose-50/60 px-1 rounded text-rose-700 font-bold">
                    <span>⚡ Thưởng nóng Giám Đốc:</span>
                    <span>+{earnings.hotBonus.toLocaleString('vi-VN')} đ</span>
                  </div>
                ) : null}
                {earnings.otherBonus && earnings.otherBonus > 0 ? (
                  <div className="flex justify-between items-center py-0.5">
                    <span>Thưởng khác:</span>
                    <span className="font-semibold text-emerald-600">
                      +{earnings.otherBonus.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Cột 2: Khấu trừ & Giảm trừ (Deductions) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  II. Các Khoản Giảm Trừ
                </h3>
                <span className="font-extrabold text-rose-700">
                  -{deductions.totalDeductions.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-slate-600">
                <div className="flex justify-between items-center py-0.5">
                  <span>Khấu trừ thiếu giờ live:</span>
                  <span className={deductions.liveHoursPenalty ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                    {deductions.liveHoursPenalty ? `-${deductions.liveHoursPenalty.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Trừ ngày nghỉ không phép:</span>
                  <span className={deductions.unpaidLeaveDeduction ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                    {deductions.unpaidLeaveDeduction ? `-${deductions.unpaidLeaveDeduction.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Tạm ứng lương đã nhận:</span>
                  <span className={deductions.advancePayment ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                    {deductions.advancePayment ? `-${deductions.advancePayment.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Thuế thu nhập cá nhân:</span>
                  <span className={deductions.tax ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    {deductions.tax ? `-${deductions.tax.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex flex-col">
                    <span>Bảo hiểm bắt buộc (NV đóng 10.5%):</span>
                    <span className="text-[10px] text-slate-400">BHXH 8%, BHYT 1.5%, BHTN 1% trừ vào lương</span>
                  </div>
                  <span className={deductions.insurance ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                    {deductions.insurance ? `-${deductions.insurance.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Banner Tổng Lương Thực Nhận (Net Salary) */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-xl p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-bold block">
                TỔNG LƯƠNG THỰC NHẬN (NET TAKE-HOME)
              </span>
              <span className="text-xs text-emerald-100/90">
                (Thu nhập gộp - Tổng các khoản khấu trừ)
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white block">
                {record.netSalary.toLocaleString('vi-VN')} <span className="text-base font-bold text-emerald-200">VNĐ</span>
              </span>
            </div>
          </div>

          {/* Tài khoản ngân hàng bảo mật */}
          <div className="bg-slate-100/80 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">
                  Tài khoản ngân hàng thụ hưởng (Đã khóa bảo mật)
                </span>
                <span className="font-bold text-slate-800 text-xs">
                  {bankInfo.bankName || 'Chưa cập nhật'} • STK: <strong className="font-mono text-indigo-700">{bankInfo.accountNumber || '—'}</strong> • Chủ TK: {bankInfo.accountName || '—'}
                </span>
              </div>
            </div>
            {record.paymentRef && (
              <div className="text-[11px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200">
                Ref: {record.paymentRef}
              </div>
            )}
          </div>

          {record.adjustmentLogs && record.adjustmentLogs.length > 0 && (
            <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-200">
              <div className="font-bold text-indigo-900 text-[11px] mb-1">Lịch sử điều chỉnh phiếu</div>
              <div className="space-y-1 text-[10px] text-indigo-800">
                {record.adjustmentLogs.map((log, index) => (
                  <div key={`${log.updatedAt}-${index}`} className="flex flex-wrap gap-x-2">
                    <span>{new Date(log.updatedAt).toLocaleString('vi-VN')}</span>
                    <strong>{log.updatedBy}</strong>
                    <span>{log.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.notes && (
            <p className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
              📌 Ghi chú: {record.notes}
            </p>
          )}

          <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 space-y-3" aria-labelledby="payroll-dispute-title">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 id="payroll-dispute-title" className="font-bold text-indigo-950 text-sm">Phản ánh phiếu lương</h3>
                <p className="text-[11px] text-indigo-800 mt-0.5">Phản ánh lệch công, khoản bị trừ hoặc số liệu chưa đúng kèm lý do.</p>
              </div>
              {canSubmitDispute ? (
                <button
                  type="button"
                  onClick={() => { setDisputeFormOpen((open) => !open); setDisputeSuccess(null); }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors"
                >
                  {disputeFormOpen ? 'Đóng form' : 'Phản ánh phiếu lương'}
                </button>
              ) : (
                <button type="button" disabled className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-not-allowed opacity-80">Phản ánh đã khóa</button>
              )}
            </div>

            <p className="text-[11px] text-indigo-900 bg-white/80 rounded-lg border border-indigo-100 p-2.5">
              Kỳ lương: <strong>Tháng {record.period.replace('-', '/')}</strong> · Trạng thái: <strong>{payrollPeriodStatusLabel}</strong>
            </p>

            <p className="text-[11px] text-indigo-900 bg-white/80 rounded-lg border border-indigo-100 p-2.5">
              Vui lòng phản hồi về phiếu lương này từ ngày <strong>{formatPayrollCalendarDate(calendar.feedbackStartsAt)}</strong> tới <strong>23:59:59 ngày {feedbackDeadline}</strong>. Sau thời hạn này, mọi phản hồi chậm trễ sẽ không được xem xét.
            </p>

            {!canSubmitDispute && <p className="text-[11px] text-slate-600">Phản ánh chỉ mở sau khi đã chốt công và trước khi Giám đốc duyệt. Kỳ lương hiện tại không thể tạo phản ánh mới.</p>}
            {disputeSuccess && <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">{disputeSuccess}</p>}
            {disputeError && <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{disputeError}</p>}

            {disputeFormOpen && canSubmitDispute && (
              <form onSubmit={handleCreateDispute} className="bg-white rounded-lg border border-indigo-100 p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Nội dung phản ánh
                    <select value={disputeCategory} onChange={(event) => setDisputeCategory(event.target.value as PayrollDisputeCategory)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-normal bg-white">
                      {(Object.keys(PAYROLL_DISPUTE_CATEGORY_LABELS) as PayrollDisputeCategory[]).map((category) => <option key={category} value={category}>{PAYROLL_DISPUTE_CATEGORY_LABELS[category]}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">
                    Số liệu đề nghị (không bắt buộc)
                    <input value={disputeRequestedValue} onChange={(event) => setDisputeRequestedValue(event.target.value)} placeholder="VD: 24 công, trừ 500.000đ..." className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-normal" />
                  </label>
                </div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Lý do phản ánh <span className="text-rose-600">*</span>
                  <textarea required value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} rows={3} placeholder="Mô tả ngày/công/khoản bị trừ chưa chính xác..." className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-normal resize-y" />
                </label>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Link bằng chứng (không bắt buộc)
                  <input type="url" value={disputeEvidenceUrl} onChange={(event) => setDisputeEvidenceUrl(event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-normal" />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={resetDisputeForm} className="px-3 py-1.5 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-700">Hủy</button>
                  <button type="submit" disabled={disputeSaving || !disputeReason.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-50">{disputeSaving ? 'Đang gửi...' : 'Gửi phản ánh'}</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Lịch sử phản ánh {disputeLoading ? '(đang tải...)' : `(${disputes.length})`}</div>
              {disputes.length === 0 && !disputeLoading && <p className="text-[11px] text-slate-500">Chưa có phản ánh cho phiếu lương này.</p>}
              {disputes.map((dispute) => (
                <div key={dispute.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-800">{PAYROLL_DISPUTE_CATEGORY_LABELS[dispute.category]}</strong>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{PAYROLL_DISPUTE_STATUS_LABELS[dispute.status]}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{dispute.reason}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Gửi lúc {formatDateVN(dispute.createdAt.slice(0, 10))}{dispute.resolutionNote ? ` • ${dispute.resolutionNote}` : ''}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In Phiếu Lương
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
