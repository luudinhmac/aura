import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  PieChart,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
} from 'lucide-react';
import {
  MOCK_FINANCE_EXPENSES,
  MOCK_FINANCE_SCOPES,
  MOCK_FINANCE_TREND_POINTS,
  MOCK_PAYROLL_DISPUTES,
  MOCK_PAYROLL_PERIODS,
  MOCK_PAYROLL_ROWS,
  MOCK_REVENUE_CATEGORIES,
  MOCK_REVENUE_PLATFORMS,
  MOCK_REVENUE_TRANSACTIONS,
  MOCK_SERVICE_ACCOUNTING_QUEUE,
  MOCK_SERVICE_USAGE_ROWS,
} from './mockShowcaseData.ts';

interface FinancePayrollProps {
  onNotify: (msg: string) => void;
  onOpenPayslipModal: () => void;
}

export const PreviewFinanceTab: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const [scope, setScope] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [subTab, setSubTab] = useState<'pnl' | 'charts' | 'expenses' | 'breakdown'>('pnl');
  const [expenseSearch, setExpenseSearch] = useState('');

  const data = MOCK_FINANCE_SCOPES[scope];
  const filteredExpenses = MOCK_FINANCE_EXPENSES.filter((exp) =>
    !expenseSearch.trim()
      ? true
      : exp.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.category.toLowerCase().includes(expenseSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Scope Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: 'month', label: '📅 Theo Tháng' },
              { id: 'quarter', label: '📊 Theo Quý' },
              { id: 'year', label: '📈 Theo Năm' },
              { id: 'all', label: '🌐 Toàn Bộ' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScope(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                scope === item.id ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          Kỳ báo cáo: {data.label}
        </span>
      </div>

      {/* 5 Executive Cards (matching real FinanceManagementView) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
            <span>1. Doanh Thu Thuần</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
              <ArrowUpRight className="h-3 w-3" />+{data.revenueGrowth}%
            </span>
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">{data.netRevenue.toLocaleString('vi-VN')} đ</div>
          <div className="mt-1 text-[10px] text-slate-500">Gross: {data.grossRevenue.toLocaleString('vi-VN')} đ</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-indigo-600">
            <span>2. Lợi Nhuận Gộp</span>
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono">{data.grossMarginPercent}%</span>
          </div>
          <div className="mt-1 text-lg font-black text-indigo-700">{data.grossProfit.toLocaleString('vi-VN')} đ</div>
          <div className="mt-1 text-[10px] text-slate-500">Trả Idol: -{data.idolPayout.toLocaleString('vi-VN')} đ</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-700">
            <span>3. Pay Thực Tế NV</span>
            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-black text-emerald-700">{data.netSalaryPayout.toLocaleString('vi-VN')} đ</div>
          <div className="mt-1 text-[10px] text-slate-500">Chuyển khoản vào STK nhân sự</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-rose-800">
            <span>4. Tổng Chi Thực Tế</span>
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-800">+{data.expenseGrowth}%</span>
          </div>
          <div className="mt-1 text-lg font-black text-rose-700">{data.totalCompanyExpense.toLocaleString('vi-VN')} đ</div>
          <div className="mt-1 text-[10px] text-slate-600">Lương + BHXH + Định phí C.Ty</div>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-700 p-3.5 text-white">
          <div className="text-[10px] font-bold uppercase text-emerald-100">5. Lợi Nhuận Ròng</div>
          <div className="mt-1 text-lg font-black">{data.netProfit.toLocaleString('vi-VN')} đ</div>
          <div className="mt-1 text-[10px] text-emerald-100">✓ Tăng trưởng dương sau thuế</div>
        </div>
      </div>

      {/* 4 Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(
          [
            { id: 'pnl', label: 'Báo Cáo Lợi Nhuận P&L', Icon: BarChart3 },
            { id: 'charts', label: 'Biểu Đồ & Xu Hướng', Icon: TrendingUp },
            { id: 'expenses', label: `Quản Lý Chi Phí (${filteredExpenses.length})`, Icon: Receipt },
            { id: 'breakdown', label: 'Cơ Cấu Chi Phí & Định Phí', Icon: PieChart },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer ${
              subTab === id
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {subTab === 'pnl' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-black uppercase text-slate-800">
            Báo Cáo Kết Quả Hoạt Động Kinh Doanh (P&L Statement · {data.label})
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex justify-between px-4 py-2.5">
              <span>1. Doanh thu Gross toàn hệ thống</span>
              <span className="font-bold text-slate-900">{data.grossRevenue.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-rose-600">
              <span>(-) Khấu trừ & Phí nền tảng (TikTok/Bigo/Shopee)</span>
              <span className="font-bold">-{data.platformFees.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 bg-slate-50/60 font-bold">
              <span>2. Doanh thu Thuần (Net Revenue)</span>
              <span>{data.netRevenue.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-amber-700">
              <span>(-) Thù lao chia sẻ cho Idol / Tài năng</span>
              <span className="font-bold">-{data.idolPayout.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-slate-700">
              <span>(-) Quỹ Lương Văn Phòng & BHXH (`LABOR_INSURANCE`)</span>
              <span className="font-bold">
                -{(data.netSalaryPayout + data.laborInsuranceCost).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-slate-700">
              <span>(-) Chi phí vận hành & định phí công ty</span>
              <span className="font-bold">-{data.operatingFixedCost.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-emerald-50 font-black text-emerald-800 text-sm">
              <span>3. LỢI NHUẬN RÒNG (NET PROFIT)</span>
              <span>{data.netProfit.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>
      )}

      {subTab === 'charts' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
          <div className="font-bold text-slate-900">Biểu Đồ Xu Hướng 5 Kỳ Gần Nhất (Đơn vị: Triệu VNĐ)</div>
          <div className="grid grid-cols-5 gap-3 items-end h-40 rounded-xl bg-slate-50 p-4 border border-slate-100">
            {MOCK_FINANCE_TREND_POINTS.map((pt) => (
              <div key={pt.label} className="flex flex-col items-center gap-1 h-full justify-end">
                <div className="flex items-end gap-1 w-full justify-center h-24">
                  <div className="w-3 rounded-t bg-sky-500" style={{ height: `${Math.round((pt.revenue / 200) * 100)}%` }} title={`Thu: ${pt.revenue}tr`} />
                  <div className="w-3 rounded-t bg-rose-400" style={{ height: `${Math.round((pt.expenses / 200) * 100)}%` }} title={`Chi: ${pt.expenses}tr`} />
                  <div className="w-3 rounded-t bg-emerald-500" style={{ height: `${Math.max(12, Math.round((pt.profit / 200) * 100))}%` }} title={`Lãi: ${pt.profit}tr`} />
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600">{pt.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'expenses' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-64 max-w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <label htmlFor="finance-expense-search" className="sr-only">Tìm khoản chi</label>
              <input
                id="finance-expense-search"
                name="financeExpenseSearch"
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Tìm chi phí..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3"
              />
            </div>
            <button
              type="button"
              onClick={() => onNotify('Mở form thêm Chi Phí Công Ty mới (mô phỏng)')}
              className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              + Thêm Khoản Chi
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-bold text-slate-900">{exp.title}</div>
                  <div className="text-[11px] text-slate-500">{exp.date} · {exp.category} · {exp.facility}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-rose-700">{exp.amount.toLocaleString('vi-VN')} đ</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{exp.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'breakdown' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
          <div className="font-bold text-slate-900">Phân Tích Cơ Cấu Chi Phí & Định Phí</div>
          {[
            { label: 'Quỹ lương nhân sự & Idol Payout', pct: 68, color: 'bg-indigo-600' },
            { label: 'Thuê mặt bằng & Studio vận hành', pct: 18, color: 'bg-rose-500' },
            { label: 'Marketing, Booking Ads & Khác', pct: 14, color: 'bg-amber-500' },
          ].map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span>{row.label}</span>
                <span>{row.pct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PreviewRevenueTab: React.FC<{ onNotify: (msg: string) => void }> = ({ onNotify }) => {
  const [selectedMonth, setSelectedMonth] = useState('10/2026');
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState<'categories' | 'platforms'>('categories');
  const [catFilter, setCatFilter] = useState('all');

  const visibleTx = MOCK_REVENUE_TRANSACTIONS.filter((tx) =>
    catFilter === 'all' ? true : tx.category === catFilter,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
        <div className="flex items-center gap-2">
          <label htmlFor="rev-month-select" className="font-bold text-slate-700">Kỳ tháng:</label>
          <select
            id="rev-month-select"
            name="revMonth"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold"
          >
            <option value="10/2026">Tháng 10/2026</option>
            <option value="09/2026">Tháng 09/2026</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" /> Cấu Hình Nguồn & Nền Tảng
          </button>
          <button
            type="button"
            onClick={() => onNotify('Đã đồng bộ giao dịch đã xác thực sang Bảng Lương 2026-10 (mô phỏng)')}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 font-bold text-white cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Đồng Bộ Sang Bảng Lương
          </button>
          <button
            type="button"
            onClick={() => onNotify('Mở modal Nhập Giao Dịch Doanh Thu Mới (mô phỏng)')}
            className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white cursor-pointer"
          >
            + Nhập Giao Dịch Mới
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfigTab('categories')}
                className={`rounded-lg px-3 py-1 font-bold cursor-pointer ${configTab === 'categories' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}
              >
                Nguồn Doanh Thu ({MOCK_REVENUE_CATEGORIES.length})
              </button>
              <button
                type="button"
                onClick={() => setConfigTab('platforms')}
                className={`rounded-lg px-3 py-1 font-bold cursor-pointer ${configTab === 'platforms' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}
              >
                Nền Tảng & Chiết Khấu ({MOCK_REVENUE_PLATFORMS.length})
              </button>
            </div>
            <button type="button" onClick={() => setShowConfig(false)} className="font-bold text-slate-500 cursor-pointer">
              Thu gọn
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {configTab === 'categories'
              ? MOCK_REVENUE_CATEGORIES.map((c) => (
                  <div key={c.id} className="flex justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-indigo-700">Chia Idol {c.defaultSharePercent}% · {c.count} GD</span>
                  </div>
                ))
              : MOCK_REVENUE_PLATFORMS.map((p) => (
                  <div key={p.id} className="flex justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-rose-700">Phí {p.feePercent}% · {p.settlementCycle}</span>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500 font-semibold">Tổng Doanh Thu Gross</div>
          <div className="mt-1 text-lg font-black text-slate-900">201.000.000 đ</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500 font-semibold">Phí Nền Tảng & Khấu Trừ</div>
          <div className="mt-1 text-lg font-black text-rose-600">-24.500.000 đ</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500 font-semibold">Trả Thù Lao Idol</div>
          <div className="mt-1 text-lg font-black text-amber-600">52.070.000 đ</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex items-center gap-1 text-emerald-800 font-semibold">
            <Coins className="h-3.5 w-3.5" /> Lợi Nhuận Công Ty
          </div>
          <div className="mt-1 text-lg font-black text-emerald-700">124.430.000 đ</div>
        </div>
      </div>

      {/* Category Filter + Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="font-bold text-slate-800">Giao Dịch Kỳ {selectedMonth}</span>
          <div>
            <label htmlFor="rev-cat-filter" className="sr-only">Lọc nguồn thu</label>
            <select
              id="rev-cat-filter"
              name="revCategoryFilter"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold"
            >
              <option value="all">Tất cả nguồn thu</option>
              {MOCK_REVENUE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <th className="px-4 py-2.5">Mã / Nội dung</th>
                <th className="px-4 py-2.5">Nguồn / Nền tảng</th>
                <th className="px-4 py-2.5 text-right">Gross</th>
                <th className="px-4 py-2.5 text-right">Trả Idol</th>
                <th className="px-4 py-2.5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTx.map((tx) => (
                <tr key={tx.code}>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-slate-900">{tx.title}</div>
                    <div className="text-[11px] text-slate-400">{tx.code} · {tx.idol}</div>
                  </td>
                  <td className="px-4 py-2.5">{tx.category} · {tx.platform}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{tx.gross.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{tx.idolShare.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {tx.status === 'synced_to_payroll' ? 'Đã đồng bộ lương' : tx.status === 'verified' ? 'Đã đối soát' : 'Dự thảo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const PreviewPayrollTab: React.FC<FinancePayrollProps> = ({ onNotify, onOpenPayslipModal }) => {
  const [scope, setScope] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedPeriodId, setSelectedPeriodId] = useState(MOCK_PAYROLL_PERIODS[0].id);

  const period = MOCK_PAYROLL_PERIODS.find((p) => p.id === selectedPeriodId) ?? MOCK_PAYROLL_PERIODS[0];
  const hasDiscrepancy = period.employeeCount !== period.actualCount;

  return (
    <div className="space-y-4">
      {/* Header + 4-Tier Workflow Buttons */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">Quản Lý Bảng Lương & Chi Trả</h3>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                {period.status === 'locked_paid'
                  ? '✓ Đã Chi Trả & Khóa Sổ'
                  : period.status === 'pending_approval'
                    ? '⏳ Chờ Giám Đốc Duyệt'
                    : '📝 Bản Dự Thảo (Draft)'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">{period.calendarNotice}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNotify(`Trình duyệt kỳ ${period.period} thành công (mô phỏng)`)}
              className="rounded-xl bg-amber-600 px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              📤 Trình Giám Đốc Duyệt
            </button>
            <button
              type="button"
              onClick={() => onNotify(`Giám đốc phê duyệt kỳ ${period.period} (mô phỏng)`)}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              ★ Giám Đốc Phê Duyệt
            </button>
            <button
              type="button"
              onClick={() => onNotify(`Khóa sổ & chi trả kỳ ${period.period} (mô phỏng)`)}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              🔒 Khóa Sổ
            </button>
            <button
              type="button"
              onClick={() => onNotify('Đã xuất file CSV chi trả ngân hàng (mô phỏng)')}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> CSV Ngân Hàng
            </button>
          </div>
        </div>

        {/* Scope & Period Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {(['month', 'quarter', 'year', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${scope === s ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
              >
                {s === 'month' ? 'Theo Tháng' : s === 'quarter' ? 'Theo Quý' : s === 'year' ? 'Theo Năm' : 'Lũy Kế'}
              </button>
            ))}
          </div>
          {scope === 'month' && (
            <div className="flex items-center gap-2">
              <label htmlFor="payroll-period-select" className="font-semibold text-slate-600">Chọn kỳ:</label>
              <select
                id="payroll-period-select"
                name="payrollPeriod"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold"
              >
                {MOCK_PAYROLL_PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    Kỳ {p.period} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {hasDiscrepancy && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Phát hiện chênh lệch nhân sự mới ({period.employeeCount}/{period.actualCount} hồ sơ) chưa đồng bộ vào kỳ {period.period}.</span>
          </div>
          <button
            type="button"
            onClick={() => onNotify(`Đã đối soát & đồng bộ lại bảng lương ${period.period} (mô phỏng)`)}
            className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white cursor-pointer"
          >
            🔄 Đồng Bộ Lại Ngay
          </button>
        </div>
      )}

      {/* Records Table with Hot Bonus / Adjust / Payslip actions */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <th className="px-4 py-2.5">Nhân sự</th>
                <th className="px-4 py-2.5 text-right">Lương cứng</th>
                <th className="px-4 py-2.5 text-right">Hoa hồng & KPI</th>
                <th className="px-4 py-2.5 text-right">Khấu trừ</th>
                <th className="px-4 py-2.5 text-right">Thực nhận</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_PAYROLL_ROWS.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-slate-900">{row.idol}</div>
                    <div className="text-[11px] text-slate-400">{row.department}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">{row.baseSalary.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-indigo-700">
                    +{(row.commissionAndGift + row.kpiBonus).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-2.5 text-right text-rose-600">-{row.deductions.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-700">{row.netSalary.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => onNotify(`Thưởng nóng cho ${row.idol} (mô phỏng)`)}
                        className="rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                      >
                        Thưởng
                      </button>
                      <button
                        type="button"
                        onClick={() => onNotify(`Mở điều chỉnh lương ${row.idol} (mô phỏng)`)}
                        className="rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        Điều chỉnh
                      </button>
                      <button
                        type="button"
                        onClick={onOpenPayslipModal}
                        className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        Phiếu
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const PreviewDisputesAndServiceTabs: React.FC<{
  mode: 'payroll_disputes' | 'service_usage';
  onNotify: (msg: string) => void;
}> = ({ mode, onNotify }) => {
  const [disputeFilter, setDisputeFilter] = useState<'open' | 'all'>('open');
  const [selectedDisputeId, setSelectedDisputeId] = useState(MOCK_PAYROLL_DISPUTES[0].id);
  const [selectedClientId, setSelectedClientId] = useState(MOCK_SERVICE_USAGE_ROWS[0].id);

  if (mode === 'service_usage') {
    const selectedService = MOCK_SERVICE_USAGE_ROWS.find((r) => r.id === selectedClientId) ?? MOCK_SERVICE_USAGE_ROWS[0];
    return (
      <div className="space-y-4 text-xs">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-emerald-950">Dịch Vụ Ngoài Chờ Kế Toán Xác Nhận Thanh Toán</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
              {MOCK_SERVICE_ACCOUNTING_QUEUE.length} hồ sơ
            </span>
          </div>
          {MOCK_SERVICE_ACCOUNTING_QUEUE.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white p-3">
              <div>
                <div className="font-bold text-slate-900">{q.usageCode} · {q.personnelName}</div>
                <div className="text-slate-500">{q.serviceName}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-emerald-700">Còn {q.outstandingAmount.toLocaleString('vi-VN')} đ</span>
                <button
                  type="button"
                  onClick={() => onNotify(`Đã xác nhận thanh toán cho đơn ${q.usageCode} (mô phỏng)`)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white cursor-pointer"
                >
                  Xác nhận thanh toán
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-2.5 font-bold uppercase text-slate-600">Khách Hàng / Đối Tác</div>
            {MOCK_SERVICE_USAGE_ROWS.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedClientId(row.id)}
                className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left cursor-pointer ${
                  selectedService.id === row.id ? 'bg-amber-50 font-bold' : 'hover:bg-slate-50'
                }`}
              >
                <span>{row.client}</span>
                <span className="text-[11px] text-slate-500">{row.usageDate}</span>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-bold text-sm text-slate-900">{selectedService.client}</div>
              <span className="font-black text-emerald-700">{selectedService.netAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div>{selectedService.serviceName}</div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Đã thu: {selectedService.paidAmount.toLocaleString('vi-VN')} đ</span>
              <span>Ngày thực hiện: {selectedService.usageDate}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const visibleDisputes = MOCK_PAYROLL_DISPUTES.filter((d) =>
    disputeFilter === 'open' ? d.status !== 'resolved' : true,
  );
  const selected = visibleDisputes.find((d) => d.id === selectedDisputeId) ?? visibleDisputes[0];

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setDisputeFilter('open')}
            className={`rounded-xl px-3 py-1.5 font-bold cursor-pointer ${disputeFilter === 'open' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Đang mở (2)
          </button>
          <button
            type="button"
            onClick={() => setDisputeFilter('all')}
            className={`rounded-xl px-3 py-1.5 font-bold cursor-pointer ${disputeFilter === 'all' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Tất cả (3)
          </button>
        </div>
        <span className="text-slate-500">So sánh giá trị Hệ thống vs Đề nghị điều chỉnh</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {visibleDisputes.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDisputeId(d.id)}
              className={`w-full rounded-2xl border p-3 text-left cursor-pointer ${
                selected?.id === d.id ? 'border-rose-300 bg-rose-50/70' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="font-bold text-slate-900">{d.idol} · Kỳ {d.period}</div>
              <div className="text-[11px] text-indigo-700 font-semibold">{d.category}</div>
              <div className="mt-1 text-slate-500 line-clamp-2">{d.reason}</div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-black text-sm text-slate-900">{selected.idol} — {selected.category}</div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">{selected.status}</span>
            </div>
            <p className="text-slate-700">{selected.reason}</p>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Số liệu hệ thống</div>
                <div className="font-bold text-slate-900">13.200.000 đ</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-600">Đề xuất sau đối soát</div>
                <div className="font-black text-emerald-700">14.200.000 đ (+1.000.000 đ)</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNotify('Chuyển sang Bảng Lương để điều chỉnh phụ cấp (mô phỏng)')}
                className="rounded-xl bg-indigo-600 px-3 py-1.5 font-bold text-white cursor-pointer"
              >
                Mở Điều Chỉnh Lương
              </button>
              <button
                type="button"
                onClick={() => onNotify(`Đã chốt xử lý phản ánh ${selected.id} (mô phỏng)`)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Chốt xử lý
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

