import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FileWarning, Loader2, Search, XCircle } from 'lucide-react';
import type { PayrollDisputeInboxItem, PayrollDisputeStatus, UserAccount } from '../types/index.ts';
import { api } from '../services/api.ts';
import { canManagePayrollDisputes } from '../utils/payrollDisputePolicy.ts';
import { formatPayrollCalendarDate, formatPayrollDisputeValue, PAYROLL_DISPUTE_CATEGORY_LABELS, PAYROLL_DISPUTE_STATUS_LABELS } from '../utils/payrollDisputePresentation.ts';

interface PayrollDisputesViewProps {
  currentUser: UserAccount;
  onOpenPayrollAdjustment: (item: PayrollDisputeInboxItem) => void;
  onOpenCountChange?: (count: number) => void;
  initialSelectedDisputeId?: string | null;
  onInitialSelectedDisputeConsumed?: () => void;
}

const OPEN_STATUSES = new Set<PayrollDisputeStatus>(['submitted', 'under_review', 'adjusted']);

const getPayrollChanges = (before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined) => {
  if (!before || !after) return [];
  const keys = new Set(Object.keys(before));
  return Array.from(keys).flatMap((key) => {
    const oldValue = before[key];
    const newValue = after[key];
    const same = typeof oldValue === 'number' || typeof newValue === 'number'
      ? Number(oldValue || 0) === Number(newValue || 0)
      : String(oldValue ?? '') === String(newValue ?? '');
    if (same) return [];
    return [{
      key,
      label: formatPayrollDisputeValue({ [key]: newValue })[0]?.label || key,
      before: formatPayrollDisputeValue({ [key]: oldValue })[0]?.value || '—',
      after: formatPayrollDisputeValue({ [key]: newValue })[0]?.value || '—'
    }];
  });
};

