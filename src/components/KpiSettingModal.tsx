import React, { useState, useEffect } from 'react';
import { Idol, KpiGroup, KpiSetting, KpiScopeType, KpiPeriodType } from '../types/index.ts';
import { X, Target, Building2, User, Sparkles, AlertCircle, Percent, Award, Coins } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect.tsx';

interface KpiSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingToEdit: KpiSetting | null;
  groups: KpiGroup[];
  idols: Idol[];
  defaultGroupId?: string;
  defaultIdolId?: string;
  onSave: (kpiData: Partial<KpiSetting>) => Promise<void>;
}

// Preset gợi ý nhanh chỉ tiêu
const KPI_PRESETS = [
  { code: 'GMV_LIVE', name: 'Doanh số GMV Live Commerce', unit: 'VNĐ', target: 50000000, weight: 40, desc: 'Tổng giá trị hàng hóa thanh toán thành công trong phiên live' },
  { code: 'STREAM_HOURS', name: 'Số giờ Livestream tối thiểu', unit: 'Giờ', target: 60, weight: 30, desc: 'Thời lượng lên sóng thực tế phục vụ các ca livestream' },
  { code: 'PK_WINS', name: 'Số trận thắng PK liên phòng', unit: 'Trận', target: 20, weight: 25, desc: 'Số trận PK giành chiến thắng khi giao lưu thi đấu' },
  { code: 'DONATE_REVENUE', name: 'Doanh thu Donate & Quà tặng fan', unit: 'VNĐ', target: 40000000, weight: 50, desc: 'Tổng giá trị kim cương/xu donate nhận từ fan' },
  { code: 'GEAR_SALES', name: 'Doanh số bán thiết bị & gear', unit: 'VNĐ', target: 30000000, weight: 40, desc: 'Doanh số bán tai nghe, phím cơ, chuột qua giỏ hàng' },
  { code: 'BOOKING_REVENUE', name: 'Doanh số hợp đồng Booking tài trợ', unit: 'VNĐ', target: 100000000, weight: 50, desc: 'Doanh thu ký hợp đồng quảng cáo tài trợ với nhãn hàng' },
  { code: 'VIDEO_PRODUCTION', name: 'Số video ngắn sản xuất & đăng tải', unit: 'Video', target: 15, weight: 30, desc: 'Số lượng clip TikTok / Shorts hoàn thành chất lượng cao' },
];

