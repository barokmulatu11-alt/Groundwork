'use client';
import { useEffect, useState } from 'react';
import { supabase, RemoteConfig } from '@/lib/supabase';
import { Settings, RefreshCw, Save, Plus, Trash2 } from 'lucide-react';

const defaultConfigs = [
  { key: 'max_tasks_per_day', value: 50, description: 'Max tasks a user can create per day' },
  { key: 'max_habits', value: 20, description: 'Max habits per user' },
  { key: 'maintenance_mode', value: false, description: 'Enable app-wide maintenance mode' },
  { key: 'app_version_min', value: '1.0.0', description: 'Minimum supported app version' },
  { key: 'pro_features_enabled', value: false, description: 'Master switch for all Pro features' },
  { key: 'focus_timer_max_minutes', value: 120, description: 'Maximum focus session duration (minutes)' },
];

export default function RemoteConfigPage() {
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
    data?.forEach(c => { initial[c.key] = JSON.stringify(c.value); });
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Remote Config</h1>
          <p className="text-gray-500 text-sm mt-1">Change app behavior without publishing an update</p>
        </div>
        <div className="flex gap-2">
          {configs.length === 0 && !loading && (
            <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-colors">
              <Settings size={14} /> Seed Defaults
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-accent text-white text-sm">
            <Plus size={14} /> Add Config
          </button>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-800/40 rounded-2xl animate-pulse" />)}</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Settings size={32} className="mx-auto mb-3 opacity-30" />
          <p>No config values yet. Seed defaults to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(cfg => {
            const vtype = getValueType(cfg.value);
            const isDirty = edits[cfg.key] !== JSON.stringify(cfg.value);
            return (
              <div key={cfg.key} className={`glass rounded-2xl p-5 ${isDirty ? 'border border-[#007AFF]/30' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white font-mono">{cfg.key}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{vtype}</span>
                    </div>
                    {cfg.description && <p className="text-xs text-gray-500 mb-3">{cfg.description}</p>}
                    {vtype === 'boolean' ? (
                      <button
                        onClick={() => {
                          const newVal = !(edits[cfg.key] === 'true');
                          setEdits(prev => ({ ...prev, [cfg.key]: String(newVal) }));
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${edits[cfg.key] === 'true' ? 'bg-[#007AFF]' : 'bg-gray-700'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${edits[cfg.key] === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    ) : (
                      <input
                        value={edits[cfg.key] ?? ''}
                        onChange={e => setEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                        className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono w-full focus:outline-none focus:border-[#007AFF] max-w-xs"
                      />
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {isDirty && (
                      <button onClick={() => saveConfig(cfg.key)} disabled={saving === cfg.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-white text-xs font-semibold">
                        {saving === cfg.key ? '...' : <><Save size={12} /> Save</>}
                      </button>
                    )}
                    <button onClick={() => deleteConfig(cfg.key)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-700 mt-2">Updated: {new Date(cfg.updated_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-5">New Config Value</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Key</label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. max_tasks" className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#007AFF]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Value (JSON)</label>
                <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder='e.g. 50 or true or "string"' className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#007AFF]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this control?" className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#007AFF]" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700">Cancel</button>
              <button onClick={addConfig} disabled={adding || !newKey.trim()} className="flex-1 py-2.5 rounded-xl btn-accent text-white text-sm font-semibold disabled:opacity-50">
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
