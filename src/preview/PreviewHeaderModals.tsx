import React, { useState } from 'react';
import { Banknote, KeyRound, Send, ShieldCheck, User, X } from 'lucide-react';
import type { PreviewRoleProfile } from './mockShowcaseData.ts';

export type PreviewModalType = 'profile' | 'payslip' | 'password' | 'leave' | null;

interface PreviewHeaderModalsProps {
  activeModal: PreviewModalType;
  role: PreviewRoleProfile;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const PreviewHeaderModals: React.FC<PreviewHeaderModalsProps> = ({
  activeModal,
  role,
  onClose,
  onNotify,
}) => {
  const [heightCm, setHeightCm] = useState('165');
  const [weightKg, setWeightKg] = useState('49');
  const [phone, setPhone] = useState('0908 123 456');
  const [leaveDays, setLeaveDays] = useState(2);
  const [leaveReason, setLeaveReason] = useState('Việc gia đình cần sắp xếp');

  if (!activeModal) return null;

  const hMeters = Math.max(1, Number(heightCm) || 165) / 100;
  const bmi = ((Number(weightKg) || 49) / (hMeters * hMeters)).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Hộp thoại mô phỏng"
    >
      {activeModal === 'profile' && (
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Hồ Sơ Cá Nhân & Thể Trạng</h3>
                <p className="text-[11px] text-slate-500">
                  {role.userName} · {role.roleTitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hồ sơ"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label htmlFor="modal-profile-phone" className="block font-semibold text-slate-700 mb-1">
                Số điện thoại
              </label>
              <input
                id="modal-profile-phone"
                name="profilePhone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="modal-profile-height" className="block font-semibold text-slate-700 mb-1">
                Chiều cao (cm)
              </label>
              <input
                id="modal-profile-height"
                name="profileHeight"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="modal-profile-weight" className="block font-semibold text-slate-700 mb-1">
                Cân nặng (kg)
              </label>
              <input
                id="modal-profile-weight"
                name="profileWeight"
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-xs">
            <span className="font-semibold text-indigo-900">Chỉ số hình thể BMI ước tính:</span>
            <span className="font-black text-indigo-700">{bmi} (Đạt chuẩn Idol)</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
            <div className="font-bold text-slate-700">Thông tin nhận lương đã xác thực</div>
            <div className="text-slate-500">Techcombank · STK: 1903 8842 9910 · {role.userName.toUpperCase()}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNotify('Đã lưu hồ sơ cá nhân & chỉ số BMI (mô phỏng)');
              }}
              className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}

      {activeModal === 'payslip' && (
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Phiếu Lương Cá Nhân · Kỳ 10/2026</h3>
                <p className="text-[11px] text-slate-500">
                  {role.userName} · {role.department}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng phiếu lương"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Lương cứng & phụ cấp hợp đồng</span>
              <span className="font-bold text-slate-900">12.000.000 đ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hoa hồng Booking + Quà PK (đã đồng bộ)</span>
              <span className="font-bold text-emerald-700">+14.200.000 đ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Thưởng đạt KPI tháng (108%)</span>
              <span className="font-bold text-emerald-700">+2.000.000 đ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">BHXH, thuế TNCN & khấu trừ</span>
              <span className="font-bold text-rose-600">-3.550.000 đ</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black">
              <span className="text-slate-900">Tổng thực nhận (Net Pay)</span>
              <span className="text-emerald-700">24.650.000 đ</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNotify('Đã mở luồng gửi phản ánh sai sót kỳ 10/2026 (mô phỏng)');
              }}
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              Gửi phản ánh phiếu lương
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {activeModal === 'password' && (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">Đổi Mật Khẩu Tài Khoản</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng đổi mật khẩu" className="cursor-pointer text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="modal-old-pass" className="block font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                id="modal-old-pass"
                name="oldPass"
                type="password"
                defaultValue="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="modal-new-pass" className="block font-semibold text-slate-700 mb-1">
                Mật khẩu mới (tối thiểu 8 ký tự)
              </label>
              <input
                id="modal-new-pass"
                name="newPass"
                type="password"
                defaultValue="••••••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Hệ thống tự thu hồi phiên đăng nhập cũ sau khi đổi.</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold cursor-pointer">
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNotify('Đã cập nhật mật khẩu an toàn (mô phỏng)');
              }}
              className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
            >
              Cập nhật mật khẩu
            </button>
          </div>
        </div>
      )}

      {activeModal === 'leave' && (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Đăng Ký Xin Nghỉ Phép</h3>
              <p className="text-[11px] text-slate-500">
                1 ngày tự động duyệt · 2 ngày Trưởng nhóm duyệt · &ge;3 ngày Giám đốc duyệt
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng đơn nghỉ phép" className="cursor-pointer text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="modal-leave-days" className="block font-semibold text-slate-700 mb-1">
                Số ngày xin nghỉ
              </label>
              <select
                id="modal-leave-days"
                name="leaveDays"
                value={leaveDays}
                onChange={(e) => setLeaveDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              >
                <option value={1}>1 ngày (Tự động phê duyệt)</option>
                <option value={2}>2 ngày (Trưởng nhóm duyệt)</option>
                <option value={4}>4 ngày (Giám đốc duyệt)</option>
              </select>
            </div>
            <div>
              <label htmlFor="modal-leave-reason" className="block font-semibold text-slate-700 mb-1">
                Lý do nghỉ phép
              </label>
              <input
                id="modal-leave-reason"
                name="leaveReason"
                type="text"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold cursor-pointer">
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNotify(`Đã gửi đơn nghỉ ${leaveDays} ngày thành công (mô phỏng)`);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Gửi đơn</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

