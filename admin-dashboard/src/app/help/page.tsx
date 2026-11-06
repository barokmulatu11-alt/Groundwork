'use client';

import { MarketingShell } from '@/components/MarketingShell';
import { useTheme } from '@/lib/ThemeContext';
import clsx from 'clsx';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function HelpCenter() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');

  const allFaqs = [
    {
      cat: 'Getting Started',
      items: [
        { q: 'How do I create an account?', a: 'Sign up with email or Google from the welcome screen. You can also explore immediately in guest mode with instant local-first storage.' },
        { q: 'Is Groundwork free to use?', a: 'Yes! Groundwork offers unlimited, uncapped task management, habit streak tracking, and focus sessions completely free. Groundwork Pro adds premium aesthetics (custom launcher icons, OLED themes), deep velocity analytics, and social flair.' },
        { q: 'Can I use Groundwork offline?', a: 'Absolutely. Groundwork is built with offline-first persistence. Your daily tasks and habits work seamlessly offline and automatically sync to the cloud the moment you reconnect.' },
      ],
    },
    {
      cat: 'Features & Customization',
      items: [
        { q: 'What is Groundwork Connect?', a: 'Connect brings social momentum to your productivity. Squad up with friends, climb weekly and all-time leaderboards, earn XP from completed tasks, and unlock achievements together.' },
        { q: 'How does the Focus Timer work?', a: 'Choose from Pomodoro cycles, Deep Work sprints, or custom Stopwatches. You can link timers directly to specific tasks and earn bonus XP upon completion.' },
        { q: 'How do I unlock custom app icons and themes?', a: 'Navigate to Settings → Appearance to explore the Logo Center and custom OLED palettes. You unlock them permanently by accomplishing productivity milestones (e.g., 30 completed tasks and 15 focus sessions).' },
        { q: 'Does data sync across devices?', a: 'When signed in, your tasks, active habits, focus history, and achievements automatically synchronize securely via our cloud infrastructure (Supabase & Neon).' },
      ],
    },
    {
      cat: 'Groundwork Pro & Support',
      items: [
        { q: 'How much does Groundwork Pro cost?', a: 'Groundwork Pro is 100% free ($0). There are zero subscription fees and no credit card is ever required. You earn Pro capabilities permanently by achieving productivity milestones (such as completing tasks, maintaining habit streaks, and finishing focus sessions).' },
        { q: 'Why is Pro earned instead of paid?', a: 'We believe productivity tools should motivate real personal growth rather than penalize you with monthly paywalls. Milestone rewards turn self-improvement into an exciting progression system where consistency unlocks premium power.' },
        { q: 'Do my earned Pro features ever expire?', a: 'Never. Milestone rewards are permanently recorded as highwater marks on your account. Deleting or archiving old completed records never revokes what you have earned.' },
        { q: 'How do I report a bug or suggest a feature?', a: 'Navigate to Settings → Support → Report an Issue in the mobile app, or contact our team directly through the Barok Labs email center.' },
      ],
    },
  ];

  const filteredFaqs = allFaqs
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <MarketingShell active="help">
      <header className="py-12 md:py-16 px-5 text-center max-w-3xl mx-auto">
        <h1 className={clsx('text-4xl md:text-5xl font-black mb-4', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
          How can we help?
        </h1>
        <p className={clsx('text-sm md:text-base mb-8', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
          Find answers, tutorials, and support resources for Groundwork by Barok Labs.
        </p>

        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="search"
            placeholder="Search help topics, FAQs, and guides…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={clsx(
              'w-full py-4 pl-12 pr-4 rounded-2xl border text-sm outline-none transition-all focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 shadow-sm',
              isDark ? 'bg-[#0A0A0C] border-white/10 text-[#F5F2EB] placeholder-[#787571]' : 'bg-white border-black/10 text-[#141312]'
            )}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-20">
        {filteredFaqs.map((category) => (
          <section key={category.cat} className="mb-10">
            <h2 className={clsx('text-sm font-bold uppercase tracking-wider mb-4 px-1', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
              {category.cat}
            </h2>
            <div className="space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.q}
                  className={clsx(
                    'p-5 rounded-2xl border transition-all shadow-sm',
                    isDark ? 'bg-[#0A0A0C]/80 border-white/10' : 'bg-white border-black/8'
                  )}
                >
                  <h3 className={clsx('font-bold text-base mb-2', isDark ? 'text-[#F5F2EB]' : 'text-[#141312]')}>
                    {item.q}
                  </h3>
                  <p className={clsx('text-sm leading-relaxed', isDark ? 'text-[#A3A099]' : 'text-[#686662]')}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </MarketingShell>
  );
}
