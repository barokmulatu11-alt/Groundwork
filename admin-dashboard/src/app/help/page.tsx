'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HelpCenter() {
  const [isDark, setIsDark] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setIsDark(false);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const allFaqs = [
    { 
      cat: "Getting Started", 
      items: [
        { q: "How do I create an account?", a: "You can sign up using your email or Google account directly from the app's welcome screen." },
        { q: "Is Groundwork free to use?", a: "Yes! Groundwork offers a generous free tier. For power users, Groundwork Pro offers advanced features like unlimited syncing and custom themes." }
      ]
    },
    { 
      cat: "Features", 
      items: [
        { q: "What is the Focus Timer?", a: "The Focus Timer uses the Pomodoro technique to help you stay concentrated on a single task without distractions." },
        { q: "Can I sync my data across devices?", a: "Yes, if you are logged in, your tasks, habits, and notes are automatically synced to our secure cloud." }
      ]
    },
    { 
      cat: "Support", 
      items: [
        { q: "How do I report a bug?", a: "Go to Settings > Support > Report an Issue within the mobile app to send us a direct report." },
        { q: "How do I cancel my Pro subscription?", a: "Subscriptions are managed through the Google Play Store. Go to your Play Store account > Subscriptions to manage your plan." }
      ]
    }
  ];

  // Live filtering logic
  const filteredFaqs = allFaqs.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.q.toLowerCase().includes(search.toLowerCase()) || 
      item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${isDark ? 'bg-[#050505] text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center">
          <span className="text-3xl font-black text-blue-500">g</span>
          <span className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
        </Link>
        <button onClick={toggleTheme} className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-amber-400' : 'bg-white border-slate-200 text-amber-500 shadow-sm'}`}>
          {isDark ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
          )}
        </button>
      </nav>

      {/* Hero Header */}
      <header className="py-12 md:py-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className={`text-4xl md:text-6xl font-black mb-6 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>How can we help?</h1>
        <div className="relative max-w-2xl mx-auto">
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Search for answers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full py-4 md:py-5 pl-14 pr-6 rounded-2xl border text-base md:text-lg outline-none transition-all ${
              isDark 
              ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50' 
              : 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-200/50 focus:border-blue-500'
            }`}
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 pb-40">
        <div className="space-y-12 md:space-y-16">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((category, idx) => (
              <section key={idx}>
                <h2 className={`text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 text-sm font-bold">{idx + 1}</span>
                  {category.cat}
                </h2>
                <div className="grid gap-4">
                  {category.items.map((item, i) => (
                    <div 
                      key={i} 
                      className={`p-6 rounded-2xl border transition-all ${
                        isDark ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <h3 className={`text-base md:text-lg font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.q}</h3>
                      <p className="leading-relaxed text-sm opacity-80">{item.a}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-500/10 mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No results found</h3>
              <p className="opacity-60">Try searching for something else, or contact our support team.</p>
            </div>
          )}
        </div>

        {/* Support CTA */}
        <div className={`mt-24 p-8 md:p-10 rounded-[24px] md:rounded-[32px] text-center border ${
          isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'
        }`}>
          <h2 className={`text-xl md:text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Still need help?</h2>
          <p className="mb-6 md:mb-8 text-sm md:text-base opacity-80">Our support team is always here for you.</p>
          <button className="w-full sm:w-auto px-10 py-4 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-400 transition-all shadow-xl shadow-blue-500/20">
            Contact Support
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 text-center opacity-50 text-[10px] md:text-xs">
        <p>© 2026 Barok Labs • Crafted with ❤️</p>
      </footer>
    </div>
  );
}
