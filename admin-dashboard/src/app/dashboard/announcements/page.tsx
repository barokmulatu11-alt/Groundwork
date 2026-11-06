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
    info: 'bg-[#0066FF]/15 text-[#0066FF] border-[#0066FF]/30',
    warning: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
    maintenance: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={clsx("text-2xl font-black tracking-tight transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>Announcements</h1>
          <p className={clsx("text-sm mt-1 font-medium transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>Broadcast messages to all app users</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button onClick={() => setModal({ mode: 'add', data: { ...emptyForm } })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold shadow-md hover:bg-[#0055dd] transition-all">
            <Plus size={14} /> New Announcement
          </button>
          <button onClick={load} className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border", isDark ? "bg-[#0A0A0C] border-white/10 text-[#A3A099] hover:text-[#F5F2EB] hover:border-white/20" : "bg-white border-black/8 text-[#686662] hover:text-[#141312] shadow-sm")}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className={clsx("h-24 rounded-2xl animate-pulse", isDark ? "bg-white/5" : "bg-black/5")} />)}</div>
      ) : items.length === 0 ? (
        <div className={clsx("text-center py-16 font-medium", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>
          <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
          <p>No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className={clsx(
              "rounded-2xl p-5 border-l-4 border backdrop-blur-xl transition-all shadow-sm",
              item.is_active ? 'border-l-[#0066FF]' : 'border-l-zinc-600 opacity-60',
              isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-white border-black/8'
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider", typeColors[item.type])}>{item.type}</span>
                    {!item.is_active && <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider", isDark ? "bg-white/5 text-[#787571] border-white/10" : "bg-black/5 text-[#8E8C87] border-black/10")}>Inactive</span>}
                  </div>
                  <p className={clsx("text-base font-bold transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{item.title}</p>
                  <p className={clsx("text-xs mt-1 line-clamp-2 leading-relaxed transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>{item.message}</p>
                  <p className={clsx("text-[10px] mt-2 font-semibold", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggle(item)} className={clsx("p-2 rounded-lg transition-colors", item.is_active ? 'hover:bg-amber-500/10 text-[#787571] hover:text-amber-500' : 'hover:bg-emerald-500/10 text-[#787571] hover:text-emerald-500')} title={item.is_active ? 'Deactivate' : 'Activate'}>
                    {item.is_active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                  </button>
                  <button onClick={() => setModal({ mode: 'edit', data: { title: item.title, message: item.message, type: item.type, is_active: item.is_active, expires_at: item.expires_at || '' }, id: item.id })} className="p-2 rounded-lg hover:bg-[#0066FF]/10 text-[#787571] hover:text-[#0066FF] transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => remove(item.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-[#787571] hover:text-rose-500 transition-colors">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={clsx("rounded-[28px] p-6 w-full max-w-lg shadow-2xl border backdrop-blur-2xl", isDark ? "bg-[#0A0A0C] border-white/10" : "bg-white border-black/10")}>
            <h3 className={clsx("text-base font-black tracking-tight mb-5 transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{modal.mode === 'add' ? 'New Announcement' : 'Edit Announcement'}</h3>
            <div className="space-y-4">
              <div>
                <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Title</label>
                <input 
                  value={modal.data.title} 
                  onChange={e => setModal(m => m ? { ...m, data: { ...m.data, title: e.target.value } } : null)} 
                  placeholder="Announcement title" 
                  className={clsx(
                    "w-full rounded-xl px-4 py-2.5 text-xs outline-none transition-all border",
                    isDark ? "bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]"
                  )}
                />
              </div>
              <div>
                <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Message</label>
                <textarea 
                  value={modal.data.message} 
                  onChange={e => setModal(m => m ? { ...m, data: { ...m.data, message: e.target.value } } : null)} 
                  placeholder="Full announcement text..." 
                  rows={4} 
                  className={clsx(
                    "w-full rounded-xl px-4 py-2.5 text-xs outline-none transition-all resize-none border",
                    isDark ? "bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]"
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Type</label>
                  <select 
                    value={modal.data.type} 
                    onChange={e => setModal(m => m ? { ...m, data: { ...m.data, type: e.target.value as any } } : null)} 
                    className={clsx("w-full rounded-xl px-3 py-2.5 text-xs outline-none transition-all font-bold border", isDark ? "bg-[#0A0A0C] border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-white border-black/10 text-[#141312] focus:border-[#0066FF]")}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Status</label>
                  <select 
                    value={modal.data.is_active ? 'active' : 'inactive'} 
                    onChange={e => setModal(m => m ? { ...m, data: { ...m.data, is_active: e.target.value === 'active' } } : null)} 
                    className={clsx("w-full rounded-xl px-3 py-2.5 text-xs outline-none transition-all font-bold border", isDark ? "bg-[#0A0A0C] border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-white border-black/10 text-[#141312] focus:border-[#0066FF]")}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModal(null)} className={clsx("flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-white/5 border-white/10 text-[#A3A099] hover:bg-white/10 hover:text-[#F5F2EB]" : "bg-black/5 border-black/10 text-[#686662] hover:bg-black/10 hover:text-[#141312]")}>Cancel</button>
              <button 
                onClick={save} 
                disabled={saving || !modal.data.title.trim()} 
                className="flex-1 py-2.5 rounded-xl bg-[#0066FF] text-white text-xs font-black shadow-md hover:bg-[#0055dd] disabled:opacity-50 transition-all"
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
