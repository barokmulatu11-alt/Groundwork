'use client';
import { MarketingShell } from '@/components/MarketingShell';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import {
  Download,
  CheckCircle2,
  Target,
  Flame,
  FileText,
  Users,
  Trophy,
  Shield,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useState } from 'react';
import { PRO_FEATURE_SECTIONS, PRO_PLAN_LABEL } from '@/data/proFeatures';

const APP_VERSION = '1.2.1';
const APK_URL = 'https://github.com/barokmulatu11-alt/Groundwork/releases/download/v1.2.1/groundwork-1.2.1.apk';

const FEATURES = [
  { title: 'Smart Tasks', desc: 'Plan your day with priorities, reminders, and satisfying completion feedback.', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  { title: 'Habit Streaks', desc: 'Build consistency with visual streaks, check-ins, and XP rewards.', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  { title: 'Focus Timer', desc: 'Pomodoro-style sessions linked to tasks — stay in the zone.', icon: Target, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20' },
  { title: 'Rich Notes', desc: 'Capture ideas fast with a clean editor built for students.', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  { title: 'Connect', desc: 'Friends, leaderboards, achievements, and XP — productivity meets squad energy.', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { title: 'Secure & Private', desc: 'Optional PIN and biometrics. Your data syncs safely when you sign in.', icon: Shield, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20' },
];

export default function LandingPage() {
  const { isDark } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = `groundwork-${APP_VERSION}.apk`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloading(false), 3000);
  };

  return (
    <MarketingShell active="home">
      <section className="max-w-6xl mx-auto px-5 md:px-10 pt-8 md:pt-16 pb-20 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className={clsx(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] md:text-xs font-bold tracking-widest uppercase mb-6',
              isDark ? 'bg-[#007AFF]/10 border-[#007AFF]/25 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'
            )}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              v{APP_VERSION} · Android
            </div>

            <h1 className={clsx('text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6', isDark ? 'text-white' : 'text-slate-900')}>
              Your daily focus{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-violet-500">companion.</span>
            </h1>

            <p className={clsx('text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Tasks, habits, focus, notes, and Connect — one minimalist app to help students stay organized, earn XP, and build real momentum.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#007AFF] text-white rounded-2xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting download…
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Download for Android
                  </>
                )}
              </button>
              <a
                href="https://groundwork-red-nu.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base border active:scale-[0.98] transition-all",
                  isDark 
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" 
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                )}
              >
                <Sparkles size={20} className="text-[#007AFF]" />
                Open Groundwork Web App
              </a>
            </div>
            <p className={clsx('text-xs mt-4', isDark ? 'text-slate-500' : 'text-slate-400')}>
              Free to use · Cloud sync when signed in · iOS coming later
            </p>
          </div>

          {/* Phone mock card */}
          <div className={clsx(
            'rounded-[28px] border p-6 md:p-8 shadow-2xl',
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'
          )}>
            <div className="flex items-center justify-between mb-6">
              <span className={clsx('text-xs font-bold uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-slate-400')}>Today</span>
              <Sparkles size={16} className="text-[#007AFF]" />
            </div>
            <p className={clsx('text-2xl font-black mb-1', isDark ? 'text-white' : 'text-slate-900')}>Evening focus mode</p>
            <p className={clsx('text-sm mb-6', isDark ? 'text-slate-400' : 'text-slate-500')}>2/3 tasks · Daily quest active</p>
            <div className="space-y-3">
              {['Finish revision notes', '30 min focus session', 'Check in habits'].map((t, i) => (
                <div key={t} className={clsx('flex items-center gap-3 p-3 rounded-xl border', isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100')}>
                  <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center', i === 0 ? 'bg-[#007AFF] border-[#007AFF]' : 'border-slate-500')}>
                    {i === 0 && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className={clsx('text-sm font-semibold', i === 0 && 'line-through opacity-50', isDark ? 'text-white' : 'text-slate-800')}>{t}</span>
                </div>
              ))}
            </div>
            <div className={clsx('mt-6 p-4 rounded-2xl border flex items-center gap-3', isDark ? 'bg-[#007AFF]/10 border-[#007AFF]/20' : 'bg-blue-50 border-blue-100')}>
              <Trophy size={20} className="text-[#007AFF]" />
              <div>
                <p className="text-xs font-bold text-[#007AFF] uppercase">+20 XP</p>
                <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-800')}>Level 4 · Focused</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-24">
        <h2 className={clsx('text-2xl md:text-3xl font-black text-center mb-4', isDark ? 'text-white' : 'text-slate-900')}>
          Everything in one place
        </h2>
        <p className={clsx('text-center text-sm md:text-base mb-12 max-w-lg mx-auto', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Built for students who want structure without clutter.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={clsx(
                  'p-6 rounded-2xl border backdrop-blur-sm transition-transform hover:scale-[1.02]',
                  isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-100 shadow-sm'
                )}
              >
                <div className={clsx('w-11 h-11 rounded-xl border flex items-center justify-center mb-4', f.bg)}>
                  <Icon size={22} className={f.color} />
                </div>
                <h3 className={clsx('text-lg font-bold mb-2', isDark ? 'text-white' : 'text-slate-900')}>{f.title}</h3>
                <p className={clsx('text-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-24">
        <div className="text-center mb-10">
          <div className={clsx(
            'inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-4',
            isDark ? 'bg-[#007AFF]/10 border-[#007AFF]/25 text-[#007AFF]' : 'bg-blue-50 border-blue-200 text-[#007AFF]'
          )}>
            <Crown size={14} />
            Coming soon
          </div>
          <h2 className={clsx('text-2xl md:text-3xl font-black mb-3', isDark ? 'text-white' : 'text-slate-900')}>
            Groundwork Pro
          </h2>
          <p className={clsx('text-sm md:text-base max-w-xl mx-auto', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Advanced tools for deep focus — planned as a {PRO_PLAN_LABEL}. Every perk below is in development; the app stays fully free until launch.
          </p>
        </div>

        {PRO_FEATURE_SECTIONS.map((section) => (
          <div key={section.title} className="mb-10">
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-4 px-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {section.title}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={clsx(
                      'p-5 rounded-2xl border flex flex-col',
                      isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-100 shadow-sm'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0',
                        isDark ? 'bg-[#007AFF]/10 border-[#007AFF]/20' : 'bg-blue-50 border-blue-100'
                      )}>
                        <Icon size={20} className="text-[#007AFF]" />
                      </div>
                      <span className={clsx(
                        'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md flex-shrink-0',
                        isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'
                      )}>
                        Soon
                      </span>
                    </div>
                    <h3 className={clsx('text-base font-bold mb-1', isDark ? 'text-white' : 'text-slate-900')}>{f.title}</h3>
                    <p className={clsx('text-sm leading-relaxed flex-1', isDark ? 'text-slate-400' : 'text-slate-600')}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
