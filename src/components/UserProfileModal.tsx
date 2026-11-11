import React, { useState, useEffect, useRef } from 'react';
import { DateInput } from './DateInput.tsx';
import {
  X,
  User,
  Phone,
  MapPin,
  Lock,
  CreditCard,
  Building2,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  Camera,
  KeyRound,
  ShieldAlert,
  Info,
  Upload,
  Loader2,
  Calendar,
  Sparkles,
  Scale,
  Ruler,
  HeartPulse
} from 'lucide-react';
import { UserAccount, Idol, DEFAULT_BLANK_AVATAR } from '../types/index.ts';
import { api } from '../services/api.ts';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  activeIdol?: Idol | null;
  onSaveProfile: (data: {
    userId: string;
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
  }) => Promise<UserAccount>;
  onOpenPayslip?: () => void;
  onOpenChangePasswordModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeIdol,
  onSaveProfile,
  onOpenPayslip,
  onOpenChangePasswordModal
}) => {
  // Personal Info State
  const [realName, setRealName] = useState(
    currentUser.realName || activeIdol?.realName || currentUser.name || ''
  );
  const [stageName, setStageName] = useState(
    currentUser.stageName || activeIdol?.stageName || ''
  );
  const [dob, setDob] = useState(
    currentUser.dob || activeIdol?.dob || '2000-01-01'
  );
  const [hometown, setHometown] = useState(
    currentUser.hometown || activeIdol?.hometown || ''
  );
  const [phone, setPhone] = useState(
    currentUser.phone || activeIdol?.phone || ''
  );
  const [address, setAddress] = useState(
    currentUser.address || currentUser.currentLiving || activeIdol?.currentLiving || ''
  );

  // Body Metrics State
  const [height, setHeight] = useState<number | string>(
    currentUser.height || activeIdol?.height || 165
  );
  const [weight, setWeight] = useState<number | string>(
    currentUser.weight || activeIdol?.weight || 48
  );

  const [avatarUrl, setAvatarUrl] = useState(
    currentUser.avatarUrl || activeIdol?.avatarUrl || ''
  );

  // Upload State & Refs
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; isDuplicate?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or currentUser/activeIdol changes
  useEffect(() => {
    if (isOpen) {
      setRealName(currentUser.realName || activeIdol?.realName || currentUser.name || '');
      setStageName(currentUser.stageName || activeIdol?.stageName || '');
      setDob(currentUser.dob || activeIdol?.dob || '2000-01-01');
      setHometown(currentUser.hometown || activeIdol?.hometown || '');
      setPhone(currentUser.phone || activeIdol?.phone || '');
      setAddress(currentUser.address || currentUser.currentLiving || activeIdol?.currentLiving || '');
      setHeight(currentUser.height || activeIdol?.height || 165);
      setWeight(currentUser.weight || activeIdol?.weight || 48);
      setAvatarUrl(currentUser.avatarUrl || activeIdol?.avatarUrl || '');
      setErrorMessage(null);
      setSuccessMessage(null);
      setUploadFeedback(null);
    }
  }, [isOpen, currentUser, activeIdol]);

  if (!isOpen) return null;

  // Live BMI Calculation
  const heightNum = Number(height) || 165;
  const weightNum = Number(weight) || 48;
  const heightM = heightNum > 0 ? heightNum / 100 : 1.65;
  const bmi = heightM > 0 ? Number((weightNum / (heightM * heightM)).toFixed(1)) : 20.0;

  const getBmiAssessment = (val: number) => {
    if (val < 18.5) {
      return {
        label: 'Thể trạng thanh mảnh (Cần bổ sung dinh dưỡng)',
        badge: 'Hơi gầy',
        color: 'text-amber-700 bg-amber-50 border-amber-200'
      };
    }
    if (val <= 22.9) {
      return {
        label: 'Chỉ số vàng chuẩn hình thể Idol & Nghệ sĩ',
        badge: 'Chuẩn Idol ⭐',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      };
    }
    if (val <= 24.9) {
      return {
        label: 'Cân đối, thể trạng tốt',
        badge: 'Bình thường',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
      };
    }
    return {
      label: 'Cần duy trì tập luyện và điều chỉnh calo',
      badge: 'Thừa cân nhẹ',
      color: 'text-rose-700 bg-rose-50 border-rose-200'
    };
  };

  const bmiAssessment = getBmiAssessment(bmi);

  // Xử lý upload ảnh đại diện với cơ chế chống trùng lặp
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setErrorMessage(null);
      setUploadFeedback(null);

      const res = await api.uploadAvatar(file);
      setAvatarUrl(res.url);

      if (res.isDuplicate) {
        setUploadFeedback({
          message: 'Ảnh đã tồn tại trên hệ thống (đã tái sử dụng file cũ để tiết kiệm dung lượng)',
          isDuplicate: true
        });
      } else {
        setUploadFeedback({
          message: 'Tải ảnh mới lên thành công!',
          isDuplicate: false
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tải ảnh lên máy chủ');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!realName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên');
      return;
    }

    try {
      setSaving(true);
      await onSaveProfile({
        userId: currentUser.id || currentUser.username,
        name: realName.trim(),
        realName: realName.trim(),
        stageName: stageName.trim(),
        dob: dob.trim(),
        hometown: hometown.trim(),
        height: Number(height) || undefined,
        weight: Number(weight) || undefined,
        phone: phone.trim(),
        address: address.trim(),
        avatarUrl: avatarUrl.trim()
      });

      setSuccessMessage('Cập nhật toàn bộ hồ sơ cá nhân thành công!');

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const bankName = currentUser.bankName || activeIdol?.bankName || 'MB Bank (Quân Đội)';
  const bankAccountNumber = currentUser.bankAccountNumber || activeIdol?.bankAccountNumber || '1900889988';
  const bankAccountName = currentUser.bankAccountName || activeIdol?.bankAccountName || currentUser.name.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner */}
        <div className="relative bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-700 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0 cursor-pointer"
              title="Nhấn để tải ảnh đại diện mới"
            >
              <img
                src={avatarUrl || DEFAULT_BLANK_AVATAR}
                alt={realName || currentUser.name}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-white group-hover:opacity-90 transition-opacity"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_BLANK_AVATAR;
                }}
              />
              <div className="absolute inset-0 bg-black/45 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold">Đổi ảnh</span>
                  </>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white text-rose-600 p-1 rounded-lg shadow-xs border border-rose-100 group-hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white">
                  {currentUser.roleTitle || 'Nhân sự Aura Talent'}
                </span>
                {currentUser.isSuperAdmin && (
                  <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                    👑 Super Admin
                  </span>
                )}
                {stageName && (
                  <span className="text-[10px] font-semibold bg-pink-500/30 border border-pink-300/40 px-2 py-0.5 rounded-full text-pink-100">
                    ⭐ Nghệ danh: {stageName}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                {realName || currentUser.name}
              </h2>
              <p className="text-xs text-rose-100 flex items-center gap-3">
                <span className="font-mono opacity-90">@{currentUser.username}</span>
                <span>•</span>
                <span className="flex items-center gap-1 opacity-90">
                  <Mail className="w-3 h-3" />
                  {currentUser.email}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form id="user-profile-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Section 1: Thông tin nhân thân cơ bản */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-rose-600" />
                <span>1. Thông Tin Nhân Thân & Định Danh</span>
              </h3>
              
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Họ và tên thật */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-500" />
                  <span>Họ và Tên Thật</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="VD: Hoàng Hải Yến, Nguyễn Thị Mỹ..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-semibold text-slate-900"
                  required
                />
              </div>

              {/* Biệt danh / Nghệ danh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Nghệ Danh / Biệt Danh</span>
                </label>
                <input
                  type="text"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="VD: Yến Hoàng, Miu Miu, Kelly..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-slate-800"
                />
              </div>

              {/* Ngày tháng năm sinh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>Ngày Tháng Năm Sinh</span>
                </label>
                <DateInput
                  value={dob}
                  onChange={setDob}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-slate-800"
                />
              </div>

              {/* Quê quán */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Quê Quán (Nguyên Quán)</span>
                </label>
                <input
                  type="text"
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  placeholder="VD: Hà Nội, Đà Nẵng, Cần Thơ..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-slate-800"
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>Số Điện Thoại (SĐT)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0901 234 567"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium"
                  required
                />
              </div>

              {/* Nơi ở hiện tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Nơi Ở Cư Trú Hiện Tại</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: Căn hộ A12, Sunrise City, Quận 7, TP.HCM"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Chỉ số hình thể & Sức khỏe */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-pink-600" />
                <span>2. Chỉ Số Hình Thể & Sức Khỏe</span>
              </h3>
              <span className="text-[11px] font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                ⭐ Chỉ số nghệ sĩ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Chiều cao */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-pink-500" />
                  <span>Chiều Cao (cm)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    max="220"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="165"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all font-bold text-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    cm
                  </span>
                </div>
              </div>

              {/* Cân nặng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-pink-500" />
                  <span>Cân Nặng (kg)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="30"
                    max="150"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="48"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all font-bold text-slate-900"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    kg
                  </span>
                </div>
              </div>

              {/* Live BMI Card */}
              <div className="p-3 bg-gradient-to-br from-pink-50/60 to-purple-50/40 rounded-2xl border border-pink-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Chỉ số BMI:</span>
                  <span className="text-base font-black font-mono text-pink-700">{bmi}</span>
                </div>
                <div className="mt-1">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${bmiAssessment.color}`}>
                    {bmiAssessment.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate" title={bmiAssessment.label}>
                  {bmiAssessment.label}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Ảnh đại diện (Avatar) */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>3. Ảnh Đại Diện (Avatar)</span>
              </h3>
              {onOpenChangePasswordModal && (
                <button
                  type="button"
                  onClick={onOpenChangePasswordModal}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                  title="Mở bảng đổi mật khẩu riêng biệt"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đổi Mật Khẩu</span>
                </button>
              )}
            </div>

            {/* Avatar URL / Upload */}
            <div>
              <label style={{ display: 'none' }} className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Đường dẫn ảnh đại diện (Avatar URL)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal">Hỗ trợ tải file hoặc dán link</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setUploadFeedback(null);
                  }}
                  placeholder="Nhập đường dẫn ảnh trực tiếp hoặc bấm Tải ảnh"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  title="Chọn file ảnh từ máy tính để tải lên hệ thống"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh lên</span>
                    </>
                  )}
                </button>
              </div>

              {/* Thông báo kết quả upload / phát hiện trùng ảnh */}
              {uploadFeedback && (
                <div
                  className={`mt-1.5 p-2 rounded-lg text-[11px] flex items-center gap-2 border animate-in fade-in ${
                    uploadFeedback.isDuplicate
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      uploadFeedback.isDuplicate ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  />
                  <span>{uploadFeedback.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Thông tin Ngân hàng Nhận Lương (Chỉ đọc) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>4. Tài Khoản Ngân Hàng Nhận Lương</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" /> Khóa bảo mật (Chỉ đọc)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/30 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Ngân hàng thụ hưởng:</span>
                  <div className="font-bold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80">
                    {bankName}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Số tài khoản (STK):</span>
                  <div className="font-bold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80 font-mono tracking-wider">
                    {bankAccountNumber}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Chủ tài khoản:</span>
                  <div className="font-bold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80 uppercase">
                    {bankAccountName}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Quy chế tài chính:</strong> Để đảm bảo an toàn chi trả lương và đối soát, nhân viên không thể tự sửa STK ngân hàng. Nếu cần đổi tài khoản nhận lương, vui lòng liên hệ <strong>Phòng Kế Toán / HR</strong>.
                </span>
              </div>

              {onOpenPayslip && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPayslip();
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>📄</span> Xem Phiếu Lương Của Tôi
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Mọi thay đổi sẽ được cập nhật đồng bộ tức thì trên toàn hệ thống.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              form="user-profile-form"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Hồ Sơ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
