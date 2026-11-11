import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarClock,
  Clock,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Tv,
  CheckCircle2,
  AlertCircle,
  Video,
  Sparkles,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Sliders,
  Users,
  MapPin,
  HelpCircle,
  CalendarDays,
  CalendarRange,
  Repeat,
  Check,
  CalendarCheck,
  RotateCcw,
  X
} from 'lucide-react';
import { Idol, WorkScheduleSlot, ShiftType, UserAccount, ScheduleRepeatType, WorkAssignment } from '../types/index.ts';
import { getTodayIsoDate, formatDateVN } from '../utils/dateUtils.ts';
import { DateInput } from '../components/DateInput.tsx';
import { SearchableSelect } from '../components/SearchableSelect.tsx';
import { isIsoDateWithinPersonnelPeriod, isScheduleAllowedForPersonnel } from '../utils/scheduleUtils.ts';
import { confirmDialog } from '../utils/uiFeedback.ts';

interface WorkScheduleViewProps {
  idols: Idol[];
  departments: string[];
  schedules: WorkScheduleSlot[];
  workAssignments?: WorkAssignment[];
  currentUser?: UserAccount | null;
  referenceDate?: string;
  initialSelectedIdolId?: string;
  onSaveSchedule: (scheduleData: Partial<WorkScheduleSlot>) => Promise<void>;
  onDeleteSchedule: (id: string, skipConfirmation?: boolean) => Promise<void>;
  onBatchSetSchedules?: (idolId: string, slots: Omit<WorkScheduleSlot, 'id' | 'idolId'>[]) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { day: 1, label: 'Thứ Hai', short: 'T2' },
  { day: 2, label: 'Thứ Ba', short: 'T3' },
  { day: 3, label: 'Thứ Tư', short: 'T4' },
  { day: 4, label: 'Thứ Năm', short: 'T5' },
  { day: 5, label: 'Thứ Sáu', short: 'T6' },
  { day: 6, label: 'Thứ Bảy', short: 'T7' },
  { day: 7, label: 'Chủ Nhật', short: 'CN' }
];

const SHIFT_CONFIG: Record<
  ShiftType,
  { label: string; icon: any; colorBg: string; colorBorder: string; colorText: string; defaultStart: string; defaultEnd: string }
> = {
  morning: {
    label: 'Ca Sáng',
    icon: Sun,
    colorBg: 'bg-amber-50',
    colorBorder: 'border-amber-200',
    colorText: 'text-amber-800',
    defaultStart: '09:00',
    defaultEnd: '12:00'
  },
  afternoon: {
    label: 'Ca Chiều',
    icon: Sunset,
    colorBg: 'bg-sky-50',
    colorBorder: 'border-sky-200',
    colorText: 'text-sky-800',
    defaultStart: '14:00',
    defaultEnd: '18:00'
  },
  evening: {
    label: 'Ca Tối',
    icon: Moon,
    colorBg: 'bg-indigo-50',
    colorBorder: 'border-indigo-200',
    colorText: 'text-indigo-800',
    defaultStart: '19:30',
    defaultEnd: '23:30'
  },
  custom: {
    label: 'Khung Giờ Tùy Chỉnh',
    icon: Sliders,
    colorBg: 'bg-rose-50',
    colorBorder: 'border-rose-200',
    colorText: 'text-rose-800',
    defaultStart: '21:00',
    defaultEnd: '01:00'
  }
};

const POPULAR_PLATFORMS = [
  'TikTok Live',
  'Bigo Live',
  'Shopee Live',
  'Facebook Live',
  'Studio Agency 1',
  'Studio Agency 2',
  'Tại Nhà / Phòng Riêng'
];

const timeToMinutes = (time?: string) => {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER;
  return hours * 60 + minutes;
};

const compareScheduleSlots = (a: WorkScheduleSlot, b: WorkScheduleSlot) => {
  const dayOrder = a.dayOfWeek - b.dayOfWeek;
  if (dayOrder !== 0) return dayOrder;

  const startOrder = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  if (startOrder !== 0) return startOrder;

  const endOrder = timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
  if (endOrder !== 0) return endOrder;

  return (a.title || '').localeCompare(b.title || '', 'vi');
};