export const KpiSettingModal: React.FC<KpiSettingModalProps> = ({
  isOpen,
  onClose,
  settingToEdit,
  groups,
  idols,
  defaultGroupId,
  defaultIdolId,
  onSave
}) => {
  const [scopeType, setScopeType] = useState<KpiScopeType>('group');
  const [groupId, setGroupId] = useState<string>('');
  const [assignedIdolId, setAssignedIdolId] = useState<string>('');
  const [activityCode, setActivityCode] = useState<string>('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('VNĐ');
  const [targetValue, setTargetValue] = useState<number>(50000000);
  const [minThreshold, setMinThreshold] = useState<number>(30000000);
  const [weight, setWeight] = useState<number>(30);
  const [period, setPeriod] = useState<KpiPeriodType>('monthly');
  const [hasBonus, setHasBonus] = useState(false);
  const [bonusRate, setBonusRate] = useState<number>(5);
  const [flatBonus, setFlatBonus] = useState<number>(1000000);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingToEdit) {
      setScopeType(settingToEdit.scopeType || 'group');
      setGroupId(settingToEdit.groupId || groups[0]?.id || '');
      setAssignedIdolId(settingToEdit.assignedIdolId || idols[0]?.id || '');
      setActivityCode(settingToEdit.activityCode || '');
      setCode(settingToEdit.code || '');
      setName(settingToEdit.name || '');
      setDescription(settingToEdit.description || '');
      setUnit(settingToEdit.unit || 'VNĐ');
      setTargetValue(settingToEdit.targetValue || 0);
      setMinThreshold(settingToEdit.minThreshold !== undefined ? settingToEdit.minThreshold : 0);
      setWeight(settingToEdit.weight || 20);
      setPeriod(settingToEdit.period || 'monthly');
      setStatus(settingToEdit.status || 'active');

      if (settingToEdit.bonusIncentive) {
        setHasBonus(true);
        setBonusRate(settingToEdit.bonusIncentive.ratePercent || 5);
        setFlatBonus(settingToEdit.bonusIncentive.flatBonusVnd || 0);
      } else {
        setHasBonus(false);
        setBonusRate(5);
        setFlatBonus(0);
      }
    } else {
      const initialScope: KpiScopeType = defaultIdolId ? 'individual' : 'group';
      setScopeType(initialScope);
      setGroupId(defaultGroupId || groups[0]?.id || '');
      const firstCompanyIdol = idols.find(i => (i.personnelType || 'Công ty') === 'Công ty')?.id || idols[0]?.id || '';
      setAssignedIdolId(defaultIdolId || firstCompanyIdol);
      setActivityCode('');
      setCode('GMV_LIVE');
      setName('Doanh số GMV Live Commerce');
      setDescription('Tổng giá trị hàng hóa chốt đơn thành công trong kỳ');
      setUnit('VNĐ');
      setTargetValue(50000000);
      setMinThreshold(30000000);
      setWeight(30);
      setPeriod('monthly');
      setStatus('active');
      setHasBonus(true);
      setBonusRate(5);
      setFlatBonus(1000000);
    }
    setError(null);
  }, [settingToEdit, isOpen, defaultGroupId, defaultIdolId, groups, idols]);

  if (!isOpen) return null;

  const selectedGroup = groups.find(g => g.id === groupId);
  const targetPersonnelIds = scopeType === 'individual'
    ? [assignedIdolId]
    : (selectedGroup?.memberIds || []);
  const activityOptions = Array.from(new Map(
    idols
      .filter(idol => targetPersonnelIds.includes(idol.id))
      .flatMap(idol => idol.activities || [])
      .map(activity => [activity.code, activity])
  ).values()).sort((a, b) => Number(a.isPrimary) - Number(b.isPrimary) || a.name.localeCompare(b.name));

  const handleApplyPreset = (preset: typeof KPI_PRESETS[0]) => {
    setCode(preset.code);
    setName(preset.name);
    setUnit(preset.unit);
    setTargetValue(preset.target);
    setMinThreshold(Math.round(preset.target * 0.6));
    setWeight(preset.weight);
    setDescription(preset.desc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên chỉ tiêu KPI');
      return;
    }
    if (!code.trim()) {
      setError('Vui lòng nhập mã chỉ tiêu KPI');
      return;
    }
    if (scopeType === 'group' && !groupId) {
      setError('Vui lòng chọn nhóm được giao chỉ tiêu');
      return;
    }
    if (scopeType === 'individual' && !assignedIdolId) {
      setError('Vui lòng chọn nhân sự được giao chỉ tiêu');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        unit: unit.trim(),
        scopeType,
        groupId: scopeType === 'group' ? groupId : undefined,
        assignedIdolId: scopeType === 'individual' ? assignedIdolId : undefined,
        activityCode: activityCode || undefined,
        period,
        targetValue: Number(targetValue) || 0,
        minThreshold: minThreshold ? Number(minThreshold) : undefined,
        weight: Number(weight) || 20,
        status,
        bonusIncentive: hasBonus ? {
          ratePercent: Number(bonusRate) || 0,
          flatBonusVnd: Number(flatBonus) || 0
        } : undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu chỉ tiêu KPI');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 via-white to-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {settingToEdit ? 'Chỉnh Sửa Chỉ Tiêu KPI' : 'Thiết Đặt Chỉ Tiêu KPI Mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Gán định mức chỉ tiêu áp dụng chung cho nhóm hoặc riêng cho từng cá nhân
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bước 1: Chọn Cấp Độ Áp Dụng (Nhóm Chỉ Định vs Cá Nhân) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              Cấp Độ & Đối Tượng Áp Dụng KPI <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScopeType('group')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  scopeType === 'group'
                    ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs ring-2 ring-indigo-500/20'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Áp Dụng Cho Cả Nhóm ({groups.length} nhóm)</span>
              </button>

              <button
                type="button"
                onClick={() => setScopeType('individual')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  scopeType === 'individual'
                    ? 'bg-white border-rose-500 text-rose-700 shadow-2xs ring-2 ring-rose-500/20'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <User className="w-4 h-4 text-rose-600" />
                <span>Áp Dụng Riêng Cá Nhân ({idols.length} nhân sự)</span>
              </button>
            </div>

            {/* Chọn cụ thể Nhóm hoặc Cá nhân */}
            {scopeType === 'group' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chọn Nhóm Nhân Viên Được Gán KPI:
                </label>
                <SearchableSelect value={groupId} onChange={setGroupId} ariaLabel="Tìm và chọn nhóm" searchPlaceholder="Nhập tên nhóm..." className="w-full" options={groups.map(g => ({ value: g.id, label: `${g.type === 'custom' ? '🎯 [Nhóm Chỉ Định] ' : '🏢 [Nhóm Hệ Thống] '}${g.name} (${g.memberIds.length} thành viên)` }))} />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Chọn Cá Nhân Được Giao Chỉ Tiêu Riêng:
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                    Chỉ áp dụng loại: Công ty
                  </span>
                </div>
                <SearchableSelect value={assignedIdolId} onChange={setAssignedIdolId} ariaLabel="Tìm và chọn cá nhân" searchPlaceholder="Nhập nghệ danh hoặc họ tên..." className="w-full" options={idols.filter(i => (i.personnelType || 'Công ty') === 'Công ty').map(i => ({ value: i.id, label: `${i.isIdol !== false ? '⭐ ' : '💼 '}${i.stageName} (${i.realName}) - ${i.department}`, keywords: `${i.role} ${i.department}` }))} />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hoạt động Idol áp dụng (tuỳ chọn):
              </label>
              <select
                value={activityCode}
                onChange={(e) => setActivityCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-slate-800"
              >
                <option value="">Không gắn hoạt động (KPI chung)</option>
                {activityOptions.map(activity => (
                  <option key={activity.code} value={activity.code}>
                    {activity.name}{activity.isPrimary ? ' (Chính)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">Chỉ chọn hoạt động đã được gán cho đối tượng KPI.</p>
            </div>
          </div>

          {/* Gợi ý chọn nhanh Preset mẫu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Gợi ý mẫu chỉ tiêu phổ biến (Bấm để điền nhanh):</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {KPI_PRESETS.map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200/80 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  {p.name} ({p.unit})
                </button>
              ))}
            </div>
          </div>

          {/* Thông tin chỉ tiêu: Mã, Tên, Đơn vị */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã Chỉ Tiêu (Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: GMV_LIVE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono font-bold text-slate-900 uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên Chỉ Tiêu KPI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Doanh số GMV Live Commerce"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Mô tả chi tiết */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Diễn Giải Cách Đo Lường / Công Thức Tính
            </label>
            <input
              type="text"
              placeholder="VD: Tính theo tổng doanh số thanh toán thành công qua TikTok Shop trong tháng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 text-slate-700"
            />
          </div>

          {/* Đơn vị, Mức mục tiêu, Ngưỡng tối thiểu, Trọng số */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đơn Vị Tính
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-semibold text-slate-800"
              >
                <option value="VNĐ">VNĐ</option>
                <option value="Giờ">Giờ</option>
                <option value="Phiên live">Phiên live</option>
                <option value="Trận">Trận PK</option>
                <option value="Đơn hàng">Đơn hàng</option>
                <option value="Hợp đồng">Hợp đồng</option>
                <option value="Video">Video</option>
                <option value="%">%</option>
                <option value="Điểm">Điểm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mục Tiêu Cần Đạt
              </label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngưỡng Tối Thiểu
              </label>
              <input
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trọng Số (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono font-bold text-rose-700"
              />
            </div>
          </div>

          {/* Kỳ Đánh Giá & Trạng Thái */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chu Kỳ Đánh Giá
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-medium text-slate-800"
              >
                <option value="monthly">📅 Hàng Tháng (Monthly)</option>
                <option value="quarterly">📊 Hàng Quý (Quarterly)</option>
                <option value="yearly">🎯 Hàng Năm (Yearly)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trạng Thái Hoạt Động
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-medium text-slate-800"
              >
                <option value="active">🟢 Đang áp dụng</option>
                <option value="inactive">⚪ Tạm dừng áp dụng</option>
              </select>
            </div>
          </div>

          {/* Chính Sách Thưởng Vượt KPI */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasBonus}
                  onChange={(e) => setHasBonus(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Kích Hoạt Chính Sách Thưởng Khi Hoàn Thành & Vượt KPI</span>
              </label>
            </div>

            {hasBonus && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    % Thưởng trên phần doanh thu vượt mức
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={bonusRate}
                      onChange={(e) => setBonusRate(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-200 rounded-lg font-mono font-bold text-amber-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Thưởng nóng cố định khi đạt 100% KPI (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="500000"
                    value={flatBonus}
                    onChange={(e) => setFlatBonus(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-200 rounded-lg font-mono font-bold text-emerald-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : settingToEdit ? 'Cập Nhật Chỉ Tiêu' : 'Thiết Đặt KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
