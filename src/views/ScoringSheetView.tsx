import React, { useState, useMemo } from 'react';
import { notify } from '../utils/uiFeedback.ts';
import { Idol, Criterion, IdolScoreRecord, ScoreCalculationMode } from '../types/index.ts';
import { Plus, Edit2, Trash2, Save, Check, AlertCircle, Calculator, Sliders, Shield, Search } from 'lucide-react';

interface ScoringSheetViewProps {
  idols: Idol[];
  criteria: Criterion[];
  scores: IdolScoreRecord[];
  calcMode?: ScoreCalculationMode;
  onUpdateCalcMode?: (mode: ScoreCalculationMode) => void;
  canManageScores?: boolean;
  canManageCriteria?: boolean;
  onSaveScores: (records: Partial<IdolScoreRecord>[]) => Promise<void>;
  onCreateCriterion: (criterion: Partial<Criterion>) => Promise<void>;
  onUpdateCriterion: (id: string, criterion: Partial<Criterion>) => Promise<void>;
  onDeleteCriterion: (id: string) => Promise<void>;
}

export const ScoringSheetView: React.FC<ScoringSheetViewProps> = ({
  idols,
  criteria,
  scores,
  calcMode = 'sum',
  onUpdateCalcMode,
  canManageScores = true,
  canManageCriteria = true,
  onSaveScores,
  onCreateCriterion,
  onUpdateCriterion,
  onDeleteCriterion
}) => {
  const [periodMode, setPeriodMode] = useState<'month' | 'quarter' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('2026-Q4');
  const activePeriod = periodMode === 'month' ? selectedMonth : periodMode === 'quarter' ? selectedQuarter : 'all';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localScores, setLocalScores] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [critToDelete, setCritToDelete] = useState<Criterion | null>(null);
  const [isDeletingCrit, setIsDeletingCrit] = useState(false);

  // Sync local scores whenever active period or scores list updates
  React.useEffect(() => {
    const map: Record<string, Record<string, number>> = {};
    if (periodMode === 'month') {
      const pScores = scores.filter((s) => s.period === selectedMonth);
      pScores.forEach((s) => {
        map[s.idolId] = { ...s.scores };
      });
    } else if (periodMode === 'quarter') {
      const directScores = scores.filter((s) => s.period === selectedQuarter);
      if (directScores.length > 0) {
        directScores.forEach((s) => {
          map[s.idolId] = { ...s.scores };
        });
      } else {
        const [year, q] = selectedQuarter.split('-Q');
        const qMonths = q === '1' ? ['01', '02', '03'] : q === '2' ? ['04', '05', '06'] : q === '3' ? ['07', '08', '09'] : ['10', '11', '12'];
        const targetMonths = new Set(qMonths.map((m) => `${year}-${m}`));
        const relevantScores = scores.filter((s) => targetMonths.has(s.period));
        idols.forEach((idol) => {
          const idolRecs = relevantScores.filter((s) => s.idolId === idol.id);
          if (idolRecs.length > 0) {
            const critMap: Record<string, number> = {};
            criteria.forEach((c) => {
              const vals = idolRecs.map((r) => r.scores[c.id]).filter((v) => v !== undefined);
              if (vals.length > 0) {
                critMap[c.id] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
              }
            });
            map[idol.id] = critMap;
          }
        });
      }
    } else {
      // 'all' mode: average across all recorded evaluations
      idols.forEach((idol) => {
        const idolRecs = scores.filter((s) => s.idolId === idol.id);
        if (idolRecs.length > 0) {
          const critMap: Record<string, number> = {};
          criteria.forEach((c) => {
            const vals = idolRecs.map((r) => r.scores[c.id]).filter((v) => v !== undefined);
            if (vals.length > 0) {
              critMap[c.id] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
            }
          });
          map[idol.id] = critMap;
        }
      });
    }
    setLocalScores(map);
  }, [scores, periodMode, selectedMonth, selectedQuarter, idols, criteria]);

  const filteredIdols = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return idols;
    return idols.filter(
      (i) =>
        i.stageName.toLowerCase().includes(term) ||
        i.realName.toLowerCase().includes(term) ||
        i.department.toLowerCase().includes(term) ||
        i.role.toLowerCase().includes(term)
    );
  }, [idols, searchQuery]);

  // Criteria Modal state
  const [showCritModal, setShowCritModal] = useState(false);
  const [critToEdit, setCritToEdit] = useState<Criterion | null>(null);
  const [critForm, setCritForm] = useState<{
    name: string;
    code: string;
    maxScore: number;
    weight: number;
    description: string;
  }>({
    name: '',
    code: '',
    maxScore: 100,
    weight: 20,
    description: ''
  });

  // Calculate live total score for an idol (Sum vs Weighted)
  const calculateTotal = (idolId: string): { total: number; average: number } => {
    const idolScoreObj = localScores[idolId] || {};
    let totalWeighted = 0;
    let totalWeight = 0;
    let sum = 0;
    let count = 0;

    criteria.forEach((c) => {
      const val = Number(idolScoreObj[c.id]) || 0;
      sum += val;
      totalWeighted += val * (c.weight / 100);
      totalWeight += c.weight;
      count += 1;
    });

    // Default: 'sum' = Tổng cộng dồn điểm các tiêu chí (Ví dụ: 96 + 88 + 95 + 92 + 94 = 465)
    // If 'weighted', total = weighted average out of 100
    const total = calcMode === 'weighted'
      ? (totalWeight > 0 ? Number(((totalWeighted / totalWeight) * 100).toFixed(1)) : 0)
      : Number(sum.toFixed(1));

    const average = count > 0 ? Number((sum / count).toFixed(1)) : 0;
    return { total, average };
  };

  const handleScoreChange = (idolId: string, critId: string, value: string) => {
    if (!canManageScores) return;
    const num = Math.min(100, Math.max(0, Number(value) || 0));
    setLocalScores((prev) => ({
      ...prev,
      [idolId]: {
        ...(prev[idolId] || {}),
        [critId]: num
      }
    }));
    setSaveSuccess(false);
  };

  const handleSaveAll = async () => {
    if (!canManageScores) return;
    if (periodMode === 'all') {
      notify('Chế độ "Tất Cả" là dữ liệu tổng hợp toàn thời gian (chỉ xem). Để lưu bảng điểm, vui lòng chuyển sang chọn theo Tháng hoặc theo Quý cụ thể.', 'info');
      return;
    }
    try {
      setSaving(true);
      const recordsToSave: Partial<IdolScoreRecord>[] = idols.map((idol) => {
        const idolScoreMap = localScores[idol.id] || {};
        const { total, average } = calculateTotal(idol.id);
        const existingRecord = scores.find((s) => s.idolId === idol.id && s.period === activePeriod);

        return {
          id: existingRecord?.id,
          idolId: idol.id,
          period: activePeriod,
          scores: idolScoreMap,
          totalScore: total,
          averageScore: average
        };
      });

      await onSaveScores(recordsToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi khi lưu bảng điểm:', err);
    } finally {
      setSaving(false);
    }
  };

  const openCreateCritModal = () => {
    setCritToEdit(null);
    setCritForm({
      name: '',
      code: `CRIT_${Date.now().toString().slice(-4)}`,
      maxScore: 100,
      weight: 20,
      description: ''
    });
    setShowCritModal(true);
  };

  const openEditCritModal = (crit: Criterion) => {
    setCritToEdit(crit);
    setCritForm({
      name: crit.name,
      code: crit.code,
      maxScore: crit.maxScore,
      weight: crit.weight,
      description: crit.description || ''
    });
    setShowCritModal(true);
  };

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!critForm.name.trim()) return;

    if (critToEdit) {
      await onUpdateCriterion(critToEdit.id, critForm);
    } else {
      await onCreateCriterion(critForm);
    }
    setShowCritModal(false);
  };

  const handleDeleteCriterionConfirm = (crit: Criterion) => {
    setCritToDelete(crit);
  };

  const handleExecuteDeleteCrit = async () => {
    if (!critToDelete) return;
    try {
      setIsDeletingCrit(true);
      await onDeleteCriterion(critToDelete.id);
      setCritToDelete(null);
    } catch (err) {
      console.error('Lỗi xóa tiêu chí:', err);
    } finally {
      setIsDeletingCrit(false);
    }
  };

  const totalPossibleMax = criteria.reduce((sum, c) => sum + (c.maxScore || 100), 0);

  return (
    <div className="space-y-5">
      {/* Top Banner Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Bảng Điểm Đánh Giá Năng Lực Nội Bộ</span>
              <span className="text-xs font-normal text-slate-500">
                ({idols.length} idol · {criteria.length} tiêu chí)
              </span>
            </h2>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              👑 Dành Riêng Cho Quản Trị Viên (Super Admin)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Phục vụ công tác thẩm định nội bộ của Ban Quản Trị (không dùng để tính KPI Idol). KPI Idol được tính tự động từ giờ live, doanh số, lượt xem và quà tặng.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Calculation mode selector */}
          {onUpdateCalcMode && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-1.5 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-rose-600" />
                <span>Tổng điểm:</span>
              </span>
              <button
                type="button"
                onClick={() => onUpdateCalcMode('sum')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  calcMode === 'sum'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tổng điểm = Cộng dồn điểm các tiêu chí (Ví dụ: 96 + 88 + 95 + 92 + 94 = 465)"
              >
                Cộng dồn (Sum)
              </button>
              <button
                type="button"
                onClick={() => onUpdateCalcMode('weighted')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  calcMode === 'weighted'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tổng điểm = Tính theo % trọng số các tiêu chí (Thang 100)"
              >
                Theo trọng số %
              </button>
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm idol trong bảng điểm..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white w-44 sm:w-52"
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
                <option value="2026-10">Tháng 10/2026 (Hiện tại)</option>
                <option value="2026-09">Tháng 09/2026</option>
                <option value="2026-08">Tháng 08/2026</option>
                <option value="2026-07">Tháng 07/2026</option>
                <option value="2026-06">Tháng 06/2026</option>
                <option value="2026-05">Tháng 05/2026</option>
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
                <option value="2026-Q4">Quý 4/2026 (T10 - T12)</option>
                <option value="2026-Q3">Quý 3/2026 (T07 - T09)</option>
                <option value="2026-Q2">Quý 2/2026 (T04 - T06)</option>
                <option value="2026-Q1">Quý 1/2026 (T01 - T03)</option>
              </select>
            </div>
          )}

          {periodMode === 'all' && (
            <span className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
              Tổng hợp tích lũy toàn thời gian
            </span>
          )}

          {/* Add Criterion Button */}
          {canManageCriteria && (
            <button
              type="button"
              onClick={openCreateCritModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              title="Thêm cột tiêu chí đánh giá mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Tiêu Chí</span>
            </button>
          )}

          {/* Save All Button */}
          {canManageScores && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Đang lưu...</span>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Bảng Điểm</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Scoring Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold tracking-wider">
                <th className="py-2 px-1 w-10 text-center text-xs">STT</th>
                <th className="py-2 px-2.5 min-w-[150px] text-xs">Nghệ Sĩ</th>

                {/* Dynamic Criteria Columns with Edit / Delete actions */}
                {criteria.map((crit) => (
                  <th
                    key={crit.id}
                    className="py-2 px-1.5 min-w-[105px] border-l border-slate-100 text-xs group relative hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center text-center gap-0.5">
                      <div className="flex items-center justify-center gap-1 w-full">
                        <span className="font-bold text-slate-800 line-clamp-1 text-xs" title={crit.name}>
                          {crit.name}
                        </span>
                        {canManageCriteria && (
                          <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCritModal(crit);
                              }}
                              className="p-0.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer transition-colors"
                              title={`Chỉnh sửa tiêu chí "${crit.name}" (Tên, điểm tối đa, trọng số)`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCriterionConfirm(crit);
                              }}
                              className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title={`Xóa cột tiêu chí "${crit.name}"`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 flex items-center gap-1">
                        <span className="font-mono">{crit.maxScore}đ</span>
                        {crit.weight > 0 && (
                          <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-500 font-mono text-[9px]">
                            {crit.weight}%
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                ))}

                {/* Summary columns */}
                <th className="py-2 px-2.5 min-w-[85px] bg-rose-50/70 text-rose-900 border-l border-rose-200 text-right text-xs font-bold">
                  Tổng Điểm
                </th>
                <th className="py-2 px-2.5 min-w-[80px] bg-slate-100/60 text-slate-800 border-l border-slate-200 text-right text-xs font-bold">
                  Trung Bình
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIdols.length === 0 ? (
                <tr>
                  <td colSpan={criteria.length + 4} className="py-8 text-center text-slate-400">
                    {searchQuery ? `Không tìm thấy idol nào phù hợp với "${searchQuery}"` : 'Không có nhân sự nào trong phạm vi đơn vị được phân quyền của bạn.'}
                  </td>
                </tr>
              ) : (
                filteredIdols.map((idol, index) => {
                  const { total, average } = calculateTotal(idol.id);
                  return (
                    <tr key={idol.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* STT */}
                      <td className="py-1.5 px-1 text-center font-mono text-slate-600 tabular-nums text-xs">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      {/* Idol info */}
                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg overflow-hidden border border-rose-200 shrink-0 bg-slate-100">
                            <img
                              src={idol.avatarUrl}
                              alt={idol.stageName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate text-xs">
                              {idol.stageName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {idol.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score Inputs for each criterion */}
                      {criteria.map((crit) => {
                        const scoreVal = localScores[idol.id]?.[crit.id] ?? 0;
                        return (
                          <td key={crit.id} className="py-1.5 px-1.5 border-l border-slate-100">
                            <div className="flex items-center gap-1">
                              {canManageScores ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={crit.maxScore}
                                  value={scoreVal}
                                  onChange={(e) => handleScoreChange(idol.id, crit.id, e.target.value)}
                                  className="w-full max-w-[70px] mx-auto px-1.5 py-1 text-xs font-mono font-bold text-slate-800 text-center bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 tabular-nums"
                                />
                              ) : (
                                <span className="w-full max-w-[70px] mx-auto px-1.5 py-1 text-xs font-mono font-bold text-slate-800 text-center bg-slate-50/50 rounded-lg inline-block">
                                  {scoreVal}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Score */}
                      <td className="py-1.5 px-2 text-right bg-rose-50/40 border-l border-rose-100 font-mono font-extrabold text-xs text-rose-700 tabular-nums">
                        {total}
                      </td>

                      {/* Average Score */}
                      <td className="py-1.5 px-2 text-right bg-slate-50/40 border-l border-slate-100 font-mono font-semibold text-xs text-slate-700 tabular-nums">
                        {average}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sheet Footer */}
        <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            {calcMode === 'sum' ? (
              <span>
                * <strong>Tổng điểm chuẩn xác:</strong> Tổng cộng điểm của các tiêu chí thành phần (Ví dụ: 96 + 88 + 95 + 92 + 94 = 465 điểm).
              </span>
            ) : (
              <span>
                * <strong>Tổng điểm theo trọng số:</strong> Được tính theo tỷ trọng % (weight) đã cấu hình cho từng tiêu chí trên thang điểm 100.
              </span>
            )}
          </span>
          {canManageScores && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
            >
              Nhấn đây để lưu toàn bộ thay đổi bảng điểm
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Criterion Modal */}
      {showCritModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 overflow-y-auto min-h-0 animate-in fade-in my-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {critToEdit ? 'Chỉnh Sửa Tiêu Chí' : 'Thêm Tiêu Chí Đánh Giá Mới'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tiêu chí sẽ tự động được thêm thành một cột mới trên bảng điểm và bảng xếp hạng.
            </p>

            <form onSubmit={handleSaveCriterion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên tiêu chí <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Khả năng biểu diễn, Kỹ năng thanh nhạc..."
                  value={critForm.name}
                  onChange={(e) => setCritForm({ ...critForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm tối đa
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={critForm.maxScore}
                    onChange={(e) => setCritForm({ ...critForm, maxScore: Number(e.target.value) || 100 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trọng số (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={critForm.weight}
                    onChange={(e) => setCritForm({ ...critForm, weight: Number(e.target.value) || 20 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả hướng dẫn chấm
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú chi tiết thang điểm hoặc yêu cầu kỹ thuật..."
                  value={critForm.description}
                  onChange={(e) => setCritForm({ ...critForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCritModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {critToEdit ? 'Cập Nhật' : 'Tạo Tiêu Chí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Criterion Confirmation Modal (In-App Dialog, replaces window.confirm) */}
      {critToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0 my-auto">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Tiêu Chí</h3>
                <p className="text-xs text-slate-500">Mã tiêu chí: {critToDelete.code}</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa tiêu chí <strong>"{critToDelete.name}"</strong>?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <strong>Lưu ý:</strong> Điểm số của tiêu chí này trên tất cả các kỳ đánh giá sẽ được tự động gỡ bỏ và tính toán lại tổng điểm cho nghệ sĩ.
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCritToDelete(null)}
                disabled={isDeletingCrit}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteCrit}
                disabled={isDeletingCrit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingCrit ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
