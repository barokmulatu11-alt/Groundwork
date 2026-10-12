import { getThemeById } from "@/lib/premiumThemes";
import { isPro } from "@/lib/subscriptionService";
import { useSettingsStore } from "@/store/useSettingsStore";
import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";
export const lightTheme = {
  isDark: false,
  background: "#FAF7F2",
  backgroundGradientStart: "#FAF7F2",
  backgroundGradientEnd: "#F0EDE8",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.08)",
  cardSolid: "#FFFFFF",
  primaryText: "#1C1C1E",
  secondaryText: "#6E6E73",
  tertiaryText: "#8E8E93",
  accent: "#007AFF",
  accentLight: "rgba(0,122,255,0.08)",
  accentBorder: "rgba(0,122,255,0.2)",
  success: "#34C759",
  successLight: "rgba(52,199,89,0.08)",
  warning: "#FF9500",
  warningLight: "rgba(255,149,0,0.08)",
  danger: "#FF3B30",
  dangerLight: "rgba(255,59,48,0.08)",
  separator: "rgba(0,0,0,0.06)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.4)",
  inputBackground: "#FFFFFF",
  inputBorder: "rgba(0, 0, 0, 0.10)",
  tabBar: "rgba(255,255,255,0.85)",
  tabBarBorder: "rgba(0,0,0,0.06)",
  blob1: "rgba(0,122,255,0.03)",
  blob2: "rgba(0,122,255,0.03)",
  skeletonBase: "rgba(0,0,0,0.06)",
  skeletonHighlight: "rgba(0,0,0,0.03)",
  switchTrackFalse: "#E5E5EA",
  switchTrackTrue: "#007AFF",
  switchThumb: "#FFFFFF",
  checkboxBorder: "#007AFF",
  checkboxFill: "#007AFF",
  pillActive: "#007AFF",
  pillInactive: "#FFFFFF",
  pillInactiveBorder: "rgba(0, 0, 0, 0.08)",
  pillInactiveText: "#1C1C1E",
  statusBar: "dark-content" as "dark-content",
};

export const darkTheme = {
  isDark: true,
  background: "#080C14",
  backgroundGradientStart: "#080C14",
  backgroundGradientEnd: "#0d1525",
  card: "#121A28",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  cardSolid: "#111827",
  primaryText: "#F2F2F7",
  secondaryText: "#8E8E93",
  tertiaryText: "#636366",
  accent: "#007AFF",
  accentLight: "rgba(0,122,255,0.15)",
  accentBorder: "rgba(0,122,255,0.3)",
  success: "#34C759",
  successLight: "rgba(52,199,89,0.15)",
  warning: "#FF9500",
  warningLight: "rgba(255,149,0,0.15)",
  danger: "#FF3B30",
  dangerLight: "rgba(255,59,48,0.15)",
  separator: "rgba(255,255,255,0.06)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.7)",
  inputBackground: "#121A28",
  inputBorder: "rgba(255, 255, 255, 0.10)",
  tabBar: "rgba(8,12,20,0.85)",
  tabBarBorder: "rgba(255,255,255,0.06)",
  blob1: "rgba(0,122,255,0.04)",
  blob2: "rgba(0,122,255,0.04)",
  skeletonBase: "rgba(255,255,255,0.06)",
  skeletonHighlight: "rgba(255,255,255,0.03)",
  switchTrackFalse: "#39393D",
  switchTrackTrue: "#007AFF",
  switchThumb: "#FFFFFF",
  checkboxBorder: "#007AFF",
  checkboxFill: "#007AFF",
  pillActive: "#007AFF",
  pillInactive: "#121A28",
  pillInactiveBorder: "rgba(255, 255, 255, 0.08)",
  pillInactiveText: "#F2F2F7",
  statusBar: "light-content" as "light-content",
};

type BaseTheme = typeof lightTheme;
export type Theme = Omit<BaseTheme, "statusBar"> & {
  statusBar: "light-content" | "dark-content";
};

