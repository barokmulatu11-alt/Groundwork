'use client';
import { useEffect, useState } from 'react';
import { supabase, FeatureFlag } from '@/lib/supabase';
import { Zap, Plus, RefreshCw, Trash2 } from 'lucide-react';

export default function FlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('feature_flags').select('*').order('created_at', { ascending: false });
    setFlags(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag: FeatureFlag) => {
    setToggling(flag.id);
    await supabase.from('feature_flags').update({ is_enabled: !flag.is_enabled, updated_at: new Date().toISOString() }).eq('id', flag.id);
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f));
    setToggling(null);
  };

  const addFlag = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('feature_flags').insert({ name: newName.trim().toLowerCase().replace(/\s+/g, '_'), description: newDesc.trim(), is_enabled: false });
    if (!error) {
      setNewName('');
      setNewDesc('');
      setShowAdd(false);
      await load();
    }
    setAdding(false);
  };

  const deleteFlag = async (id: string) => {
    await supabase.from('feature_flags').delete().eq('id', id);
    setFlags(prev => prev.filter(f => f.id !== id));
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Feature Flags</h1>
          <p className="text-gray-500 text-sm mt-1">Toggle features in the Android app without shipping an update</p>
        </div>
        <div className="flex gap-2">
          {flags.length === 0 && !loading && (
            <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-colors">
              <Zap size={14} />
              Seed Defaults
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-accent text-white text-sm">
            <Plus size={14} />
            New Flag
          </button>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-800/40 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map(flag => (
            <div key={flag.id} className="glass rounded-2xl px-6 py-4 flex items-center gap-4">
              <div className={`p-2 rounded-xl ${flag.is_enabled ? 'bg-emerald-400/10' : 'bg-gray-800'}`}>
                <Zap size={16} className={flag.is_enabled ? 'text-emerald-400' : 'text-gray-600'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white font-mono">{flag.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{flag.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${flag.is_enabled ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' : 'bg-gray-700/40 text-gray-500 border-gray-700'}`}>
                  {flag.is_enabled ? 'ON' : 'OFF'}
                </span>
                {/* Toggle */}
                <button
                  onClick={() => toggle(flag)}
                  disabled={toggling === flag.id}
                  className={`relative w-11 h-6 rounded-full transition-colors ${flag.is_enabled ? 'bg-[#007AFF]' : 'bg-gray-700'} ${toggling === flag.id ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${flag.is_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <button onClick={() => deleteFlag(flag.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {flags.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Zap size={32} className="mx-auto mb-3 opacity-30" />
              <p>No flags yet. Seed defaults or create your first flag.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Flag Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-5">New Feature Flag</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Flag Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. dark_mode_v2" className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#007AFF] font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description..." className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#007AFF]" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700">Cancel</button>
              <button onClick={addFlag} disabled={adding || !newName.trim()} className="flex-1 py-2.5 rounded-xl btn-accent text-white text-sm font-semibold disabled:opacity-50">
                {adding ? 'Adding...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
