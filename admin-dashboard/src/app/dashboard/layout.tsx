'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Menu, X } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (profile && profile.role !== 'admin' && profile.role !== 'owner') {
        router.replace('/login?error=unauthorized');
      }
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-[#007AFF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || (profile && !['admin', 'owner'].includes(profile.role))) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">

      {/* MOBILE HEADER — only visible below md */}
      <header className={`md:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b z-30 ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-black text-[#007AFF]">g</span>
          <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`p-2 rounded-lg ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* MOBILE DRAWER OVERLAY — only visible below md */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <div className="relative h-full">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={`absolute top-4 right-3 z-10 p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'}`}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR — hidden on mobile, shown on md+ */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>

    </div>
  );
}
