'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/ThemeContext';
import {
  LayoutDashboard, Users, Star, Flag, Megaphone,
  AlertTriangle, Settings, LogOut, ChevronRight, Shield,
  Sun, Moon
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/subscriptions', label: 'Pro Subscriptions', icon: Star },
  { href: '/dashboard/flags', label: 'Feature Flags', icon: Flag },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/reports', label: 'Reports', icon: AlertTriangle },
  { href: '/dashboard/config', label: 'Remote Config', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <aside className="w-64 min-h-screen glass border-r border-gray-800/50 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-800/50 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-black text-[#007AFF]">g</span>
            <span className={clsx("text-xl font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>roundwork.</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Shield size={10} className="text-[#007AFF]" />
            <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest">Admin Panel</span>
          </div>
        </div>
        
        <button 
          onClick={toggleTheme}
          className={clsx(
            "p-2 rounded-xl border transition-all shadow-sm",
            isDark ? "bg-white/5 border-white/10 text-amber-400 hover:bg-white/10" : "bg-white border-slate-200 text-amber-500 hover:bg-slate-50"
          )}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group',
                active
                  ? 'bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/20 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon size={16} className={clsx("transition-colors", active ? "text-[#007AFF]" : isDark ? "text-gray-500 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-6 border-t border-gray-800/50 pt-4 space-y-1">
        <div className={clsx("px-3 py-2.5 rounded-xl mb-2 shadow-sm transition-colors", isDark ? "bg-gray-900/60" : "bg-slate-100/50 border border-slate-200/50")}>
          <p className={clsx("text-xs font-bold truncate transition-colors", isDark ? "text-white" : "text-slate-900")}>
            {profile?.full_name || profile?.username || 'Admin User'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-[var(--text-secondary)] font-bold capitalize tracking-wider">{profile?.role || 'administrator'}</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold w-full transition-all",
            isDark ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 hover:bg-red-50 shadow-sm border border-transparent hover:border-red-100"
          )}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
