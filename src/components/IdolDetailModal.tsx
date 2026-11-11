import React, { useEffect, useMemo, useState } from 'react';
import { Idol, Criterion, IdolScoreRecord, IdolTask, WorkScheduleSlot, IDOL_CATEGORIES_CONFIG, PersonnelColumn, ServiceUsageRecord, UserAccount } from '../types/index.ts';
import { calculateExactAge, calculateTenure, formatDateVN } from '../utils/dateUtils.ts';
import { DateInput } from './DateInput.tsx';
import { DateTimeInput } from './DateTimeInput.tsx';
import { formatPersonnelColumnValue, getProfileCustomColumns } from '../utils/personnelColumnUtils.ts';
import { X, Mail, Linkedin, Instagram, MapPin, Calendar, Activity, CheckSquare, Edit3, ShieldCheck, Award, Clock, Briefcase, CalendarClock, Tv, ShoppingBag, ExternalLink, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { api } from '../services/api.ts';
import { notify } from '../utils/uiFeedback.ts';

interface IdolDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  idol: Idol | null;
  criteria: Criterion[];
  scoreRecord?: IdolScoreRecord | null;
  tasks: IdolTask[];
  schedules?: WorkScheduleSlot[];
  personnelColumns?: PersonnelColumn[];
  referenceDate?: string;
  onEdit: (idol: Idol) => void;
  onGoToTasks: (idolId: string) => void;
  onGoToSchedule?: (idolId: string) => void;
  canManageIdols?: boolean;
  canManageSchedule?: boolean;
  users?: UserAccount[];
}

