import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Idol, ColumnHeadersConfig, IdolCategoryType, IDOL_CATEGORIES_CONFIG, PersonnelColumn } from '../types/index.ts';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  AlertCircle,
  Plus,
  Settings,
  Sliders,
  Type,
  HelpCircle,
  Tag,
  Columns3,
  Check,
  RotateCcw,
  CalendarClock,
  ShoppingBag,
  Briefcase,
  AtSign,
  Mail,
  User,
  Clock,
  XCircle
} from 'lucide-react';

import { isIdolDepartment, isStaffDepartment, IDOL_TEAMS, CORPORATE_DEPARTMENTS } from '../types/roles.ts';
import { calculateExactAge, calculateTenure, formatDateVN } from '../utils/dateUtils.ts';
import { formatPersonnelColumnValue, getRosterCustomColumns, mergeRosterVisibility } from '../utils/personnelColumnUtils.ts';

export type ColumnKey =
  | 'stt'
  | 'stageName'
  | 'realName'
  | 'age'
  | 'dob'
  | 'joinDate'
  | 'tenure'
  | 'role'
  | 'height'
  | 'weight'
  | 'hometown'
  | 'currentLiving'
  | 'department'
  | 'personnelType'
  | 'status'
  | 'actions';

type RosterColumnDefinition = {
  key: string;
  label: string;
  isCore?: boolean;
  customColumn?: PersonnelColumn;
};

const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  stt: true,
  stageName: true,
  realName: true,
  age: true,
  dob: true,
  joinDate: true,
  tenure: true,
  role: true,
  height: true,
  weight: true,
  hometown: true,
  currentLiving: true,
  department: true,
  personnelType: true,
  status: true,
  actions: true,
};

interface IdolListViewProps {
  idols: Idol[];
  departments: string[];
  personnelTypes?: string[];
  statuses: string[];
  columnHeaders: ColumnHeadersConfig;
  personnelColumns?: PersonnelColumn[];
  referenceYear: number;
  referenceDate?: string;
  canManageIdols?: boolean;
  canDeletePersonnel?: boolean;
  onEdit: (idol: Idol) => void;
  onDelete: (id: string) => void;
  onViewDetails: (idol: Idol) => void;
  onOpenAddModal: () => void;
  onHoverIdol: (idol: Idol | null, pos: { x: number; y: number } | null) => void;
  onGoToSchedule?: (idolId: string) => void;
}

