'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Users, Star, Flag, Megaphone,
  AlertTriangle, Settings, LogOut, ChevronRight, Shield
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

  return (
    <aside className="w-64 min-h-screen glass border-r border-gray-800/50 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-800/50">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-black text-[#007AFF]">g</span>
          <span className="text-xl font-bold text-white">roundwork.</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Shield size={10} className="text-[#007AFF]" />
          <span className="text-[10px] font-semibold text-[#007AFF] uppercase tracking-widest">Admin Panel</span>
        </div>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-6 border-t border-gray-800/50 pt-4 space-y-1">
        <div className="px-3 py-2 rounded-xl bg-gray-900/60 mb-2">
          <p className="text-xs font-semibold text-white truncate">{profile?.full_name || profile?.username || 'Admin'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] text-gray-500 capitalize">{profile?.role || 'admin'}</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 w-full transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
