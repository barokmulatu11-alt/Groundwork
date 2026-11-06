'use client';

import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  Flag,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Moon,
  Settings,
  Shield,
  Star,
  Sun,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/emails', label: 'Email Templates', icon: Mail },
  { href: '/dashboard/flags', label: 'Feature Flags', icon: Flag },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/reports', label: 'Reports', icon: AlertTriangle },
  { href: '/dashboard/config', label: 'Remote Config', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme, premiumThemeId, setPremiumThemeId, premiumThemes } = useTheme();

  return (
    <aside
      className={clsx(
        'w-64 min-h-screen border-r flex flex-col transition-colors duration-200 backdrop-blur-xl',
        isDark ? 'bg-[#000000]/90 border-white/10' : 'bg-[#FAF9F6]/95 border-black/8'
      )}
    >
      {/* Brand Header */}
      <div className={clsx('px-6 py-6 border-b flex items-center justify-between', isDark ? 'border-white/10' : 'border-black/8')}>
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-black text-[#0066FF]">g</span>
            <span className={clsx('text-xl font-black transition-colors', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              roundwork.
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Shield size={10} className="text-[#0066FF]" />
            <span className="text-[10px] font-black text-[#0066FF] uppercase tracking-widest">
              Barok Labs Admin
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className={clsx(
            'p-2 rounded-xl border transition-all shadow-sm',
            isDark
              ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10'
              : 'bg-white border-black/8 text-amber-600 hover:bg-slate-50'
          )}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Theme Surface Selector */}
      <div className={clsx('px-4 pt-3 pb-3 border-b', isDark ? 'border-white/10' : 'border-black/8')}>
        <label
          htmlFor="dashboard-premium-theme"
          className={clsx(
            'text-[10px] uppercase tracking-widest font-bold block mb-1.5',
            isDark ? 'text-[#787571]' : 'text-[#8E8C87]'
          )}
        >
          Theme Surface
        </label>
        <select
          id="dashboard-premium-theme"
          value={premiumThemeId}
          onChange={(e) => setPremiumThemeId(e.target.value)}
          className={clsx(
            'w-full rounded-xl border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors cursor-pointer',
            isDark
              ? 'bg-[#0A0A0C] border-white/10 text-[#F5F2EB]'
              : 'bg-white border-black/10 text-[#141312]'
          )}
        >
          {premiumThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group',
                active
                  ? 'bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/25 shadow-sm'
                  : isDark
                  ? 'text-[#A3A099] hover:text-[#F5F2EB] hover:bg-white/5'
                  : 'text-[#686662] hover:text-[#141312] hover:bg-black/5'
              )}
            >
              <Icon
                size={16}
                className={clsx(
                  'transition-colors',
                  active
                    ? 'text-[#0066FF]'
                    : isDark
                    ? 'text-[#787571] group-hover:text-[#F5F2EB]'
                    : 'text-[#8E8C87] group-hover:text-[#141312]'
                )}
              />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="opacity-70 text-[#0066FF]" />}
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className={clsx('px-3 pb-5 border-t pt-3.5 space-y-1', isDark ? 'border-white/10' : 'border-black/8')}>
        <div
          className={clsx(
            'px-3 py-2.5 rounded-xl mb-2 shadow-sm transition-colors border',
            isDark ? 'bg-[#0A0A0C] border-white/10' : 'bg-white border-black/8'
          )}
        >
          <p className={clsx('text-xs font-bold truncate transition-colors', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
            {profile?.full_name || profile?.username || 'Admin User'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span
              className={clsx(
                'text-[10px] font-bold capitalize tracking-wider',
                isDark ? 'text-[#A3A099]' : 'text-[#686662]'
              )}
            >
              {profile?.role || 'administrator'}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          className={clsx(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold w-full transition-all',
            isDark
              ? 'text-[#787571] hover:text-red-400 hover:bg-red-500/10'
              : 'text-[#8E8C87] hover:text-red-600 hover:bg-red-50'
          )}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
