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
          <h1 className={clsx('text-2xl font-black tracking-tight transition-colors', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>Feature Flags</h1>
          <p className={clsx('text-sm mt-1 font-medium transition-colors', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>Toggle features in the app without shipping an update</p>
          {error && <p className="text-rose-400 text-xs mt-2 font-medium">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {flags.length === 0 && !loading && (
            <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all">
              <Zap size={14} /> Seed Defaults
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-bold shadow-md transition-all">
            <Plus size={14} /> New Flag
          </button>
          <button onClick={load} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border', isDark ? 'bg-[#0A0A0C] border-white/10 text-[#A3A099] hover:text-[#F5F2EB] hover:border-white/20' : 'bg-white border-black/8 text-[#686662] hover:text-[#141312] shadow-sm')}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={clsx('h-20 rounded-2xl animate-pulse', isDark ? 'bg-white/5' : 'bg-black/5')} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className={clsx(
              "rounded-2xl px-6 py-4 flex items-center gap-4 border backdrop-blur-xl transition-all",
              isDark ? "bg-[#0A0A0C]/80 border-white/10" : "bg-white border-black/8 shadow-sm"
            )}>
              <div className={clsx('p-2.5 rounded-xl border', flag.is_enabled ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' : isDark ? 'bg-white/5 border-white/10 text-[#787571]' : 'bg-black/5 border-black/10 text-[#8E8C87]')}>
                <Zap size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-bold font-mono transition-colors', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>{flag.name}</p>
                <p className={clsx('text-xs mt-0.5 font-medium transition-colors', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>{flag.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(flag)}
                  disabled={toggling === flag.id}
                  className={clsx('relative w-11 h-6 rounded-full transition-colors', flag.is_enabled ? 'bg-[#0066FF]' : isDark ? 'bg-white/10' : 'bg-black/10')}
                >
                  <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', flag.is_enabled ? 'translate-x-5' : '')} />
                </button>
                <button onClick={() => deleteFlag(flag.id)} className={clsx("p-2 rounded-lg transition-colors", isDark ? "text-[#787571] hover:text-rose-400 hover:bg-rose-500/10" : "text-[#8E8C87] hover:text-rose-600 hover:bg-rose-500/10")} title="Delete Flag">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={clsx("rounded-[28px] p-6 w-full max-w-sm border backdrop-blur-2xl shadow-2xl", isDark ? "bg-[#0A0A0C] border-white/10" : "bg-white border-black/10")}>
            <h3 className={clsx('text-base font-black tracking-tight mb-4 transition-colors', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>New Feature Flag</h3>
            <input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="flag_name" 
              className={clsx('w-full border rounded-xl px-4 py-2.5 text-xs mb-3 font-mono outline-none transition-colors', isDark ? 'bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]' : 'bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]')} 
            />
            <input 
              value={newDesc} 
              onChange={(e) => setNewDesc(e.target.value)} 
              placeholder="Description" 
              className={clsx('w-full border rounded-xl px-4 py-2.5 text-xs outline-none transition-colors', isDark ? 'bg-black/50 border-white/10 text-[#F5F2EB] focus:border-[#0066FF]' : 'bg-black/[0.02] border-black/10 text-[#141312] focus:border-[#0066FF]')} 
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className={clsx('flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors border', isDark ? 'bg-white/5 border-white/10 text-[#A3A099] hover:bg-white/10 hover:text-[#F5F2EB]' : 'bg-black/5 border-black/10 text-[#686662] hover:bg-black/10 hover:text-[#141312]')}>Cancel</button>
              <button onClick={addFlag} disabled={adding} className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-black shadow-md transition-all">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
