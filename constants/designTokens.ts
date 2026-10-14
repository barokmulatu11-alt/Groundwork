export const DesignTokens = {
  colors: {
    pureBlack: '#000000',
    warmIvory: '#F5F2EB',
    secondaryGray: '#A3A099',
    tertiaryGray: '#787571',
    thinDivider: 'rgba(255, 255, 255, 0.12)',

    // Light Theme Tokens
    offWhite: '#FAF9F6',
    nearBlack: '#141312',
    secondaryGrayLight: '#686662',
    tertiaryGrayLight: '#8E8C87',
    thinDividerLight: 'rgba(0, 0, 0, 0.08)',

    accentBlue: '#0066FF',
    accentBlueHover: '#0052CC',
    accentBlueSubtle: 'rgba(0, 102, 255, 0.15)',
    gradientStart: '#0066FF',
    gradientEnd: '#0052CC',

    // Status colors
    beginner: '#8E8C87',
    strong: '#0066FF',
    elite: '#8B5CF6',
    master: '#EC4899',

    statusActive: '#10B981',
    statusConsistent: '#0066FF',
    statusFocus: '#8B5CF6',
    statusInactive: '#5A5854',

    // Surfaces
    cardBgLight: '#FFFFFF',
    cardBgDark: '#000000',
    cardBorderLight: 'rgba(0, 0, 0, 0.08)',
    cardBorderDark: 'rgba(255, 255, 255, 0.12)',
  },

  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    premium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
  },

  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: 9999,
  },

  fonts: {
    // Sans-serif headings & labels
    heading: 'Inter_800ExtraBold',
    bold: 'Inter_700Bold',
    semiBold: 'Inter_600SemiBold',
    medium: 'Inter_500Medium',
    regular: 'Inter_400Regular',

    // High-contrast Serif numerals and editorial headings
    serifNumerals: 'PlayfairDisplay_700Bold',
    serifEditorial: 'PlayfairDisplay_600SemiBold',
    serifRegular: 'PlayfairDisplay_400Regular',
    serifItalic: 'PlayfairDisplay_400Regular_Italic',
    serifBold: 'PlayfairDisplay_700Bold',
    serifExtraBold: 'PlayfairDisplay_800ExtraBold',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
};

/** Merge theme accent into Connect design tokens */
export function getConnectTokens(accent: string) {
  return {
    ...DesignTokens,
    colors: {
      ...DesignTokens.colors,
      accentBlue: accent,
      accentBlueSubtle: accent + '26',
    },
  };
}