export const WorkScheduleView: React.FC<WorkScheduleViewProps> = ({
  idols,
  departments,
  schedules,
  workAssignments = [],
  currentUser,
  referenceDate,
  initialSelectedIdolId,
  onSaveSchedule,
  onDeleteSchedule,
  onBatchSetSchedules
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'per_idol'>('matrix');
  const [selectedIdolFilter, setSelectedIdolFilter] = useState<string>(initialSelectedIdolId || 'all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedRepeatFilter, setSelectedRepeatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const referenceBaseDate = useMemo(() => {
    const value = getTodayIsoDate(referenceDate);
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [referenceDate, getTodayIsoDate(referenceDate)]);

  const periodLabel = `${String(referenceBaseDate.getMonth() + 1).padStart(2, '0')}/${referenceBaseDate.getFullYear()}`;
  const weekStartDate = useMemo(() => {
    const day = referenceBaseDate.getDay() || 7;
    const monday = new Date(referenceBaseDate);
    monday.setDate(referenceBaseDate.getDate() - day + 1);
    return monday;
  }, [referenceBaseDate]);
  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.reduce<Record<number, string>>((result, dayItem, index) => {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + index);
      result[dayItem.day] = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      return result;
    }, {});
  }, [weekStartDate]);

  const getOccurrenceDate = (slot: WorkScheduleSlot, day: number): string | undefined => {
    const occurrence = new Date(weekStartDate);
    occurrence.setDate(weekStartDate.getDate() + day - 1);
    const weekOccurrenceDate = `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, '0')}-${String(occurrence.getDate()).padStart(2, '0')}`;
    if (slot.repeatType === 'specific_date') return slot.specificDate === weekOccurrenceDate ? slot.specificDate : undefined;
    if (slot.repeatType === 'fixed_month' && slot.specificMonth) {
      const month = `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, '0')}`;
      if (month !== slot.specificMonth) return undefined;
    }
    return weekOccurrenceDate;
  };

  const isSlotVisibleForDay = (slot: WorkScheduleSlot, idol: Idol, day: number) => {
    const occurrenceDate = getOccurrenceDate(slot, day);
    if (!occurrenceDate || !isIsoDateWithinPersonnelPeriod(occurrenceDate, idol.joinDate, idol.resignedDate)) return false;
    const overridden = workAssignments.some((assignment) => {
      const assigned = assignment.assignees.some((assignee) => assignee.personnelId === idol.id && assignee.responseStatus !== 'declined');
      if (!assigned || assignment.status === 'cancelled') return false;
      const startDate = assignment.startAt?.slice(0, 10);
      const endDate = assignment.endAt?.slice(0, 10);
      const inAssignment = Boolean(startDate && endDate && occurrenceDate >= startDate && occurrenceDate <= endDate);
      return inAssignment || assignment.assignees.some((assignee) => assignee.personnelId === idol.id && assignee.restDayDate === occurrenceDate);
    });
    return !overridden;
  };

  const getScheduleScopeLabel = (slot: WorkScheduleSlot) => {
    if (slot.repeatType === 'specific_date' && slot.specificDate) {
      const date = new Date(`${slot.specificDate}T00:00:00`);
      return `Ngày ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
    if (slot.repeatType === 'fixed_month' && slot.specificMonth) {
      const [year, month] = slot.specificMonth.split('-');
      return `Tháng ${month}/${year}`;
    }
    return 'Lặp hàng tuần · Cả năm';
  };

  // Sync initialSelectedIdolId if passed from outside
  useEffect(() => {
    if (initialSelectedIdolId) {
      setSelectedIdolFilter(initialSelectedIdolId);
      setViewMode('per_idol');
    }
  }, [initialSelectedIdolId]);

  // Modal create/edit single schedule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<WorkScheduleSlot> | null>(null);
  const [selectedIdolIds, setSelectedIdolIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Recurring Schedule Setup Modal State
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState<{
    idolId: string;
    applyToDepartment: boolean;
    departmentName: string;
    repeatType: ScheduleRepeatType;
    specificMonth: string;
    specificDate: string;
    selectedDays: number[];
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    platform: string;
    title: string;
    notes: string;
    activityCode: string;
    overwriteExisting: boolean;
  }>({
    idolId: '',
    applyToDepartment: false,
    departmentName: '',
    repeatType: 'fixed_year',
    specificMonth: getTodayIsoDate().slice(0, 7),
    specificDate: getTodayIsoDate(),
    selectedDays: [1, 3, 5],
    shiftType: 'evening',
    startTime: '19:30',
    endTime: '23:00',
    platform: 'TikTok Live',
    title: 'Ca Live Stream Giao Lưu & PK',
    notes: '',
    activityCode: '',
    overwriteExisting: false
  });
  const [recurringSuccessMsg, setRecurringSuccessMsg] = useState<string | null>(null);
  const [recurringErrorMsg, setRecurringErrorMsg] = useState<string | null>(null);
  const [recurringSubmitting, setRecurringSubmitting] = useState(false);

  // Clear all schedules for an idol state
  const [idolToClearSchedule, setIdolToClearSchedule] = useState<Idol | null>(null);
  const [clearingSchedule, setClearingSchedule] = useState(false);

  // Delete confirm for single slot
  const [slotToDelete, setSlotToDelete] = useState<WorkScheduleSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageSchedule =
    currentUser?.isSuperAdmin ||
    currentUser?.allowedActions?.includes('manage_schedule') ||
    currentUser?.allowedActions?.includes('manage_tasks') ||
    currentUser?.allowedActions?.includes('manage_idols');

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((slot) => {
      const targetIdol = idols.find((i) => i.id === slot.idolId);
      if (!targetIdol) return false;
      if (slot.repeatType === 'specific_date' && !isScheduleAllowedForPersonnel(slot, targetIdol)) return false;

      // Filter by Idol
      if (selectedIdolFilter !== 'all' && slot.idolId !== selectedIdolFilter) return false;

      // Filter by Shift Type
      if (selectedShiftFilter !== 'all' && slot.shiftType !== selectedShiftFilter) return false;

      // Filter by Department
      if (selectedDeptFilter !== 'all' && targetIdol.department !== selectedDeptFilter) return false;

      // Filter by Repeat Type
      if (selectedRepeatFilter !== 'all') {
        const slotRepeat = slot.repeatType || 'fixed_year';
        if (slotRepeat !== selectedRepeatFilter) return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = targetIdol.stageName.toLowerCase().includes(q) || targetIdol.realName.toLowerCase().includes(q);
        const matchTitle = slot.title.toLowerCase().includes(q);
        const matchPlatform = slot.platform.toLowerCase().includes(q);
        const matchNotes = (slot.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchPlatform && !matchNotes) return false;
      }

      return true;
    }).sort(compareScheduleSlots);
  }, [schedules, idols, selectedIdolFilter, selectedShiftFilter, selectedDeptFilter, selectedRepeatFilter, searchQuery]);

  // Quick stats
  const stats = useMemo(() => {
    const visibleSchedules = filteredSchedules;
    const total = visibleSchedules.length;
    const morningCount = visibleSchedules.filter((s) => s.shiftType === 'morning').length;
    const afternoonCount = visibleSchedules.filter((s) => s.shiftType === 'afternoon').length;
    const eveningCount = visibleSchedules.filter((s) => s.shiftType === 'evening').length;
    const customCount = visibleSchedules.filter((s) => s.shiftType === 'custom').length;
    const activeIdolsCount = new Set(visibleSchedules.map((s) => s.idolId)).size;

    return { total, morningCount, afternoonCount, eveningCount, customCount, activeIdolsCount };
  }, [filteredSchedules]);

  // Open modal to create single slot
  const handleOpenAdd = (defaultIdolId?: string, defaultDay?: number) => {
    const targetIdolId = defaultIdolId || (idols.length > 0 ? idols[0].id : '');
    setEditingSchedule({
      idolId: targetIdolId,
      dayOfWeek: defaultDay || 1,
      shiftType: 'evening',
      startTime: '19:30',
      endTime: '23:00',
      platform: 'TikTok Live',
      title: 'Live Stream Giao Lưu & PK',
      notes: '',
      isActive: true,
      repeatType: 'fixed_year'
    });
    setSelectedIdolIds(targetIdolId ? [targetIdolId] : []);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal to edit single slot
  const handleOpenEdit = (slot: WorkScheduleSlot) => {
    setEditingSchedule({ ...slot, repeatType: slot.repeatType || 'fixed_year' });
    setSelectedIdolIds(slot.idolId ? [slot.idolId] : []);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open recurring batch setup modal
  const handleOpenRecurringModal = (defaultIdolId?: string) => {
    const targetIdolId = defaultIdolId || (selectedIdolFilter !== 'all' ? selectedIdolFilter : idols[0]?.id || '');
    const idolObj = idols.find(i => i.id === targetIdolId);
    setRecurringForm({
      idolId: targetIdolId,
      applyToDepartment: false,
      departmentName: idolObj?.department || departments[0] || '',
      repeatType: 'fixed_year',
      specificMonth: getTodayIsoDate().slice(0, 7),
      specificDate: getTodayIsoDate(),
      selectedDays: [1, 3, 5],
      shiftType: 'evening',
      startTime: '19:30',
      endTime: '23:00',
      platform: 'TikTok Live',
      title: 'Ca Live Stream Giao Lưu & PK',
      notes: '',
      activityCode: '',
      overwriteExisting: false
    });
    setRecurringErrorMsg(null);
    setRecurringSuccessMsg(null);
    setIsRecurringModalOpen(true);
  };

  // Submit recurring schedule batch
  const handleSubmitRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.applyToDepartment && !recurringForm.idolId) {
      setRecurringErrorMsg('Vui lòng chọn nhân sự / idol.');
      return;
    }
    if (recurringForm.repeatType !== 'specific_date' && recurringForm.selectedDays.length === 0) {
      setRecurringErrorMsg('Vui lòng chọn ít nhất 1 ngày làm việc trong tuần.');
      return;
    }
    if (!recurringForm.startTime || !recurringForm.endTime) {
      setRecurringErrorMsg('Vui lòng nhập giờ bắt đầu và kết thúc.');
      return;
    }

    try {
      setRecurringSubmitting(true);
      setRecurringErrorMsg(null);

      const targetIdolIds = recurringForm.applyToDepartment
        ? idols.filter(i => i.department === recurringForm.departmentName).map(i => i.id)
        : [recurringForm.idolId];

      if (targetIdolIds.length === 0) {
        setRecurringErrorMsg('Không có nhân sự nào trong đơn vị này.');
        return;
      }

      let totalCreated = 0;

      for (const idolId of targetIdolIds) {
        const targetIdol = idols.find((idol) => idol.id === idolId);
        if (!targetIdol) continue;
        if (recurringForm.repeatType === 'specific_date' && !isIsoDateWithinPersonnelPeriod(recurringForm.specificDate, targetIdol.joinDate, targetIdol.resignedDate)) {
          setRecurringErrorMsg(`Ngày lịch phải nằm trong thời gian làm việc của ${targetIdol.stageName}.`);
          return;
        }
        if (targetIdol.resignedDate && recurringForm.repeatType !== 'specific_date') {
          setRecurringErrorMsg(`${targetIdol.stageName} đã nghỉ việc; không thể tạo lịch lặp mới.`);
          return;
        }
        // If overwrite, remove previous matching slots for this idol
        if (recurringForm.overwriteExisting) {
          const oldSlots = schedules.filter(s => {
            if (s.idolId !== idolId) return false;
            if (recurringForm.repeatType === 'fixed_year') return s.repeatType === 'fixed_year' || !s.repeatType;
            if (recurringForm.repeatType === 'fixed_month') return s.repeatType === 'fixed_month' && s.specificMonth === recurringForm.specificMonth;
            if (recurringForm.repeatType === 'specific_date') return s.repeatType === 'specific_date' && s.specificDate === recurringForm.specificDate;
            return false;
          });
          if (oldSlots.length > 0 && !await confirmDialog('Các lịch cũ phù hợp sẽ bị xóa trước khi thiết lập lịch mới. Bạn có muốn tiếp tục?', 'Xác nhận ghi đè lịch')) return;
          for (const old of oldSlots) {
            await onDeleteSchedule(old.id, true);
          }
        }

        if (recurringForm.repeatType === 'specific_date') {
          const dObj = new Date(recurringForm.specificDate);
          const jsDay = dObj.getDay();
          const dayOfWeek = jsDay === 0 ? 7 : jsDay;

          await onSaveSchedule({
            idolId,
            dayOfWeek,
            shiftType: recurringForm.shiftType,
            startTime: recurringForm.startTime,
            endTime: recurringForm.endTime,
            platform: recurringForm.platform,
            title: recurringForm.title,
            notes: recurringForm.notes,
            activityCode: recurringForm.activityCode || undefined,
            isActive: true,
            repeatType: 'specific_date',
            specificDate: recurringForm.specificDate
          });
          totalCreated += 1;
        } else {
          for (const day of recurringForm.selectedDays) {
            await onSaveSchedule({
              idolId,
              dayOfWeek: day,
              shiftType: recurringForm.shiftType,
              startTime: recurringForm.startTime,
              endTime: recurringForm.endTime,
              platform: recurringForm.platform,
              title: recurringForm.title,
              notes: recurringForm.notes,
              activityCode: recurringForm.activityCode || undefined,
              isActive: true,
              repeatType: recurringForm.repeatType,
              specificMonth: recurringForm.repeatType === 'fixed_month' ? recurringForm.specificMonth : undefined
            });
            totalCreated += 1;
          }
        }
      }

      // If single idol, set filter to that idol and go to per_idol view
      if (!recurringForm.applyToDepartment) {
        setSelectedIdolFilter(recurringForm.idolId);
        setViewMode('per_idol');
      }

      setRecurringSuccessMsg(`Thiết lập thành công ${totalCreated} ca làm việc!`);
      setTimeout(() => {
        setIsRecurringModalOpen(false);
      }, 900);
    } catch (err: any) {
      setRecurringErrorMsg(err.message || 'Lỗi khi lưu thiết lập lịch.');
    } finally {
      setRecurringSubmitting(false);
    }
  };

  // Clear all schedules for an idol handler
  const handleConfirmClearIdolSchedule = async () => {
    if (!idolToClearSchedule) return;
    if (!await confirmDialog(`Bạn có chắc muốn xóa toàn bộ lịch của ${idolToClearSchedule.stageName}?`, 'Xác nhận xóa lịch')) return;
    try {
      setClearingSchedule(true);
      const idolSlots = schedules.filter(s => s.idolId === idolToClearSchedule.id);
      for (const slot of idolSlots) {
        await onDeleteSchedule(slot.id, true);
      }
      setIdolToClearSchedule(null);
    } catch (err) {
      console.error('Lỗi khi xóa lịch idol:', err);
    } finally {
      setClearingSchedule(false);
    }
  };

  // Save single slot handler
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIdolIds = editingSchedule?.id ? [editingSchedule.idolId].filter(Boolean) : selectedIdolIds;
    if (!editingSchedule || targetIdolIds.length === 0) {
      setModalError('Vui lòng chọn ít nhất 1 nhân sự / nghệ sĩ.');
      return;
    }
    if (!editingSchedule.startTime || !editingSchedule.endTime) {
      setModalError('Vui lòng nhập giờ bắt đầu và giờ kết thúc.');
      return;
    }
    const targetIdol = idols.find((idol) => idol.id === targetIdolIds[0]);
    if (targetIdol && editingSchedule.repeatType === 'specific_date' && editingSchedule.specificDate && !isIsoDateWithinPersonnelPeriod(editingSchedule.specificDate, targetIdol.joinDate, targetIdol.resignedDate)) {
      setModalError(`Ngày lịch phải nằm trong thời gian làm việc của ${targetIdol.stageName}.`);
      return;
    }
    if (targetIdol?.resignedDate && editingSchedule.repeatType !== 'specific_date') {
      setModalError(`${targetIdol.stageName} đã nghỉ việc; không thể tạo lịch lặp mới.`);
      return;
    }

    try {
      setSaving(true);
      setModalError(null);
      for (const idolId of targetIdolIds) {
        await onSaveSchedule({ ...editingSchedule, idolId });
      }
      setIsModalOpen(false);
      setEditingSchedule(null);
    } catch (err: any) {
      setModalError(err.message || 'Lỗi khi lưu lịch làm việc.');
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!slotToDelete) return;
    if (!await confirmDialog('Bạn có chắc muốn xóa ca/lịch này?', 'Xác nhận xóa lịch')) return;
    try {
      setIsDeleting(true);
      await onDeleteSchedule(slotToDelete.id, true);
      setSlotToDelete(null);
    } catch (err) {
      console.error('Lỗi khi xóa ca làm việc:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Per-idol selected detail
  const currentPerIdol = useMemo(() => {
    if (selectedIdolFilter === 'all') {
      return idols[0] || null;
    }
    return idols.find((i) => i.id === selectedIdolFilter) || idols[0] || null;
  }, [idols, selectedIdolFilter]);

  const perIdolSchedules = useMemo(() => {
    if (!currentPerIdol) return [];
    return schedules.filter((s) => s.idolId === currentPerIdol.id && isSlotVisibleForDay(s, currentPerIdol, s.dayOfWeek)).sort(compareScheduleSlots);
  }, [schedules, currentPerIdol, weekStartDate]);

  const selectedScheduleActivities = useMemo(() => {
    const selected = idols.filter((idol) => selectedIdolIds.includes(idol.id));
    if (selected.length === 0) return [];
    const first = selected[0].activities || [];
    return first.filter((activity) => selected.every((idol) => (idol.activities || []).some((item) => item.code === activity.code)));
  }, [idols, selectedIdolIds]);

  const recurringScheduleActivities = useMemo(() => {
    const selected = recurringForm.applyToDepartment
      ? idols.filter((idol) => idol.department === recurringForm.departmentName)
      : idols.filter((idol) => idol.id === recurringForm.idolId);
    if (selected.length === 0) return [];
    const first = selected[0].activities || [];
    return first.filter((activity) => selected.every((idol) => (idol.activities || []).some((item) => item.code === activity.code)));
  }, [idols, recurringForm.applyToDepartment, recurringForm.departmentName, recurringForm.idolId]);

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">Lịch Làm Việc & Live Stream Nhân Viên</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                  Shift Scheduler
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập khung giờ linh hoạt theo từng nhân viên / nhân sự (cố định cả năm, cả tháng, hoặc ngày cụ thể).
              </p>
               <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                 <CalendarDays className="w-3 h-3" />
                 <span>Tuần hiển thị: {periodLabel} · ngày {weekDates[1]}–{weekDates[7]}</span>
               </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[70px]">
              <div className="text-[10px] font-medium text-amber-700">Ca Sáng</div>
              <div className="text-sm font-extrabold text-amber-900">{stats.morningCount}</div>
            </div>
            <div className="px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-center min-w-[70px]">
              <div className="text-[10px] font-medium text-sky-700">Ca Chiều</div>
              <div className="text-sm font-extrabold text-sky-900">{stats.afternoonCount}</div>
            </div>
            <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center min-w-[70px]">
              <div className="text-[10px] font-medium text-indigo-700">Ca Tối</div>
              <div className="text-sm font-extrabold text-indigo-900">{stats.eveningCount}</div>
            </div>
            <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-center min-w-[70px]">
              <div className="text-[10px] font-medium text-rose-700">Tùy Chỉnh</div>
              <div className="text-sm font-extrabold text-rose-900">{stats.customCount}</div>
            </div>

            {canManageSchedule && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenRecurringModal(selectedIdolFilter !== 'all' ? selectedIdolFilter : undefined)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                  title="Thiết lập lịch cố định cả năm, cả tháng hoặc ngày cụ thể cho từng idol hoặc toàn bộ team"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-rose-600" />
                  <span>⚡ Lịch Định Kỳ (Năm/Tháng/Ngày)</span>
                </button>
                <button
                  onClick={() => handleOpenAdd(selectedIdolFilter !== 'all' ? selectedIdolFilter : undefined)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thiết Lập Ca Mới</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Ma Trận Tuần (Weekly Matrix)</span>
            </button>
            <button
              onClick={() => setViewMode('per_idol')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'per_idol' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Lịch Chi Tiết Từng Người</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm idol, ca live, nền tảng..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white w-40 sm:w-48"
              />
            </div>

            {/* Filter by Repeat Type */}
            <select
              value={selectedRepeatFilter}
              onChange={(e) => setSelectedRepeatFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Mọi loại lịch (Năm / Tháng / Ngày)</option>
              <option value="fixed_year">🗓️ Cố định cả năm</option>
              <option value="fixed_month">📅 Cố định theo tháng</option>
              <option value="specific_date">📌 Ngày cụ thể</option>
            </select>

            {/* Filter by Idol */}
            <SearchableSelect value={selectedIdolFilter} onChange={setSelectedIdolFilter} ariaLabel="Tìm và lọc theo Idol" placeholder="Tất cả Idol" searchPlaceholder="Nhập tên Idol..." className="w-52" options={[{ value: 'all', label: `Tất cả Idol (${idols.length})` }, ...idols.map((i) => ({ value: i.id, label: `${i.stageName} (${i.department})`, keywords: `${i.realName} ${i.role}` }))]} />

            {/* Filter by Shift Type */}
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả các ca</option>
              <option value="morning">🌅 Ca Sáng (Sáng)</option>
              <option value="afternoon">☀️ Ca Chiều (Chiều)</option>
              <option value="evening">🌙 Ca Tối (Tối)</option>
              <option value="custom">⚙️ Khung Giờ Tùy Chỉnh</option>
            </select>

            {/* Filter by Department */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả đơn vị</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: WEEKLY MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
            {DAYS_OF_WEEK.map((dayItem) => {
              const daySlots = filteredSchedules.filter((s) => {
                const targetIdol = idols.find((i) => i.id === s.idolId);
                return s.dayOfWeek === dayItem.day && Boolean(targetIdol && isSlotVisibleForDay(s, targetIdol, dayItem.day));
              });
              return (
                <div key={dayItem.day} className="flex flex-col min-h-[480px] bg-slate-50/30">
                  {/* Day Header */}
                  <div className="p-3 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                       <span className="font-bold text-xs text-slate-900">{dayItem.label}</span>
                       <span className="text-[10px] text-indigo-600 font-mono ml-1.5">{weekDates[dayItem.day]}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-1.5">({daySlots.length} ca)</span>
                    </div>
                    {canManageSchedule && (
                      <button
                        onClick={() => handleOpenAdd(selectedIdolFilter !== 'all' ? selectedIdolFilter : undefined, dayItem.day)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                        title={`Thêm ca cho ${dayItem.label}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day Content */}
                  <div className="p-2 space-y-2.5 flex-1 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-slate-400 italic">
                        Trống lịch
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const targetIdol = idols.find((i) => i.id === slot.idolId);
                        if (!targetIdol) return null;
                        const shiftInfo = SHIFT_CONFIG[slot.shiftType];
                        const Icon = shiftInfo.icon;

                        return (
                          <div
                            key={slot.id}
                            className={`p-2.5 rounded-xl border ${shiftInfo.colorBorder} ${shiftInfo.colorBg} shadow-2xs transition-all hover:shadow-xs group`}
                          >
                            {/* Personnel identity */}
                            <div className="flex items-start gap-1.5 min-w-0 mb-1.5">
                                <img
                                  src={targetIdol.avatarUrl}
                                  alt={targetIdol.stageName}
                                  className="w-5 h-5 rounded-full object-cover border border-white shrink-0 shadow-2xs"
                                />
                                <div className="min-w-0 leading-tight">
                                  <div
                                    className="font-bold text-xs text-slate-900 truncate"
                                    title={`${targetIdol.stageName} (${targetIdol.realName})`}
                                  >
                                    {targetIdol.stageName}
                                  </div>
                                  <div
                                    className="text-[9px] text-slate-500 truncate mt-0.5"
                                    title={`${targetIdol.realName} · ${targetIdol.department}`}
                                  >
                                    {targetIdol.realName} · {targetIdol.department}
                                  </div>
                                </div>
                            </div>

                            {/* Schedule scope & shift badges */}
                            <div className="flex items-center gap-1 flex-wrap mb-1.5">
                                {slot.repeatType === 'fixed_year' && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200" title="Lịch cố định cả năm">
                                    Cả năm
                                  </span>
                                )}
                                {slot.repeatType === 'fixed_month' && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200" title={`Cố định tháng ${slot.specificMonth || ''}`}>
                                    T{slot.specificMonth?.split('-')[1] || ''}
                                  </span>
                                )}
                                {slot.repeatType === 'specific_date' && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300" title={`Ngày ${slot.specificDate || ''}`}>
                                    {slot.specificDate ? formatDateVN(slot.specificDate) : 'Ngày'}
                                  </span>
                                )}
                               <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-white/80 text-slate-600 border border-slate-200 truncate max-w-[120px]" title={getScheduleScopeLabel(slot)}>
                                 {getScheduleScopeLabel(slot)}
                               </span>
                               <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${shiftInfo.colorText} bg-white/80 border ${shiftInfo.colorBorder} flex items-center gap-1 shrink-0`}
                                >
                                  <Icon className="w-2.5 h-2.5" />
                                  <span>{shiftInfo.label}</span>
                                </span>
                            </div>

                             <div className="text-[10px] font-semibold text-slate-600 mb-1.5">
                               {getScheduleScopeLabel(slot)} · {dayItem.label} {weekDates[dayItem.day]}
                             </div>

                             {/* Time Slot */}
                            <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-800 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/60 mb-1.5">
                              <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{slot.startTime}</span>
                              <span className="text-slate-400">→</span>
                              <span>{slot.endTime}</span>
                            </div>

                            {/* Platform & Title */}
                            <div className="space-y-0.5 text-[11px]">
                              <div className="flex items-center gap-1 text-indigo-700 font-semibold truncate">
                                <Tv className="w-3 h-3 shrink-0" />
                                <span className="truncate">{slot.platform}</span>
                              </div>
                              <div className="text-slate-700 font-medium truncate" title={slot.title}>
                                {slot.title}
                              </div>
                              {slot.notes && (
                                <div className="text-[10px] text-slate-500 italic truncate" title={slot.notes}>
                                  Lưu ý: {slot.notes}
                                </div>
                              )}
                            </div>

                            {/* Actions for managers */}
                            {canManageSchedule && (
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenEdit(slot)}
                                  className="p-1 text-slate-500 hover:text-sky-700 hover:bg-white rounded transition-colors"
                                  title="Chỉnh sửa ca này"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setSlotToDelete(slot)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-white rounded transition-colors"
                                  title="Xóa ca này"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: PER-IDOL DETAIL VIEW */}
      {viewMode === 'per_idol' && currentPerIdol && (
        <div className="space-y-5">
          {/* Idol Selector Cards Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={currentPerIdol.avatarUrl}
                  alt={currentPerIdol.stageName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-300 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900">{currentPerIdol.stageName}</h2>
                    <span className="text-xs text-slate-400">({currentPerIdol.realName})</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {currentPerIdol.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {currentPerIdol.role} · <strong className="text-slate-700">{currentPerIdol.department}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                    <span>Tổng số ca: <strong className="text-rose-600 font-bold">{perIdolSchedules.length} ca</strong></span>
                    <span>·</span>
                    <span>Nơi ở: {currentPerIdol.currentLiving}</span>
                  </div>
                </div>
              </div>

              {/* Idol Picker Dropdown & Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <SearchableSelect value={currentPerIdol.id} onChange={setSelectedIdolFilter} ariaLabel="Tìm và chọn Idol xem lịch" searchPlaceholder="Nhập tên Idol..." className="w-64" options={idols.map((i) => ({ value: i.id, label: `${i.stageName} (${i.department})`, keywords: `${i.realName} ${i.role}` }))} />

                {canManageSchedule && (
                  <>
                    <button
                      onClick={() => handleOpenRecurringModal(currentPerIdol.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                      title={`Thiết lập lịch cố định cả năm, cả tháng hoặc ngày cụ thể cho ${currentPerIdol.stageName}`}
                    >
                      <CalendarRange className="w-3.5 h-3.5 text-rose-600" />
                      <span>⚡ Lịch Định Kỳ</span>
                    </button>
                    <button
                      onClick={() => handleOpenAdd(currentPerIdol.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Ca</span>
                    </button>
                    {perIdolSchedules.length > 0 && (
                      <button
                        onClick={() => setIdolToClearSchedule(currentPerIdol)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                        title={`Xóa tất cả ca làm việc của ${currentPerIdol.stageName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Lịch</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 7-Days Timeline for this Idol */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((dayItem) => {
              const idolDaySlots = perIdolSchedules.filter((s) => s.dayOfWeek === dayItem.day);
              return (
                <div
                  key={dayItem.day}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col min-h-[300px]"
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                     <div>
                       <div className="font-bold text-xs text-slate-900">{dayItem.label}</div>
                       <div className="text-[10px] text-indigo-600 font-mono">{dayItem.short} · {weekDates[dayItem.day]}</div>
                    </div>
                    {canManageSchedule && (
                      <button
                        onClick={() => handleOpenAdd(currentPerIdol.id, dayItem.day)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                        title="Thêm ca"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 space-y-2 flex-1 overflow-y-auto">
                    {idolDaySlots.length === 0 ? (
                      <div className="py-12 text-center text-[11px] text-slate-400 italic">
                        Nghỉ ngơi / Không có ca
                      </div>
                    ) : (
                      idolDaySlots.map((slot) => {
                        const shiftInfo = SHIFT_CONFIG[slot.shiftType];
                        const Icon = shiftInfo.icon;

                        return (
                          <div
                            key={slot.id}
                            className={`p-2.5 rounded-xl border ${shiftInfo.colorBorder} ${shiftInfo.colorBg} text-xs space-y-1.5`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {slot.repeatType === 'fixed_year' && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200" title="Lịch cố định cả năm">
                                    Cả năm
                                  </span>
                                )}
                                {slot.repeatType === 'fixed_month' && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200" title={`Cố định tháng ${slot.specificMonth || ''}`}>
                                    T{slot.specificMonth?.split('-')[1] || ''}
                                  </span>
                                )}
                                {slot.repeatType === 'specific_date' && (
                                  <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300" title={`Ngày ${slot.specificDate || ''}`}>
                                    {slot.specificDate ? formatDateVN(slot.specificDate) : 'Ngày'}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${shiftInfo.colorText} bg-white border ${shiftInfo.colorBorder} flex items-center gap-1`}
                                >
                                  <Icon className="w-2.5 h-2.5" />
                                  <span>{shiftInfo.label}</span>
                                </span>
                              </div>

                              {canManageSchedule && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEdit(slot)}
                                    className="p-0.5 text-slate-400 hover:text-sky-600"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setSlotToDelete(slot)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                             <div className="text-[10px] font-semibold text-slate-600">{getScheduleScopeLabel(slot)} · {dayItem.label} {weekDates[dayItem.day]}</div>

                             <div className="font-mono font-bold text-slate-800 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3 text-rose-500" />
                              <span>{slot.startTime} - {slot.endTime}</span>
                            </div>

                            <div className="text-[11px] font-semibold text-indigo-700 truncate">
                              {slot.platform}
                            </div>
                            <div className="text-[11px] text-slate-800 font-medium leading-tight">
                              {slot.title}
                            </div>
                            {slot.notes && (
                              <div className="text-[10px] text-slate-500 italic">
                                Ghi chú: {slot.notes}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: THIẾT LẬP CA LÀM VIỆC / LIVE STREAM */}
      {isModalOpen && editingSchedule && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingSchedule.id ? 'Chỉnh Sửa Ca Làm Việc' : 'Thiết Lập Ca Live Stream Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Tùy biến ca sáng, chiều, tối hoặc khung giờ tự do</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4 px-6 pb-6 pt-4 overflow-y-auto min-h-0">
              {/* Idol Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Nhân Viên / Nghệ Sĩ <span className="text-rose-500">*</span>
                </label>
                {editingSchedule.id ? (
                  <SearchableSelect value={editingSchedule.idolId || ''} onChange={(idolId) => { setEditingSchedule({ ...editingSchedule, idolId }); setSelectedIdolIds(idolId ? [idolId] : []); }} ariaLabel="Tìm và chọn nhân viên hoặc nghệ sĩ" searchPlaceholder="Nhập tên hoặc nghệ danh..." className="w-full" options={idols.map((i) => ({ value: i.id, label: `${i.stageName} (${i.realName}) - ${i.department}`, keywords: i.role }))} />
                ) : (
                  <>
                    <select
                      multiple
                      size={Math.min(6, Math.max(3, idols.length))}
                      value={selectedIdolIds}
                      onChange={(e) => {
                        const ids = Array.from(e.target.selectedOptions, (option) => option.value);
                        setSelectedIdolIds(ids);
                        setEditingSchedule({ ...editingSchedule, idolId: ids[0] || '' });
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-semibold"
                      required
                    >
                      {idols.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.stageName} ({i.realName}) - {i.department}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Giữ Ctrl/Cmd để chọn nhiều nhân sự. Lịch giống nhau sẽ được tạo cho tất cả người được chọn ({selectedIdolIds.length}).
                    </p>
                  </>
                )}
              </div>

              {selectedScheduleActivities.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hoạt động KPI của ca
                  </label>
                  <select
                    value={editingSchedule.activityCode || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, activityCode: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-semibold"
                  >
                    <option value="">Không gắn hoạt động</option>
                    {selectedScheduleActivities.map((activity) => (
                      <option key={activity.code} value={activity.code}>
                        {activity.name}{activity.isPrimary ? ' (Chính)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Ca này sẽ được phân loại theo hoạt động đã chọn khi tổng hợp KPI.
                  </p>
                </div>
              )}

              {/* Scope / Repeat type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chu Kỳ / Phạm Vi Lịch Làm Việc
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSchedule({ ...editingSchedule, repeatType: 'fixed_year' })}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editingSchedule.repeatType === 'fixed_year'
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="text-xs">🗓️ Cả Năm</div>
                    <div className="text-[10px] text-slate-500">Cố định hàng tuần</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingSchedule({ ...editingSchedule, repeatType: 'fixed_month', specificMonth: editingSchedule.specificMonth || new Date().toISOString().slice(0, 7) })}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editingSchedule.repeatType === 'fixed_month'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="text-xs">📅 Cả Tháng</div>
                    <div className="text-[10px] text-slate-500">Cố định 1 tháng</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingSchedule({ ...editingSchedule, repeatType: 'specific_date', specificDate: editingSchedule.specificDate || getTodayIsoDate() })}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editingSchedule.repeatType === 'specific_date'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="text-xs">📌 Ngày Cụ Thể</div>
                    <div className="text-[10px] text-slate-500">Chỉ đúng 1 ngày</div>
                  </button>
                </div>

                {editingSchedule.repeatType === 'fixed_month' && (
                  <div className="mt-2 flex items-center gap-2 bg-rose-50/50 p-2 rounded-lg border border-rose-200/60">
                    <label className="text-xs font-semibold text-rose-900 whitespace-nowrap">Tháng áp dụng:</label>
                    <input
                      type="month"
                      value={editingSchedule.specificMonth || getTodayIsoDate().slice(0, 7)}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, specificMonth: e.target.value })}
                      className="px-2.5 py-1 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono font-bold text-slate-800"
                    />
                  </div>
                )}

                {editingSchedule.repeatType === 'specific_date' && (
                  <div className="mt-2 flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                    <label className="text-xs font-semibold text-amber-900 whitespace-nowrap">Ngày diễn ra:</label>
                    <DateInput
                      value={editingSchedule.specificDate || getTodayIsoDate()}
                      onChange={(dStr) => {
                        if (!dStr) {
                          setEditingSchedule({ ...editingSchedule, specificDate: '' });
                          return;
                        }
                        const jsDay = new Date(`${dStr}T00:00:00`).getDay();
                        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
                        setEditingSchedule({ ...editingSchedule, specificDate: dStr, dayOfWeek });
                      }}
                      className="px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày Trong Tuần <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setEditingSchedule({ ...editingSchedule, dayOfWeek: d.day })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editingSchedule.dayOfWeek === d.day
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loại Ca Làm Việc / Khung Giờ Mẫu
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(SHIFT_CONFIG) as ShiftType[]).map((typeKey) => {
                    const info = SHIFT_CONFIG[typeKey];
                    const Icon = info.icon;
                    const isSelected = editingSchedule.shiftType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => {
                          setEditingSchedule({
                            ...editingSchedule,
                            shiftType: typeKey,
                            startTime: info.defaultStart,
                            endTime: info.defaultEnd
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/50 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                            {info.label.replace('Khung Giờ ', '')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {info.defaultStart} - {info.defaultEnd}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giờ Bắt Đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={editingSchedule.startTime || '19:30'}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giờ Kết Thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={editingSchedule.endTime || '23:00'}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Platform / Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nền Tảng / Địa Điểm Live Stream
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_PLATFORMS.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setEditingSchedule({ ...editingSchedule, platform: plat })}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        editingSchedule.platform === plat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editingSchedule.platform || ''}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, platform: e.target.value })}
                  placeholder="Hoặc nhập nền tảng khác..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu Đề / Nội Dung Ca Live <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingSchedule.title || ''}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, title: e.target.value })}
                  placeholder="VD: Live PK cùng khách mời, Live Hát & Trò chuyện đêm..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú & Chuẩn Bị (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={editingSchedule.notes || ''}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, notes: e.target.value })}
                  placeholder="VD: Chuẩn bị mic Shure, trang phục neon, kịch bản nhãn hàng..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : editingSchedule.id ? 'Cập Nhật Ca' : 'Lưu Ca Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION IN-APP MODAL */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xác Nhận Xóa Ca Làm Việc</h3>
                <p className="text-xs text-slate-500">Xóa ca khỏi lịch trình tuần</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa ca live <strong className="text-slate-900">"{slotToDelete.title}"</strong> ({slotToDelete.startTime} - {slotToDelete.endTime}) trên {slotToDelete.platform}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: THIẾT LẬP LỊCH ĐỊNH KỲ (CẢ NĂM, CẢ THÁNG, HOẶC NGÀY CỤ THỂ) */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Thiết Lập Lịch Làm Việc Định Kỳ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cài đặt lịch cố định cho cả năm, cả tháng hoặc ngày cụ thể cho từng người
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecurringModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            {recurringSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{recurringSuccessMsg}</span>
              </div>
            )}
            {recurringErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recurringErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRecurring} className="space-y-4">
              {/* Target: Single Idol or Entire Department */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Đối Tượng Áp Dụng Lịch</label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurringForm.applyToDepartment}
                      onChange={(e) => setRecurringForm({ ...recurringForm, applyToDepartment: e.target.checked })}
                      className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="font-semibold">Áp dụng cho toàn bộ Đơn vị/Phòng</span>
                  </label>
                </div>

                {!recurringForm.applyToDepartment ? (
                  <div>
                    <select
                      value={recurringForm.idolId}
                      onChange={(e) => setRecurringForm({ ...recurringForm, idolId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                      required
                    >
                      {idols.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.stageName} ({i.realName}) - {i.department}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <select
                      value={recurringForm.departmentName}
                      onChange={(e) => setRecurringForm({ ...recurringForm, departmentName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-rose-700"
                      required
                    >
                      {departments.map((d) => {
                        const count = idols.filter((i) => i.department === d).length;
                        return (
                          <option key={d} value={d}>
                            Toàn bộ đơn vị: {d} ({count} nhân sự)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {recurringScheduleActivities.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hoạt động KPI của lịch định kỳ
                  </label>
                  <select
                    value={recurringForm.activityCode}
                    onChange={(e) => setRecurringForm({ ...recurringForm, activityCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                  >
                    <option value="">Không gắn hoạt động</option>
                    {recurringScheduleActivities.map((activity) => (
                      <option key={activity.code} value={activity.code}>
                        {activity.name}{activity.isPrimary ? ' (Chính)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recurrence Scope: Year, Month, Specific Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chu Kỳ Áp Dụng <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecurringForm({ ...recurringForm, repeatType: 'fixed_year' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      recurringForm.repeatType === 'fixed_year'
                        ? 'border-purple-500 bg-purple-50/80 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🗓️</span>
                      <span className={`text-xs font-bold ${recurringForm.repeatType === 'fixed_year' ? 'text-purple-900' : 'text-slate-800'}`}>
                        Cố Định Cả Năm
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Lịch lặp lại hàng tuần đều đặn suốt cả năm
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecurringForm({ ...recurringForm, repeatType: 'fixed_month' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      recurringForm.repeatType === 'fixed_month'
                        ? 'border-rose-500 bg-rose-50/80 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">📅</span>
                      <span className={`text-xs font-bold ${recurringForm.repeatType === 'fixed_month' ? 'text-rose-900' : 'text-slate-800'}`}>
                        Cố Định Cả Tháng
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Lịch áp dụng cố định cho 1 tháng cụ thể
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecurringForm({ ...recurringForm, repeatType: 'specific_date' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      recurringForm.repeatType === 'specific_date'
                        ? 'border-amber-500 bg-amber-50/80 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">📌</span>
                      <span className={`text-xs font-bold ${recurringForm.repeatType === 'specific_date' ? 'text-amber-900' : 'text-slate-800'}`}>
                        Ngày Cụ Thể
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Chỉ xếp lịch cho đúng 1 ngày cụ thể
                    </p>
                  </button>
                </div>

                {/* Sub-inputs for Month or Date */}
                {recurringForm.repeatType === 'fixed_month' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-rose-900">Chọn Tháng Cần Áp Dụng Lịch</div>
                      <div className="text-[11px] text-rose-700">Các ca sẽ lặp lại vào các thứ đã chọn trong suốt tháng này</div>
                    </div>
                    <input
                      type="month"
                      value={recurringForm.specificMonth}
                      onChange={(e) => setRecurringForm({ ...recurringForm, specificMonth: e.target.value })}
                      className="px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  </div>
                )}

                {recurringForm.repeatType === 'specific_date' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-900">Chọn Ngày Diễn Ra Ca Live / Làm Việc</div>
                      <div className="text-[11px] text-amber-700">Chỉ xếp ca vào đúng ngày này</div>
                    </div>
                    <DateInput
                      value={recurringForm.specificDate}
                      onChange={(specificDate) => setRecurringForm({ ...recurringForm, specificDate })}
                      className="px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Days of Week selection (only for year or month) */}
              {recurringForm.repeatType !== 'specific_date' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Chọn Các Ngày Trong Tuần <span className="text-rose-500">*</span>
                    </label>
                    {/* Quick day presets */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRecurringForm({ ...recurringForm, selectedDays: [1, 2, 3, 4, 5, 6, 7] })}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        Cả tuần
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecurringForm({ ...recurringForm, selectedDays: [1, 2, 3, 4, 5] })}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        T2-T6
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecurringForm({ ...recurringForm, selectedDays: [6, 7] })}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        Cuối tuần
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecurringForm({ ...recurringForm, selectedDays: [1, 3, 5] })}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        2-4-6
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecurringForm({ ...recurringForm, selectedDays: [2, 4, 6] })}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                      >
                        3-5-7
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = recurringForm.selectedDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            const exists = recurringForm.selectedDays.includes(d.day);
                            const updated = exists
                              ? recurringForm.selectedDays.filter((x) => x !== d.day)
                              : [...recurringForm.selectedDays, d.day].sort();
                            setRecurringForm({ ...recurringForm, selectedDays: updated });
                          }}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{d.short}</span>
                          <span className="text-[9px] opacity-80">{isSelected ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shift Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Khung Giờ Ca Làm Việc / Live Stream
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(SHIFT_CONFIG) as ShiftType[]).map((typeKey) => {
                    const info = SHIFT_CONFIG[typeKey];
                    const Icon = info.icon;
                    const isSelected = recurringForm.shiftType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => {
                          setRecurringForm({
                            ...recurringForm,
                            shiftType: typeKey,
                            startTime: info.defaultStart,
                            endTime: info.defaultEnd
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/60 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                            {info.label.replace('Khung Giờ ', '')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {info.defaultStart} - {info.defaultEnd}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giờ Bắt Đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={recurringForm.startTime}
                    onChange={(e) => setRecurringForm({ ...recurringForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giờ Kết Thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={recurringForm.endTime}
                    onChange={(e) => setRecurringForm({ ...recurringForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nền Tảng / Địa Điểm
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_PLATFORMS.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setRecurringForm({ ...recurringForm, platform: plat })}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        recurringForm.platform === plat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={recurringForm.platform}
                  onChange={(e) => setRecurringForm({ ...recurringForm, platform: e.target.value })}
                  placeholder="Hoặc nhập nền tảng khác..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Title & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu Đề Ca Live <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recurringForm.title}
                    onChange={(e) => setRecurringForm({ ...recurringForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi Chú & Chuẩn Bị
                  </label>
                  <input
                    type="text"
                    value={recurringForm.notes}
                    onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })}
                    placeholder="VD: Chuẩn bị trang phục, kịch bản..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Overwrite option */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900">Ghi Đè / Thay Thế Lịch Cũ</div>
                  <div className="text-[11px] text-amber-700">Xóa các ca cũ của đối tượng này trước khi tạo lịch mới</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurringForm.overwriteExisting}
                    onChange={(e) => setRecurringForm({ ...recurringForm, overwriteExisting: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={recurringSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {recurringSubmitting ? (
                    <span>Đang áp dụng lịch...</span>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      <span>Áp Dụng Lịch Làm Việc</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÓA TOÀN BỘ LỊCH CỦA IDOL */}
      {idolToClearSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Xóa Toàn Bộ Lịch Của {idolToClearSchedule.stageName}
                </h3>
                <p className="text-xs text-slate-500">{idolToClearSchedule.realName} - {idolToClearSchedule.department}</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa tất cả các ca làm việc của <strong className="text-slate-900">{idolToClearSchedule.stageName}</strong>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIdolToClearSchedule(null)}
                disabled={clearingSchedule}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearIdolSchedule}
                disabled={clearingSchedule}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {clearingSchedule ? 'Đang xóa...' : 'Xác Nhận Xóa Hết Lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkScheduleView;
