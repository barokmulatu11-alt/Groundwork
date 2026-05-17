'use client';
import { useEffect, useState } from 'react';
import { supabase, Report } from '@/lib/supabase';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Filter } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: 'pending' | 'resolved' | 'dismissed') => {
    setUpdating(id);
    const report = reports.find(r => r.id === id);
    
    // 1. Update report status
    await supabase.from('reports').update({ status }).eq('id', id);
    
    // 2. If resolved/dismissed and we have a user_id, send notification
    if (report && report.user_id && (status === 'resolved' || status === 'dismissed')) {
      await supabase.from('user_notifications').insert({
        user_id: report.user_id,
        title: status === 'resolved' ? 'Report Resolved' : 'Report Update',
        message: status === 'resolved' 
          ? `Good news! Your report "${report.title}" has been resolved. Thank you for your feedback!`
          : `Your report "${report.title}" has been reviewed and closed.`,
        type: status === 'resolved' ? 'success' : 'info'
      });
    }

    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setUpdating(null);
  };

  const filtered = reports
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => typeFilter === 'all' || r.type === typeFilter);

  const typeColors: Record<string, string> = {
    bug: 'bg-red-400/15 text-red-400 border-red-400/30',
    suggestion: 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
    problem: 'bg-orange-400/15 text-orange-400 border-orange-400/30',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
    resolved: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30',
    dismissed: 'bg-gray-700/40 text-gray-500 border-gray-700',
  };

  const counts = {
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Bugs, crashes, and suggestions from users</p>
        </div>
        <button onClick={load} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors w-full md:w-auto">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
          { label: 'Resolved', count: counts.resolved, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
          { label: 'Dismissed', count: counts.dismissed, color: 'text-gray-400', bg: 'bg-gray-700/30 border-gray-700/50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`glass rounded-2xl p-4 border ${bg}`}>
            <p className={`text-2xl font-black ${color}`}>{count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#007AFF]">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#007AFF]">
          <option value="all">All Types</option>
          <option value="bug">Bug</option>
          <option value="suggestion">Suggestion</option>
          <option value="problem">Problem</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-800/40 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
          <p>No reports match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${typeColors[report.type]}`}>{report.type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColors[report.status]}`}>{report.status}</span>
                    <span className="text-[10px] text-gray-600">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-bold text-white">{report.title}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{report.description}</p>
                  {report.user_id && <p className="text-[10px] text-gray-600 mt-2">User: {report.user_id}</p>}
                </div>
                {report.status === 'pending' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateStatus(report.id, 'resolved')} disabled={updating === report.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors">
                      <CheckCircle size={12} /> Resolve
                    </button>
                    <button onClick={() => updateStatus(report.id, 'dismissed')} disabled={updating === report.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 text-xs font-semibold transition-colors">
                      <XCircle size={12} /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
