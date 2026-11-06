'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/ThemeContext';
import { isAdminRole } from '@/lib/admin-actions';
import clsx from 'clsx';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, profile, profileReady, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark } = useTheme();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'unauthorized') {
      setError('You do not have admin access. Contact an owner if you need access.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (profileReady && user && profile && isAdminRole(profile.role)) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.replace(redirect);
    }
  }, [profileReady, user, profile, router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    const redirect = searchParams.get('redirect') || '/dashboard';
    window.location.href = redirect;
  };

  return (
    <div className={clsx('min-h-screen flex items-center justify-center px-4', isDark ? 'bg-[#000000] text-[#F5F2EB]' : 'bg-[#FAF9F6] text-[#141312]')}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0066FF]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-baseline gap-0.5 mb-2">
            <span className="text-4xl font-black text-[#0066FF]">g</span>
            <span className={clsx('text-3xl font-black', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>roundwork.</span>
          </Link>
          <p className={clsx('text-xs font-mono tracking-widest uppercase font-bold', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
            Barok Labs · Admin Access
          </p>
        </div>

        <div className={clsx('glass rounded-3xl p-8 shadow-2xl border', isDark ? 'border-white/10 bg-[#0A0A0C]/80' : 'border-black/8 bg-white')}>
          <h1 className={clsx('text-xl font-bold mb-1', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>Sign in</h1>
          <p className={clsx('text-xs mb-6 font-medium', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
            Administrative console for Groundwork
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className={clsx('block text-[11px] font-bold uppercase tracking-wider mb-1.5', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@groundwork.app"
                required
                className={clsx(
                  'w-full border rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30 transition-all',
                  isDark ? 'bg-black/40 border-white/10 text-[#F5F2EB] placeholder-[#787571]' : 'bg-slate-50 border-black/10 text-[#141312]'
                )}
              />
            </div>

            <div>
              <label htmlFor="password" className={clsx('block text-[11px] font-bold uppercase tracking-wider mb-1.5', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={clsx(
                  'w-full border rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30 transition-all',
                  isDark ? 'bg-black/40 border-white/10 text-[#F5F2EB] placeholder-[#787571]' : 'bg-slate-50 border-black/10 text-[#141312]'
                )}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052cc] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              {loading ? 'Authenticating…' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6">
          <Link href="/" className={clsx('hover:text-[#0066FF] transition-colors font-medium', isDark ? 'text-[#787571]' : 'text-[#8E8C87]')}>
            ← Back to Barok Labs
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#000000]" />}>
      <LoginForm />
    </Suspense>
  );
}