export const IdolDetailModal: React.FC<IdolDetailModalProps> = ({
  isOpen,
  onClose,
  idol,
  criteria,
  scoreRecord,
  tasks,
  schedules = [],
  personnelColumns = [],
  referenceDate,
  onEdit,
  onGoToTasks,
  onGoToSchedule,
  canManageIdols = false,
  canManageSchedule = false,
  users = []
}) => {
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [serviceUsages, setServiceUsages] = useState<ServiceUsageRecord[]>([]);
  const [serviceUsageAssignees, setServiceUsageAssignees] = useState<UserAccount[]>([]);
  const [serviceUsageLoading, setServiceUsageLoading] = useState(false);
  const [serviceUsageError, setServiceUsageError] = useState<string | null>(null);
  const [serviceUsageFormOpen, setServiceUsageFormOpen] = useState(false);
  const [editingServiceUsage, setEditingServiceUsage] = useState<ServiceUsageRecord | null>(null);
  const [serviceUsageDraft, setServiceUsageDraft] = useState<{
    serviceName: string; description: string; usageDate: string; startAt: string; endAt: string; quantity: string; unit: string;
    location: string; grossAmount: string; discountAmount: string; status: ServiceUsageRecord['status']; contractRef: string; invoiceRef: string; notes: string; assignedUserIds: string[];
  }>({
    serviceName: '', description: '', usageDate: new Date().toISOString().slice(0, 10),
    startAt: '', endAt: '', quantity: '1', unit: 'lượt', location: '',
    grossAmount: '0', discountAmount: '0', status: 'completed', contractRef: '', invoiceRef: '', notes: '', assignedUserIds: []
  });
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [cancellingServiceUsage, setCancellingServiceUsage] = useState<ServiceUsageRecord | null>(null);
  const [serviceUsageCancellationReason, setServiceUsageCancellationReason] = useState('');

  const isExternalService = idol?.personnelType === 'Dịch vụ ngoài';
  const showEmbeddedServiceUsageHistory = false;

  useEffect(() => {
    if (!isOpen || !idol || !isExternalService) {
      setServiceUsages([]);
      setServiceUsageError(null);
      return;
    }
    let cancelled = false;
    setServiceUsageLoading(true);
    api.getServiceUsageRecords(idol.id)
      .then((records) => { if (!cancelled) setServiceUsages(records); })
      .catch((error) => { if (!cancelled) setServiceUsageError(error instanceof Error ? error.message : 'Không thể tải lịch sử sử dụng dịch vụ'); })
      .finally(() => { if (!cancelled) setServiceUsageLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, idol?.id, isExternalService]);

  useEffect(() => {
    if (!isOpen || !isExternalService || !canManageIdols) {
      setServiceUsageAssignees([]);
      return;
    }
    let cancelled = false;
    api.getServiceUsageAssignees()
      .then((assignees) => { if (!cancelled) setServiceUsageAssignees(assignees); })
      .catch(() => { if (!cancelled) setServiceUsageAssignees([]); });
    return () => { cancelled = true; };
  }, [canManageIdols, isExternalService, isOpen]);

  const resetServiceUsageForm = () => {
    setEditingServiceUsage(null);
    setServiceUsageDraft({
      serviceName: '', description: '', usageDate: new Date().toISOString().slice(0, 10),
      startAt: '', endAt: '', quantity: '1', unit: 'lượt', location: '',
      grossAmount: '0', discountAmount: '0', status: 'completed', contractRef: '', invoiceRef: '', notes: '', assignedUserIds: []
    });
    setAssigneeQuery('');
    setServiceUsageFormOpen(false);
  };

  const startServiceUsageEdit = (record: ServiceUsageRecord) => {
    setEditingServiceUsage(record);
    setServiceUsageDraft({
      serviceName: record.serviceName, description: record.description || '', usageDate: record.usageDate.slice(0, 10),
      startAt: record.startAt ? record.startAt.slice(0, 16) : '', endAt: record.endAt ? record.endAt.slice(0, 16) : '',
      quantity: String(record.quantity), unit: record.unit, location: record.location || '', grossAmount: String(record.grossAmount),
      discountAmount: String(record.discountAmount), status: record.status, contractRef: record.contractRef || '',
      invoiceRef: record.invoiceRef || '', notes: record.notes || '', assignedUserIds: (record.assignedUserIds?.length ? record.assignedUserIds : record.assignedUserId ? [record.assignedUserId] : []).map(String)
    });
    setServiceUsageFormOpen(true);
  };

  const saveServiceUsage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idol) return;
    setServiceUsageError(null);
    try {
      const { status: _status, ...draft } = serviceUsageDraft;
      const payload = { ...draft, personnelId: Number(idol.id), assignedUserIds: serviceUsageDraft.assignedUserIds.map(Number), quantity: Number(serviceUsageDraft.quantity) || 0, grossAmount: Number(serviceUsageDraft.grossAmount) || 0, discountAmount: Number(serviceUsageDraft.discountAmount) || 0 };
      const saved = editingServiceUsage
        ? await api.updateServiceUsageRecord(editingServiceUsage.id, payload)
        : await api.createServiceUsageRecord(payload);
      setServiceUsages((current) => editingServiceUsage ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      notify(editingServiceUsage ? 'Đã cập nhật lượt sử dụng dịch vụ thành công.' : 'Đã thêm lượt sử dụng dịch vụ thành công.', 'success');
      resetServiceUsageForm();
    } catch (error) {
      setServiceUsageError(error instanceof Error ? error.message : 'Không thể lưu lịch sử sử dụng dịch vụ');
      notify(error instanceof Error ? error.message : 'Không thể lưu lịch sử sử dụng dịch vụ', 'error');
    }
  };

  const cancelServiceUsage = async (record?: ServiceUsageRecord) => {
    if (record) { setCancellingServiceUsage(record); setServiceUsageCancellationReason(''); return; }
    if (!cancellingServiceUsage || !serviceUsageCancellationReason.trim()) return;
    try {
      await api.cancelServiceUsageRecord(cancellingServiceUsage.id, serviceUsageCancellationReason.trim());
      setServiceUsages((current) => current.map((item) => item.id === cancellingServiceUsage.id ? { ...item, status: 'cancelled' } : item));
      setCancellingServiceUsage(null);
      setServiceUsageCancellationReason('');
    } catch (error) {
      setServiceUsageError(error instanceof Error ? error.message : 'Không thể huỷ lượt sử dụng dịch vụ');
    }
  };

  useEffect(() => {
    if (!isAvatarPreviewOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAvatarPreviewOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAvatarPreviewOpen]);

  if (!isOpen || !idol) return null;

  // Calculate BMI and Tenure
  const heightM = (idol.height || 165) / 100;
  const bmi = Number(((idol.weight || 48) / (heightM * heightM)).toFixed(1));
  const tenureInfo = calculateTenure(idol.joinDate, referenceDate);
  const idolTasks = tasks.filter((t) => t.idolId === idol.id);
  const completedTasks = idolTasks.filter((t) => t.status === 'completed').length;
  const totalMinutes = idolTasks.reduce((acc, t) => acc + (t.loggedDurationMinutes || 0), 0);
  const profileCustomColumns = getProfileCustomColumns(personnelColumns);

  // Dynamic Modal Header Title based on personnel type and category
  const modalTitle = useMemo(() => {
    if (idol.personnelType === 'Dịch vụ ngoài') {
      return 'Hồ Sơ Khách Thuê Dịch Vụ';
    }
    if (idol.isIdol !== false) {
      if (idol.idolCategory === 'gaming_gear') return 'Hồ Sơ Streamer & Idol Gaming';
      if (idol.idolCategory === 'performance_donate') return 'Hồ Sơ Idol & Nghệ Sĩ Biểu Diễn';
      if (idol.idolCategory === 'live_commerce') return 'Hồ Sơ Idol & Host Live Commerce';
      return 'Hồ Sơ Idol & Talent';
    }
    if (idol.department === 'Ban Giám Đốc') {
      return 'Hồ Sơ Ban Điều Hành';
    }
    return 'Hồ Sơ Nhân Viên Công Ty';
  }, [idol]);

  // Check if commercial details actually have data to display
  const hasCommercialData = useMemo(() => {
    if (idol.personnelType === 'Dịch vụ ngoài' || !idol.idolCategory) return false;
    const cd = idol.commercialDetails;
    if (idol.idolCategory === 'gaming_gear') {
      return Boolean((cd?.gameTitles && cd.gameTitles.length > 0) || (cd?.gearBrands && cd.gearBrands.length > 0) || cd?.cartLinkGaming);
    }
    if (idol.idolCategory === 'performance_donate') {
      return Boolean((cd?.talents && cd.talents.length > 0) || (cd?.sponsorBrands && cd.sponsorBrands.length > 0) || cd?.cartLinkSponsor);
    }
    if (idol.idolCategory === 'live_commerce') {
      return Boolean((cd?.commerceCategories && cd.commerceCategories.length > 0) || cd?.targetGmvPerLive || cd?.cartLinkCommerce);
    }
    return false;
  }, [idol]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded">
              ID: {idol.id.slice(-6)}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {modalTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Top Banner Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(true)}
              className="group relative h-32 w-32 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border-2 border-rose-300 bg-white shadow-sm transition hover:border-rose-500 hover:shadow-md sm:h-36 sm:w-36"
              aria-label={`Phóng to ảnh hồ sơ của ${idol.stageName}`}
            >
              <img
                src={idol.avatarUrl}
                alt={idol.stageName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/65 px-2 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                Xem ảnh lớn
              </span>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 truncate">
                  {idol.stageName}
                </h2>
                {idol.personnelType === 'Dịch vụ ngoài' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    🏷️ Khách Thuê Dịch Vụ Ngoài
                  </span>
                ) : idol.status === 'Chờ duyệt' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                    <span>Chờ duyệt (Pending)</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${idol.status === 'Đang hoạt động' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                    }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {idol.status}
                  </span>
                )}

                {idol.personnelType !== 'Dịch vụ ngoài' && idol.idolCategory && IDOL_CATEGORIES_CONFIG[idol.idolCategory] && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeBg} ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeBorder} ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeText}`}>
                    <span>{IDOL_CATEGORIES_CONFIG[idol.idolCategory].icon}</span>
                    <span>{IDOL_CATEGORIES_CONFIG[idol.idolCategory].label}</span>
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                Tên thật: <strong>{idol.realName}</strong>
              </p>
              <p className="text-xs font-bold text-sky-800 mt-0.5">
                {idol.role}
                {idol.department && (idol.personnelType !== 'Dịch vụ ngoài' || (!idol.department.toLowerCase().includes('nhóm idol') && idol.department !== 'Khách dịch vụ ngoài')) && (
                  <> · <span className="font-normal text-slate-600">{idol.department}</span></>
                )}
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                {idol.socialLinks?.email && (
                  <a
                    href={`mailto:${idol.socialLinks.email}`}
                    className="p-1 text-slate-500 hover:text-sky-600 hover:bg-white rounded transition-colors"
                    title={idol.socialLinks.email}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
                {idol.socialLinks?.linkedin && (
                  <a
                    href={`https://${idol.socialLinks.linkedin.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-500 hover:text-sky-700 hover:bg-white rounded transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {idol.socialLinks?.instagram && (
                  <a
                    href={`https://${idol.socialLinks.instagram.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-white rounded transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                <span className="text-[11px] text-slate-600 ml-auto flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Hồ sơ Agency
                </span>
              </div>
            </div>
          </div>

          {/* Gói Dịch Vụ Đã Đăng Ký (Dành riêng cho Khách Thuê Dịch Vụ Ngoài) */}
          {idol.personnelType === 'Dịch vụ ngoài' && idol.serviceNotes && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <span>📦 Gói Dịch Vụ Khách Hàng / Đối Tác Đăng Ký:</span>
              </div>
              <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">{idol.serviceNotes}</p>
            </div>
          )}

          {/* Hộp Định Hướng Thương Mại & Giỏ Hàng Sản Phẩm Chuyên Biệt (Chỉ áp dụng khi có cấu hình thực tế) */}
          {hasCommercialData && idol.idolCategory && (
            <div className={`p-4 rounded-xl border ${idol.idolCategory === 'gaming_gear'
              ? 'bg-emerald-50/70 border-emerald-200'
              : idol.idolCategory === 'performance_donate'
                ? 'bg-purple-50/70 border-purple-200'
                : 'bg-rose-50/70 border-rose-200'
              } space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{IDOL_CATEGORIES_CONFIG[idol.idolCategory]?.icon || '⭐'}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Định Hướng Thương Mại: {IDOL_CATEGORIES_CONFIG[idol.idolCategory]?.label}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {IDOL_CATEGORIES_CONFIG[idol.idolCategory]?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chi tiết theo category */}
              {idol.idolCategory === 'gaming_gear' && (
                <div className="space-y-2 text-xs">
                  {idol.commercialDetails?.gameTitles && idol.commercialDetails.gameTitles.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Tựa game live:</span>
                      <div className="flex flex-wrap gap-1">
                        {idol.commercialDetails.gameTitles.map(g => (
                          <span key={g} className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idol.commercialDetails?.gearBrands && idol.commercialDetails.gearBrands.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Thiết bị gear:</span>
                      <div className="flex flex-wrap gap-1">
                        {idol.commercialDetails.gearBrands.map(b => (
                          <span key={b} className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 font-medium text-[11px]">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idol.commercialDetails?.cartLinkGaming && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={idol.commercialDetails.cartLinkGaming}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Xem Giỏ Hàng Sản Phẩm Game & Gear</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {idol.idolCategory === 'performance_donate' && (
                <div className="space-y-2 text-xs">
                  {idol.commercialDetails?.talents && idol.commercialDetails.talents.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Thế mạnh & Kèo PK:</span>
                      <div className="flex flex-wrap gap-1">
                        {idol.commercialDetails.talents.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-800 font-semibold text-[11px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idol.commercialDetails?.sponsorBrands && idol.commercialDetails.sponsorBrands.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Đồ nhãn hàng gửi:</span>
                      <div className="flex flex-wrap gap-1">
                        {idol.commercialDetails.sponsorBrands.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-800 font-medium text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idol.commercialDetails?.cartLinkSponsor && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={idol.commercialDetails.cartLinkSponsor}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Xem Giỏ Hàng Đồ Nhãn Hàng Tài Trợ</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {idol.idolCategory === 'live_commerce' && (
                <div className="space-y-2 text-xs">
                  {idol.commercialDetails?.commerceCategories && idol.commercialDetails.commerceCategories.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Ngành hàng chốt đơn:</span>
                      <div className="flex flex-wrap gap-1">
                        {idol.commercialDetails.commerceCategories.map(c => (
                          <span key={c} className="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-800 font-semibold text-[11px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idol.commercialDetails?.targetGmvPerLive && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium shrink-0">Target GMV / live:</span>
                      <span className="font-mono font-bold text-rose-700">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(idol.commercialDetails.targetGmvPerLive)}
                      </span>
                    </div>
                  )}
                  {idol.commercialDetails?.cartLinkCommerce && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={idol.commercialDetails.cartLinkCommerce}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Xem Giỏ Hàng & Shop Chốt Đơn Live</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isExternalService && (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-amber-700" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Thêm lượt sử dụng dịch vụ</h4>
                    <p className="text-[10px] text-slate-500">Ghi nhận nhanh một lần sử dụng; lịch sử đầy đủ xem tại trang riêng.</p>
                  </div>
                </div>
                {canManageIdols && !serviceUsageFormOpen && (
                  <button type="button" onClick={() => setServiceUsageFormOpen(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Thêm lượt sử dụng
                  </button>
                )}
              </div>

              {serviceUsageError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{serviceUsageError}</p>}

              {serviceUsageFormOpen && canManageIdols && (
                <form onSubmit={saveServiceUsage} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-white rounded-lg border border-amber-200">
                  <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">Tên dịch vụ *
                    <input required value={serviceUsageDraft.serviceName} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, serviceName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" placeholder="Ví dụ: Gói quay TVC tháng 01" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Ngày sử dụng *
                    <DateInput required value={serviceUsageDraft.usageDate} onChange={(value) => setServiceUsageDraft({ ...serviceUsageDraft, usageDate: value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Bắt đầu
                    <DateTimeInput value={serviceUsageDraft.startAt} onChange={(value) => setServiceUsageDraft({ ...serviceUsageDraft, startAt: value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Kết thúc
                    <DateTimeInput value={serviceUsageDraft.endAt} onChange={(value) => setServiceUsageDraft({ ...serviceUsageDraft, endAt: value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Số lượng
                    <input type="number" min="0" step="0.01" value={serviceUsageDraft.quantity} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, quantity: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Đơn vị
                    <input value={serviceUsageDraft.unit} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, unit: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Giá trị trước giảm
                    <input type="number" min="0" step="1000" value={serviceUsageDraft.grossAmount} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, grossAmount: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Giảm giá
                    <input type="number" min="0" step="1000" value={serviceUsageDraft.discountAmount} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, discountAmount: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Địa điểm
                    <input value={serviceUsageDraft.location} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, location: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Người thực hiện
                    <input value={assigneeQuery} onChange={(e) => setAssigneeQuery(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" placeholder="Tìm theo tên tài khoản..." />
                    <div className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                      {(serviceUsageAssignees.length > 0 ? serviceUsageAssignees : users).filter((user) => user.status !== 'inactive' && `${user.name} ${user.username}`.toLowerCase().includes(assigneeQuery.trim().toLowerCase())).map((user) => <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50"><input type="checkbox" checked={serviceUsageDraft.assignedUserIds.includes(user.id)} onChange={() => setServiceUsageDraft({ ...serviceUsageDraft, assignedUserIds: serviceUsageDraft.assignedUserIds.includes(user.id) ? serviceUsageDraft.assignedUserIds.filter((id) => id !== user.id) : [...serviceUsageDraft.assignedUserIds, user.id] })} />{user.name || user.username}</label>)}
                      {serviceUsageDraft.assignedUserIds.length === 0 && <p className="px-2 py-1 text-[11px] text-slate-400">Chưa phân công</p>}
                    </div>
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Mã hợp đồng
                    <input value={serviceUsageDraft.contractRef} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, contractRef: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">Mã hoá đơn
                    <input value={serviceUsageDraft.invoiceRef} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, invoiceRef: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">Mô tả / ghi chú
                    <textarea value={serviceUsageDraft.description} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" rows={2} />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">Ghi chú đối soát
                    <textarea value={serviceUsageDraft.notes} onChange={(e) => setServiceUsageDraft({ ...serviceUsageDraft, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" rows={2} />
                  </label>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button type="button" onClick={resetServiceUsageForm} className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Huỷ</button>
                    <button type="submit" className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"><Save className="w-3.5 h-3.5" /> Lưu</button>
                  </div>
                </form>
              )}

              {showEmbeddedServiceUsageHistory && (serviceUsageLoading ? <p className="text-xs text-slate-500 italic text-center py-3">Đang tải lịch sử...</p> : serviceUsages.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-3">Chưa có lượt sử dụng dịch vụ nào được ghi nhận.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-amber-100">
                  <table className="w-full text-left text-[11px]"><thead className="bg-amber-100/60 text-slate-700"><tr><th className="px-2 py-2">Mã / ngày</th><th className="px-2 py-2">Dịch vụ</th><th className="px-2 py-2">SL</th><th className="px-2 py-2">Giá trị</th><th className="px-2 py-2">Trạng thái</th><th className="px-2 py-2" /></tr></thead><tbody className="divide-y divide-amber-100 bg-white">{serviceUsages.map((record) => <tr key={record.id} className={record.status === 'cancelled' ? 'text-slate-400' : 'text-slate-700'}><td className="px-2 py-2 whitespace-nowrap"><strong>{record.usageCode}</strong><br />{formatDateVN(record.usageDate)}</td><td className="px-2 py-2"><strong>{record.serviceName}</strong>{record.location && <><br /><span className="text-slate-400">{record.location}</span></>}</td><td className="px-2 py-2 whitespace-nowrap">{record.quantity} {record.unit}</td><td className="px-2 py-2 whitespace-nowrap font-semibold">{new Intl.NumberFormat('vi-VN').format(record.netAmount)} đ</td><td className="px-2 py-2 whitespace-nowrap">{record.status === 'cancelled' ? 'Đã huỷ' : record.status === 'completed' ? 'Hoàn thành' : record.status === 'in_progress' ? 'Đang thực hiện' : 'Dự kiến'}</td><td className="px-2 py-2 whitespace-nowrap">{canManageIdols && record.status !== 'cancelled' && <><button type="button" title="Chỉnh sửa" onClick={() => startServiceUsageEdit(record)} className="p-1 text-slate-500 hover:text-amber-700"><Pencil className="w-3.5 h-3.5" /></button><button type="button" title="Huỷ lượt sử dụng" onClick={() => void cancelServiceUsage(record)} className="p-1 text-slate-500 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button></>}</td></tr>)}</tbody></table>
                </div>
              ))}
            </div>
          )}

          {/* Physical Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-600 font-medium block">Chiều cao</span>
              <span className="font-mono text-base font-bold text-slate-900 tabular-nums">{idol.height} cm</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-600 font-medium block">Cân nặng</span>
              <span className="font-mono text-base font-bold text-slate-900 tabular-nums">{idol.weight} kg</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-600 font-medium block">Chỉ số BMI</span>
              <span className="font-mono text-base font-bold text-sky-800 tabular-nums">{bmi} (Chuẩn)</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-600 font-medium block">Ngày sinh / Tuổi</span>
              <span className="font-mono text-xs font-bold text-slate-900 tabular-nums mt-1 block">
                {formatDateVN(idol.dob)} ({calculateExactAge(idol.dob, referenceDate)} tuổi)
              </span>
            </div>
          </div>

          {/* Join Date, Seniority (Thâm niên) and Personnel Type Grid */}
          <div className={`grid grid-cols-1 ${idol.personnelType === 'Dịch vụ ngoài' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">
                  {idol.personnelType === 'Dịch vụ ngoài' ? 'Ngày đăng ký dịch vụ:' : 'Thời điểm vào:'}
                </span>
                <span className="font-mono font-bold text-xs text-slate-900">{formatDateVN(idol.joinDate)}</span>
              </div>
            </div>
            {idol.resignedDate ? (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2.5">
                <span className="text-sm shrink-0">🛑</span>
                <div>
                  <span className="text-[10px] text-rose-700 block">Ngày thôi việc:</span>
                  <span className="font-mono font-bold text-xs text-rose-950">{formatDateVN(idol.resignedDate)}</span>
                </div>
              </div>
            ) : null}
            {idol.personnelType !== 'Dịch vụ ngoài' && (
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-800 block">Thâm niên công tác:</span>
                  <span className="font-bold text-xs text-emerald-950">{tenureInfo.formattedText}</span>
                </div>
              </div>
            )}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] text-indigo-800 block">Loại nhân sự:</span>
                <span className="font-bold text-xs text-indigo-950">{idol.personnelType || 'Công ty'}</span>
              </div>
            </div>
          </div>

          {/* Living and Hometown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-600 block">Quê quán:</span>
                <span className="font-semibold text-slate-800">{idol.hometown || 'Chưa cập nhật'}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-600 block">Nơi sinh sống hiện tại:</span>
                <span className="font-semibold text-slate-800">{idol.currentLiving || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* Bio Box */}
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Tiểu Sử & Định Hướng Nghệ Thuật
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{idol.bio || 'Chưa có thông tin tiểu sử bổ sung.'}"
            </p>
          </div>

          {profileCustomColumns.length > 0 && (
            <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-200 space-y-3">
              <h4 className="text-xs font-bold text-violet-900 uppercase tracking-wider">
                Thông tin bổ sung
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profileCustomColumns.map(column => (
                  <div key={column.id} className="p-3 bg-white rounded-lg border border-violet-100">
                    <span className="text-[10px] text-slate-500 block">{column.label}</span>
                    <span className="text-xs font-semibold text-slate-800 break-words">
                      {formatPersonnelColumnValue(column, idol.customFields?.[column.key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score Performance Breakdown */}
          {scoreRecord && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-rose-500" />
                  <h4 className="text-xs font-bold text-slate-800">
                    Bảng Điểm Đánh Giá Kỳ {scoreRecord.period}
                  </h4>
                </div>
                <span className="font-mono font-black text-rose-600 text-sm tabular-nums">
                  Tổng: {scoreRecord.totalScore} / 100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {criteria.map((c) => {
                  const score = scoreRecord.scores[c.id] || 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                      <span className="text-slate-600 font-medium truncate max-w-[180px]">{c.name}</span>
                      <span className="font-mono font-bold text-slate-800 tabular-nums">
                        {score} <span className="text-slate-400 font-normal">/ {c.maxScore}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {scoreRecord.evaluatorNotes && (
                <div className="text-[11px] text-slate-500 bg-rose-50/50 p-2 rounded border border-rose-100">
                  <strong>Nhận xét:</strong> {scoreRecord.evaluatorNotes}
                </div>
              )}
            </div>
          )}

          {/* Livestream & Work Schedule Section (Chỉ hiển thị cho Idol nội bộ công ty) */}
          {idol.isIdol !== false && idol.personnelType !== 'Dịch vụ ngoài' && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    Lịch Live Stream & Ca Làm Việc ({schedules.filter((s) => s.idolId === idol.id).length} ca/tuần)
                  </h4>
                </div>
                {onGoToSchedule && canManageSchedule && (
                  <button
                    onClick={() => {
                      onClose();
                      onGoToSchedule(idol.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-rose-600" />
                    <span>⚡ Thiết Lập Lịch Cho {idol.stageName}</span>
                  </button>
                )}
              </div>

              {schedules.filter((s) => s.idolId === idol.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">
                  Chưa thiết lập ca live stream cho nhân sự này.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {schedules
                    .filter((s) => s.idolId === idol.id)
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((slot) => {
                      const dayLabels = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                      const dayFull = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
                      return (
                        <div
                          key={slot.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 font-mono px-1.5 py-0.2 rounded bg-white border border-slate-200">
                                {dayLabels[slot.dayOfWeek] || `T${slot.dayOfWeek}`}
                              </span>
                              <span className="text-xs font-bold text-indigo-700 font-mono">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                              {slot.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {dayFull[slot.dayOfWeek]} · {slot.platform}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Workload Quick Summary (Chỉ áp dụng cho nhân sự công ty) */}
          {idol.personnelType !== 'Dịch vụ ngoài' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nhiệm vụ: {completedTasks}/{idolTasks.length} hoàn thành</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tổng thời lượng đã thực hiện: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onGoToTasks(idol.id);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors shadow-2xs"
              >
                Mở Trang Tasks
              </button>
            </div>
          )}
        </div>

        {isAvatarPreviewOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`Ảnh hồ sơ của ${idol.stageName}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsAvatarPreviewOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Đóng ảnh phóng to"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={idol.avatarUrl}
              alt={idol.stageName}
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[92vw] rounded-2xl border border-white/20 object-contain shadow-2xl"
            />
          </div>
        )}

        {cancellingServiceUsage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <form onSubmit={(event) => { event.preventDefault(); void cancelServiceUsage(); }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between"><div><h2 className="text-base font-black text-slate-900">Huỷ lượt sử dụng</h2><p className="mt-1 text-xs text-slate-500">{cancellingServiceUsage.usageCode} · {cancellingServiceUsage.serviceName}</p></div><button type="button" aria-label="Đóng" onClick={() => setCancellingServiceUsage(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
              <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">Lịch sử vẫn được giữ lại và chuyển sang trạng thái Đã huỷ.</p>
              <label className="block text-xs font-semibold text-slate-700">Lý do huỷ<textarea autoFocus required value={serviceUsageCancellationReason} onChange={(event) => setServiceUsageCancellationReason(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} placeholder="Nhập lý do huỷ..." /></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setCancellingServiceUsage(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Không huỷ</button><button type="submit" disabled={!serviceUsageCancellationReason.trim()} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Xác nhận huỷ</button></div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-[11px] text-slate-400">
            ID: {idol.id}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            {onGoToSchedule && idol.isIdol !== false && idol.personnelType !== 'Dịch vụ ngoài' && (
              <button
                onClick={() => {
                  onClose();
                  onGoToSchedule(idol.id);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lịch Làm Việc</span>
              </button>
            )}
            {canManageIdols && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(idol);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh Sửa Hồ Sơ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
