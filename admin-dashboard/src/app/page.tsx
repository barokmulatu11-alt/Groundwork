'use client';

import { MarketingShell } from '@/components/MarketingShell';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import { toast } from 'sonner';
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
  ExternalLink,
  Zap,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import { PRO_FEATURE_SECTIONS, PRO_PLAN_LABEL, MILESTONE_ROADMAP } from '@/data/proFeatures';

const APP_VERSION = '1.3.0';
const APK_URL = 'https://github.com/barokmulatu11-alt/Groundwork/releases/download/v1.2.1/groundwork-1.2.1.apk';

const FEATURES = [
  {
    title: 'Smart Tasks',
    desc: 'Plan your day with priority stacks, subtasks, estimated durations, and satisfying completion feedback.',
    icon: CheckCircle2,
    color: 'text-[#0066FF]',
    bg: 'bg-[#0066FF]/10 border-[#0066FF]/20',
  },
  {
    title: 'Habit Streaks',
    desc: 'Build lasting daily habits with interactive check-ins, compounding momentum, and custom frequencies.',
    icon: Flame,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    title: 'Deep Focus Timer',
    desc: 'Deep work sessions linked directly to tasks — eliminate distractions with Pomodoro intervals and custom stopwatches.',
    icon: Target,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    title: 'Journey & Analytics',
    desc: 'Visualize your compounding momentum with weekly productivity recaps, habit heatmaps, and focus time analytics.',
    icon: Trophy,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    title: 'Connect & Squads',
    desc: 'Friends, squad leaderboards, achievements, and XP progression — productivity meets social accountability.',
    icon: Users,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    title: 'Secure & Private',
    desc: 'Optional biometric app lock, PIN security, and dual-cloud sync built on local-first resilience.',
    icon: Shield,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
];

export default function LandingPage() {
  const { isDark } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    toast.success(`Starting Groundwork v${APP_VERSION} APK download...`);
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
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pt-8 md:pt-16 pb-20 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            {/* Version Pill */}
            <div
              className={clsx(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] md:text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-sm',
                isDark
                  ? 'bg-[#0066FF]/10 border-[#0066FF]/25 text-[#0066FF]'
                  : 'bg-blue-50 border-blue-200 text-[#0066FF]'
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0066FF]" />
              </span>
              v{APP_VERSION} Release · Android & Web
            </div>

            <h1
              className={clsx(
                'text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6',
                isDark ? 'text-[#F5F2EB]' : 'text-[#141312]'
              )}
            >
              Master your daily rhythm with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] via-[#388bfd] to-violet-500">
                Groundwork.
              </span>
            </h1>

            <p
              className={clsx(
                'text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0',
                isDark ? 'text-[#A3A099]' : 'text-[#686662]'
              )}
            >
              Smart tasks, habit streaks, deep focus sessions, and squad Connect — unified into one sleek,
              minimalist workspace built by Barok Labs.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-all shadow-xl shadow-blue-500/25 disabled:opacity-70"
              >
                {isDownloading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting download…
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Download APK (Android)
                  </>
                )}
              </button>

              <a
                href="https://groundwork-red-nu.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  'inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base border active:scale-[0.98] transition-all shadow-sm',
                  isDark
                    ? 'border-white/10 bg-white/5 hover:bg-white/10 text-[#F5F2EB]'
                    : 'border-black/10 bg-white hover:bg-slate-50 text-[#141312]'
                )}
              >
                <Sparkles size={18} className="text-[#0066FF]" />
                Launch Web App
              </a>
            </div>

            <p className={clsx('text-xs mt-4 font-medium flex items-center justify-center md:justify-start gap-2 flex-wrap', isDark ? 'text-[#787571]' : 'text-[#8E8C87]')}>
              <span>100% Free core productivity</span>
              <span>·</span>
              <span className="text-amber-500 font-semibold">Pro earned via milestones (no paywalls)</span>
              <span>·</span>
              <span>Developed by Barok Labs</span>
            </p>
          </div>

          {/* Interactive Phone Mock Card */}
          <div
            className={clsx(
              'rounded-[32px] border p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all',
              isDark ? 'bg-[#0A0A0C]/90 border-white/10' : 'bg-white border-black/8'
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <span className={clsx('text-xs font-bold uppercase tracking-widest', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                Today's Focus
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0066FF]/10 text-[#0066FF] text-[10px] font-bold">
                <Sparkles size={12} /> Live
              </div>
            </div>

            <p className={clsx('text-2xl font-black mb-1', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              Deep Focus Mode
            </p>
            <p className={clsx('text-sm mb-6', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              3 of 4 tasks completed · 14-day streak active 🔥
            </p>

            <div className="space-y-3">
              {[
                { text: 'Review algorithmic proofs', done: true },
                { text: '45-minute deep focus sprint', done: true },
                { text: 'Update weekly habit tracker', done: true },
                { text: 'Sync sprint logs with squad', done: false },
              ].map((t, i) => (
                <div
                  key={t.text}
                  className={clsx(
                    'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
                    isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-black/5'
                  )}
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      t.done ? 'bg-[#0066FF] border-[#0066FF]' : isDark ? 'border-gray-600' : 'border-slate-300'
                    )}
                  >
                    {t.done && <CheckCircle2 size={13} className="text-white" />}
                  </div>
                  <span
                    className={clsx(
                      'text-sm font-semibold flex-1',
                      t.done && 'line-through opacity-50',
                      isDark ? 'text-[#F5F2EB]' : 'text-[#141312]'
                    )}
                  >
                    {t.text}
                  </span>
                </div>
              ))}
            </div>

            <div
              className={clsx(
                'mt-6 p-4 rounded-2xl border flex items-center justify-between',
                isDark ? 'bg-[#0066FF]/10 border-[#0066FF]/25' : 'bg-blue-50/80 border-blue-200'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#0066FF] text-white">
                  <Trophy size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0066FF] uppercase tracking-wider">+35 XP Earned</p>
                  <p className={clsx('text-sm font-bold', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                    Level 5 · Flow State
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#0066FF]">Top 5%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-24">
        <div className="text-center mb-12">
          <h2 className={clsx('text-2xl md:text-3xl font-black mb-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
            Everything In One Place
          </h2>
          <p className={clsx('text-sm md:text-base max-w-lg mx-auto', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
            Built for scholars, creators, and students who demand structure without friction.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={clsx(
                  'p-6 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.02] shadow-sm',
                  isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-white border-black/8'
                )}
              >
                <div className={clsx('w-12 h-12 rounded-xl border flex items-center justify-center mb-4', f.bg)}>
                  <Icon size={22} className={f.color} />
                </div>
                <h3 className={clsx('text-lg font-bold mb-2', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                  {f.title}
                </h3>
                <p className={clsx('text-sm leading-relaxed', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Groundwork Pro & Milestone Reward System Section */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-24">
        {/* Anti-Subscription Banner */}
        <div className="text-center mb-14">
          <div
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-4',
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
            )}
          >
            <Crown size={14} />
            The Anti-Subscription Model · $0 Forever
          </div>
          <h2 className={clsx('text-3xl md:text-5xl font-black mb-4 tracking-tight', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
            Don&apos;t Buy Pro. <span className="text-[#0066FF]">Earn It.</span>
          </h2>
          <p className={clsx('text-base md:text-lg max-w-2xl mx-auto leading-relaxed', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
            Most productivity apps put basic features behind a $10/month paywall. We do the opposite:
            Core productivity is 100% free with unlimited tasks, habits, and focus sprints.
            And Pro? <strong className={isDark ? 'text-[#F5F2EB]' : 'text-[#141312]'}>You never pay a single cent.</strong> You unlock Pro features permanently by accomplishing productivity milestones.
          </p>
        </div>

        {/* Milestone Unlocks Showcase Grid */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6 px-1">
            <div>
              <h3 className={clsx('text-lg font-black tracking-tight', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                Milestone Rewards Roadmap
              </h3>
              <p className={clsx('text-xs font-medium', isDark ? 'text-[#787571]' : 'text-[#8E8C87]')}>
                Your progress is tracked permanently. Complete tasks and habits to unlock features forever.
              </p>
            </div>
            <div
              className={clsx(
                'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              )}
            >
              <Sparkles size={12} />
              Permanent Unlocks
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MILESTONE_ROADMAP.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.milestone}
                  className={clsx(
                    'p-6 rounded-2xl border flex flex-col relative overflow-hidden transition-all hover:scale-[1.02] shadow-sm',
                    isDark ? 'bg-[#0A0A0C]/90 border-white/10' : 'bg-white border-black/8'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span
                      className={clsx(
                        'text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border',
                        isDark ? 'bg-white/5 border-white/10 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                      )}
                    >
                      {item.milestone}
                    </span>
                    <span
                      className={clsx(
                        'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                        isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 mb-3">
                    <div
                      className={clsx(
                        'w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0',
                        isDark ? 'bg-[#0066FF]/10 border-[#0066FF]/20 text-[#0066FF]' : 'bg-blue-50 border-blue-100 text-[#0066FF]'
                      )}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className={clsx('text-base font-bold leading-snug', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                        {item.title}
                      </h4>
                      <p className="text-xs font-bold text-[#0066FF]">
                        Req: {item.requirement}
                      </p>
                    </div>
                  </div>

                  <p className={clsx('text-xs leading-relaxed flex-1 mb-4 font-medium', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                    {item.desc}
                  </p>

                  <div
                    className={clsx(
                      'pt-3 border-t flex items-center justify-between text-[11px] font-semibold',
                      isDark ? 'border-white/5 text-[#787571]' : 'border-black/5 text-[#8E8C87]'
                    )}
                  >
                    <span>Category: {item.category}</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Free Unlock
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guarantee Callout Banner */}
          <div
            className={clsx(
              'mt-6 p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4',
              isDark
                ? 'bg-gradient-to-r from-amber-500/10 via-[#0A0A0C] to-[#0066FF]/10 border-amber-500/20'
                : 'bg-gradient-to-r from-amber-50 via-white to-blue-50 border-amber-200'
            )}
          >
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                <Crown size={24} />
              </div>
              <div>
                <h4 className={clsx('text-base font-black', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                  No Credit Card. No Expiration. Permanent Highwater Marks.
                </h4>
                <p className={clsx('text-xs mt-1 leading-relaxed', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                  Once you achieve a milestone, that Pro privilege is permanently bound to your account and syncs across all devices. Cleaning up or completing old records never takes away what you earned.
                </p>
              </div>
            </div>

            <a
              href="https://groundwork-red-nu.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-bold whitespace-nowrap shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              Start Earning Pro
              <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Feature Catalog Grid */}
        <div className="mb-6">
          <p
            className={clsx(
              'text-xs font-bold uppercase tracking-widest mb-2 px-1',
              isDark ? 'text-[#787571]' : 'text-[#8E8C87]'
            )}
          >
            Full Pro Capability Catalog
          </p>
          <h3 className={clsx('text-xl md:text-2xl font-black mb-6 px-1', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
            Everything You Unlock Through Milestones
          </h3>
        </div>

        {PRO_FEATURE_SECTIONS.map((section) => (
          <div key={section.title} className="mb-10">
            <p
              className={clsx(
                'text-xs font-bold uppercase tracking-widest mb-4 px-1 flex items-center gap-2',
                isDark ? 'text-[#787571]' : 'text-[#8E8C87]'
              )}
            >
              <Zap size={14} className="text-[#0066FF]" />
              {section.title}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={clsx(
                      'p-5 rounded-2xl border flex flex-col transition-all hover:scale-[1.01] shadow-sm',
                      isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-white border-black/8'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0',
                          isDark ? 'bg-[#0066FF]/10 border-[#0066FF]/20' : 'bg-blue-50 border-blue-100'
                        )}
                      >
                        <Icon size={20} className="text-[#0066FF]" />
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md flex-shrink-0 border',
                          isDark
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        )}
                      >
                        Earnable
                      </span>
                    </div>
                    <h3 className={clsx('text-base font-bold mb-1', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                      {f.title}
                    </h3>
                    <p className={clsx('text-sm leading-relaxed flex-1', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                      {f.desc}
                    </p>
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
