import React, { useState, useEffect, useMemo } from 'react';
import { confirmDialog } from '../utils/uiFeedback.ts';
import { DateInput } from '../components/DateInput.tsx';
import { SearchableSelect } from '../components/SearchableSelect.tsx';
import { formatDateVN } from '../utils/dateUtils.ts';
import {
  Coins,
  TrendingUp,
  DollarSign,
  Briefcase,
  Gift,
  ShoppingBag,
  Mic2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Settings,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Info,
  Check,
  X,
  Building2,
  Layers,
  Percent,
  Sparkles,
  HelpCircle,
  Eye,
  CalendarClock
} from 'lucide-react';
import {
  RevenueTransaction,
  RevenueCategory,
  RevenuePlatform,
  RevenueDeductionItem,
  RevenueSummary,
  Idol,
  UserAccount,
  DEFAULT_BLANK_AVATAR
} from '../types/index.ts';
import { apiFetch } from '../services/api.ts';

const fetch = apiFetch;

interface RevenueManagementViewProps {
  idols: Idol[];
  currentUser: UserAccount | null;
  onNavigateToPayroll?: (period: string) => void;
}

export const RevenueManagementView: React.FC<RevenueManagementViewProps> = ({
  idols,
  currentUser,
  onNavigateToPayroll
}) => {
  // Periods
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('10');
  const currentPeriod = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

  // Data states
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [categories, setCategories] = useState<RevenueCategory[]>([]);
  const [platforms, setPlatforms] = useState<RevenuePlatform[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterPersonnel, setFilterPersonnel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<RevenueTransaction | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Notifications / Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catsRes, platsRes, txsRes, sumRes] = await Promise.all([
          fetch('/api/revenue/categories').then(r => r.json()),
          fetch('/api/revenue/platforms').then(r => r.json()),
          fetch(`/api/revenue/transactions?period=${currentPeriod}`).then(r => r.json()),
          fetch(`/api/revenue/summary/${currentPeriod}`).then(r => r.json())
        ]);

        if (Array.isArray(catsRes)) setCategories(catsRes);
        if (Array.isArray(platsRes)) setPlatforms(platsRes);
        if (Array.isArray(txsRes)) setTransactions(txsRes);
        if (sumRes && !sumRes.error) setSummary(sumRes);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
        showToast('Không thể tải dữ liệu doanh thu', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPeriod, refreshKey]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Category filter
      if (filterCategory !== 'all' && String(tx.categoryId) !== filterCategory) return false;
      // Platform filter
      if (filterPlatform !== 'all' && String(tx.platformId) !== filterPlatform) return false;
      // Personnel filter
      if (filterPersonnel !== 'all' && String(tx.personnelId) !== filterPersonnel) return false;
      // Status filter
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = tx.transactionCode?.toLowerCase().includes(q);
        const titleMatch = tx.title?.toLowerCase().includes(q);
        const nameMatch = tx.personnelName?.toLowerCase().includes(q) || tx.stageName?.toLowerCase().includes(q);
        const contractMatch = tx.contractRef?.toLowerCase().includes(q);
        return codeMatch || titleMatch || nameMatch || contractMatch;
      }

      return true;
    });
  }, [transactions, filterCategory, filterPlatform, filterPersonnel, filterStatus, searchQuery]);

  // Dynamic KPI calculations from active list
  const metrics = useMemo(() => {
    let gross = 0;
    let net = 0;
    let idolPayout = 0;
    let companyProfit = 0;
    let verifiedCount = 0;
    let syncedCount = 0;

    for (const tx of transactions) {
      if (tx.status !== 'cancelled') {
        gross += tx.grossAmount || 0;
        net += tx.netAmount || 0;
        idolPayout += tx.idolPayoutAmount || 0;
        companyProfit += tx.companyProfitAmount || 0;
      }
      if (tx.status === 'verified') verifiedCount++;
      if (tx.status === 'synced_to_payroll') syncedCount++;
    }

    return {
      gross,
      net,
      idolPayout,
      companyProfit,
      verifiedCount,
      syncedCount,
      totalCount: transactions.length
    };
  }, [transactions]);

  // Quick Action: Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!await confirmDialog('Bạn có chắc chắn muốn xóa giao dịch doanh thu này không?', 'Xóa giao dịch doanh thu')) return;
    try {
      const res = await fetch(`/api/revenue/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Đã xóa giao dịch thành công', 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        showToast('Lỗi khi xóa giao dịch', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xóa giao dịch', 'error');
    }
  };

  // Quick Action: Approve draft transaction
  const handleQuickApprove = async (tx: RevenueTransaction) => {
    try {
      const res = await fetch(`/api/revenue/transactions/${tx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' })
      });
      if (res.ok) {
        showToast(`Đã duyệt giao dịch ${tx.transactionCode}`, 'success');
        setRefreshKey(prev => prev + 1);
      } else {
        showToast('Không thể cập nhật trạng thái', 'error');
      }
    } catch {
      showToast('Lỗi kết nối', 'error');
    }
  };

  // 1-Click Sync to Payroll
  const handleSyncToPayroll = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/revenue/sync-to-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: currentPeriod })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đồng bộ thành công ${data.syncedCount} giao dịch sang ${data.updatedRecords} phiếu lương kỳ ${currentPeriod}!`, 'success');
        setIsSyncModalOpen(false);
        setRefreshKey(prev => prev + 1);
      } else {
        showToast(data.error || 'Lỗi đồng bộ sang bảng lương', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Helper: Get category icon
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase className="w-3.5 h-3.5" />;
      case 'ShoppingBag': return <ShoppingBag className="w-3.5 h-3.5" />;
      case 'Gift': return <Gift className="w-3.5 h-3.5" />;
      case 'Mic2': return <Mic2 className="w-3.5 h-3.5" />;
      default: return <Coins className="w-3.5 h-3.5" />;
    }
  };

  // Helper: Status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã duyệt
          </span>
        );
      case 'synced_to_payroll':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <RefreshCw className="w-3 h-3 text-sky-600" />
            Đã sync Lương
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
            <X className="w-3 h-3" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Chờ duyệt
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1700px] w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : toast.type === 'error'
            ? 'bg-rose-50 text-rose-900 border-rose-200'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* View Header with Period Selection */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Quản Lý Doanh Thu & Đối Soát Hoa Hồng
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Aura Talent OS
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Quản lý doanh số bán hàng, quà tặng PK, hợp đồng Booking & phân bổ thù lao Idol (Tùy biến linh hoạt, không hardcode)
              </p>
            </div>
          </div>
        </div>

        {/* Period Switcher & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Period Selection */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            <span className="text-slate-500 font-medium px-2">Kỳ:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>Tháng {m}</option>
              ))}
            </select>
            <span className="text-slate-400 px-1">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 shadow-2xs focus:outline-none cursor-pointer"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Quản lý danh mục nguồn thu và danh sách nền tảng (Động, không hardcode)"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Nguồn Thu & Nền Tảng</span>
          </button>

          {/* 1-Click Sync to Payroll */}
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Đồng bộ toàn bộ hoa hồng đã duyệt sang kỳ lương tương ứng"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            <span>Đồng Bộ Sang Lương</span>
            {metrics.verifiedCount > 0 && (
              <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {metrics.verifiedCount}
              </span>
            )}
          </button>

          {/* Add Transaction Button */}
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Giao Dịch</span>
          </button>
        </div>
      </div>

      {/* KHU VỰC A: 4 THẺ TỔNG QUAN TÀI CHÍNH (FINANCIAL KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gross Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">Tổng Doanh Thu Gộp (Gross)</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight font-mono">
            {metrics.gross.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Tổng giá trị phát sinh kỳ {currentPeriod}</span>
          </div>
        </div>

        {/* Net Inflow */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">Doanh Thu Ròng (Net Inflow)</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-emerald-700 tracking-tight font-mono">
            {metrics.net.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <span>Sau khi trừ phí sàn & chi phí</span>
          </div>
        </div>

        {/* Idol Payout */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-rose-700">Hoa Hồng Trả Idol</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Gift className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-rose-700 tracking-tight font-mono">
            {metrics.idolPayout.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Đồng bộ sang Bảng Lương</span>
            <span className="text-sky-600 font-semibold">{metrics.syncedCount}/{metrics.totalCount} đã sync</span>
          </div>
        </div>

        {/* Agency Margin */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-indigo-700">Lợi Nhuận Gộp Công Ty</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-indigo-700 tracking-tight font-mono">
            {metrics.companyProfit.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Biên lợi nhuận: {metrics.net > 0 ? ((metrics.companyProfit / metrics.net) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>
      </div>

      {/* KHU VỰC B: BỘ LỌC ĐA CHIỀU (MULTI-DIMENSIONAL FILTERS) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã GD, tên Idol, hợp đồng booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả nguồn thu</option>
            {categories.map(cat => (
              <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
            ))}
          </select>

          {/* Platform Filter */}
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả nền tảng</option>
            {platforms.map(p => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>

          {/* Personnel Filter */}
          <SearchableSelect value={filterPersonnel} onChange={setFilterPersonnel} ariaLabel="Tìm và lọc theo nghệ sĩ" placeholder="Tất cả nghệ sĩ" searchPlaceholder="Nhập tên nghệ sĩ..." className="w-48" options={[{ value: 'all', label: 'Tất cả nghệ sĩ' }, ...idols.map((idol) => ({ value: idol.id, label: idol.stageName || idol.realName, keywords: `${idol.realName} ${idol.department} ${idol.role}` }))]} />

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Chờ duyệt</option>
            <option value="verified">Đã duyệt</option>
            <option value="synced_to_payroll">Đã sync Lương</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          {(filterCategory !== 'all' || filterPlatform !== 'all' || filterPersonnel !== 'all' || filterStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterPlatform('all');
                setFilterPersonnel('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              title="Đặt lại bộ lọc"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KHU VỰC C: BẢNG DỮ LIỆU ĐỐI SOÁT CHI TIẾT (DATA GRID) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold tracking-wider">
                <th className="py-2.5 px-2 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 min-w-[110px]">Mã GD & Ngày</th>
                <th className="py-2.5 px-3 min-w-[160px]">Nghệ Sĩ / Idol</th>
                <th className="py-2.5 px-3 min-w-[130px]">Nguồn Thu</th>
                <th className="py-2.5 px-3 min-w-[110px]">Nền Tảng</th>
                <th className="py-2.5 px-3 min-w-[180px]">Chiến Dịch / Hợp Đồng</th>
                <th className="py-2.5 px-3 min-w-[105px] text-right">Doanh Thu Gộp</th>
                <th className="py-2.5 px-3 min-w-[95px] text-right">Khấu Trừ</th>
                <th className="py-2.5 px-3 min-w-[105px] text-right">Doanh Thu Ròng</th>
                <th className="py-2.5 px-3 min-w-[110px] text-center bg-rose-50/50 text-rose-900 border-l border-rose-200/60 font-bold">
                  % Chia Idol
                </th>
                <th className="py-2.5 px-3 min-w-[115px] text-right bg-rose-50/60 text-rose-900 border-l border-rose-200/60 font-bold">
                  Tiền Idol Nhận
                </th>
                <th className="py-2.5 px-3 min-w-[105px] text-right">Lãi Cty</th>
                <th className="py-2.5 px-3 min-w-[110px] text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Đang tải dữ liệu doanh thu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Coins className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-semibold text-slate-600">Chưa có giao dịch doanh thu nào</div>
                      <p className="text-[11px] text-slate-400">
                        Nhấn nút <strong>"+ Thêm Giao Dịch"</strong> ở trên để tạo giao dịch mới cho kỳ {currentPeriod}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const idol = idols.find(i => String(i.id) === String(tx.personnelId));
                  const isOverridden = Boolean(tx.rateOverrideReason);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* STT */}
                      <td className="py-2 px-2 text-center font-mono text-slate-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </td>

                      {/* Code & Date */}
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-slate-900 text-[11px]">{tx.transactionCode}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDateVN(tx.transactionDate)}</span>
                        </div>
                      </td>

                      {/* Personnel */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg overflow-hidden border border-rose-200 shrink-0 bg-slate-100">
                            <img
                              src={tx.avatarUrl || idol?.avatarUrl || DEFAULT_BLANK_AVATAR}
                              alt={tx.stageName || tx.personnelName || ''}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {tx.stageName || tx.personnelName || 'Chưa đặt tên'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {tx.department || idol?.department || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {getCategoryIcon(tx.categoryCode)}
                          <span className="truncate max-w-[120px]">{tx.categoryName || tx.categoryCode}</span>
                        </span>
                      </td>

                      {/* Platform */}
                      <td className="py-2 px-3">
                        <span className="text-[11px] font-medium text-slate-800">
                          {tx.platformName || tx.platformCode}
                        </span>
                      </td>

                      {/* Title & Ref */}
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1" title={tx.title}>
                          {tx.title}
                        </div>
                        {tx.contractRef && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            HĐ: {tx.contractRef}
                          </div>
                        )}
                      </td>

                      {/* Gross */}
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-700 tabular-nums">
                        {tx.grossAmount.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Deductions */}
                      <td className="py-2 px-3 text-right font-mono text-slate-500 tabular-nums">
                        {tx.totalDeductions > 0 ? (
                          <span className="text-rose-600" title={`Khấu trừ: ${tx.totalDeductions.toLocaleString('vi-VN')}đ`}>
                            -{tx.totalDeductions.toLocaleString('vi-VN')}đ
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Net */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {tx.netAmount.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Idol Share Rate - HIGHLIGHTED & EDITABLE */}
                      <td className="py-2 px-3 text-center bg-rose-50/30 border-l border-rose-100 font-mono">
                        <div className="inline-flex items-center gap-1 font-bold text-rose-700 text-xs">
                          <span>{tx.idolShareRate}%</span>
                          {isOverridden && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                              title={`Tỷ lệ đã chỉnh sửa so với mặc định: ${tx.rateOverrideReason}`}
                            />
                          )}
                        </div>
                        {isOverridden && (
                          <div className="text-[9px] text-amber-600 truncate max-w-[85px] mx-auto" title={tx.rateOverrideReason}>
                            Tùy chỉnh
                          </div>
                        )}
                      </td>

                      {/* Idol Payout */}
                      <td className="py-2 px-3 text-right bg-rose-50/40 border-l border-rose-100 font-mono font-extrabold text-rose-700 tabular-nums">
                        {tx.idolPayoutAmount.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Company Profit */}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-700 tabular-nums">
                        {tx.companyProfitAmount.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {renderStatusBadge(tx.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {tx.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(tx)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Duyệt giao dịch"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTx(tx);
                              setIsTxModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa giao dịch / Tỷ lệ chia"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa giao dịch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Hiển thị <strong>{filteredTransactions.length}</strong> / <strong>{transactions.length}</strong> giao dịch kỳ {currentPeriod}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Tổng hoa hồng Idol: <strong className="text-rose-700 font-mono">{metrics.idolPayout.toLocaleString('vi-VN')} VNĐ</strong></span>
            <span>•</span>
            <span>Lợi nhuận gộp Cty: <strong className="text-indigo-700 font-mono">{metrics.companyProfit.toLocaleString('vi-VN')} VNĐ</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM / CHỈNH SỬA GIAO DỊCH DOANH THU & BOOKING                      */}
      {/* ========================================================================= */}
      {isTxModalOpen && (
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => {
            setIsTxModalOpen(false);
            setEditingTx(null);
          }}
          transaction={editingTx}
          categories={categories}
          platforms={platforms}
          idols={idols}
          period={currentPeriod}
          onSuccess={() => {
            setIsTxModalOpen(false);
            setEditingTx(null);
            setRefreshKey(prev => prev + 1);
            showToast(editingTx ? 'Đã cập nhật giao dịch thành công' : 'Đã tạo giao dịch mới thành công', 'success');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL CẤU HÌNH ĐỘNG NGUỒN THU & NỀN TẢNG (ZERO-HARDCODING SETTINGS)       */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          categories={categories}
          platforms={platforms}
          onDataChanged={() => setRefreshKey(prev => prev + 1)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL XÁC NHẬN ĐỒNG BỘ SANG BẢNG LƯƠNG                                    */}
      {/* ========================================================================= */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Đồng Bộ Sang Bảng Lương
                </h3>
                <p className="text-xs text-slate-500">
                  Kỳ đối soát: <strong>{currentPeriod}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Số giao dịch hợp lệ chờ đồng bộ:</span>
                <strong className="text-slate-900">{metrics.verifiedCount + (transactions.filter(t => t.status === 'draft').length)} giao dịch</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tổng hoa hồng Idol sẽ chuyển sang lương:</span>
                <strong className="text-rose-700 font-mono">{metrics.idolPayout.toLocaleString('vi-VN')} VNĐ</strong>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                * Hệ thống sẽ tự động cập nhật vào các cột <code>commissionGmv</code> (Booking & Live Commerce) và <code>giftShare</code> (Quà tặng PK) trên bảng lương kỳ {currentPeriod}.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                disabled={syncing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSyncToPayroll}
                disabled={syncing}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{syncing ? 'Đang đồng bộ...' : 'Xác Nhận Đồng Bộ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: MODAL TẠO & CHỈNH SỬA GIAO DỊCH (TRANSACTION MODAL)
// =========================================================================
interface PaymentMilestone {
  id: string;
  title: string;
  percent: number;
  amount: number;
  period: string; // YYYY-MM
  paymentDate: string;
  isPaid: boolean;
}

function getNextPeriods(startPeriod: string, count: number): string[] {
  const parts = startPeriod.split('-');
  let y = parseInt(parts[0]) || 2025;
  let m = parseInt(parts[1]) || 10;
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: RevenueTransaction | null;
  categories: RevenueCategory[];
  platforms: RevenuePlatform[];
  idols: Idol[];
  period: string;
  onSuccess: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  platforms,
  idols,
  period,
  onSuccess
}) => {
  const [personnelId, setPersonnelId] = useState<string>(transaction ? String(transaction.personnelId) : (idols[0]?.id || '1'));
  const [categoryId, setCategoryId] = useState<string>(transaction ? String(transaction.categoryId) : (categories[0]?.id ? String(categories[0].id) : '1'));
  const [platformId, setPlatformId] = useState<string>(transaction ? String(transaction.platformId) : (platforms[0]?.id ? String(platforms[0].id) : '1'));
  const [title, setTitle] = useState<string>(transaction ? transaction.title : '');
  const [contractRef, setContractRef] = useState<string>(transaction?.contractRef || '');
  const [transactionDate, setTransactionDate] = useState<string>(transaction ? transaction.transactionDate : new Date().toISOString().split('T')[0]);

  const [payoutMode, setPayoutMode] = useState<'percentage' | 'fixed' | 'hybrid'>(transaction?.payoutMode || 'percentage');
  const [grossAmount, setGrossAmount] = useState<number>(transaction ? transaction.grossAmount : 20000000);
  const [fixedPayoutAmount, setFixedPayoutAmount] = useState<number>(transaction?.fixedPayoutAmount || 0);

  // TỶ LỆ CHIA IDOL CÓ THỂ CHỈNH SỬA LINH HOẠT
  const [idolShareRate, setIdolShareRate] = useState<number>(transaction ? transaction.idolShareRate : 70);
  const [rateOverrideReason, setRateOverrideReason] = useState<string>(transaction?.rateOverrideReason || '');

  // Deductions
  const [deductions, setDeductions] = useState<Array<{ name: string; deductionType: string; amount: number; proofUrl?: string }>>(
    transaction?.deductions?.map(d => ({ name: d.name, deductionType: d.deductionType, amount: d.amount, proofUrl: d.proofUrl })) || [
      { name: 'Phí sàn khấu trừ', deductionType: 'platform_fee', amount: 0 }
    ]
  );

  const [status, setStatus] = useState<string>(transaction?.status || 'verified');
  const [proofUrl, setProofUrl] = useState<string>(transaction?.proofUrl || '');
  const [notes, setNotes] = useState<string>(transaction?.notes || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Payment Milestones & Installments State
  const [scheduleType, setScheduleType] = useState<
    | 'single_before'
    | 'single_mid'
    | 'single_after'
    | 'two_tranches'
    | 'three_tranches'
    | 'monthly_3'
    | 'monthly_6'
    | 'monthly_12'
    | 'custom'
  >('single_before');

  const [milestones, setMilestones] = useState<PaymentMilestone[]>([
    {
      id: '1',
      title: 'Thanh toán Full trước chiến dịch (Cọc 100%)',
      percent: 100,
      amount: transaction ? transaction.netAmount : 20000000,
      period: transaction ? transaction.period : period,
      paymentDate: transaction ? transaction.transactionDate : new Date().toISOString().split('T')[0],
      isPaid: transaction ? transaction.status === 'verified' || transaction.status === 'synced_to_payroll' : true
    }
  ]);

  // Auto-apply platform fee rate when platform changes
  const handlePlatformChange = (pId: string) => {
    setPlatformId(pId);
    const plat = platforms.find(p => String(p.id) === pId);
    if (plat && plat.defaultFeeRate > 0) {
      const feeAmount = Math.round(grossAmount * (plat.defaultFeeRate / 100));
      setDeductions(prev => {
        const withoutPlat = prev.filter(d => d.deductionType !== 'platform_fee');
        return [{ name: `Phí sàn ${plat.name} (${plat.defaultFeeRate}%)`, deductionType: 'platform_fee', amount: feeAmount }, ...withoutPlat];
      });
    }
  };

  // Auto-suggest category share rate when category changes
  const handleCategoryChange = (cId: string) => {
    setCategoryId(cId);
    const cat = categories.find(c => String(c.id) === cId);
    if (cat && !transaction) {
      setIdolShareRate(cat.defaultIdolShareRate);
    }
  };

  // Live Calculations Preview
  const totalDeductions = useMemo(() => {
    return deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [deductions]);

  const netAmount = useMemo(() => {
    return Math.max(0, grossAmount - totalDeductions);
  }, [grossAmount, totalDeductions]);

  const previewCalculations = useMemo(() => {
    let idolPayout = 0;
    if (payoutMode === 'fixed') {
      idolPayout = fixedPayoutAmount;
    } else if (payoutMode === 'hybrid') {
      idolPayout = fixedPayoutAmount + (netAmount * (idolShareRate / 100));
    } else {
      idolPayout = netAmount * (idolShareRate / 100);
    }
    const companyProfit = Math.max(0, netAmount - idolPayout);
    return {
      idolPayout: Math.round(idolPayout),
      companyProfit: Math.round(companyProfit)
    };
  }, [netAmount, payoutMode, fixedPayoutAmount, idolShareRate]);

  // Update milestone amounts when netAmount changes
  const applySchedulePreset = (
    type:
      | 'single_before'
      | 'single_mid'
      | 'single_after'
      | 'two_tranches'
      | 'three_tranches'
      | 'monthly_3'
      | 'monthly_6'
      | 'monthly_12'
      | 'custom'
  ) => {
    setScheduleType(type);
    const total = netAmount;
    const nextMonths = getNextPeriods(period, 14);

    if (type === 'single_before') {
      setMilestones([
        {
          id: '1',
          title: 'Trả Full trước chiến dịch (Cọc 100%)',
          percent: 100,
          amount: total,
          period: nextMonths[0],
          paymentDate: transactionDate,
          isPaid: true
        }
      ]);
    } else if (type === 'single_mid') {
      setMilestones([
        {
          id: '1',
          title: 'Trả Full giữa chiến dịch (100%)',
          percent: 100,
          amount: total,
          period: nextMonths[0],
          paymentDate: transactionDate,
          isPaid: false
        }
      ]);
    } else if (type === 'single_after') {
      setMilestones([
        {
          id: '1',
          title: 'Trả Full sau chiến dịch (Nghiệm thu 100%)',
          percent: 100,
          amount: total,
          period: nextMonths[1] || nextMonths[0],
          paymentDate: transactionDate,
          isPaid: false
        }
      ]);
    } else if (type === 'two_tranches') {
      const half = Math.round(total / 2);
      setMilestones([
        {
          id: '1',
          title: 'Đợt 1: Tạm ứng trước khi chạy (50%)',
          percent: 50,
          amount: half,
          period: nextMonths[0],
          paymentDate: transactionDate,
          isPaid: true
        },
        {
          id: '2',
          title: 'Đợt 2: Quyết toán sau nghiệm thu (50%)',
          percent: 50,
          amount: total - half,
          period: nextMonths[1] || nextMonths[0],
          paymentDate: transactionDate,
          isPaid: false
        }
      ]);
    } else if (type === 'three_tranches') {
      const m1 = Math.round(total * 0.3);
      const m2 = Math.round(total * 0.4);
      const m3 = total - m1 - m2;
      setMilestones([
        {
          id: '1',
          title: 'Đợt 1: Cọc khi ký HĐ (30% Trước)',
          percent: 30,
          amount: m1,
          period: nextMonths[0],
          paymentDate: transactionDate,
          isPaid: true
        },
        {
          id: '2',
          title: 'Đợt 2: Thanh toán giữa chiến dịch (40%)',
          percent: 40,
          amount: m2,
          period: nextMonths[1] || nextMonths[0],
          paymentDate: transactionDate,
          isPaid: false
        },
        {
          id: '3',
          title: 'Đợt 3: Quyết toán sau nghiệm thu (30% Sau)',
          percent: 30,
          amount: m3,
          period: nextMonths[2] || nextMonths[0],
          paymentDate: transactionDate,
          isPaid: false
        }
      ]);
    } else if (type === 'monthly_3' || type === 'monthly_6' || type === 'monthly_12') {
      const count = type === 'monthly_3' ? 3 : type === 'monthly_6' ? 6 : 12;
      const periods = getNextPeriods(period, count);
      const perMonth = Math.round(total / count);
      let remainder = total;
      const list: PaymentMilestone[] = [];
      for (let i = 0; i < count; i++) {
        const amt = i === count - 1 ? remainder : perMonth;
        remainder -= amt;
        list.push({
          id: String(i + 1),
          title: `Đợt ${i + 1}: Thuê tháng ${i + 1}/${count}`,
          percent: +(100 / count).toFixed(1),
          amount: amt,
          period: periods[i],
          paymentDate: transactionDate,
          isPaid: i === 0
        });
      }
      setMilestones(list);
    }
  };

  const handleAddMilestone = () => {
    setScheduleType('custom');
    const count = milestones.length + 1;
    const nextMonths = getNextPeriods(period, count + 2);
    setMilestones(prev => [
      ...prev,
      {
        id: String(Date.now()),
        title: `Đợt ${count}: Thanh toán bổ sung`,
        percent: 0,
        amount: 0,
        period: nextMonths[count - 1] || period,
        paymentDate: transactionDate,
        isPaid: false
      }
    ]);
  };

  const handleRemoveMilestone = (idx: number) => {
    if (milestones.length <= 1) return;
    setScheduleType('custom');
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề giao dịch / hợp đồng booking');
      return;
    }
    setError('');
    setSubmitting(true);

    if (milestones.length <= 1) {
      const m = milestones[0];
      const payload = {
        personnelId: Number(personnelId),
        period: m ? m.period : period,
        transactionDate: m?.paymentDate || transactionDate,
        categoryId: Number(categoryId),
        platformId: Number(platformId),
        title: title.trim(),
        contractRef: contractRef.trim() || undefined,
        payoutMode,
        grossAmount,
        totalDeductions,
        netAmount,
        idolShareRate,
        fixedPayoutAmount,
        rateOverrideReason: rateOverrideReason.trim() || undefined,
        status: m ? (m.isPaid ? 'verified' : 'draft') : status,
        proofUrl: proofUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        deductions: deductions.filter(d => (d.amount || 0) > 0)
      };

      try {
        const url = transaction ? `/api/revenue/transactions/${transaction.id}` : '/api/revenue/transactions';
        const method = transaction ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          onSuccess();
        } else {
          const data = await res.json();
          setError(data.error || 'Lỗi khi lưu giao dịch');
        }
      } catch {
        setError('Lỗi kết nối máy chủ');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Multiple milestones for long-term contract
      const sharedContractRef = contractRef.trim() || `HĐ-${Date.now().toString().slice(-6)}`;
      try {
        for (const m of milestones) {
          const mGross = Math.round(grossAmount * (m.percent / 100));
          const mDeductions = Math.round(totalDeductions * (m.percent / 100));
          const mNet = m.amount;

          let mIdolPayout = 0;
          if (payoutMode === 'fixed') {
            mIdolPayout = Math.round(fixedPayoutAmount * (m.percent / 100));
          } else if (payoutMode === 'hybrid') {
            mIdolPayout = Math.round((fixedPayoutAmount * (m.percent / 100)) + (mNet * (idolShareRate / 100)));
          } else {
            mIdolPayout = Math.round(mNet * (idolShareRate / 100));
          }

          const payload = {
            personnelId: Number(personnelId),
            period: m.period,
            transactionDate: m.paymentDate || transactionDate,
            categoryId: Number(categoryId),
            platformId: Number(platformId),
            title: `${title.trim()} (${m.title})`,
            contractRef: sharedContractRef,
            payoutMode,
            grossAmount: mGross,
            totalDeductions: mDeductions,
            netAmount: mNet,
            idolShareRate,
            fixedPayoutAmount: payoutMode === 'fixed' ? mIdolPayout : 0,
            rateOverrideReason: rateOverrideReason.trim() || undefined,
            status: m.isPaid ? 'verified' : 'draft',
            proofUrl: proofUrl.trim() || undefined,
            notes: `${notes.trim() ? notes + ' • ' : ''}Thuộc hợp đồng dài hạn / thanh toán theo đợt (${sharedContractRef})`,
            deductions: []
          };

          await fetch('/api/revenue/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        onSuccess();
      } catch {
        setError('Lỗi khi lưu các đợt thanh toán hợp đồng');
      } finally {
        setSubmitting(false);
      }
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in">
        <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {transaction ? `Chỉnh Sửa Giao Dịch: ${transaction.transactionCode}` : 'Thêm Mới Giao Dịch Doanh Thu & Booking'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. THÔNG TIN CHUNG */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1. Thông Tin Nghệ Sĩ & Phân Loại
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nghệ Sĩ / Idol *</label>
                <select
                  value={personnelId}
                  onChange={(e) => setPersonnelId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:bg-white"
                >
                  {idols.map(idol => (
                    <option key={idol.id} value={idol.id}>
                      {idol.stageName || idol.realName} ({idol.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nguồn Thu (Category) *</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:bg-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nền Tảng (Platform) *</label>
                <select
                  value={platformId}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:bg-white"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name} (Phí ~{p.defaultFeeRate}%)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tiêu Đề / Tên Chiến Dịch Booking *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Livestream TikTok Shop Chiến Dịch 10.10, Review Asus ROG..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ngày Diễn Ra *</label>
                  <DateInput
                  value={transactionDate}
                  onChange={setTransactionDate}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Số Hợp Đồng / Mã Đối Soát Sàn</label>
                <input
                  type="text"
                  placeholder="HD-2025-BRAND-01, TT-SHOP-9988..."
                  value={contractRef}
                  onChange={(e) => setContractRef(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Link Chứng Từ / Hóa Đơn</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* 2. SỐ LIỆU TÀI CHÍNH & KHẤU TRỪ */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              2. Doanh Thu Gộp & Các Khoản Khấu Trừ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Doanh Thu Gộp (Gross Amount) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">đ</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Doanh Thu Ròng Thực Nhận (Net Cash)</label>
                <div className="px-3 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-xl font-mono font-bold text-emerald-800 flex items-center justify-between">
                  <span>{netAmount.toLocaleString('vi-VN')}</span>
                  <span className="text-[10px] font-normal text-emerald-600">VNĐ (Đã trừ chi phí)</span>
                </div>
              </div>
            </div>

            {/* Deductions Items List */}
            <div className="space-y-2 bg-slate-50/60 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Các khoản chi phí / Phí sàn khấu trừ:</span>
                <button
                  type="button"
                  onClick={() => setDeductions(prev => [...prev, { name: 'Chi phí phát sinh', deductionType: 'production_cost', amount: 0 }])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm dòng chi phí</span>
                </button>
              </div>

              {deductions.map((ded, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên chi phí (vd: Phí sàn TikTok, Makeup, Quay dựng...)"
                    value={ded.name}
                    onChange={(e) => {
                      const updated = [...deductions];
                      updated[index].name = e.target.value;
                      setDeductions(updated);
                    }}
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                  <div className="relative w-36">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      placeholder="Số tiền"
                      value={ded.amount}
                      onChange={(e) => {
                        const updated = [...deductions];
                        updated[index].amount = Math.max(0, Number(e.target.value) || 0);
                        setDeductions(updated);
                      }}
                      className="w-full pl-2 pr-6 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">đ</span>
                  </div>
                  {deductions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDeductions(prev => prev.filter((_, i) => i !== index))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* 3. CƠ CHẾ PHÂN CHIA THÙ LAO IDOL (HOÀN TOÀN TÙY CHỈNH THEO YÊU CẦU NGƯỜI DÙNG) */}
          <div className="space-y-3 bg-rose-50/20 p-3.5 rounded-2xl border border-rose-200/80">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-600" />
                <span>3. Cơ Chế Phân Chia Thù Lao Idol (Chỉnh Sửa Linh Hoạt)</span>
              </div>
              <span className="text-[10px] text-rose-600 font-semibold bg-rose-100/60 px-2 py-0.5 rounded-full">
                Không Hardcode
              </span>
            </div>

            {/* Payout Mode radio */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMode"
                  value="percentage"
                  checked={payoutMode === 'percentage'}
                  onChange={() => setPayoutMode('percentage')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Chia theo tỷ lệ %</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMode"
                  value="fixed"
                  checked={payoutMode === 'fixed'}
                  onChange={() => setPayoutMode('fixed')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Cát-sê cố định</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMode"
                  value="hybrid"
                  checked={payoutMode === 'hybrid'}
                  onChange={() => setPayoutMode('hybrid')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Kết hợp (Cố định + % Chia)</span>
              </label>
            </div>

            {/* Tỷ lệ % chia cho Idol (TÙY CHỈNH TRỰC TIẾP TẠI ĐÂY) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {(payoutMode === 'percentage' || payoutMode === 'hybrid') && (
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 mb-1 flex items-center justify-between">
                    <span>Tỷ Lệ Chia % Cho Idol:</span>
                    <span className="text-[10px] font-normal text-rose-600">Có thể chỉnh sửa theo deal</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={idolShareRate}
                      onChange={(e) => setIdolShareRate(Number(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-1.5 bg-white border border-rose-300 rounded-xl font-mono font-black text-rose-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-rose-600">%</span>
                  </div>
                </div>
              )}

              {(payoutMode === 'fixed' || payoutMode === 'hybrid') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Cát-Sê Cố Định (Fixed Fee):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={fixedPayoutAmount}
                      onChange={(e) => setFixedPayoutAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">đ</span>
                  </div>
                </div>
              )}

              <div className={payoutMode === 'fixed' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Lý Do Điều Chỉnh Tỷ Lệ (nếu có):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thỏa thuận riêng quay ngoại cảnh vất vả, chiến dịch Tết theo quyết định Giám Đốc..."
                  value={rateOverrideReason}
                  onChange={(e) => setRateOverrideReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs grid grid-cols-2 gap-3 text-xs">
              <div className="border-r border-slate-100 pr-3">
                <div className="text-[11px] text-slate-500 font-semibold mb-0.5">Tiền Idol Thực Nhận (Đẩy sang Lương):</div>
                <div className="text-base font-black text-rose-700 font-mono">
                  {previewCalculations.idolPayout.toLocaleString('vi-VN')} <span className="text-xs font-normal">VNĐ</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {payoutMode === 'fixed' ? 'Thù lao trọn gói' : `${idolShareRate}% trên doanh thu ròng`}
                </div>
              </div>

              <div className="pl-1">
                <div className="text-[11px] text-slate-500 font-semibold mb-0.5">Lợi Nhuận Gộp Công Ty:</div>
                <div className="text-base font-black text-indigo-700 font-mono">
                  {previewCalculations.companyProfit.toLocaleString('vi-VN')} <span className="text-xs font-normal">VNĐ</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Net - Tiền Idol nhận
                </div>
              </div>
            </div>
          </div>

          {/* 4. TIẾN ĐỘ & HÌNH THỨC THANH TOÁN CỦA NHÃN HÀNG (MILESTONES & TRANCHES) */}
          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>4. Tiến Độ & Hình Thức Thanh Toán Của Nhãn Hàng</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Trả 1 lần (Trước/Giữa/Sau), 2-3 đợt, hoặc theo tháng
              </span>
            </div>

            {/* Presets by groups */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Trả Full:</span>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('single_before')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'single_before'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟢 Full Trước (Cọc 100%)
                </button>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('single_mid')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'single_mid'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟡 Full Giữa Chiến Dịch (100%)
                </button>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('single_after')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'single_after'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🔵 Full Sau Nghiệm Thu (100%)
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 shrink-0">Nhiều Đợt:</span>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('two_tranches')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'two_tranches'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Trả 2 Đợt (50% - 50%)
                </button>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('three_tranches')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'three_tranches'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Trả 3 Đợt (30% - 40% - 30%)
                </button>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('monthly_3')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'monthly_3'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Theo Tháng (3 Tháng)
                </button>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('monthly_6')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'monthly_6'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Theo Tháng (6 Tháng)
                </button>
                <button
                  type="button"
                  onClick={() => applySchedulePreset('monthly_12')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    scheduleType === 'monthly_12'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cả Năm (12 Tháng)
                </button>
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm Đợt</span>
                </button>
              </div>
            </div>

            {/* Milestones List Table */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] text-slate-600 font-semibold flex items-center justify-between">
                <span>Phân bổ chi tiết đợt thanh toán ({milestones.length} đợt):</span>
                <span className="text-[10px] text-indigo-600 font-normal">
                  * Chỉ đợt [💵 Đã nhận tiền] mới sẵn sàng đồng bộ vào Lương của tháng đó
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <th className="py-1.5 px-2.5">Tên Đợt</th>
                      <th className="py-1.5 px-2 text-right">Tỷ Trọng %</th>
                      <th className="py-1.5 px-2 text-right">Số Tiền (Net)</th>
                      <th className="py-1.5 px-2 text-center">Gắn Kỳ Lương</th>
                      <th className="py-1.5 px-2 text-center">Tiền Brand Về</th>
                      <th className="py-1.5 px-2 text-right">Idol Nhận</th>
                      <th className="py-1.5 px-2 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {milestones.map((m, idx) => {
                      const mIdolPayout = Math.round(m.amount * (idolShareRate / 100));
                      const availablePeriods = getNextPeriods(period, 14);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2.5 font-medium text-slate-900">
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) => {
                                const updated = [...milestones];
                                updated[idx].title = e.target.value;
                                setMilestones(updated);
                              }}
                              className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <div className="inline-flex items-center justify-end">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={m.percent}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  const updated = [...milestones];
                                  updated[idx].percent = val;
                                  updated[idx].amount = Math.round(netAmount * (val / 100));
                                  setMilestones(updated);
                                }}
                                className="w-10 text-right font-mono text-slate-700 bg-transparent border-b border-slate-200 focus:border-indigo-500 focus:outline-none"
                              />
                              <span className="text-slate-400 text-[10px] ml-0.5">%</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">
                            <div className="inline-flex items-center justify-end">
                              <input
                                type="number"
                                min="0"
                                step="10000"
                                value={m.amount}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  const updated = [...milestones];
                                  updated[idx].amount = val;
                                  if (netAmount > 0) {
                                    updated[idx].percent = +(val / netAmount * 100).toFixed(1);
                                  }
                                  setMilestones(updated);
                                }}
                                className="w-24 text-right font-mono font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-indigo-500 focus:outline-none"
                              />
                              <span className="text-slate-400 text-[10px] ml-0.5">đ</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <select
                              value={m.period}
                              onChange={(e) => {
                                const updated = [...milestones];
                                updated[idx].period = e.target.value;
                                setMilestones(updated);
                              }}
                              className="px-1.5 py-0.5 font-mono font-bold rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200 focus:bg-white cursor-pointer"
                            >
                              {availablePeriods.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...milestones];
                                updated[idx].isPaid = !updated[idx].isPaid;
                                setMilestones(updated);
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                m.isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {m.isPaid ? '💵 Đã nhận tiền' : '⏳ Chờ Brand trả'}
                            </button>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700">
                            {mIdolPayout.toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {milestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMilestone(idx)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="Xóa đợt này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. TRẠNG THÁI & GHI CHÚ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trạng Thái Đối Soát</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
              >
                <option value="draft">⏳ Chờ duyệt đối soát (Draft)</option>
                <option value="verified">✅ Đã duyệt hợp lệ (Sẵn sàng sync Lương)</option>
                <option value="synced_to_payroll">🔄 Đã đồng bộ sang Bảng Lương</option>
                <option value="cancelled">❌ Đã hủy</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ghi Chú Kế Toán</label>
              <input
                type="text"
                placeholder="Ghi chú thêm về điều khoản thanh toán..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Đang lưu...' : (transaction ? 'Cập Nhật Giao Dịch' : 'Tạo Giao Dịch')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: MODAL QUẢN LÝ DANH MỤC ĐỘNG NGUỒN THU & NỀN TẢNG (ZERO-HARDCODE)
// =========================================================================
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: RevenueCategory[];
  platforms: RevenuePlatform[];
  onDataChanged: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  platforms,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'platforms'>('categories');

  // Category edit state
  const [editingCategory, setEditingCategory] = useState<Partial<RevenueCategory> | null>(null);
  // Platform edit state
  const [editingPlatform, setEditingPlatform] = useState<Partial<RevenuePlatform> | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSaveCategory = async () => {
    if (!editingCategory?.name?.trim()) return;
    setSaving(true);
    try {
      const isNew = !editingCategory.id;
      const url = isNew ? '/api/revenue/categories' : `/api/revenue/categories/${editingCategory.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory)
      });
      if (res.ok) {
        setEditingCategory(null);
        setMsg({ text: 'Đã lưu danh mục nguồn thu thành công', type: 'success' });
        onDataChanged();
      } else {
        setMsg({ text: 'Lỗi khi lưu danh mục', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Lỗi kết nối', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlatform = async () => {
    if (!editingPlatform?.name?.trim()) return;
    setSaving(true);
    try {
      const isNew = !editingPlatform.id;
      const url = isNew ? '/api/revenue/platforms' : `/api/revenue/platforms/${editingPlatform.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlatform)
      });
      if (res.ok) {
        setEditingPlatform(null);
        setMsg({ text: 'Đã lưu nền tảng thành công', type: 'success' });
        onDataChanged();
      } else {
        setMsg({ text: 'Lỗi khi lưu nền tảng', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Lỗi kết nối', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!await confirmDialog('Bạn có chắc chắn muốn xóa/vô hiệu hóa nguồn thu này?', 'Xóa nguồn thu')) return;
    try {
      const res = await fetch(`/api/revenue/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onDataChanged();
        setMsg({ text: 'Đã cập nhật trạng thái nguồn thu', type: 'success' });
      }
    } catch {
      setMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleDeletePlatform = async (id: number) => {
    if (!await confirmDialog('Bạn có chắc chắn muốn xóa/vô hiệu hóa nền tảng này?', 'Xóa nền tảng')) return;
    try {
      const res = await fetch(`/api/revenue/platforms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onDataChanged();
        setMsg({ text: 'Đã cập nhật trạng thái nền tảng', type: 'success' });
      }
    } catch {
      setMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in flex flex-col max-h-[85vh]">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Quản Trị Danh Mục Nguồn Thu & Nền Tảng (Không Hardcode)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-5 pt-2 text-xs font-semibold gap-4 bg-slate-50/50">
          <button
            type="button"
            onClick={() => { setActiveTab('categories'); setEditingCategory(null); }}
            className={`pb-2.5 cursor-pointer transition-colors border-b-2 ${
              activeTab === 'categories'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh Mục Nguồn Thu ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('platforms'); setEditingPlatform(null); }}
            className={`pb-2.5 cursor-pointer transition-colors border-b-2 ${
              activeTab === 'platforms'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh Mục Nền Tảng ({platforms.length})
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {msg && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {msg.text}
            </div>
          )}

          {/* TAB 1: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Thêm nguồn thu mới bất kỳ lúc nào để phân loại doanh thu tự động.
                </span>
                {!editingCategory && (
                  <button
                    type="button"
                    onClick={() => setEditingCategory({ name: '', defaultIdolShareRate: 70, isActive: true, displayOrder: categories.length + 1 })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm Nguồn Mới</span>
                  </button>
                )}
              </div>

              {/* Edit form */}
              {editingCategory && (
                <div className="p-3 bg-rose-50/30 border border-rose-200 rounded-xl space-y-2.5">
                  <div className="font-bold text-rose-900 text-xs">
                    {editingCategory.id ? 'Sửa Nguồn Thu' : 'Thêm Nguồn Thu Mới'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Tên Nguồn Thu *</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Bán Vé Fan Meeting, Merchandise..."
                        value={editingCategory.name || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">% Chia Idol Mặc Định Gợi Ý</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingCategory.defaultIdolShareRate || 70}
                        onChange={(e) => setEditingCategory({ ...editingCategory, defaultIdolShareRate: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCategory}
                      disabled={saving}
                      className="px-3 py-1 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
                    >
                      Lưu Nguồn Thu
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {categories.map(cat => (
                  <div key={cat.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        {!cat.isActive && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded">Tạm ẩn</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Mã: <code>{cat.code}</code> • % Gợi ý mặc định: <strong>{cat.defaultIdolShareRate}%</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(cat)}
                        className="p-1 text-slate-400 hover:text-sky-600 rounded"
                        title="Sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Xóa/Ẩn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORMS */}
          {activeTab === 'platforms' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Cấu hình % Phí sàn mặc định tự động áp dụng khi nhập giao dịch.
                </span>
                {!editingPlatform && (
                  <button
                    type="button"
                    onClick={() => setEditingPlatform({ name: '', defaultFeeRate: 0, isActive: true })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm Nền Tảng</span>
                  </button>
                )}
              </div>

              {/* Edit form */}
              {editingPlatform && (
                <div className="p-3 bg-rose-50/30 border border-rose-200 rounded-xl space-y-2.5">
                  <div className="font-bold text-rose-900 text-xs">
                    {editingPlatform.id ? 'Sửa Nền Tảng' : 'Thêm Nền Tảng Mới'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">Tên Nền Tảng *</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: TikTok Shop, Bigo, Shopee..."
                        value={editingPlatform.name || ''}
                        onChange={(e) => setEditingPlatform({ ...editingPlatform, name: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">% Phí Sàn Mặc Định</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editingPlatform.defaultFeeRate || 0}
                        onChange={(e) => setEditingPlatform({ ...editingPlatform, defaultFeeRate: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingPlatform(null)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePlatform}
                      disabled={saving}
                      className="px-3 py-1 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
                    >
                      Lưu Nền Tảng
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {platforms.map(plat => (
                  <div key={plat.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900">{plat.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Mã: <code>{plat.code}</code> • Phí sàn mặc định: <strong className="text-rose-600 font-mono">{plat.defaultFeeRate}%</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingPlatform(plat)}
                        className="p-1 text-slate-400 hover:text-sky-600 rounded"
                        title="Sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlatform(plat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Xóa/Ẩn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
