'use client';
import Link from 'next/link';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';

export function MarketingShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: 'home' | 'help' | 'privacy' | 'terms';
}) {
  const { isDark, toggleTheme } = useTheme();

  const linkClass = (key: string) =>
    clsx(
      'text-sm font-medium transition-colors',
      active === key
        ? 'text-[#007AFF]'
        : isDark
          ? 'text-slate-400 hover:text-white'
          : 'text-slate-500 hover:text-[#007AFF]'
    );

  return (
    <div className={clsx('min-h-screen font-sans transition-colors duration-500', isDark ? 'bg-[#050508] text-white' : 'bg-slate-50 text-slate-900')}>
      {isDark && (
        <>
          <div className="fixed top-[-15%] right-[-5%] w-[min(520px,90vw)] h-[min(520px,90vw)] bg-[#007AFF]/12 blur-[100px] rounded-full pointer-events-none" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[min(400px,80vw)] h-[min(400px,80vw)] bg-violet-600/8 blur-[90px] rounded-full pointer-events-none" />
        </>
      )}

      <nav className="relative z-20 flex items-center justify-between px-5 md:px-10 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-2xl md:text-3xl font-black text-[#007AFF]">g</span>
          <span className={clsx('text-2xl md:text-3xl font-black tracking-tighter', isDark ? 'text-white' : 'text-slate-900')}>roundwork.</span>
        </Link>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/help" className={linkClass('help')}>Help</Link>
            <Link href="/privacy" className={linkClass('privacy')}>Privacy</Link>
            <Link href="/terms" className={linkClass('terms')}>Terms</Link>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={clsx(
              'p-2.5 rounded-xl border transition-all',
              isDark ? 'bg-white/5 border-white/10 text-amber-400' : 'bg-white border-slate-200 text-amber-600 shadow-sm'
            )}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href="/login"
            className={clsx(
              'px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all',
              isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-900 text-white hover:bg-slate-800'
            )}
          >
            Admin
          </Link>
        </div>
      </nav>

      <main className="relative z-10">{children}</main>

      <footer className={clsx('relative z-10 border-t mt-20', isDark ? 'border-white/5 bg-black/30' : 'border-slate-200 bg-white')}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-0.5">
              <span className="text-2xl font-black text-[#007AFF]">g</span>
              <span className={clsx('text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>roundwork.</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Developed by Barok Labs</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/help" className={linkClass('help')}>Help</Link>
            <Link href="/privacy" className={linkClass('privacy')}>Privacy</Link>
            <Link href="/terms" className={linkClass('terms')}>Terms</Link>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-widest">© 2026 Barok Labs</p>
        </div>
      </footer>
    </div>
  );
}
