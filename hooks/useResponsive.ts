import { useWindowDimensions, Platform } from 'react-native';

export type LayoutBreakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isWeb: boolean;
  layout: LayoutBreakpoint;
  contentMaxWidth: number;
  horizontalPadding: number;
}

/**
 * Shared responsive hook enforcing Groundwork's 3 intentional layouts:
 * - Mobile:  < 768px
 * - Tablet:  768px - 1099px
 * - Desktop: >= 1100px (with wide monitor support at >= 1440px)
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;
  const isWide = width >= 1440;

  const layout: LayoutBreakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';

  // Desktop fluid workspace constrained to comfortable maximums with generous margins
  const contentMaxWidth = isWide ? 1280 : isDesktop ? 1160 : isTablet ? 960 : 640;
  const horizontalPadding = isDesktop ? 40 : isTablet ? 32 : 20;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isWeb,
    layout,
    contentMaxWidth,
    horizontalPadding,
  };
}

/**
 * Utility to choose values based on current layout
 */
export function selectResponsive<T>(
  layout: LayoutBreakpoint,
  values: { mobile: T; tablet?: T; desktop: T }
): T {
  if (layout === 'desktop') return values.desktop;
  if (layout === 'tablet' && values.tablet !== undefined) return values.tablet;
  return values.mobile;
}
