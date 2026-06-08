// lib/premiumThemes.ts
// Premium theme surface definitions for Groundwork Pro.
// Themes modify background, card, and environmental surfaces only.
// The user's selected accent color is always preserved.

export interface PremiumThemeVariant {
  background: string;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  card: string;
  cardBorder: string;
  cardSolid: string;
  tabBar: string;
  tabBarBorder: string;
  blob1: string;
  blob2: string;
  separator: string;
  inputBackground: string;
  inputBorder: string;
  skeletonBase: string;
  skeletonHighlight: string;
}

export interface PremiumTheme {
  id: string;
  name: string;
  description: string;
  isPro: boolean;
  /** Three gradient stops rendered in the theme preview swatch */
  previewGradient: [string, string, string];
  /** Accent hint colour only used for swatch decoration */
  previewAccent: string;
  dark: PremiumThemeVariant;
  light: PremiumThemeVariant;
}

export const PREMIUM_THEMES: PremiumTheme[] = [
  // ─── Default (Free) ────────────────────────────────────────────────────────
  {
    id: "default",
    name: "Groundwork",
    description: "The classic, original Groundwork experience.",
    isPro: false,
    previewGradient: ["#080C14", "#0d1525", "#080C14"],
    previewAccent: "#007AFF",
    dark: {
      background: "#080C14",
      backgroundGradientStart: "#080C14",
      backgroundGradientEnd: "#0d1525",
      card: "rgba(28, 28, 30, 0.75)",
      cardBorder: "rgba(48, 48, 52, 0.8)",
      cardSolid: "#111827",
      tabBar: "rgba(0,0,0,0.7)",
      tabBarBorder: "rgba(255,255,255,0.06)",
      blob1: "rgba(0,122,255,0.07)",
      blob2: "rgba(0,122,255,0.07)",
      separator: "rgba(255,255,255,0.06)",
      inputBackground: "rgba(28, 28, 30, 0.75)",
      inputBorder: "rgba(48, 48, 52, 0.8)",
      skeletonBase: "rgba(255,255,255,0.06)",
      skeletonHighlight: "rgba(255,255,255,0.03)",
    },
    light: {
      background: "#FAF7F2",
      backgroundGradientStart: "#FAF7F2",
      backgroundGradientEnd: "#F0EDE8",
      card: "rgba(255, 255, 255, 0.10)",
      cardBorder: "rgba(230, 230, 235, 0.30)",
      cardSolid: "#FFFFFF",
      tabBar: "rgba(255,255,255,0.7)",
      tabBarBorder: "rgba(0,0,0,0.05)",
      blob1: "rgba(0,122,255,0.07)",
      blob2: "rgba(0,122,255,0.07)",
      separator: "rgba(0,0,0,0.05)",
      inputBackground: "rgba(255, 255, 255, 0.10)",
      inputBorder: "rgba(230, 230, 235, 0.30)",
      skeletonBase: "rgba(0,0,0,0.06)",
      skeletonHighlight: "rgba(0,0,0,0.03)",
    },
  },

  // ─── Midnight Aurora (Pro) ─────────────────────────────────────────────────
  {
    id: "midnight_aurora",
    name: "Midnight Aurora",
    description: "Deep violet cosmos with aurora-tinted surfaces.",
    isPro: true,
    previewGradient: ["#0A0618", "#140D2F", "#0D0820"],
    previewAccent: "#8257E6",
    dark: {
      background: "#07040F",
      backgroundGradientStart: "#07040F",
      backgroundGradientEnd: "#100828",
      card: "rgba(38, 22, 68, 0.60)",
      cardBorder: "rgba(80, 50, 140, 0.35)",
      cardSolid: "#130B24",
      tabBar: "rgba(10, 6, 22, 0.88)",
      tabBarBorder: "rgba(80, 50, 140, 0.22)",
      blob1: "rgba(130, 87, 230, 0.09)",
      blob2: "rgba(89, 46, 200, 0.06)",
      separator: "rgba(130, 87, 230, 0.14)",
      inputBackground: "rgba(38, 22, 68, 0.60)",
      inputBorder: "rgba(80, 50, 140, 0.35)",
      skeletonBase: "rgba(130, 87, 230, 0.09)",
      skeletonHighlight: "rgba(130, 87, 230, 0.04)",
    },
    light: {
      background: "#F4F0FB",
      backgroundGradientStart: "#F4F0FB",
      backgroundGradientEnd: "#EAE2F8",
      card: "rgba(180, 160, 240, 0.14)",
      cardBorder: "rgba(130, 87, 230, 0.20)",
      cardSolid: "#FDFBFF",
      tabBar: "rgba(244, 240, 251, 0.88)",
      tabBarBorder: "rgba(130, 87, 230, 0.12)",
      blob1: "rgba(130, 87, 230, 0.08)",
      blob2: "rgba(130, 87, 230, 0.05)",
      separator: "rgba(130, 87, 230, 0.09)",
      inputBackground: "rgba(180, 160, 240, 0.14)",
      inputBorder: "rgba(130, 87, 230, 0.20)",
      skeletonBase: "rgba(130, 87, 230, 0.07)",
      skeletonHighlight: "rgba(130, 87, 230, 0.03)",
    },
  },

  // ─── Obsidian Prestige (Pro) ───────────────────────────────────────────────
  {
    id: "obsidian_prestige",
    name: "Obsidian Prestige",
    description: "Warm amber-tinted luxury black for serious scholars.",
    isPro: true,
    previewGradient: ["#080603", "#1C150A", "#0A0804"],
    previewAccent: "#D4AF37",
    dark: {
      background: "#080603",
      backgroundGradientStart: "#080603",
      backgroundGradientEnd: "#130F07",
      card: "rgba(36, 28, 14, 0.82)",
      cardBorder: "rgba(100, 80, 30, 0.38)",
      cardSolid: "#120E06",
      tabBar: "rgba(8, 6, 3, 0.94)",
      tabBarBorder: "rgba(100, 80, 30, 0.22)",
      blob1: "rgba(212, 175, 55, 0.08)",
      blob2: "rgba(180, 140, 30, 0.05)",
      separator: "rgba(212, 175, 55, 0.12)",
      inputBackground: "rgba(36, 28, 14, 0.82)",
      inputBorder: "rgba(100, 80, 30, 0.38)",
      skeletonBase: "rgba(212, 175, 55, 0.08)",
      skeletonHighlight: "rgba(212, 175, 55, 0.04)",
    },
    light: {
      background: "#FDFAF3",
      backgroundGradientStart: "#FDFAF3",
      backgroundGradientEnd: "#F5EDD8",
      card: "rgba(255, 240, 200, 0.32)",
      cardBorder: "rgba(180, 140, 60, 0.22)",
      cardSolid: "#FFFDF7",
      tabBar: "rgba(253, 250, 243, 0.92)",
      tabBarBorder: "rgba(180, 140, 60, 0.12)",
      blob1: "rgba(212, 175, 55, 0.08)",
      blob2: "rgba(180, 140, 30, 0.05)",
      separator: "rgba(180, 140, 60, 0.09)",
      inputBackground: "rgba(255, 240, 200, 0.32)",
      inputBorder: "rgba(180, 140, 60, 0.22)",
      skeletonBase: "rgba(180, 140, 60, 0.07)",
      skeletonHighlight: "rgba(180, 140, 60, 0.03)",
    },
  },

  // ─── Cyber Constellation (Pro) ─────────────────────────────────────────────
  {
    id: "cyber_constellation",
    name: "Cyber Constellation",
    description: "Electric deep-navy surfaces with quantum edge.",
    isPro: true,
    previewGradient: ["#020510", "#070F28", "#010308"],
    previewAccent: "#00F0FF",
    dark: {
      background: "#020510",
      backgroundGradientStart: "#020510",
      backgroundGradientEnd: "#060D22",
      card: "rgba(8, 20, 50, 0.78)",
      cardBorder: "rgba(0, 200, 255, 0.20)",
      cardSolid: "#050C1E",
      tabBar: "rgba(2, 5, 16, 0.94)",
      tabBarBorder: "rgba(0, 200, 255, 0.14)",
      blob1: "rgba(0, 240, 255, 0.07)",
      blob2: "rgba(0, 150, 200, 0.05)",
      separator: "rgba(0, 200, 255, 0.12)",
      inputBackground: "rgba(8, 20, 50, 0.78)",
      inputBorder: "rgba(0, 200, 255, 0.20)",
      skeletonBase: "rgba(0, 240, 255, 0.07)",
      skeletonHighlight: "rgba(0, 240, 255, 0.03)",
    },
    light: {
      background: "#F0F6FF",
      backgroundGradientStart: "#F0F6FF",
      backgroundGradientEnd: "#DDF0FA",
      card: "rgba(180, 220, 255, 0.22)",
      cardBorder: "rgba(0, 150, 200, 0.22)",
      cardSolid: "#F8FCFF",
      tabBar: "rgba(240, 246, 255, 0.92)",
      tabBarBorder: "rgba(0, 150, 200, 0.12)",
      blob1: "rgba(0, 200, 255, 0.08)",
      blob2: "rgba(0, 150, 200, 0.05)",
      separator: "rgba(0, 150, 200, 0.09)",
      inputBackground: "rgba(180, 220, 255, 0.22)",
      inputBorder: "rgba(0, 150, 200, 0.22)",
      skeletonBase: "rgba(0, 200, 255, 0.07)",
      skeletonHighlight: "rgba(0, 200, 255, 0.03)",
    },
  },

  // ─── Academic Ruby (Pro) ───────────────────────────────────────────────────
  {
    id: "academic_ruby",
    name: "Academic Ruby",
    description: "Scholarly crimson depth for focused academic minds.",
    isPro: true,
    previewGradient: ["#16080C", "#2F0F19", "#0D0507"],
    previewAccent: "#FF2D55",
    dark: {
      background: "#0E0508",
      backgroundGradientStart: "#0E0508",
      backgroundGradientEnd: "#200A10",
      card: "rgba(60, 15, 25, 0.72)",
      cardBorder: "rgba(180, 40, 70, 0.30)",
      cardSolid: "#180A0F",
      tabBar: "rgba(14, 5, 8, 0.94)",
      tabBarBorder: "rgba(180, 40, 70, 0.18)",
      blob1: "rgba(255, 45, 85, 0.08)",
      blob2: "rgba(200, 30, 60, 0.05)",
      separator: "rgba(180, 40, 70, 0.14)",
      inputBackground: "rgba(60, 15, 25, 0.72)",
      inputBorder: "rgba(180, 40, 70, 0.30)",
      skeletonBase: "rgba(255, 45, 85, 0.08)",
      skeletonHighlight: "rgba(255, 45, 85, 0.04)",
    },
    light: {
      background: "#FDF4F6",
      backgroundGradientStart: "#FDF4F6",
      backgroundGradientEnd: "#FAE6EA",
      card: "rgba(255, 180, 195, 0.20)",
      cardBorder: "rgba(200, 60, 90, 0.20)",
      cardSolid: "#FFFBFC",
      tabBar: "rgba(253, 244, 246, 0.92)",
      tabBarBorder: "rgba(200, 60, 90, 0.12)",
      blob1: "rgba(255, 45, 85, 0.08)",
      blob2: "rgba(200, 30, 60, 0.05)",
      separator: "rgba(200, 60, 90, 0.09)",
      inputBackground: "rgba(255, 180, 195, 0.20)",
      inputBorder: "rgba(200, 60, 90, 0.20)",
      skeletonBase: "rgba(200, 60, 90, 0.07)",
      skeletonHighlight: "rgba(200, 60, 90, 0.03)",
    },
  },

  // ─── Forest Depths (Pro) ───────────────────────────────────────────────────
  {
    id: "forest_depths",
    name: "Forest Depths",
    description: "Ancient forest greens for grounded, focused sessions.",
    isPro: true,
    previewGradient: ["#030F08", "#071A0D", "#020A05"],
    previewAccent: "#30D158",
    dark: {
      background: "#030F08",
      backgroundGradientStart: "#030F08",
      backgroundGradientEnd: "#071A0D",
      card: "rgba(12, 40, 20, 0.78)",
      cardBorder: "rgba(40, 120, 65, 0.30)",
      cardSolid: "#061408",
      tabBar: "rgba(3, 15, 8, 0.94)",
      tabBarBorder: "rgba(40, 120, 65, 0.18)",
      blob1: "rgba(48, 209, 88, 0.07)",
      blob2: "rgba(30, 160, 65, 0.05)",
      separator: "rgba(40, 120, 65, 0.14)",
      inputBackground: "rgba(12, 40, 20, 0.78)",
      inputBorder: "rgba(40, 120, 65, 0.30)",
      skeletonBase: "rgba(48, 209, 88, 0.08)",
      skeletonHighlight: "rgba(48, 209, 88, 0.04)",
    },
    light: {
      background: "#F2FAF4",
      backgroundGradientStart: "#F2FAF4",
      backgroundGradientEnd: "#E3F5E7",
      card: "rgba(160, 220, 175, 0.20)",
      cardBorder: "rgba(48, 160, 80, 0.20)",
      cardSolid: "#FAFFFC",
      tabBar: "rgba(242, 250, 244, 0.92)",
      tabBarBorder: "rgba(48, 160, 80, 0.12)",
      blob1: "rgba(48, 209, 88, 0.08)",
      blob2: "rgba(30, 160, 65, 0.05)",
      separator: "rgba(48, 160, 80, 0.09)",
      inputBackground: "rgba(160, 220, 175, 0.20)",
      inputBorder: "rgba(48, 160, 80, 0.20)",
      skeletonBase: "rgba(48, 160, 80, 0.07)",
      skeletonHighlight: "rgba(48, 160, 80, 0.03)",
    },
  },

  // ─── Pure Onyx (Pro) ───────────────────────────────────────────────────────
  {
    id: "pure_onyx",
    name: "Pure Onyx",
    description: "True AMOLED black. Minimal. Powerful. Timeless.",
    isPro: true,
    previewGradient: ["#000000", "#080808", "#000000"],
    previewAccent: "#FFFFFF",
    dark: {
      background: "#000000",
      backgroundGradientStart: "#000000",
      backgroundGradientEnd: "#050505",
      card: "rgba(18, 18, 18, 0.92)",
      cardBorder: "rgba(60, 60, 60, 0.52)",
      cardSolid: "#0A0A0A",
      tabBar: "rgba(0, 0, 0, 0.98)",
      tabBarBorder: "rgba(60, 60, 60, 0.28)",
      blob1: "rgba(255,255,255,0.03)",
      blob2: "rgba(255,255,255,0.02)",
      separator: "rgba(255,255,255,0.08)",
      inputBackground: "rgba(18, 18, 18, 0.92)",
      inputBorder: "rgba(60, 60, 60, 0.52)",
      skeletonBase: "rgba(255,255,255,0.06)",
      skeletonHighlight: "rgba(255,255,255,0.02)",
    },
    light: {
      background: "#FFFFFF",
      backgroundGradientStart: "#FFFFFF",
      backgroundGradientEnd: "#F8F8F8",
      card: "rgba(240, 240, 240, 0.62)",
      cardBorder: "rgba(0, 0, 0, 0.09)",
      cardSolid: "#FAFAFA",
      tabBar: "rgba(255,255,255,0.96)",
      tabBarBorder: "rgba(0, 0, 0, 0.06)",
      blob1: "rgba(0, 0, 0, 0.02)",
      blob2: "rgba(0, 0, 0, 0.01)",
      separator: "rgba(0, 0, 0, 0.06)",
      inputBackground: "rgba(240, 240, 240, 0.62)",
      inputBorder: "rgba(0, 0, 0, 0.09)",
      skeletonBase: "rgba(0,0,0,0.05)",
      skeletonHighlight: "rgba(0,0,0,0.02)",
    },
  },

  // ─── True Black (Pro) — Groundwork Pro Exclusive ───────────────────────────
  {
    id: "true_black",
    name: "True Black",
    description: "Pure black OLED-optimized theme for Groundwork Pro users.",
    isPro: true,
    previewGradient: ["#000000", "#000000", "#000000"],
    previewAccent: "#FFFFFF",
    dark: {
      background: "#000000",
      backgroundGradientStart: "#000000",
      backgroundGradientEnd: "#000000",
      // Cards: very subtle elevation using delicate borders and low-contrast highlights
      card: "rgba(255,255,255,0.02)",
      cardBorder: "rgba(255,255,255,0.04)",
      cardSolid: "#000000",
      tabBar: "#000000",
      tabBarBorder: "rgba(255,255,255,0.04)",
      blob1: "rgba(255,255,255,0.03)",
      blob2: "rgba(255,255,255,0.02)",
      separator: "rgba(255,255,255,0.06)",
      inputBackground: "rgba(255,255,255,0.02)",
      inputBorder: "rgba(255,255,255,0.04)",
      skeletonBase: "rgba(255,255,255,0.04)",
      skeletonHighlight: "rgba(255,255,255,0.02)",
    },
    light: {
      background: "#FFFFFF",
      backgroundGradientStart: "#FFFFFF",
      backgroundGradientEnd: "#F8F8F8",
      card: "rgba(240,240,240,0.62)",
      cardBorder: "rgba(0,0,0,0.09)",
      cardSolid: "#FAFAFA",
      tabBar: "rgba(255,255,255,0.96)",
      tabBarBorder: "rgba(0,0,0,0.06)",
      blob1: "rgba(0,0,0,0.02)",
      blob2: "rgba(0,0,0,0.01)",
      separator: "rgba(0,0,0,0.06)",
      inputBackground: "rgba(240,240,240,0.62)",
      inputBorder: "rgba(0,0,0,0.09)",
      skeletonBase: "rgba(0,0,0,0.05)",
      skeletonHighlight: "rgba(0,0,0,0.02)",
    },
  },
];

/** Look up a theme by ID, falling back to the default Groundwork theme. */
export const getThemeById = (id: string): PremiumTheme =>
  PREMIUM_THEMES.find((t) => t.id === id) ?? PREMIUM_THEMES[0];
