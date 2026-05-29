'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import { Menu, X } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { isAdminRole } from '@/lib/admin-actions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileReady, profileError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark } = useTheme();

  const accessDenied =
    !loading &&
    profileReady &&
    (!user || !profile || !isAdminRole(profile.role));

  useEffect(() => {
    if (loading || !profileReady) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!profile || !isAdminRole(profile.role)) {
      router.replace('/login?error=unauthorized');
    }
  }, [user, profile, loading, profileReady, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading || !profileReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>
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

  if (accessDenied) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>
        <div className="max-w-md text-center space-y-3">
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Access denied</p>
          <p className="text-gray-500 text-sm">
            {profileError ||
              (profile
                ? `Your role is "${profile.role}". Owner or admin is required.`
                : 'No profile loaded for this account.')}
          </p>
          <p className="text-gray-600 text-xs">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      <header className={`md:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b z-30 ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`p-2 rounded-lg ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-black text-[#007AFF]">g</span>
          <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)} />
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

      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
