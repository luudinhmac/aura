import React, { useState, useMemo } from 'react';
import { notify } from '../utils/uiFeedback.ts';
import { Idol, Criterion, IdolScoreRecord, LeaderboardRank, AppSettings } from '../types/index.ts';
import { Trophy, Medal, ArrowUp, ArrowDown, Settings2, Sparkles, Check, Info, Award, ToggleLeft, ToggleRight, Sliders, CheckSquare, Square, Search } from 'lucide-react';

interface LeaderboardViewProps {
  idols: Idol[];
  criteria: Criterion[];
  scores: IdolScoreRecord[];
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onUpdatePriorityOrder: (criterionIds: string[]) => Promise<void>;
  onViewDetails: (idol: Idol) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  idols,
  criteria,
  scores,
  settings,
  onUpdateSettings,
  onUpdatePriorityOrder,
  onViewDetails
}) => {
  const [periodMode, setPeriodMode] = useState<'month' | 'quarter' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('2026-Q4');
  const activePeriod = periodMode === 'month' ? selectedMonth : periodMode === 'quarter' ? selectedQuarter : 'all';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPrioritySettings, setShowPrioritySettings] = useState(false);

  // Local state for priority ordering & selection
  const [tieBreakerActive, setTieBreakerActive] = useState<boolean>(settings.tieBreakerEnabled ?? true);
  const [selectedCritIds, setSelectedCritIds] = useState<string[]>(() => {
    if (settings.tieBreakerCriteriaIds && settings.tieBreakerCriteriaIds.length > 0) {
      return settings.tieBreakerCriteriaIds;
    }
    return criteria.map(c => c.id);
  });

  const [orderedCriteria, setOrderedCriteria] = useState<Criterion[]>(() => {
    return [...criteria].sort((a, b) => a.priorityOrder - b.priorityOrder);
  });

  const [savingPriority, setSavingPriority] = useState(false);
  const [prioritySuccess, setPrioritySuccess] = useState(false);

  // Sync when props change
  React.useEffect(() => {
    setOrderedCriteria([...criteria].sort((a, b) => a.priorityOrder - b.priorityOrder));
    setTieBreakerActive(settings.tieBreakerEnabled ?? true);
    if (settings.tieBreakerCriteriaIds && settings.tieBreakerCriteriaIds.length > 0) {
      setSelectedCritIds(settings.tieBreakerCriteriaIds);
    } else {
      setSelectedCritIds(criteria.map(c => c.id));
    }
  }, [criteria, settings]);

  // Compute Ranking with Tie-Breaker Logic (Tháng, Quý, hoặc Tất Cả)
  const rankedList: LeaderboardRank[] = React.useMemo(() => {
    const calcMode = settings.scoreCalculationMode || 'sum';

    const list = idols.map((idol) => {
      let scoreObj: Record<string, number> = {};

      if (periodMode === 'month') {
        const rec = scores.find((s) => s.idolId === idol.id && s.period === selectedMonth);
        scoreObj = rec?.scores || {};
      } else if (periodMode === 'quarter') {
        const direct = scores.find((s) => s.idolId === idol.id && s.period === selectedQuarter);
        if (direct) {
          scoreObj = direct.scores || {};
        } else {
          // Aggregate months in quarter
          const [year, q] = selectedQuarter.split('-Q');
          const qMonths = q === '1' ? ['01', '02', '03'] : q === '2' ? ['04', '05', '06'] : q === '3' ? ['07', '08', '09'] : ['10', '11', '12'];
          const targetMonths = new Set(qMonths.map((m) => `${year}-${m}`));
          const idolRecs = scores.filter((s) => s.idolId === idol.id && targetMonths.has(s.period));
          criteria.forEach((crit) => {
            const vals = idolRecs.map((r) => r.scores[crit.id]).filter((v) => v !== undefined);
            if (vals.length > 0) {
              scoreObj[crit.id] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
            }
          });
        }
      } else {
        // 'all': Cumulative average across all evaluation periods
        const idolRecs = scores.filter((s) => s.idolId === idol.id);
        criteria.forEach((crit) => {
          const vals = idolRecs.map((r) => r.scores[crit.id]).filter((v) => v !== undefined);
          if (vals.length > 0) {
            scoreObj[crit.id] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
          }
        });
      }

      let sumRaw = 0;
      let weightedSum = 0;
      let totalWeight = 0;

      criteria.forEach((crit) => {
        const val = Number(scoreObj[crit.id]) || 0;
        sumRaw += val;
        weightedSum += val * (crit.weight / 100);
        totalWeight += crit.weight;
      });

      const calculatedTotal = calcMode === 'weighted'
        ? (totalWeight > 0 ? Number(((weightedSum / totalWeight) * 100).toFixed(1)) : 0)
        : Number(sumRaw.toFixed(1));

      const avgScore = criteria.length > 0 ? Number((sumRaw / criteria.length).toFixed(1)) : 0;

      const safeRec: IdolScoreRecord = {
        id: `rank-${idol.id}-${activePeriod}`,
        idolId: idol.id,
        period: activePeriod,
        scores: scoreObj,
        totalScore: calculatedTotal,
        averageScore: avgScore,
        evaluatedAt: new Date().toISOString()
      };

      return {
        idol,
        scoreRecord: {
          ...safeRec,
          totalScore: calculatedTotal,
          averageScore: avgScore
        },
        totalScore: calculatedTotal
      };
    });


    // Active tie-breaker criteria in priority order
    const activeTieCriteria = tieBreakerActive
      ? orderedCriteria.filter((c) => selectedCritIds.includes(c.id))
      : [];

    list.sort((a, b) => {
      // Rule 1: Always sort by totalScore descending first
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }

      // Rule 2: If totalScore is equal, ONLY consider tie-breaker criteria if configured & active
      if (activeTieCriteria.length > 0) {
        for (const crit of activeTieCriteria) {
          const scoreA = a.scoreRecord.scores[crit.id] || 0;
          const scoreB = b.scoreRecord.scores[crit.id] || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
      }

      // Fallback: stable sort by stageName / STT
      return (a.idol.stt || 0) - (b.idol.stt || 0);
    });

    // Determine rank numbers and tie-breaker explanation notes
    return list.map((item, index, arr) => {
      let tieBreakerApplied = false;
      let tieBreakerReason = '';

      if (index > 0 && arr[index - 1].totalScore === item.totalScore) {
        if (activeTieCriteria.length > 0) {
          for (const crit of activeTieCriteria) {
            const prevScore = arr[index - 1].scoreRecord.scores[crit.id] || 0;
            const currScore = item.scoreRecord.scores[crit.id] || 0;
            if (prevScore !== currScore) {
              tieBreakerApplied = true;
              tieBreakerReason = `Bằng tổng điểm (${item.totalScore}), xếp sau #${index} do điểm "${crit.name}" (${currScore} < ${prevScore})`;
              break;
            }
          }
        }
        if (!tieBreakerApplied) {
          tieBreakerReason = `Bằng tổng điểm (${item.totalScore}) - Không xét tiêu chí phụ`;
        }
      } else if (index < arr.length - 1 && arr[index + 1].totalScore === item.totalScore) {
        if (activeTieCriteria.length > 0) {
          for (const crit of activeTieCriteria) {
            const nextScore = arr[index + 1].scoreRecord.scores[crit.id] || 0;
            const currScore = item.scoreRecord.scores[crit.id] || 0;
            if (currScore !== nextScore) {
              tieBreakerApplied = true;
              tieBreakerReason = `Bằng tổng điểm (${item.totalScore}), xếp trên #${index + 2} nhờ điểm "${crit.name}" (${currScore} > ${nextScore})`;
              break;
            }
          }
        }
        if (!tieBreakerApplied) {
          tieBreakerReason = `Bằng tổng điểm (${item.totalScore}) - Đồng hạng`;
        }
      }

      return {
        rank: index + 1,
        idol: item.idol,
        scoreRecord: item.scoreRecord,
        totalScore: item.totalScore,
        tieBreakerApplied,
        tieBreakerReason
      };
    });
  }, [idols, orderedCriteria, scores, activePeriod, tieBreakerActive, selectedCritIds]);

  const filteredRankedList = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return rankedList;
    return rankedList.filter(
      (r) =>
        r.idol.stageName.toLowerCase().includes(term) ||
        r.idol.realName.toLowerCase().includes(term) ||
        r.idol.department.toLowerCase().includes(term) ||
        r.idol.role.toLowerCase().includes(term)
    );
  }, [rankedList, searchQuery]);

  // Priority Reordering Handlers
  const moveCriterion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedCriteria.length) return;

    const copy = [...orderedCriteria];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setOrderedCriteria(copy);
  };

  const toggleCriterionSelected = (id: string) => {
    setSelectedCritIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSavePriority = async () => {
    try {
      setSavingPriority(true);
      const ids = orderedCriteria.map((c) => c.id);
      await onUpdatePriorityOrder(ids);
      await onUpdateSettings({
        tieBreakerEnabled: tieBreakerActive,
        tieBreakerCriteriaIds: selectedCritIds
      });

      setPrioritySuccess(true);
      setTimeout(() => {
        setPrioritySuccess(false);
        setShowPrioritySettings(false);
      }, 1200);
    } catch (err) {
      notify('Không thể cập nhật cấu hình xếp hạng', 'error');
    } finally {
      setSavingPriority(false);
    }
  };

  const top3 = rankedList.slice(0, 3);
  const activeTieCount = tieBreakerActive ? selectedCritIds.length : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Bảng Xếp Hạng Năng Lực Nghệ Sĩ (Nội Bộ)</span>
            </h2>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              👑 Dành Riêng Cho Quản Trị Viên (Super Admin)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Xếp hạng theo <strong>Tổng Điểm Thẩm Định Nội Bộ</strong> (xử lý riêng, không dùng để đánh giá KPI Idol). {tieBreakerActive && activeTieCount > 0 ? (
              <span className="text-rose-600 font-medium">
                Khi bằng điểm: xét theo {activeTieCount} tiêu chí ưu tiên đã cấu hình.
              </span>
            ) : (
              <span className="text-slate-500">
                (Chưa thiết lập tiêu chí ưu tiên: hòa điểm sẽ giữ nguyên thứ tự)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Calc Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-1">Cách tính:</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ scoreCalculationMode: 'sum' })}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                settings.scoreCalculationMode !== 'weighted'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tổng điểm = Cộng dồn điểm các tiêu chí (Ví dụ: 96 + 88 + 95 + 92 + 94 = 465)"
            >
              Cộng dồn (Sum)
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ scoreCalculationMode: 'weighted' })}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                settings.scoreCalculationMode === 'weighted'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tổng điểm = Tính theo % trọng số các tiêu chí"
            >
              Trọng số %
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nghệ sĩ xếp hạng..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white w-48 sm:w-56"
            />
          </div>

          {/* Period selector: Theo Tháng, Theo Quý, Tất Cả */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs border border-slate-200">
            <button
              type="button"
              onClick={() => setPeriodMode('month')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'month'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('quarter')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'quarter'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Quý
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('all')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'all'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả
            </button>
          </div>

          {/* Month or Quarter Dropdown */}
          {periodMode === 'month' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="font-medium text-slate-500">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="2026-10">Tháng 10/2026</option>
                <option value="2026-09">Tháng 09/2026</option>
                <option value="2026-08">Tháng 08/2026</option>
                <option value="2026-07">Tháng 07/2026</option>
              </select>
            </div>
          )}

          {periodMode === 'quarter' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="font-medium text-slate-500">Quý:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="2026-Q4">Quý 4/2026</option>
                <option value="2026-Q3">Quý 3/2026</option>
                <option value="2026-Q2">Quý 2/2026</option>
                <option value="2026-Q1">Quý 1/2026</option>
              </select>
            </div>
          )}

          {periodMode === 'all' && (
            <span className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
              Xếp hạng toàn thời gian
            </span>
          )}

          {/* Set Priority Order Button */}
          <button
            onClick={() => setShowPrioritySettings(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Cài Đặt Tiêu Chí Ưu Tiên {tieBreakerActive ? `(${activeTieCount})` : '(Tắt)'}</span>
          </button>
        </div>

      </div>

      {/* Podium Top 3 Showcase */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <div
              onClick={() => onViewDetails(top3[1].idol)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between order-2 md:order-1 mt-0 md:mt-4"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <Medal className="w-3.5 h-3.5 text-slate-400" />
                  HẠNG 2 (Á QUÂN)
                </span>
                <span className="font-mono text-2xl font-black text-slate-800 tabular-nums">
                  {top3[1].totalScore} <span className="text-xs font-normal text-slate-400">điểm</span>
                </span>
              </div>

              <div className="flex items-center gap-3.5 my-4">
                <img
                  src={top3[1].idol.avatarUrl}
                  alt={top3[1].idol.stageName}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 shadow-xs"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 hover:text-rose-600 transition-colors">
                    {top3[1].idol.stageName}
                  </h3>
                  <p className="text-xs text-slate-500">{top3[1].idol.realName}</p>
                  <p className="text-xs font-medium text-sky-800 mt-0.5">{top3[1].idol.role}</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>{top3[1].idol.department}</span>
                <span className="text-slate-400 font-mono">STT {top3[1].idol.stt}</span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Winner) */}
          {top3[0] && (
            <div
              onClick={() => onViewDetails(top3[0].idol)}
              className="bg-gradient-to-b from-amber-50/50 to-white rounded-xl border-2 border-amber-300 p-5 shadow-md hover:shadow-lg transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between order-1 md:order-2"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black bg-amber-400 text-amber-950 shadow-xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-950" />
                  HẠNG 1 (QUÁN QUÂN)
                </span>
                <span className="font-mono text-3xl font-black text-amber-900 tabular-nums">
                  {top3[0].totalScore} <span className="text-xs font-normal text-amber-700">điểm</span>
                </span>
              </div>

              <div className="flex items-center gap-4 my-4 relative z-10">
                <div className="relative">
                  <img
                    src={top3[0].idol.avatarUrl}
                    alt={top3[0].idol.stageName}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-amber-300 shadow-sm"
                  />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-xs shadow-xs">
                    ★
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 hover:text-rose-600 transition-colors">
                    {top3[0].idol.stageName}
                  </h3>
                  <p className="text-xs text-slate-600">{top3[0].idol.realName}</p>
                  <p className="text-xs font-bold text-rose-700 mt-0.5">{top3[0].idol.role}</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 border-t border-amber-100 pt-2 flex items-center justify-between relative z-10">
                <span className="font-semibold text-slate-700">{top3[0].idol.department}</span>
                <span className="text-amber-800 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Top Performer
                </span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <div
              onClick={() => onViewDetails(top3[2].idol)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between order-3 mt-0 md:mt-6"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100/70 text-amber-900 border border-amber-200">
                  <Medal className="w-3.5 h-3.5 text-amber-700" />
                  HẠNG 3 (QUÝ QUÂN)
                </span>
                <span className="font-mono text-2xl font-black text-slate-800 tabular-nums">
                  {top3[2].totalScore} <span className="text-xs font-normal text-slate-400">điểm</span>
                </span>
              </div>

              <div className="flex items-center gap-3.5 my-4">
                <img
                  src={top3[2].idol.avatarUrl}
                  alt={top3[2].idol.stageName}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-amber-200 shadow-xs"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 hover:text-rose-600 transition-colors">
                    {top3[2].idol.stageName}
                  </h3>
                  <p className="text-xs text-slate-500">{top3[2].idol.realName}</p>
                  <p className="text-xs font-medium text-sky-800 mt-0.5">{top3[2].idol.role}</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>{top3[2].idol.department}</span>
                <span className="text-slate-400 font-mono">STT {top3[2].idol.stt}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Bảng Tổng Hợp Thứ Hạng Theo Tổng Điểm
            </span>
            <span className="text-[11px] text-slate-500">
              (Xếp từ điểm cao nhất xuống thấp nhất)
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Tiêu chí ưu tiên khi hòa:</span>
            {tieBreakerActive && activeTieCount > 0 ? (
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Đang bật ({activeTieCount} tiêu chí)
              </span>
            ) : (
              <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Không thiết lập / Tắt
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <th className="py-3 px-3 w-14 text-center">Thứ Hạng</th>
                <th className="py-3 px-4 min-w-[210px]">Idol & Nghệ Danh</th>
                <th className="py-3 px-3 min-w-[130px]">Nghề Nghiệp</th>

                {/* Criteria breakdown */}
                {orderedCriteria.map((c, i) => {
                  const isSelectedForTie = tieBreakerActive && selectedCritIds.includes(c.id);
                  return (
                    <th key={c.id} className="py-3 px-3 min-w-[125px] text-right border-l border-slate-200/60">
                      <div className="font-bold text-slate-800 truncate" title={c.name}>
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center justify-end gap-1">
                        <span>{c.weight}%</span>
                        {isSelectedForTie && (
                          <span className="text-[9px] bg-rose-50 text-rose-700 px-1 rounded font-bold">
                            Ưu tiên #{i + 1}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                <th className="py-3 px-4 min-w-[120px] text-right bg-rose-50/70 text-rose-900 border-l border-rose-200 font-black text-[11px]">
                  {settings.scoreCalculationMode === 'weighted' ? 'Tổng Điểm (Trọng số %)' : 'Tổng Điểm (Cộng dồn)'}
                </th>
                <th className="py-3 px-4 min-w-[220px] text-slate-600">
                  Ghi Chú Xếp Hạng & Hòa Điểm
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredRankedList.length === 0 ? (
                <tr>
                  <td colSpan={criteria.length + 5} className="py-8 text-center text-slate-400">
                    {searchQuery ? `Không tìm thấy nghệ sĩ nào phù hợp với "${searchQuery}"` : 'Không có dữ liệu xếp hạng.'}
                  </td>
                </tr>
              ) : (
                filteredRankedList.map((item) => (
                <tr
                  key={item.idol.id}
                  onClick={() => onViewDetails(item.idol)}
                  className={`hover:bg-rose-50/30 transition-colors cursor-pointer ${
                    item.rank === 1 ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-3.5 px-3 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-extrabold text-xs tabular-nums ${
                      item.rank === 1 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                      item.rank === 2 ? 'bg-slate-200 text-slate-800' :
                      item.rank === 3 ? 'bg-amber-100 text-amber-900' :
                      'text-slate-500 bg-slate-100'
                    }`}>
                      {item.rank}
                    </span>
                  </td>

                  {/* Idol Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-rose-200 shrink-0 bg-slate-100">
                        <img
                          src={item.idol.avatarUrl}
                          alt={item.idol.stageName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 hover:text-rose-600 transition-colors truncate">
                          {item.idol.stageName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.idol.realName} · {item.idol.department}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-3 text-sky-800 font-medium">
                    {item.idol.role}
                  </td>

                  {/* Individual Criteria Scores */}
                  {orderedCriteria.map((c) => {
                    const score = item.scoreRecord.scores[c.id] ?? 0;
                    return (
                      <td key={c.id} className="py-3.5 px-3 text-right border-l border-slate-100 font-mono font-semibold text-slate-800 tabular-nums">
                        {score}
                      </td>
                    );
                  })}

                  {/* Total Score */}
                  <td className="py-3.5 px-4 text-right bg-rose-50/40 border-l border-rose-100 font-mono tabular-nums">
                    <div className="font-mono font-black text-sm text-rose-700">{item.totalScore}</div>
                    <div className="text-[10px] text-slate-400 font-normal">ĐTB: {item.scoreRecord.averageScore}</div>
                  </td>

                  {/* Tie Breaker Reason / Notes */}
                  <td className="py-3.5 px-4">
                    {item.tieBreakerApplied ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Info className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{item.tieBreakerReason}</span>
                      </span>
                    ) : item.rank === 1 ? (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Dẫn đầu toàn diện
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">{item.tieBreakerReason || 'Bình thường'}</span>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tie-Breaker Priority Configuration Modal */}
      {showPrioritySettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cấu Hình Tiêu Chí Ưu Tiên (Tie-Breaker Rules)
                </h3>
                <p className="text-xs text-slate-500">
                  Xếp hạng dựa trên tổng điểm. Khi tổng điểm bằng nhau mới xét tới tiêu chí ưu tiên đã bật.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl my-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Kích hoạt xét tiêu chí ưu tiên khi hòa điểm
                </div>
                <div className="text-[11px] text-slate-500">
                  {tieBreakerActive
                    ? 'Đang bật: Nếu hòa tổng điểm, sẽ so sánh theo danh sách tiêu chí bên dưới'
                    : 'Đang tắt: Nếu hòa tổng điểm, chỉ tính theo tổng điểm mà không xét tiêu chí phụ'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTieBreakerActive(!tieBreakerActive)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  tieBreakerActive ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {tieBreakerActive ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Criteria List with Checkbox & Reorder */}
            <div className={`space-y-2 transition-opacity ${tieBreakerActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span>Thứ tự các tiêu chí xét ưu tiên:</span>
                <span className="text-[11px] text-slate-400">
                  #1 là tiêu chí được so sánh đầu tiên
                </span>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {orderedCriteria.map((crit, idx) => {
                  const isChecked = selectedCritIds.includes(crit.id);
                  return (
                    <div
                      key={crit.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        isChecked
                          ? 'border-slate-300 bg-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleCriterionSelected(crit.id)}
                          className="text-slate-500 hover:text-rose-600 p-0.5"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>

                        <span className="w-5 h-5 rounded-md bg-slate-100 font-mono font-bold text-[11px] flex items-center justify-center text-slate-700">
                          #{idx + 1}
                        </span>

                        <div>
                          <div className={`font-bold text-xs ${isChecked ? 'text-slate-800' : 'text-slate-400'}`}>
                            {crit.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Trọng số: {crit.weight}% · Tối đa: {crit.maxScore}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCriterion(idx, 'up')}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                          title="Tăng thứ tự ưu tiên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedCriteria.length - 1}
                          onClick={() => moveCriterion(idx, 'down')}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30"
                          title="Giảm thứ tự ưu tiên"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {tieBreakerActive ? `Đã chọn ${selectedCritIds.length} tiêu chí` : 'Không áp dụng tiêu chí phụ'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrioritySettings(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSavePriority}
                  disabled={savingPriority}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {prioritySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Đã lưu!
                    </>
                  ) : (
                    'Lưu Cấu Hình'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
