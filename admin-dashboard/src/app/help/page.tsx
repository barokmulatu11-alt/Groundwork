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
        { q: 'How do I create an account?', a: 'Sign up with email or Google from the welcome screen. You can also try guest mode first.' },
        { q: 'Is Groundwork free?', a: 'Yes — core features are free today. Groundwork Pro (1 year subscription) is coming soon with advanced extras; until launch, everything stays free.' },
      ],
    },
    {
      cat: 'Features',
      items: [
        { q: 'What is Connect?', a: 'Connect adds friends, leaderboards, achievements, and XP so productivity feels social and rewarding.' },
        { q: 'How does the Focus Timer work?', a: 'Pick a mode, optionally link a task, and start a session. You earn XP when you finish.' },
        { q: 'Does data sync?', a: 'When signed in, tasks, habits, and notes sync via our secure cloud.' },
      ],
    },
    {
      cat: 'Support',
      items: [
        { q: 'How do I report a bug?', a: 'Settings → Support → Report an Issue in the app.' },
        { q: 'How do I manage Pro?', a: 'When Pro launches, subscriptions will be managed in the Google Play Store. Admins can grant 1-year access from the dashboard until then.' },
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
        <h1 className={clsx('text-4xl md:text-5xl font-black mb-6', isDark ? 'text-white' : 'text-slate-900')}>How can we help?</h1>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="search"
            placeholder="Search for answers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={clsx(
              'w-full py-4 pl-12 pr-4 rounded-2xl border text-base outline-none',
              isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            )}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-16">
        {filteredFaqs.map((category, idx) => (
          <section key={category.cat} className="mb-12">
            <h2 className={clsx('text-lg font-bold mb-4', isDark ? 'text-white' : 'text-slate-900')}>{category.cat}</h2>
            <div className="space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.q}
                  className={clsx('p-5 rounded-2xl border', isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-100')}
                >
                  <h3 className={clsx('font-bold mb-2', isDark ? 'text-white' : 'text-slate-900')}>{item.q}</h3>
                  <p className={clsx('text-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </MarketingShell>
  );
}
