'use client';
import { useEffect, useState } from 'react';
import { supabase, Announcement } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Megaphone, Plus, Trash2, RefreshCw, Edit2, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

const emptyForm = { title: '', message: '', type: 'info' as 'info' | 'warning' | 'maintenance', is_active: true, expires_at: '' };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data: typeof emptyForm; id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { isDark } = useTheme();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    const payload = {
      title: modal.data.title,
      message: modal.data.message,
      type: modal.data.type,
      is_active: modal.data.is_active,
      expires_at: modal.data.expires_at || null,
    };
    if (modal.mode === 'add') {
      await supabase.from('announcements').insert(payload);
    } else {
      await supabase.from('announcements').update(payload).eq('id', modal.id!);
    }
    setSaving(false);
    setModal(null);
    await load();
  };

  const toggle = async (item: Announcement) => {
    await supabase.from('announcements').update({ is_active: !item.is_active }).eq('id', item.id);
    setItems(prev => prev.map(a => a.id === item.id ? { ...a, is_active: !a.is_active } : a));
  };

  const remove = async (id: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    await supabase.from('announcements').delete().eq('id', id);
    setItems(prev => prev.filter(a => a.id !== id));
  };

  const typeColors: Record<string, string> = {
    info: 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
    warning: 'bg-orange-400/15 text-orange-400 border-orange-400/30',
    maintenance: 'bg-red-400/15 text-red-400 border-red-400/30',
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={clsx("text-2xl font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>Announcements</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Broadcast messages to all app users</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={() => setModal({ mode: 'add', data: { ...emptyForm } })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-bold shadow-lg hover:bg-[#0066dd] transition-all">
            <Plus size={14} /> New Announcement
          </button>
          <button onClick={load} className={clsx("px-4 py-2 rounded-xl text-sm transition-all shadow-sm", isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className={clsx("h-24 rounded-2xl animate-pulse", isDark ? "bg-gray-800/40" : "bg-slate-100")} />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
          <p>No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className={clsx("glass rounded-2xl p-5 border-l-4 transition-all shadow-sm", item.is_active ? 'border-l-[#007AFF]' : 'border-l-gray-500 opacity-60', !isDark && !item.is_active && 'bg-slate-50')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider", typeColors[item.type])}>{item.type}</span>
                    {!item.is_active && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 uppercase tracking-wider">Inactive</span>}
                  </div>
                  <p className={clsx("text-base font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>{item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">{item.message}</p>
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">{new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggle(item)} className={clsx("p-2 rounded-lg transition-colors", item.is_active ? 'hover:bg-orange-500/10 text-gray-400 hover:text-orange-500' : 'hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-500')} title={item.is_active ? 'Deactivate' : 'Activate'}>
                    {item.is_active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                  </button>
                  <button onClick={() => setModal({ mode: 'edit', data: { title: item.title, message: item.message, type: item.type, is_active: item.is_active, expires_at: item.expires_at || '' }, id: item.id })} className="p-2 rounded-lg hover:bg-[#007AFF]/10 text-gray-400 hover:text-[#007AFF] transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => remove(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={clsx("glass rounded-2xl p-6 w-full max-w-lg shadow-2xl border", isDark ? "border-white/10" : "border-slate-200")}>
            <h3 className={clsx("text-base font-bold mb-5 transition-colors", isDark ? "text-white" : "text-slate-900")}>{modal.mode === 'add' ? 'New Announcement' : 'Edit Announcement'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Title</label>
                <input 
                  value={modal.data.title} 
                  onChange={e => setModal(m => m ? { ...m, data: { ...m.data, title: e.target.value } } : null)} 
                  placeholder="Announcement title" 
                  className={clsx(
                    "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all",
                    isDark ? "bg-gray-900 border border-gray-800 text-white focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-900 focus:border-[#007AFF]"
                  )}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Message</label>
                <textarea 
                  value={modal.data.message} 
                  onChange={e => setModal(m => m ? { ...m, data: { ...m.data, message: e.target.value } } : null)} 
                  placeholder="Full announcement text..." 
                  rows={4} 
                  className={clsx(
                    "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none",
                    isDark ? "bg-gray-900 border border-gray-800 text-white focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-900 focus:border-[#007AFF]"
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Type</label>
                  <select 
                    value={modal.data.type} 
                    onChange={e => setModal(m => m ? { ...m, data: { ...m.data, type: e.target.value as any } } : null)} 
                    className={clsx("w-full rounded-xl px-3 py-3 text-sm outline-none transition-all", isDark ? "bg-gray-900 border border-gray-800 text-gray-300 focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-600 focus:border-[#007AFF]")}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Status</label>
                  <select 
                    value={modal.data.is_active ? 'active' : 'inactive'} 
                    onChange={e => setModal(m => m ? { ...m, data: { ...m.data, is_active: e.target.value === 'active' } } : null)} 
                    className={clsx("w-full rounded-xl px-3 py-3 text-sm outline-none transition-all", isDark ? "bg-gray-900 border border-gray-800 text-gray-300 focus:border-[#007AFF]" : "bg-white border border-slate-200 text-slate-600 focus:border-[#007AFF]")}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModal(null)} className={clsx("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors", isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Cancel</button>
              <button 
                onClick={save} 
                disabled={saving || !modal.data.title.trim()} 
                className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white text-sm font-black shadow-lg hover:bg-[#0066dd] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
