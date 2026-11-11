import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, CheckCircle2, CircleAlert, Clock3, Filter, ListChecks } from 'lucide-react';
import { Idol, ServiceUsageRecord, UserAccount, WorkAssignment } from '../types/index.ts';
import { formatDateTimeVN, formatDateVN, getSystemNow, getTodayIsoDate } from '../utils/dateUtils.ts';
import { WorkAssignmentPanel } from '../components/WorkAssignmentPanel.tsx';
import { api } from '../services/api.ts';
import { getPersonalWorkAssignmentStatus, getWorkAssignmentStatus } from '../utils/workAssignmentStatus.ts';

type AssignmentFilter = 'all' | 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

interface WorkAssignmentsViewProps {
  currentUser: UserAccount;
  idols: Idol[];
  users?: UserAccount[];
  assignments: WorkAssignment[];
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

const statusLabel = (status: string) => ({
  pending: 'Theo dõi lịch', accepted: 'Đã nhận', in_progress: 'Đang thực hiện', completed: 'Đã hoàn thành',
  declined: 'Đã từ chối', cancelled: 'Đã huỷ'
}[status] || status);

const statusClass = (status: string) => status === 'completed'
  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300'
  : status === 'cancelled' || status === 'declined'
    ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    : status === 'in_progress'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300'
      : 'bg-sky-100 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300';

const WorkAssignmentsView: React.FC<WorkAssignmentsViewProps> = ({
  currentUser, idols, users = [], assignments, referenceDate, onCreate, onUpdate, onRespond, onComplete,
  onReviewViolation, onCancel, onRequestWaiver, onReviewWaiver
}) => {
  const [filter, setFilter] = useState<AssignmentFilter>('all');
  const [assignedServices, setAssignedServices] = useState<ServiceUsageRecord[]>([]);
  const today = getTodayIsoDate(referenceDate);
  const systemNow = getSystemNow(referenceDate);
  const canManage = currentUser.isSuperAdmin || currentUser.allowedActions?.includes('manage_work_assignments') === true;
  const canViewAllServices = Boolean(currentUser.isSuperAdmin || currentUser.isBusinessAdmin || currentUser.allowedActions?.includes('manage_revenue') || currentUser.allowedActions?.includes('manage_idols'));
  useEffect(() => {
    let cancelled = false;
    const load = canViewAllServices
      ? Promise.all(idols.filter((idol) => idol.personnelType === 'Dịch vụ ngoài').map((idol) => api.getServiceUsageRecords(idol.id))).then((groups) => groups.flat())
      : api.getAssignedServiceUsageRecords();
    load
      .then((records) => { if (!cancelled) setAssignedServices(records.filter((record) => record.status !== 'cancelled' && Boolean(record.assignedUserId || record.assignedUserIds?.length))); })
      .catch(() => { if (!cancelled) setAssignedServices([]); });
    return () => { cancelled = true; };
  }, [canViewAllServices, currentUser.id, idols]);
  const visibleAssignments = useMemo(() => assignments
    .filter((assignment) => canManage || assignment.assignees.some((assignee) => assignee.personnelId === currentUser.idolId))
    .filter((assignment) => {
      const status = canManage ? getWorkAssignmentStatus(assignment) : getPersonalWorkAssignmentStatus(assignment, currentUser.idolId);
      if (filter === 'all') return true;
      if (filter === 'cancelled') return status === 'cancelled';
      if (filter === 'completed') return status === 'completed';
      if (filter === 'in_progress') return status === 'in_progress';
      if (filter === 'overdue') return status !== 'completed' && status !== 'cancelled' && Boolean(assignment.acceptanceDeadline && assignment.acceptanceDeadline < `${today}T00:00:00`);
      return status !== 'completed' && status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.startAt || a.createdAt).getTime() - new Date(b.startAt || b.createdAt).getTime()),
  [assignments, canManage, currentUser.idolId, filter, today]);

  const counts = useMemo(() => ({
    all: assignments.filter((a) => canManage || a.assignees.some((person) => person.personnelId === currentUser.idolId)).length,
    open: assignments.filter((a) => { const status = canManage ? getWorkAssignmentStatus(a) : getPersonalWorkAssignmentStatus(a, currentUser.idolId); return (canManage || a.assignees.some((person) => person.personnelId === currentUser.idolId)) && status !== 'completed' && status !== 'cancelled'; }).length,
    in_progress: assignments.filter((a) => { const status = canManage ? getWorkAssignmentStatus(a) : getPersonalWorkAssignmentStatus(a, currentUser.idolId); return (canManage || a.assignees.some((person) => person.personnelId === currentUser.idolId)) && status === 'in_progress'; }).length,
    completed: assignments.filter((a) => { const status = canManage ? getWorkAssignmentStatus(a) : getPersonalWorkAssignmentStatus(a, currentUser.idolId); return (canManage || a.assignees.some((person) => person.personnelId === currentUser.idolId)) && status === 'completed'; }).length,
    overdue: assignments.filter((a) => { const status = canManage ? getWorkAssignmentStatus(a) : getPersonalWorkAssignmentStatus(a, currentUser.idolId); return (canManage || a.assignees.some((person) => person.personnelId === currentUser.idolId)) && status !== 'completed' && status !== 'cancelled' && Boolean(a.acceptanceDeadline && a.acceptanceDeadline < `${today}T00:00:00`); }).length,
    cancelled: assignments.filter((a) => { const status = canManage ? getWorkAssignmentStatus(a) : getPersonalWorkAssignmentStatus(a, currentUser.idolId); return (canManage || a.assignees.some((person) => person.personnelId === currentUser.idolId)) && status === 'cancelled'; }).length
  }), [assignments, canManage, currentUser.idolId, today]);

  return <div className="space-y-6 pb-12">
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50 p-6 shadow-xl dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Vận hành</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Giao việc & Công tác</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Theo dõi công việc theo thời gian, trạng thái và từng người thực hiện.</p></div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-right dark:border-sky-400/30 dark:bg-sky-950/30"><p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Ngày giờ hệ thống</p><p className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">{formatDateTimeVN(systemNow)}</p></div>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {([['all', 'Tất cả', counts.all, ListChecks], ['open', 'Chưa xong', counts.open, CircleAlert], ['in_progress', 'Đang làm', counts.in_progress, Clock3], ['completed', 'Đã xong', counts.completed, CheckCircle2], ['cancelled', 'Đã huỷ', counts.cancelled, Filter]] as const).map(([key, label, count, Icon]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-2xl border p-4 text-left transition ${filter === key ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'border-slate-200 bg-white hover:border-sky-300 dark:border-slate-700/70 dark:bg-slate-900/70'}`}><Icon className="h-5 w-5 text-sky-600 dark:text-sky-300" /><p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{count}</p></button>)}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700/70"><div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100"><CalendarClock className="h-5 w-5 text-indigo-600" />Timeline công việc</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sắp xếp từ thời điểm bắt đầu; xem đầy đủ thời gian, đối tượng và người thực hiện.</p></div><span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">{visibleAssignments.length} công việc</span></div>
      {visibleAssignments.length === 0 ? <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Không có công việc phù hợp với bộ lọc.</p> : <div className="relative mt-5 space-y-4 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-indigo-200 dark:before:bg-indigo-900/70">{visibleAssignments.map((assignment) => <article key={assignment.id} className="relative pl-8"><span className={`absolute left-0 top-5 h-6 w-6 rounded-full border-4 border-white dark:border-slate-950 ${assignment.status === 'completed' ? 'bg-emerald-500' : assignment.status === 'cancelled' ? 'bg-slate-400' : 'bg-indigo-500'}`} /><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{assignment.title}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{assignment.assignmentType || 'Công việc'}{assignment.mandatory ? ' · Bắt buộc' : ' · Không bắt buộc'}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(assignment.status)}`}>{statusLabel(assignment.status)}</span></div><div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2"><span><b>Thời gian:</b> {assignment.startAt ? formatDateTimeVN(assignment.startAt) : 'Chưa xác định'} → {assignment.endAt ? formatDateTimeVN(assignment.endAt) : 'Chưa xác định'}</span><span><b>Địa điểm:</b> {assignment.location || 'Không có'}</span><span><b>Người giao:</b> {assignment.createdByName || assignment.createdById}</span><span><b>Hạn phản hồi nhận việc:</b> {assignment.acceptanceDeadline ? formatDateTimeVN(assignment.acceptanceDeadline) : 'Không đặt hạn'}</span></div>{assignment.description && <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"><b>Mô tả:</b> {assignment.description}</p>}<div className="mt-3 flex flex-wrap gap-2">{assignment.assignees.map((assignee) => <span key={`${assignment.id}-${assignee.personnelId}`} className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{assignee.personnelName}: {statusLabel(assignee.responseStatus || assignment.status)}{assignee.violationStatus ? ` · ${assignee.violationStatus}` : ''}{assignee.waiverStatus ? ` · ${assignee.waiverStatus}` : ''}</span>)}</div></div></article>)}</div>}
    </section>

    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm dark:border-amber-400/30 dark:bg-amber-950/20" aria-labelledby="assigned-services-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-4 dark:border-amber-400/20"><div><h2 id="assigned-services-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100"><BriefcaseBusiness className="h-5 w-5 text-amber-600" />Dịch vụ ngoài được phân công</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Theo dõi các đơn dịch vụ ngoài được giao cho tài khoản này.</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">{assignedServices.length} đơn</span></div>
      {assignedServices.length === 0 ? <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">Chưa có dịch vụ ngoài nào được assign cho tài khoản này.</p> : <div className="mt-4 space-y-3">{[...assignedServices].sort((a, b) => new Date(a.startAt || a.usageDate).getTime() - new Date(b.startAt || b.usageDate).getTime()).map((record) => <article key={record.id} className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-400/20 dark:bg-slate-900/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{record.usageCode} · {record.serviceName}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-300"><b>Đối tượng:</b> {record.personnelName || record.stageName || 'Chưa xác định'} · <b>Địa điểm:</b> {record.location || 'Không có'}</p></div><div className="text-right text-xs"><p className="font-bold text-amber-700 dark:text-amber-300">{record.status === 'completed' ? 'Đã hoàn thành' : record.status === 'in_progress' ? 'Đang thực hiện' : 'Theo dõi lịch'}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{record.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p></div></div><div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2"><span><b>Thời gian:</b> {record.startAt ? formatDateTimeVN(record.startAt) : formatDateVN(record.usageDate)} → {record.endAt ? formatDateTimeVN(record.endAt) : 'Chưa xác định'}</span><span><b>Người thực hiện:</b> {(record.assignedUserNames || [record.assignedUserName]).filter(Boolean).join(', ') || 'Tài khoản này'}</span></div></article>)}</div>}
    </section>
    <WorkAssignmentPanel currentUser={currentUser} idols={idols} users={users} assignments={assignments} referenceDate={referenceDate} onCreate={onCreate} onUpdate={onUpdate} onRespond={onRespond} onComplete={onComplete} onReviewViolation={onReviewViolation} onCancel={onCancel} onRequestWaiver={onRequestWaiver} onReviewWaiver={onReviewWaiver} />
  </div>;
};

export { WorkAssignmentsView };
