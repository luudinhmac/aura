import React, { useEffect, useMemo, useState } from 'react';
import { DateTimeInput } from './DateTimeInput.tsx';
import { BriefcaseBusiness, CalendarClock, CheckCircle2, CircleAlert, Clock3, Pencil, Plus, Send, UserCheck, X } from 'lucide-react';
import { Idol, UserAccount, WorkAssignment, WorkAssignmentResponseStatus } from '../types/index.ts';
import { WorkAssignmentModal } from './WorkAssignmentModal.tsx';
import { api } from '../services/api.ts';
import { formatSystemDateTimeVN, getSystemNow } from '../utils/dateUtils.ts';
import { calculateAssignmentPenalty, isWorkAssignmentAcceptanceOpen } from '../utils/workAssignmentPolicy.ts';
import { getWorkAssignmentStatus, isWorkAssignmentExpired } from '../utils/workAssignmentStatus.ts';
import { getWorkAssignmentPenaltyDisplay, shouldShowAssignmentPenaltyRule } from '../utils/workAssignmentDisplay.ts';

interface WorkAssignmentPanelProps {
  currentUser: UserAccount; idols: Idol[]; assignments: WorkAssignment[]; users?: UserAccount[];
  referenceDate?: string;
  onCreate: (data: Partial<WorkAssignment> & { assigneePersonnelIds: string[] }) => Promise<void>;
  onUpdate?: (id: string, data: Partial<WorkAssignment> & { assigneePersonnelIds?: string[] }) => Promise<void>;
  onRespond: (id: string, status: 'accepted' | 'declined', note?: string) => Promise<void>;
  onComplete: (id: string, note?: string) => Promise<void>;
  onReviewViolation?: (assignmentId: string, personnelId: string, action: 'confirm' | 'waive', note?: string) => Promise<void>;
  onCancel?: (assignmentId: string, reason: string) => Promise<void>;
  onRequestWaiver?: (assignmentId: string, reason: string) => Promise<void>;
  onReviewWaiver?: (assignmentId: string, personnelId: string, action: 'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty', note?: string, penaltyRate?: number) => Promise<void>;
}

const statusLabels: Record<WorkAssignmentResponseStatus, string> = { pending: 'Chờ phản hồi', accepted: 'Đã nhận', declined: 'Đã từ chối', in_progress: 'Đang thực hiện', completed: 'Đã hoàn thành', overdue: 'Quá hạn' };
const typeLabels: Record<string, string> = { business_trip: 'Công tác', client_meeting: 'Gặp đối tác', brand_change: 'Đổi nhãn hàng', shoot_with_manager: 'Đi cùng quản lý', event: 'Sự kiện', other: 'Công việc' };
const buttonClass = 'transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';

