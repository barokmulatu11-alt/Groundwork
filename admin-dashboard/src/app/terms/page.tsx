'use client';

import { MarketingShell } from '@/components/MarketingShell';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';

export default function TermsAndConditions() {
  const { isDark } = useTheme();

  return (
    <MarketingShell active="terms">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className={clsx('text-4xl md:text-5xl font-black tracking-tight mb-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
          Terms of Service
        </h1>
        <p className="text-[#0066FF] font-mono font-bold mb-10 uppercase tracking-widest text-xs">
          Last Updated: October 16, 2026 · Barok Labs
        </p>

        <div
          className={clsx(
            'space-y-10 border p-8 md:p-10 rounded-[32px] backdrop-blur-xl transition-all shadow-sm',
            isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-white border-black/8'
          )}
        >
          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 1. Acceptance of Terms
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              By accessing or using the Groundwork mobile application or the Barok Labs websites, you agree to be bound by
              these Terms and Conditions and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 2. User Accounts & Integrity
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that
              occur under your account. We reserve the right to suspend accounts that violate safety guidelines.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 3. Groundwork Pro & Milestone Rewards
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              Core productivity features (task management, habit tracking, and focus timers) are unconditionally free and uncapped. Groundwork Pro
              operates on a milestone achievement model: premium customizations (Logo Center launcher icons, OLED themes), advanced velocity analytics,
              and squad prestige flair are earned through verifiable productivity milestones. Groundwork does not charge recurring subscription fees or require credit card information.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 4. Service Modifications
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              Barok Labs reserves the right to modify or discontinue any part of the service with reasonable notice to active users.
            </p>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
