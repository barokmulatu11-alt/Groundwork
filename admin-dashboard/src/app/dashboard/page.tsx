'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Users, CheckCircle, Star, BarChart2, Activity, Zap, TrendingUp, Clock } from 'lucide-react';
import clsx from 'clsx';

interface Stats {
  totalUsers: number;
  proUsers: number;
  totalTasks: number;
  totalHabits: number;
  recentSignups: any[];
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: any) {
  const { isDark } = useTheme();
  const colors: Record<string, string> = {
    blue: 'text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/20',
    green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  };
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 transition-all">
      <div className="flex items-start justify-between">
        <div className={clsx("p-2.5 rounded-xl border", colors[color])}>
          <Icon size={18} />
        </div>
        <TrendingUp size={14} className={clsx("transition-colors", isDark ? "text-gray-600" : "text-slate-300")} />
      </div>
      <div>
        <p className={clsx("text-3xl font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>
          {value ?? <span className={clsx("animate-pulse", isDark ? "text-gray-800" : "text-slate-200")}>---</span>}
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
  const { isDark } = useTheme();

  useEffect(() => {
    const load = async () => {
      const [usersRes, proRes, tasksRes, habitsRes, signupsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('pro_status', true),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('habits').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('profiles').select('id, username, full_name, created_at, role, pro_status').order('created_at', { ascending: false }).limit(5),
      ]);
      setStats({
        totalUsers: usersRes.count ?? 0,
        proUsers: proRes.count ?? 0,
        totalTasks: tasksRes.count ?? 0,
        totalHabits: habitsRes.count ?? 0,
        recentSignups: signupsRes.data ?? [],
      });
      setLoading(false);
    };
    load();
  }, []);

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      owner: 'bg-yellow-400/15 text-yellow-500 border-yellow-400/30',
      admin: 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
      moderator: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
      user: isDark ? 'bg-gray-700/40 text-gray-400 border-gray-700' : 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[role] || map.user;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={clsx("text-2xl font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>Overview</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">Live data from Supabase • groundwork. v1.1.0</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub="Registered accounts" color="blue" />
        <StatCard icon={Star} label="Pro Users" value={stats.proUsers} sub="Active subscriptions" color="green" />
        <StatCard icon={CheckCircle} label="Total Tasks" value={stats.totalTasks} sub="Created tasks" color="purple" />
        <StatCard icon={Activity} label="Total Habits" value={stats.totalHabits} sub="Tracked habits" color="orange" />
      </div>

      {/* Recent Signups */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={clsx("text-base font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>Recent Signups</h2>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">Latest 5 user registrations</p>
          </div>
          <Clock size={16} className={clsx("transition-colors", isDark ? "text-gray-600" : "text-slate-300")} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={clsx("h-14 rounded-xl animate-pulse", isDark ? "bg-gray-800/50" : "bg-slate-100")} />
            ))}
          </div>
        ) : stats.recentSignups?.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm text-center py-8">No users yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentSignups?.map((u) => (
              <div key={u.id} className={clsx("flex items-center gap-4 px-4 py-3 rounded-xl transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007AFF] to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg">
                  {(u.full_name || u.username || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-sm font-semibold truncate transition-colors", isDark ? "text-white" : "text-slate-900")}>{u.full_name || u.username || 'Anonymous'}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.pro_status && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-500 border border-emerald-400/30 tracking-wider">PRO</span>
                  )}
                  <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border capitalize tracking-wider", roleBadge(u.role))}>{u.role}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[
          { label: 'Manage Users', href: '/dashboard/users', icon: Users, color: 'from-[#007AFF]/10' },
          { label: 'Feature Flags', href: '/dashboard/flags', icon: Zap, color: 'from-purple-500/10' },
          { label: 'Announcements', href: '/dashboard/announcements', icon: BarChart2, color: 'from-emerald-500/10' },
        ].map(({ label, href, icon: Icon, color }) => (
          <a key={href} href={href} className={clsx("glass rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-all group bg-gradient-to-br", color)}>
            <Icon size={20} className={clsx("transition-colors", isDark ? "text-gray-500 group-hover:text-[#007AFF]" : "text-slate-400 group-hover:text-[#007AFF]")} />
            <span className={clsx("text-sm font-bold transition-colors", isDark ? "text-gray-300 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900")}>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
