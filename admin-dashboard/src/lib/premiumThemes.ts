export interface DashboardPremiumThemeVariant {
  background: string;
  card: string;
  cardBorder: string;
  cardSolid: string;
}

export interface DashboardPremiumTheme {
  id: string;
  name: string;
  description: string;
  previewGradient: [string, string, string];
  dark: DashboardPremiumThemeVariant;
  light: DashboardPremiumThemeVariant;
}

export const DASHBOARD_PREMIUM_THEMES: DashboardPremiumTheme[] = [
  {
    id: 'default',
    name: 'Groundwork',
    description: 'The signature Groundwork experience: true OLED black & warm canvas.',
    previewGradient: ['#000000', '#0a0a0c', '#000000'],
    dark: {
      background: '#000000',
      card: 'rgba(14, 14, 16, 0.75)',
      cardBorder: 'rgba(255, 255, 255, 0.10)',
      cardSolid: '#0A0A0C',
    },
    light: {
      background: '#FAF9F6',
      card: 'rgba(255, 255, 255, 0.85)',
      cardBorder: 'rgba(0, 0, 0, 0.08)',
      cardSolid: '#FFFFFF',
    },
  },
  {
    id: 'midnight_aurora',
    name: 'Midnight Aurora',
    description: 'Deep violet cosmos with aurora-tinted surfaces.',
    previewGradient: ['#0A0618', '#140D2F', '#0D0820'],
    dark: {
      background: '#07040F',
      card: 'rgba(38, 22, 68, 0.60)',
      cardBorder: 'rgba(80, 50, 140, 0.35)',
      cardSolid: '#130B24',
    },
    light: {
      background: '#F4F0FB',
      card: 'rgba(180, 160, 240, 0.14)',
      cardBorder: 'rgba(130, 87, 230, 0.20)',
      cardSolid: '#FDFBFF',
    },
  },
  {
    id: 'obsidian_prestige',
    name: 'Obsidian Prestige',
    description: 'Warm amber-tinted luxury black for serious scholars.',
    previewGradient: ['#080603', '#1C150A', '#0A0804'],
    dark: {
      background: '#080603',
      card: 'rgba(36, 28, 14, 0.82)',
      cardBorder: 'rgba(100, 80, 30, 0.38)',
      cardSolid: '#120E06',
    },
    light: {
      background: '#FDFAF3',
      card: 'rgba(255, 240, 200, 0.32)',
      cardBorder: 'rgba(180, 140, 60, 0.22)',
      cardSolid: '#FFFDF7',
    },
  },
  {
    id: 'cyber_constellation',
    name: 'Cyber Constellation',
    description: 'Electric deep-navy surfaces with quantum edge.',
    previewGradient: ['#020510', '#070F28', '#010308'],
    dark: {
      background: '#020510',
      card: 'rgba(8, 20, 50, 0.78)',
      cardBorder: 'rgba(0, 200, 255, 0.20)',
      cardSolid: '#050C1E',
    },
    light: {
      background: '#F0F6FF',
      card: 'rgba(180, 220, 255, 0.22)',
      cardBorder: 'rgba(0, 150, 200, 0.22)',
      cardSolid: '#F8FCFF',
    },
  },
  {
    id: 'academic_ruby',
    name: 'Academic Ruby',
    description: 'Scholarly crimson depth for focused academic minds.',
    previewGradient: ['#16080C', '#2F0F19', '#0D0507'],
    dark: {
      background: '#0E0508',
      card: 'rgba(60, 15, 25, 0.72)',
      cardBorder: 'rgba(180, 40, 70, 0.30)',
      cardSolid: '#180A0F',
    },
    light: {
      background: '#FDF4F6',
      card: 'rgba(255, 180, 195, 0.20)',
      cardBorder: 'rgba(200, 60, 90, 0.20)',
      cardSolid: '#FFFBFC',
    },
  },
  {
    id: 'forest_depths',
    name: 'Forest Depths',
    description: 'Ancient forest greens for grounded, focused sessions.',
    previewGradient: ['#030F08', '#071A0D', '#020A05'],
    dark: {
      background: '#030F08',
      card: 'rgba(12, 40, 20, 0.78)',
      cardBorder: 'rgba(40, 120, 65, 0.30)',
      cardSolid: '#061408',
    },
    light: {
      background: '#F2FAF4',
      card: 'rgba(160, 220, 175, 0.20)',
      cardBorder: 'rgba(48, 160, 80, 0.20)',
      cardSolid: '#FAFFFC',
    },
  },
  {
    id: 'pure_onyx',
    name: 'Pure Onyx',
    description: 'True AMOLED black. Minimal. Powerful. Timeless.',
    previewGradient: ['#000000', '#080808', '#000000'],
    dark: {
      background: '#000000',
      card: 'rgba(18, 18, 18, 0.92)',
      cardBorder: 'rgba(60, 60, 60, 0.52)',
      cardSolid: '#0A0A0A',
    },
    light: {
      background: '#FFFFFF',
      card: 'rgba(240, 240, 240, 0.62)',
      cardBorder: 'rgba(0, 0, 0, 0.09)',
      cardSolid: '#FAFAFA',
    },
  },
  {
    id: 'true_black',
    name: 'True Black',
    description: 'Pure black OLED-optimized theme.',
    previewGradient: ['#000000', '#000000', '#000000'],
    dark: {
      background: '#000000',
      card: 'rgba(255,255,255,0.02)',
      cardBorder: 'rgba(255,255,255,0.04)',
      cardSolid: '#000000',
    },
    light: {
      background: '#FFFFFF',
      card: 'rgba(240,240,240,0.62)',
      cardBorder: 'rgba(0,0,0,0.09)',
      cardSolid: '#FAFAFA',
    },
  },
];

export const getDashboardThemeById = (id: string): DashboardPremiumTheme =>
  DASHBOARD_PREMIUM_THEMES.find((theme) => theme.id === id) ?? DASHBOARD_PREMIUM_THEMES[0];