export const PayrollDisputesView: React.FC<PayrollDisputesViewProps> = ({ currentUser, onOpenPayrollAdjustment, onOpenCountChange, initialSelectedDisputeId, onInitialSelectedDisputeConsumed }) => {
  const [items, setItems] = useState<PayrollDisputeInboxItem[]>([]);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = canManagePayrollDisputes(currentUser);

  const load = async (nextFilter = filter) => {
    try {
      setLoading(true);
      setError(null);
      const nextItems = await api.getPayrollDisputeInbox(nextFilter);
      setItems(nextItems);
      if (nextFilter === 'open') onOpenCountChange?.(nextItems.length);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải hộp thư phản ánh bảng lương');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filter]);

  useEffect(() => {
    if (!initialSelectedDisputeId || loading) return;
    if (items.some((item) => item.id === initialSelectedDisputeId)) {
      setSelectedId(initialSelectedDisputeId);
      onInitialSelectedDisputeConsumed?.();
    }
  }, [initialSelectedDisputeId, items, loading, onInitialSelectedDisputeConsumed]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => !normalized || [item.employeeName, item.stageName, item.department, item.reason, item.period].some((value) => value?.toLowerCase().includes(normalized)));
  }, [items, query]);

  const selected = items.find((item) => item.id === selectedId) || visibleItems[0];
  const openCount = items.filter((item) => OPEN_STATUSES.has(item.status)).length;
  const selectedChanges = getPayrollChanges(selected?.systemValue, selected?.currentValue);

  const updateStatus = async (item: PayrollDisputeInboxItem, status: PayrollDisputeStatus): Promise<boolean> => {
    const note = notes[item.id]?.trim() || '';
    if ((status === 'resolved' || status === 'rejected') && !note) {
      setError(status === 'rejected' ? 'Vui lòng nhập lý do từ chối.' : 'Vui lòng nhập kết luận xử lý.');
      setSelectedId(item.id);
      return false;
    }
    try {
      setActionId(item.id);
      const updated = await api.updatePayrollDispute(item.id, { status, resolutionNote: note || undefined });
      setItems((current) => current.map((entry) => entry.id === updated.id ? { ...entry, ...updated } : entry));
      setNotes((current) => ({ ...current, [item.id]: '' }));
      if (status === 'resolved' || status === 'rejected') onOpenCountChange?.(Math.max(0, openCount - 1));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật phản ánh');
      return false;
    } finally {
      setActionId(null);
    }
  };

  const openAdjustment = async (item: PayrollDisputeInboxItem) => {
    if (item.status === 'submitted' && !(await updateStatus(item, 'under_review'))) return;
    onOpenPayrollAdjustment(item);
  };

  if (!canReview) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Bạn không có quyền truy cập hộp thư phản ánh bảng lương.</div>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><FileWarning className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-black text-slate-900">Phản ánh bảng lương</h1><span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-black text-white">{openCount} mở</span></div>
            <p className="mt-1 text-xs text-slate-600">Tiếp nhận, kiểm tra và điều chỉnh các phản ánh trước khi phê duyệt bảng lương.</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700">Làm mới</button>
        </div>
        <div className="flex flex-col md:flex-row gap-3 border-b border-slate-100 p-4">
          <label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo nhân sự, kỳ lương, nội dung..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></label>
          <div className="flex gap-2">
            {(['open', 'all'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-bold ${filter === value ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{value === 'open' ? 'Đang mở' : 'Tất cả'}</button>)}
          </div>
        </div>
        {error && <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertCircle className="h-4 w-4" />{error}<button type="button" className="ml-auto" onClick={() => setError(null)}><XCircle className="h-4 w-4" /></button></div>}
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải phản ánh...</div> : visibleItems.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Không có phản ánh phù hợp.</div> : (
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
            <div className="space-y-3">{visibleItems.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === item.id ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{item.employeeName}</strong><span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">{PAYROLL_DISPUTE_CATEGORY_LABELS[item.category]}</span></div><p className="mt-1 text-xs text-slate-500">Kỳ {item.period.replace('-', '/')} · {item.department}</p></div><span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{PAYROLL_DISPUTE_STATUS_LABELS[item.status]}</span></div>
              <p className="mt-3 line-clamp-2 text-xs text-slate-700">{item.reason}</p><p className="mt-2 text-[10px] text-slate-400">Gửi ngày {formatPayrollCalendarDate(item.createdAt.slice(0, 10))}</p>
            </button>)}</div>
            {selected && <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-20 lg:self-start">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-slate-900">Chi tiết phản ánh</h2><p className="mt-1 text-xs text-slate-500">{selected.employeeName} · Kỳ {selected.period.replace('-', '/')}</p></div><span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700">{PAYROLL_DISPUTE_STATUS_LABELS[selected.status]}</span></div>
              <div className="mt-4 space-y-3 text-xs"><div><span className="font-bold text-slate-500">Loại phản ánh</span><p className="mt-1 font-semibold text-slate-800">{PAYROLL_DISPUTE_CATEGORY_LABELS[selected.category]}</p></div><div><span className="font-bold text-slate-500">Lý do</span><p className="mt-1 whitespace-pre-wrap text-slate-800">{selected.reason}</p></div><div><span className="font-bold text-slate-500">Số liệu hệ thống lúc phản ánh</span><div className="mt-1 space-y-1">{formatPayrollDisputeValue(selected.systemValue).map((entry) => <div key={entry.label} className="flex justify-between gap-3"><span className="text-slate-500">{entry.label}</span><strong className="text-slate-800">{entry.value}</strong></div>)}</div></div><div><span className="font-bold text-slate-500">Đề nghị</span><div className="mt-1 space-y-1">{formatPayrollDisputeValue(selected.requestedValue).map((entry) => <div key={entry.label} className="flex justify-between gap-3"><span className="text-slate-500">{entry.label}</span><strong className="text-slate-800">{entry.value}</strong></div>)}</div></div>{selectedChanges.length > 0 && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div className="font-bold text-emerald-900">Thay đổi sau điều chỉnh</div><p className="mt-1 text-[11px] text-emerald-800">Kiểm tra các giá trị này trước khi xác nhận đóng phản ánh.</p><div className="mt-2 space-y-1.5">{selectedChanges.map((change) => <div key={change.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2"><span className="text-emerald-900">{change.label}</span><span className="text-slate-500 line-through">{change.before}</span><strong className="text-emerald-800">{change.after}</strong></div>)}</div></div>}</div>
              {OPEN_STATUSES.has(selected.status) && <><textarea value={notes[selected.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))} placeholder="Ghi chú xử lý hoặc kết luận..." className="mt-4 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-indigo-400" /><div className="mt-3 flex flex-wrap gap-2">{selected.status !== 'adjusted' && <button type="button" disabled={actionId === selected.id} onClick={() => void openAdjustment(selected)} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><ArrowRight className="h-3.5 w-3.5" />{selected.status === 'submitted' ? 'Tiếp nhận & mở điều chỉnh' : 'Mở điều chỉnh'}</button>}{(selected.status === 'under_review' || selected.status === 'adjusted') && <><button type="button" disabled={actionId === selected.id} onClick={() => void updateStatus(selected, 'resolved')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />Xác nhận đã xử lý</button><button type="button" disabled={actionId === selected.id} onClick={() => void updateStatus(selected, 'rejected')} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" />Từ chối</button></>}</div><p className="mt-3 flex gap-1.5 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5 shrink-0" />Tiếp nhận chỉ ghi nhận người xử lý; chỉ xác nhận hoàn tất sau khi đã điều chỉnh hoặc có kết luận rõ ràng.</p></>}
            </article>}
          </div>
        )}
      </section>
    </div>
  );
};

