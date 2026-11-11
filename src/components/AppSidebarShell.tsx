import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckSquare,
  ChevronDown,
  FileText,
  KeyRound,
  LayoutPanelTop,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  X,
} from 'lucide-react';
import { DEFAULT_BLANK_AVATAR, type Idol, type IdolTask, type UserAccount } from '../types/index.ts';
import type { NavTab, NotificationItem } from './Navbar.tsx';
import {
  buildNavGroups,
  canAccessNavTab,
  canViewSystemSettings,
  getHomeNavTab,
} from '../utils/navigationConfig.ts';

interface AppSidebarShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  totalIdols: number;
  currentUser: UserAccount | null;
  onLogout: () => void;
  brandName?: string;
  brandTagline?: string;
  brandLogoUrl?: string;
  onOpenProfileModal?: () => void;
  onOpenPayslip?: () => void;
  onOpenChangePasswordModal?: () => void;
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
  onSwitchToClassicNavbar?: () => void;
  children: React.ReactNode;
}

/**
 * Production collapsible Sidebar + slim Topbar + Mobile Drawer shell.
 * Shares navigation permissions and action callbacks with classic Navbar for A/B verification.
 */
export const AppSidebarShell: React.FC<AppSidebarShellProps> = ({
  activeTab,
  onTabChange,
  totalIdols,
  currentUser,
  onLogout,
  brandName = 'AURA TALENT',
  brandTagline = 'Idol Agency OS',
  brandLogoUrl = '',
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
  onSwitchToClassicNavbar,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aura_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aura_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Notifications read state persisted identically to classic Navbar
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

  const unreadNotifications = notifications.filter((n) => !readNotificationIds.includes(n.id));
  const markNotificationRead = (notification: NotificationItem) => {
    setReadNotificationIds((current) => {
      const next = current.includes(notification.id) ? current : [...current, notification.id];
      try {
        localStorage.setItem(notificationStorageKey, JSON.stringify(next.slice(-100)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    onSelectNotification?.(notification);
  };

  // Universal Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // User dropdown & outside clicks
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsUserMenuOpen(false);
        setIsNotificationsOpen(false);
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canViewPersonalData = Boolean(currentUser?.idolId);
  const allowSystemSettings = canViewSystemSettings(currentUser);
  const homeTab = useMemo(() => getHomeNavTab(currentUser), [currentUser]);

  const navGroups = useMemo(
    () =>
      buildNavGroups(
        currentUser,
        { totalIdols, payrollDisputesCount, pendingApprovalsCount },
        { includeSystemGroup: true },
      ),
    [currentUser, totalIdols, payrollDisputesCount, pendingApprovalsCount],
  );

  const activeNavMeta = useMemo(() => {
    for (const group of navGroups) {
      const found = group.items.find((item) => item.tab === activeTab);
      if (found) return { groupLabel: group.label, item: found };
    }
    return {
      groupLabel: navGroups[0]?.label || 'Hệ Thống',
      item: navGroups[0]?.items[0] || null,
    };
  }, [navGroups, activeTab]);

  const trimmedSearch = searchQuery.toLowerCase().trim();
  const matchedIdols = useMemo(() => {
    if (!trimmedSearch) return [];
    return idols
      .filter(
        (i) =>
          i.stageName.toLowerCase().includes(trimmedSearch) ||
          i.realName.toLowerCase().includes(trimmedSearch) ||
          i.department.toLowerCase().includes(trimmedSearch) ||
          i.role.toLowerCase().includes(trimmedSearch) ||
          i.hometown.toLowerCase().includes(trimmedSearch),
      )
      .slice(0, 5);
  }, [idols, trimmedSearch]);

  const matchedTasks = useMemo(() => {
    if (!trimmedSearch) return [];
    return tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(trimmedSearch) ||
          t.category.toLowerCase().includes(trimmedSearch) ||
          (t.description && t.description.toLowerCase().includes(trimmedSearch)),
      )
      .slice(0, 4);
  }, [tasks, trimmedSearch]);

  const matchedDepartments = useMemo(() => {
    if (!trimmedSearch) return [];
    return departments.filter((d) => d.toLowerCase().includes(trimmedSearch)).slice(0, 3);
  }, [departments, trimmedSearch]);

  const hasSearchResults =
    matchedIdols.length > 0 || matchedTasks.length > 0 || matchedDepartments.length > 0;

  const renderBrandHeader = (compact: boolean, isDrawer = false) => (
    <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3 shrink-0">
      <button
        type="button"
        onClick={() => {
          onTabChange(homeTab);
          if (isDrawer) setIsMobileDrawerOpen(false);
        }}
        className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
        title={homeTab === 'my_dashboard' ? 'Trở về Dashboard cá nhân' : 'Trở về Trang chủ'}
      >
        {brandLogoUrl ? (
          <img
            src={brandLogoUrl}
            alt={brandName}
            className="h-8 w-8 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-rose-600 via-rose-500 to-sky-700 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
        {!compact && (
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
              {brandName.includes(' ') ? (
                <>
                  {brandName.substring(0, brandName.lastIndexOf(' '))}{' '}
                  <span className="text-rose-600">
                    {brandName.substring(brandName.lastIndexOf(' ') + 1)}
                  </span>
                </>
              ) : (
                <span className="text-rose-600">{brandName}</span>
              )}
            </div>
            <div className="truncate text-[10px] text-slate-400">{brandTagline}</div>
          </div>
        )}
      </button>

      {!isDrawer && (
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-label={compact ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          aria-expanded={!compact}
          title={compact ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {compact ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );

  const renderSidebarNav = (compact: boolean, isDrawer = false) => (
    <div className="flex h-full flex-col">
      {renderBrandHeader(compact, isDrawer)}

      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.id}>
            {!compact && (
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    title={compact ? item.label : undefined}
                    onClick={() => {
                      onTabChange(item.tab);
                      if (isDrawer) setIsMobileDrawerOpen(false);
                    }}
                    className={`group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
                      compact ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200/90 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${
                        isActive ? 'bg-rose-100 text-rose-600' : `${item.iconBg} ${item.iconColor}`
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {!compact && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                              isActive ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {compact && item.badge !== undefined && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {currentUser && (
        <div className="border-t border-slate-200 p-2.5 shrink-0">
          <div
            className={`flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-2 ${
              compact ? 'justify-center' : ''
            }`}
            title={`${currentUser.name} · ${currentUser.roleTitle || 'Thành viên'}`}
          >
            <img
              src={currentUser.avatarUrl || DEFAULT_BLANK_AVATAR}
              alt={currentUser.name}
              className="h-7 w-7 shrink-0 rounded-full object-cover border border-rose-200"
            />
            {!compact && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="truncate text-[10px] text-slate-500">
                  {currentUser.roleTitle || (currentUser.isSuperAdmin ? 'Super Admin' : 'Thành viên')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50/50 text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      {/* Desktop Sticky Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 h-screen transition-all duration-200 z-30 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarNav(isSidebarCollapsed)}
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Điều hướng nhanh
              </span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Đóng menu điều hướng"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{renderSidebarNav(false, true)}</div>
          </div>
        </div>
      )}

      {/* Right Content Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Mở menu điều hướng"
              aria-expanded={isMobileDrawerOpen}
              className="lg:hidden inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="truncate">{activeNavMeta.groupLabel}</span>
                <span>/</span>
                <span className="text-rose-600 truncate">{activeTab}</span>
              </div>
              <div className="truncate text-xs sm:text-sm font-extrabold text-slate-900">
                {activeNavMeta.item?.label || 'Aura Talent'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSwitchToClassicNavbar && (
              <button
                type="button"
                onClick={onSwitchToClassicNavbar}
                title="Chuyển nhanh về thanh điều hướng cũ để đối chiếu chức năng"
                aria-label="Chuyển sang giao diện cũ"
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <LayoutPanelTop className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Giao diện Cũ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Universal Search Bar */}
            <div ref={searchContainerRef} className="relative hidden sm:block w-40 md:w-52 lg:w-64">
              <div className="relative">
                <label htmlFor="sidebar-universal-search" className="sr-only">
                  Tìm kiếm toàn hệ thống
                </label>
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="sidebar-universal-search"
                  name="universalSearch"
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
                  className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500/20 focus:border-rose-400 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa tìm kiếm"
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

              {isSearchOpen && trimmedSearch.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50">
                  {!hasSearchResults ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Không tìm thấy kết quả nào phù hợp với &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
                      {matchedIdols.length > 0 && (
                        <div className="py-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Nghệ Sĩ &amp; Thực Tập Sinh ({matchedIdols.length})
                          </div>
                          {matchedIdols.map((idol) => (
                            <button
                              key={idol.id}
                              type="button"
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                if (canAccessNavTab(currentUser, 'roster')) {
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
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {matchedTasks.length > 0 && (
                        <div className="py-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Nhiệm Vụ &amp; Lịch Trình ({matchedTasks.length})
                          </div>
                          {matchedTasks.map((task) => {
                            const assignedIdol = idols.find((i) => i.id === task.idolId);
                            return (
                              <button
                                key={task.id}
                                type="button"
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
                                  <div className="font-bold text-slate-800 truncate">{task.title}</div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {assignedIdol ? assignedIdol.stageName : 'Tất cả'} · {task.category}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {matchedDepartments.length > 0 && (
                        <div className="py-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Đơn Vị &amp; Ban Ngành ({matchedDepartments.length})
                          </div>
                          {matchedDepartments.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                onTabChange(canAccessNavTab(currentUser, 'roster') ? 'roster' : homeTab);
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

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((open) => !open)}
                title="Thông báo"
                aria-label={`Thông báo${unreadNotifications.length ? ` (${unreadNotifications.length} chưa đọc)` : ''}`}
                aria-expanded={isNotificationsOpen}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-4 text-white">
                    {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900">Thông báo</h2>
                      <p className="mt-0.5 text-[11px] text-slate-500">{unreadNotifications.length} chưa đọc</p>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ids = notifications.map((n) => n.id);
                          setReadNotificationIds(ids);
                          try {
                            localStorage.setItem(notificationStorageKey, JSON.stringify(ids));
                          } catch {
                            // ignore storage errors
                          }
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">Chưa có thông báo mới.</div>
                  ) : (
                    <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                      {notifications.map((notification) => {
                        const unread = !readNotificationIds.includes(notification.id);
                        const toneClass =
                          notification.tone === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : notification.tone === 'warning'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-sky-50 text-sky-700';
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              markNotificationRead(notification);
                            }}
                            className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 cursor-pointer ${
                              unread ? 'bg-indigo-50/50' : 'bg-white'
                            }`}
                          >
                            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
                              <Bell className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-xs ${unread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                {notification.title}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                                {notification.description}
                              </span>
                            </span>
                            {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-2 px-2 py-1 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
                    isUserMenuOpen
                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-100'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={currentUser.avatarUrl || DEFAULT_BLANK_AVATAR}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover border border-rose-200 shrink-0"
                  />
                  <span className="hidden md:inline text-xs font-bold text-slate-800 truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                      isUserMenuOpen ? 'rotate-180 text-rose-600' : ''
                    }`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Menu tài khoản"
                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src={currentUser.avatarUrl || DEFAULT_BLANK_AVATAR}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-xl object-cover border border-rose-200 shrink-0 shadow-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</span>
                          {currentUser.isSuperAdmin && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate font-medium">
                          {currentUser.roleTitle || 'Thành viên'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate font-mono">{currentUser.email}</div>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {canViewPersonalData && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenProfileModal?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-rose-50/70 transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800">Hồ Sơ Cá Nhân &amp; Thể Trạng</div>
                            <div className="text-[10px] text-slate-400 truncate">Xem &amp; sửa thông tin, BMI</div>
                          </div>
                        </button>
                      )}

                      {canViewPersonalData && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onOpenPayslip) {
                              onOpenPayslip();
                            } else if (canAccessNavTab(currentUser, 'my_dashboard')) {
                              onTabChange('my_dashboard');
                            } else if (canAccessNavTab(currentUser, 'payroll')) {
                              onTabChange('payroll');
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800">Xem Phiếu Lương Của Tôi</div>
                            <div className="text-[10px] text-slate-400 truncate">Chi tiết lương &amp; hoa hồng</div>
                          </div>
                        </button>
                      )}

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
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800">Đổi Mật Khẩu</div>
                          <div className="text-[10px] text-slate-400 truncate">Bảo mật an toàn tài khoản</div>
                        </div>
                      </button>

                      {allowSystemSettings && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onTabChange('admin');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Settings className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800">Cài Đặt Hệ Thống</div>
                            <div className="text-[10px] text-slate-400 truncate">Phân quyền, AuditLog &amp; thương hiệu</div>
                          </div>
                        </button>
                      )}
                    </div>

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
        </header>

        {children}
      </div>
    </div>
  );
};

