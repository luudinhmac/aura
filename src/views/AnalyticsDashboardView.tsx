import React, { useState } from 'react';
import { Idol, Criterion, IdolScoreRecord, IdolTask } from '../types/index.ts';
import { BarChart3, PieChart as PieChartIcon, Calendar, TrendingUp, Clock, Users, CheckCircle, Award } from 'lucide-react';

interface AnalyticsDashboardViewProps {
  idols: Idol[];
  criteria: Criterion[];
  scores: IdolScoreRecord[];
  tasks: IdolTask[];
}

type TimePeriod = 'all' | 'week' | 'month' | 'quarter' | 'year';
type ChartType = 'bar' | 'pie';

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  idols,
  criteria,
  scores,
  tasks
}) => {
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Filter tasks based on period
  const filteredTasks = tasks.filter((t) => {
    if (period === 'all') return true;
    const taskDate = new Date(t.createdAt);
    const now = new Date('2026-10-24T20:00:00.000Z');

    if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return taskDate >= oneWeekAgo;
    }
    if (period === 'month') {
      return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
    }
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      return Math.floor(taskDate.getMonth() / 3) === q && taskDate.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return taskDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Calculate Metrics
  const totalLoggedMinutes = filteredTasks.reduce((sum, t) => sum + (t.loggedDurationMinutes || 0), 0);
  const completedTasksCount = filteredTasks.filter((t) => t.status === 'completed').length;
  const avgOverallScore = scores.length > 0
    ? Number((scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length).toFixed(1))
    : 0;

  // Chart 1: Scores per Idol
  const idolScoreData = idols.map((idol) => {
    const scoreRec = scores.find((s) => s.idolId === idol.id);
    return {
      label: idol.stageName,
      value: scoreRec?.totalScore || 0,
      color: '#f43f5e'
    };
  }).sort((a, b) => b.value - a.value);

  // Chart 2: Task Workload / Duration by Category
  const categoryMap: Record<string, number> = {};
  filteredTasks.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + (t.loggedDurationMinutes || 30);
  });
  const categoryPalette = ['#0284c7', '#f43f5e', '#10b981', '#f59e0b', '#64748b'];
  const categoryData = Object.entries(categoryMap).map(([label, value], idx) => ({
    label,
    value,
    color: categoryPalette[idx % categoryPalette.length]
  }));

  // Chart 3: Talent Status Distribution
  const statusMap: Record<string, number> = {};
  idols.forEach((i) => {
    statusMap[i.status] = (statusMap[i.status] || 0) + 1;
  });
  const statusPalette = ['#10b981', '#0284c7', '#f59e0b', '#f43f5e', '#94a3b8'];
  const statusData = Object.entries(statusMap).map(([label, value], idx) => ({
    label,
    value,
    color: statusPalette[idx % statusPalette.length]
  }));

  // Chart 4: Criteria Average Performance
  const criteriaAvgData = criteria.map((crit, idx) => {
    let sum = 0;
    let count = 0;
    scores.forEach((s) => {
      if (s.scores[crit.id] !== undefined) {
        sum += s.scores[crit.id];
        count += 1;
      }
    });
    const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;
    const colors = ['#0284c7', '#f43f5e', '#0ea5e9', '#10b981', '#f59e0b'];
    return {
      label: crit.name,
      value: avg,
      color: colors[idx % colors.length]
    };
  });

  // SVG Render Helper for Bar Chart
  const renderBarChart = (data: { label: string; value: number; color: string }[], maxVal = 100, unit = '') => {
    const actualMax = Math.max(...data.map(d => d.value), maxVal || 1);
    return (
      <div className="space-y-3 py-2">
        {data.map((item) => {
          const widthPct = Math.min(100, Math.round((item.value / actualMax) * 100));
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={item.label}>
                  {item.label}
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {item.value} {unit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // SVG Render Helper for Pie / Donut Chart
  const renderPieChart = (data: { label: string; value: number; color: string }[], unit = '') => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
      return (
        <div className="py-12 text-center text-xs text-slate-400">
          Chưa có dữ liệu cho giai đoạn này
        </div>
      );
    }

    let accumulatedAngle = 0;
    const size = 180;
    const center = size / 2;
    const radius = 70;
    const innerRadius = 42;

    const slices = data.map((item) => {
      const sliceAngle = (item.value / total) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sliceAngle;
      accumulatedAngle += sliceAngle;

      // Coordinates math
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const ix1 = center + innerRadius * Math.cos(endRad);
      const iy1 = center + innerRadius * Math.sin(endRad);
      const ix2 = center + innerRadius * Math.cos(startRad);
      const iy2 = center + innerRadius * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${ix1} ${iy1}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}
        Z
      `;

      const percent = Math.round((item.value / total) * 100);

      return {
        ...item,
        pathData,
        percent
      };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-3">
        {/* SVG Donut */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((slice) => (
              <path
                key={slice.label}
                d={slice.pathData}
                fill={slice.color}
                className="transition-transform duration-200 hover:opacity-90 cursor-pointer"
                onMouseEnter={() => setHoveredSlice(slice.label)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-400 font-medium">Tổng số</span>
            <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
              {total} {unit}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 flex-1 max-w-xs">
          {slices.map((s) => (
            <div
              key={s.label}
              className={`flex items-center justify-between text-xs p-1 rounded transition-colors ${
                hoveredSlice === s.label ? 'bg-slate-100 font-bold' : ''
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate text-slate-700">{s.label}</span>
              </div>
              <span className="font-mono text-slate-900 font-semibold tabular-nums ml-2">
                {s.value} ({s.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-700" />
            <span>Dashboard Thống Kê & Phân Tích Dữ Liệu</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp các chỉ số nhân sự, điểm số đánh giá và khối lượng thời gian thực hiện task.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Period Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Kỳ lọc:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TimePeriod)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none"
            >
              <option value="month">Tháng này (Tháng 10/2026)</option>
              <option value="week">7 ngày gần nhất</option>
              <option value="quarter">Quý 3/2026</option>
              <option value="year">Năm 2026</option>
              <option value="all">Tất cả thời gian</option>
            </select>
          </div>

          {/* Chart Display Mode Switch (Bar vs Pie) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                chartType === 'bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
              <span>Cột (Bar)</span>
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                chartType === 'pie'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Tròn (Pie)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metric Strips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Tổng Idol Quản Lý</span>
            <Users className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {idols.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {idols.filter(i => i.status === 'Đang hoạt động').length} đang hoạt động chính thức
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Điểm Trung Bình Chung</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {avgOverallScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Đạt chuẩn chất lượng Agency
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Nhiệm Vụ Đã Xong</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {completedTasksCount} <span className="text-xs font-normal text-slate-400">/ {filteredTasks.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tỷ lệ hoàn thành: {filteredTasks.length > 0 ? Math.round((completedTasksCount / filteredTasks.length) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Tổng Giờ Đã Ghi Nhận</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
            {Math.floor(totalLoggedMinutes / 60)}h {totalLoggedMinutes % 60}m
          </div>
          <div className="text-[11px] text-sky-800 font-medium mt-1">
            Thời lượng luyện tập & lịch trình
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Idol Performance Ranking */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Tổng Điểm Đánh Giá Các Idol (Thang 100)
              </h3>
              <p className="text-[11px] text-slate-400">So sánh năng lực toàn diện theo bảng điểm</p>
            </div>
            <span className="text-[11px] font-mono text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
              Điểm số
            </span>
          </div>

          {chartType === 'bar'
            ? renderBarChart(idolScoreData, 100, 'điểm')
            : renderPieChart(idolScoreData, 'điểm')}
        </div>

        {/* Chart 2: Workload Breakdown by Category */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Phân Bổ Thời Gian Theo Danh Mục Nhiệm Vụ
              </h3>
              <p className="text-[11px] text-slate-400">Thời lượng (phút) dành cho luyện tập, biểu diễn, ghi âm</p>
            </div>
            <span className="text-[11px] font-mono text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded">
              Thời lượng
            </span>
          </div>

          {chartType === 'bar'
            ? renderBarChart(categoryData, undefined, 'phút')
            : renderPieChart(categoryData, 'phút')}
        </div>

        {/* Chart 3: Talent Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Tỷ Lệ Trạng Thái Hoạt Động Của Nhân Sự
              </h3>
              <p className="text-[11px] text-slate-400">Cơ cấu idol đang diễn, ghi hình, thực tập, tạm nghỉ</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              Nhân sự
            </span>
          </div>

          {chartType === 'bar'
            ? renderBarChart(statusData, undefined, 'người')
            : renderPieChart(statusData, 'người')}
        </div>

        {/* Chart 4: Criteria Average Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Điểm Đánh Giá Trung Bình Theo Từng Tiêu Chí
              </h3>
              <p className="text-[11px] text-slate-400">Vũ đạo, thanh nhạc, tương tác MXH, kỷ luật, doanh số</p>
            </div>
            <span className="text-[11px] font-mono text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">
              Tiêu chí
            </span>
          </div>

          {chartType === 'bar'
            ? renderBarChart(criteriaAvgData, 100, 'điểm')
            : renderPieChart(criteriaAvgData, 'điểm')}
        </div>
      </div>
    </div>
  );
};
