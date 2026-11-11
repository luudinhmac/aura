import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, MapPin, X } from 'lucide-react';
import { Idol, WorkAssignment, WorkAssignmentType } from '../types/index.ts';
import { DateTimeInput } from './DateTimeInput.tsx';

interface WorkAssignmentModalProps {
  idols: Idol[];
  onClose: () => void;
  onSubmit: (data: Partial<WorkAssignment> & { assigneePersonnelIds: string[] }) => Promise<void>;
  assignment?: WorkAssignment;
}

const assignmentTypes: Array<{ value: WorkAssignmentType; label: string }> = [
  { value: 'business_trip', label: 'Đi công tác' },
  { value: 'client_meeting', label: 'Đi gặp đối tác/khách hàng' },
  { value: 'brand_change', label: 'Làm việc đổi nhãn hàng' },
  { value: 'shoot_with_manager', label: 'Quay/đi công việc cùng quản lý' },
  { value: 'event', label: 'Tham dự sự kiện' },
  { value: 'other', label: 'Công việc khác' }
];

export const WorkAssignmentModal: React.FC<WorkAssignmentModalProps> = ({ idols, onClose, onSubmit, assignment }) => {
  const [title, setTitle] = useState(assignment?.title || '');
  const [description, setDescription] = useState(assignment?.description || '');
  const [assignmentType, setAssignmentType] = useState<WorkAssignmentType>((assignment?.assignmentType as WorkAssignmentType) || 'business_trip');
  const [mandatory, setMandatory] = useState(assignment?.mandatory === true);
  const [penaltyType, setPenaltyType] = useState<'none' | 'fixed' | 'percentage'>(assignment?.penaltyType || 'none');
  const [penaltyValue, setPenaltyValue] = useState(assignment?.penaltyValue ? String(assignment.penaltyValue) : '');
  const [startAt, setStartAt] = useState(assignment?.startAt ? assignment.startAt.slice(0, 16) : '');
  const [endAt, setEndAt] = useState(assignment?.endAt ? assignment.endAt.slice(0, 16) : '');
  const [acceptanceDeadline, setAcceptanceDeadline] = useState(assignment?.acceptanceDeadline ? assignment.acceptanceDeadline.slice(0, 16) : '');
  const [location, setLocation] = useState(assignment?.location || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(assignment?.assignees.map((item) => item.personnelId) || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignment) return;
    setTitle(assignment.title);
    setDescription(assignment.description || '');
    setAssignmentType((assignment.assignmentType as WorkAssignmentType) || 'other');
    setMandatory(assignment.mandatory);
    setPenaltyType(assignment.penaltyType || 'none');
    setPenaltyValue(assignment.penaltyValue ? String(assignment.penaltyValue) : '');
    setStartAt(assignment.startAt ? assignment.startAt.slice(0, 16) : '');
    setEndAt(assignment.endAt ? assignment.endAt.slice(0, 16) : '');
    setAcceptanceDeadline(assignment.acceptanceDeadline ? assignment.acceptanceDeadline.slice(0, 16) : '');
    setLocation(assignment.location || '');
    setSelectedIds(assignment.assignees.map((item) => item.personnelId));
  }, [assignment]);

  const activeIdols = useMemo(() => idols.filter((idol) => idol.status !== 'Đã nghỉ việc'), [idols]);
  const canEditAssignees = !assignment || !assignment.startAt || new Date(assignment.startAt).getTime() > Date.now();
  const toggleAssignee = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || selectedIds.length === 0) {
      setError('Cần nhập tiêu đề và chọn ít nhất một nhân sự.');
      return;
    }
    if (mandatory && penaltyType !== 'none' && (!Number.isFinite(Number(penaltyValue)) || Number(penaltyValue) <= 0)) {
      setError('Cần nhập mức phạt lớn hơn 0 cho công việc bắt buộc.');
      return;
    }
    if (startAt && acceptanceDeadline && new Date(acceptanceDeadline) >= new Date(startAt)) {
      setError('Hạn chấp nhận phải trước thời điểm bắt đầu công tác.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        id: assignment?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        assignmentType,
        mandatory,
        penaltyType: mandatory ? penaltyType : 'none',
        penaltyValue: mandatory && penaltyType !== 'none' ? Number(penaltyValue) : 0,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
        acceptanceDeadline: acceptanceDeadline || undefined,
        location: location.trim() || undefined,
        ...(canEditAssignees ? { assigneePersonnelIds: selectedIds } : {})
      } as Partial<WorkAssignment> & { assigneePersonnelIds: string[] });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo phân công công việc.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100"><BriefcaseBusiness className="h-5 w-5 text-sky-600" />{assignment ? 'Chỉnh sửa công tác / công việc' : 'Giao công tác / công việc'}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tạo thông báo công việc cho nhân sự hoặc Idol trong phạm vi quản lý.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[calc(100dvh-9rem)] space-y-4 overflow-y-auto p-5">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Tiêu đề công việc *<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="VD: Đi gặp đối tác nhãn hàng ABC" /></label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Loại công việc<select value={assignmentType} onChange={(event) => setAssignmentType(event.target.value as WorkAssignmentType)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">{assignmentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100"><input type="checkbox" checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} /> Công việc bắt buộc thực hiện</label>
            {mandatory && <div className="sm:col-span-2 grid grid-cols-1 gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-400/30 dark:bg-amber-950/20"><label className="text-xs font-bold text-amber-900 dark:text-amber-100">Mức phạt khi không hoàn thành<select value={penaltyType} onChange={(event) => setPenaltyType(event.target.value as typeof penaltyType)} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-normal dark:border-amber-700 dark:bg-slate-800 dark:text-slate-100"><option value="none">Không phạt, chỉ ghi nhận vi phạm</option><option value="fixed">Số tiền cố định</option><option value="percentage">Phần trăm lương hợp đồng</option></select></label>{penaltyType !== 'none' && <label className="text-xs font-bold text-amber-900 dark:text-amber-100">Mức {penaltyType === 'percentage' ? '(%)' : '(VNĐ)'}<input required type="number" min="0" step="any" value={penaltyValue} onChange={(event) => setPenaltyValue(event.target.value)} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-normal dark:border-amber-700 dark:bg-slate-800 dark:text-slate-100" /></label>}</div>}
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300"><span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Bắt đầu</span><DateTimeInput value={startAt} onChange={setStartAt} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300"><span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Kết thúc</span><DateTimeInput value={endAt} onChange={setEndAt} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300"><span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Hạn phản hồi nhận việc</span><DateTimeInput value={acceptanceDeadline} onChange={setAcceptanceDeadline} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Sau thời hạn này, việc chưa phản hồi sẽ chuyển sang trạng thái quá hạn và được xử lý theo quy định phạt.</span></label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Địa điểm</span><input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="VD: Văn phòng đối tác" /></label>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Mô tả / yêu cầu<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Nội dung, yêu cầu chuẩn bị, thông tin liên hệ..." /></label>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">{assignment ? (canEditAssignees ? 'Người thực hiện (có thể đổi trước khi bắt đầu)' : 'Người thực hiện (đã khóa sau khi bắt đầu)') : 'Chọn người thực hiện *'} ({selectedIds.length})</legend>
            <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
              {activeIdols.map((idol) => <label key={idol.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${canEditAssignees ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'} ${selectedIds.includes(idol.id) ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}><input type="checkbox" checked={selectedIds.includes(idol.id)} disabled={!canEditAssignees} onChange={() => toggleAssignee(idol.id)} /><span className="min-w-0"><span className="block truncate font-bold text-slate-900 dark:text-slate-100">{idol.stageName || idol.realName}</span><span className="block truncate text-slate-500 dark:text-slate-400">{idol.department || 'Chưa phân đơn vị'}</span></span></label>)}
              {activeIdols.length === 0 && <p className="col-span-full text-xs text-slate-500">Không có nhân sự phù hợp trong phạm vi quản lý.</p>}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</button><button type="submit" disabled={submitting} className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Đang lưu...' : assignment ? 'Lưu thay đổi' : 'Tạo phân công'}</button></div>
        </form>
      </div>
    </div>
  );
};
