import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Idol, IdolStatus, UserAccount, IdolCategoryType, CommercialDetails, IDOL_CATEGORIES_CONFIG, PersonnelColumn } from '../types/index.ts';
import { api } from '../services/api.ts';
import { calculateTenure, getTodayIsoDate } from '../utils/dateUtils.ts';
import { DateInput } from './DateInput.tsx';
import { generateCompanyCredentials } from '../utils/credentialsUtils.ts';
import { X, Upload, Camera, Loader2, Link as LinkIcon, Check, Calendar, Clock, KeyRound, Mail, AtSign, Shield, Sparkles, Building2, DollarSign, ShoppingBag, Eye, EyeOff, Copy, Lock } from 'lucide-react';
import { isStaffDepartment, isIdolDepartment, DEFAULT_BLANK_AVATAR, getRolesForDepartment } from '../types/roles.ts';

interface IdolModalProps {
  isOpen: boolean;
  onClose: () => void;
  idolToEdit?: Idol | null;
  onSuccess: (savedIdol: Idol) => void;
  existingIdolsCount: number;
  departments: string[];
  personnelTypes?: string[];
  onOpenDepartmentManager?: () => void;
  statuses: string[];
  onOpenStatusManager?: () => void;
  currentUser?: UserAccount | null;
  onApprovalCreated?: (appr: any) => void;
  onNotifyPending?: (message: string) => void;
  referenceDate?: string;
}

type CommercialTextDraft = {
  gameTitles: string;
  gearBrands: string;
  talents: string;
  sponsorBrands: string;
  commerceCategories: string;
};

const toCommaSeparatedText = (items?: string[]) => (items || []).join(', ');

const toCommaSeparatedList = (value: string) =>
  value.split(',').map(item => item.trim()).filter(Boolean);

