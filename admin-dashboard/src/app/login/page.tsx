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

    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    if (!session?.user) {
      setError('Session could not be established.');
      setLoading(false);
      return;
    }

    const { data: prof, error: profError } = await (await import('@/lib/supabase')).supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profError) {
      setError(`Could not load profile: ${profError.message}`);
      setLoading(false);
      return;
    }

    if (!prof) {
      setError(
        'No profile row found for this login. In Supabase → profiles, add a row where id matches your auth user UUID and role is owner or admin.'
      );
      setLoading(false);
      return;
    }

    if (prof.is_banned === true) {
      setError('This account is banned.');
      await (await import('@/lib/supabase')).supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!isAdminRole(prof.role)) {
      setError(`This account has role "${prof.role}". Only owner or admin can access the dashboard.`);
      await (await import('@/lib/supabase')).supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const redirect = searchParams.get('redirect') || '/dashboard';
    // Full navigation so middleware receives auth cookies from @supabase/ssr browser client
    window.location.href = redirect;
  };

  return (
    <div className={clsx('min-h-screen flex items-center justify-center px-4', isDark ? 'bg-gray-950' : 'bg-slate-100')}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-baseline gap-0.5 mb-3">
            <span className="text-4xl font-black text-[#007AFF]">g</span>
            <span className={clsx('text-3xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>roundwork.</span>
          </Link>
          <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">Admin Dashboard</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h1 className={clsx('text-xl font-bold mb-1', isDark ? 'text-white' : 'text-slate-900')}>Sign in</h1>
          <p className="text-gray-400 text-sm mb-8">Admin or owner accounts only.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@groundwork.app"
                required
                className={clsx(
                  'w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/50 transition-all',
                  isDark ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-600' : 'bg-white border-slate-200 text-slate-900'
                )}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
                  'w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/50 transition-all',
                  isDark ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-600' : 'bg-white border-slate-200 text-slate-900'
                )}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          <Link href="/" className="hover:text-[#007AFF] transition-colors">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <LoginForm />
    </Suspense>
  );
}
