import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import type { NavTab } from '../components/Navbar.tsx';
import type { ScoreCalculationMode } from '../types/index.ts';
import {
  MOCK_ANALYTICS_SCORES,
  MOCK_AUDIT_LOGS,
  MOCK_NOTIFICATIONS,
  MOCK_SEARCH_DEPARTMENTS,
  MOCK_SEARCH_IDOLS,
  MOCK_SEARCH_TASKS,
  PREVIEW_NAV_GROUPS,
  PREVIEW_ROLES,
  type PreviewAuditLogRow,
  type PreviewNavItem,
  type PreviewRoleId,
} from './mockShowcaseData.ts';
import { PreviewHeaderModals, type PreviewModalType } from './PreviewHeaderModals.tsx';
import { PreviewTabContent } from './PreviewTabContent.tsx';

type ShowcaseSection = 'shell' | 'components' | 'before_after' | 'audit_logs';
type ViewportMode = 'desktop' | 'mobile';

const ICON_MAP: Record<PreviewNavItem['iconKey'], React.ComponentType<{ className?: string }>> = {
  users: Users,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
  calendar: CalendarClock,
  checkSquare: CheckSquare,
  award: Award,
  trophy: Trophy,
  barChart: BarChart3,
  trendingUp: TrendingUp,
  coins: Coins,
  banknote: Banknote,
  fileText: FileText,
  target: Target,
  shield: Shield,
};

function getMethodBadgeClass(method: PreviewAuditLogRow['method']): string {
  if (method === 'DELETE') {
    return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800';
  }
  if (method === 'PUT') {
    return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800';
  }
  return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800';
}

