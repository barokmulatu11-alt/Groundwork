'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clearUserData as clearUserDataAction } from '@/lib/admin-actions';
import { 
  ArrowLeft, Star, Shield, Ban, Trash2, Crown, CheckCircle, 
  Clock, TrendingUp, CheckSquare, Calendar, Mail, User, 
  AlertTriangle, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';

const safeDateString = (dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  try {
    return d.toLocaleDateString(undefined, options);
  } catch (e) {
    return 'N/A';
  }
};

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  role: string;
  pro_status: boolean;
  is_banned: boolean;
  created_at: string;
}

interface ConnectProfile {
  user_id: string;
  xp: number;
  level: number;
  tasks_completed_count: number;
  longest_streak: number;
  focus_hours: number;
  bio: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
  due_date: string | null;
  created_at: string;
}

interface Habit {
  id: string;
  name: string;
  streak: number;
  is_paused: boolean;
  frequency: string;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  folder: string | null;
  is_pinned: boolean;
  created_at: string;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  category: string;
  created_at: string;
}

interface XpLog {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<'clearData' | null>(null);

  // Loaded DB data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connectProfile, setConnectProfile] = useState<ConnectProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    setIsDark(dark);
  }, []);

  const loadAllUserData = async () => {
    setLoading(true);
    try {
      const [
        profileRes,
        connectRes,
        tasksRes,
        habitsRes,
        focusRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('connect_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('focus_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (profileRes.error) {
        throw new Error(profileRes.error.message);
      }

      setProfile(profileRes.data);
      setConnectProfile(connectRes.data || null);
      setTasks(tasksRes.data || []);
      setHabits(habitsRes.data || []);
      setFocusSessions(focusRes.data || []);

    } catch (e: any) {
      alert(`Failed to load user details: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUserData();
  }, [userId]);

  const togglePro = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const nextPro = !profile.pro_status;
      const { error } = await supabase.from('profiles').update({ pro_status: nextPro }).eq('id', userId);
      if (error) throw error;
      setProfile({ ...profile, pro_status: nextPro });
    } catch (e: any) {
      alert(`Failed to update Pro status: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBan = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const nextBanned = !profile.is_banned;
      const { error } = await supabase.from('profiles').update({ is_banned: nextBanned }).eq('id', userId);
      if (error) throw error;
      setProfile({ ...profile, is_banned: nextBanned });
    } catch (e: any) {
      alert(`Failed to update Suspension status: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const changeRole = async (newRole: string) => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setProfile({ ...profile, role: newRole });
    } catch (e: any) {
      alert(`Failed to update role: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearUserData = async () => {
    if (!profile) return;
    setActionLoading(true);
    const result = await clearUserDataAction(userId);
    if (!result.ok) alert(`Failed to clear user data: ${result.error}`);
    else {
      alert(`Cleared all data for ${profile.full_name || profile.username}.`);
      setModal(null);
      await loadAllUserData();
    }
    setActionLoading(false);
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      owner: 'bg-yellow-400/15 text-yellow-500 border-yellow-400/30',
      admin: 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
      moderator: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
      user: isDark ? 'bg-gray-700/40 text-gray-400 border-gray-700' : 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[role] || map.user;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="animate-spin w-10 h-10 text-[#007AFF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[var(--text-secondary)] text-sm font-semibold">Loading user detail record...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto text-center py-20">
        <div className="glass max-w-md mx-auto p-8 rounded-[32px] border border-red-500/20 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-black text-red-500 mb-2">User Not Found</h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mb-6">The requested user profile does not exist or has been deleted.</p>
          <button onClick={() => router.push('/dashboard/users')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-800 text-white font-bold mx-auto text-sm transition-colors hover:bg-gray-700">
            <ArrowLeft size={14} /> Back to Users list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb */}
      <button 
        onClick={() => router.push('/dashboard/users')} 
        className={clsx("flex items-center gap-2 text-xs font-black tracking-wide uppercase transition-colors mb-6", isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-800")}
      >
        <ArrowLeft size={14} /> Back to Users
      </button>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass rounded-[32px] p-6 shadow-md border border-[var(--border-color)]">
            {/* Avatar block */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-[var(--border-color)]">
              <div className="relative mb-4">
                <div className={clsx("w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl", profile.is_banned ? "bg-gray-800 grayscale border-2 border-red-500/30" : profile.role === 'owner' ? "bg-gradient-to-br from-yellow-400 to-orange-600" : "bg-gradient-to-br from-[#007AFF] to-purple-600")}>
                  {profile.role === 'owner' ? <Crown size={32} /> : (profile.full_name || profile.username || profile.email || '?')[0].toUpperCase()}
                </div>
                {profile.is_banned && (
                  <div className="absolute top-0 right-0 bg-red-600 rounded-full p-1.5 border-2 border-[var(--bg-primary)]" title="Suspended Account">
                    <Ban size={14} className="text-white" />
                  </div>
                )}
              </div>
              <h2 className={clsx("text-lg font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>
                {profile.full_name || 'Anonymous User'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-semibold mt-1">
                {profile.username ? `@${profile.username}` : '(no username)'}
              </p>
              
              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className={clsx("text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wider", profile.pro_status ? "bg-emerald-400/15 text-emerald-500 border-emerald-400/30" : "bg-gray-700/10 text-gray-500 border-gray-700/20")}>
                  {profile.pro_status ? 'PRO PLAN' : 'FREE PLAN'}
                </span>
                <span className={clsx("text-[9px] font-black px-2.5 py-0.5 rounded-full border capitalize tracking-wider", roleBadge(profile.role))}>
                  {profile.role}
                </span>
                {profile.is_banned && (
                  <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 tracking-wider">
                    SUSPENDED
                  </span>
                )}
              </div>
            </div>

            {/* Quick gamification overview */}
            {connectProfile && (
              <div className="py-4 border-b border-[var(--border-color)]">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/10 dark:bg-white/5 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Level</p>
                    <p className={clsx("text-base font-black mt-1", isDark ? "text-white" : "text-slate-900")}>{connectProfile.level}</p>
                  </div>
                  <div className="bg-black/10 dark:bg-white/5 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">XP</p>
                    <p className={clsx("text-base font-black mt-1", isDark ? "text-white" : "text-slate-900")}>{connectProfile.xp}</p>
                  </div>
                  <div className="bg-black/10 dark:bg-white/5 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Streak</p>
                    <p className={clsx("text-base font-black mt-1", isDark ? "text-white" : "text-slate-900")}>{connectProfile.longest_streak}d</p>
                  </div>
                </div>
                {connectProfile.bio && (
                  <div className="mt-4 bg-black/10 dark:bg-white/5 p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed italic text-[var(--text-secondary)]">
                    "{connectProfile.bio}"
                  </div>
                )}
              </div>
            )}

            {/* Metadata detail list */}
            <div className="py-4 space-y-3.5 border-b border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)]">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Mail size={12} /> Email</span>
                <span className={clsx("text-right max-w-[150px] truncate", isDark ? "text-gray-300" : "text-slate-700")}>{profile.email || '(None)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><User size={12} /> User ID</span>
                <span className={clsx("text-right font-mono text-[9px]", isDark ? "text-gray-300" : "text-slate-700")}>{profile.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> Registered</span>
                <span className={clsx("text-right", isDark ? "text-gray-300" : "text-slate-700")}>
                  {safeDateString(profile.created_at, { dateStyle: 'medium' })}
                </span>
              </div>
            </div>

            {/* Admin actions block */}
            <div className="pt-6 space-y-4">
              <h4 className={clsx("text-xs font-black uppercase tracking-wider mb-2", isDark ? "text-white" : "text-slate-900")}>Admin Controls</h4>
              
              {/* Role select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={12} /> Change User Role
                </label>
                <select 
                  value={profile.role} 
                  disabled={actionLoading}
                  onChange={e => changeRole(e.target.value)}
                  className={clsx("rounded-xl px-3 py-2 text-xs outline-none font-black transition-colors w-full border", isDark ? "bg-gray-900 border-gray-800 text-gray-300 focus:border-[#007AFF]" : "bg-white border-slate-200 text-slate-700 focus:border-[#007AFF]")}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {/* Toggle Pro */}
              <button 
                onClick={togglePro}
                disabled={actionLoading}
                className={clsx("flex items-center justify-between w-full p-3 rounded-2xl border text-xs font-black tracking-wide transition-all shadow-sm", 
                  profile.pro_status 
                    ? "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/15" 
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15")}
              >
                <span className="flex items-center gap-2"><Star size={13} /> {profile.pro_status ? 'Revoke Pro Subscription' : 'Grant Pro Access'}</span>
                <span>{profile.pro_status ? 'Active' : 'Free'}</span>
              </button>

              {/* Toggle Ban */}
              <button 
                onClick={toggleBan}
                disabled={actionLoading}
                className={clsx("flex items-center justify-between w-full p-3 rounded-2xl border text-xs font-black tracking-wide transition-all shadow-sm", 
                  profile.is_banned 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15" 
                    : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15")}
              >
                <span className="flex items-center gap-2">{profile.is_banned ? <CheckCircle size={13} /> : <Ban size={13} />} {profile.is_banned ? 'Restore Account Access' : 'Suspend / Ban Account'}</span>
                <span>{profile.is_banned ? 'Suspended' : 'Active'}</span>
              </button>

              {/* Clear Data */}
              <button 
                onClick={() => setModal('clearData')}
                disabled={actionLoading}
                className="flex items-center gap-2 justify-center w-full p-3 rounded-2xl border border-red-500/20 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-black tracking-wide transition-all shadow-sm"
              >
                <Trash2 size={13} /> Clear Synced User Data
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: User Productivity Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass rounded-[32px] p-6 border border-[var(--border-color)]">
            <h3 className={clsx("text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <TrendingUp size={16} /> User Productivity Analytics
            </h3>

            {/* Quick Card Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Tasks Created Card */}
              <div className="glass rounded-3xl p-5 border border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
                  <CheckSquare size={20} />
                </div>
                <h4 className="text-2xl font-black">{tasks.length}</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tasks Created</p>
                <p className="text-[9px] text-[var(--text-secondary)] font-semibold mt-1">
                  {tasks.filter(t => t.completed).length} completed ({tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%)
                </p>
              </div>

              {/* Habits Started Card */}
              <div className="glass rounded-3xl p-5 border border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
                  <TrendingUp size={20} />
                </div>
                <h4 className="text-2xl font-black">{habits.length}</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Habits Started</p>
                <p className="text-[9px] text-[var(--text-secondary)] font-semibold mt-1">
                  {habits.filter(h => !h.is_paused).length} active ({habits.filter(h => h.is_paused).length} paused)
                </p>
              </div>

              {/* Focus Time Card */}
              <div className="glass rounded-3xl p-5 border border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                  <Clock size={20} />
                </div>
                <h4 className="text-2xl font-black">
                  {(focusSessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0) / 60).toFixed(1)}h
                </h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Focus Time</p>
                <p className="text-[9px] text-[var(--text-secondary)] font-semibold mt-1">
                  Over {focusSessions.length} sessions
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal */}
      {modal === 'clearData' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={clsx("glass rounded-[32px] p-8 w-full max-w-sm shadow-2xl border", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
              <Trash2 size={24} />
            </div>
            <h3 className={clsx("text-xl font-black mb-2 transition-colors", isDark ? "text-white" : "text-slate-900")}>Clear Account Data</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed font-medium">
              Are you sure you want to clear all tasks, habits, notes, focus history, friends, and reset gamification progress for {profile.full_name || profile.username || 'user'}? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className={clsx("flex-1 py-3.5 rounded-2xl text-sm font-bold transition-colors", isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Cancel</button>
              <button
                onClick={handleClearUserData}
                disabled={actionLoading}
                className="flex-1 py-3.5 rounded-2xl text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 bg-red-600 hover:bg-red-500"
              >
                {actionLoading ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
