export const DesignTokens = {
  colors: {
    // Primary academic gradients (blue to purple)
    gradientStart: 'hsl(220, 70%, 55%)', // #3b76f6-ish
    gradientEnd: 'hsl(260, 50%, 60%)',   // #886ee6-ish
    
    // Status/Consistency colors
    beginner: '#94A3B8', // Slate-400
    strong: '#3B82F6',   // Blue-500
    elite: '#8B5CF6',    // Violet-500
    master: '#EC4899',   // Pink-500

    // Status Indicator colors
    statusActive: '#10B981', // Green-500
    statusConsistent: '#3B82F6', // Blue-500
    statusFocus: '#8B5CF6', // Purple-500
    statusInactive: '#64748B', // Slate-500

    // Card Colors (Light/Dark transparency settings)
    cardBgLight: 'rgba(255, 255, 255, 0.10)', // softer glassy white
    cardBgDark: 'rgba(28, 28, 30, 0.75)',
    cardBorderLight: 'rgba(230, 230, 235, 0.30)',
    cardBorderDark: 'rgba(48, 48, 52, 0.8)',
    
    // Levels color
    levelGlowColor: 'rgba(139, 92, 246, 0.25)',
  },
  
  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    premium: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },

  fonts: {
    bold: 'Inter_800ExtraBold',
    semiBold: 'Inter_700Bold',
    medium: 'Inter_600SemiBold',
    regular: 'Inter_500Medium',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
};

/** Merge theme accent into Connect design tokens */
export function getConnectTokens(accent: string) {
  return {
    ...DesignTokens,
    colors: {
      ...DesignTokens.colors,
      gradientStart: accent,
      gradientEnd: accent + '99',
    },
  };
}
