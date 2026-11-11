import React, { useState, useRef } from 'react';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserAccount } from '../types/index.ts';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onLoginApi: (username: string, pass: string) => Promise<{ success: boolean; user: UserAccount; accessToken: string }>;
}

const DEMO_ACCOUNTS = [
  {
    roleTitle: 'Giám Đốc Điều Hành (Super Admin)',
    username: 'admin',
    pass: '123',
    desc: 'Toàn quyền hệ thống · Xem tất cả đơn vị · Phân quyền & Thưởng nóng',
    badge: 'Super Admin',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  {
    roleTitle: 'Trưởng Phòng QL & Phát Triển Idol',
    username: 'talent_head',
    pass: '123',
    desc: 'Quản lý 4 nhóm Idol · Điều phối lịch trình & giao nhiệm vụ',
    badge: 'Quản Lý Idol',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300'
  },
  {
    roleTitle: 'Chuyên Viên Nhân Sự & Kế Toán',
    username: 'hr_admin',
    pass: '123',
    desc: 'Hồ sơ nhân sự · Quản lý & tính bảng lương · Phê duyệt nghỉ phép',
    badge: 'HR & Kế Toán',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    roleTitle: 'Idol Aria - Trần Minh Anh (Main Vocal)',
    username: 'anhtm',
    pass: '123',
    desc: 'Dashboard Idol cá nhân · Xem ca trực, nhiệm vụ, điểm KPI & phiếu lương',
    badge: '🌟 Idol / Nghệ Sĩ',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    roleTitle: 'Idol G-Leo - Lê Bảo Vy (Gaming & Gear)',
    username: 'baong',
    pass: '123',
    desc: 'Dashboard Idol cá nhân · Theo dõi lịch stream & chỉ tiêu vận hành',
    badge: '🌟 Idol / Nghệ Sĩ',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  }
];


export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onLoginApi }) => {
  const showDemoAccounts = import.meta.env.DEV;
  const [username, setUsername] = useState(import.meta.env.DEV ? 'admin' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? '123' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await onLoginApi(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Tài khoản hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (accUsername: string, accPass: string) => {
    setUsername(accUsername);
    setPassword(accPass);
    try {
      setLoading(true);
      setError(null);
      const res = await onLoginApi(accUsername, accPass);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đăng nhập tài khoản mẫu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-sky-700 text-white shadow-md mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          AURA <span className="text-rose-600">TALENT</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Chào mừng đến với hệ thống AURA TALENT Idol Agency
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200/90">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tài khoản hoặc Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="admin hoặc admin@auratalent.vn"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      passwordInputRef.current?.focus();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={passwordInputRef}
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-fit mx-auto flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {showDemoAccounts && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickLogin(acc.username, acc.pass)}
                    disabled={loading}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-rose-300 bg-slate-50/60 hover:bg-rose-50/30 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                          {acc.roleTitle}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {acc.desc}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${acc.badgeColor}`}>
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Security footnote */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Bảo mật cơ chế Phân Quyền Vai Trò (RBAC) cho Idol Agency
          </p>
        </div>
      </div>
    </div>
  );
};
