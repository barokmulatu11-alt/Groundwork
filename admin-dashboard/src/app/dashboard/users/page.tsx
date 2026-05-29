'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/auth-context';
import { clearUserData, roleUpdateForAction, canAssignRole } from '@/lib/admin-actions';
import { Search, Star, Ban, Trash2, RefreshCw, Shield, CheckCircle, Crown } from 'lucide-react';
import clsx from 'clsx';

type SortKey = 'created_at' | 'full_name' | 'role';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [proFilter, setProFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: string; user: Profile } | null>(null);
  const { isDark } = useTheme();
  const { profile: actorProfile } = useAuth();
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
      setUsers([]);
    } else {
      setLoadError('');
      setUsers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = [...users];
    if (search) result = result.filter(u => (
      (u.full_name || '') + 
      (u.username || '') + 
      (u.email || '') + 
      u.id
    ).toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
    if (proFilter === 'pro') result = result.filter(u => u.pro_status);
    if (proFilter === 'free') result = result.filter(u => !u.pro_status);
    if (proFilter === 'banned') result = result.filter(u => u.is_banned);

    result.sort((a, b) => {
      if (sortKey === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return ((a as any)[sortKey] || '').localeCompare((b as any)[sortKey] || '');
    });
    setFiltered(result);
  }, [users, search, roleFilter, proFilter, sortKey]);

  const doAction = async (type: string, user: Profile) => {
    setActionLoading(user.id);
    try {
      if (type === 'clearData') {
        const result = await clearUserData(user.id);
        if (!result.ok) {
          alert(`Failed to clear user data: ${result.error}`);
        } else {
          alert(`Cleared all data for ${user.full_name || user.username || 'user'}.`);
          await load();
        }
      } else if (['makeOwner', 'makeAdmin', 'makeModerator', 'makeUser'].includes(type)) {
        const roleResult = roleUpdateForAction(type, actorProfile);
        if ('error' in roleResult) {
          alert(roleResult.error);
        } else {
          const { error } = await supabase.from('profiles').update(roleResult.update).eq('id', user.id);
          if (error) alert(`Failed to update user: ${error.message}`);
          else await load();
        }
      } else {
        let updateData: Record<string, unknown> = {};
        if (type === 'grantPro') {
          const until = new Date();
          until.setDate(until.getDate() + 365);
          updateData = { pro_status: true, pro_until: until.toISOString() };
        }
        else if (type === 'revokePro') updateData = { pro_status: false };
        else if (type === 'banUser') updateData = { is_banned: true };
        else if (type === 'unbanUser') updateData = { is_banned: false };

        const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
        
        if (error) {
          alert(`Failed to update user: ${error.message}`);
        } else {
          await load();
        }
      }
    } catch (e: any) {
      alert(`An unexpected error occurred: ${e.message}`);
    } finally {
      setActionLoading(null);
      setModal(null);
    }
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={clsx("text-2xl font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>Users</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">{filtered.length} accounts found</p>
          {loadError && <p className="text-red-400 text-xs mt-1">{loadError}</p>}
        </div>
        <button onClick={load} className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all shadow-sm font-bold", isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className={clsx(
              "w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-all font-medium",
              isDark ? "bg-gray-900 border border-gray-800 text-white focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-900 focus:border-[#007AFF]"
            )}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={clsx("rounded-xl px-3 py-2.5 text-sm outline-none transition-all font-bold", isDark ? "bg-gray-900 border border-gray-800 text-gray-300 focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-600 focus:border-[#007AFF]")}>
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <select value={proFilter} onChange={e => setProFilter(e.target.value)} className={clsx("rounded-xl px-3 py-2.5 text-sm outline-none transition-all font-bold", isDark ? "bg-gray-900 border border-gray-800 text-gray-300 focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-600 focus:border-[#007AFF]")}>
          <option value="all">All Status</option>
          <option value="pro">Pro Only</option>
          <option value="free">Free Only</option>
          <option value="banned">Banned Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-x-auto shadow-sm">
        <div className={clsx("grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b min-w-[700px]", isDark ? "border-gray-800/50 bg-white/5" : "border-slate-100 bg-slate-50/50")}>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-9" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">User</span>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Plan</span>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Security</span>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-right pr-4">Actions</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className={clsx("h-14 rounded-xl animate-pulse", isDark ? "bg-gray-800/40" : "bg-slate-100")} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[var(--text-secondary)] font-medium">No users match filters.</div>
        ) : (
          <div className="min-w-[700px]">
            {filtered.map((user) => (
              <div 
                key={user.id} 
                onClick={() => router.push(`/dashboard/users/${user.id}`)}
                className={clsx(
                  "grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b transition-colors cursor-pointer", 
                  isDark ? "border-gray-800/30 hover:bg-white/[0.02]" : "border-slate-50 hover:bg-slate-100/50", 
                  user.is_banned && "opacity-70 bg-red-500/[0.02]"
                )}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-md", user.is_banned ? "bg-gray-800 grayscale border border-red-500/30" : user.role === 'owner' ? "bg-gradient-to-br from-yellow-400 to-orange-600" : "bg-gradient-to-br from-[#007AFF] to-purple-600")}>
                    {user.role === 'owner' ? <Crown size={14} /> : (user.full_name || user.username || user.email || 'U')[0].toUpperCase()}
                  </div>
                  {user.is_banned && (
                    <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 border-2 border-[var(--bg-primary)]">
                      <Ban size={8} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={clsx("text-sm font-bold truncate transition-colors", isDark ? "text-white" : "text-slate-900", user.is_banned && "line-through opacity-40")}>{user.full_name || user.username || 'Anonymous'}</p>
                    {user.is_banned && <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-600 font-black uppercase tracking-widest border border-red-500/20">Suspended</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate font-semibold opacity-80">{user.email || `@${user.username || user.id.slice(0, 8)}`}</p>
                </div>

                {/* Plan */}
                <div className="flex justify-center">
                  <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border text-center min-w-[50px] tracking-wider", user.pro_status ? "bg-emerald-400/15 text-emerald-500 border-emerald-400/30" : "bg-gray-700/10 text-gray-500 border-gray-700/20")}>
                    {user.pro_status ? 'PRO' : 'FREE'}
                  </span>
                </div>

                {/* Role */}
                <div className="flex justify-center">
                  <span className={clsx("text-[9px] font-black px-2.5 py-1 rounded-full border capitalize text-center min-w-[70px] tracking-wider", roleBadge(user.role))}>{user.role}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {/* Pro Toggle */}
                  <button onClick={() => setModal({ type: user.pro_status ? 'revokePro' : 'grantPro', user })} className={clsx("p-2.5 rounded-xl transition-colors", user.pro_status ? "text-orange-500 hover:bg-orange-500/10" : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10")} title="Manage Pro">
                    <Star size={14} />
                  </button>
                  
                  {/* Role Management Dropdown Style */}
                  <div className="relative">
                    <button
                      onClick={() => setRoleMenuId(roleMenuId === user.id ? null : user.id)}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                      aria-label="Change role"
                    >
                      <Shield size={14} />
                    </button>
                    {roleMenuId === user.id && (
                      <div className={clsx('absolute bottom-full right-0 mb-2 w-36 rounded-xl border p-1 shadow-2xl z-30', isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200')}>
                        {canAssignRole(actorProfile?.role, 'owner') && (
                          <button onClick={() => { setModal({ type: 'makeOwner', user }); setRoleMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg hover:bg-yellow-500/10 text-yellow-500">Make Owner</button>
                        )}
                        {canAssignRole(actorProfile?.role, 'admin') && (
                          <button onClick={() => { setModal({ type: 'makeAdmin', user }); setRoleMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg hover:bg-[#007AFF]/10 text-[#007AFF]">Make Admin</button>
                        )}
                        {canAssignRole(actorProfile?.role, 'moderator') && (
                          <button onClick={() => { setModal({ type: 'makeModerator', user }); setRoleMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg hover:bg-purple-500/10 text-purple-500">Make Mod</button>
                        )}
                        <button onClick={() => { setModal({ type: 'makeUser', user }); setRoleMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-bold rounded-lg hover:bg-gray-500/10 text-gray-500">Make User</button>
                      </div>
                    )}
                  </div>

                  {/* Ban/Unban */}
                  {user.is_banned ? (
                    <button onClick={() => setModal({ type: 'unbanUser', user })} className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-sm transition-all">
                      <CheckCircle size={14} />
                    </button>
                  ) : (
                    <button onClick={() => setModal({ type: 'banUser', user })} className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Ban User">
                      <Ban size={14} />
                    </button>
                  )}

                  {/* Clear Data */}
                  <button onClick={() => setModal({ type: 'clearData', user })} className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Clear User Data">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={clsx("glass rounded-[32px] p-8 w-full max-w-sm shadow-2xl border", isDark ? "border-white/10" : "border-slate-200")}>
            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", 
              modal.type === 'banUser' || modal.type === 'clearData' ? 'bg-red-500/10 text-red-500' : 
              modal.type === 'makeOwner' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-[#007AFF]/10 text-[#007AFF]')}>
              {modal.type === 'banUser' ? <Ban size={24} /> : modal.type === 'clearData' ? <Trash2 size={24} /> : modal.type === 'makeOwner' ? <Crown size={24} /> : <Shield size={24} />}
            </div>
            <h3 className={clsx("text-xl font-black mb-2 transition-colors", isDark ? "text-white" : "text-slate-900")}>Account Management</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed font-medium">
              {modal.type === 'grantPro' && `Grant 1-year Pro access to ${modal.user.full_name || modal.user.username}?`}
              {modal.type === 'revokePro' && `Remove Pro access from ${modal.user.full_name || modal.user.username}?`}
              {modal.type === 'makeOwner' && `Promote ${modal.user.full_name || modal.user.username} to OWNER? This gives them absolute control.`}
              {modal.type === 'makeAdmin' && `Make ${modal.user.full_name || modal.user.username} an admin?`}
              {modal.type === 'makeModerator' && `Make ${modal.user.full_name || modal.user.username} a moderator?`}
              {modal.type === 'makeUser' && `Set ${modal.user.full_name || modal.user.username} as a standard user?`}
              {modal.type === 'banUser' && `Are you sure you want to suspend ${modal.user.full_name || modal.user.username}?`}
              {modal.type === 'unbanUser' && `Restore access for ${modal.user.full_name || modal.user.username}?`}
              {modal.type === 'clearData' && `Are you sure you want to clear all tasks, habits, notes, focus history, friends, and reset gamification progress for ${modal.user.full_name || modal.user.username}? This action is permanent and cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className={clsx("flex-1 py-3.5 rounded-2xl text-sm font-bold transition-colors", isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Cancel</button>
              <button
                onClick={() => doAction(modal.type, modal.user)}
                disabled={!!actionLoading}
                className={clsx(
                  "flex-1 py-3.5 rounded-2xl text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-current/20",
                  modal.type === 'banUser' || modal.type === 'clearData' ? 'bg-red-600 hover:bg-red-500' : modal.type === 'makeOwner' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-[#007AFF] hover:bg-[#0066dd]'
                )}
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
