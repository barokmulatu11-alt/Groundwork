'use client';
import { useEffect, useState } from 'react';
import { supabase, RemoteConfig } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Settings, RefreshCw, Save, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const defaultConfigs = [
  { key: 'max_tasks_per_day', value: 50, description: 'Max tasks a user can create per day' },
  { key: 'max_habits', value: 20, description: 'Max habits per user' },
  { key: 'maintenance_mode', value: false, description: 'Enable app-wide maintenance mode' },
  { key: 'app_version_min', value: '1.0.0', description: 'Minimum supported app version' },
  { key: 'pro_features_enabled', value: false, description: 'Master switch for all Pro features' },
  { key: 'focus_timer_max_minutes', value: 120, description: 'Maximum focus session duration (minutes)' },
];

export default function RemoteConfigPage() {
  const { isDark } = useTheme();
  const [configs, setConfigs] = useState<RemoteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('remote_config').select('*').order('key');
    setConfigs(data ?? []);
    const initial: Record<string, string> = {};
    data?.forEach((c: RemoteConfig) => { initial[c.key] = JSON.stringify(c.value); });
    setEdits(initial);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    for (const cfg of defaultConfigs) {
      await supabase.from('remote_config').upsert({ key: cfg.key, value: cfg.value, description: cfg.description, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    await load();
  };

  const saveConfig = async (key: string) => {
    setSaving(key);
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(edits[key]);
    } catch {
      parsedValue = edits[key]; // treat as string
    }
    await supabase.from('remote_config').update({ value: parsedValue, updated_at: new Date().toISOString() }).eq('key', key);
    setSaving(null);
    await load();
  };

  const addConfig = async () => {
    if (!newKey.trim()) return;
    setAdding(true);
    let parsedValue: any;
    try { parsedValue = JSON.parse(newValue); } catch { parsedValue = newValue; }
    await supabase.from('remote_config').upsert({ key: newKey.trim(), value: parsedValue, description: newDesc.trim(), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setNewKey(''); setNewValue(''); setNewDesc('');
    setShowAdd(false);
    setAdding(false);
    await load();
  };

  const deleteConfig = async (key: string) => {
    await supabase.from('remote_config').delete().eq('key', key);
    setConfigs(prev => prev.filter(c => c.key !== key));
  };

  const getValueType = (val: any): string => {
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'number') return 'number';
    return 'string';
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={clsx("text-2xl font-black tracking-tight transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>Remote Config</h1>
          <p className={clsx("text-sm mt-1 font-medium transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>Change app behavior without publishing an update</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {configs.length === 0 && !loading && (
            <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all">
              <Settings size={14} /> Seed Defaults
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-bold shadow-md transition-all">
            <Plus size={14} /> Add Config
          </button>
          <button onClick={load} className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border", isDark ? "bg-[#0A0A0C] border-white/10 text-[#A3A099] hover:text-[#F5F2EB] hover:border-white/20" : "bg-white border-black/8 text-[#686662] hover:text-[#141312] shadow-sm")}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className={clsx("h-24 rounded-2xl animate-pulse", isDark ? "bg-white/5" : "bg-black/5")} />)}</div>
      ) : configs.length === 0 ? (
        <div className={clsx("text-center py-16 font-medium", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>
          <Settings size={32} className="mx-auto mb-3 opacity-30" />
          <p>No config values yet. Seed defaults to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(cfg => {
            const vtype = getValueType(cfg.value);
            const isDirty = edits[cfg.key] !== JSON.stringify(cfg.value);
            return (
              <div key={cfg.key} className={clsx(
                "rounded-2xl p-5 border backdrop-blur-xl transition-all shadow-sm",
                isDark ? "bg-[#0A0A0C]/80" : "bg-white border-black/8",
                isDirty ? 'border-[#0066FF]/60 shadow-lg' : isDark ? 'border-white/10' : 'border-black/8'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={clsx("text-sm font-bold font-mono transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{cfg.key}</p>
                      <span className={clsx("text-[10px] font-semibold px-1.5 py-0.5 rounded border", isDark ? "bg-white/5 border-white/10 text-[#787571]" : "bg-black/5 border-black/10 text-[#8E8C87]")}>{vtype}</span>
                    </div>
                    {cfg.description && <p className={clsx("text-xs mb-3 font-medium transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>{cfg.description}</p>}
                    {vtype === 'boolean' ? (
                      <button
                        onClick={() => {
                          const newVal = !(edits[cfg.key] === 'true');
                          setEdits(prev => ({ ...prev, [cfg.key]: String(newVal) }));
                        }}
                        className={clsx("relative w-11 h-6 rounded-full transition-colors", edits[cfg.key] === 'true' ? 'bg-[#0066FF]' : isDark ? 'bg-white/10' : 'bg-black/10')}
                      >
                        <span className={clsx("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", edits[cfg.key] === 'true' ? 'translate-x-5' : 'translate-x-0')} />
                      </button>
                    ) : (
                      <input
                        value={edits[cfg.key] ?? ''}
                        onChange={e => setEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                        className={clsx(
                          "rounded-xl px-3 py-2 text-xs font-mono w-full max-w-xs outline-none transition-colors border",
                          isDark ? "bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]"
                        )}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isDirty && (
                      <button onClick={() => saveConfig(cfg.key)} disabled={saving === cfg.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-bold shadow-md transition-all">
                        {saving === cfg.key ? '...' : <><Save size={12} /> Save</>}
                      </button>
                    )}
                    <button onClick={() => deleteConfig(cfg.key)} className={clsx("p-2 rounded-lg transition-colors", isDark ? "text-[#787571] hover:text-rose-400 hover:bg-rose-500/10" : "text-[#8E8C87] hover:text-rose-600 hover:bg-rose-500/10")}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className={clsx("text-[10px] mt-2 font-semibold", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Updated: {new Date(cfg.updated_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={clsx("rounded-[28px] p-6 w-full max-w-sm border backdrop-blur-2xl shadow-2xl", isDark ? "bg-[#0A0A0C] border-white/10" : "bg-white border-black/10")}>
            <h3 className={clsx("text-base font-black tracking-tight mb-5 transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>New Config Value</h3>
            <div className="space-y-4">
              <div>
                <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Key</label>
                <input 
                  value={newKey} 
                  onChange={e => setNewKey(e.target.value)} 
                  placeholder="e.g. max_tasks" 
                  className={clsx("w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none transition-colors border", isDark ? "bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]")} 
                />
              </div>
              <div>
                <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Value (JSON)</label>
                <input 
                  value={newValue} 
                  onChange={e => setNewValue(e.target.value)} 
                  placeholder='e.g. 50 or true or "string"' 
                  className={clsx("w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none transition-colors border", isDark ? "bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]")} 
                />
              </div>
              <div>
                <label className={clsx("text-[10px] font-black uppercase tracking-widest block mb-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>Description</label>
                <input 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  placeholder="What does this control?" 
                  className={clsx("w-full rounded-xl px-4 py-2.5 text-xs outline-none transition-colors border", isDark ? "bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]")} 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className={clsx("flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-white/5 border-white/10 text-[#A3A099] hover:bg-white/10 hover:text-[#F5F2EB]" : "bg-black/5 border-black/10 text-[#686662] hover:bg-black/10 hover:text-[#141312]")}>Cancel</button>
              <button onClick={addConfig} disabled={adding || !newKey.trim()} className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-black shadow-md disabled:opacity-50 transition-all">
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
