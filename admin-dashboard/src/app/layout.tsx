import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/ThemeContext';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'Groundwork — Daily Momentum & Productivity Workspace',
    template: '%s · Groundwork',
  },
  description:
    'Smart tasks, habit streaks, deep focus sessions, and squad Connect. Built by Barok Labs.',
  openGraph: {
    title: 'Groundwork by Barok Labs',
    description: 'Your sleek daily momentum workspace for Android and Web.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
