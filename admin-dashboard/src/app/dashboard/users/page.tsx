'use client';
import { useEffect, useState } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { Search, Filter, Star, Ban, Trash2, RefreshCw, Shield, ChevronDown } from 'lucide-react';

type SortKey = 'created_at' | 'full_name' | 'role';

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [proFilter, setProFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: string; user: Profile } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = [...users];
    if (search) result = result.filter(u => ((u.full_name || '') + (u.username || '') + u.id).toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
    if (proFilter === 'pro') result = result.filter(u => u.pro_status);
    if (proFilter === 'free') result = result.filter(u => !u.pro_status);
    result.sort((a, b) => {
      if (sortKey === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return ((a as any)[sortKey] || '').localeCompare((b as any)[sortKey] || '');
    });
    setFiltered(result);
  }, [users, search, roleFilter, proFilter, sortKey]);

  const doAction = async (type: string, user: Profile) => {
    setActionLoading(user.id);
    try {
      if (type === 'grantPro') {
        await supabase.from('profiles').update({ pro_status: true }).eq('id', user.id);
      } else if (type === 'revokePro') {
        await supabase.from('profiles').update({ pro_status: false }).eq('id', user.id);
      } else if (type === 'makeAdmin') {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
      } else if (type === 'makeUser') {
        await supabase.from('profiles').update({ role: 'user' }).eq('id', user.id);
      }
      await load();
    } finally {
      setActionLoading(null);
      setModal(null);
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      owner: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
      admin: 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
      moderator: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
      user: 'bg-gray-700/40 text-gray-400 border-gray-700',
    };
    return map[role] || map.user;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} of {users.length} accounts</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#007AFF] transition-colors"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#007AFF]">
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <select value={proFilter} onChange={e => setProFilter(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#007AFF]">
          <option value="all">All Plans</option>
          <option value="pro">Pro</option>
          <option value="free">Free</option>
        </select>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#007AFF]">
          <option value="created_at">Sort: Newest</option>
          <option value="full_name">Sort: Name</option>
          <option value="role">Sort: Role</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-800/50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-9" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-800/40 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-600">No users match your filters.</div>
        ) : (
          <div>
            {filtered.map((user) => (
              <div key={user.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007AFF] to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {(user.full_name || user.username || 'U')[0].toUpperCase()}
                </div>
                {/* Info */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.full_name || user.username || 'Anonymous'}</p>
                  <p className="text-xs text-gray-500">@{user.username || user.id.slice(0, 8)} • Joined {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                {/* Plan */}
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${user.pro_status ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' : 'bg-gray-700/40 text-gray-500 border-gray-700'}`}>
                  {user.pro_status ? 'PRO' : 'FREE'}
                </span>
                {/* Role */}
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${roleBadge(user.role)}`}>{user.role}</span>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  {user.pro_status ? (
                    <button onClick={() => setModal({ type: 'revokePro', user })} disabled={actionLoading === user.id} className="p-2 rounded-lg hover:bg-orange-500/10 text-gray-500 hover:text-orange-400 transition-colors" title="Revoke Pro">
                      <Star size={14} />
                    </button>
                  ) : (
                    <button onClick={() => setModal({ type: 'grantPro', user })} disabled={actionLoading === user.id} className="p-2 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors" title="Grant Pro">
                      <Star size={14} />
                    </button>
                  )}
                  {user.role !== 'admin' && user.role !== 'owner' ? (
                    <button onClick={() => setModal({ type: 'makeAdmin', user })} disabled={actionLoading === user.id} className="p-2 rounded-lg hover:bg-[#007AFF]/10 text-gray-500 hover:text-[#007AFF] transition-colors" title="Make Admin">
                      <Shield size={14} />
                    </button>
                  ) : (
                    <button onClick={() => setModal({ type: 'makeUser', user })} disabled={actionLoading === user.id} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors" title="Remove Admin">
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Confirm Action</h3>
            <p className="text-gray-400 text-sm mb-6">
              {modal.type === 'grantPro' && `Grant Pro access to ${modal.user.full_name || modal.user.username}?`}
              {modal.type === 'revokePro' && `Remove Pro access from ${modal.user.full_name || modal.user.username}?`}
              {modal.type === 'makeAdmin' && `Make ${modal.user.full_name || modal.user.username} an admin?`}
              {modal.type === 'makeUser' && `Downgrade ${modal.user.full_name || modal.user.username} to user?`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700 transition-colors">Cancel</button>
              <button
                onClick={() => doAction(modal.type, modal.user)}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl btn-accent text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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
