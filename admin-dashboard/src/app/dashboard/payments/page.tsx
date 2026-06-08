'use client';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Eye,
    RefreshCw, Search,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

type PaymentStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

interface PaymentRequest {
  id: string;
  user_id: string;
  reference_code: string;
  payment_method: string;
  plan: string;
  amount: number;
  transaction_id?: string;
  payment_note?: string;
  screenshot_url?: string;
  status: PaymentStatus;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // joined from profiles
  email?: string;
  username?: string;
  full_name?: string;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:      { label: 'Pending',      color: 'text-amber-400',  bg: 'bg-amber-400/10',  icon: Clock },
  under_review: { label: 'Under Review', color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: Eye },
  approved:     { label: 'Approved',     color: 'text-green-400',  bg: 'bg-green-400/10',  icon: CheckCircle2 },
  rejected:     { label: 'Rejected',     color: 'text-red-400',    bg: 'bg-red-400/10',    icon: XCircle },
};

const PLAN_LABELS: Record<string, string> = {
  pro_1month: 'Monthly',
  pro_1year: 'Yearly',
};

export default function PaymentsPage() {  const { isDark } = useTheme();

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('payment_requests')
      .select('*, profiles(email, username, full_name)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setRequests(data.map((r: any) => ({
        ...r,
        email: r.profiles?.email,
        username: r.profiles?.username,
        full_name: r.profiles?.full_name,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [statusFilter]);

  const handleMarkUnderReview = async (req: PaymentRequest) => {
    setActionLoading(true);
    await supabase.from('payment_requests').update({
      status: 'under_review',
      updated_at: new Date().toISOString(),
    }).eq('id', req.id);
    await loadRequests();
    setSelected(prev => prev ? { ...prev, status: 'under_review' } : null);
    setActionLoading(false);
  };

  const handleApprove = async (req: PaymentRequest) => {
    setActionLoading(true);
    const now = new Date().toISOString();
    // 1. Update payment request
    await supabase.from('payment_requests').update({
      status: 'approved',
      reviewed_at: now,
      updated_at: now,
    }).eq('id', req.id);
    // 2. Activate Pro on user profile
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (req.plan === 'pro_1year' ? 365 : 30));
    await supabase.from('profiles').update({
      pro_status: true,
      pro_until: expiry.toISOString(),
      subscription_type: `manual_${req.payment_method}`,
      activation_date: now,
      expiration_date: expiry.toISOString(),
      latest_payment_request_id: req.id,
    }).eq('id', req.user_id);
    await loadRequests();
    setSelected(prev => prev ? { ...prev, status: 'approved' } : null);
    setActionLoading(false);
  };

  const handleReject = async (req: PaymentRequest) => {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    const now = new Date().toISOString();
    await supabase.from('payment_requests').update({
      status: 'rejected',
      rejection_reason: rejectionReason.trim(),
      reviewed_at: now,
      updated_at: now,
    }).eq('id', req.id);
    await loadRequests();
    setSelected(prev => prev ? { ...prev, status: 'rejected', rejection_reason: rejectionReason } : null);
    setShowRejectForm(false);
    setRejectionReason('');
    setActionLoading(false);
  };

  const filtered = requests.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.reference_code.toLowerCase().includes(s) ||
      r.transaction_id?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.username?.toLowerCase().includes(s)
    );
  });

  const card = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const sub = isDark ? 'text-gray-400' : 'text-slate-500';
  const inputCls = clsx('w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]/40',
    isDark ? 'bg-white/5 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={clsx('text-2xl font-bold', text)}>Payment Requests</h1>
          <p className={clsx('text-sm mt-0.5', sub)}>Review and approve Pro upgrade requests</p>
        </div>
        <button onClick={loadRequests} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
          isDark ? 'border-gray-700 text-gray-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'under_review', 'approved', 'rejected', 'all'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx('px-4 py-1.5 rounded-full text-sm font-semibold border transition-all',
              statusFilter === s
                ? 'bg-[#007AFF] border-[#007AFF] text-white'
                : isDark ? 'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            )}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2', sub)} />
        <input className={clsx(inputCls, 'pl-9')} placeholder="Search by reference, transaction ID, user..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className={clsx('rounded-xl border overflow-hidden', card)}>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={20} className="animate-spin mx-auto text-[#007AFF]" />
            <p className={clsx('text-sm mt-3', sub)}>Loading requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle size={32} className={clsx('mx-auto mb-3', sub)} />
            <p className={clsx('font-medium', text)}>No requests found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className={clsx('border-b', isDark ? 'border-gray-800 bg-white/3' : 'border-slate-100 bg-slate-50')}>
              <tr>
                {['Reference', 'User', 'Method', 'Plan', 'Amount', 'Status', 'Date', ''].map(h => (
                  <th key={h} className={clsx('px-4 py-3 text-left text-xs font-bold uppercase tracking-wider', sub)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {filtered.map(req => {
                const cfg = STATUS_CONFIG[req.status];
                const Icon = cfg.icon;
                return (
                  <tr key={req.id} className={clsx('transition-colors cursor-pointer',
                    isDark ? 'hover:bg-white/3' : 'hover:bg-slate-50')}
                    onClick={() => { setSelected(req); setShowRejectForm(false); setRejectionReason(''); }}>
                    <td className="px-4 py-3">
                      <span className={clsx('font-mono font-bold text-xs', text)}>{req.reference_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={clsx('font-medium', text)}>{req.full_name || req.username || '—'}</p>
                      <p className={clsx('text-xs', sub)}>{req.email}</p>
                    </td>
                    <td className={clsx('px-4 py-3 font-medium capitalize', text)}>{req.payment_method}</td>
                    <td className={clsx('px-4 py-3', text)}>{PLAN_LABELS[req.plan] ?? req.plan}</td>
                    <td className={clsx('px-4 py-3 font-bold', text)}>ETB {Number(req.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.color, cfg.bg)}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td className={clsx('px-4 py-3 text-xs', sub)}>
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-[#007AFF] hover:underline text-xs font-medium"
                        onClick={e => { e.stopPropagation(); setSelected(req); setShowRejectForm(false); }}>
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className={clsx('fixed inset-y-0 right-0 w-full max-w-xl shadow-2xl border-l z-50 overflow-y-auto flex flex-col',
          isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-200')}>
          <div className={clsx('flex items-center justify-between px-6 py-4 border-b sticky top-0',
            isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-200')}>
            <div>
              <h2 className={clsx('font-bold text-lg', text)}>Payment Request</h2>
              <p className={clsx('text-xs font-mono', sub)}>{selected.reference_code}</p>
            </div>
            <button onClick={() => setSelected(null)} className={clsx('p-2 rounded-lg', isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500')}>
              <XCircle size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1">
            {/* Status badge */}
            {(() => { const cfg = STATUS_CONFIG[selected.status]; const Icon = cfg.icon; return (
              <div className={clsx('flex items-center gap-2 px-4 py-3 rounded-xl font-semibold', cfg.color, cfg.bg)}>
                <Icon size={16} /> {cfg.label}
              </div>
            ); })()}

            {/* User */}
            <Section title="User" isDark={isDark}>
              <Row label="Name" value={selected.full_name || selected.username || '—'} isDark={isDark} />
              <Row label="Email" value={selected.email || '—'} isDark={isDark} />
              <Row label="User ID" value={selected.user_id} mono isDark={isDark} />
            </Section>

            {/* Payment */}
            <Section title="Payment Details" isDark={isDark}>
              <Row label="Method" value={selected.payment_method} isDark={isDark} />
              <Row label="Plan" value={PLAN_LABELS[selected.plan] ?? selected.plan} isDark={isDark} />
              <Row label="Amount" value={`ETB ${Number(selected.amount).toFixed(2)}`} isDark={isDark} bold />
              <Row label="Reference Code" value={selected.reference_code} mono isDark={isDark} />
              {selected.transaction_id && <Row label="Transaction ID" value={selected.transaction_id} mono isDark={isDark} />}
              {selected.payment_note && <Row label="Note" value={selected.payment_note} isDark={isDark} />}
              <Row label="Submitted" value={new Date(selected.created_at).toLocaleString()} isDark={isDark} />
            </Section>

            {/* Screenshot */}
            {selected.screenshot_url && (
              <Section title="Payment Screenshot" isDark={isDark}>
                <a href={selected.screenshot_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-[#007AFF] text-sm font-medium hover:underline">
                  <ExternalLink size={14} /> View screenshot
                </a>
              </Section>
            )}

            {/* Rejection reason if rejected */}
            {selected.status === 'rejected' && selected.rejection_reason && (
              <Section title="Rejection Reason" isDark={isDark}>
                <p className={clsx('text-sm', isDark ? 'text-red-400' : 'text-red-600')}>{selected.rejection_reason}</p>
              </Section>
            )}

            {/* Actions */}
            {(selected.status === 'pending' || selected.status === 'under_review') && (
              <Section title="Actions" isDark={isDark}>
                <div className="space-y-3">
                  {selected.status === 'pending' && (
                    <button onClick={() => handleMarkUnderReview(selected)} disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                      <Eye size={14} /> Mark Under Review
                    </button>
                  )}
                  <button onClick={() => handleApprove(selected)} disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                    <CheckCircle2 size={14} /> {actionLoading ? 'Processing...' : 'Approve & Activate Pro'}
                  </button>
                  {!showRejectForm ? (
                    <button onClick={() => setShowRejectForm(true)} disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50">
                      <XCircle size={14} /> Reject
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        className={clsx('w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none',
                          isDark ? 'bg-white/5 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-slate-300 text-slate-900')}
                        rows={3} placeholder="Rejection reason (required)"
                        value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(selected)} disabled={!rejectionReason.trim() || actionLoading}
                          className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                          {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                        <button onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                          className={clsx('px-4 py-2 rounded-lg border text-sm font-semibold',
                            isDark ? 'border-gray-700 text-gray-400' : 'border-slate-200 text-slate-500')}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
      )}
    </div>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div>
      <p className={clsx('text-xs font-bold uppercase tracking-wider mb-2', isDark ? 'text-gray-500' : 'text-slate-400')}>{title}</p>
      <div className={clsx('rounded-xl border overflow-hidden', isDark ? 'border-gray-800' : 'border-slate-200')}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono, bold, isDark }: { label: string; value: string; mono?: boolean; bold?: boolean; isDark: boolean }) {
  return (
    <div className={clsx('flex justify-between items-center px-4 py-2.5 border-b last:border-0 gap-4',
      isDark ? 'border-gray-800/50' : 'border-slate-100')}>
      <span className={clsx('text-xs shrink-0', isDark ? 'text-gray-500' : 'text-slate-400')}>{label}</span>
      <span className={clsx('text-sm text-right break-all',
        bold ? 'font-bold text-[#007AFF]' : isDark ? 'text-gray-200' : 'text-slate-800',
        mono ? 'font-mono text-xs' : 'font-medium')}>{value}</span>
    </div>
  );
}


