'use client';
import { useEffect, useState } from 'react';
import { supabase, FeatureFlag } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Zap, Plus, RefreshCw, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function FlagsPage() {
  const { isDark } = useTheme();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from('feature_flags').select('*').order('created_at', { ascending: false });
    if (err) setError(err.message);
    else {
      setError('');
      setFlags(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag: FeatureFlag) => {
    setToggling(flag.id);
    const { error: err } = await supabase
      .from('feature_flags')
      .update({ is_enabled: !flag.is_enabled, updated_at: new Date().toISOString() })
      .eq('id', flag.id);
    if (err) setError(err.message);
    else setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f)));
    setToggling(null);
  };

  const addFlag = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error: err } = await supabase.from('feature_flags').insert({
      name: newName.trim().toLowerCase().replace(/\s+/g, '_'),
      description: newDesc.trim(),
      is_enabled: false,
    });
    if (err) setError(err.message);
    else {
      setNewName('');
      setNewDesc('');
      setShowAdd(false);
      await load();
    }
    setAdding(false);
  };

  const deleteFlag = async (id: string) => {
    const { error: err } = await supabase.from('feature_flags').delete().eq('id', id);
    if (err) setError(err.message);
    else setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  const defaultFlags = [
    { name: 'pro_enabled', description: 'Enable Pro subscription tier' },
    { name: 'widgets_enabled', description: 'Enable Android home screen widgets' },
    { name: 'beta_features', description: 'Expose experimental UI features to users' },
    { name: 'maintenance_mode', description: 'Show maintenance notice in the app' },
    { name: 'ai_suggestions', description: 'Enable AI-powered task suggestions' },
  ];

  const seedDefaults = async () => {
    for (const f of defaultFlags) {
      await supabase.from('feature_flags').upsert({ name: f.name, description: f.description, is_enabled: false }, { onConflict: 'name' });
    }
    await load();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={clsx('text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>Feature Flags</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Toggle features in the app without shipping an update</p>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {flags.length === 0 && !loading && (
            <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30">
              <Zap size={14} /> Seed Defaults
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-accent text-white text-sm">
            <Plus size={14} /> New Flag
          </button>
          <button onClick={load} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm', isDark ? 'bg-gray-800 text-gray-300' : 'bg-white border border-slate-200 text-slate-600')}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={clsx('h-20 rounded-2xl animate-pulse', isDark ? 'bg-gray-800/40' : 'bg-slate-100')} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className="glass rounded-2xl px-6 py-4 flex items-center gap-4">
              <div className={clsx('p-2 rounded-xl', flag.is_enabled ? 'bg-emerald-400/10' : isDark ? 'bg-gray-800' : 'bg-slate-100')}>
                <Zap size={16} className={flag.is_enabled ? 'text-emerald-400' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-bold font-mono', isDark ? 'text-white' : 'text-slate-900')}>{flag.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{flag.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(flag)}
                  disabled={toggling === flag.id}
                  className={clsx('relative w-11 h-6 rounded-full transition-colors', flag.is_enabled ? 'bg-[#007AFF]' : isDark ? 'bg-gray-700' : 'bg-slate-300')}
                >
                  <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', flag.is_enabled ? 'translate-x-5' : '')} />
                </button>
                <button onClick={() => deleteFlag(flag.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className={clsx('text-base font-bold mb-5', isDark ? 'text-white' : 'text-slate-900')}>New Feature Flag</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="flag_name" className={clsx('w-full border rounded-xl px-4 py-3 text-sm mb-3 font-mono', isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200')} />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className={clsx('w-full border rounded-xl px-4 py-3 text-sm', isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200')} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className={clsx('flex-1 py-2.5 rounded-xl text-sm font-semibold', isDark ? 'bg-gray-800 text-gray-300' : 'bg-slate-100')}>Cancel</button>
              <button onClick={addFlag} disabled={adding} className="flex-1 py-2.5 rounded-xl btn-accent text-white text-sm font-semibold">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
