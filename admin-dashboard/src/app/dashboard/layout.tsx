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
    <div className="flex min-h-screen flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className={`md:hidden flex flex-shrink-0 items-center justify-between px-4 py-4 border-b z-40 relative ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
         <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-[#007AFF]">g</span>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>roundwork.</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 rounded-lg ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}>
           {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
         </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      <main className="flex-1 overflow-auto w-full relative z-10 md:w-[calc(100%-16rem)]">
        {children}
      </main>
    </div>
  );
}