import { NativePopup } from "@/components/ui/NativePopup";

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  primaryButton?: {
    text: string;
    onPress: () => void;
    destructive?: boolean;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
  };
}

const ThemeContext = createContext<{
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  showAlert: (config: Omit<AlertState, "visible">) => void;
  hideAlert: () => void;
  previewTheme: (id: string) => void;
  clearPreview: () => void;
}>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  showAlert: () => {},
  hideAlert: () => {},
  previewTheme: () => {},
  clearPreview: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const {
    theme: storedTheme,
    setTheme,
    accentColor,
    premiumThemeId,
  } = useSettingsStore();

  const isDark =
    storedTheme === "system"
      ? systemColorScheme === "dark"
      : storedTheme === "dark";

  const baseTheme = isDark ? darkTheme : lightTheme;

  // Preview override: allow temporary previewing of premium themes without persisting
  const [previewPremiumThemeId, setPreviewPremiumThemeId] = React.useState<
    string | null
  >(null);

  // Resolve premium theme surface overrides (preview takes precedence)
  // Business logic gate: fall back to default if user is not Pro and theme requires it
  const resolvedPremiumId = (() => {
    const candidateId = previewPremiumThemeId ?? premiumThemeId ?? 'default';
    const candidate = getThemeById(candidateId);
    if (candidate.isPro && !isPro()) return 'default';
    return candidateId;
  })();
  const premiumTheme = getThemeById(resolvedPremiumId);
  const premiumVariant = isDark ? premiumTheme.dark : premiumTheme.light;

  const opacityLight = isDark ? "26" : "14";
  const opacityBorder = isDark ? "4D" : "33";

  const theme: Theme = {
    ...baseTheme,
    // Premium surface overrides (backgrounds, cards, blobs, tab bar)
    background: premiumVariant.background,
    backgroundGradientStart: premiumVariant.backgroundGradientStart,
    backgroundGradientEnd: premiumVariant.backgroundGradientEnd,
    card: premiumVariant.card,
    cardBorder: premiumVariant.cardBorder,
    cardSolid: premiumVariant.cardSolid,
    tabBar: premiumVariant.tabBar,
    tabBarBorder: premiumVariant.tabBarBorder,
    blob1: premiumVariant.blob1,
    blob2: premiumVariant.blob2,
    separator: premiumVariant.separator,
    inputBackground: premiumVariant.inputBackground,
    inputBorder: premiumVariant.inputBorder,
    skeletonBase: premiumVariant.skeletonBase,
    skeletonHighlight: premiumVariant.skeletonHighlight,
    // User's accent color always takes priority
    accent: accentColor,
    accentLight: accentColor + opacityLight,
    accentBorder: accentColor + opacityBorder,
    switchTrackTrue: accentColor,
    checkboxBorder: accentColor,
    checkboxFill: accentColor,
    pillActive: accentColor,
  };

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const previewTheme = (id: string) => setPreviewPremiumThemeId(id);
  const clearPreview = () => setPreviewPremiumThemeId(null);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const showAlert = (config: Omit<AlertState, "visible">) => {
    setAlert({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        showAlert,
        hideAlert,
        previewTheme,
        clearPreview,
      }}
    >
      {children}
      <NativePopup
        visible={alert.visible}
        onClose={hideAlert}
        title={alert.title}
        message={alert.message}
        theme={theme}
        isDark={isDark}
        primaryButton={
          alert.primaryButton
            ? {
                ...alert.primaryButton,
                onPress: () => {
                  alert.primaryButton?.onPress();
                  hideAlert();
                },
              }
            : undefined
        }
        secondaryButton={
          alert.secondaryButton
            ? {
                ...alert.secondaryButton,
                onPress: () => {
                  alert.secondaryButton?.onPress();
                  hideAlert();
                },
              }
            : undefined
        }
      />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