export const WorkAssignmentPanel: React.FC<WorkAssignmentPanelProps> = ({ currentUser, idols, assignments, users = [], referenceDate, onCreate, onUpdate, onRespond, onComplete, onReviewViolation: _onReviewViolation, onCancel, onRequestWaiver, onReviewWaiver }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignment | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [waiverId, setWaiverId] = useState<string | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [waiverReviewTarget, setWaiverReviewTarget] = useState<{ assignmentId: string; personnelId: string; personnelName: string } | null>(null);
  const [waiverDecision, setWaiverDecision] = useState<'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty'>('accept');
  const [waiverPenaltyRate, setWaiverPenaltyRate] = useState('50');
  const [waiverReviewNote, setWaiverReviewNote] = useState('');
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [delegateId, setDelegateId] = useState('');
  const [delegationStartsAt, setDelegationStartsAt] = useState('');
  const [delegationEndsAt, setDelegationEndsAt] = useState('');
  const [clockRefreshKey, setClockRefreshKey] = useState(0);
  const canManage = currentUser.isSuperAdmin || currentUser.allowedActions?.includes('manage_work_assignments') === true;
  let onReviewViolation: WorkAssignmentPanelProps['onReviewViolation'];
  const myAssignments = useMemo(() => currentUser.idolId ? assignments.filter((assignment) => assignment.assignees.some((assignee) => assignee.personnelId === currentUser.idolId)) : [], [assignments, currentUser.idolId]);
  const visibleAssignments = canManage ? assignments : myAssignments;
  const configuredPenaltyFor = (assignment: WorkAssignment, personnelId?: string, contractSalary?: number) => {
    const salary = contractSalary !== undefined
      ? contractSalary
      : personnelId && String(currentUser.idolId) === String(personnelId)
        ? currentUser.baseSalary
        : personnelId ? idols.find((idol) => String(idol.id) === String(personnelId))?.baseSalary : undefined;
    return calculateAssignmentPenalty(assignment.penaltyType || 'none', assignment.penaltyValue || 0, salary ?? 0);
  };
  const penaltyDisplayFor = (assignment: WorkAssignment, person: WorkAssignment['assignees'][number]) => getWorkAssignmentPenaltyDisplay({
    mandatory: assignment.mandatory,
    assignmentStatus: assignment.status,
    penaltyType: assignment.penaltyType || 'none',
    responseStatus: person.responseStatus,
    violationStatus: person.violationStatus,
    waiverRequestStatus: person.waiverRequestStatus,
    waiverDecision: person.waiverDecision,
    penaltyAmount: person.penaltyAmount,
    penaltyRate: person.penaltyRate,
    possiblePenaltyAmount: configuredPenaltyFor(assignment, person.personnelId, person.contractSalary),
  });
  const handleDecline = async (assignmentId: string) => { if (!declineNote.trim()) return; await onRespond(assignmentId, 'declined', declineNote.trim()); setDeclineId(null); setDeclineNote(''); };
  const isDirector = currentUser.isSuperAdmin || currentUser.role === 'director' || currentUser.roleTitle?.toLowerCase().includes('giám đốc');
  const openDelegation = async () => { setDelegationOpen(true); try { setDelegations(await api.getWorkAssignmentDelegations()); } catch { setDelegations([]); } };
  const createDelegation = async () => { if (!delegateId || !delegationStartsAt || !delegationEndsAt) return; const created = await api.createWorkAssignmentDelegation({ delegateId, startsAt: delegationStartsAt, endsAt: delegationEndsAt }); setDelegations((items) => [created, ...items]); setDelegateId(''); };
  const submitWaiverReview = async () => { if (!waiverReviewTarget || !onReviewWaiver || !waiverReviewNote.trim()) return; const rate = waiverDecision === 'reduced_penalty' ? Number(waiverPenaltyRate) : undefined; if (waiverDecision === 'reduced_penalty' && (rate === undefined || !Number.isFinite(rate) || rate < 0 || rate > 100)) return; await onReviewWaiver(waiverReviewTarget.assignmentId, waiverReviewTarget.personnelId, waiverDecision, waiverReviewNote.trim(), rate); setWaiverReviewTarget(null); setWaiverDecision('accept'); setWaiverPenaltyRate('50'); setWaiverReviewNote(''); };

  useEffect(() => {
    const refreshClock = () => setClockRefreshKey((key) => key + 1);
    const now = getSystemNow(referenceDate);
    const nextEndTime = assignments
      .map((assignment) => assignment.endAt ? new Date(assignment.endAt).getTime() : Number.NaN)
      .filter((endTime) => Number.isFinite(endTime) && endTime > now.getTime())
      .sort((left, right) => left - right)[0];
    const expiryTimeout = nextEndTime === undefined
      ? undefined
      : window.setTimeout(refreshClock, Math.max(0, nextEndTime - now.getTime()));
    const intervalId = window.setInterval(refreshClock, 30_000);
    document.addEventListener('visibilitychange', refreshClock);
    return () => {
      if (expiryTimeout !== undefined) window.clearTimeout(expiryTimeout);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshClock);
    };
  }, [assignments, referenceDate, clockRefreshKey]);

  return <>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70" aria-labelledby="work-assignment-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="work-assignment-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100"><BriefcaseBusiness className="h-5 w-5 text-sky-600" />Công tác & công việc được giao</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Theo dõi các công việc cần thực hiện và phản hồi trực tiếp.</p></div>{canManage && <button type="button" onClick={() => setIsCreateOpen(true)} className={`inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 ${buttonClass}`}><Plus className="h-4 w-4" />Giao công việc</button>}</div>
      {visibleAssignments.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">{canManage ? 'Chưa có công việc nào được giao.' : 'Bạn chưa có công tác hoặc công việc mới.'}</div> : <div className="mt-4 space-y-3">{visibleAssignments.slice(0, 8).map((assignment) => {
        const assignee = currentUser.idolId ? assignment.assignees.find((item) => item.personnelId === currentUser.idolId) : undefined;
        const state = assignee?.responseStatus || 'pending';
        const personalRestDate = assignee?.restDayDate || assignment.restDayDate;
        const personalRestPortion = assignee?.restDayPortion || assignment.restDayPortion;
        const effectiveNow = getSystemNow(referenceDate);
        const assignmentStatus = getWorkAssignmentStatus(assignment);
        const canComplete = !assignment.startAt || new Date(assignment.startAt).getTime() <= effectiveNow.getTime();
        const canAccept = isWorkAssignmentAcceptanceOpen(assignment.acceptanceDeadline, referenceDate);
        return <article key={assignment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{assignment.title}</h3><span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-400/10 dark:text-sky-200">{typeLabels[assignment.assignmentType] || 'Công việc'}</span>{assignment.mandatory && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-400/10 dark:text-rose-200">Bắt buộc</span>}</div><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{assignment.description || 'Không có mô tả thêm.'}</p></div><div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Clock3 className="h-3 w-3" />{canManage ? `${assignment.assignees.length} người` : statusLabels[state]}</span>{canManage && onUpdate && assignmentStatus !== 'completed' && assignmentStatus !== 'cancelled' && <button type="button" title="Chỉnh sửa công việc" onClick={() => setEditingAssignment(assignment)} className={`rounded-lg p-1.5 text-slate-500 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 ${buttonClass}`}><Pencil className="h-3.5 w-3.5" /></button>}</div></div>
          <div className="mt-3 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sky-50 px-2.5 py-2 font-semibold text-sky-900 dark:bg-sky-400/10 dark:text-sky-200">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>Thời gian công tác:</span>
              <time dateTime={assignment.startAt || undefined}>{assignment.startAt ? formatSystemDateTimeVN(new Date(assignment.startAt)) : 'Chưa xác định'}</time>
              <span aria-hidden="true">→</span>
              <time dateTime={assignment.endAt || undefined}>{assignment.endAt ? formatSystemDateTimeVN(new Date(assignment.endAt)) : 'Chưa xác định'}</time>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {assignment.location && <span>Địa điểm: {assignment.location}</span>}
              {assignment.acceptanceDeadline && <span>Hạn phản hồi nhận việc: {formatSystemDateTimeVN(new Date(assignment.acceptanceDeadline))}</span>}
              {assignment.mandatory && shouldShowAssignmentPenaltyRule(canManage, state, assignmentStatus) && <span className="font-semibold text-amber-700 dark:text-amber-300">Định mức phạt: {assignment.penaltyType === 'fixed' ? `${(assignment.penaltyValue || 0).toLocaleString('vi-VN')} đ` : assignment.penaltyType === 'percentage' ? `${assignment.penaltyValue || 0}% lương hợp đồng` : 'Không phạt tiền'}</span>}
              {!canManage && assignee && penaltyDisplayFor(assignment, assignee) && <span className={penaltyDisplayFor(assignment, assignee)?.kind === 'confirmed' ? 'font-semibold text-rose-700 dark:text-rose-300' : penaltyDisplayFor(assignment, assignee)?.kind === 'possible' ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-slate-600 dark:text-slate-300'}>{penaltyDisplayFor(assignment, assignee)?.text}</span>}
              {assignment.status === 'cancelled' && <span className="font-semibold text-rose-700 dark:text-rose-300">Đã hủy{assignment.cancellationReason ? `: ${assignment.cancellationReason}` : ''}</span>}
              {personalRestDate && <span className="font-semibold text-emerald-700 dark:text-emerald-300">Nghỉ bù {personalRestPortion === 'half' ? 'nửa ngày' : '1 ngày'}: {new Date(`${personalRestDate}T00:00:00`).toLocaleDateString('vi-VN')}</span>}
              {personalRestPortion !== 'none' && <span className="text-amber-700 dark:text-amber-300">Lịch cố định trong thời gian công tác được bỏ qua</span>}
              {canManage && <span>Người giao: {assignment.createdByName || 'Quản lý'}</span>}
            </div>
          </div>
          {!canManage && assignee && <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700"><div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Thao tác</div><div className="flex flex-wrap items-center justify-end gap-2">{state === 'pending' && canAccept && <><button type="button" onClick={() => void onRespond(assignment.id, 'accepted')} className={`inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 ${buttonClass}`}><UserCheck className="h-3.5 w-3.5" />Xác nhận nhận việc</button>{!assignment.mandatory && <button type="button" onClick={() => setDeclineId(assignment.id)} className={`inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-400/50 dark:text-rose-300 dark:hover:bg-rose-950/30 ${buttonClass}`}><X className="h-3.5 w-3.5" />Từ chối</button>}</>}{state === 'pending' && !canAccept && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300"><CircleAlert className="h-3.5 w-3.5" />Đã quá hạn chấp nhận</span>}{(state === 'accepted' || state === 'in_progress') && <><button type="button" disabled={!canComplete} title={!canComplete ? 'Chưa đến thời gian thực hiện' : undefined} onClick={() => void onComplete(assignment.id)} className={`inline-flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700 ${buttonClass}`}><CheckCircle2 className="h-4 w-4" />Đánh dấu hoàn thành</button>{!canComplete && <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Chưa đến thời gian thực hiện</span>}</>}{assignment.mandatory && state === 'pending' && canAccept && <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300"><CircleAlert className="mr-1 inline h-3.5 w-3.5" />Công việc bắt buộc, không thể từ chối trực tiếp</span>}</div></div>}
          {canManage && <div className="mt-3 space-y-2">{assignment.assignees.map((item) => {
            const penaltyDisplay = penaltyDisplayFor(assignment, item);
            const penaltyClass = penaltyDisplay?.kind === 'confirmed'
              ? 'text-rose-700 dark:text-rose-300'
              : penaltyDisplay?.kind === 'possible' || penaltyDisplay?.kind === 'missing'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-300';
            return <div key={item.id} className="rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300"><div className="flex flex-wrap items-center gap-1"><span>{item.personnelName}: {statusLabels[item.responseStatus]}</span>{penaltyDisplay && <span className={penaltyClass}>· {penaltyDisplay.text}</span>}{item.waiverRequestStatus === 'pending' && onReviewWaiver && <button type="button" onClick={() => setWaiverReviewTarget({ assignmentId: assignment.id, personnelId: item.personnelId, personnelName: item.personnelName })} className={`ml-1 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white ${buttonClass}`}>Xử lý giải trình</button>}</div>{item.waiverRequestStatus === 'pending' && item.waiverRequestReason && <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-normal text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-100"><span className="font-bold">Lý do xin miễn/giảm:</span> {item.waiverRequestReason}{item.waiverRequestedAt && <span className="ml-1 text-[10px] opacity-75">({new Date(item.waiverRequestedAt).toLocaleString('vi-VN')})</span>}</p>}{item.waiverRequestStatus !== 'pending' && item.waiverDecision && item.waiverReviewNote && <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-normal text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300"><span className="font-bold">Phản hồi xử lý:</span> {item.waiverReviewNote}</p>}{assignment.mandatory && item.responseStatus !== 'completed' && item.violationStatus !== 'confirmed' && item.violationStatus !== 'waived' && onReviewViolation && item.waiverRequestStatus !== 'pending' && <div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => void onReviewViolation(assignment.id, item.personnelId, 'confirm')} className={`rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white ${buttonClass}`}>Xác nhận vi phạm</button><button type="button" onClick={() => void onReviewViolation(assignment.id, item.personnelId, 'waive')} className={`rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold ${buttonClass}`}>Miễn</button></div>}</div>;
          })}</div>}
          {canManage && onReviewWaiver && assignment.assignees.filter((item) => assignment.mandatory && item.responseStatus !== 'completed' && item.violationStatus === 'under_review' && item.waiverRequestStatus !== 'pending').map((item) => <button key={`review-${item.id}`} type="button" onClick={() => setWaiverReviewTarget({ assignmentId: assignment.id, personnelId: item.personnelId, personnelName: item.personnelName })} className={`mt-3 mr-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white ${buttonClass}`}>Xử lý {item.personnelName}</button>)}
          {canManage && onCancel && assignmentStatus !== 'completed' && assignmentStatus !== 'cancelled' && !isWorkAssignmentExpired(assignment.endAt, effectiveNow) && <button type="button" onClick={() => setCancelId(assignment.id)} className={`mt-3 rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-bold text-rose-700 dark:border-rose-400/50 dark:text-rose-300 ${buttonClass}`}>Hủy công tác</button>}
          {!canManage && assignee?.waiverRequestStatus === 'pending' && <><span className="mt-3 inline-flex items-center rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-400/50 dark:text-amber-300">Đã gửi phản hồi · Chờ xử lý</span><p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Vui lòng chờ người có quyền xử lý phản hồi này.</p></>}
          {!canManage && assignee?.waiverRequestStatus !== 'pending' && onRequestWaiver && state === 'pending' && canAccept && <><button type="button" onClick={() => setWaiverId(assignment.id)} className={`mt-3 rounded-lg border border-sky-300 px-2 py-1 text-[11px] font-bold text-sky-700 dark:border-sky-400/50 dark:text-sky-300 ${buttonClass}`}>Phản hồi</button><p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">* Vui lòng phản hồi trước {assignment.acceptanceDeadline ? new Date(assignment.acceptanceDeadline).toLocaleString('vi-VN') : 'thời hạn được cấu hình'} nếu có ý kiến hoặc cần xin đổi người.</p></>}
          {!canManage && assignee?.waiverRequestStatus !== 'pending' && onRequestWaiver && assignee?.violationStatus === 'under_review' && <><button type="button" onClick={() => setWaiverId(assignment.id)} className={`mt-3 rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-400/50 dark:text-amber-300 ${buttonClass}`}>Giải trình</button><p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">* Vui lòng giải trình sớm để được xem xét miễn, giảm hoặc áp dụng phạt.</p></>}
          {!canManage && assignee?.waiverDecision && assignee.waiverReviewNote && <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300"><span className="font-bold">Phản hồi quản lý:</span> {assignee.waiverReviewNote}</p>}
        </article>;
      })}</div>}
    {canManage && isDirector && <button type="button" onClick={() => void openDelegation()} className={`mb-2 rounded-lg border border-violet-300 px-3 py-2 text-xs font-bold text-violet-700 dark:border-violet-400/50 dark:text-violet-300 ${buttonClass}`}>Ủy quyền phê duyệt</button>}
    </section>
    {isCreateOpen && <WorkAssignmentModal idols={idols} onClose={() => setIsCreateOpen(false)} onSubmit={onCreate} />}
    {editingAssignment && onUpdate && <WorkAssignmentModal idols={idols} assignment={editingAssignment} onClose={() => setEditingAssignment(null)} onSubmit={async (data) => { await onUpdate(editingAssignment.id, data); setEditingAssignment(null); }} />}
    {(declineId || cancelId || waiverId) && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{cancelId ? 'Lý do hủy công tác' : waiverId ? 'Lý do xin miễn/giảm phạt' : 'Lý do từ chối công việc'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nội dung này sẽ được lưu để đối soát.</p><textarea autoFocus value={cancelId ? cancelReason : waiverId ? waiverReason : declineNote} onChange={(event) => cancelId ? setCancelReason(event.target.value) : waiverId ? setWaiverReason(event.target.value) : setDeclineNote(event.target.value)} rows={4} className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Nhập lý do..." /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setDeclineId(null); setCancelId(null); setWaiverId(null); setDeclineNote(''); setCancelReason(''); setWaiverReason(''); }} className={`rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300 ${buttonClass}`}>Hủy</button><button type="button" disabled={!(cancelId ? cancelReason : waiverId ? waiverReason : declineNote).trim()} onClick={() => { if (cancelId && onCancel) void onCancel(cancelId, cancelReason).then(() => { setCancelId(null); setCancelReason(''); }); else if (waiverId && onRequestWaiver) void onRequestWaiver(waiverId, waiverReason).then(() => { setWaiverId(null); setWaiverReason(''); }); else if (declineId) void handleDecline(declineId); }} className={`inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white ${buttonClass}`}><Send className="h-3.5 w-3.5" />Gửi</button></div></div></div>}
    {waiverReviewTarget && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Xử lý giải trình · {waiverReviewTarget.personnelName}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Chọn kết quả xử lý và ghi rõ lý do phản hồi cho người thực hiện.</p><label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-200">Action<select value={waiverDecision} onChange={(event) => setWaiverDecision(event.target.value as typeof waiverDecision)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"><option value="accept">Tham gia</option><option value="no_penalty">Không tham gia · Không phạt</option><option value="penalty">Không tham gia · Phạt đủ định mức</option><option value="reduced_penalty">Không tham gia · Phạt theo % định mức</option></select></label>{waiverDecision === 'reduced_penalty' && <label className="mt-3 block text-xs font-bold text-slate-700 dark:text-slate-200">Tỷ lệ phạt áp dụng (%)<input type="number" min="0" max="100" step="1" value={waiverPenaltyRate} onChange={(event) => setWaiverPenaltyRate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>}<label className="mt-3 block text-xs font-bold text-slate-700 dark:text-slate-200">Lý do phản hồi<textarea autoFocus value={waiverReviewNote} onChange={(event) => setWaiverReviewNote(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Nhập lý do xử lý..." /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setWaiverReviewTarget(null); setWaiverReviewNote(''); }} className={`rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300 ${buttonClass}`}>Hủy</button><button type="button" disabled={!waiverReviewNote.trim() || (waiverDecision === 'reduced_penalty' && (!Number.isFinite(Number(waiverPenaltyRate)) || Number(waiverPenaltyRate) < 0 || Number(waiverPenaltyRate) > 100))} onClick={() => void submitWaiverReview()} className={`inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white ${buttonClass}`}><Send className="h-3.5 w-3.5" />Lưu xử lý</button></div></div></div>}
    {delegationOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Ủy quyền phê duyệt</h2><button type="button" onClick={() => setDelegationOpen(false)} className={`rounded-lg p-1 text-slate-500 ${buttonClass}`}><X className="h-5 w-5" /></button></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Chỉ tài khoản được ủy quyền trong khoảng thời gian này mới được xử lý miễn/giảm phạt. Hết hạn sẽ tự động thu hồi.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><select value={delegateId} onChange={(event) => setDelegateId(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"><option value="">Chọn tài khoản</option>{users.filter((user) => String(user.id) !== String(currentUser.id)).map((user) => <option key={user.id} value={user.id}>{user.name || user.username}</option>)}</select><DateTimeInput value={delegationStartsAt} onChange={setDelegationStartsAt} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /><DateTimeInput value={delegationEndsAt} onChange={setDelegationEndsAt} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></div><button type="button" disabled={!delegateId || !delegationStartsAt || !delegationEndsAt} onClick={() => void createDelegation()} className={`mt-3 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white ${buttonClass}`}>Lưu ủy quyền</button><div className="mt-4 space-y-2">{delegations.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700"><span>{item.delegate?.username || item.delegateId}<br /><span className="text-slate-500">{new Date(item.startsAt).toLocaleString('vi-VN')} → {new Date(item.endsAt).toLocaleString('vi-VN')}</span></span>{!item.revokedAt && <button type="button" onClick={() => void api.revokeWorkAssignmentDelegation(item.id).then(() => setDelegations((items) => items.map((value) => value.id === item.id ? { ...value, revokedAt: new Date().toISOString() } : value)))} className={`rounded border border-rose-300 px-2 py-1 font-bold text-rose-700 dark:border-rose-400/50 dark:text-rose-300 ${buttonClass}`}>Thu hồi</button>}</div>)}</div></div></div>}
  </>;
};
