'use client';

import Link from 'next/link';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import { Moon, Sun, Sparkles } from 'lucide-react';

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
      'text-sm font-semibold transition-colors',
      active === key
        ? 'text-[#0066FF]'
        : isDark
        ? 'text-[#A3A099] hover:text-[#F5F2EB]'
        : 'text-[#686662] hover:text-[#0066FF]'
    );

  return (
    <div
      className={clsx(
        'min-h-screen font-sans transition-colors duration-500 selection:bg-[#0066FF]/25',
        isDark ? 'bg-[#000000] text-[#F5F2EB]' : 'bg-[#FAF9F6] text-[#141312]'
      )}
    >
      {/* Ambient background glow effects */}
      {isDark ? (
        <>
          <div className="fixed top-[-10%] right-[-5%] w-[min(540px,90vw)] h-[min(540px,90vw)] bg-[#0066FF]/14 blur-[120px] rounded-full pointer-events-none" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[min(460px,80vw)] h-[min(460px,80vw)] bg-violet-600/10 blur-[110px] rounded-full pointer-events-none" />
          <div className="fixed top-[40%] left-[20%] w-[min(380px,70vw)] h-[min(380px,70vw)] bg-[#0066FF]/6 blur-[140px] rounded-full pointer-events-none" />
        </>
      ) : (
        <>
          <div className="fixed top-[-10%] right-[-5%] w-[min(500px,90vw)] h-[min(500px,90vw)] bg-[#0066FF]/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[min(400px,80vw)] h-[min(400px,80vw)] bg-amber-500/5 blur-[90px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Navigation Header */}
      <nav className="relative z-20 flex items-center justify-between px-5 md:px-10 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl md:text-3xl font-black text-[#0066FF]">g</span>
            <span
              className={clsx(
                'text-2xl md:text-3xl font-black tracking-tighter transition-colors',
                isDark ? 'text-[#F5F2EB]' : 'text-[#141312]'
              )}
            >
              roundwork.
            </span>
          </div>
          <span
            className={clsx(
              'hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border tracking-widest font-bold',
              isDark ? 'border-white/10 text-[#A3A099] bg-white/5' : 'border-black/5 text-[#686662] bg-black/5'
            )}
          >
            by Barok Labs
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/help" className={linkClass('help')}>
              Help
            </Link>
            <Link href="/privacy" className={linkClass('privacy')}>
              Privacy
            </Link>
            <Link href="/terms" className={linkClass('terms')}>
              Terms
            </Link>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={clsx(
              'p-2.5 rounded-xl border transition-all shadow-sm',
              isDark
                ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10'
                : 'bg-white border-black/8 text-amber-600 hover:bg-slate-50'
            )}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link
            href="/login"
            className={clsx(
              'px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm',
              isDark
                ? 'bg-white/5 border border-white/10 text-[#F5F2EB] hover:bg-white/10'
                : 'bg-[#141312] text-[#FAF9F6] hover:bg-black'
            )}
          >
            Admin Panel
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10">{children}</main>

      {/* Global Website Footer */}
      <footer
        className={clsx(
          'relative z-10 border-t mt-20 transition-colors',
          isDark ? 'border-white/10 bg-black/40 backdrop-blur-md' : 'border-black/8 bg-white/80 backdrop-blur-md'
        )}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-1">
              <span className="text-2xl font-black text-[#0066FF]">g</span>
              <span className={clsx('text-2xl font-black', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                roundwork.
              </span>
            </div>
            <p className={clsx('text-sm mt-1 font-medium', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              Crafted with focus by <strong className="text-[#0066FF]">Barok Labs</strong>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/help" className={linkClass('help')}>
              Help Center
            </Link>
            <Link href="/privacy" className={linkClass('privacy')}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={linkClass('terms')}>
              Terms of Service
            </Link>
            <Link href="/login" className={linkClass('home')}>
              Admin Login
            </Link>
          </div>

          <p className={clsx('text-xs uppercase tracking-widest font-mono', isDark ? 'text-[#787571]' : 'text-[#8E8C87]')}>
            © 2026 Barok Labs · Groundwork
          </p>
        </div>
      </footer>
    </div>
  );
}