export const IdolListView: React.FC<IdolListViewProps> = ({
  idols,
  departments,
  personnelTypes = ['Công ty', 'Outsource', 'Cộng tác viên', 'Thực tập sinh'],
  statuses,
  columnHeaders,
  personnelColumns = [],
  referenceYear,
  referenceDate,
  canManageIdols = true,
  canDeletePersonnel = canManageIdols,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenAddModal,
  onHoverIdol,
  onGoToSchedule
}) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<'all' | 'idol' | 'corporate'>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPersonnelType, setSelectedPersonnelType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Column visibility state persisted in localStorage
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('aura_visible_columns_roster');
      if (saved) {
        return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Close column picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setIsColumnPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const systemColumnDefinitions: RosterColumnDefinition[] = useMemo(() => [
    { key: 'stt', label: columnHeaders.stt || 'STT' },
    { key: 'stageName', label: columnHeaders.stageName || 'Nghệ Danh & Ảnh', isCore: true },
    { key: 'realName', label: columnHeaders.realName || 'Tên Thật' },
    { key: 'age', label: columnHeaders.age || 'Tuổi' },
    { key: 'dob', label: columnHeaders.dob || 'Ngày Sinh' },
    { key: 'joinDate', label: columnHeaders.joinDate || 'Ngày Vào' },
    { key: 'tenure', label: columnHeaders.tenure || 'Thâm Niên' },
    { key: 'role', label: columnHeaders.role || 'Nghề Nghiệp' },
    { key: 'height', label: columnHeaders.height || 'Chiều Cao' },
    { key: 'weight', label: columnHeaders.weight || 'Cân Nặng' },
    { key: 'hometown', label: columnHeaders.hometown || 'Quê Quán' },
    { key: 'currentLiving', label: columnHeaders.currentLiving || 'Nơi Sống' },
    { key: 'department', label: columnHeaders.department || 'Thuộc Đơn Vị' },
    { key: 'personnelType', label: columnHeaders.personnelType || 'Loại Nhân Sự' },
    { key: 'status', label: columnHeaders.status || 'Trạng Thái' },
    { key: 'actions', label: columnHeaders.actions || 'Thao Tác' },
  ], [columnHeaders]);

  const columnDefinitions: RosterColumnDefinition[] = useMemo(() => {
    const customColumns = getRosterCustomColumns(personnelColumns)
      .map(column => ({ key: column.key, label: column.label, customColumn: column }));
    return [
      ...systemColumnDefinitions.map(column => ({ ...column })),
      ...customColumns,
    ];
  }, [personnelColumns, systemColumnDefinitions]);

  useEffect(() => {
    setVisibleColumns(previous => {
      const next = mergeRosterVisibility(previous, personnelColumns);
      return Object.keys(next).length === Object.keys(previous).length ? previous : next;
    });
  }, [personnelColumns]);

  const visibleColumnsCount = Object.values(visibleColumns).filter(Boolean).length;

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('aura_visible_columns_roster', JSON.stringify(next));
      return next;
    });
  };

  const setAllColumns = (val: boolean) => {
    const next: Record<string, boolean> = { ...DEFAULT_VISIBLE_COLUMNS };
    personnelColumns.forEach(column => {
      if (column.isActive && column.showInRoster && !column.isSystem) {
        next[column.key] = true;
      }
    });
    Object.keys(next).forEach((k) => {
      next[k as ColumnKey] = k === 'stageName' ? true : val;
    });
    setVisibleColumns(next);
    localStorage.setItem('aura_visible_columns_roster', JSON.stringify(next));
  };

  const setCompactPreset = () => {
    const compact: Record<string, boolean> = {
      stt: true,
      stageName: true,
      realName: true,
      age: true,
      dob: false,
      joinDate: false,
      tenure: false,
      role: true,
      height: false,
      weight: false,
      hometown: false,
      currentLiving: false,
      department: true,
      personnelType: false,
      status: true,
      actions: true,
    };
    personnelColumns.forEach(column => {
      if (column.isActive && column.showInRoster && !column.isSystem) {
        compact[column.key] = false;
      }
    });
    setVisibleColumns(compact);
    localStorage.setItem('aura_visible_columns_roster', JSON.stringify(compact));
  };

  // Đồng bộ hoàn toàn với danh sách trạng thái & loại nhân sự từ cấu hình Quản Trị Hệ Thống
  const allStatuses = useMemo(() => {
    const list = statuses && statuses.length > 0
      ? [...statuses]
      : ['Đang hoạt động', 'Đang lưu diễn', 'Đang ghi hình', 'Tạm nghỉ', 'Đã nghỉ việc'];
    if (!list.includes('Chờ duyệt')) {
      list.push('Chờ duyệt');
    }
    return list;
  }, [statuses]);
  const allPersonnelTypes = useMemo(() => (
    personnelTypes && personnelTypes.length > 0
      ? personnelTypes
      : ['Công ty', 'Outsource', 'Cộng tác viên', 'Thực tập sinh', 'Dịch vụ ngoài']
  ), [personnelTypes]);

  // Đếm số lượng nhân sự theo từng phòng ban
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    idols.forEach(i => {
      counts[i.department] = (counts[i.department] || 0) + 1;
    });
    return counts;
  }, [idols]);

  // Phân tách 3 Nhóm Idol Chuyên Biệt và Khối Phòng Ban Quản Lý Vận Hành
  const { idolTeams, corporateDepts } = useMemo(() => {
    const idol: string[] = [];
    const corporate: string[] = [];
    departments.forEach(dept => {
      if (isIdolDepartment(dept)) {
        idol.push(dept);
      } else {
        corporate.push(dept);
      }
    });
    return { idolTeams: idol, corporateDepts: corporate };
  }, [departments]);

  // Đếm số lượng nhân sự theo từng Khối (Block)
  const blockCounts = useMemo(() => {
    let idol = 0;
    let corporate = 0;
    let external = 0;
    idols.forEach(i => {
      if (i.personnelType === 'Dịch vụ ngoài') {
        external++;
        return;
      }
      if (i.isIdol !== false && isIdolDepartment(i.department)) {
        idol++;
      } else {
        corporate++;
      }
    });
    return { all: idols.length, idol, corporate, external };
  }, [idols]);

  // Đếm số lượng nhân sự theo 3 phân loại idol chuyên biệt
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: blockCounts.idol, gaming_gear: 0, performance_donate: 0, live_commerce: 0 };
    idols.forEach(i => {
      if (i.isIdol !== false && i.idolCategory && counts[i.idolCategory] !== undefined) {
        counts[i.idolCategory]++;
      }
    });
    return counts;
  }, [idols, blockCounts.idol]);

  // Xử lý chuyển đổi Khối
  const handleSelectBlock = (block: 'all' | 'idol' | 'corporate') => {
    setSelectedBlock(block);
    setSelectedDept('all');
    if (block === 'corporate') {
      setSelectedCategory('all');
    }
  };

  // Xử lý chọn Đơn vị / Nhóm chi tiết từ dropdown
  const handleSelectDept = (deptValue: string) => {
    if (deptValue === 'all') {
      setSelectedDept('all');
    } else if (deptValue === 'block:idol') {
      setSelectedBlock('idol');
      setSelectedDept('all');
    } else if (deptValue === 'block:corporate') {
      setSelectedBlock('corporate');
      setSelectedDept('all');
      setSelectedCategory('all');
    } else {
      setSelectedDept(deptValue);
      if (isIdolDepartment(deptValue)) {
        setSelectedBlock('idol');
      } else if (isStaffDepartment(deptValue)) {
        setSelectedBlock('corporate');
        setSelectedCategory('all');
      }
    }
  };

  const filteredIdols = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim();
    return idols.filter(idol => {
      const matchesSearch = !searchTerm ||
        idol.stageName.toLowerCase().includes(searchTerm) ||
        idol.realName.toLowerCase().includes(searchTerm) ||
        idol.role.toLowerCase().includes(searchTerm) ||
        idol.hometown.toLowerCase().includes(searchTerm) ||
        idol.currentLiving.toLowerCase().includes(searchTerm);

      const isExternal = idol.personnelType === 'Dịch vụ ngoài';
      const isIdol = !isExternal && idol.isIdol !== false && isIdolDepartment(idol.department);
      const isCorp = !isExternal && (idol.isIdol === false || isStaffDepartment(idol.department));
      const matchesBlock = selectedBlock === 'all' || (selectedBlock === 'idol' ? isIdol : isCorp);
      const matchesDept = selectedDept === 'all' ||
        (selectedDept === 'block:idol' ? isIdol :
          selectedDept === 'block:corporate' ? isCorp : idol.department === selectedDept);
      const matchesCategory = selectedCategory === 'all' || idol.idolCategory === selectedCategory;
      const matchesPersonnelType = selectedPersonnelType === 'all' || (idol.personnelType || 'Công ty') === selectedPersonnelType;
      const matchesStatus = selectedStatus === 'all' || idol.status === selectedStatus;

      return matchesSearch && matchesBlock && matchesDept && matchesCategory && matchesPersonnelType && matchesStatus;
    });
  }, [idols, searchQuery, selectedBlock, selectedDept, selectedCategory, selectedPersonnelType, selectedStatus]);

  const handleMouseEnter = (idol: Idol, e: React.MouseEvent) => {
    onHoverIdol(idol, { x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (idol: Idol, e: React.MouseEvent) => {
    onHoverIdol(idol, { x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    onHoverIdol(null, null);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nghệ danh, tên thật, quê quán, nghề nghiệp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-colors"
          />
        </div>

        {/* Filter Toolbar (Block Tabs, Department, Category, Personnel Type, Status, Column Selector, Add Idol) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Block Filter */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="sr-only">Lọc theo khối</span>
            <select
              value={selectedBlock}
              onChange={(e) => handleSelectBlock(e.target.value as 'all' | 'idol' | 'corporate')}
              aria-label="Lọc theo khối"
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-semibold focus:outline-none transition-colors cursor-pointer ${selectedBlock === 'idol'
                  ? 'bg-rose-50/80 border-rose-300 text-rose-900 focus:border-rose-400'
                  : selectedBlock === 'corporate'
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 focus:border-indigo-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
                }`}
            >
              <option value="all">Tất cả ({blockCounts.all})</option>
              <option value="idol">⭐ Khối Idol ({blockCounts.idol})</option>
              <option value="corporate">🏢 Khối Vận Hành ({blockCounts.corporate})</option>
            </select>
          </label>

          {/* Department Filter with OptGroups & Correct counts */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={selectedDept}
              onChange={(e) => handleSelectDept(e.target.value)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-semibold focus:outline-none transition-colors cursor-pointer ${selectedBlock === 'idol'
                  ? 'bg-rose-50/80 border-rose-300 text-rose-900 focus:border-rose-400'
                  : selectedBlock === 'corporate'
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 focus:border-indigo-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'
                }`}
            >
              {selectedBlock === 'all' && (
                <>
                  <option value="all">Tất cả đơn vị ({idols.length})</option>
                  <option value="block:idol">⭐ Toàn Bộ Khối Idol ({blockCounts.idol})</option>
                  {idolTeams.map((dept) => (
                    <option key={dept} value={dept}>
                      &nbsp;&nbsp;&nbsp;{dept} ({deptCounts[dept] || 0})
                    </option>
                  ))}
                  <option value="block:corporate">🏢 Toàn Bộ Khối Quản Lý & Vận Hành ({blockCounts.corporate})</option>
                  {corporateDepts.map((dept) => (
                    <option key={dept} value={dept}>
                      &nbsp;&nbsp;&nbsp;{dept} ({deptCounts[dept] || 0})
                    </option>
                  ))}
                </>
              )}

              {selectedBlock === 'idol' && (
                <>
                  <option value="all">⭐ Toàn Bộ Khối Idol ({blockCounts.idol})</option>
                  {idolTeams.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} ({deptCounts[dept] || 0})
                    </option>
                  ))}
                </>
              )}

              {selectedBlock === 'corporate' && (
                <>
                  <option value="all">🏢 Toàn Bộ Khối Quản Lý & Vận Hành ({blockCounts.corporate})</option>
                  {corporateDepts.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} ({deptCounts[dept] || 0})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Personnel Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={selectedPersonnelType}
              onChange={(e) => setSelectedPersonnelType(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-rose-400 font-medium"
            >
              <option value="all">Tất cả loại nhân sự</option>
              {allPersonnelTypes.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-rose-400"
            >
              <option value="all">Tất cả trạng thái</option>
              {allStatuses.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Column Visibility Selector Dropdown */}
          <div className="relative" ref={columnPickerRef}>
            <button
              type="button"
              onClick={() => setIsColumnPickerOpen(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${isColumnPickerOpen
                  ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-2xs'
                  : visibleColumnsCount < columnDefinitions.length
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              title="Tùy chọn ẩn / hiển thị các cột trên bảng danh sách"
            >
              <Columns3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Cột</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white border border-slate-200 text-slate-600">
                {visibleColumnsCount}/{columnDefinitions.length}
              </span>
            </button>

            {/* Dropdown Popover */}
            {isColumnPickerOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Columns3 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Tùy chọn cột ({visibleColumnsCount}/{columnDefinitions.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAllColumns(true)}
                      className="px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50 rounded transition-colors font-semibold cursor-pointer"
                    >
                      Hiện hết
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={setCompactPreset}
                      className="px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 rounded transition-colors font-medium cursor-pointer"
                      title="Chỉ hiển thị các thông tin cơ bản"
                    >
                      Xem gọn
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-2 gap-1 text-xs">
                  {columnDefinitions.map((col) => {
                    const isVisible = visibleColumns[col.key];
                    return (
                      <label
                        key={col.key}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] transition-colors ${col.isCore
                            ? 'bg-slate-50/70 border-slate-200/60 opacity-80 cursor-not-allowed'
                            : isVisible
                              ? 'bg-rose-50/50 border-rose-200 text-slate-800 cursor-pointer hover:bg-rose-50'
                              : 'bg-white border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          disabled={col.isCore}
                          onChange={() => !col.isCore && toggleColumn(col.key)}
                          className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="truncate" title={col.label}>
                          {col.label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>* Tự động lưu lựa chọn</span>
                  <button
                    type="button"
                    onClick={() => setAllColumns(true)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Mặc định</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onGoToSchedule && (
              <button
                onClick={() => onGoToSchedule('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Mở bảng thiết lập lịch làm việc cho từng nhân sự / idol"
              >
                <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lịch Làm Việc</span>
              </button>
            )}

            {canManageIdols && (
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thành viên</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 tracking-wider">
                {visibleColumns.stt && <th className="py-2 px-2 w-10 text-center">{columnHeaders.stt || 'STT'}</th>}
                {visibleColumns.stageName && <th className="py-2 px-3 min-w-[150px]">{columnHeaders.stageName || 'Nghệ Danh & Ảnh'}</th>}
                {visibleColumns.realName && <th className="py-2 px-2 min-w-[110px]">{columnHeaders.realName || 'Tên Thật'}</th>}

                {/* Cột Tuổi (Được tính chuẩn theo ngày tháng tròn) */}
                {visibleColumns.age && (
                  <th className="roster-age-header py-2 px-1.5 w-12 text-center bg-rose-50/50 text-rose-900 border-x border-rose-100">
                    <span>{columnHeaders.age || 'Tuổi'}</span>
                  </th>
                )}

                {visibleColumns.dob && <th className="py-2 px-2 min-w-[85px]">{columnHeaders.dob || 'Ngày Sinh'}</th>}
                {visibleColumns.joinDate && <th className="py-2 px-2 min-w-[85px]">{columnHeaders.joinDate || 'Ngày Vào'}</th>}
                {visibleColumns.tenure && <th className="py-2 px-2 min-w-[95px]">{columnHeaders.tenure || 'Thâm Niên'}</th>}
                {visibleColumns.role && <th className="py-2 px-2 min-w-[105px]">{columnHeaders.role || 'Nghề Nghiệp'}</th>}
                {visibleColumns.height && <th className="py-2 px-2 min-w-[65px] text-right">{columnHeaders.height || 'Chiều Cao'}</th>}
                {visibleColumns.weight && <th className="py-2 px-2 min-w-[65px] text-right">{columnHeaders.weight || 'Cân Nặng'}</th>}
                {visibleColumns.hometown && <th className="py-2 px-2 min-w-[85px]">{columnHeaders.hometown || 'Quê Quán'}</th>}
                {visibleColumns.currentLiving && <th className="py-2 px-2 min-w-[90px]">{columnHeaders.currentLiving || 'Nơi Sống'}</th>}
                {visibleColumns.department && <th className="py-2 px-2 min-w-[115px]">{columnHeaders.department || 'Thuộc Đơn Vị'}</th>}
                {visibleColumns.personnelType && <th className="py-2 px-2 min-w-[95px]">{columnHeaders.personnelType || 'Loại Nhân Sự'}</th>}
                {visibleColumns.status && <th className="py-2 px-2 min-w-[90px] text-center">{columnHeaders.status || 'Trạng Thái'}</th>}
                {columnDefinitions.filter(col => col.customColumn && visibleColumns[col.key]).map(col => (
                  <th key={col.key} className="py-2 px-2 min-w-[110px]">{col.label}</th>
                ))}
                {visibleColumns.actions && <th className="py-2 px-2 w-20 text-center">{columnHeaders.actions || 'Thao Tác'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredIdols.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnsCount || 1} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-600">Không tìm thấy nhân sự phù hợp</p>
                      <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIdols.map((idol, index) => {
                  const calculatedAge = calculateExactAge(idol.dob, referenceDate);
                  const tenureInfo = calculateTenure(idol.joinDate, referenceDate);

                  return (
                    <tr
                      key={idol.id}
                      className="hover:bg-rose-50/40 transition-colors group cursor-pointer"
                      onClick={() => onViewDetails(idol)}
                    >
                      {/* Dynamic STT: Không gắn cứng DB */}
                      {visibleColumns.stt && (
                        <td className="py-2 px-1 text-center font-mono font-medium text-slate-600 tabular-nums text-xs">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                      )}

                      {/* Nghệ danh & Avatar: Di chuột vào ảnh / nghệ danh để xem thông tin nhanh */}
                      {visibleColumns.stageName && (
                        <td
                          className="py-1.5 px-2"
                          onMouseEnter={(e) => handleMouseEnter(idol, e)}
                          onMouseMove={(e) => handleMouseMove(idol, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-rose-200 bg-slate-100 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              <img
                                src={idol.avatarUrl}
                                alt={idol.stageName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors truncate text-xs">
                                {idol.stageName}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{idol.id.slice(-6)}
                                </span>
                                {idol.personnelType === 'Dịch vụ ngoài' ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border bg-amber-50 text-amber-800 border-amber-200 leading-tight">
                                    <span>🏷️</span>
                                    <span>Dịch Vụ Ngoài</span>
                                  </span>
                                ) : idol.isIdol === false ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200 leading-tight">
                                    <span>💼</span>
                                    <span>Khối Vận Hành</span>
                                  </span>
                                ) : (
                                  idol.idolCategory && IDOL_CATEGORIES_CONFIG[idol.idolCategory] && (
                                    <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeBg} ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeBorder} ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeText} leading-tight`}>
                                      <span>{IDOL_CATEGORIES_CONFIG[idol.idolCategory].icon}</span>
                                      <span>{IDOL_CATEGORIES_CONFIG[idol.idolCategory].shortLabel}</span>
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Tên thật & Tài khoản/Email nội bộ (áp dụng riêng cho loại nhân sự: Công ty) */}
                      {visibleColumns.realName && (
                        <td
                          className="py-2 px-2 text-xs"
                          onMouseEnter={(e) => handleMouseEnter(idol, e)}
                          onMouseMove={(e) => handleMouseMove(idol, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <div className="font-semibold text-slate-800">
                            {idol.realName}
                          </div>
                          {((idol.personnelType || 'Công ty') === 'Công ty') && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              {(idol.accountUsername || idol.userId) && (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-700 bg-indigo-50/90 px-1.5 py-0.5 rounded w-fit border border-indigo-200/50 leading-none" title="Tên đăng nhập hệ thống">
                                  <AtSign className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  <span>{idol.accountUsername || idol.userId?.replace('user-', '')}</span>
                                </span>
                              )}
                              {idol.socialLinks?.email && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[155px]" title={`Email công ty: ${idol.socialLinks.email}`}>
                                  <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{idol.socialLinks.email}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Cột Tuổi tính chuẩn */}
                      {visibleColumns.age && (
                        <td className="py-2 px-1 text-center font-mono text-xs text-slate-600 tabular-nums">
                          <span>{calculatedAge}</span>
                        </td>
                      )}

                      {/* Ngày năm sinh */}
                      {visibleColumns.dob && (
                        <td className="py-2 px-2 text-slate-600 font-mono tabular-nums text-xs">
                          {formatDateVN(idol.dob)}
                        </td>
                      )}

                      {/* Ngày vào công ty / đơn vị */}
                      {visibleColumns.joinDate && (
                        <td className="py-2 px-2 text-slate-600 font-mono tabular-nums text-xs">
                          {formatDateVN(idol.joinDate)}
                        </td>
                      )}

                      {/* Thâm niên (năm, tháng, ngày) */}
                      {visibleColumns.tenure && (
                        <td className="py-2 px-2">
                          {idol.personnelType === 'Dịch vụ ngoài' ? (
                            <span className="text-slate-300 font-mono text-xs">-</span>
                          ) : (
                            <span
                              className="font-mono text-xs text-slate-600 whitespace-nowrap"
                              title={`Gia nhập: ${formatDateVN(idol.joinDate)} · Thâm niên: ${tenureInfo.formattedText}`}
                            >
                              {tenureInfo.shortText}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Nghề nghiệp */}
                      {visibleColumns.role && (
                        <td className="py-2 px-2 text-slate-700 dark:text-slate-300 font-normal text-xs">
                          {idol.role}
                        </td>
                      )}

                      {/* Chiều cao */}
                      {visibleColumns.height && (
                        <td className="py-2 px-1.5 text-right font-mono tabular-nums text-slate-700 text-xs">
                          {idol.height && idol.height > 0 ? (
                            <>
                              {idol.height} <span className="text-slate-400 text-[10px]">cm</span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      )}

                      {/* Cân nặng */}
                      {visibleColumns.weight && (
                        <td className="py-2 px-1.5 text-right font-mono tabular-nums text-slate-700 text-xs">
                          {idol.weight && idol.weight > 0 ? (
                            <>
                              {idol.weight} <span className="text-slate-400 text-[10px]">kg</span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      )}

                      {/* Quê quán */}
                      {visibleColumns.hometown && (
                        <td className="py-2 px-2 text-slate-600 truncate max-w-[100px] text-xs">
                          {idol.hometown}
                        </td>
                      )}

                      {/* Nơi sống */}
                      {visibleColumns.currentLiving && (
                        <td className="py-2 px-2 text-slate-600 truncate max-w-[110px] text-xs">
                          {idol.currentLiving}
                        </td>
                      )}

                      {/* Thuộc đơn vị */}
                      {visibleColumns.department && (
                        <td className="py-2 px-2 text-slate-700 font-medium truncate max-w-[140px]">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                            idol.personnelType === 'Dịch vụ ngoài'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 font-medium'
                              : isIdolDepartment(idol.department)
                                ? 'bg-rose-50/80 text-rose-800 border border-rose-200/60 font-semibold'
                                : 'bg-indigo-50/70 text-indigo-800 border border-indigo-200/60 font-medium'
                            }`}>
                            {idol.personnelType === 'Dịch vụ ngoài' ? <span>🏷️</span> : isIdolDepartment(idol.department) ? <span>⭐</span> : <span>🏢</span>}
                            <span>{idol.department}</span>
                          </span>
                        </td>
                      )}

                      {/* Loại nhân sự */}
                      {visibleColumns.personnelType && (
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${(idol.personnelType || 'Công ty') === 'Công ty'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : (idol.personnelType || 'Công ty') === 'Outsource'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : (idol.personnelType || 'Công ty') === 'Cộng tác viên'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : (idol.personnelType || 'Công ty') === 'Thực tập sinh'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : (idol.personnelType || 'Công ty') === 'Dịch vụ ngoài'
                                      ? 'bg-orange-50 text-orange-800 border-orange-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                            {idol.personnelType || 'Công ty'}
                          </span>
                          {idol.serviceNotes && (
                            <div className="text-[10px] text-amber-700 font-medium truncate max-w-[130px] mt-0.5" title={idol.serviceNotes}>
                              📦 {idol.serviceNotes}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Trạng thái */}
                      {visibleColumns.status && (
                        <td className="py-2 px-2 text-center">
                          {idol.personnelType === 'Dịch vụ ngoài' ? (
                            <span className="text-slate-400 text-xs font-mono font-medium">-</span>
                          ) : idol.status === 'Chờ duyệt' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                              <span>Chờ duyệt</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${idol.status === 'Đang hoạt động'
                                ? 'bg-emerald-50 text-emerald-700'
                                : idol.status === 'Đang lưu diễn'
                                  ? 'bg-sky-50 text-sky-700'
                                  : idol.status === 'Đang ghi hình'
                                    ? 'bg-amber-50 text-amber-700'
                                    : idol.status === 'Thực tập sinh'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-slate-100 text-slate-600'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${idol.status === 'Đang hoạt động' ? 'bg-emerald-500' :
                                  idol.status === 'Đang lưu diễn' ? 'bg-sky-500' :
                                    idol.status === 'Đang ghi hình' ? 'bg-amber-500' :
                                      idol.status === 'Thực tập sinh' ? 'bg-rose-500' : 'bg-slate-400'
                                }`} />
                              {idol.status}
                            </span>
                          )}
                        </td>
                      )}

                      {columnDefinitions.filter(col => col.customColumn && visibleColumns[col.key]).map(col => (
                        <td key={col.key} className="py-2 px-2 text-slate-700 text-xs truncate max-w-[150px]" title={formatPersonnelColumnValue(col.customColumn!, idol.customFields?.[col.key])}>
                          {formatPersonnelColumnValue(col.customColumn!, idol.customFields?.[col.key])}
                        </td>
                      ))}

                      {/* Thao tác */}
                      {visibleColumns.actions && (
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onViewDetails(idol)}
                              title="Xem hồ sơ & nhiệm vụ"
                              className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {onGoToSchedule && (
                              <button
                                onClick={() => onGoToSchedule(idol.id)}
                                title={`Thiết lập lịch làm việc cho ${idol.stageName}`}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/80 bg-indigo-50/60 rounded transition-colors cursor-pointer"
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canManageIdols && (
                              <>
                                <button
                                  onClick={() => onEdit(idol)}
                                  title="Chỉnh sửa thông tin"
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {canDeletePersonnel && <button
                                  onClick={() => onDelete(idol.id)}
                                  title={idol.status === 'Chờ duyệt' ? "Hủy đề xuất thêm nhân sự này" : "Xóa nhân sự"}
                                  className={`p-1 rounded transition-colors cursor-pointer ${idol.status === 'Chờ duyệt'
                                      ? 'text-amber-600 hover:text-rose-600 hover:bg-amber-50'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    }`}
                                >
                                  {idol.status === 'Chờ duyệt' ? (
                                    <XCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Hiển thị <strong>{filteredIdols.length}</strong> / {idols.length} nhân sự
          </span>
          {/* <span className="text-[11px] text-slate-400">
            * Mẹo: Tuổi được tính chính xác theo ngày tháng tròn dựa trên năm mốc ({referenceYear}). Rê chuột vào hàng để xem popup chi tiết.
          </span> */}
        </div>
      </div>
    </div>
  );
};