export const IdolModal: React.FC<IdolModalProps> = ({
  isOpen,
  onClose,
  idolToEdit,
  onSuccess,
  existingIdolsCount,
  departments,
  personnelTypes = ['Công ty', 'Outsource', 'Cộng tác viên', 'Thực tập sinh', 'Dịch vụ ngoài'],
  onOpenDepartmentManager,
  statuses,
  onOpenStatusManager,
  currentUser,
  onApprovalCreated,
  onNotifyPending,
  referenceDate
}) => {
  const isEdit = Boolean(idolToEdit);
  const isSystemAdmin = currentUser?.accountType === 'system_admin' || currentUser?.isSuperAdmin === true;
  const isResignedProfileLocked = Boolean(
    idolToEdit &&
    (idolToEdit.status === 'Đã nghỉ việc' || idolToEdit.resignedDate) &&
    !isSystemAdmin
  );
  const defaultJoinDate = useMemo(() => getTodayIsoDate(referenceDate), [referenceDate]);

  const [formData, setFormData] = useState<Partial<Idol>>({
    stageName: '',
    realName: '',
    dob: '2004-01-01',
    joinDate: defaultJoinDate,
    role: '',
    weight: undefined,
    height: undefined,
    hometown: '',
    currentLiving: '',
    department: 'Nhóm Idol Gaming & Gear',
    personnelType: 'Công ty',
    status: 'Đang hoạt động',
    isIdol: true,
    assignedRole: 'streamer_gaming',
    idolCategory: 'gaming_gear',
    activityCodes: ['gaming_gear'],
    primaryActivityCode: 'gaming_gear',
    commercialDetails: {
      gameTitles: [],
      gearBrands: [],
      cartLinkGaming: ''
    },
    avatarUrl: '',
    bio: '',
    socialLinks: {
      email: '',
      linkedin: '',
      instagram: '',
      tiktok: ''
    }
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountPassword, setAccountPassword] = useState('123');
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(defaultJoinDate);
  const [salaryChangeReason, setSalaryChangeReason] = useState('');
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [manualCredsEdited, setManualCredsEdited] = useState(false);
  const [personnelColumns, setPersonnelColumns] = useState<PersonnelColumn[]>([]);
  const [loadingPersonnelColumns, setLoadingPersonnelColumns] = useState(false);
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [commercialTextDraft, setCommercialTextDraft] = useState<CommercialTextDraft>({
    gameTitles: '',
    gearBrands: '',
    talents: '',
    sponsorBrands: '',
    commerceCategories: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryActivityCodes: Record<IdolCategoryType, string[]> = {
    gaming_gear: ['gaming_gear'],
    performance_donate: ['performance', 'pk_donate'],
    live_commerce: ['live_commerce']
  };

  const selectedActivityCodes = formData.activityCodes || categoryActivityCodes[formData.idolCategory || 'gaming_gear'];
  const isCategorySelected = (category: IdolCategoryType) =>
    categoryActivityCodes[category].some((code) => selectedActivityCodes.includes(code));

  const toggleIdolCategory = (category: IdolCategoryType, department: string, assignedRole: string, defaultRole: string) => {
    setFormData((prev) => {
      const currentCodes = prev.activityCodes || categoryActivityCodes[prev.idolCategory || 'gaming_gear'];
      const categoryCodes = categoryActivityCodes[category];
      const removing = categoryCodes.some((code) => currentCodes.includes(code));
      const nextCodes = removing
        ? currentCodes.filter((code) => !categoryCodes.includes(code))
        : [...new Set([...currentCodes, ...categoryCodes])];
      if (nextCodes.length === 0) return prev;
      const nextPrimary = removing && prev.primaryActivityCode && categoryCodes.includes(prev.primaryActivityCode)
        ? nextCodes[0]
        : (prev.primaryActivityCode && nextCodes.includes(prev.primaryActivityCode) ? prev.primaryActivityCode : categoryCodes[0]);
      const nextCategory = nextPrimary === 'gaming_gear' ? 'gaming_gear' : nextPrimary === 'live_commerce' ? 'live_commerce' : 'performance_donate';
      return {
        ...prev,
        activityCodes: nextCodes,
        primaryActivityCode: nextPrimary,
        idolCategory: nextCategory,
        ...(removing ? {} : { department: prev.department || department, assignedRole: prev.assignedRole || assignedRole, role: prev.role || defaultRole })
      };
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingPersonnelColumns(true);
    api.getPersonnelColumns()
      .then((columns) => {
        if (!cancelled) setPersonnelColumns(columns.filter((column) => column.isActive && column.showInProfile && !column.isSystem));
      })
      .catch(() => {
        if (!cancelled) setPersonnelColumns([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPersonnelColumns(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleCopyPassword = () => {
    const pwd = accountPassword || '123';
    navigator.clipboard.writeText(pwd);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const idolDepts = useMemo(() => departments.filter(isIdolDepartment), [departments]);
  const staffDepts = useMemo(() => departments.filter(isStaffDepartment), [departments]);

  const activeDeptList = useMemo(() => {
    if (showAllDepts) return departments;
    if (formData.isIdol !== false) {
      return idolDepts.length > 0 ? idolDepts : departments;
    } else {
      return staffDepts.length > 0 ? staffDepts : departments;
    }
  }, [showAllDepts, formData.isIdol, idolDepts, staffDepts, departments]);

  useEffect(() => {
    const curIdolDepts = departments.filter(isIdolDepartment);
    const curStaffDepts = departments.filter(isStaffDepartment);

    if (idolToEdit) {
      const isIdol = idolToEdit.isIdol !== false;
      let dept = idolToEdit.department;
      // Nếu là idol mà dept hiện tại là phòng ban vận hành (do gán nhầm từ trước), chuyển về nhóm idol hợp lệ
      if (isIdol && isStaffDepartment(dept)) {
        dept = curIdolDepts[0] || 'Nhóm Idol Gaming & Gear';
      } else if (!isIdol && isIdolDepartment(dept)) {
        dept = curStaffDepts[0] || 'Phòng Quản Lý & Phát Triển Idol';
      }

      // Suy ra category nếu idol chưa có
      let category = idolToEdit.idolCategory;
      if (!category && isIdol) {
        const lowerDept = (dept || '').toLowerCase();
        if (lowerDept.includes('gaming') || lowerDept.includes('game')) category = 'gaming_gear';
        else if (lowerDept.includes('biểu diễn') || lowerDept.includes('dance') || lowerDept.includes('donate') || lowerDept.includes('entertainment')) category = 'performance_donate';
        else if (lowerDept.includes('commerce') || lowerDept.includes('chốt đơn') || lowerDept.includes('bán hàng')) category = 'live_commerce';
        else category = 'gaming_gear';
      }

      const commercialDetails = idolToEdit.commercialDetails || {};
      setCommercialTextDraft({
        gameTitles: toCommaSeparatedText(commercialDetails.gameTitles),
        gearBrands: toCommaSeparatedText(commercialDetails.gearBrands),
        talents: toCommaSeparatedText(commercialDetails.talents),
        sponsorBrands: toCommaSeparatedText(commercialDetails.sponsorBrands),
        commerceCategories: toCommaSeparatedText(commercialDetails.commerceCategories)
      });

      setFormData({
        ...idolToEdit,
        department: dept,
        idolCategory: category,
        activityCodes: idolToEdit.activityCodes?.length ? idolToEdit.activityCodes : categoryActivityCodes[category || 'gaming_gear'],
        primaryActivityCode: idolToEdit.primaryActivityCode || (category === 'performance_donate' ? 'performance' : category || 'gaming_gear'),
        commercialDetails,
        joinDate: idolToEdit.joinDate || defaultJoinDate,
        resignedDate: idolToEdit.resignedDate || '',
        personnelType: idolToEdit.personnelType || personnelTypes[0] || 'Công ty',
        socialLinks: idolToEdit.socialLinks || { email: '', linkedin: '', instagram: '', tiktok: '' },
        accountUsername: idolToEdit.accountUsername || '',
        isIdol: isIdol,
        assignedRole: idolToEdit.assignedRole || (isIdol ? 'streamer_gaming' : 'staff')
      });
      setSalaryEffectiveFrom(defaultJoinDate);
      setSalaryChangeReason('');
      setManualCredsEdited(true);
    } else {
      const initialType = personnelTypes[0] || 'Công ty';
      const initialDept = curIdolDepts[0] || 'Nhóm Idol Gaming & Gear';
      const initialRole = 'streamer_gaming';

      setFormData({
        stageName: '',
        realName: '',
        dob: '2004-01-01',
        joinDate: defaultJoinDate,
        resignedDate: '',
        role: '',
        isIdol: true,
        assignedRole: initialRole,
        idolCategory: 'gaming_gear',
        activityCodes: ['gaming_gear'],
        primaryActivityCode: 'gaming_gear',
        commercialDetails: {
          gameTitles: [],
          gearBrands: [],
          cartLinkGaming: ''
        },
        weight: undefined,
        height: undefined,
        hometown: '',
        currentLiving: '',
        department: initialDept,
        personnelType: initialType,
        status: statuses[0] || 'Đang hoạt động',
        avatarUrl: '',
        bio: '',
        accountUsername: '',
        socialLinks: {
          email: '',
          linkedin: '',
          instagram: '',
          tiktok: ''
        }
      });
      setCommercialTextDraft({
        gameTitles: '',
        gearBrands: '',
        talents: '',
        sponsorBrands: '',
        commerceCategories: ''
      });
      setManualCredsEdited(false);
    }
    setShowAllDepts(false);
    setError(null);
  }, [idolToEdit, existingIdolsCount, isOpen, departments, statuses, personnelTypes, defaultJoinDate]);

  const handleToggleIsIdol = (isIdol: boolean) => {
    let nextDept = formData.department;
    let nextRole = formData.assignedRole;
    let nextCategory = formData.idolCategory || 'gaming_gear';

    if (isIdol) {
      if (!nextDept || isStaffDepartment(nextDept)) {
        if (nextCategory === 'gaming_gear') nextDept = 'Nhóm Idol Gaming & Gear';
        else if (nextCategory === 'performance_donate') nextDept = 'Nhóm Idol Biểu Diễn & Donate (PK)';
        else if (nextCategory === 'live_commerce') nextDept = 'Nhóm Idol Live Commerce & Chốt Đơn';
        else nextDept = idolDepts[0] || 'Nhóm Idol Gaming & Gear';
      }
      if (nextCategory === 'gaming_gear') nextRole = 'streamer_gaming';
      else if (nextCategory === 'performance_donate') nextRole = 'idol_performance';
      else if (nextCategory === 'live_commerce') nextRole = 'idol_commerce';
      else nextRole = 'idol_exclusive';
    } else {
      if (!nextDept || isIdolDepartment(nextDept)) {
        nextDept = staffDepts[0] || 'Phòng Quản Lý & Phát Triển Idol';
      }
      nextRole = 'staff';
    }

    setFormData((prev) => ({
      ...prev,
      isIdol,
      department: nextDept,
      assignedRole: nextRole,
      idolCategory: isIdol ? nextCategory : undefined
    }));
  };

  const handleRealNameChange = (val: string) => {
    const isCompany = (formData.personnelType || 'Công ty') === 'Công ty';
    let nextAccountUsername = formData.accountUsername;
    let nextEmail = formData.socialLinks?.email;

    if (isCompany && !manualCredsEdited && !idolToEdit) {
      const creds = generateCompanyCredentials(val);
      nextAccountUsername = creds.username;
      nextEmail = creds.email;
    }

    setFormData(prev => ({
      ...prev,
      realName: val,
      accountUsername: nextAccountUsername,
      socialLinks: {
        ...(prev.socialLinks || {}),
        email: nextEmail || ''
      }
    }));
  };

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const res = await api.uploadAvatar(file);
      setFormData(prev => ({ ...prev, avatarUrl: res.url }));
    } catch (err: any) {
      setError(err.message || 'Lỗi khi upload ảnh đại diện lên máy chủ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResignedProfileLocked) {
      setError('Hồ sơ đã nghỉ việc và chỉ System Admin được phép chỉnh sửa.');
      return;
    }
    if (!formData.stageName || !formData.realName) {
      setError('Vui lòng điền Nghệ danh và Tên thật');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const customFields = { ...(formData.customFields || {}) };
      for (const column of personnelColumns) {
        const value = customFields[column.key];
        if (column.required && (value === undefined || value === null || value === '')) {
          throw new Error(`Vui lòng nhập trường "${column.label}"`);
        }
        if (value === undefined || value === null || value === '') continue;
        if (column.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
          throw new Error(`Trường "${column.label}" phải là số`);
        }
        if (column.type === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Trường "${column.label}" phải là Có hoặc Không`);
        }
        if (column.type === 'select' && (!column.options?.includes(String(value)))) {
          throw new Error(`Giá trị trường "${column.label}" không hợp lệ`);
        }
      }

      // Default fallback avatar if empty: Dùng avatar trống mặc định thay vì ảnh người thật Unsplash
      const payload: Partial<Idol> = {
        ...formData,
        customFields,
        commercialDetails: formData.commercialDetails
          ? {
            ...formData.commercialDetails,
            gameTitles: toCommaSeparatedList(commercialTextDraft.gameTitles),
            gearBrands: toCommaSeparatedList(commercialTextDraft.gearBrands),
            talents: toCommaSeparatedList(commercialTextDraft.talents),
            sponsorBrands: toCommaSeparatedList(commercialTextDraft.sponsorBrands),
            commerceCategories: toCommaSeparatedList(commercialTextDraft.commerceCategories)
          }
          : undefined,
        avatarUrl: formData.avatarUrl || DEFAULT_BLANK_AVATAR,
        weight: formData.weight !== undefined && formData.weight !== null && String(formData.weight) !== '' ? Number(formData.weight) : 0,
        height: formData.height !== undefined && formData.height !== null && String(formData.height) !== '' ? Number(formData.height) : 0,
        stt: Number(formData.stt) || (existingIdolsCount + 1),
        accountPassword
      } as any;

      if (idolToEdit) {
        const previousSalary = Number(idolToEdit.baseSalary || 0);
        const nextSalary = Number(payload.baseSalary || 0);
        if (previousSalary !== nextSalary) {
          if (!salaryEffectiveFrom) throw new Error('Vui lòng chọn ngày hiệu lực mức lương mới');
          if (!salaryChangeReason.trim()) throw new Error('Vui lòng nhập lý do thay đổi lương');
          (payload as any).salaryChange = {
            salaryAmount: nextSalary,
            effectiveFrom: salaryEffectiveFrom,
            reason: salaryChangeReason.trim(),
            source: 'personnel_profile'
          };
        }
      }

      if (payload.personnelType === 'Dịch vụ ngoài') {
        payload.isIdol = false;
        payload.idolCategory = undefined;
        payload.activityCodes = undefined;
        payload.primaryActivityCode = undefined;
        payload.commercialDetails = undefined;
        payload.assignedRole = 'guest';
        payload.cooperationType = 'service_guest';
        if (!payload.department || payload.department === 'Nhóm Idol Gaming & Gear') {
          payload.department = 'Khách dịch vụ ngoài';
        }
      }

      let result: Idol;
      if (idolToEdit) {
        result = await api.updateIdol(idolToEdit.id, payload);
        onSuccess(result);
        onClose();
      } else {
        // If user is lower-role, route through approval queue but save idol so HR can see it pending in roster!
        if (currentUser && !currentUser.isSuperAdmin) {
          const pendingPayload: Partial<Idol> = {
            ...payload,
            status: payload.personnelType === 'Dịch vụ ngoài' ? '' : 'Chờ duyệt',
            department: payload.department || (payload.personnelType === 'Dịch vụ ngoài' ? 'Khách dịch vụ ngoài' : 'Chưa phân ban')
          };
          result = await api.createIdol(pendingPayload);
          const appr = await api.createApproval({
            type: 'create_idol',
            targetPersonnelId: result.id,
            targetName: result.stageName,
            data: result,
            requestedBy: {
              id: currentUser.id,
              username: currentUser.username,
              name: currentUser.name,
              roleTitle: currentUser.roleTitle
            },
            reason: 'Đề xuất thêm nhân sự mới vào danh sách'
          });
          onApprovalCreated?.(appr);
          onNotifyPending?.(`Đã gửi đề xuất thêm nhân sự "${result.stageName}". Hồ sơ đang chờ Giám Đốc phê duyệt để kích hoạt!`);
          onSuccess(result);
          onClose();
          return;
        }

        result = await api.createIdol(payload);
        onSuccess(result);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lưu nhân sự');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div data-personnel-form="true" className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {idolToEdit ? 'Chỉnh Sửa Hồ Sơ Idol' : 'Thêm Nhân Sự / Idol Mới'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật hồ sơ đầy đủ thông tin, chỉ số hình thể và ảnh đại diện lưu trên máy chủ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {isResignedProfileLocked && (
            <div className="p-3 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg">
              Hồ sơ đã kết thúc từ ngày <strong>{idolToEdit?.resignedDate || 'đã ghi nhận'}</strong>. Các thông tin đã được khóa; chỉ System Admin được phép chỉnh sửa.
            </div>
          )}

          <fieldset disabled={isResignedProfileLocked} className={isResignedProfileLocked ? 'opacity-70' : undefined}>

          {/* Avatar Upload Section */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-rose-200 bg-white shrink-0 shadow-sm flex items-center justify-center group">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-slate-300" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1">

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-600" />
                  {uploading ? 'Đang tải lên...' : 'Upload ảnh'}
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Hoặc dán URL ảnh trực tiếp..."
                  value={formData.avatarUrl || ''}
                  onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                  className="w-full text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Basic Info Grid (STT is dynamic, not manually assigned) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nghệ danh <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Aria, G-Leo..."
                value={formData.stageName || ''}
                onChange={e => setFormData({ ...formData, stageName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên thật <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Trần Minh Anh"
                value={formData.realName || ''}
                onChange={e => handleRealNameChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              />
            </div>
          </div>

          {/* Personnel Type Selection - Đưa lên trên đầu */}
          <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Loại nhân sự <span className="text-rose-600">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Xác định quyền lợi, tài khoản và phạm vi hoạt động
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {personnelTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    let nextAccountUsername = formData.accountUsername;
                    let nextEmail = formData.socialLinks?.email;
                    const isServiceGuest = type === 'Dịch vụ ngoài';

                    if (type === 'Công ty' && !nextAccountUsername && formData.realName) {
                      const creds = generateCompanyCredentials(formData.realName);
                      nextAccountUsername = creds.username;
                      nextEmail = creds.email;
                    } else if (isServiceGuest) {
                      nextAccountUsername = '';
                    }

                    setFormData({
                      ...formData,
                      personnelType: type,
                      cooperationType: isServiceGuest ? 'service_guest' : 'internal',
                      accountUsername: nextAccountUsername,
                      socialLinks: { ...(formData.socialLinks || {}), email: nextEmail || '' },
                      ...(isServiceGuest ? {
                        department: 'Khách dịch vụ ngoài',
                        isIdol: false,
                        assignedRole: 'guest',
                        idolCategory: undefined,
                        commercialDetails: undefined
                      } : {
                        isIdol: formData.isIdol !== false,
                        department: formData.department === 'Khách dịch vụ ngoài' ? (idolDepts[0] || 'Nhóm Idol Gaming & Gear') : formData.department,
                        assignedRole: formData.assignedRole === 'guest' ? 'streamer_gaming' : formData.assignedRole,
                        idolCategory: formData.idolCategory || 'gaming_gear'
                      })
                    });
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${(formData.personnelType || personnelTypes[0]) === type
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold shadow-xs ring-1 ring-indigo-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Dành riêng cho Khách Hàng / Idol Dịch Vụ Ngoài */}
            {formData.personnelType === 'Dịch vụ ngoài' && (
              <div className="mt-2.5 p-3 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-rose-50/40 border border-amber-300 rounded-xl space-y-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center shrink-0 text-xs">
                      🏷️
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Khách Hàng / Idol Thuê Dịch Vụ Ngoài (Vãng Lai)
                      </h4>
                      <p className="text-[10px] text-amber-800 leading-tight">
                        Hợp tác theo gói dịch vụ trọn gói (thuê phòng live, chụp hình, makeup...). Không tính ca/tăng ca, không chấm điểm KPI, không cần tài khoản nội bộ.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    Dịch vụ ngoài
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ghi chú gói dịch vụ khách thuê (VD: Thuê studio live Tiktok 2 tiếng/buổi, gói chụp lookbook...)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Thuê studio live Tiktok 2 tiếng/buổi, gói 3.500.000đ"
                    value={formData.serviceNotes || ''}
                    onChange={e => setFormData({ ...formData, serviceNotes: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dates & Roles Grid: Ngày sinh, Ngày vào, Nghề nghiệp, Chiều cao/Cân nặng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày sinh <span className="text-rose-600">*</span>
              </label>
              <DateInput
                value={formData.dob || '2004-01-01'}
                onChange={(dob) => setFormData({ ...formData, dob })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {formData.personnelType === 'Dịch vụ ngoài' ? 'Ngày đăng ký dịch vụ' : 'Thời điểm vào'} <span className="text-rose-600">*</span>
                </label>
                {formData.personnelType !== 'Dịch vụ ngoài' && (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {calculateTenure(formData.joinDate, referenceDate).shortText}
                  </span>
                )}
              </div>
              <DateInput
                value={formData.joinDate || defaultJoinDate}
                onChange={(joinDate) => setFormData({ ...formData, joinDate })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nghề nghiệp / Vai trò
              </label>
              <input
                type="text"
                placeholder="VD: Main Vocal, Lead Dancer..."
                value={formData.role || ''}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cao (cm)
                </label>
                <input
                  type="number"
                  min="120"
                  max="230"
                  placeholder="168"
                  value={formData.height ?? ''}
                  onChange={e => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nặng (kg)
                </label>
                <input
                  type="number"
                  min="30"
                  max="150"
                  placeholder="48"
                  value={formData.weight ?? ''}
                  onChange={e => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quê quán
              </label>
              <input
                type="text"
                placeholder="VD: Đà Nẵng, Hà Nội..."
                value={formData.hometown || ''}
                onChange={e => setFormData({ ...formData, hometown: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nơi sống hiện tại
              </label>
              <input
                type="text"
                placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                value={formData.currentLiving || ''}
                onChange={e => setFormData({ ...formData, currentLiving: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Phân Loại Nhân Sự, Đơn Vị & Role Hệ Thống - Chỉ áp dụng cho Nhân sự nội bộ, KHÔNG áp dụng cho Dịch vụ ngoài */}
          {formData.personnelType !== 'Dịch vụ ngoài' && (
            <div className="p-4 bg-gradient-to-r from-rose-50/70 via-pink-50/40 to-amber-50/30 border border-rose-200/90 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Phân Loại Đối Tượng, Đơn Vị & Role Hệ Thống</span>
                  <span className="text-rose-600">*</span>
                </label>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${formData.isIdol !== false
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  }`}>
                  {formData.isIdol !== false ? '⭐ Khối Idol / Nghệ Sĩ' : '💼 Khối Cán Bộ / Vận Hành'}
                </span>
              </div>

              {/* Bước 1: Chọn Là Idol hay Cán Bộ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleToggleIsIdol(true)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${formData.isIdol !== false
                    ? 'bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${formData.isIdol !== false ? 'bg-rose-100 text-rose-600 font-bold' : 'bg-slate-200 text-slate-500'
                    }`}>
                    ⭐
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Là Idol / Nghệ Sĩ Công Ty</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Được gán Role Idol, kích hoạt Bàn làm việc Idol, xếp ca livestream, chấm điểm KPI và quỹ nghỉ phép.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleIsIdol(false)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${formData.isIdol === false
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${formData.isIdol === false ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-200 text-slate-500'
                    }`}>
                    💼
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Cán Bộ / Nhân Viên Vận Hành</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Nhân sự khối phòng ban hỗ trợ (không có ca live hay tính điểm thi đua bảng xếp hạng).
                    </div>
                  </div>
                </button>
              </div>

              {/* Bước 2: Cấu Hình Chuyên Biệt Cho Idol hoặc Cán Bộ Vận Hành */}
              {formData.isIdol !== false ? (
                <div className="space-y-3.5 pt-2 border-t border-rose-200/60">
                  {/* Các hoạt động Idol có thể chọn nhiều */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>⭐ Chọn một hoặc nhiều hoạt động Idol</span>
                        <span className="text-rose-600">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Tự động gán Nhóm & cấu hình nghiệp vụ tương ứng
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {/* Card 1: Gaming & Gear */}
                      <button
                        type="button"
                        onClick={() => toggleIdolCategory('gaming_gear', 'Nhóm Idol Gaming & Gear', 'streamer_gaming', 'Streamer Game & Review Gear')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isCategorySelected('gaming_gear')
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/20'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xl">🎮</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              Gaming & Gear
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">Idol Nữ Gaming & Gear</div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">
                            Nữ chơi game, quảng bá tựa game, thiết bị/dụng cụ chơi game & gắn giỏ hàng sản phẩm.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-emerald-600" />
                          <span>Gắn giỏ hàng Game/Gear</span>
                        </div>
                      </button>

                      {/* Card 2: Performance & Donate (PK) */}
                      <button
                        type="button"
                        onClick={() => toggleIdolCategory('performance_donate', 'Nhóm Idol Biểu Diễn & Donate (PK)', 'idol_performance', 'Idol Biểu Diễn & PK')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isCategorySelected('performance_donate')
                          ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/20'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xl">🎤</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                              Donate & Sponsor
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">Biểu Diễn & Donate (PK)</div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">
                            Hát, nhảy, làm theo yêu cầu, đấu kèo PK nhận donate, lồng ghép đồ nhãn hàng tài trợ & gắn giỏ hàng.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-purple-100 text-[10px] text-purple-700 font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-purple-600" />
                          <span>Donate + Đồ tài trợ</span>
                        </div>
                      </button>

                      {/* Card 3: Live Commerce Chốt Đơn */}
                      <button
                        type="button"
                        onClick={() => toggleIdolCategory('live_commerce', 'Nhóm Idol Live Commerce & Chốt Đơn', 'idol_commerce', 'Host Live Commerce')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isCategorySelected('live_commerce')
                          ? 'bg-rose-50/90 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50/20'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xl">🛍️</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                              Live Commerce
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">Live Commerce Chốt Đơn</div>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">
                            Chuyên giới thiệu sản phẩm thời trang, mỹ phẩm, skincare, phụ kiện... chốt đơn trực tiếp trên phiên live.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-rose-100 text-[10px] text-rose-700 font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-rose-600" />
                          <span>Chốt đơn trên live</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Chi Tiết Nghiệp Vụ Thương Mại & Giỏ Hàng theo từng Phân Loại */}
                  {formData.idolCategory === 'gaming_gear' && (
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <span>🎮 Cấu Hình Nghiệp Vụ: Idol Nữ Gaming & Gear</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Tựa game livestream / quảng bá (phân cách bằng dấu phẩy)
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Liên Quân Mobile, Valorant, Genshin Impact"
                            value={commercialTextDraft.gameTitles}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCommercialTextDraft(prev => ({ ...prev, gameTitles: value }));
                              setFormData(prev => ({
                                ...prev,
                                commercialDetails: { ...(prev.commercialDetails || {}), gameTitles: toCommaSeparatedList(value) }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Thiết bị & dụng cụ chơi game hỗ trợ quảng bá
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Tai nghe gaming, Chuột không dây, Phím cơ, Ghế..."
                            value={commercialTextDraft.gearBrands}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCommercialTextDraft(prev => ({ ...prev, gearBrands: value }));
                              setFormData(prev => ({
                                ...prev,
                                commercialDetails: { ...(prev.commercialDetails || {}), gearBrands: toCommaSeparatedList(value) }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Link giỏ hàng sản phẩm Game & Gear (Tiktok Shop / Shopee / Landing Page)
                        </label>
                        <input
                          type="text"
                          placeholder="https://tiktok.com/@gaming_cart/..."
                          value={formData.commercialDetails?.cartLinkGaming || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              commercialDetails: { ...(prev.commercialDetails || {}), cartLinkGaming: val }
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {formData.idolCategory === 'performance_donate' && (
                    <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                        <span>🎤 Cấu Hình Nghiệp Vụ: Biểu Diễn & Donate (PK)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Kỹ năng biểu diễn / Kèo PK theo yêu cầu
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Hát acoustic, Nhảy cover Kpop, PK kèo vui, Tấu hài..."
                            value={commercialTextDraft.talents}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCommercialTextDraft(prev => ({ ...prev, talents: value }));
                              setFormData(prev => ({
                                ...prev,
                                commercialDetails: { ...(prev.commercialDetails || {}), talents: toCommaSeparatedList(value) }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Đồ nhãn hàng gửi lồng ghép (thời trang, mỹ phẩm, trang sức...)
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Váy dạ hội Dior, Son môi MAC, Vòng cổ bạc..."
                            value={commercialTextDraft.sponsorBrands}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCommercialTextDraft(prev => ({ ...prev, sponsorBrands: value }));
                              setFormData(prev => ({
                                ...prev,
                                commercialDetails: { ...(prev.commercialDetails || {}), sponsorBrands: toCommaSeparatedList(value) }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Link giỏ hàng đồ nhãn hàng tài trợ gắn trên live
                        </label>
                        <input
                          type="text"
                          placeholder="https://tiktok.com/@sponsor_cart/..."
                          value={formData.commercialDetails?.cartLinkSponsor || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              commercialDetails: { ...(prev.commercialDetails || {}), cartLinkSponsor: val }
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {formData.idolCategory === 'live_commerce' && (
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                        <span>🛍️ Cấu Hình Nghiệp Vụ: Live Commerce Chốt Đơn</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Ngành hàng chốt đơn chính trên live
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Thời trang nữ cao cấp, Mỹ phẩm Skincare, Phụ kiện..."
                            value={commercialTextDraft.commerceCategories}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCommercialTextDraft(prev => ({ ...prev, commerceCategories: value }));
                              setFormData(prev => ({
                                ...prev,
                                commercialDetails: { ...(prev.commercialDetails || {}), commerceCategories: toCommaSeparatedList(value) }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Mục tiêu GMV / Doanh số mỗi phiên live (VNĐ)
                          </label>
                          <input
                            type="number"
                            step="5000000"
                            placeholder="VD: 50000000"
                            value={formData.commercialDetails?.targetGmvPerLive || 50000000}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setFormData(prev => ({
                                ...prev,
                                commercialDetails: { ...(prev.commercialDetails || {}), targetGmvPerLive: val }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Link Giỏ hàng TikTok Shop / Shopee Live chốt đơn trực tiếp
                        </label>
                        <input
                          type="text"
                          placeholder="https://tiktok.com/@live_shop/cart/..."
                          value={formData.commercialDetails?.cartLinkCommerce || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              commercialDetails: { ...(prev.commercialDetails || {}), cartLinkCommerce: val }
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Nhóm Đơn Vị Tương Ứng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-rose-200/60">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Thuộc Nhóm Idol Hoạt Động</span>
                        <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formData.department || (activeDeptList[0] || '')}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-semibold text-slate-800"
                      >
                        {activeDeptList.map((dept) => (
                          <option key={dept} value={dept}>⭐ {dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Role Hệ Thống Cấp Tự Động:
                      </label>
                      <div className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono text-rose-700 font-bold flex items-center justify-between">
                        <span>{formData.assignedRole || 'streamer_gaming'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Cấp Bàn Làm Việc Idol</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Bước 2 Khối Cán Bộ: Phòng Ban & Role Vận Hành */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-200/60">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Thuộc Phòng Ban Vận Hành</span>
                        <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAllDepts(!showAllDepts)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        {showAllDepts ? 'Chỉ hiện theo role' : 'Tất cả đơn vị'}
                      </button>
                    </div>
                    <select
                      value={formData.department || (staffDepts[0] || '')}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const roleOptions = getRolesForDepartment(newDept);
                        const primaryRole = roleOptions.find(r => r.isPrimary)?.value || roleOptions[0]?.value || 'staff';
                        setFormData({ ...formData, department: newDept, assignedRole: primaryRole });
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800"
                    >
                      {staffDepts.map((dept) => (
                        <option key={dept} value={dept}>🏢 {dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Gán Role Cán Bộ Vận Hành:
                      </label>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        Khớp theo {formData.department ? formData.department.split(' ')[0] : 'phòng ban'}
                      </span>
                    </div>
                    <select
                      value={formData.assignedRole || getRolesForDepartment(formData.department)[0]?.value || 'staff'}
                      onChange={(e) => setFormData({ ...formData, assignedRole: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800"
                    >
                      {getRolesForDepartment(formData.department).map((roleOpt) => (
                        <option key={roleOpt.value} value={roleOpt.value}>
                          {roleOpt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Company Account Auto-Generation Box (Only when personnelType === 'Công ty') */}
          {(formData.personnelType || 'Công ty') === 'Công ty' && (
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-purple-50/40 border border-indigo-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">
                      Tài Khoản Nhân Sự & Email Nội Bộ Công Ty
                    </h4>
                    <p className="text-[10px] text-indigo-700">
                      Tự động gợi ý từ Tên thật. Idol dùng tài khoản này để vào Bàn Làm Việc, xem giờ live, KPI và lương.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                  Nhân sự Công ty
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <AtSign className="w-3 h-3 text-indigo-600" />
                      <span>Tên đăng nhập (Username)</span>
                    </span>
                    {isEdit && (
                      <span title="Tài khoản cố định">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.accountUsername || ''}
                    readOnly={isEdit}
                    disabled={isEdit}
                    onChange={(e) => {
                      if (isEdit) return;
                      setManualCredsEdited(true);
                      setFormData({
                        ...formData,
                        accountUsername: e.target.value.toLowerCase().replace(/\s+/g, '')
                      });
                    }}
                    placeholder="VD: mytt, anhtm..."
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg font-mono font-bold ${isEdit
                      ? 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed select-none'
                      : 'bg-white border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-600" />
                      <span>Email công ty</span>
                    </span>
                    {isEdit && (
                      <span title="Email cố định">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={formData.socialLinks?.email || ''}
                    readOnly={isEdit}
                    disabled={isEdit}
                    onChange={(e) => {
                      if (isEdit) return;
                      setManualCredsEdited(true);
                      setFormData({
                        ...formData,
                        socialLinks: { ...(formData.socialLinks || {}), email: e.target.value.toLowerCase().trim() }
                      });
                    }}
                    placeholder="VD: mytt@auratalent.vn"
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg font-medium ${isEdit
                      ? 'bg-slate-100/90 border border-slate-200 text-slate-500 cursor-not-allowed select-none'
                      : 'bg-white border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800'
                      }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-indigo-600" />
                      <span>Mật khẩu ban đầu</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-indigo-50"
                      title="Sao chép mật khẩu"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Đã chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-indigo-500" />
                          <span>Copy mật khẩu</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAccountPassword ? "text" : "password"}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder=""
                      className="w-full pl-2.5 pr-8 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors cursor-pointer"
                      title={showAccountPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showAccountPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                <span>✓ Quyền mặc định: Bàn làm việc Idol, Lịch ca trực, Nhiệm vụ, Bảng xếp hạng.</span>
                {!idolToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.realName) {
                        const creds = generateCompanyCredentials(formData.realName);
                        setFormData({
                          ...formData,
                          accountUsername: creds.username,
                          socialLinks: { ...(formData.socialLinks || {}), email: creds.email }
                        });
                        setManualCredsEdited(false);
                      }
                    }}
                    className="text-indigo-700 hover:underline font-semibold cursor-pointer"
                  >
                    Gợi ý lại theo Tên thật
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Status Selection - Không áp dụng cho Dịch vụ ngoài, và ẩn khi HR tạo mới để tránh tốn diện tích */}
          {formData.personnelType !== 'Dịch vụ ngoài' && (isEdit || currentUser?.isSuperAdmin) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Trạng thái nhân sự <span className="text-rose-600">*</span>
                </label>
                {onOpenStatusManager && (
                  <button
                    type="button"
                    onClick={onOpenStatusManager}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-semibold"
                  >
                    + Quản lý trạng thái
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {statuses.map(opt => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      const updates: any = { status: opt };
                      if (opt === 'Đã nghỉ việc' && !formData.resignedDate) {
                        updates.resignedDate = defaultJoinDate;
                      }
                      setFormData({ ...formData, ...updates });
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${formData.status === opt
                      ? 'border-rose-500 bg-rose-50 text-rose-800 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Trường Ngày Nghỉ Việc (chỉ hiện khi chọn trạng thái Đã nghỉ việc) */}
              {formData.status === 'Đã nghỉ việc' && (
                <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-rose-950 flex items-center gap-1.5">
                      <span>🛑</span>
                      <span>Ngày Thôi Việc / Nghỉ Việc Chính Thức</span>
                      <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 border border-rose-300">
                      Đã Nghỉ Việc
                    </span>
                  </div>
                  <DateInput
                    value={formData.resignedDate || defaultJoinDate}
                    onChange={(resignedDate) => setFormData({ ...formData, resignedDate })}
                    className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono font-bold text-rose-900"
                  />
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    💡 <strong>Quy định chi trả lương:</strong> Nhân sự sẽ được thanh toán kỳ lương cuối cùng trong tháng thôi việc (vào ngày 5 tháng sau). Sau chu kỳ chi trả này, hệ thống sẽ tự động dừng tính lương.
                  </p>
                </div>
              )}
            </div>
          )}

          {(loadingPersonnelColumns || personnelColumns.length > 0) && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Thông tin bổ sung</h4>
                  <p className="text-[10px] text-indigo-700 mt-0.5">Các trường được cấu hình bởi quản trị hệ thống.</p>
                </div>
                {loadingPersonnelColumns && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
              </div>
              {!loadingPersonnelColumns && personnelColumns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {personnelColumns.map((column) => {
                    const value = formData.customFields?.[column.key];
                    const updateValue = (nextValue: string | number | boolean | null) => {
                      setFormData((prev) => ({
                        ...prev,
                        customFields: { ...(prev.customFields || {}), [column.key]: nextValue }
                      }));
                    };
                    return (
                      <div key={column.id}>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {column.label} {column.required && <span className="text-rose-600">*</span>}
                        </label>
                        {column.type === 'select' ? (
                          <select value={value === null || value === undefined ? '' : String(value)} onChange={(e) => updateValue(e.target.value || null)} className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            <option value="">Chọn {column.label.toLowerCase()}</option>
                            {(column.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : column.type === 'boolean' ? (
                          <label className="flex items-center gap-2 min-h-[34px] px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-700">
                            <input type="checkbox" checked={value === true} onChange={(e) => updateValue(e.target.checked)} />
                            {value === true ? 'Có' : 'Không'}
                          </label>
                        ) : column.type === 'date' ? (
                          <DateInput
                            value={value === null || value === undefined ? '' : String(value)}
                            onChange={(dateValue) => updateValue(dateValue || null)}
                            required={column.required}
                            className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <input
                            type={column.type === 'number' ? 'number' : 'text'}
                            value={value === null || value === undefined ? '' : String(value)}
                            onChange={(e) => updateValue(column.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : (e.target.value || null))}
                            required={column.required}
                            className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bio text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiểu sử ngắn (Bio giới thiệu bản thân hiển thị trên Popup)
            </label>
            <textarea
              rows={3}
              placeholder="Nhập tiểu sử, giải thưởng, phong cách trình diễn hoặc thế mạnh nghệ thuật..."
              value={formData.bio || ''}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Liên kết liên hệ & Mạng xã hội
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="email"
                placeholder="Email: artist@agency.vn"
                value={formData.socialLinks?.email || ''}
                onChange={e => setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, email: e.target.value }
                })}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
              />
              <input
                type="text"
                placeholder="LinkedIn: in/profile-name"
                value={formData.socialLinks?.linkedin || ''}
                onChange={e => setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                })}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
              />
              <input
                type="text"
                placeholder="Instagram: @handle"
                value={formData.socialLinks?.instagram || ''}
                onChange={e => setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                })}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Chính Sách Lương & Tài Khoản Ngân Hàng (HR / Quản Trị Cấu Hình) */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-slate-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Chính Sách Lương Cứng & Tài Khoản Thụ Hưởng (HR / Quản Trị Nhập)
                  </h4>
                  <p className="text-[10px] text-emerald-700">
                    Mức lương thỏa thuận theo hợp đồng cá nhân và tài khoản nhận lương bảo mật.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                Chỉ HR & Quản trị
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 items-start">
              {/* Lương cứng hợp đồng */}
              <div className="min-w-0">
                <label className="block h-[3.75rem] text-[11px] font-semibold text-slate-700 mb-1 flex items-start justify-between gap-2">
                  <span>Lương Cứng Hợp Đồng (VNĐ/tháng)</span>
              
                </label>
                <input
                  type="number"
                  min="0"
                  step="500000"
                  placeholder="Nhập mức lương thỏa thuận (VNĐ)..."
                  value={formData.baseSalary !== undefined && formData.baseSalary !== null ? formData.baseSalary : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      baseSalary: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value))
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900"
                />
              </div>

              {/* Tên ngân hàng */}
              <div className="min-w-0">
                <label className="block h-[3.75rem] text-[11px] font-semibold text-slate-700 mb-1">
                  Ngân Hàng Thụ Hưởng
                </label>
                <input
                  type="text"
                  placeholder="VD: MB Bank, Vietcombank..."
                  value={formData.bankName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankName: e.target.value
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {/* Số tài khoản */}
              <div className="min-w-0">
                <label className="block h-[3.75rem] text-[11px] font-semibold text-slate-700 mb-1">
                  Số Tài Khoản (STK)
                </label>
                <input
                  type="text"
                  placeholder="VD: 1900889988"
                  value={formData.bankAccountNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccountNumber: e.target.value
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900"
                />
              </div>

              {/* Chủ tài khoản */}
              <div className="min-w-0">
                <label className="block h-[3.75rem] text-[11px] font-semibold text-slate-700 mb-1">
                  Chủ Tài Khoản (In hoa)
                </label>
                <input
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={formData.bankAccountName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccountName: e.target.value.toUpperCase()
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 uppercase"
                />
              </div>
            </div>

            {isEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 items-start">
                <div className="min-w-0">
                  <label className="block min-h-[2rem] text-[10px] font-semibold text-amber-900 mb-1">
                    Ngày hiệu lực nếu đổi lương
                  </label>
                  <DateInput value={salaryEffectiveFrom} onChange={setSalaryEffectiveFrom} />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <label className="block min-h-[2rem] text-[10px] font-semibold text-amber-900 mb-1">
                    Lý do thay đổi
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Điều chỉnh theo hợp đồng năm mới"
                    value={salaryChangeReason}
                    onChange={(e) => setSalaryChangeReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">Kỳ lương đã tạo không tự thay đổi.</p>
                </div>
              </div>
            )}
          </div>
          </fieldset>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploading || isResignedProfileLocked}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                {idolToEdit ? 'Lưu Thay Đổi' : 'Thêm'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
