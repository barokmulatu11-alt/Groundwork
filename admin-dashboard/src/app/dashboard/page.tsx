'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import Link from 'next/link';
import { Users, CheckCircle, Star, BarChart2, Activity, Zap, TrendingUp, Clock, Timer, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface Stats {
  totalUsers: number;
  proUsers: number;
  completedTasks: number;
  totalFocusHours: number;
  activeHabits: number;
  totalFocusSessions: number;
  recentSignups: any[];
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: any) {
  const { isDark } = useTheme();
  const colors: Record<string, string> = {
    blue:   'text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/20',
    green:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  };
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 transition-all hover:scale-[1.01]">
      <div className="flex items-start justify-between">
        <div className={clsx('p-2.5 rounded-xl border', colors[color])}>
          <Icon size={18} />
        </div>
        <TrendingUp size={14} className={clsx('transition-colors', isDark ? 'text-gray-600' : 'text-slate-300')} />
      </div>
      <div>
        <p className={clsx('text-3xl font-black transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
          {value != null ? value : (
            <span className={clsx('animate-pulse', isDark ? 'text-gray-800' : 'text-slate-200')}>---</span>
          )}
        </p>
        <p className="text-sm font-semibold text-[var(--text-secondary)] mt-1">{label}</p>
        {sub && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 opacity-60 uppercase tracking-widest font-bold">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { isDark } = useTheme();

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [
        usersRes,
        proRes,
        completedTasksRes,
        focusRes,
        activeHabitsRes,
        signupsRes,
      ] = await Promise.all([
        // Total registered users
        supabase.from('profiles').select('id', { count: 'exact', head: true }),

        // Pro subscribers
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('pro_status', true),

        // Completed tasks (non-deleted)
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('completed', true)
          .is('deleted_at', null),

        // All focus sessions to sum duration
        supabase.from('focus_sessions').select('duration_minutes'),

        // Active habits (non-deleted, non-paused)
        supabase.from('habits').select('id', { count: 'exact', head: true })
          .eq('is_paused', false)
          .is('deleted_at', null),

        // Recent signups
        supabase.from('profiles')
          .select('id, username, full_name, created_at, role, pro_status')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const firstErr =
        usersRes.error ||
        proRes.error ||
        completedTasksRes.error ||
        focusRes.error ||
        activeHabitsRes.error ||
        signupsRes.error;

      if (firstErr) {
        setLoadError(firstErr.message);
      }

      // Calculate total focus minutes → hours
      const totalMinutes = (focusRes.data ?? []).reduce(
        (acc: number, s: any) => acc + (Number(s.duration_minutes) || 0),
        0
      );
      const totalFocusHours = Math.round((totalMinutes / 60) * 10) / 10; // 1 dp

      setStats({
        totalUsers:        usersRes.error        ? undefined : (usersRes.count ?? 0),
        proUsers:          proRes.error          ? undefined : (proRes.count ?? 0),
        completedTasks:    completedTasksRes.error ? undefined : (completedTasksRes.count ?? 0),
        totalFocusHours:   focusRes.error        ? undefined : totalFocusHours,
        activeHabits:      activeHabitsRes.error ? undefined : (activeHabitsRes.count ?? 0),
        totalFocusSessions: focusRes.error       ? undefined : (focusRes.data?.length ?? 0),
        recentSignups:     signupsRes.data ?? [],
      });
    } catch (e: any) {
      setLoadError(e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      owner:     'bg-yellow-400/15 text-yellow-500 border-yellow-400/30',
      admin:     'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
      moderator: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
      user:       isDark
        ? 'bg-gray-700/40 text-gray-400 border-gray-700'
        : 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[role] || map.user;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className={clsx('text-2xl font-black transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
            Overview
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
            Live data from Supabase • groundwork. v1.2.1
            {lastRefreshed && (
              <span className="ml-2 opacity-50">
                • Refreshed {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
          {loadError && (
            <p className="text-red-400 text-xs mt-1">⚠ Failed to load stats: {loadError}</p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border',
            isDark
              ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards — Row 1: Users */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          sub="Registered accounts"
          color="blue"
        />
        <StatCard
          icon={Star}
          label="Pro Users"
          value={stats.proUsers}
          sub="Active subscriptions"
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Tasks"
          value={stats.completedTasks}
          sub="Across all users"
          color="purple"
        />
        <StatCard
          icon={Activity}
          label="Active Habits"
          value={stats.activeHabits}
          sub="Non-paused habits"
          color="orange"
        />
      </div>

      {/* Stat Cards — Row 2: Productivity */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6 flex flex-col gap-2 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
              <Clock size={18} />
            </div>
            <div>
              <p className={clsx('text-3xl font-black', isDark ? 'text-white' : 'text-slate-900')}>
                {stats.totalFocusHours != null ? `${stats.totalFocusHours}h` : (
                  <span className="animate-pulse text-gray-600">---</span>
                )}
              </p>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Total Focus Time</p>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] opacity-60 uppercase tracking-widest font-bold mt-1">
            Over {stats.totalFocusSessions ?? '—'} recorded sessions
          </p>
        </div>

        <div className={clsx('glass rounded-2xl p-6 flex flex-col justify-between border border-[var(--border-color)]')}>
          <p className={clsx('text-xs font-black uppercase tracking-wider mb-3', isDark ? 'text-gray-400' : 'text-slate-500')}>
            Platform Snapshot
          </p>
          <div className="space-y-2 text-sm font-semibold">
            {[
              { label: 'Avg focus/user',  value: stats.totalUsers ? `${((stats.totalFocusHours ?? 0) / stats.totalUsers).toFixed(1)}h` : '—' },
              { label: 'Pro conversion',  value: stats.totalUsers ? `${Math.round(((stats.proUsers ?? 0) / stats.totalUsers) * 100)}%` : '—' },
              { label: 'Tasks completed', value: stats.completedTasks != null ? stats.completedTasks.toLocaleString() : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] text-xs">{label}</span>
                <span className={clsx('text-xs font-black', isDark ? 'text-white' : 'text-slate-900')}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      <div className="glass rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={clsx('text-base font-bold transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
              Recent Signups
            </h2>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">Latest 5 user registrations</p>
          </div>
          <Clock size={16} className={clsx('transition-colors', isDark ? 'text-gray-600' : 'text-slate-300')} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={clsx('h-14 rounded-xl animate-pulse', isDark ? 'bg-gray-800/50' : 'bg-slate-100')} />
            ))}
          </div>
        ) : (stats.recentSignups?.length ?? 0) === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm text-center py-8">No users yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentSignups?.map((u) => (
              <Link
                key={u.id}
                href={`/dashboard/users/${u.id}`}
                className={clsx('flex items-center gap-4 px-4 py-3 rounded-xl transition-colors', isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007AFF] to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg">
                  {(u.full_name || u.username || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-semibold truncate transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
                    {u.full_name || u.username || 'Anonymous'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {u.pro_status && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-500 border border-emerald-400/30 tracking-wider">
                      PRO
                    </span>
                  )}
                  <span className={clsx('text-[9px] font-black px-2 py-0.5 rounded-full border capitalize tracking-wider', roleBadge(u.role))}>
                    {u.role}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Manage Users',   href: '/dashboard/users',         icon: Users,    color: 'from-[#007AFF]/10' },
          { label: 'Feature Flags',  href: '/dashboard/flags',         icon: Zap,      color: 'from-purple-500/10' },
          { label: 'Announcements',  href: '/dashboard/announcements', icon: BarChart2, color: 'from-emerald-500/10' },
        ].map(({ label, href, icon: Icon, color }) => (
          <a
            key={href}
            href={href}
            className={clsx('glass rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-all group bg-gradient-to-br', color)}
          >
            <Icon
              size={20}
              className={clsx('transition-colors', isDark ? 'text-gray-500 group-hover:text-[#007AFF]' : 'text-slate-400 group-hover:text-[#007AFF]')}
            />
            <span className={clsx('text-sm font-bold transition-colors', isDark ? 'text-gray-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900')}>
              {label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
