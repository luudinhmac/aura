import React, { useState, useEffect, useMemo } from 'react';
import { confirmDialog } from '../utils/uiFeedback.ts';
import { DateInput } from '../components/DateInput.tsx';
import { formatDateVN, getTodayIsoDate } from '../utils/dateUtils.ts';
import {
  Coins,
  TrendingUp,
  DollarSign,
  Briefcase,
  Building2,
  Layers,
  Percent,
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
  Check,
  X,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Calendar,
  Wallet,
  Receipt,
  PieChart,
  HardDrive,
  Wrench,
  Car,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import {
  UserAccount,
  CompanyExpense,
  CompanyExpenseCategory,
  FinancePnLSummary,
  FinanceTrendPoint,
  FinanceTrendData
  , ServiceUsageRecord
} from '../types/index.ts';
import { api } from '../services/api.ts';

interface FinanceManagementViewProps {
  currentUser: UserAccount;
  referenceDate?: string;
}

export const FinanceManagementView: React.FC<FinanceManagementViewProps> = ({
  currentUser,
  referenceDate
}) => {
  // 1. Quản lý thời gian & phạm vi thống kê
  const [scope, setScope] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const currentReferenceDate = getTodayIsoDate(referenceDate);

  // Khởi tạo năm và tháng mặc định theo referenceDate của hệ thống
  const defaultYear = useMemo(() => {
    if (currentReferenceDate.length >= 4) return currentReferenceDate.slice(0, 4);
    return '2025';
  }, [currentReferenceDate]);

  const defaultMonth = useMemo(() => {
    if (currentReferenceDate.length >= 7) return currentReferenceDate.slice(5, 7);
    return '10';
  }, [currentReferenceDate]);

  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const qNum = Math.ceil(Number(defaultMonth) / 3);
    return `${defaultYear}-Q${qNum}`;
  });

  // Đồng bộ lại khi referenceDate thay đổi từ settings
  useEffect(() => {
    if (currentReferenceDate.length >= 7) {
      const y = currentReferenceDate.slice(0, 4);
      const m = currentReferenceDate.slice(5, 7);
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedQuarter(`${y}-Q${Math.ceil(Number(m) / 3)}`);
    }
  }, [currentReferenceDate]);

  const periodRef = useMemo(() => {
    if (scope === 'month') return `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
    if (scope === 'quarter') return selectedQuarter;
    if (scope === 'year') return selectedYear;
    return 'ALL';
  }, [scope, selectedYear, selectedMonth, selectedQuarter]);

  // 2. Data states
  const [pnlSummary, setPnlSummary] = useState<FinancePnLSummary | null>(null);
  const [trendData, setTrendData] = useState<FinanceTrendData | null>(null);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'charts' | 'expenses' | 'breakdown'>('pnl');

  // Chart view states
  const [chartMetric, setChartMetric] = useState<'all' | 'revenue' | 'expenses' | 'profit'>('all');
  const [chartType, setChartType] = useState<'bar' | 'trend' | 'table'>('bar');
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<FinanceTrendPoint | null>(null);

  // Filters for expenses tab
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFacility, setFilterFacility] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [serviceUsageQueue, setServiceUsageQueue] = useState<ServiceUsageRecord[]>([]);

  // Modal Expense Form
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
  const [expenseFormData, setExpenseFormData] = useState<{
    period: string;
    expenseDate: string;
    category: CompanyExpenseCategory;
    title: string;
    amount: number;
    facilityType?: 'fixed' | 'rented' | null;
    paymentMethod: 'bank_transfer' | 'cash';
    recipient: string;
    invoiceRef: string;
    proofUrl: string;
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    notes: string;
  }>({
    period: '2025-10',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: 'FACILITY',
    title: '',
    amount: 0,
    facilityType: 'rented',
    paymentMethod: 'bank_transfer',
    recipient: '',
    invoiceRef: '',
    proofUrl: '',
    status: 'paid',
    notes: ''
  });

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch financial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const targetPeriod = scope === 'month' ? periodRef : `${selectedYear}-10`;
      const [pnlRes, expRes, trendRes, serviceQueue] = await Promise.all([
        api.getFinancePnLSummary(scope, periodRef),
        api.getCompanyExpenses({
          period: scope === 'month' ? periodRef : undefined
        }),
        api.getFinanceTrendSeries(targetPeriod, 6),
        api.getServiceUsageAccountingRecords()
      ]);
      setPnlSummary(pnlRes);
      setExpenses(expRes);
      setTrendData(trendRes);
      setServiceUsageQueue(serviceQueue);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải dữ liệu tài chính', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmServicePayment = async (record: ServiceUsageRecord) => {
    const input = window.prompt(`Số tiền thanh toán cho ${record.usageCode}:`, String(record.outstandingAmount));
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) { showToast('Số tiền thanh toán phải lớn hơn 0', 'error'); return; }
    try { await api.confirmServiceUsagePayment(record.id, { amount }); showToast('Đã ghi nhận thanh toán dịch vụ ngoài'); fetchData(); }
    catch (err: any) { showToast(err.message || 'Không thể xác nhận thanh toán', 'error'); }
  };

  useEffect(() => {
    fetchData();
  }, [scope, periodRef]);

  // Open add modal
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseFormData({
      period: scope === 'month' ? periodRef : `${selectedYear}-${selectedMonth.padStart(2, '0')}`,
      expenseDate: new Date().toISOString().slice(0, 10),
      category: 'FACILITY',
      title: '',
      amount: 0,
      facilityType: 'rented',
      paymentMethod: 'bank_transfer',
      recipient: '',
      invoiceRef: '',
      proofUrl: '',
      status: 'paid',
      notes: ''
    });
    setIsExpenseModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditExpense = (item: CompanyExpense) => {
    setEditingExpense(item);
    setExpenseFormData({
      period: item.period,
      expenseDate: item.expenseDate,
      category: item.category,
      title: item.title,
      amount: item.amount,
      facilityType: item.facilityType || null,
      paymentMethod: item.paymentMethod,
      recipient: item.recipient || '',
      invoiceRef: item.invoiceRef || '',
      proofUrl: item.proofUrl || '',
      status: item.status,
      notes: item.notes || ''
    });
    setIsExpenseModalOpen(true);
  };

  // Submit expense form
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.title.trim()) {
      showToast('Vui lòng nhập tên khoản chi', 'error');
      return;
    }
    if (expenseFormData.amount <= 0) {
      showToast('Số tiền chi phải lớn hơn 0', 'error');
      return;
    }

    try {
      setActionLoading(true);
      if (editingExpense) {
        await api.updateCompanyExpense(editingExpense.id, expenseFormData);
        showToast('Đã cập nhật khoản chi thành công');
      } else {
        await api.createCompanyExpense({
          ...expenseFormData,
          createdById: currentUser.id ? Number(currentUser.id) : undefined
        });
        showToast('Đã ghi nhận phiếu chi mới thành công');
      }
      setIsExpenseModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu khoản chi', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: string, title: string) => {
    if (!await confirmDialog(`Bạn có chắc chắn muốn xóa khoản chi: "${title}"?`, 'Xóa khoản chi')) return;
    try {
      setActionLoading(true);
      await api.deleteCompanyExpense(id);
      showToast('Đã xóa khoản chi');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa khoản chi', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchSearch =
        !expenseSearch.trim() ||
        exp.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.expenseCode.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (exp.recipient && exp.recipient.toLowerCase().includes(expenseSearch.toLowerCase()));

      const matchCategory = filterCategory === 'all' || exp.category === filterCategory;
      const matchFacility = filterFacility === 'all' || exp.facilityType === filterFacility;
      const matchStatus = filterStatus === 'all' || exp.status === filterStatus;

      return matchSearch && matchCategory && matchFacility && matchStatus;
    });
  }, [expenses, expenseSearch, filterCategory, filterFacility, filterStatus]);

  // Export CSV
  const handleExportCSV = () => {
    if (!pnlSummary) return;
    const rows = [
      ['BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH & TÀI CHÍNH (P&L)', 'AURA TALENT MANAGEMENT'],
      ['Kỳ Báo Cáo', `${scope.toUpperCase()} - ${periodRef}`],
      ['Thời gian xuất', new Date().toLocaleString('vi-VN')],
      [],
      ['HẠNG MỤC', 'SỐ TIỀN (VNĐ)', 'TỶ TRỌNG (%)'],
      ['I. TỔNG DOANH THU THUẦN', pnlSummary.revenue.netRevenue, '100%'],
      ['-- Doanh thu Booking Nhãn hàng', pnlSummary.revenue.byCategory.booking, ''],
      ['-- Doanh thu Live Commerce (Affiliate/GMV)', pnlSummary.revenue.byCategory.liveCommerce, ''],
      ['-- Doanh thu Quà tặng & PK Donate', pnlSummary.revenue.byCategory.pkDonate, ''],
      ['-- Doanh thu Dịch vụ ngoài (Studio/quay chụp)', pnlSummary.revenue.byCategory.externalService, ''],
      ['II. CHI PHÍ TRỰC TIẾP TẠO DOANH THU (COGS)', pnlSummary.directCost.totalDirectCost, ''],
      ['-- Thù lao chia sẻ cho Idol/Talent', pnlSummary.directCost.idolPayout, ''],
      ['III. LỢI NHUẬN GỘP (GROSS PROFIT)', pnlSummary.grossProfit, `${pnlSummary.grossMarginPercent}%`],
      ['IV. CHI PHÍ HOẠT ĐỘNG VẬN HÀNH (OPEX)', pnlSummary.expenses.totalOpEx, ''],
      ['-- Lương thực nhận chuyển khoản cho NV & Idol', pnlSummary.expenses.netSalaryPayout, ''],
      ['-- Bảo hiểm 21.5% Công ty nộp BHXH', pnlSummary.expenses.companyInsurancePaid, ''],
      ['-- Chi phí Mặt bằng & Studio', pnlSummary.expenses.facilityCost, ''],
      ['-- Chi phí Đầu tư Thiết bị (CapEx)', pnlSummary.expenses.equipmentCapEx, ''],
      ['-- Chi phí Đi lại, Dụng cụ & Sửa chữa', pnlSummary.expenses.operationsOpEx, ''],
      ['-- Chi phí Phát sinh Động & Ads Sự kiện', pnlSummary.expenses.dynamicEventCost, ''],
      ['V. LỢI NHUẬN THUẦN TRƯỚC THUẾ (EBIT)', pnlSummary.operatingProfit, ''],
      ['VI. THUẾ TNDN (20%)', pnlSummary.corporateTax, ''],
      ['VII. LỢI NHUẬN RÒNG CUỐI CÙNG (NET PROFIT)', pnlSummary.netProfit, `${pnlSummary.netMarginPercent}%`]
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aura_PnL_${scope}_${periodRef}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold border transition-all ${
          toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : toast.type === 'info'
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Tiêu đề */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 font-black text-sm">
              🪙
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                Quản Lý Tài Chính & Lợi Nhuận Doanh Nghiệp
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Idol Agency OS • P&L Hub
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bóc tách chi phí nhân sự thực tế (Lương + BH 21.5% công ty) • Quản lý chi phí mặt bằng, thiết bị, vận hành • Báo cáo P&L đa kỳ.
              </p>
            </div>
          </div>
        </div>

        {/* Nút thao tác nhanh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Làm Mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất P&L (CSV)</span>
          </button>

        </div>
      </div>

      {/* Bộ Điều Khiển Thời Gian Đa Tầng (Tháng / Quý / Năm / Tổng) */}
      {serviceUsageQueue.length > 0 && <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-emerald-950">Dịch vụ ngoài chờ xác nhận thanh toán</h2><p className="mt-1 text-xs text-emerald-800">Mỗi dịch vụ chỉ tạo một mã doanh thu; thanh toán bổ sung không ghi nhận trùng.</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">{serviceUsageQueue.length}</span></div><div className="mt-3 space-y-2">{serviceUsageQueue.map((record) => <div key={record.id} className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><strong>{record.usageCode} · {record.personnelName || record.stageName}</strong><p className="text-slate-500">{record.serviceName} · Kỳ doanh thu {record.usageDate.slice(0, 7)} · Còn {record.outstandingAmount.toLocaleString('vi-VN')} đ</p></div><button type="button" onClick={() => void confirmServicePayment(record)} className="self-start rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white transition hover:bg-emerald-700">Xác nhận đã thanh toán</button></div>)}</div></section>}

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Switcher 4 Chu Kỳ */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setScope('month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              scope === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅</span> Theo Tháng
          </button>
          <button
            type="button"
            onClick={() => setScope('quarter')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              scope === 'quarter' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📊</span> Theo Quý
          </button>
          <button
            type="button"
            onClick={() => setScope('year')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'year' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📈</span> Theo Năm
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🌐</span> Tổng Toàn Thời Gian
          </button>
        </div>

        {/* Picker chi tiết */}
        <div className="flex items-center gap-2 flex-wrap">
          {scope === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Kỳ Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
          )}

          {scope === 'quarter' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Chọn Quý:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="2025-Q4">Quý 4/2025 (T10, T11, T12)</option>
                <option value="2025-Q3">Quý 3/2025 (T7, T8, T9)</option>
                <option value="2025-Q2">Quý 2/2025 (T4, T5, T6)</option>
                <option value="2025-Q1">Quý 1/2025 (T1, T2, T3)</option>
                <option value="2026-Q4">Quý 4/2026</option>
                <option value="2026-Q3">Quý 3/2026</option>
              </select>
            </div>
          )}

          {scope === 'year' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Chọn Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="2026">Năm 2026</option>
                <option value="2025">Năm 2025</option>
                <option value="2024">Năm 2024</option>
                <option value="2023">Năm 2023</option>
                <option value="2022">Năm 2022</option>
              </select>
            </div>
          )}

          {scope === 'all' && (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
              Tổng hợp toàn bộ doanh thu & chi phí từ trước đến nay
            </span>
          )}
        </div>
      </div>

      {/* 5 Thẻ Thống Kê Tài Chính Cốt Lõi (Executive KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Doanh Thu Thuần */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              1. Doanh Thu Thuần
            </span>
            <div className="flex items-center gap-1.5">
              {trendData?.growth.revenueGrowthPercent !== null && trendData?.growth.revenueGrowthPercent !== undefined && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                  trendData.growth.revenueGrowthPercent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`} title="Tăng trưởng so với kỳ trước">
                  {trendData.growth.revenueGrowthPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {trendData.growth.revenueGrowthPercent >= 0 ? `+${trendData.growth.revenueGrowthPercent}%` : `${trendData.growth.revenueGrowthPercent}%`}
                </span>
              )}
              <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                <Coins className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
          <span className="text-xl font-black text-slate-900 block">
            {(pnlSummary?.revenue.netRevenue || 0).toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-semibold">đ</span>
          </span>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>Gross: {(pnlSummary?.revenue.grossRevenue || 0).toLocaleString('vi-VN')} đ</span>
            <span className="text-rose-600">Phí: -{(pnlSummary?.revenue.platformFees || 0).toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* Card 2: Lợi Nhuận Gộp */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              2. Lợi Nhuận Gộp
            </span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 font-mono text-[10px] font-bold">
              Biên: {pnlSummary?.grossMarginPercent || 0}%
            </span>
          </div>
          <span className="text-xl font-black text-indigo-700 block">
            {(pnlSummary?.grossProfit || 0).toLocaleString('vi-VN')} <span className="text-xs text-indigo-400 font-semibold">đ</span>
          </span>
          <div className="mt-1 text-[10px] text-slate-500 truncate">
            Thù lao Idol: -{(pnlSummary?.directCost.idolPayout || 0).toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Card 3: Số Tiền Pay Thực Nhận Cho NV */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              3. Pay Thực Tế Cho NV
            </span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl font-black text-emerald-600 block">
            {(pnlSummary?.expenses.netSalaryPayout || 0).toLocaleString('vi-VN')} <span className="text-xs text-emerald-400 font-semibold">đ</span>
          </span>
          <div className="mt-1 text-[10px] text-slate-500">
            Chuyển khoản thực tế vào STK nhân sự
          </div>
        </div>

        {/* Card 4: Tổng Chi Phí Công Ty Thực Tế */}
        <div className="bg-gradient-to-br from-rose-50 to-amber-50 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">
              4. Tổng Chi Thực Tế C.Ty
            </span>
            <div className="flex items-center gap-1">
              {trendData?.growth.expensesGrowthPercent !== null && trendData?.growth.expensesGrowthPercent !== undefined && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                  trendData.growth.expensesGrowthPercent <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`} title="Biến động chi phí so với kỳ trước">
                  {trendData.growth.expensesGrowthPercent >= 0 ? `+${trendData.growth.expensesGrowthPercent}%` : `${trendData.growth.expensesGrowthPercent}%`} CP
                </span>
              )}
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-200 text-rose-800 rounded">
                Lương + BH 21.5%
              </span>
            </div>
          </div>
          <span className="text-xl font-black text-rose-700 block">
            {(pnlSummary?.expenses.totalOpEx || 0).toLocaleString('vi-VN')} <span className="text-xs text-rose-400 font-semibold">đ</span>
          </span>
          <div className="mt-1 text-[10px] text-rose-900/80 font-medium">
            BH 21.5% C.Ty: +{(pnlSummary?.expenses.companyInsurancePaid || 0).toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Card 5: Lợi Nhuận Ròng (Bottom Line) */}
        <div className={`p-4 rounded-2xl border shadow-md ${
          (pnlSummary?.netProfit || 0) >= 0
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500'
            : 'bg-gradient-to-br from-rose-600 to-red-700 text-white border-rose-500'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">
              5. Lợi Nhuận Ròng
            </span>
            <div className="flex items-center gap-1.5">
              {trendData?.growth.netProfitGrowthPercent !== null && trendData?.growth.netProfitGrowthPercent !== undefined && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                  trendData.growth.netProfitGrowthPercent >= 0 ? 'bg-white/20 text-white' : 'bg-black/30 text-rose-200'
                }`} title="Tăng trưởng lợi nhuận ròng">
                  {trendData.growth.netProfitGrowthPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {trendData.growth.netProfitGrowthPercent >= 0 ? `+${trendData.growth.netProfitGrowthPercent}%` : `${trendData.growth.netProfitGrowthPercent}%`}
                </span>
              )}
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white/20 rounded">
                Biên: {pnlSummary?.netMarginPercent || 0}%
              </span>
            </div>
          </div>
          <span className="text-2xl font-black block">
            {(pnlSummary?.netProfit || 0).toLocaleString('vi-VN')} <span className="text-xs font-semibold text-emerald-200">đ</span>
          </span>
          <div className="mt-1 text-[10px] text-emerald-100/80">
            {(pnlSummary?.netProfit || 0) >= 0 ? '✓ Tăng trưởng dương sau thuế' : '⚠️ Thâm hụt ngân sách'}
          </div>
        </div>

      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('pnl')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'pnl'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Báo Cáo Lợi Nhuận P&L</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('charts')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'charts'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Biểu Đồ & Xu Hướng Tăng Trưởng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('expenses')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'expenses'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Quản Lý Chi Phí Doanh Nghiệp ({filteredExpenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('breakdown')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'breakdown'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Cơ Cấu Chi Phí & Định Phí</span>
        </button>
      </div>

      {/* TAB 1: BÁO CÁO LỢI NHUẬN P&L */}
      {activeSubTab === 'pnl' && pnlSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>Báo Cáo Kết Quả Hoạt Động Kinh Doanh (P&L Statement)</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {scope.toUpperCase()} • {periodRef}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp theo chuẩn kế toán quản trị Idol Agency • Tự động hạch toán từ Doanh thu & Bảng lương & Sổ chi phí.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Mục I: Doanh Thu */}
            <div className="p-4 bg-amber-50/40">
              <div className="flex items-center justify-between font-black text-sm text-slate-900 mb-2">
                <span className="flex items-center gap-1.5 text-amber-900">
                  <span>I.</span> TỔNG DOANH THU THUẦN (NET REVENUE)
                </span>
                <span className="font-mono text-base text-amber-900">
                  {pnlSummary.revenue.netRevenue.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="space-y-1.5 pl-4 text-slate-600 text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span>• Doanh thu Booking Nhãn Hàng & Brand Deals:</span>
                  <span className="font-mono font-semibold">{pnlSummary.revenue.byCategory.booking.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>• Doanh thu Live Commerce (Affiliate & GMV Chốt Đơn):</span>
                  <span className="font-mono font-semibold">{pnlSummary.revenue.byCategory.liveCommerce.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>• Doanh thu Quà Tặng & Donate PK Stream:</span>
                  <span className="font-mono font-semibold">{pnlSummary.revenue.byCategory.pkDonate.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>• Doanh thu Dịch Vụ Ngoài (Khách thuê phòng live, quay chụp):</span>
                  <span className="font-mono font-semibold">{pnlSummary.revenue.byCategory.externalService.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            <p className="px-4 pb-3 text-[10px] font-semibold text-emerald-700">
              Doanh thu dịch vụ ngoài thuộc P&amp;L công ty; không tính KPI hoặc lương cá nhân.
            </p>

            {/* Mục II: Chi Phí Trực Tiếp (COGS) */}
            <div className="p-4">
              <div className="flex items-center justify-between font-black text-sm text-slate-900 mb-2">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span>II.</span> CHI PHÍ TRỰC TIẾP TẠO DOANH THU (COGS)
                </span>
                <span className="font-mono text-base text-rose-700">
                  -{pnlSummary.directCost.totalDirectCost.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="space-y-1.5 pl-4 text-slate-600 text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span>• Thù lao chia sẻ cho Idol/Talent theo tỷ lệ hợp đồng:</span>
                  <span className="font-mono font-semibold text-rose-600">-{pnlSummary.directCost.idolPayout.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* Mục III: Lợi Nhuận Gộp */}
            <div className="p-4 bg-indigo-50/50 flex items-center justify-between font-black text-sm text-indigo-950">
              <span className="flex items-center gap-1.5">
                <span>III.</span> LỢI NHUẬN GỘP (GROSS PROFIT)
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 ml-2">
                  Biên gộp: {pnlSummary.grossMarginPercent}%
                </span>
              </span>
              <span className="font-mono text-lg text-indigo-700">
                {pnlSummary.grossProfit.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Mục IV: Chi Phí Vận Hành (OpEx) */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between font-black text-sm text-slate-900">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <span>IV.</span> CHI PHÍ HOẠT ĐỘNG & VẬN HÀNH DOANH NGHIỆP (OPEX)
                </span>
                <span className="font-mono text-base text-rose-700">
                  -{pnlSummary.expenses.totalOpEx.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="space-y-2 pl-4 text-slate-700 text-[11px]">
                {/* 1. Lương & Bảo hiểm */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>1. Chi phí Nhân sự khối Văn phòng & Bảo hiểm:</span>
                    <span className="font-mono text-rose-700">
                      -{((pnlSummary.expenses.totalCompanyLaborCost - pnlSummary.directCost.idolPayout)).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="pl-3 mt-1 text-slate-500 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>• Tiền chuyển khoản thực nhận (Net pay) nhân viên:</span>
                      <span className="font-mono">{pnlSummary.expenses.netSalaryPayout.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between font-bold text-indigo-700">
                      <span>• Bảo hiểm 21.5% Công ty đóng thêm vào quỹ BHXH:</span>
                      <span className="font-mono">+{pnlSummary.expenses.companyInsurancePaid.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>

                {/* 2. Mặt bằng */}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>2. Chi phí Mặt bằng & Tiện ích Studio (Điện, Nước, Internet cáp quang):</span>
                  <span className="font-mono font-semibold text-rose-600">-{pnlSummary.expenses.facilityCost.toLocaleString('vi-VN')} đ</span>
                </div>

                {/* 3. Đầu tư thiết bị */}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>3. Chi phí Đầu tư & Mua sắm Thiết bị (Dàn PC, Máy ảnh, Đèn, Micro):</span>
                  <span className="font-mono font-semibold text-rose-600">-{pnlSummary.expenses.equipmentCapEx.toLocaleString('vi-VN')} đ</span>
                </div>

                {/* 4. Đi lại & sửa chữa */}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>4. Chi phí Đi lại, Đưa đón Idol, Dụng cụ & Sửa chữa bảo dưỡng:</span>
                  <span className="font-mono font-semibold text-rose-600">-{pnlSummary.expenses.operationsOpEx.toLocaleString('vi-VN')} đ</span>
                </div>

                {/* 5. Sự kiện & Ads */}
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>5. Chi phí Phát sinh Động, Marketing/Ads đẩy view & Tiếp khách:</span>
                  <span className="font-mono font-semibold text-rose-600">-{pnlSummary.expenses.dynamicEventCost.toLocaleString('vi-VN')} đ</span>
                </div>

                {/* 6. Khác */}
                {pnlSummary.expenses.otherExpenses > 0 && (
                  <div className="flex justify-between py-1">
                    <span>6. Các chi phí phát sinh khác:</span>
                    <span className="font-mono font-semibold text-rose-600">-{pnlSummary.expenses.otherExpenses.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mục V: Lợi Nhuận Hoạt Động (EBIT) */}
            <div className="p-4 bg-slate-50 flex items-center justify-between font-black text-sm text-slate-900">
              <span>V. LỢI NHUẬN HOẠT ĐỘNG THUẦN TRƯỚC THUẾ (EBIT)</span>
              <span className={`font-mono text-base ${pnlSummary.operatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {pnlSummary.operatingProfit.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Mục VI: Thuế TNDN */}
            <div className="p-4 flex items-center justify-between text-xs text-slate-600">
              <span>VI. Thuế Thu Nhập Doanh Nghiệp (TNDN dự tính 20%):</span>
              <span className="font-mono font-semibold text-slate-800">
                -{pnlSummary.corporateTax.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Mục VII: LỢI NHUẬN RÒNG (NET PROFIT) */}
            <div className={`p-5 flex items-center justify-between font-black text-base ${
              pnlSummary.netProfit >= 0 ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'
            }`}>
              <div className="flex items-center gap-2">
                <span>VII. LỢI NHUẬN RÒNG CUỐI CÙNG (NET PROFIT)</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  pnlSummary.netProfit >= 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-rose-100 border-rose-300 text-rose-800'
                }`}>
                  Biên lợi nhuận ròng: {pnlSummary.netMarginPercent}%
                </span>
              </div>
              <span className={`font-mono text-xl ${pnlSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {pnlSummary.netProfit.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB MỚI: BIỂU ĐỒ & XU HƯỚNG TĂNG TRƯỞNG (FINANCIAL CHARTS & GROWTH) */}
      {activeSubTab === 'charts' && (
        <div className="space-y-4">
          {/* 4 Thẻ Phân Tích Tăng Trưởng / Giảm Sút So Với Kỳ Trước */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Tăng trưởng Doanh thu */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tăng Trưởng Doanh Thu (MoM)
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${
                  (trendData?.growth.revenueGrowthPercent ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {trendData?.growth.revenueGrowthPercent !== null && trendData?.growth.revenueGrowthPercent !== undefined
                    ? `${trendData.growth.revenueGrowthPercent >= 0 ? '+' : ''}${trendData.growth.revenueGrowthPercent}%`
                    : '—'}
                </span>
                {(trendData?.growth.revenueGrowthPercent ?? 0) >= 0 ? (
                  <span className="p-1 rounded-full bg-emerald-50 text-emerald-600">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="p-1 rounded-full bg-rose-50 text-rose-600">
                    <ArrowDownRight className="w-4 h-4" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                So với kỳ {trendData?.previousPeriod || 'trước'} ({trendData?.currentPeriod})
              </span>
            </div>

            {/* 2. Biến động Chi phí */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Biến Động Chi Phí (COGS + OpEx)
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${
                  (trendData?.growth.expensesGrowthPercent ?? 0) <= 0 ? 'text-emerald-600' : 'text-amber-700'
                }`}>
                  {trendData?.growth.expensesGrowthPercent !== null && trendData?.growth.expensesGrowthPercent !== undefined
                    ? `${trendData.growth.expensesGrowthPercent >= 0 ? '+' : ''}${trendData.growth.expensesGrowthPercent}%`
                    : '—'}
                </span>
                {(trendData?.growth.expensesGrowthPercent ?? 0) <= 0 ? (
                  <span className="p-1 rounded-full bg-emerald-50 text-emerald-600" title="Chi phí giảm - tích cực">
                    <ArrowDownRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="p-1 rounded-full bg-amber-50 text-amber-700" title="Chi phí tăng">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Tổng giá vốn và chi phí vận hành
              </span>
            </div>

            {/* 3. Tăng trưởng Lợi nhuận ròng */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tăng Trưởng Lợi Nhuận Ròng
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${
                  (trendData?.growth.netProfitGrowthPercent ?? 0) >= 0 ? 'text-teal-600' : 'text-rose-600'
                }`}>
                  {trendData?.growth.netProfitGrowthPercent !== null && trendData?.growth.netProfitGrowthPercent !== undefined
                    ? `${trendData.growth.netProfitGrowthPercent >= 0 ? '+' : ''}${trendData.growth.netProfitGrowthPercent}%`
                    : '—'}
                </span>
                {(trendData?.growth.netProfitGrowthPercent ?? 0) >= 0 ? (
                  <span className="p-1 rounded-full bg-teal-50 text-teal-600">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="p-1 rounded-full bg-rose-50 text-rose-600">
                    <ArrowDownRight className="w-4 h-4" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Lợi nhuận sau thuế doanh nghiệp
              </span>
            </div>

            {/* 4. Biên Lợi Nhuận Ròng */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Biên Lợi Nhuận Ròng Hiện Tại
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">
                  {pnlSummary?.netMarginPercent || 0}%
                </span>
                {trendData?.growth.netMarginDiffPercent !== null && trendData?.growth.netMarginDiffPercent !== undefined && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    trendData.growth.netMarginDiffPercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {trendData.growth.netMarginDiffPercent >= 0 ? `+${trendData.growth.netMarginDiffPercent}%` : `${trendData.growth.netMarginDiffPercent}%`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Tỷ lệ lợi nhuận / Doanh thu thuần
              </span>
            </div>
          </div>

          {/* Bảng Điều Khiển Biểu Đồ & Chế Độ Xem */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">Hiển thị chỉ số:</span>
              <button
                type="button"
                onClick={() => setChartMetric('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả (DT + CP + LN)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'revenue' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Chỉ Doanh Thu
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('expenses')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'expenses' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Chỉ Chi Phí
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('profit')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'profit' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Chỉ Lợi Nhuận
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Biểu Đồ Cột
              </button>
              <button
                type="button"
                onClick={() => setChartType('trend')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  chartType === 'trend' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đường Xu Hướng
              </button>
              <button
                type="button"
                onClick={() => setChartType('table')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  chartType === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bảng Đối Soát
              </button>
            </div>
          </div>

          {/* KHUNG BIỂU ĐỒ CHÍNH */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            {/* Header thông tin chu kỳ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span>📊 Diễn Biến Doanh Thu, Chi Phí & Lợi Nhuận Chu Kỳ 6 Tháng Gần Nhất</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Từ {trendData?.series[0]?.label || 'T5/2025'} đến {trendData?.series[trendData?.series.length - 1]?.label || 'T10/2025'} • Đơn vị: VNĐ
                </span>
              </div>

              {/* Chú giải màu sắc */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                {(chartMetric === 'all' || chartMetric === 'revenue') && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span>
                    <span>Doanh Thu</span>
                  </div>
                )}
                {(chartMetric === 'all' || chartMetric === 'expenses') && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-3 h-3 rounded bg-rose-500"></span>
                    <span>Tổng Chi Phí</span>
                  </div>
                )}
                {(chartMetric === 'all' || chartMetric === 'profit') && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-3 h-3 rounded bg-indigo-600"></span>
                    <span>Lợi Nhuận Ròng</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hover tooltip card nếu có */}
            {hoveredTrendPoint && (
              <div className="mb-4 p-3 bg-slate-900 text-white rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-400 text-sm">📅 {hoveredTrendPoint.label}</span>
                  <span className="text-slate-400">({hoveredTrendPoint.period})</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Doanh Thu Thuần:</span>
                    <span className="font-bold text-emerald-400">{hoveredTrendPoint.netRevenue.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Tổng Chi Phí:</span>
                    <span className="font-bold text-rose-400">-{hoveredTrendPoint.totalExpenses.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Lợi Nhuận Ròng:</span>
                    <span className="font-bold text-teal-300">+{hoveredTrendPoint.netProfit.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Biên Lợi Nhuận:</span>
                    <span className="font-bold text-amber-300">{hoveredTrendPoint.netMarginPercent}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 1: BIỂU ĐỒ CỘT (BAR CHART) */}
            {chartType === 'bar' && (() => {
              const series = trendData?.series || [];
              const maxVal = Math.max(...series.map(s => Math.max(s.netRevenue, s.totalExpenses, s.netProfit, 1000000)));

              return (
                <div className="pt-4">
                  <div className="h-64 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 pb-2 px-2">
                    {series.map((pt) => {
                      const revHeight = Math.max(6, Math.round((pt.netRevenue / maxVal) * 100));
                      const expHeight = Math.max(6, Math.round((pt.totalExpenses / maxVal) * 100));
                      const profitHeight = Math.max(6, Math.round((Math.max(0, pt.netProfit) / maxVal) * 100));
                      const isSelected = pt.period === periodRef;

                      return (
                        <div
                          key={pt.period}
                          onMouseEnter={() => setHoveredTrendPoint(pt)}
                          className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all ${
                            isSelected ? 'bg-indigo-50/40 rounded-xl p-1' : ''
                          }`}
                        >
                          {/* Nhóm 3 cột */}
                          <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full pb-1">
                            {/* Cột Doanh Thu */}
                            {(chartMetric === 'all' || chartMetric === 'revenue') && (
                              <div
                                style={{ height: `${revHeight}%` }}
                                className="flex-1 max-w-[28px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md group-hover:brightness-110 transition-all relative flex flex-col justify-end"
                                title={`Doanh thu ${pt.label}: ${pt.netRevenue.toLocaleString('vi-VN')} đ`}
                              >
                                {revHeight > 25 && (
                                  <span className="text-[9px] font-mono font-bold text-white text-center block pb-1 opacity-90 truncate">
                                    {(pt.netRevenue / 1000000).toFixed(0)}M
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Cột Chi Phí */}
                            {(chartMetric === 'all' || chartMetric === 'expenses') && (
                              <div
                                style={{ height: `${expHeight}%` }}
                                className="flex-1 max-w-[28px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-md group-hover:brightness-110 transition-all relative flex flex-col justify-end"
                                title={`Chi phí ${pt.label}: ${pt.totalExpenses.toLocaleString('vi-VN')} đ`}
                              >
                                {expHeight > 25 && (
                                  <span className="text-[9px] font-mono font-bold text-white text-center block pb-1 opacity-90 truncate">
                                    {(pt.totalExpenses / 1000000).toFixed(0)}M
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Cột Lợi Nhuận */}
                            {(chartMetric === 'all' || chartMetric === 'profit') && (
                              <div
                                style={{ height: `${profitHeight}%` }}
                                className="flex-1 max-w-[28px] bg-gradient-to-t from-indigo-700 to-teal-500 rounded-t-md group-hover:brightness-110 transition-all relative flex flex-col justify-end"
                                title={`Lợi nhuận ròng ${pt.label}: ${pt.netProfit.toLocaleString('vi-VN')} đ`}
                              >
                                {profitHeight > 25 && (
                                  <span className="text-[9px] font-mono font-bold text-white text-center block pb-1 opacity-90 truncate">
                                    {(pt.netProfit / 1000000).toFixed(0)}M
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Nhãn kỳ bên dưới */}
                          <div className="pt-2 text-center">
                            <span className={`text-[11px] font-bold block ${
                              isSelected ? 'text-indigo-700 underline' : 'text-slate-600 group-hover:text-slate-900'
                            }`}>
                              {pt.label}
                            </span>
                            <span className="text-[9px] font-mono text-emerald-600 font-semibold block">
                              Biên: {pt.netMarginPercent}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* CHẾ ĐỘ 2: ĐƯỜNG XU HƯỚNG SVG (AREA TREND CHART) */}
            {chartType === 'trend' && (() => {
              const series = trendData?.series || [];
              if (series.length < 2) {
                return <div className="text-center py-10 text-slate-400">Cần tối thiểu 2 kỳ dữ liệu để vẽ đường xu hướng.</div>;
              }
              const maxVal = Math.max(...series.map(s => Math.max(s.netRevenue, s.totalExpenses, s.netProfit, 1000000)));
              const width = 800;
              const height = 240;
              const padding = 40;

              const pointsRev = series.map((pt, i) => {
                const x = padding + (i / (series.length - 1)) * (width - 2 * padding);
                const y = height - padding - (pt.netRevenue / maxVal) * (height - 2 * padding);
                return { x, y, pt };
              });

              const pointsExp = series.map((pt, i) => {
                const x = padding + (i / (series.length - 1)) * (width - 2 * padding);
                const y = height - padding - (pt.totalExpenses / maxVal) * (height - 2 * padding);
                return { x, y, pt };
              });

              const pointsProfit = series.map((pt, i) => {
                const x = padding + (i / (series.length - 1)) * (width - 2 * padding);
                const y = height - padding - (Math.max(0, pt.netProfit) / maxVal) * (height - 2 * padding);
                return { x, y, pt };
              });

              const pathRev = pointsRev.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const pathExp = pointsExp.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const pathProfit = pointsProfit.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              return (
                <div className="pt-4 overflow-x-auto">
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = height - padding - pct * (height - 2 * padding);
                      const val = Math.round((pct * maxVal) / 1000000);
                      return (
                        <g key={idx}>
                          <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                          <text x={padding - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="monospace">
                            {val}M
                          </text>
                        </g>
                      );
                    })}

                    {/* Đường Doanh Thu */}
                    {(chartMetric === 'all' || chartMetric === 'revenue') && (
                      <>
                        <path d={pathRev} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {pointsRev.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={p.pt.period === periodRef ? 6 : 4}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-7 transition-all"
                            onMouseEnter={() => setHoveredTrendPoint(p.pt)}
                          />
                        ))}
                      </>
                    )}

                    {/* Đường Chi Phí */}
                    {(chartMetric === 'all' || chartMetric === 'expenses') && (
                      <>
                        <path d={pathExp} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {pointsExp.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={p.pt.period === periodRef ? 6 : 4}
                            fill="#f43f5e"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-7 transition-all"
                            onMouseEnter={() => setHoveredTrendPoint(p.pt)}
                          />
                        ))}
                      </>
                    )}

                    {/* Đường Lợi Nhuận */}
                    {(chartMetric === 'all' || chartMetric === 'profit') && (
                      <>
                        <path d={pathProfit} fill="none" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        {pointsProfit.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={p.pt.period === periodRef ? 7 : 5}
                            fill="#4f46e5"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="cursor-pointer hover:r-8 transition-all"
                            onMouseEnter={() => setHoveredTrendPoint(p.pt)}
                          />
                        ))}
                      </>
                    )}

                    {/* Trục X nhãn các tháng */}
                    {pointsRev.map((p, i) => (
                      <text
                        key={i}
                        x={p.x}
                        y={height - padding + 18}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill={p.pt.period === periodRef ? '#4338ca' : '#64748b'}
                      >
                        {p.pt.label}
                      </text>
                    ))}
                  </svg>
                </div>
              );
            })()}

            {/* CHẾ ĐỘ 3: BẢNG ĐỐI SOÁT TĂNG TRƯỞNG KỲ-QUA-KỲ (TABLE) */}
            {chartType === 'table' && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Kỳ Báo Cáo</th>
                      <th className="py-2.5 px-3 text-right">Doanh Thu Thuần</th>
                      <th className="py-2.5 px-3 text-center">Tăng Trưởng DT</th>
                      <th className="py-2.5 px-3 text-right">Tổng Chi Phí</th>
                      <th className="py-2.5 px-3 text-center">Biến Động CP</th>
                      <th className="py-2.5 px-3 text-right">Lợi Nhuận Gộp</th>
                      <th className="py-2.5 px-3 text-right">Lợi Nhuận Ròng</th>
                      <th className="py-2.5 px-3 text-center">Biên Ròng %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(trendData?.series || []).map((pt, idx, arr) => {
                      const prev = idx > 0 ? arr[idx - 1] : null;
                      const revGrowth = prev && prev.netRevenue > 0
                        ? Number((((pt.netRevenue - prev.netRevenue) / prev.netRevenue) * 100).toFixed(1))
                        : null;
                      const expGrowth = prev && prev.totalExpenses > 0
                        ? Number((((pt.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100).toFixed(1))
                        : null;
                      const isSelected = pt.period === periodRef;

                      return (
                        <tr
                          key={pt.period}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-indigo-50/50 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">{pt.label}</span>
                            <span className="text-[10px] text-slate-400">{pt.period}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {pt.netRevenue.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {revGrowth !== null ? (
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                revGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {revGrowth >= 0 ? `+${revGrowth}%` : `${revGrowth}%`}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">
                            -{pt.totalExpenses.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {expGrowth !== null ? (
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                expGrowth <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {expGrowth >= 0 ? `+${expGrowth}%` : `${expGrowth}%`}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            {pt.grossProfit.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                            {pt.netProfit.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-full text-[10px]">
                              {pt.netMarginPercent}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ CHI PHÍ DOANH NGHIỆP */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Quản Lý Chi Phí Doanh Nghiệp</h2>
                <p className="text-[11px] text-slate-500">Theo dõi, phê duyệt và ghi nhận các khoản chi của công ty.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Phiếu Chi Mới</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, tên chi phí, người nhận..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">Tất cả danh mục chi</option>
                <option value="FACILITY">🏢 Mặt bằng & Tiện ích Studio</option>
                <option value="INVESTMENT_CAPEX">💻 Đầu tư thiết bị (CapEx)</option>
                <option value="OPERATIONS_OPEX">🚗 Đi lại, Dụng cụ & Sửa chữa</option>
                <option value="DYNAMIC_EVENT">⚡ Phát sinh sự kiện & Ads</option>
                <option value="LABOR_INSURANCE">🛡️ Bảo hiểm & Lương</option>
                <option value="OTHER">📦 Chi phí khác</option>
              </select>

              {/* Facility Filter */}
              <select
                value={filterFacility}
                onChange={(e) => setFilterFacility(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">Mọi loại mặt bằng</option>
                <option value="rented">🏢 Mặt bằng Thuê</option>
                <option value="fixed">🏛️ Mặt bằng Cố định</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="paid">✓ Đã chi trả</option>
                <option value="pending">⏳ Chờ duyệt</option>
                <option value="approved">★ Đã phê duyệt</option>
              </select>
            </div>
          </div>

          {/* Table Expenses */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 text-center w-10">STT</th>
                    <th className="py-3 px-3">Mã & Ngày Chi</th>
                    <th className="py-3 px-4">Tên Khoản Chi / Nội Dung</th>
                    <th className="py-3 px-3">Hạng Mục</th>
                    <th className="py-3 px-3">Mặt Bằng</th>
                    <th className="py-3 px-3 text-right">Số Tiền (VNĐ)</th>
                    <th className="py-3 px-3">Thụ Hưởng / HĐ</th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                    <th className="py-3 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Không tìm thấy khoản chi nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-semibold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-rose-700 block">{exp.expenseCode}</span>
                          <span className="text-[10px] text-slate-500">{formatDateVN(exp.expenseDate)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{exp.title}</div>
                          {exp.notes && <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{exp.notes}</div>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            exp.category === 'FACILITY' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            exp.category === 'INVESTMENT_CAPEX' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            exp.category === 'OPERATIONS_OPEX' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            exp.category === 'DYNAMIC_EVENT' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {exp.categoryLabel || exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {exp.facilityType === 'rented' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold border border-orange-200">
                              Thuê
                            </span>
                          ) : exp.facilityType === 'fixed' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Cố định
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-rose-700">
                          -{exp.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">
                          <div className="font-medium text-slate-800">{exp.recipient || '—'}</div>
                          {exp.invoiceRef && <div className="text-[10px] text-slate-400 font-mono">HĐ: {exp.invoiceRef}</div>}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            exp.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            exp.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {exp.status === 'paid' ? '✓ Đã chi' : exp.status === 'approved' ? '★ Đã duyệt' : '⏳ Chờ duyệt'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id, exp.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Xóa khoản chi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CƠ CẤU CHI PHÍ & TỶ TRỌNG */}
      {activeSubTab === 'breakdown' && pnlSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bảng so sánh lương Net vs Tổng chi phí công ty */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Bóc Tách Chi Phí Nhân Sự & Bảo Hiểm (21.5% C.Ty)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Đối chiếu chênh lệch giữa số tiền thực chi trả cho nhân viên và tổng chi phí công ty gánh chịu.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">Số tiền Pay thực nhận cho nhân viên (Net Payout):</span>
                  <span className="text-[10px] text-slate-500">Chuyển khoản trực tiếp cho nhân sự</span>
                </div>
                <span className="font-mono text-base font-bold text-emerald-600">
                  {pnlSummary.expenses.netSalaryPayout.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-indigo-950 block">Khoản bảo hiểm Công ty đóng thêm (21.5%):</span>
                  <span className="text-[10px] text-indigo-700">17.5% BHXH + 3% BHYT + 1% BHTN nộp cơ quan nhà nước</span>
                </div>
                <span className="font-mono text-base font-bold text-indigo-700">
                  +{pnlSummary.expenses.companyInsurancePaid.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-amber-950 block">Bảo hiểm phần nhân viên đóng (10.5%):</span>
                  <span className="text-[10px] text-amber-700">8% BHXH + 1.5% BHYT + 1% BHTN (trừ từ lương Gross)</span>
                </div>
                <span className="font-mono text-base font-bold text-amber-800">
                  {pnlSummary.expenses.employeeInsuranceDeduction.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 flex justify-between items-center font-black">
                <div>
                  <span className="text-rose-950 text-sm block">TỔNG NGÂN SÁCH NHÂN SỰ CÔNG TY THỰC TẾ CHI:</span>
                  <span className="text-[10px] text-rose-700 font-normal">Lương Gross + 21.5% Bảo hiểm phần công ty đóng</span>
                </div>
                <span className="font-mono text-lg text-rose-700">
                  {pnlSummary.expenses.totalCompanyLaborCost.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* Phân bổ các nhóm chi phí hoạt động OpEx */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              <span>Phân Bổ Cơ Cấu Chi Phí Hoạt Động (OpEx)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tổng chi phí vận hành doanh nghiệp: <strong>{pnlSummary.expenses.totalOpEx.toLocaleString('vi-VN')} đ</strong>.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              {/* Mặt bằng */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mặt bằng & Tiện ích Studio:</span>
                  </span>
                  <span className="font-mono text-slate-900">
                    {pnlSummary.expenses.facilityCost.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${pnlSummary.expenses.totalOpEx > 0 ? (pnlSummary.expenses.facilityCost / pnlSummary.expenses.totalOpEx) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Thiết bị CapEx */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    <span>Đầu tư Thiết bị & Tài sản (CapEx):</span>
                  </span>
                  <span className="font-mono text-slate-900">
                    {pnlSummary.expenses.equipmentCapEx.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${pnlSummary.expenses.totalOpEx > 0 ? (pnlSummary.expenses.equipmentCapEx / pnlSummary.expenses.totalOpEx) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Đi lại & sửa chữa */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đi lại, Đưa đón & Sửa chữa:</span>
                  </span>
                  <span className="font-mono text-slate-900">
                    {pnlSummary.expenses.operationsOpEx.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${pnlSummary.expenses.totalOpEx > 0 ? (pnlSummary.expenses.operationsOpEx / pnlSummary.expenses.totalOpEx) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Phát sinh sự kiện & Ads */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Phát sinh Động & Marketing Sự Kiện:</span>
                  </span>
                  <span className="font-mono text-slate-900">
                    {pnlSummary.expenses.dynamicEventCost.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${pnlSummary.expenses.totalOpEx > 0 ? (pnlSummary.expenses.dynamicEventCost / pnlSummary.expenses.totalOpEx) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO / CHỈNH SỬA PHIẾU CHI */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{editingExpense ? '✏️ Chỉnh Sửa Khoản Chi' : '➕ Tạo Phiếu Chi Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Tên khoản chi */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên khoản chi / Nội dung chi <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tiền thuê studio T10, Mua dàn PC gaming, Đưa đón idol..."
                  value={expenseFormData.title}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                />
              </div>

              {/* Hạng mục chi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hạng mục chi phí <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="FACILITY">🏢 Mặt bằng & Tiện ích Studio</option>
                    <option value="INVESTMENT_CAPEX">💻 Đầu tư thiết bị (CapEx)</option>
                    <option value="OPERATIONS_OPEX">🚗 Đi lại, Dụng cụ & Sửa chữa</option>
                    <option value="DYNAMIC_EVENT">⚡ Phát sinh sự kiện & Ads</option>
                    <option value="LABOR_INSURANCE">🛡️ Bảo hiểm & Lương</option>
                    <option value="OTHER">📦 Chi phí khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mặt bằng (nếu có)
                  </label>
                  <select
                    value={expenseFormData.facilityType || ''}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, facilityType: (e.target.value as any) || null })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Không áp dụng</option>
                    <option value="rented">Mặt bằng thuê (hợp đồng định kỳ)</option>
                    <option value="fixed">Mặt bằng cố định (sở hữu/trụ sở)</option>
                  </select>
                </div>
              </div>

              {/* Số tiền & Ngày chi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số tiền chi (VNĐ) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={expenseFormData.amount || ''}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày chi thực tế <span className="text-rose-600">*</span>
                  </label>
                  <DateInput
                    required
                    value={expenseFormData.expenseDate}
                    onChange={(d) => {
                      setExpenseFormData({
                        ...expenseFormData,
                        expenseDate: d,
                        period: d.slice(0, 7)
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              {/* Hình thức thanh toán & Đơn vị thụ hưởng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hình thức thanh toán
                  </label>
                  <select
                    value={expenseFormData.paymentMethod}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                    <option value="cash">Tiền mặt tại quỹ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Đơn vị thụ hưởng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Chủ nhà, Nhà mạng, Kỹ thuật viên..."
                    value={expenseFormData.recipient}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, recipient: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Số Hóa Đơn / Hợp đồng & Trạng Thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số HĐ / Hóa đơn đỏ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HĐ-MB-01/2026..."
                    value={expenseFormData.invoiceRef}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, invoiceRef: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trạng thái duyệt
                  </label>
                  <select
                    value={expenseFormData.status}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="paid">✓ Đã chi trả xong</option>
                    <option value="pending">⏳ Chờ duyệt phiếu</option>
                    <option value="approved">★ Đã phê duyệt</option>
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú chi tiết
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về mục đích chi, dự án hoặc thỏa thuận..."
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingExpense ? 'Lưu Thay Đổi' : 'Tạo Phiếu Chi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
