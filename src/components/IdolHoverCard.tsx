import React, { useEffect, useState } from 'react';
import { Idol, IDOL_CATEGORIES_CONFIG } from '../types/index.ts';
import { Mail, Linkedin, Instagram, Share2, MapPin, Sparkles, ShieldCheck, ShoppingBag } from 'lucide-react';

interface IdolHoverCardProps {
  idol: Idol | null;
  position: { x: number; y: number } | null;
  onMouseEnterPopover?: () => void;
  onMouseLeavePopover?: () => void;
}

export const IdolHoverCard: React.FC<IdolHoverCardProps> = ({
  idol,
  position,
  onMouseEnterPopover,
  onMouseLeavePopover
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!position) return;
    const cardWidth = 340;
    const cardHeight = 320;
    const padding = 16;

    let targetX = position.x + 16;
    let targetY = position.y + 16;

    // Viewport overflow bounds check
    if (targetX + cardWidth > window.innerWidth - padding) {
      targetX = position.x - cardWidth - 16;
    }
    if (targetX < padding) targetX = padding;

    if (targetY + cardHeight > window.innerHeight - padding) {
      targetY = position.y - cardHeight - 8;
    }
    if (targetY < padding) targetY = padding;

    setCoords({ x: targetX, y: targetY });
  }, [position]);

  if (!idol || !position) return null;

  return (
    <div
      onMouseEnter={onMouseEnterPopover}
      onMouseLeave={onMouseLeavePopover}
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
      }}
      className="fixed z-50 w-[340px] pointer-events-auto bg-white rounded-xl shadow-2xl border border-slate-200/90 p-4 transition-opacity duration-150 animate-in fade-in zoom-in-95 backdrop-blur-md"
    >
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-rose-400 to-sky-600 rounded-t-xl" />

      {/* Main Identity Zone */}
      <div className="flex items-start gap-3 pt-1">
        {/* Avatar */}
        <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-rose-100 shadow-sm bg-slate-100">
          <img
            src={idol.avatarUrl || '/placeholder-avatar.png'}
            alt={idol.stageName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to styled initials SVG
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-initials')) {
                const fallback = document.createElement('div');
                fallback.className = 'fallback-initials w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-sky-100 text-slate-800 font-bold text-lg';
                fallback.innerText = idol.stageName.charAt(0);
                parent.appendChild(fallback);
              }
            }}
          />
        </div>

        {/* Identity & Department */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-base font-bold text-slate-900 truncate tracking-tight">
              {idol.stageName}
            </h4>
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-rose-700 bg-rose-50 rounded">
              STT {idol.stt}
            </span>
          </div>

          {idol.personnelType !== 'Dịch vụ ngoài' && idol.idolCategory && IDOL_CATEGORIES_CONFIG[idol.idolCategory] && (
            <div className="mt-0.5">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeBg} ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeBorder} ${IDOL_CATEGORIES_CONFIG[idol.idolCategory].badgeText}`}>
                <span>{IDOL_CATEGORIES_CONFIG[idol.idolCategory].icon}</span>
                <span>{IDOL_CATEGORIES_CONFIG[idol.idolCategory].label}</span>
              </span>
            </div>
          )}

          <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
            Tên thật: <span className="text-slate-800">{idol.realName}</span>
          </p>
          <p className="text-xs text-sky-800 font-semibold truncate mt-0.5">
            {idol.role}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
            <span className="truncate">{idol.department}</span>
          </div>
        </div>
      </div>

      {/* Status & Location Pill-Free Metadata */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
        {idol.personnelType === 'Dịch vụ ngoài' ? (
          <div className="flex items-center gap-1.5 text-amber-750 font-medium">
            <span>🏷️ Khách dịch vụ ngoài</span>
          </div>
        ) : idol.status === 'Chờ duyệt' ? (
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Chờ duyệt (Pending)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              idol.status === 'Đang hoạt động' ? 'bg-emerald-500' :
              idol.status === 'Đang lưu diễn' ? 'bg-sky-500' :
              idol.status === 'Đang ghi hình' ? 'bg-amber-500' :
              idol.status === 'Thực tập sinh' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <span className="font-medium text-slate-700">{idol.status}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-slate-500">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{idol.currentLiving || idol.hometown}</span>
        </div>
      </div>

      {/* Bio / Giới thiệu bản thân */}
      <div className="mt-2.5 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100">
        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 italic">
          "{idol.bio || 'Chưa cập nhật tiểu sử nghệ sĩ.'}"
        </p>
      </div>

      {/* Physical & Vital Metrics */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center bg-sky-50/40 rounded-lg p-1.5 border border-sky-100/60 text-[11px]">
        <div>
          <span className="text-slate-400 block text-[10px]">Chiều cao</span>
          <span className="font-semibold text-slate-800 font-mono tabular-nums">{idol.height} cm</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Cân nặng</span>
          <span className="font-semibold text-slate-800 font-mono tabular-nums">{idol.weight} kg</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Năm sinh</span>
          <span className="font-semibold text-slate-800 font-mono tabular-nums">{idol.dob?.split('-')[0] || '---'}</span>
        </div>
      </div>

      {/* Social Links & Action Row */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {idol.socialLinks?.email && (
            <a
              href={`mailto:${idol.socialLinks.email}`}
              title={`Email: ${idol.socialLinks.email}`}
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {idol.socialLinks?.linkedin ? (
            <a
              href={`https://${idol.socialLinks.linkedin.replace(/^https?:\/\//, '')}`}
              target="_blank"
              rel="noreferrer"
              title="LinkedIn Profile"
              className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="p-1.5 text-slate-300" title="Chưa cập nhật LinkedIn">
              <Linkedin className="w-3.5 h-3.5" />
            </span>
          )}
          {idol.socialLinks?.instagram && (
            <a
              href={`https://${idol.socialLinks.instagram.replace(/^https?:\/\//, '')}`}
              target="_blank"
              rel="noreferrer"
              title="Instagram"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Hồ sơ đã xác thực
        </span>
      </div>
    </div>
  );
};
