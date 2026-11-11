import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { AuditLogEntry, AuditLogPage } from '../types/index.ts';

const METHOD_BADGE_MAP: Record<string, string> = {
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  PATCH: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  GET: 'bg-sky-50 text-sky-700 border-sky-200',
};

function getStatusBadgeClass(statusCode: number): string {
  if (statusCode >= 500) return 'bg-rose-100 text-rose-800 border-rose-300';
  if (statusCode >= 400) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (statusCode >= 200 && statusCode < 300) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatAuditTimestamp(iso: string): string {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const AdminAuditLogPanel: React.FC = () => {
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'data' | 'auth'>('all');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [statusGroupFilter, setStatusGroupFilter] = useState<'all' | '2xx' | '4xx_5xx'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAuditLogs({
        page,
        limit: 25,
        search: appliedSearch || undefined,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
        resource: resourceFilter !== 'all' ? resourceFilter : undefined,
        category: categoryFilter,
        statusGroup: statusGroupFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, methodFilter, resourceFilter, categoryFilter, statusGroupFilter, fromDate, toDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!selectedEntry) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedEntry(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntry]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleExportCsv = () => {
    const rows = data?.items ?? [];
    if (rows.length === 0) return;

    const header = [
      'Thoi gian',
      'Request ID',
      'Username',
      'Nguoi thao tac',
      'Vai tro',
      'Method',
      'Path',
      'Tai nguyen',
      'ID tai nguyen',
      'HTTP Status',
      'Metadata',
    ];
    const lines = [
      header.map(escapeCsvCell).join(','),
      ...rows.map((entry) =>
        [
          formatAuditTimestamp(entry.createdAt),
          entry.requestId,
          entry.actorUsername || '',
          entry.actorName || '',
          entry.actorRole || '',
          entry.method,
          entry.path,
          entry.resource,
          entry.resourceId || '',
          entry.statusCode,
          JSON.stringify(entry.metadata ?? {}),
        ]
          .map(escapeCsvCell)
          .join(',')
      ),
    ];

    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aura-audit-logs-page-${data?.page ?? 1}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = Boolean(
    appliedSearch ||
      categoryFilter !== 'all' ||
      methodFilter !== 'ALL' ||
      resourceFilter !== 'all' ||
      statusGroupFilter !== 'all' ||
      fromDate ||
      toDate
  );

  const items = data?.items ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Nhật Ký Kiểm Toán Hệ Thống (Audit Log)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldCheck className="w-3 h-3" />
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân tách sự kiện xác thực và thay đổi dữ liệu API (người thực hiện, phương thức, tài nguyên, trạng thái HTTP và Request ID).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={items.length === 0 || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuất dữ liệu trang hiện tại ra file CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void loadLogs()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Category Quick Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {(
              [
                { id: 'all', label: 'Tất cả sự kiện' },
                { id: 'data', label: 'Thay đổi dữ liệu' },
                { id: 'auth', label: 'Xác thực & Phiên (Auth)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPage(1);
                  setCategoryFilter(opt.id);
                  if (opt.id === 'auth') setResourceFilter('auth');
                  else if (resourceFilter === 'auth') setResourceFilter('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === opt.id
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {data && (
            <span className="text-[11px] font-semibold text-slate-500">
              Tổng cộng <strong className="text-slate-800">{data.total}</strong> bản ghi khớp bộ lọc
            </span>
          )}
        </div>

        {/* Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
          <div className="md:col-span-4">
            <label
              htmlFor="audit-log-search"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Tìm kiếm (path, ID, user)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="audit-log-search"
                name="auditLogSearch"
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="VD: /api/idols, users, req-..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-300 focus:ring-2 focus:ring-rose-500/15 outline-none text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-log-method"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Phương thức
            </label>
            <select
              id="audit-log-method"
              name="auditLogMethod"
              value={methodFilter}
              onChange={(event) => {
                setPage(1);
                setMethodFilter(event.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-300 outline-none text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Tất cả</option>
              <option value="POST">POST (Tạo/Gửi)</option>
              <option value="PUT">PUT (Cập nhật)</option>
              <option value="PATCH">PATCH (Sửa một phần)</option>
              <option value="DELETE">DELETE (Xóa)</option>
              <option value="GET">GET (Đọc)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-log-resource"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Tài nguyên
            </label>
            <select
              id="audit-log-resource"
              name="auditLogResource"
              value={resourceFilter}
              onChange={(event) => {
                const next = event.target.value;
                setPage(1);
                setResourceFilter(next);
                if (next === 'auth') setCategoryFilter('auth');
                else if (next !== 'all' && categoryFilter === 'auth') setCategoryFilter('data');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-300 outline-none text-xs font-semibold text-slate-700"
            >
              <option value="all">Tất cả tài nguyên</option>
              <option value="auth">auth</option>
              <option value="users">users</option>
              <option value="idols">idols</option>
              <option value="tasks">tasks</option>
              <option value="scores">scores</option>
              <option value="approvals">approvals</option>
              <option value="leave-requests">leave-requests</option>
              <option value="payroll">payroll</option>
              <option value="finance">finance</option>
              <option value="settings">settings</option>
              <option value="statuses">statuses</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-log-status-group"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Kết quả HTTP
            </label>
            <select
              id="audit-log-status-group"
              name="auditLogStatusGroup"
              value={statusGroupFilter}
              onChange={(event) => {
                setPage(1);
                setStatusGroupFilter(event.target.value as 'all' | '2xx' | '4xx_5xx');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-300 outline-none text-xs font-semibold text-slate-700"
            >
              <option value="all">Tất cả mã HTTP</option>
              <option value="2xx">Thành công (2xx)</option>
              <option value="4xx_5xx">Cảnh báo / Lỗi (4xx-5xx)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Lọc
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setAppliedSearch('');
                  setCategoryFilter('all');
                  setMethodFilter('ALL');
                  setResourceFilter('all');
                  setStatusGroupFilter('all');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Xóa bộ lọc"
                aria-label="Xóa bộ lọc"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range Row */}
          <div className="md:col-span-3">
            <label
              htmlFor="audit-log-from-date"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Từ ngày
            </label>
            <input
              id="audit-log-from-date"
              name="auditLogFromDate"
              type="date"
              value={fromDate}
              onChange={(event) => {
                setPage(1);
                setFromDate(event.target.value);
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-300 outline-none text-xs font-mono text-slate-700"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="audit-log-to-date"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
            >
              Đến ngày
            </label>
            <input
              id="audit-log-to-date"
              name="auditLogToDate"
              type="date"
              value={toDate}
              onChange={(event) => {
                setPage(1);
                setToDate(event.target.value);
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-300 outline-none text-xs font-mono text-slate-700"
            />
          </div>
        </form>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && !data ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <p className="text-xs font-semibold">Đang tải nhật ký hệ thống từ PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-1.5">
            <Activity className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Chưa có bản ghi nhật ký phù hợp</p>
            <p className="text-xs text-slate-500">
              Hệ thống tự động ghi lại các yêu cầu POST / PUT / PATCH / DELETE khi có thao tác phát sinh.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-3">Người thao tác</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-4">Đường dẫn & Tài nguyên</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {items.map((entry) => {
                  const methodClass = METHOD_BADGE_MAP[entry.method] || 'bg-slate-100 text-slate-700 border-slate-200';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatAuditTimestamp(entry.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {entry.actorName || entry.actorUsername || 'Hệ thống / Khách'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {entry.actorUsername ? `@${entry.actorUsername}` : 'anonymous'}
                          {entry.actorRole ? ` • ${entry.actorRole}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-bold ${methodClass}`}>
                          {entry.method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] font-semibold text-slate-800 break-all">
                          {entry.path}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-600">{entry.resource}</span>
                          {entry.resourceId ? ` • ID: ${entry.resourceId}` : ''}
                          {' • '}
                          <span className="font-mono">{entry.requestId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-bold ${getStatusBadgeClass(entry.statusCode)}`}>
                          HTTP {entry.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.total > 0 && (
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-slate-600">
              Hiển thị trang <span className="font-bold text-slate-900">{data.page}</span> /{' '}
              <span className="font-bold text-slate-900">{totalPages}</span> ({data.total} bản ghi)
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-entry-modal-title"
            className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 id="audit-entry-modal-title" className="text-sm font-extrabold text-slate-900">
                  Chi Tiết Nhật Ký Kiểm Toán
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{selectedEntry.requestId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                aria-label="Đóng chi tiết nhật ký"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Thời gian</span>
                  <p className="font-mono text-slate-800 mt-0.5">{formatAuditTimestamp(selectedEntry.createdAt)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Người thao tác</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedEntry.actorName || selectedEntry.actorUsername || 'Hệ thống'}
                    {selectedEntry.actorRole ? ` (${selectedEntry.actorRole})` : ''}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Endpoint</span>
                  <p className="font-mono text-slate-800 mt-0.5 break-all">
                    {selectedEntry.method} {selectedEntry.path} • HTTP {selectedEntry.statusCode}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Metadata đính kèm</span>
                <pre className="mt-1.5 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-64">
                  {JSON.stringify(selectedEntry.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
