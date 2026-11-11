import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckSquare,
  Shield,
  LogOut,
  Building2,
  Search,
  X,
  ArrowRight,
  ChevronDown,
  Check,
  User,
  FileText,
  KeyRound,
  Settings,
  Moon,
  Sun,
  Bell,
  PanelLeftOpen
} from 'lucide-react';
import { UserAccount, Idol, IdolTask, DEFAULT_BLANK_AVATAR } from '../types/index.ts';
import {
  buildNavGroups,
  canAccessNavTab,
  canViewSystemSettings as checkCanViewSystemSettings,
  getHomeNavTab,
  type NavGroupConfig,
} from '../utils/navigationConfig.ts';

export type NavTab = 'roster' | 'scoring' | 'leaderboard' | 'schedule' | 'tasks' | 'analytics' | 'admin' | 'approvals' | 'my_dashboard' | 'work_assignments' | 'payroll' | 'payroll_disputes' | 'kpi' | 'revenue' | 'finance' | 'service_usage';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  tab: NavTab;
  targetId?: string;
  targetType?: 'schedule' | 'task' | 'leave' | 'payroll_dispute' | 'work_assignment';
  tone?: 'info' | 'success' | 'warning';
}

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal?: () => void;
  onResetData?: () => void;
  totalIdols: number;
  currentUser: UserAccount | null;
  onLogout: () => void;
  brandName?: string;
  brandTagline?: string;
  brandLogoUrl?: string;
  onOpenPermissionsModal?: () => void;
  onOpenStatusModal?: () => void;
  onOpenDepartmentModal?: () => void;
  onOpenProfileModal?: () => void;
  onOpenPayslip?: () => void;
  onOpenChangePasswordModal?: () => void;
  // Ubiquitous Universal Search props
  idols?: Idol[];
  tasks?: IdolTask[];
  departments?: string[];
  pendingApprovalsCount?: number;
  payrollDisputesCount?: number;
  onSelectIdolFromSearch?: (idol: Idol) => void;
  onSelectTaskFromSearch?: (task: IdolTask) => void;
  notifications?: NotificationItem[];
  onSelectNotification?: (notification: NotificationItem) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSwitchToSidebarShell?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onResetData,
  totalIdols,
  currentUser,
  onLogout,
  brandName = 'AURA TALENT',
  brandTagline = 'Idol Agency OS',
  brandLogoUrl = '',
  onOpenPermissionsModal,
  onOpenStatusModal,
  onOpenDepartmentModal,
  onOpenProfileModal,
  onOpenPayslip,
  onOpenChangePasswordModal,
  idols = [],
  tasks = [],
  departments = [],
  pendingApprovalsCount = 0,
  payrollDisputesCount = 0,
  onSelectIdolFromSearch,
  onSelectTaskFromSearch,
  notifications = [],
  onSelectNotification,
  theme,
  onToggleTheme,
  onSwitchToSidebarShell
}) => {
  const canViewPersonalData = Boolean(currentUser?.idolId);
  const notificationStorageKey = `aura_read_notifications_${currentUser?.id || 'anonymous'}`;
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(notificationStorageKey) || '[]') as string[];
    } catch {
      return [];
    }
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  useEffect(() => {
    try {
      setReadNotificationIds(JSON.parse(localStorage.getItem(notificationStorageKey) || '[]') as string[]);
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);
  const unreadNotifications = notifications.filter((notification) => !readNotificationIds.includes(notification.id));

  const markNotificationRead = (notification: NotificationItem) => {
    setReadNotificationIds((current) => {
      const next = current.includes(notification.id) ? current : [...current, notification.id];
      try { localStorage.setItem(notificationStorageKey, JSON.stringify(next.slice(-100))); } catch { /* ignore storage errors */ }
      return next;
    });
    onSelectNotification?.(notification);
  };
  const canViewSystemSettings = checkCanViewSystemSettings(currentUser);
  const canAccess = (tab: NavTab) => canAccessNavTab(currentUser, tab);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard shortcut Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search Results
  const trimmedSearch = searchQuery.toLowerCase().trim();
  const matchedIdols = React.useMemo(() => {
    if (!trimmedSearch) return [];
    return idols
      .filter(
        (i) =>
          i.stageName.toLowerCase().includes(trimmedSearch) ||
          i.realName.toLowerCase().includes(trimmedSearch) ||
          i.department.toLowerCase().includes(trimmedSearch) ||
          i.role.toLowerCase().includes(trimmedSearch) ||
          i.hometown.toLowerCase().includes(trimmedSearch)
      )
      .slice(0, 5);
  }, [idols, trimmedSearch]);

  const matchedTasks = React.useMemo(() => {
    if (!trimmedSearch) return [];
    return tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(trimmedSearch) ||
          t.category.toLowerCase().includes(trimmedSearch) ||
          (t.description && t.description.toLowerCase().includes(trimmedSearch))
      )
      .slice(0, 4);
  }, [tasks, trimmedSearch]);

  const matchedDepartments = React.useMemo(() => {
    if (!trimmedSearch) return [];
    return departments
      .filter((d) => d.toLowerCase().includes(trimmedSearch))
      .slice(0, 3);
  }, [departments, trimmedSearch]);

  // Calculate user-friendly primary home tab based on their permissions
  const homeTab: NavTab = useMemo(() => getHomeNavTab(currentUser), [currentUser]);

  const handleLogoClick = () => {
    onTabChange(homeTab);
  };

  const hasResults =
    matchedIdols.length > 0 || matchedTasks.length > 0 || matchedDepartments.length > 0;

  // Group Navigation Dropdown State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navContainerRef = useRef<HTMLElement>(null);

  // User Profile Dropdown Menu State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation Groups Definition (shared single source of truth)
  const groups: NavGroupConfig[] = useMemo(
    () => buildNavGroups(currentUser, { totalIdols, payrollDisputesCount, pendingApprovalsCount }),
    [currentUser, totalIdols, payrollDisputesCount, pendingApprovalsCount],
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-[1700px] w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3 h-14">
          {/* Wordmark / Brand Header Banner */}
          <div
            className="flex items-center gap-2 shrink-0 cursor-pointer select-none group"
            onClick={handleLogoClick}
            title={homeTab === 'my_dashboard' ? 'Trở về Dashboard cá nhân' : 'Trở về Trang chủ Danh Sách'}
          >
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={brandName}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-rose-500 to-sky-700 flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                {brandName.includes(' ') ? (
                  <>
                    {brandName.substring(0, brandName.lastIndexOf(' '))} <span className="text-rose-600">{brandName.substring(brandName.lastIndexOf(' ') + 1)}</span>
                  </>
                ) : (
                  <span className="text-rose-600">{brandName}</span>
                )}
              </span>
            </div>
          </div>

          {/* Navigation Tabs - Modern Grouped Dropdowns */}
          <nav ref={navContainerRef} className="flex items-center gap-1 sm:gap-1.5 shrink-0 py-1">
            {groups.map((group) => {
              if (group.items.length === 0) return null;
              const isGroupActive = group.items.some((item) => item.tab === activeTab);
              const activeItem = group.items.find((item) => item.tab === activeTab);
              const isOpen = openDropdown === group.id;

              return (
                <div
                  key={group.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(group.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer select-none ${isGroupActive
                      ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200/90 shadow-2xs'
                      : isOpen
                        ? 'bg-slate-100 text-slate-900 border border-slate-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                      }`}
                  >
                    <group.icon className={`w-3.5 h-3.5 ${isGroupActive ? 'text-rose-600' : group.iconColor}`} />
                    <span>{group.label}</span>
                    {activeItem && isGroupActive && (
                      <span className="hidden md:inline-block text-[11px] font-normal text-rose-600/80">
                        • {activeItem.label.split(' ')[0]}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-600' : ''
                        }`}
                    />
                  </button>

                  {/* Dropdown Popover */}
                  {isOpen && (
                    <div className="absolute left-0 top-full pt-2 w-72 sm:w-80 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                          <span>Phân Hệ {group.label}</span>
                        </div>

                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isActive = activeTab === item.tab;
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={item.tab}
                                type="button"
                                onClick={() => {
                                  onTabChange(item.tab);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${isActive
                                  ? 'bg-rose-50/80 text-rose-900 font-bold border border-rose-200/80 shadow-2xs'
                                  : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-transparent'
                                  }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                                >
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs ${isActive ? 'font-bold text-rose-700' : 'font-semibold text-slate-800'}`}>
                                      {item.label}
                                    </span>
                                    {item.badge !== undefined && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono font-normal">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate font-normal">
                                    {item.subLabel}
                                  </div>
                                </div>
                                {isActive && (
                                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Dedicated Quản Trị Tab */}
            {canAccess('admin') && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onTabChange('admin');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${activeTab === 'admin'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70'
                  }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Quản Trị</span>
              </button>
            )}
          </nav>

          {/* User Profile, Search & Actions (Right group) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSwitchToSidebarShell && (
              <button
                type="button"
                onClick={onSwitchToSidebarShell}
                title="Chuyển sang Giao diện Sidebar Mới để đối chiếu"
                aria-label="Chuyển sang giao diện mới"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Giao diện Mới</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((open) => !open)}
                title="Thông báo"
                aria-label={`Thông báo${unreadNotifications.length ? ` (${unreadNotifications.length} chưa đọc)` : ''}`}
                aria-expanded={isNotificationsOpen}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-4 text-white">{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}</span>}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900">Thông báo</h2>
                      <p className="mt-0.5 text-[11px] text-slate-500">{unreadNotifications.length} chưa đọc</p>
                    </div>
                    {notifications.length > 0 && <button type="button" onClick={() => { const ids = notifications.map((notification) => notification.id); setReadNotificationIds(ids); try { localStorage.setItem(notificationStorageKey, JSON.stringify(ids)); } catch { /* ignore storage errors */ } }} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800">Đánh dấu đã đọc</button>}
                  </div>
                  {notifications.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">Chưa có thông báo mới.</div> : (
                    <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                      {notifications.map((notification) => {
                        const unread = !readNotificationIds.includes(notification.id);
                        const toneClass = notification.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : notification.tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700';
                        return <button key={notification.id} type="button" onClick={() => { setIsNotificationsOpen(false); markNotificationRead(notification); }} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${unread ? 'bg-indigo-50/50' : 'bg-white'}`}>
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClass}`}><Bell className="h-3.5 w-3.5" /></span>
                          <span className="min-w-0 flex-1"><span className={`block text-xs ${unread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>{notification.title}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{notification.description}</span></span>
                          {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                        </button>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Universal Search Bar */}
            <div ref={searchContainerRef} className="relative w-28 sm:w-36 lg:w-44 focus-within:w-56 transition-all duration-200 hidden sm:block">
              <div className="relative">
                <label htmlFor="classic-universal-search" className="sr-only">Tìm kiếm toàn hệ thống</label>
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="classic-universal-search"
                  name="classicUniversalSearch"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  placeholder="Tìm kiếm... (Ctrl+K)"
                  aria-label="Tìm kiếm toàn hệ thống"
                  className="w-full pl-8 pr-6 py-1 text-xs bg-slate-50 border border-slate-200/90 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/20 focus:border-rose-400 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Universal Search Dropdown Popover (Aligned Right) */}
              {isSearchOpen && trimmedSearch.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {!hasResults ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Không tìm thấy kết quả nào phù hợp với &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
                      {/* Section: Idols */}
                      {matchedIdols.length > 0 && (
                        <div className="py-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Nghệ Sĩ & Thực Tập Sinh ({matchedIdols.length})
                          </div>
                          {matchedIdols.map((idol) => (
                            <button
                              key={idol.id}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                if (canAccess('roster')) {
                                  onTabChange('roster');
                                  onSelectIdolFromSearch?.(idol);
                                } else {
                                  onTabChange(homeTab);
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-rose-50/70 rounded-xl transition-colors text-left cursor-pointer group"
                            >
                              <img
                                src={idol.avatarUrl}
                                alt={idol.stageName}
                                className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 group-hover:text-rose-700 truncate">
                                  {idol.stageName}{' '}
                                  <span className="font-normal text-slate-500">({idol.realName})</span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {idol.department} · {idol.role}
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Section: Tasks */}
                      {matchedTasks.length > 0 && (
                        <div className="py-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Nhiệm Vụ & Lịch Trình ({matchedTasks.length})
                          </div>
                          {matchedTasks.map((task) => {
                            const assignedIdol = idols.find((i) => i.id === task.idolId);
                            return (
                              <button
                                key={task.id}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery('');
                                  onTabChange('tasks');
                                  onSelectTaskFromSearch?.(task);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-sky-50/70 rounded-xl transition-colors text-left cursor-pointer group"
                              >
                                <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-slate-800 group-hover:text-sky-800 truncate">
                                    {task.title}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {assignedIdol ? assignedIdol.stageName : 'Tất cả'} · {task.category}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Section: Departments */}
                      {matchedDepartments.length > 0 && (
                        <div className="py-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Đơn Vị & Ban Ngành ({matchedDepartments.length})
                          </div>
                          {matchedDepartments.map((dept) => (
                            <button
                              key={dept}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                if (canAccess('roster')) {
                                  onTabChange('roster');
                                } else {
                                  onTabChange(homeTab);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-medium text-slate-800">{dept}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Dropdown Menu */}
            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs group ${isUserMenuOpen
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-100'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="relative">
                    <img
                      src={
                        currentUser.avatarUrl ||
                        DEFAULT_BLANK_AVATAR
                      }
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-rose-200 group-hover:border-rose-400 shrink-0"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700 leading-tight truncate max-w-[100px] xl:max-w-[130px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[100px] xl:max-w-[130px]">
                      {currentUser.roleTitle || 'Nhân sự'}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 ${isUserMenuOpen ? 'rotate-180 text-rose-600' : ''
                      }`}
                  />
                </button>

                {/* Popover Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header info */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src={
                          currentUser.avatarUrl ||
                          DEFAULT_BLANK_AVATAR
                        }
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-xl object-cover border border-rose-200 shrink-0 shadow-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {currentUser.name}
                          </span>
                          {currentUser.isSuperAdmin && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate font-medium">
                          {currentUser.roleTitle || 'Thành viên'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate font-mono">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5 space-y-0.5">
                      {/* Hồ Sơ Cá Nhân & Chỉ Số */}
                      {canViewPersonalData && <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenProfileModal?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-rose-50/70 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-rose-700">
                            Hồ Sơ Cá Nhân & Thể Trạng
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Xem & sửa thông tin, chiều cao, cân nặng, BMI
                          </div>
                        </div>
                      </button>}

                      {/* Xem Phiếu Lương Của Tôi */}
                      {canViewPersonalData && <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenPayslip) {
                            onOpenPayslip();
                          } else if (canAccess('my_dashboard')) {
                            onTabChange('my_dashboard');
                          } else if (canAccess('payroll')) {
                            onTabChange('payroll');
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                            Xem Phiếu Lương Của Tôi
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Chi tiết lương cứng, hoa hồng & thưởng nóng
                          </div>
                        </div>
                      </button>}

                      {/* Đổi Mật Khẩu */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenChangePasswordModal) {
                            onOpenChangePasswordModal();
                          } else {
                            onOpenProfileModal?.();
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-indigo-50/70 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                            Đổi Mật Khẩu
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Bảo mật an toàn tài khoản
                          </div>
                        </div>
                      </button>

                      {/* Cài Đặt Hệ Thống (Nếu có quyền admin) */}
                      {canViewSystemSettings && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onTabChange('admin');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                            <Settings className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                              Cài Đặt Hệ Thống
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Quản trị dữ liệu, phân quyền & thương hiệu
                            </div>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Divider & Logout */}
                    <div className="border-t border-slate-100 p-1.5 pt-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-bold text-xs"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng Xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
