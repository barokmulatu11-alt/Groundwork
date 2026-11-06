'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clearUserData as clearUserDataAction } from '@/lib/admin-actions';
import { useTheme } from '@/lib/ThemeContext';
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

  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<'clearData' | null>(null);

  // Loaded DB data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connectProfile, setConnectProfile] = useState<ConnectProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

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
      owner: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
      admin: 'bg-[#0066FF]/15 text-[#0066FF] border-[#0066FF]/30',
      moderator: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
      user: isDark ? 'bg-white/5 text-[#A3A099] border-white/10' : 'bg-black/5 text-[#686662] border-black/10',
    };
    return map[role] || map.user;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="animate-spin w-10 h-10 text-[#0066FF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className={clsx("text-sm font-semibold transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>Loading user detail record...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto text-center py-20">
        <div className={clsx("max-w-md mx-auto p-8 rounded-[32px] border text-center backdrop-blur-xl", isDark ? "bg-[#0A0A0C] border-rose-500/20" : "bg-white border-rose-500/20 shadow-sm")}>
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-black text-rose-500 mb-2">User Not Found</h2>
          <p className={clsx("text-sm font-medium mb-6 transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>The requested user profile does not exist or has been deleted.</p>
          <button onClick={() => router.push('/dashboard/users')} className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold mx-auto text-xs transition-colors border", isDark ? "bg-white/5 border-white/10 text-[#F5F2EB] hover:bg-white/10" : "bg-black/5 border-black/10 text-[#141312] hover:bg-black/10")}>
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
        className={clsx("flex items-center gap-2 text-xs font-black tracking-wide uppercase transition-colors mb-6", isDark ? "text-[#A3A099] hover:text-[#F5F2EB]" : "text-[#686662] hover:text-[#141312]")}
      >
        <ArrowLeft size={14} /> Back to Users
      </button>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className={clsx(
            "rounded-[32px] p-6 shadow-md border backdrop-blur-xl transition-all",
            isDark ? "bg-[#0A0A0C]/80 border-white/10" : "bg-white border-black/8 shadow-sm"
          )}>
            {/* Avatar block */}
            <div className={clsx("flex flex-col items-center text-center pb-6 border-b", isDark ? "border-white/10" : "border-black/5")}>
              <div className="relative mb-4">
                <div className={clsx("w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl", profile.is_banned ? "bg-zinc-800 grayscale border-2 border-rose-500/30" : profile.role === 'owner' ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-[#0066FF] to-indigo-600")}>
                  {profile.role === 'owner' ? <Crown size={32} /> : (profile.full_name || profile.username || profile.email || '?')[0].toUpperCase()}
                </div>
                {profile.is_banned && (
                  <div className="absolute top-0 right-0 bg-rose-600 rounded-full p-1.5 border-2 border-black" title="Suspended Account">
                    <Ban size={14} className="text-white" />
                  </div>
                )}
              </div>
              <h2 className={clsx("text-lg font-black leading-tight tracking-tight", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>
                {profile.full_name || 'Anonymous User'}
              </h2>
              <p className={clsx("text-xs font-semibold mt-1", isDark ? "text-[#A3A099]" : "text-[#686662]")}>
                {profile.username ? `@${profile.username}` : '(no username)'}
              </p>
              
              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className={clsx("text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wider", profile.pro_status ? "bg-emerald-400/15 text-emerald-500 border-emerald-400/30" : isDark ? "bg-white/5 text-[#787571] border-white/10" : "bg-black/5 text-[#8E8C87] border-black/10")}>
                  {profile.pro_status ? 'PRO PLAN' : 'FREE PLAN'}
                </span>
                <span className={clsx("text-[9px] font-black px-2.5 py-0.5 rounded-full border capitalize tracking-wider", roleBadge(profile.role))}>
                  {profile.role}
                </span>
                {profile.is_banned && (
                  <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 tracking-wider">
                    SUSPENDED
                  </span>
                )}
              </div>
            </div>

            {/* Quick gamification overview */}
            {connectProfile && (
              <div className={clsx("py-4 border-b", isDark ? "border-white/10" : "border-black/5")}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={clsx("p-3 rounded-2xl border", isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                    <p className={clsx("text-[9px] font-black uppercase tracking-widest", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Level</p>
                    <p className={clsx("text-base font-black mt-1", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{connectProfile.level}</p>
                  </div>
                  <div className={clsx("p-3 rounded-2xl border", isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                    <p className={clsx("text-[9px] font-black uppercase tracking-widest", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>XP</p>
                    <p className={clsx("text-base font-black mt-1", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{connectProfile.xp}</p>
                  </div>
                  <div className={clsx("p-3 rounded-2xl border", isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                    <p className={clsx("text-[9px] font-black uppercase tracking-widest", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Streak</p>
                    <p className={clsx("text-base font-black mt-1", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{connectProfile.longest_streak}d</p>
                  </div>
                </div>
                {connectProfile.bio && (
                  <div className={clsx("mt-4 p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed italic border", isDark ? "bg-white/5 border-white/5 text-[#A3A099]" : "bg-black/5 border-black/5 text-[#686662]")}>
                    "{connectProfile.bio}"
                  </div>
                )}
              </div>
            )}

            {/* Metadata detail list */}
            <div className={clsx("py-4 space-y-3.5 border-b text-[11px] font-bold", isDark ? "border-white/10 text-[#A3A099]" : "border-black/5 text-[#686662]")}>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Mail size={12} /> Email</span>
                <span className={clsx("text-right max-w-[150px] truncate", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{profile.email || '(None)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><User size={12} /> User ID</span>
                <span className={clsx("text-right font-mono text-[9px]", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{profile.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> Registered</span>
                <span className={clsx("text-right", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>
                  {safeDateString(profile.created_at, { dateStyle: 'medium' })}
                </span>
              </div>
            </div>

            {/* Admin actions block */}
            <div className="pt-6 space-y-4">
              <h4 className={clsx("text-xs font-black uppercase tracking-wider mb-2", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>Admin Controls</h4>
              
              {/* Role select */}
              <div className="flex flex-col gap-1.5">
                <label className={clsx("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>
                  <ShieldCheck size={12} /> Change User Role
                </label>
                <select 
                  value={profile.role} 
                  disabled={actionLoading}
                  onChange={e => changeRole(e.target.value)}
                  className={clsx("rounded-xl px-3 py-2 text-xs outline-none font-bold transition-colors w-full border", isDark ? "bg-[#0A0A0C] border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-white border-black/10 text-[#141312] focus:border-[#0066FF]")}
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
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15" 
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
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/15")}
              >
                <span className="flex items-center gap-2">{profile.is_banned ? <CheckCircle size={13} /> : <Ban size={13} />} {profile.is_banned ? 'Restore Account Access' : 'Suspend / Ban Account'}</span>
                <span>{profile.is_banned ? 'Suspended' : 'Active'}</span>
              </button>

              {/* Clear Data */}
              <button 
                onClick={() => setModal('clearData')}
                disabled={actionLoading}
                className="flex items-center gap-2 justify-center w-full p-3 rounded-2xl border border-rose-500/20 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 text-xs font-black tracking-wide transition-all shadow-sm"
              >
                <Trash2 size={13} /> Clear Synced User Data
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: User Productivity Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className={clsx(
            "rounded-[32px] p-6 border backdrop-blur-xl transition-all",
            isDark ? "bg-[#0A0A0C]/80 border-white/10" : "bg-white border-black/8 shadow-sm"
          )}>
            <h3 className={clsx("text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>
              <TrendingUp size={16} /> User Productivity Analytics
            </h3>

            {/* Quick Card Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Tasks Created Card */}
              <div className={clsx(
                "rounded-3xl p-5 border backdrop-blur-xl transition-all",
                isDark ? "bg-[#0A0A0C] border-white/10" : "bg-[#FAF9F6] border-black/5 shadow-sm"
              )}>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 border border-purple-500/20">
                  <CheckSquare size={20} />
                </div>
                <h4 className={clsx("text-2xl font-black", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{tasks.length}</h4>
                <p className={clsx("text-[10px] font-bold uppercase tracking-widest mt-1", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Tasks Created</p>
                <p className={clsx("text-[9px] font-semibold mt-1", isDark ? "text-[#A3A099]" : "text-[#686662]")}>
                  {tasks.filter(t => t.completed).length} completed ({tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%)
                </p>
              </div>

              {/* Habits Started Card */}
              <div className={clsx(
                "rounded-3xl p-5 border backdrop-blur-xl transition-all",
                isDark ? "bg-[#0A0A0C] border-white/10" : "bg-[#FAF9F6] border-black/5 shadow-sm"
              )}>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 border border-amber-500/20">
                  <TrendingUp size={20} />
                </div>
                <h4 className={clsx("text-2xl font-black", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{habits.length}</h4>
                <p className={clsx("text-[10px] font-bold uppercase tracking-widest mt-1", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Habits Started</p>
                <p className={clsx("text-[9px] font-semibold mt-1", isDark ? "text-[#A3A099]" : "text-[#686662]")}>
                  {habits.filter(h => !h.is_paused).length} active ({habits.filter(h => h.is_paused).length} paused)
                </p>
              </div>

              {/* Focus Time Card */}
              <div className={clsx(
                "rounded-3xl p-5 border backdrop-blur-xl transition-all",
                isDark ? "bg-[#0A0A0C] border-white/10" : "bg-[#FAF9F6] border-black/5 shadow-sm"
              )}>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                  <Clock size={20} />
                </div>
                <h4 className={clsx("text-2xl font-black", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>
                  {(focusSessions.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0) / 60).toFixed(1)}h
                </h4>
                <p className={clsx("text-[10px] font-bold uppercase tracking-widest mt-1", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Focus Time</p>
                <p className={clsx("text-[9px] font-semibold mt-1", isDark ? "text-[#A3A099]" : "text-[#686662]")}>
                  Over {focusSessions.length} sessions
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal */}
      {modal === 'clearData' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={clsx("rounded-[32px] p-8 w-full max-w-sm shadow-2xl border backdrop-blur-2xl", isDark ? "bg-[#0A0A0C] border-white/10" : "bg-white border-black/10")}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6 border border-rose-500/20">
              <Trash2 size={22} />
            </div>
            <h3 className={clsx("text-xl font-black mb-2 tracking-tight transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>Clear Account Data</h3>
            <p className={clsx("text-xs mb-8 leading-relaxed font-medium transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>
              Are you sure you want to clear all tasks, habits, focus history, friends, and reset gamification progress for {profile.full_name || profile.username || 'user'}? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className={clsx("flex-1 py-3 rounded-2xl text-xs font-bold transition-colors border", isDark ? "bg-white/5 border-white/10 text-[#A3A099] hover:bg-white/10 hover:text-[#F5F2EB]" : "bg-black/5 border-black/10 text-[#686662] hover:bg-black/10 hover:text-[#141312]")}>Cancel</button>
              <button
                onClick={handleClearUserData}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-2xl text-white text-xs font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg bg-rose-600 hover:bg-rose-500 transition-all"
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
