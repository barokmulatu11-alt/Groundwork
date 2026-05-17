'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Download, Globe, MessageSquare, Shield, Zap, Moon, Sun, Search, ChevronRight } from 'lucide-react';

export default function LandingPage() {
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

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    // Since the file is too large for Vercel's direct host in some regions,
    // we use a direct link or prompt the user to download from the permanent storage.
    const downloadUrl = 'https://github.com/barokmulatu11-alt/Groundwork/releases/download/v1.1.1/groundwork-1.1.1.apk';
    
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'groundwork-1.1.1.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsDownloading(false), 3000);
  };

  const themeClasses = isDark
    ? "bg-[#050505] text-white selection:bg-blue-500/30"
    : "bg-slate-50 text-slate-900 selection:bg-blue-100";

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 overflow-x-hidden ${themeClasses}`}>
      {/* Glow Effects (Only in dark mode) */}
      {isDark && (
        <>
          <div className="fixed top-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />
          <div className="fixed bottom-[-10%] left-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-blue-500/5 blur-[70px] md:blur-[100px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        <div className="flex items-center">
          <span className="text-2xl md:text-3xl font-black text-blue-500">g</span>
          <span className={`text-2xl md:text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-8">
          <div className="hidden lg:flex items-center gap-8 mr-4">
            <Link href="/help" className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`}>Help</Link>
            <Link href="/privacy" className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`}>Privacy</Link>
          </div>
          
          <button 
            onClick={toggleTheme}
            className={`p-2 md:p-2.5 rounded-xl border transition-all ${isDark
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

          <Link href="/login" className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${isDark
            ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
            }`}>
            Admin
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-16 md:pt-32 pb-24 md:pb-40 text-center md:text-left">
        <div className="max-w-4xl mx-auto md:mx-0">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] md:text-xs font-bold tracking-widest uppercase mb-6 md:mb-8 ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'
            }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            v1.1.1 Now Available
          </div>

          <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] md:leading-[1.05] mb-6 md:mb-8 tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Your daily focus <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">companion.</span>
          </h1>

          <p className={`text-lg md:text-xl mb-10 md:mb-12 leading-relaxed max-w-2xl mx-auto md:mx-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Groundwork helps you stay focused, organized, and productive.
            A minimalist, high-performance toolkit for building a better routine.
          </p>

          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
            <button 
              onClick={handleDownload} 
              disabled={isDownloading}
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 bg-[#007AFF] text-white rounded-2xl font-bold text-base md:text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-70 disabled:scale-100"
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting Download...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download for Android
                </>
              )}
            </button>
            <button
              onClick={() => alert('Demo video coming soon!')}
              className={`flex items-center justify-center w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 rounded-2xl font-bold text-base md:text-lg transition-all backdrop-blur-xl border ${isDark
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                }`}
            >
              Watch Demo
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mt-24 md:mt-48">
          {[
            { title: "Smart Tasks", desc: "Prioritize your day with our intelligent task management system.", color: "blue", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
            { title: "Habit Tracking", desc: "Build lasting routines with visual streaks and reminders.", color: "purple", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { title: "Rich Notes", desc: "Capture your thoughts instantly with our minimalist editor.", color: "amber", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }
          ].map((f, i) => (
            <div key={i} className={`flex flex-col items-center text-center md:items-start md:text-left p-6 md:p-8 rounded-[24px] md:rounded-[32px] border backdrop-blur-2xl transition-colors ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-white border-slate-100 shadow-sm'
              }`}>
              <div className={`w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 border ${isDark ? `bg-${f.color}-500/10 border-${f.color}-500/20` : `bg-${f.color}-50 border-${f.color}-100`
                }`}>
                <svg className={`w-5 md:w-6 h-5 md:h-6 text-${f.color}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon} /></svg>
              </div>
              <h3 className={`text-lg md:text-xl font-bold mb-2 md:mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
              <p className={`leading-relaxed text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 border-t backdrop-blur-lg transition-colors ${isDark ? 'border-white/[0.05] bg-black/40' : 'border-slate-200 bg-white'
        }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-16 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start">
              <span className="text-2xl font-black text-blue-500">g</span>
              <span className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
            </div>
            <p className="text-slate-500 text-sm italic mt-1">Developed by Barok Labs</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            <Link href="/help" className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`}>Help Center</Link>
            <Link href="/privacy" className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`}>Privacy</Link>
            <Link href="/terms" className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`}>Terms</Link>
          </div>

          <p className="text-slate-500 text-[10px] md:text-xs uppercase tracking-widest">© 2026 Barok Labs</p>
        </div>
      </footer>
    </div>
  );
}
