'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function TermsAndConditions() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setIsDark(false);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 py-20 px-6 ${isDark ? 'bg-[#050505] text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <span className="text-3xl font-black text-blue-500">g</span>
            <span className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
          </div>
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
              ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' 
              : 'bg-white border-slate-200 text-amber-500 shadow-sm hover:bg-slate-50'
            }`}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            )}
          </button>
        </div>

        <h1 className={`text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Terms of Service</h1>
        <p className="text-blue-500 font-bold mb-12 uppercase tracking-widest text-xs">Last Updated: May 16, 2026</p>
        
        <div className={`space-y-12 border p-10 rounded-[32px] backdrop-blur-3xl ${
          isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <section>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-6 h-px bg-blue-500" /> 1. Acceptance of Terms
            </h2>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>By accessing or using the Groundwork mobile application or website, you agree to be bound by these Terms and Conditions.</p>
          </section>

          <section>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-6 h-px bg-blue-500" /> 2. User Accounts
            </h2>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          </section>

          <section>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-6 h-px bg-blue-500" /> 3. Pro Subscription
            </h2>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Groundwork Pro is a paid subscription. Billing and cancellations are handled through your respective app store (Google Play Store or Apple App Store).</p>
          </section>

          <section>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-6 h-px bg-blue-500" /> 4. Limitation of Liability
            </h2>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Barok Labs shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the application.</p>
          </section>
        </div>

        <footer className="mt-16 text-center">
          <Link href="/" className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors">← Back to Home</Link>
          <p className="mt-8 text-slate-500 text-xs uppercase tracking-widest">© 2026 Barok Labs</p>
        </footer>
      </div>
    </div>
  );
}
