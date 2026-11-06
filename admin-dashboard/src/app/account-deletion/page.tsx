'use client';

import { MarketingShell } from '@/components/MarketingShell';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';

export default function AccountDeletionPage() {
  const { isDark } = useTheme();

  return (
    <MarketingShell active="privacy">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className={clsx('text-4xl md:text-5xl font-black tracking-tight mb-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
          Account &amp; Data Deletion
        </h1>
        <p className="text-[#0066FF] font-mono font-bold mb-10 uppercase tracking-widest text-xs">
          Groundwork by Barok Labs · User Data Policy
        </p>

        <div
          className={clsx(
            'space-y-10 border p-8 md:p-10 rounded-[32px] backdrop-blur-xl transition-all shadow-sm',
            isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-white border-black/8'
          )}
        >
          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 1. Overview
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              You have the right to request the permanent deletion of your Groundwork account and all personal data associated with it at any time, whether you currently have the app installed or have already uninstalled it.
            </p>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 2. How to Request Deletion
            </h2>
            <div className="space-y-4">
              <div className={clsx('p-4 rounded-2xl border', isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5')}>
                <h3 className={clsx('font-bold text-sm mb-1', isDark ? 'text-white' : 'text-black')}>
                  Option A: From Within the Groundwork App
                </h3>
                <p className={clsx('text-xs leading-relaxed', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                  1. Open Groundwork on your device.<br />
                  2. Navigate to <strong>Settings</strong> → <strong>Account</strong>.<br />
                  3. Select <strong>Sign Out / Reset Account</strong> to remove all credentials and local data.
                </p>
              </div>

              <div className={clsx('p-4 rounded-2xl border', isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5')}>
                <h3 className={clsx('font-bold text-sm mb-1', isDark ? 'text-white' : 'text-black')}>
                  Option B: Online Request (No App Required)
                </h3>
                <p className={clsx('text-xs leading-relaxed mb-3', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                  If you have uninstalled the app or cannot access your device, send an email from the address associated with your Groundwork account to:
                </p>
                <a
                  href="mailto:barok.m.lakew@gmail.com?subject=Groundwork%20Account%20and%20Data%20Deletion%20Request"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066FF] text-white font-bold text-xs hover:bg-[#0052CC] transition-colors"
                >
                  Email: barok.m.lakew@gmail.com
                </a>
                <p className={clsx('text-xs mt-2', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                  Include &ldquo;Groundwork Account Deletion Request&rdquo; in the subject line. We will process and confirm your request within 7 business days.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 3. Data That Will Be Deleted
            </h2>
            <p className={clsx('leading-relaxed text-sm mb-3', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              Upon confirmation, the following data is permanently purged from our servers:
            </p>
            <ul className={clsx('list-disc list-inside space-y-1 text-xs', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              <li>Your user account profile (display name, username, and email address)</li>
              <li>Authentication credentials and session tokens</li>
              <li>All synchronized task lists, subtasks, and task notes</li>
              <li>Habits, streak histories, and completion logs</li>
              <li>Focus sessions, analytics summaries, and milestone records</li>
            </ul>
          </section>

          <section>
            <h2 className={clsx('text-lg font-bold mb-3 flex items-center gap-3', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
              <span className="w-5 h-0.5 bg-[#0066FF] rounded-full" /> 4. Data Retention Policy
            </h2>
            <p className={clsx('leading-relaxed text-sm', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              We do not retain copies of your productivity data once deleted. Backups containing your purged data are overwritten within standard cycle retention (maximum 30 days). No personal data is kept for marketing or advertising purposes.
            </p>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