function getStatusBadgeClass(statusCode: number): string {
  if (statusCode >= 500) {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }
  if (statusCode >= 400) {
    return 'bg-amber-100 text-amber-900 border-amber-200';
  }
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

/**
 * Isolated Group 3 UI/UX Showcase used for manual design review at `/ui-preview`.
 * Operates exclusively on static mock data and leaves production views untouched.
 */
export const UiUpgradeShowcase: React.FC = () => {
  const [section, setSection] = useState<ShowcaseSection>('shell');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [roleId, setRoleId] = useState<PreviewRoleId>('super_admin');

  // Shell preview interactive states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<PreviewModalType>(null);

  // Before/After preview states
  const [calcModePreview, setCalcModePreview] = useState<ScoreCalculationMode>('sum');
  const [revCategoryFilter, setRevCategoryFilter] = useState('all');
  const [revPlatformFilter, setRevPlatformFilter] = useState('all');
  const [revStatusFilter, setRevStatusFilter] = useState('all');
  const [revSearchFilter, setRevSearchFilter] = useState('');

  // AuditLog preview states
  const [auditSearch, setAuditSearch] = useState('');
  const [auditMethod, setAuditMethod] = useState<'ALL' | 'POST' | 'PUT' | 'DELETE'>('ALL');
  const [auditResource, setAuditResource] = useState('all');
  const [selectedAuditRow, setSelectedAuditRow] = useState<PreviewAuditLogRow | null>(null);
  const [auditPage, setAuditPage] = useState(1);

  const currentRole = useMemo(
    () => PREVIEW_ROLES.find((role) => role.id === roleId) ?? PREVIEW_ROLES[0],
    [roleId],
  );

  // Sync html.dark to preview dark-mode rules identically to production App.tsx
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.toggle('dark', theme === 'dark');
    return () => {
      root.classList.toggle('dark', hadDark);
    };
  }, [theme]);

  // Keep activeNavTab valid when switching simulated role
  const visibleGroups = useMemo(() => {
    return PREVIEW_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => currentRole.allowedTabs.includes(item.tab)),
    })).filter((group) => group.items.length > 0);
  }, [currentRole]);

  const effectiveActiveNavTab = useMemo<NavTab>(() => {
    const allowed = visibleGroups.flatMap((group) => group.items.map((item) => item.tab));
    if (allowed.includes(activeNavTab)) return activeNavTab;
    return allowed[0] ?? 'my_dashboard';
  }, [visibleGroups, activeNavTab]);

  const activeNavMeta = useMemo(() => {
    for (const group of PREVIEW_NAV_GROUPS) {
      const found = group.items.find((item) => item.tab === effectiveActiveNavTab);
      if (found) return { groupLabel: group.label, item: found };
    }
    return {
      groupLabel: 'Hồ Sơ',
      item: PREVIEW_NAV_GROUPS[0].items[0],
    };
  }, [effectiveActiveNavTab]);

  // Global keyboard Escape closes overlays in preview
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
        setSelectedAuditRow(null);
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    window.setTimeout(() => {
      setFeedbackToast((current) => (current === message ? null : current));
    }, 2600);
  };

  const unreadCount = notifications.filter((item) => item.unread).length;

  const filteredSearchIdols = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return MOCK_SEARCH_IDOLS.filter(
      (item) =>
        item.stageName.toLowerCase().includes(q) ||
        item.realName.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredSearchTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return MOCK_SEARCH_TASKS.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredSearchDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return MOCK_SEARCH_DEPARTMENTS.filter(
      (item) => item.name.toLowerCase().includes(q) || item.lead.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return MOCK_AUDIT_LOGS.filter((row) => {
      if (auditMethod !== 'ALL' && row.method !== auditMethod) return false;
      if (auditResource !== 'all' && row.resource !== auditResource) return false;
      if (!q) return true;
      return (
        row.requestId.toLowerCase().includes(q) ||
        row.path.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.actorUsername.toLowerCase().includes(q) ||
        row.actorName.toLowerCase().includes(q) ||
        row.resourceId.toLowerCase().includes(q)
      );
    });
  }, [auditSearch, auditMethod, auditResource]);

  const renderSidebarNavigation = (compact: boolean, onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      {/* Sidebar Brand */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        <button
          type="button"
          onClick={() => {
            setActiveNavTab(visibleGroups[0]?.items[0]?.tab ?? 'my_dashboard');
            onNavigate?.();
          }}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
          title="Về trang chủ theo vai trò"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-rose-600 via-rose-500 to-sky-700 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          {!compact && (
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                Aura <span className="text-rose-600">Talent</span>
              </div>
              <div className="truncate text-[10px] text-slate-400">Hệ thống Quản trị Nghệ sĩ &amp; Vận hành</div>
            </div>
          )}
        </button>

        {!onNavigate && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={compact ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-expanded={!compact}
            title={compact ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {compact ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Grouped Navigation Items */}
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.id}>
            {!compact && (
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.iconKey];
                const isActive = effectiveActiveNavTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    title={compact ? item.label : undefined}
                    onClick={() => {
                      setActiveNavTab(item.tab);
                      onNavigate?.();
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
                              isActive
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600'
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

      {/* Role Footer Pill inside Sidebar */}
      <div className="border-t border-slate-200 p-2.5">
        <div
          className={`flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-2 ${
            compact ? 'justify-center' : ''
          }`}
          title={`${currentRole.userName} · ${currentRole.roleTitle}`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold">
            {currentRole.userName.slice(0, 1)}
          </div>
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900">{currentRole.userName}</div>
              <div className="truncate text-[10px] text-slate-500">{currentRole.label}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const scoreSnapshot = MOCK_ANALYTICS_SCORES[calcModePreview];

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900">
      {/* Floating / Sticky Review Control Bar */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          {/* Left: Title + Back to Real App */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Về app chính</span>
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900">
                  UI Preview Showcase — Nhóm 3
                </h1>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  Mô phỏng độc lập (Static)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Nhánh <code className="font-mono text-rose-600">feat/ui-preview-showcase</code> · Không chỉnh sửa file giao diện chính
              </p>
            </div>
          </div>

          {/* Center: 4 Review Sections */}
          <div
            role="tablist"
            aria-label="Các mục xem trước giao diện"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1"
          >
            {(
              [
                { id: 'shell', label: '1. Shell & Sidebar Mới' },
                { id: 'components', label: '2. Thành Phần UI' },
                { id: 'before_after', label: '3. So Sánh Trước / Sau' },
                { id: 'audit_logs', label: '4. AuditLog Viewer' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={section === tab.id}
                onClick={() => setSection(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  section === tab.id
                    ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Simulator Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label htmlFor="preview-role-select" className="sr-only">
                Giả lập vai trò người dùng
              </label>
              <select
                id="preview-role-select"
                name="previewRole"
                aria-label="Giả lập vai trò người dùng"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value as PreviewRoleId)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                {PREVIEW_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    Vai trò: {role.label}
                  </option>
                ))}
              </select>
            </div>

            {section === 'shell' && (
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewportMode('desktop');
                    setIsMobileDrawerOpen(false);
                  }}
                  aria-label="Xem khung Desktop"
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer ${
                    viewportMode === 'desktop'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  aria-label="Xem khung Mobile 390px"
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer ${
                    viewportMode === 'mobile'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>390px</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast feedback inside preview */}
      {feedbackToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Main Preview Stage */}
      <div className="mx-auto max-w-[1720px] p-4 sm:p-6">
        {/* SECTION 1: INTERACTIVE SHELL + SIDEBAR + MOBILE DRAWER */}
        {section === 'shell' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs">
              <div>
                <span className="font-bold text-slate-900">Đang giả lập vai trò: {currentRole.label}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">{currentRole.summary}</span>
              </div>
              <div className="text-[11px] font-semibold text-rose-600">
                Tổng mục menu khả dụng: {visibleGroups.reduce((sum, g) => sum + g.items.length, 0)}
              </div>
            </div>

            <div
              className={`relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-lg transition-all ${
                viewportMode === 'mobile' ? 'w-[390px] max-w-full min-h-[680px]' : 'w-full min-h-[640px]'
              }`}
            >
              <div className="flex min-h-[640px]">
                {/* Desktop Collapsible Sidebar */}
                {viewportMode === 'desktop' && (
                  <aside
                    className={`hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
                      isSidebarCollapsed ? 'w-[72px]' : 'w-64'
                    }`}
                  >
                    {renderSidebarNavigation(isSidebarCollapsed)}
                  </aside>
                )}

                {/* Right Main Column */}
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* Topbar */}
                  <header className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMobileDrawerOpen(true)}
                        aria-label="Mở menu điều hướng"
                        aria-expanded={isMobileDrawerOpen}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer ${
                          viewportMode === 'desktop' ? 'lg:hidden' : ''
                        }`}
                      >
                        <Menu className="h-4 w-4" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          <span>{activeNavMeta.groupLabel}</span>
                          <span>/</span>
                          <span className="text-rose-600 truncate">{activeNavMeta.item.tab}</span>
                        </div>
                        <div className="truncate text-xs sm:text-sm font-extrabold text-slate-900">
                          {activeNavMeta.item.label}
                        </div>
                      </div>
                    </div>

                    {/* Topbar Right Controls */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Universal Search (Hidden on tight 390px, shown via toggle/compact on desktop) */}
                      {viewportMode === 'desktop' && (
                        <div className="relative hidden sm:block w-48 lg:w-64">
                          <label htmlFor="preview-universal-search" className="sr-only">
                            Tìm kiếm toàn hệ thống
                          </label>
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            id="preview-universal-search"
                            name="universalSearch"
                            type="text"
                            value={searchQuery}
                            onFocus={() => setIsSearchOpen(true)}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setIsSearchOpen(true);
                            }}
                            placeholder="Tìm kiếm... (Ctrl+K)"
                            aria-label="Tìm kiếm nhanh toàn hệ thống"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs focus:border-rose-400 focus:bg-white focus:outline-none"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              aria-label="Xóa từ khóa tìm kiếm"
                              onClick={() => {
                                setSearchQuery('');
                                setIsSearchOpen(false);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {isSearchOpen && searchQuery.trim().length > 0 && (
                            <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-2xl">
                              {filteredSearchIdols.length === 0 &&
                              filteredSearchTasks.length === 0 &&
                              filteredSearchDepartments.length === 0 ? (
                                <div className="p-4 text-center text-slate-500">
                                  Không có kết quả cho &ldquo;{searchQuery}&rdquo; (thử nhập &ldquo;Aria&rdquo;, &ldquo;Live&rdquo; hoặc &ldquo;Kế Toán&rdquo;)
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                  {filteredSearchIdols.length > 0 && (
                                    <div>
                                      <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                                        Nghệ sĩ &amp; Nhân sự
                                      </div>
                                      {filteredSearchIdols.map((idol) => (
                                        <button
                                          key={idol.id}
                                          type="button"
                                          onClick={() => {
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                            setActiveNavTab('roster');
                                            showToast(`Mở hồ sơ mô phỏng: ${idol.stageName}`);
                                          }}
                                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-rose-50/70 cursor-pointer"
                                        >
                                          <div>
                                            <div className="font-bold text-slate-800">{idol.stageName}</div>
                                            <div className="text-[11px] text-slate-400">{idol.department}</div>
                                          </div>
                                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {filteredSearchTasks.length > 0 && (
                                    <div>
                                      <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                                        Nhiệm vụ &amp; Lịch trình
                                      </div>
                                      {filteredSearchTasks.map((task) => (
                                        <button
                                          key={task.id}
                                          type="button"
                                          onClick={() => {
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                            setActiveNavTab('tasks');
                                            showToast(`Chuyển sang nhiệm vụ: ${task.title}`);
                                          }}
                                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-sky-50/70 cursor-pointer"
                                        >
                                          <div>
                                            <div className="font-bold text-slate-800">{task.title}</div>
                                            <div className="text-[11px] text-slate-400">{task.idolName}</div>
                                          </div>
                                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {filteredSearchDepartments.length > 0 && (
                                    <div>
                                      <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                                        Đơn Vị &amp; Ban Ngành
                                      </div>
                                      {filteredSearchDepartments.map((dept) => (
                                        <button
                                          key={dept.id}
                                          type="button"
                                          onClick={() => {
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                            setActiveNavTab('roster');
                                            showToast(`Lọc đơn vị: ${dept.name}`);
                                          }}
                                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left hover:bg-indigo-50/70 cursor-pointer"
                                        >
                                          <div>
                                            <div className="font-bold text-slate-800">{dept.name}</div>
                                            <div className="text-[11px] text-slate-400">
                                              {dept.memberCount} thành viên · QL: {dept.lead}
                                            </div>
                                          </div>
                                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notification Bell */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotificationsOpen((prev) => !prev);
                            setIsUserMenuOpen(false);
                          }}
                          aria-label={`Thông báo (${unreadCount} chưa đọc)`}
                          aria-expanded={isNotificationsOpen}
                          aria-haspopup="menu"
                          className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Bell className="h-4 w-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-black leading-4 text-white">
                              {unreadCount}
                            </span>
                          )}
                        </button>

                        {isNotificationsOpen && (
                          <div
                            role="menu"
                            aria-label="Danh sách thông báo"
                            className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                              <span className="text-xs font-extrabold text-slate-900">
                                Thông báo ({unreadCount} chưa đọc)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
                                }
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                Đánh dấu đã đọc
                              </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {notifications.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setIsNotificationsOpen(false);
                                    setNotifications((prev) =>
                                      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)),
                                    );
                                    if (currentRole.allowedTabs.includes(item.targetTab)) {
                                      setActiveNavTab(item.targetTab);
                                    }
                                  }}
                                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left text-xs hover:bg-slate-50 cursor-pointer ${
                                    item.unread ? 'bg-indigo-50/50' : ''
                                  }`}
                                >
                                  <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900">{item.title}</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">{item.description}</div>
                                  </div>
                                  {item.unread && <span className="mt-1.5 h-2 w-2 rounded-full bg-rose-500" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* User Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen((prev) => !prev);
                            setIsNotificationsOpen(false);
                          }}
                          aria-expanded={isUserMenuOpen}
                          aria-haspopup="menu"
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-extrabold text-rose-700">
                            {currentRole.userName.slice(0, 1)}
                          </div>
                          {viewportMode === 'desktop' && (
                            <span className="hidden md:inline text-xs font-bold text-slate-800">
                              {currentRole.userName}
                            </span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        </button>

                        {isUserMenuOpen && (
                          <div
                            role="menu"
                            aria-label="Menu tài khoản"
                            className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl text-xs"
                          >
                            <div className="border-b border-slate-100 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">{currentRole.userName}</span>
                                <span className="rounded-full bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                  {currentRole.label}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">{currentRole.roleTitle} · {currentRole.email}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setActiveModal('profile');
                              }}
                              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-rose-50/70 cursor-pointer"
                            >
                              <User className="h-3.5 w-3.5 text-rose-600" />
                              <span className="font-semibold">Hồ sơ cá nhân &amp; Thể trạng</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setActiveModal('payslip');
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-emerald-50/70 cursor-pointer"
                            >
                              <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-semibold">Xem phiếu lương của tôi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setActiveModal('password');
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-indigo-50/70 cursor-pointer"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                              <span className="font-semibold">Đổi mật khẩu</span>
                            </button>
                            {currentRole.allowedTabs.includes('admin') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUserMenuOpen(false);
                                  setActiveNavTab('admin');
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-100 cursor-pointer"
                              >
                                <Settings className="h-3.5 w-3.5 text-slate-600" />
                                <span className="font-semibold">Cài đặt hệ thống</span>
                              </button>
                            )}
                            <div className="mt-1 border-t border-slate-100 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUserMenuOpen(false);
                                  showToast('Đăng xuất (mô phỏng)');
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                <span>Đăng xuất</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </header>

                  {/* Simulated Content Canvas inside Shell */}
                  <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-x-hidden">
                    <PreviewTabContent
                      activeTab={effectiveActiveNavTab}
                      role={currentRole}
                      onNotify={showToast}
                      onOpenAuditSection={() => setSection('audit_logs')}
                      onOpenProfileModal={() => setActiveModal('profile')}
                      onOpenPayslipModal={() => setActiveModal('payslip')}
                      onOpenLeaveModal={() => setActiveModal('leave')}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Drawer Overlay inside Preview Frame */}
              {isMobileDrawerOpen && (
                <div className="absolute inset-0 z-40 flex">
                  <div
                    className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
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
                    <div className="flex-1 overflow-y-auto">
                      {renderSidebarNavigation(false, () => setIsMobileDrawerOpen(false))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: COMPONENT LIBRARY GALLERY */}
        {section === 'components' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Buttons & Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">1. Nút bấm & Hành động (Buttons)</h2>
                <p className="text-xs text-slate-500">Các biến thể nút chính đang dùng trong hệ thống và trạng thái focus/a11y.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => showToast('Primary CTA clicked')}
                  className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-500 cursor-pointer"
                >
                  + Thêm nhân sự mới
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Secondary clicked')}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Xuất báo cáo CSV
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                >
                  Duyệt bảng lương
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Hủy giao dịch
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
                >
                  Đã khóa (Locked)
                </button>
                <button
                  type="button"
                  aria-label="Tùy chọn bộ lọc nâng cao"
                  title="Tùy chọn bộ lọc nâng cao"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Domain Badges */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">2. Nhãn trạng thái & Phân loại (Badges)</h2>
                <p className="text-xs text-slate-500">Nhãn nhân sự, kỳ lương, giao dịch doanh thu & HTTP Audit.</p>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-500 w-24">Nhân sự:</span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    Đang hoạt động
                  </span>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    Tạm nghỉ
                  </span>
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                    Đã nghỉ việc
                  </span>
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    Dịch vụ ngoài
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-500 w-24">Kỳ lương:</span>
                  <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    Draft
                  </span>
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    Pending
                  </span>
                  <span className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                    Approved
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 lg:col-span-2">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">3. Thẻ chỉ số tài chính & KPI (Stat Cards)</h2>
                <p className="text-xs text-slate-500">Số liệu dùng `tabular-nums`, badge tăng trưởng có màu tương phản rõ ở cả 2 chế độ sáng/tối.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Doanh Thu Ròng</span>
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                      <ArrowUpRight className="h-3 w-3" /> +12.4%
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums text-slate-900">
                    485.200.000 <span className="text-xs font-semibold text-slate-400">đ</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Sau khấu trừ sàn & booking</div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                      Tổng Chi Thực Tế C.Ty
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 dark:!bg-rose-950/70 dark:!text-rose-200 dark:!border-rose-800">
                      Lương + BH 21.5%
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums text-rose-700">
                    218.640.000 <span className="text-xs font-semibold text-rose-400">đ</span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-rose-900/80">
                    BH 21.5% C.Ty: +19.400.000 đ
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-md">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                    Lợi Nhuận Ròng
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums">
                    266.560.000 <span className="text-xs font-semibold text-emerald-100">đ</span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-100">Biên ròng: 54.9%</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Nhiệm Vụ Hoàn Thành</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums text-slate-900">
                    42 <span className="text-xs font-normal text-slate-400">/ 48</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Tỷ lệ hoàn thành: 88%</div>
                </div>
              </div>
            </div>

            {/* Table + Form Preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">4. Bảng dữ liệu chuẩn (Data Table)</h2>
                  <p className="text-xs text-slate-500">Hover row rõ nét ở cả Light & Dark mode, căn phải số tiền `tabular-nums`.</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Nghệ Sĩ</th>
                      <th className="px-4 py-3">Đơn Vị</th>
                      <th className="px-4 py-3">Loại Hình</th>
                      <th className="px-4 py-3 text-right">Thực Nhận</th>
                      <th className="px-4 py-3">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">Minh Anh (Aria)</td>
                      <td className="px-4 py-3 text-slate-600">Nhóm Idol Biểu Diễn & Donate (PK)</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          Công ty
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        24.650.000 đ
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          Đang hoạt động
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">Khánh Vy (Vivi)</td>
                      <td className="px-4 py-3 text-slate-600">Nhóm Live Commerce & Review</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                          Cộng tác viên
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        18.200.000 đ
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Tạm nghỉ
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: BEFORE VS AFTER UI BUG FIXES */}
        {section === 'before_after' && (
          <div className="space-y-5">
            {/* Fix 1: Dark Mode Badge Contrast */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Fix #1 — Tương phản Dark Mode tại badge P&L (`FinanceManagementView.tsx:601`)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bật nút <strong>Dark</strong> ở thanh trên để nhìn sự khác biệt rõ rệt: `bg-rose-200` chưa có mapping trong `index.css` khiến chữ `text-rose-800` trùng màu nền.
                  </p>
                </div>
                <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                  Hiện tại đang xem: {theme.toUpperCase()} MODE
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Trước (Lỗi hiện tại)
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                      4. Tổng Chi Thực Tế C.Ty
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded">
                      Lương + BH 21.5%
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-black text-rose-700">218.640.000 đ</div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Sau (Đề xuất sửa)
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                      4. Tổng Chi Thực Tế C.Ty
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 dark:!bg-rose-950/70 dark:!text-rose-200 dark:!border-rose-800 rounded">
                      Lương + BH 21.5%
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-black text-rose-700">218.640.000 đ</div>
                </div>
              </div>
            </div>

            {/* Fix 2: AnalyticsDashboardView Score Scale */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Fix #2 — Nhãn & Trục thang điểm `AnalyticsDashboardView` theo `scoreCalculationMode`
                  </h2>
                  <p className="text-xs text-slate-500">
                    Thử đổi mode tính điểm để xem sự khác biệt khi agency dùng chế độ cộng tổng (`sum`) với tổng điểm tiêu chí = 150.
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
                  {(['sum', 'weighted'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCalcModePreview(mode)}
                      className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                        calcModePreview === mode
                          ? 'bg-white text-rose-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mode: {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Trước (Dính cứng `/ 100`)
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                    {scoreSnapshot.avg} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Tổng Điểm Đánh Giá Các Idol (Thang 100)
                  </div>
                  <div className="space-y-2 pt-1">
                    {scoreSnapshot.items.map((item) => (
                      <div key={item.name} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="font-mono font-bold text-rose-600">{item.score} điểm</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${Math.min(100, item.score)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Sau (Theo `calcMode`: Thang {scoreSnapshot.maxScale})
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                    {scoreSnapshot.avg}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {scoreSnapshot.maxScale}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {calcModePreview === 'sum'
                      ? `Tổng Điểm Đánh Giá Các Idol (Tổng thang ${scoreSnapshot.maxScale})`
                      : `Điểm Đánh Giá Các Idol (Thang ${scoreSnapshot.maxScale})`}
                  </div>
                  <div className="space-y-2 pt-1">
                    {scoreSnapshot.items.map((item) => (
                      <div key={item.name} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {item.score} / {scoreSnapshot.maxScale}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.round((item.score / scoreSnapshot.maxScale) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fix 3: Accessible Filter Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Fix #3 — Bộ lọc chuẩn Accessibility (`RevenueManagementView.tsx:465-522`)
                </h2>
                <p className="text-xs text-slate-500">
                  Bổ sung đầy đủ `id`, `name`, `&lt;label htmlFor=... className="sr-only"&gt;`, `aria-label` và nút xóa bộ lọc trực quan.
                </p>
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                <div className="relative flex-1 min-w-[200px]">
                  <label htmlFor="rev-preview-search" className="sr-only">
                    Tìm kiếm giao dịch doanh thu
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="rev-preview-search"
                    name="revenueSearch"
                    type="text"
                    aria-label="Tìm theo mã giao dịch, tên Idol hoặc hợp đồng booking"
                    placeholder="Tìm theo mã GD, tên Idol, hợp đồng booking..."
                    value={revSearchFilter}
                    onChange={(e) => setRevSearchFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="rev-preview-category" className="sr-only">
                    Lọc theo nguồn thu
                  </label>
                  <select
                    id="rev-preview-category"
                    name="revenueCategory"
                    aria-label="Lọc theo nguồn thu"
                    value={revCategoryFilter}
                    onChange={(e) => setRevCategoryFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">Tất cả nguồn thu</option>
                    <option value="booking">Booking nhãn hàng</option>
                    <option value="pk">PK Donate</option>
                    <option value="live_commerce">Live Commerce</option>
                  </select>

                  <label htmlFor="rev-preview-platform" className="sr-only">
                    Lọc theo nền tảng
                  </label>
                  <select
                    id="rev-preview-platform"
                    name="revenuePlatform"
                    aria-label="Lọc theo nền tảng"
                    value={revPlatformFilter}
                    onChange={(e) => setRevPlatformFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">Tất cả nền tảng</option>
                    <option value="tiktok">TikTok Live</option>
                    <option value="bigo">Bigo Live</option>
                  </select>

                  <label htmlFor="rev-preview-status" className="sr-only">
                    Lọc theo trạng thái giao dịch
                  </label>
                  <select
                    id="rev-preview-status"
                    name="revenueStatus"
                    aria-label="Lọc theo trạng thái giao dịch"
                    value={revStatusFilter}
                    onChange={(e) => setRevStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="draft">Chờ duyệt</option>
                    <option value="verified">Đã duyệt</option>
                    <option value="synced_to_payroll">Đã sync Lương</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: AUDIT LOG VIEWER MOCKUP */}
        {section === 'audit_logs' && (
          <div className="space-y-4">
            {!currentRole.isSuperAdmin ? (
              <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-2xs space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Chỉ System Admin được xem Nhật Ký Hệ Thống (`AuditLog`)
                </h2>
                <p className="text-xs leading-relaxed text-slate-500">
                  Bạn đang giả lập vai trò <strong>{currentRole.label}</strong>. Trong bản thật, sub-tab{' '}
                  <strong>Nhật Ký Hệ Thống</strong> tại <code className="font-mono">AdminPortalView</code> sẽ bị ẩn và API{' '}
                  <code className="font-mono">GET /api/audit-logs</code> sẽ trả về <code className="font-mono">403 Forbidden</code>.
                </p>
                <button
                  type="button"
                  onClick={() => setRoleId('super_admin')}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
                >
                  Chuyển sang vai trò Super Admin để xem trước
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Theo dõi toàn bộ thao tác ghi/sửa/xóa (`POST`, `PUT`, `DELETE`) kèm mã HTTP & payload metadata.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => showToast(`Đã xuất ${filteredAuditLogs.length} dòng nhật ký mẫu (CSV)`)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Xuất CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                  <div className="relative flex-1 min-w-[220px]">
                    <label htmlFor="audit-preview-search" className="sr-only">
                      Tìm kiếm nhật ký kiểm toán
                    </label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="audit-preview-search"
                      name="auditSearch"
                      type="text"
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        setAuditPage(1);
                      }}
                      placeholder="Tìm requestId, endpoint, user, resourceId..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 text-slate-500 font-semibold">
                      <Filter className="h-3.5 w-3.5" />
                    </div>
                    <label htmlFor="audit-preview-method" className="sr-only">
                      Lọc theo HTTP Method
                    </label>
                    <select
                      id="audit-preview-method"
                      name="auditMethod"
                      aria-label="Lọc theo phương thức HTTP"
                      value={auditMethod}
                      onChange={(e) => setAuditMethod(e.target.value as typeof auditMethod)}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">Mọi Method</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>

                    <label htmlFor="audit-preview-resource" className="sr-only">
                      Lọc theo đối tượng tài nguyên
                    </label>
                    <select
                      id="audit-preview-resource"
                      name="auditResource"
                      aria-label="Lọc theo đối tượng tài nguyên"
                      value={auditResource}
                      onChange={(e) => setAuditResource(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Mọi tài nguyên</option>
                      <option value="payroll">payroll</option>
                      <option value="payroll_record">payroll_record</option>
                      <option value="auth_profile">auth_profile</option>
                      <option value="approval_request">approval_request</option>
                      <option value="company_expense">company_expense</option>
                      <option value="work_assignment">work_assignment</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-3.5 py-3">Thời Gian (VN)</th>
                        <th className="px-3.5 py-3">Người Thao Tác</th>
                        <th className="px-3.5 py-3">Method & Endpoint</th>
                        <th className="px-3.5 py-3">Hành Động / Đối Tượng</th>
                        <th className="px-3.5 py-3 text-center">HTTP</th>
                        <th className="px-3.5 py-3 text-right">Chi Tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            Không có bản ghi nhật ký nào khớp bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                              <div>{row.createdAt}</div>
                              <div className="text-[10px] text-slate-400">{row.requestId}</div>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="font-bold text-slate-900">{row.actorName}</div>
                              <div className="text-[11px] text-slate-500">
                                @{row.actorUsername} · {row.actorRole}
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-black ${getMethodBadgeClass(
                                    row.method,
                                  )}`}
                                >
                                  {row.method}
                                </span>
                                <code className="font-mono text-[11px] text-slate-700">{row.path}</code>
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="font-semibold text-slate-800">{row.action}</div>
                              <div className="text-[11px] text-slate-400">
                                {row.resource} · #{row.resourceId}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <span
                                className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-black tabular-nums ${getStatusBadgeClass(
                                  row.statusCode,
                                )}`}
                              >
                                {row.statusCode}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedAuditRow(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Metadata</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Hiển thị <strong>{filteredAuditLogs.length}</strong> / {MOCK_AUDIT_LOGS.length} bản ghi mô phỏng
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      aria-label="Trang trước"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Trước</span>
                    </button>
                    <span className="px-2 font-bold text-slate-700">Trang {auditPage} / 1</span>
                    <button
                      type="button"
                      disabled
                      aria-label="Trang sau"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40"
                    >
                      <span>Sau</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Metadata Drawer / Modal */}
      {selectedAuditRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]"
          onClick={() => setSelectedAuditRow(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-metadata-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <h3 id="audit-metadata-title" className="text-sm font-extrabold text-slate-900">
                  Chi tiết AuditLog · {selectedAuditRow.requestId}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedAuditRow.method} {selectedAuditRow.path}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại chi tiết"
                onClick={() => setSelectedAuditRow(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Người thao tác</div>
                  <div className="font-bold text-slate-900">
                    {selectedAuditRow.actorName} (@{selectedAuditRow.actorUsername})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Mã HTTP / Hành động</div>
                  <div className="font-bold text-slate-900">
                    {selectedAuditRow.statusCode} · {selectedAuditRow.action}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-bold text-slate-600">JSON Metadata</div>
                <pre className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3.5 font-mono text-[11px] leading-relaxed text-emerald-300">
                  {JSON.stringify(selectedAuditRow.metadata, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setSelectedAuditRow(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <PreviewHeaderModals
        activeModal={activeModal}
        role={currentRole}
        onClose={() => setActiveModal(null)}
        onNotify={showToast}
      />
    </div>
  );
};
