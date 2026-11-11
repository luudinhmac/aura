import React, { useState, useMemo } from 'react';
import { notify } from '../utils/uiFeedback.ts';
import { Idol, KpiGroup, KpiSetting } from '../types/index.ts';
import { KpiGroupModal } from '../components/KpiGroupModal.tsx';
import { KpiSettingModal } from '../components/KpiSettingModal.tsx';
import {
  Target,
  Users,
  Building2,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Coins,
  Percent,
  Layers,
  User,
  Shield,
  HelpCircle,
  Clock,
  Filter
} from 'lucide-react';

interface KpiSettingsViewProps {
  idols: Idol[];
  groups: KpiGroup[];
  kpiSettings: KpiSetting[];
  canManage: boolean;
  onCreateGroup: (data: Partial<KpiGroup>) => Promise<void>;
  onUpdateGroup: (id: string, data: Partial<KpiGroup>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onCreateKpi: (data: Partial<KpiSetting>) => Promise<void>;
  onUpdateKpi: (id: string, data: Partial<KpiSetting>) => Promise<void>;
  onDeleteKpi: (id: string) => Promise<void>;
}

export const KpiSettingsView: React.FC<KpiSettingsViewProps> = ({
  idols,
  groups,
  kpiSettings,
  canManage = true,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onCreateKpi,
  onUpdateKpi,
  onDeleteKpi
}) => {
  // Navigation & View State
  const [viewMode, setViewMode] = useState<'group' | 'individual'>('group');
  const [selectedBlock, setSelectedBlock] = useState<'all' | 'idol' | 'corporate'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => groups[0]?.id || '');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(() => idols[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityCode, setSelectedActivityCode] = useState<string>('all');

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<KpiGroup | null>(null);

  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [kpiToEdit, setKpiToEdit] = useState<KpiSetting | null>(null);
  const [defaultKpiGroupId, setDefaultKpiGroupId] = useState<string | undefined>(undefined);
  const [defaultKpiIdolId, setDefaultKpiIdolId] = useState<string | undefined>(undefined);

  // Delete Confirm Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'group' | 'kpi';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // Lọc nhóm theo block và search
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchesBlock = true;
      if (selectedBlock === 'idol') {
        matchesBlock = g.category === 'idol' || g.type === 'system' && g.name.toLowerCase().includes('idol');
      } else if (selectedBlock === 'corporate') {
        matchesBlock = g.category === 'corporate' || g.type === 'system' && !g.name.toLowerCase().includes('idol');
      }

      return matchesSearch && matchesBlock;
    });
  }, [groups, selectedBlock, searchQuery]);

  // Nhóm đang được chọn
  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || filteredGroups[0] || groups[0];
  }, [groups, selectedGroupId, filteredGroups]);

  // Chính sách: KPI chỉ áp dụng cho nhân sự thuộc loại "Công ty"
  const companyPersonnelList = useMemo(() => {
    return idols.filter(i => (i.personnelType || 'Công ty') === 'Công ty');
  }, [idols]);

  // Nhân sự đang được chọn (cho tab Cá nhân - chỉ thuộc loại Công ty)
  const activePersonnel = useMemo(() => {
    return companyPersonnelList.find(i => i.id === selectedPersonnelId) || companyPersonnelList[0] || idols[0];
  }, [companyPersonnelList, selectedPersonnelId, idols]);

  const activityOptions = useMemo(() => {
    const activities = idols.flatMap((idol) => idol.activities || []);
    return Array.from(new Map(activities.map((activity) => [activity.code, activity])).values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [idols]);

  const matchesActivity = (setting: KpiSetting) =>
    selectedActivityCode === 'all'
      || (selectedActivityCode === 'general' ? !setting.activityCode : setting.activityCode === selectedActivityCode);

  const getActivityLabel = (setting: KpiSetting) => {
    if (!setting.activityCode) return 'KPI chung';
    return activityOptions.find((activity) => activity.code === setting.activityCode)?.name || setting.activityCode;
  };

  const weightSummary = (settings: KpiSetting[]) => {
    const buckets = new Map<string, number>();
    settings.forEach((setting) => {
      const key = setting.activityCode || 'general';
      buckets.set(key, (buckets.get(key) || 0) + (setting.weight || 0));
    });
    return Array.from(buckets.entries()).map(([code, weight]) => ({
      code,
      label: code === 'general' ? 'KPI chung' : getActivityLabel({ activityCode: code } as KpiSetting),
      weight,
      valid: Math.round(weight * 100) / 100 === 100
    }));
  };

  // KPI của nhóm đang chọn
  const groupKpiList = useMemo(() => {
    if (!activeGroup) return [];
    return kpiSettings.filter(k => k.scopeType === 'group' && k.groupId === activeGroup.id && matchesActivity(k));
  }, [kpiSettings, activeGroup, selectedActivityCode]);

  // KPI riêng của cá nhân đang chọn
  const individualKpiList = useMemo(() => {
    if (!activePersonnel) return [];
    return kpiSettings.filter(k => k.scopeType === 'individual' && k.assignedIdolId === activePersonnel.id && matchesActivity(k));
  }, [kpiSettings, activePersonnel, selectedActivityCode]);

  // Các nhóm mà cá nhân đang chọn tham gia
  const personnelGroups = useMemo(() => {
    if (!activePersonnel) return [];
    return groups.filter(g => g.memberIds.includes(activePersonnel.id));
  }, [groups, activePersonnel]);

  // KPI kế thừa từ các nhóm của cá nhân
  const inheritedGroupKpis = useMemo(() => {
    const groupIds = personnelGroups.map(g => g.id);
    return kpiSettings.filter(k => k.scopeType === 'group' && k.groupId && groupIds.includes(k.groupId) && matchesActivity(k));
  }, [kpiSettings, personnelGroups, selectedActivityCode]);

  // Handlers mở modal Group
  const handleOpenAddGroup = () => {
    setGroupToEdit(null);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: KpiGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToEdit(group);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroupClick = (group: KpiGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      type: 'group',
      id: group.id,
      title: `Xóa Nhóm Chỉ Định: ${group.name}`,
      message: `Bạn có chắc chắn muốn xóa nhóm này? Các chỉ tiêu KPI được gán riêng cho nhóm này cũng sẽ bị xóa bỏ.`
    });
  };

  // Handlers mở modal KPI
  const handleOpenAddKpiForGroup = () => {
    setKpiToEdit(null);
    setDefaultKpiGroupId(activeGroup?.id);
    setDefaultKpiIdolId(undefined);
    setIsKpiModalOpen(true);
  };

  const handleOpenAddKpiForIndividual = () => {
    setKpiToEdit(null);
    setDefaultKpiGroupId(undefined);
    setDefaultKpiIdolId(activePersonnel?.id);
    setIsKpiModalOpen(true);
  };

  const handleOpenEditKpi = (kpi: KpiSetting) => {
    setKpiToEdit(kpi);
    setDefaultKpiGroupId(kpi.groupId);
    setDefaultKpiIdolId(kpi.assignedIdolId);
    setIsKpiModalOpen(true);
  };

  const handleDeleteKpiClick = (kpi: KpiSetting) => {
    setDeleteDialog({
      isOpen: true,
      type: 'kpi',
      id: kpi.id,
      title: `Xóa Chỉ Tiêu: ${kpi.name}`,
      message: `Bạn có chắc chắn muốn xóa chỉ tiêu KPI này khỏi hệ thống?`
    });
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === 'group') {
        await onDeleteGroup(deleteDialog.id);
        if (selectedGroupId === deleteDialog.id) {
          const remaining = groups.filter(g => g.id !== deleteDialog.id);
          if (remaining.length > 0) setSelectedGroupId(remaining[0].id);
        }
      } else {
        await onDeleteKpi(deleteDialog.id);
      }
      setDeleteDialog(null);
    } catch (err: any) {
      notify(err.message || 'Lỗi khi xóa', 'error');
    }
  };

  // Helper format tiền tệ
  const formatNumber = (num: number, unit: string) => {
    if (unit === 'VNĐ') {
      return `${num.toLocaleString('vi-VN')} đ`;
    }
    return `${num.toLocaleString('vi-VN')} ${unit}`;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 shadow-2xs">
              <Target className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Thiết Đặt KPI & Quản Lý Nhóm Chỉ Định</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Target Settings OS
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập chỉ tiêu định mức cho 1 nhóm nhân viên chỉ định hoặc tùy biến riêng theo từng cá nhân
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAddGroup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Tạo Nhóm Chỉ Định Mới</span>
            </button>

            <button
              type="button"
              onClick={viewMode === 'group' ? handleOpenAddKpiForGroup : handleOpenAddKpiForIndividual}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thiết Đặt KPI Mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Toolbar: Switcher chế độ xem (Theo Nhóm vs Theo Cá Nhân) & Bộ lọc Khối */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setViewMode('group')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              viewMode === 'group'
                ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>👥 Thiết Đặt Theo Nhóm ({groups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              viewMode === 'individual'
                ? 'bg-white text-rose-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-rose-600" />
            <span>👤 Thiết Đặt Theo Cá Nhân ({idols.length})</span>
          </button>
        </div>

        {/* Khối Switcher & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setSelectedBlock('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                selectedBlock === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setSelectedBlock('idol')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                selectedBlock === 'idol' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600'
              }`}
            >
              ⭐ Khối Idol
            </button>
            <button
              type="button"
              onClick={() => setSelectedBlock('corporate')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                selectedBlock === 'corporate' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'
              }`}
            >
              🏢 Khối Vận Hành
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-rose-400"
            />
          </div>

          <select
            value={selectedActivityCode}
            onChange={(e) => setSelectedActivityCode(e.target.value)}
            aria-label="Lọc KPI theo hoạt động"
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-amber-400 font-semibold text-slate-700"
          >
            <option value="all">Tất cả hoạt động</option>
            <option value="general">KPI chung</option>
            {activityOptions.map((activity) => (
              <option key={activity.code} value={activity.code}>{activity.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'group' ? (
        /* ================= CHẾ ĐỘ 1: THIẾT ĐẶT THEO NHÓM ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột Trái (4 cols): Danh Sách Các Nhóm (Hệ Thống + Chỉ Định) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Danh Sách Nhóm ({filteredGroups.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">Bấm chọn nhóm để xem & gán KPI</span>
            </div>

            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredGroups.map((group) => {
                const isSelected = activeGroup?.id === group.id;
                const isCustom = group.type === 'custom';
                const memberCount = group.memberIds.length;
                const kpiCount = kpiSettings.filter(k => k.scopeType === 'group' && k.groupId === group.id).length;

                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/50 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            isCustom
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isCustom ? '🎯 Nhóm Chỉ Định' : '🏢 Nhóm Hệ Thống'}
                          </span>

                          <span className="text-[9px] font-medium text-slate-400">
                            {group.category === 'idol' ? '⭐ Khối Idol' : group.category === 'corporate' ? '💼 Khối Vận Hành' : '🌐 Kết Hợp'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {group.name}
                        </h4>

                        {group.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>

                      {/* Các nút sửa / xóa nhóm */}
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditGroup(group, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Sửa thông tin & danh sách thành viên nhóm"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteGroupClick(group, e)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Xóa nhóm chỉ định này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Member Avatars & KPI count */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px]">
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {group.memberIds.slice(0, 5).map((mId) => {
                          const person = idols.find(i => i.id === mId);
                          if (!person) return null;
                          return (
                            <div
                              key={mId}
                              className="w-5 h-5 rounded-full overflow-hidden border-2 border-white bg-slate-200"
                              title={`${person.stageName} (${person.department})`}
                            >
                              <img
                                src={person.avatarUrl}
                                alt={person.stageName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })}
                        {memberCount > 5 && (
                          <span className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">
                            +{memberCount - 5}
                          </span>
                        )}
                        <span className="ml-2 text-[10px] text-slate-500 font-medium">
                          {memberCount} thành viên
                        </span>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                        {kpiCount} KPI
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột Phải (8 cols): Chi Tiết Nhóm & Danh Sách Chỉ Tiêu KPI Của Nhóm */}
          <div className="lg:col-span-8 space-y-4">
            {activeGroup ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                {/* Header Chi Tiết Nhóm Đang Chọn */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        {activeGroup.name}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        activeGroup.type === 'custom'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {activeGroup.type === 'custom' ? '🎯 Nhóm Chỉ Định' : '🏢 Nhóm Hệ Thống'}
                      </span>
                    </div>
                    {activeGroup.description && (
                      <p className="text-xs text-slate-500 mt-1">
                        {activeGroup.description}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditGroup(activeGroup, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sửa Nhóm / Thành Viên</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenAddKpiForGroup}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm KPI Cho Nhóm Này</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Danh sách thành viên trong nhóm dạng chips */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Thành Viên Nhận Bộ KPI Này ({activeGroup.memberIds.length} nhân sự):</span>
                    </span>
                    {activeGroup.leaderId && (
                      <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Trưởng nhóm: {idols.find(i => i.id === activeGroup.leaderId)?.stageName || 'Chưa gán'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeGroup.memberIds.map(mId => {
                      const person = idols.find(i => i.id === mId);
                      if (!person) return null;
                      const isLeader = activeGroup.leaderId === person.id;

                      return (
                        <div
                          key={mId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs"
                        >
                          <div className="w-5 h-5 rounded-md overflow-hidden bg-slate-100 shrink-0">
                            <img
                              src={person.avatarUrl}
                              alt={person.stageName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {person.stageName}
                          </span>
                          {isLeader && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                              Leader
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bảng Danh Sách KPI Của Nhóm */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-rose-600" />
                      <span>Bộ Chỉ Tiêu KPI Áp Dụng Cho Cả Nhóm ({groupKpiList.length} chỉ tiêu)</span>
                    </h3>

                    {groupKpiList.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500">
                        Tổng trọng số:{' '}
                        {weightSummary(groupKpiList).map((summary) => (
                          <span key={summary.code} className={`ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${summary.valid ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`} title={`${summary.label}: ${summary.weight}%`}>
                            {summary.label}: {summary.weight}%{summary.valid ? ' ✓' : ' ⚠'}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>

                  {groupKpiList.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                      <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">Nhóm này chưa được thiết đặt chỉ tiêu KPI nào</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Nhấn "Thêm KPI Cho Nhóm Này" để bắt đầu gán chỉ tiêu</p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={handleOpenAddKpiForGroup}
                          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm Chỉ Tiêu Đầu Tiên</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200/90 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                            <th className="py-2.5 px-3">Mã KPI</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Tên Chỉ Tiêu & Diễn Giải</th>
                            <th className="py-2.5 px-3 text-right">Mục Tiêu Cần Đạt</th>
                            <th className="py-2.5 px-3 text-right">Ngưỡng Tối Thiểu</th>
                            <th className="py-2.5 px-2 text-center">Trọng Số</th>
                            <th className="py-2.5 px-3">Thưởng Vượt KPI</th>
                            <th className="py-2.5 px-2 text-center">Trạng Thái</th>
                            {canManage && <th className="py-2.5 px-3 text-center w-20">Thao Tác</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-normal">
                          {groupKpiList.map((kpi) => (
                            <tr key={kpi.id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-rose-700 text-[11px]">
                                {kpi.code}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 text-xs">
                                  {kpi.name}
                                </div>
                                {kpi.description && (
                                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                    {kpi.description}
                                  </div>
                                )}
                                <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-800">
                                  {getActivityLabel(kpi)}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                {formatNumber(kpi.targetValue, kpi.unit)}
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums text-[11px]">
                                {kpi.minThreshold !== undefined ? formatNumber(kpi.minThreshold, kpi.unit) : '-'}
                              </td>

                              <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-600 text-xs tabular-nums">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200/60">
                                  {kpi.weight}%
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-xs">
                                {kpi.bonusIncentive ? (
                                  <div className="space-y-0.5">
                                    {kpi.bonusIncentive.ratePercent && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                        <Coins className="w-2.5 h-2.5 text-amber-600" />
                                        <span>+{kpi.bonusIncentive.ratePercent}% vượt mức</span>
                                      </span>
                                    )}
                                    {kpi.bonusIncentive.flatBonusVnd && (
                                      <span className="block text-[10px] text-emerald-700 font-semibold">
                                        Thưởng nóng: {kpi.bonusIncentive.flatBonusVnd.toLocaleString('vi-VN')} đ
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>

                              <td className="py-2.5 px-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  kpi.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {kpi.status === 'active' ? 'Áp dụng' : 'Tạm dừng'}
                                </span>
                              </td>

                              {canManage && (
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditKpi(kpi)}
                                      className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      title="Chỉnh sửa chỉ tiêu này"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteKpiClick(kpi)}
                                      className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Xóa chỉ tiêu này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Vui lòng chọn 1 nhóm bên trái để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= CHẾ ĐỘ 2: THIẾT ĐẶT THEO CÁ NHÂN ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột Trái (4 cols): Danh Sách Nhân Sự */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-rose-600" />
                <span>Nhân Sự Công Ty Áp Dụng KPI ({companyPersonnelList.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">Chọn để gán KPI riêng</span>
            </div>

            <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-xl p-2.5 font-medium leading-relaxed">
              💡 <strong>Quy định:</strong> KPI chỉ áp dụng cho nhân viên chính thức của công ty (loại nhân sự: <strong>Công ty</strong>).
            </div>

            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {companyPersonnelList.map(person => {
                const isSelected = activePersonnel?.id === person.id;
                const isIdol = person.isIdol !== false;
                const customKpiCount = kpiSettings.filter(k => k.scopeType === 'individual' && k.assignedIdolId === person.id).length;

                return (
                  <div
                    key={person.id}
                    onClick={() => setSelectedPersonnelId(person.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-rose-50/90 to-pink-50/40 border-rose-400 shadow-xs ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img
                        src={person.avatarUrl}
                        alt={person.stageName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {person.stageName}
                        </span>
                        <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                          isIdol ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isIdol ? 'Idol' : 'Staff'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {person.realName} · {person.department}
                      </div>
                    </div>

                    {customKpiCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {customKpiCount} KPI riêng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột Phải (8 cols): KPI Kế Thừa Từ Nhóm & KPI Riêng Của Nhân Sự */}
          <div className="lg:col-span-8 space-y-4">
            {activePersonnel && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                {/* Header Cá Nhân */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-2xs shrink-0">
                      <img
                        src={activePersonnel.avatarUrl}
                        alt={activePersonnel.stageName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>{activePersonnel.stageName}</span>
                        <span className="text-xs font-normal text-slate-500">({activePersonnel.realName})</span>
                      </h2>
                      <p className="text-xs text-sky-800 font-semibold mt-0.5">
                        {activePersonnel.role} · <span className="font-normal text-slate-600">{activePersonnel.department}</span>
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={handleOpenAddKpiForIndividual}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm KPI Riêng Cho Nhân Sự Này</span>
                    </button>
                  )}
                </div>

                {/* 1. KPI Riêng Của Cá Nhân Này */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>Chỉ Tiêu KPI Riêng Biệt Của {activePersonnel.stageName} ({individualKpiList.length})</span>
                  </h3>

                  {individualKpiList.length === 0 ? (
                    <div className="py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                      <p className="text-xs text-slate-500">Nhân sự này chưa có chỉ tiêu KPI riêng (hiện đang áp dụng theo KPI nhóm bên dưới)</p>
                      {canManage && (
                        <button
                          type="button"
                          onClick={handleOpenAddKpiForIndividual}
                          className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                        >
                          + Thiết đặt chỉ tiêu riêng ngay
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-rose-200/80 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-rose-50/70 border-b border-rose-200 text-[11px] font-bold text-rose-900">
                            <th className="py-2.5 px-3">Mã KPI</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Tên Chỉ Tiêu Riêng</th>
                            <th className="py-2.5 px-3 text-right">Mục Tiêu Cần Đạt</th>
                            <th className="py-2.5 px-2 text-center">Trọng Số</th>
                            <th className="py-2.5 px-3">Thưởng Vượt KPI</th>
                            {canManage && <th className="py-2.5 px-3 text-center w-20">Thao Tác</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100 font-normal">
                          {individualKpiList.map(kpi => (
                            <tr key={kpi.id} className="hover:bg-rose-50/30">
                              <td className="py-2.5 px-3 font-mono font-bold text-rose-700 text-[11px]">{kpi.code}</td>
                               <td className="py-2.5 px-3 font-bold text-slate-900">
                                 <div>{kpi.name}</div>
                                 <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-800">
                                   {getActivityLabel(kpi)}
                                 </span>
                               </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(kpi.targetValue, kpi.unit)}</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-600">{kpi.weight}%</td>
                              <td className="py-2.5 px-3 text-xs">
                                {kpi.bonusIncentive ? (
                                  <span className="text-amber-800 font-semibold text-[10px]">
                                    +{kpi.bonusIncentive.ratePercent}% thưởng
                                  </span>
                                ) : '-'}
                              </td>
                              {canManage && (
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditKpi(kpi)}
                                      className="p-1 rounded text-slate-500 hover:text-indigo-600"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteKpiClick(kpi)}
                                      className="p-1 rounded text-slate-500 hover:text-rose-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. KPI Kế Thừa Từ Các Nhóm Tham Gia */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Chỉ Tiêu KPI Kế Thừa Từ Các Nhóm Đang Tham Gia ({inheritedGroupKpis.length})</span>
                  </h3>

                  {inheritedGroupKpis.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nhân sự này chưa thuộc nhóm nào có KPI</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                            <th className="py-2 px-3">Thuộc Nhóm</th>
                            <th className="py-2 px-3">Mã KPI</th>
                            <th className="py-2 px-3">Tên Chỉ Tiêu Nhóm</th>
                            <th className="py-2 px-3 text-right">Mục Tiêu Nhóm</th>
                            <th className="py-2 px-2 text-center">Trọng Số</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inheritedGroupKpis.map(kpi => {
                            const group = groups.find(g => g.id === kpi.groupId);
                            return (
                              <tr key={kpi.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {group?.name || 'Nhóm'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-indigo-700">{kpi.code}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">{kpi.name}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{formatNumber(kpi.targetValue, kpi.unit)}</td>
                                <td className="py-2 px-2 text-center font-mono font-bold text-indigo-600">{kpi.weight}%</td>
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
          </div>
        </div>
      )}

      {/* Modal Quản Lý Nhóm Chỉ Định */}
      <KpiGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        groupToEdit={groupToEdit}
        idols={idols}
        onSave={async (data) => {
          if (groupToEdit) {
            await onUpdateGroup(groupToEdit.id, data);
          } else {
            await onCreateGroup(data);
          }
        }}
      />

      {/* Modal Quản Lý Chỉ Tiêu KPI */}
      <KpiSettingModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        settingToEdit={kpiToEdit}
        groups={groups}
        idols={idols}
        defaultGroupId={defaultKpiGroupId}
        defaultIdolId={defaultKpiIdolId}
        onSave={async (data) => {
          if (kpiToEdit) {
            await onUpdateKpi(kpiToEdit.id, data);
          } else {
            await onCreateKpi(data);
          }
        }}
      />

      {/* Modal Xác Nhận Xóa Chung */}
      {deleteDialog && deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] p-4 sm:p-6 space-y-4 overflow-y-auto min-h-0 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{deleteDialog.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{deleteDialog.message}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
