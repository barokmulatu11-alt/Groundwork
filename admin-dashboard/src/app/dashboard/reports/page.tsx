'use client';
import { useEffect, useState } from 'react';
import { supabase, Report } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

export default function ReportsPage() {
  const { isDark } = useTheme();
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
    bug: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    suggestion: 'bg-[#0066FF]/15 text-[#0066FF] border-[#0066FF]/30',
    problem: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-400/15 text-amber-500 border-amber-400/30',
    resolved: 'bg-emerald-400/15 text-emerald-500 border-emerald-400/30',
    dismissed: isDark ? 'bg-white/5 text-[#787571] border-white/10' : 'bg-black/5 text-[#8E8C87] border-black/10',
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
          <h1 className={clsx("text-2xl font-black tracking-tight transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>Reports</h1>
          <p className={clsx("text-sm mt-1 font-medium transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>Bugs, crashes, and suggestions from users</p>
        </div>
        <button onClick={load} className={clsx("flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border w-full md:w-auto", isDark ? "bg-[#0A0A0C] border-white/10 text-[#A3A099] hover:text-[#F5F2EB] hover:border-white/20" : "bg-white border-black/8 text-[#686662] hover:text-[#141312] shadow-sm")}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-amber-500', bg: 'bg-amber-400/10 border-amber-400/20' },
          { label: 'Resolved', count: counts.resolved, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
          { label: 'Dismissed', count: counts.dismissed, color: isDark ? 'text-[#787571]' : 'text-[#8E8C87]', bg: isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={clsx("rounded-2xl p-4 border backdrop-blur-xl transition-all", isDark ? "bg-[#0A0A0C]/80" : "bg-white shadow-sm", bg)}>
            <p className={clsx("text-2xl font-black tracking-tight", color)}>{count}</p>
            <p className={clsx("text-xs mt-0.5 font-bold uppercase tracking-wider", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={clsx(
        "rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 border backdrop-blur-xl transition-all",
        isDark ? "bg-[#0A0A0C]/80 border-white/10" : "bg-white border-black/8 shadow-sm"
      )}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={clsx("rounded-xl px-3 py-2.5 text-xs font-bold outline-none border transition-colors", isDark ? "bg-[#0A0A0C] border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-white border-black/10 text-[#141312] focus:border-[#0066FF]")}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={clsx("rounded-xl px-3 py-2.5 text-xs font-bold outline-none border transition-colors", isDark ? "bg-[#0A0A0C] border-white/10 text-[#F5F2EB] focus:border-[#0066FF]" : "bg-white border-black/10 text-[#141312] focus:border-[#0066FF]")}>
          <option value="all">All Types</option>
          <option value="bug">Bug</option>
          <option value="suggestion">Suggestion</option>
          <option value="problem">Problem</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className={clsx("h-24 rounded-2xl animate-pulse", isDark ? "bg-white/5" : "bg-black/5")} />)}</div>
      ) : filtered.length === 0 ? (
        <div className={clsx("text-center py-16 font-medium", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
          <p>No reports match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className={clsx(
              "rounded-2xl p-5 border backdrop-blur-xl transition-all shadow-sm",
              isDark ? "bg-[#0A0A0C]/80 border-white/10" : "bg-white border-black/8"
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider", typeColors[report.type])}>{report.type}</span>
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border capitalize tracking-wider", statusColors[report.status])}>{report.status}</span>
                    <span className={clsx("text-[10px] font-semibold", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={clsx("text-sm font-bold transition-colors", isDark ? "text-[#F5F2EB]" : "text-[#141312]")}>{report.title}</p>
                  <p className={clsx("text-xs mt-1 leading-relaxed transition-colors", isDark ? "text-[#A3A099]" : "text-[#686662]")}>{report.description}</p>
                  {report.user_id && <p className={clsx("text-[10px] font-mono mt-2", isDark ? "text-[#787571]" : "text-[#8E8C87]")}>User: {report.user_id}</p>}
                </div>
                {report.status === 'pending' && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateStatus(report.id, 'resolved')} disabled={updating === report.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors shadow-sm">
                      <CheckCircle size={12} /> Resolve
                    </button>
                    <button onClick={() => updateStatus(report.id, 'dismissed')} disabled={updating === report.id} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors shadow-sm", isDark ? "bg-white/5 border-white/10 text-[#A3A099] hover:bg-white/10 hover:text-[#F5F2EB]" : "bg-black/5 border-black/10 text-[#686662] hover:bg-black/10 hover:text-[#141312]")}>
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
