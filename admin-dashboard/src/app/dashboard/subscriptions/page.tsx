'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, RefreshCw, Plus, Clock, Crown } from 'lucide-react';

interface UserSub {
  id: string;
  username: string | null;
  full_name: string | null;
  pro_status: boolean;
  pro_until: string | null;
  role: string;
  created_at: string;
}

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<UserSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ user: UserSub; action: 'grant' | 'revoke' | 'extend' | 'lifetime' } | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('id, username, full_name, pro_status, pro_until, role, created_at').order('pro_status', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doAction = async () => {
    if (!modal) return;
    setSaving(true);
    const { user, action } = modal;
    let updates: any = {};

    if (action === 'grant') {
      const until = new Date();
      until.setDate(until.getDate() + 30);
      updates = { pro_status: true, pro_until: until.toISOString() };
    } else if (action === 'revoke') {
      updates = { pro_status: false, pro_until: null };
    } else if (action === 'extend') {
      const base = user.pro_until ? new Date(user.pro_until) : new Date();
      base.setDate(base.getDate() + extendDays);
      updates = { pro_status: true, pro_until: base.toISOString() };
    } else if (action === 'lifetime') {
      updates = { pro_status: true, pro_until: null };
    }

    await supabase.from('profiles').update(updates).eq('id', user.id);
    // Log subscription
    if (action !== 'revoke') {
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan: action === 'lifetime' ? 'lifetime' : 'pro',
        status: 'active',
        expires_at: updates.pro_until,
      });
    }
    await load();
    setSaving(false);
    setModal(null);
  };

  const proCount = users.filter(u => u.pro_status).length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Pro Subscriptions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage user Pro access • {proCount} active Pro users</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Banner */}
      <div className="glass rounded-2xl p-5 mb-6 border border-[#007AFF]/20 bg-[#007AFF]/5 flex items-start gap-4">
        <Crown size={20} className="text-[#007AFF] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-white">Groundwork Pro — Internal Management</p>
          <p className="text-xs text-gray-400 mt-1">Pro subscriptions are currently managed manually. The public Pro tier is unreleased. Use this panel to grant test or internal access.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-800/40 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="glass rounded-2xl overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-800/50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
            </div>
            {users.map(user => (
              <div key={user.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {(user.full_name || user.username || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.full_name || user.username || 'Anonymous'}</p>
                  <p className="text-xs text-gray-600">@{user.username || user.id.slice(0, 8)}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${user.pro_status ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' : 'bg-gray-700/40 text-gray-500 border-gray-700'}`}>
                {user.pro_status && <Star size={9} />}
                {user.pro_status ? 'PRO' : 'FREE'}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                {user.pro_until ? (
                  <><Clock size={11} />{new Date(user.pro_until).toLocaleDateString()}</>
                ) : user.pro_status ? (
                  <span className="text-yellow-400 font-semibold">Lifetime</span>
                ) : '—'}
              </span>
              <div className="flex items-center gap-1">
                {!user.pro_status ? (
                  <button onClick={() => setModal({ user, action: 'grant' })} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors">Grant Pro</button>
                ) : (
                  <>
                    <button onClick={() => setModal({ user, action: 'extend' })} className="px-3 py-1.5 rounded-lg bg-[#007AFF]/15 text-[#007AFF] hover:bg-[#007AFF]/25 text-xs font-semibold transition-colors">Extend</button>
                    <button onClick={() => setModal({ user, action: 'revoke' })} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-semibold transition-colors">Revoke</button>
                  </>
                )}
                <button onClick={() => setModal({ user, action: 'lifetime' })} className="px-3 py-1.5 rounded-lg bg-yellow-400/15 text-yellow-400 hover:bg-yellow-400/25 text-xs font-semibold transition-colors" title="Grant Lifetime">∞</button>
              </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-2">
              {modal.action === 'grant' && 'Grant Pro Access'}
              {modal.action === 'revoke' && 'Revoke Pro Access'}
              {modal.action === 'extend' && 'Extend Subscription'}
              {modal.action === 'lifetime' && 'Grant Lifetime Pro'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {modal.action === 'grant' && `Grant 30-day Pro access to ${modal.user.full_name || modal.user.username}?`}
              {modal.action === 'revoke' && `Remove Pro access from ${modal.user.full_name || modal.user.username}?`}
              {modal.action === 'lifetime' && `Grant lifetime Pro to ${modal.user.full_name || modal.user.username}?`}
              {modal.action === 'extend' && `Extend subscription for ${modal.user.full_name || modal.user.username}.`}
            </p>
            {modal.action === 'extend' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Days to add</label>
                <input type="number" value={extendDays} onChange={e => setExtendDays(Number(e.target.value))} min={1} max={3650} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#007AFF]" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700">Cancel</button>
              <button onClick={doAction} disabled={saving} className="flex-1 py-2.5 rounded-xl btn-accent text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
