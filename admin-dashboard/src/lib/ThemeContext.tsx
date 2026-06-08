'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DASHBOARD_PREMIUM_THEMES, getDashboardThemeById } from '@/lib/premiumThemes';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  premiumThemeId: string;
  setPremiumThemeId: (id: string) => void;
  premiumThemes: typeof DASHBOARD_PREMIUM_THEMES;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });
  const [premiumThemeId, setPremiumThemeIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'default';
    return localStorage.getItem('premium_theme_id') || 'default';
  });

  const applyDocumentTheme = (activeTheme: Theme, selectedPremiumThemeId: string) => {
    const premiumTheme = getDashboardThemeById(selectedPremiumThemeId);
    const variant = activeTheme === 'dark' ? premiumTheme.dark : premiumTheme.light;

    if (activeTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    document.documentElement.style.setProperty('--bg-primary', variant.background);
    document.documentElement.style.setProperty('--bg-secondary', variant.cardSolid);
    document.documentElement.style.setProperty('--border-color', variant.cardBorder);
    document.documentElement.style.setProperty('--glass-bg', variant.card);
    document.documentElement.style.setProperty('--text-primary', activeTheme === 'dark' ? '#f9fafb' : '#0f172a');
    document.documentElement.style.setProperty('--text-secondary', activeTheme === 'dark' ? '#9ca3af' : '#64748b');
  };

  useEffect(() => {
    applyDocumentTheme(theme, premiumThemeId);
  }, [theme, premiumThemeId]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setPremiumThemeId = (id: string) => {
    setPremiumThemeIdState(id);
    localStorage.setItem('premium_theme_id', id);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        premiumThemeId,
        setPremiumThemeId,
        premiumThemes: DASHBOARD_PREMIUM_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
