'use client';

import { MarketingShell } from '@/components/MarketingShell';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';

export default function PrivacyPolicy() {
  const { isDark } = useTheme();

  return (
    <MarketingShell active="privacy">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className={clsx('text-4xl md:text-5xl font-black tracking-tight mb-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
          Privacy Policy
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
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 1. Information We Collect
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              We collect information you provide directly to us when you create an account, such as your name, email address,
              and any productivity data (tasks, habit streaks, focus sessions, and squad profile stats) you sync to our servers.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 2. How We Use Information
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              We use the information we collect to provide, maintain, and improve our services, including syncing your data
              across devices, analyzing system performance, and providing customer support.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 3. Data Security & Storage
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              We take enterprise-grade measures to protect your personal information from unauthorized access, loss, or disclosure.
              All data transmissions are encrypted using industry-standard TLS protocols.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 4. Your Rights &amp; Account Deletion
            </h2>
            <p className={clsx('leading-relaxed text-sm mb-3', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              You retain complete ownership over your data. You can export, update, or permanently delete your account and all
              associated data at any time from within the Groundwork app settings (Settings &rarr; Account &rarr; Sign Out / Delete Account).
            </p>
            <p className={clsx('leading-relaxed text-sm mb-3', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              If you have uninstalled the app or wish to request complete deletion of your account and data online, you can email{' '}
              <a href="mailto:barok.m.lakew@gmail.com?subject=Account%20Deletion%20Request" className="text-[#0066FF] font-semibold underline">
                barok.m.lakew@gmail.com
              </a>{' '}
              with the subject &ldquo;Account Deletion Request&rdquo;. Requests are processed within 7 business days and permanently remove all profile, task, habit, and focus analytics data.
            </p>
            <p className={clsx('text-xs', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              For our detailed deletion policy, visit our dedicated <a href="/account-deletion" className="text-[#0066FF] font-semibold underline">Account &amp; Data Deletion Page</a>.
            </p>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
