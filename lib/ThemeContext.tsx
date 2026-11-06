import { getThemeById } from "@/lib/premiumThemes";
import { isPro } from "@/lib/subscriptionService";
import { useSettingsStore } from "@/store/useSettingsStore";
import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";
export const lightTheme = {
  isDark: false,
  background: "#FAF9F6",
  backgroundGradientStart: "#FAF9F6",
  backgroundGradientEnd: "#FAF9F6",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 0, 0, 0.08)",
  cardSolid: "#FFFFFF",
  primaryText: "#141312",
  secondaryText: "#686662",
  tertiaryText: "#8E8C87",
  text: "#141312",
  textSecondary: "#686662",
  textTertiary: "#8E8C87",
  textMuted: "#686662",
  accent: "#0066FF",
  accentLight: "rgba(0, 102, 255, 0.08)",
  accentBorder: "rgba(0, 102, 255, 0.25)",
  success: "#10B981",
  successLight: "rgba(16,185,129,0.08)",
  warning: "#D97706",
  warningLight: "rgba(217,119,6,0.08)",
  danger: "#EF4444",
  dangerLight: "rgba(239,68,68,0.08)",
  separator: "rgba(0, 0, 0, 0.08)",
  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.45)",
  inputBackground: "#F2EFE9",
  inputBorder: "rgba(0, 0, 0, 0.12)",
  tabBar: "#FAF9F6",
  tabBarBorder: "rgba(0, 0, 0, 0.08)",
  blob1: "transparent",
  blob2: "transparent",
  skeletonBase: "rgba(0,0,0,0.05)",
  skeletonHighlight: "rgba(0,0,0,0.02)",
  switchTrackFalse: "#E2E8F0",
  switchTrackTrue: "#0066FF",
  switchThumb: "#FFFFFF",
  checkboxBorder: "rgba(0, 0, 0, 0.25)",
  checkboxFill: "#0066FF",
  pillActive: "#0066FF",
  pillInactive: "#F2EFE9",
  pillInactiveBorder: "rgba(0, 0, 0, 0.08)",
  pillInactiveText: "#141312",
  statusBar: "dark-content" as "dark-content",
};

export const darkTheme = {
  isDark: true,
  background: "#000000",
  backgroundGradientStart: "#000000",
  backgroundGradientEnd: "#000000",
  card: "#000000",
  cardBorder: "rgba(255, 255, 255, 0.12)",
  cardSolid: "#0A0A0A",
  primaryText: "#F5F2EB",
  secondaryText: "#A3A099",
  tertiaryText: "#787571",
  text: "#F5F2EB",
  textSecondary: "#A3A099",
  textTertiary: "#787571",
  textMuted: "#A3A099",
  accent: "#0066FF",
  accentLight: "rgba(0,102,255,0.15)",
  accentBorder: "rgba(0,102,255,0.30)",
  success: "#10B981",
  successLight: "rgba(16,185,129,0.15)",
  warning: "#F59E0B",
  warningLight: "rgba(245,158,11,0.15)",
  danger: "#EF4444",
  dangerLight: "rgba(239,68,68,0.15)",
  separator: "rgba(255,255,255,0.12)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.85)",
  inputBackground: "#0A0A0A",
  inputBorder: "rgba(255, 255, 255, 0.14)",
  tabBar: "#000000",
  tabBarBorder: "rgba(255, 255, 255, 0.12)",
  blob1: "transparent",
  blob2: "transparent",
  skeletonBase: "rgba(255,255,255,0.06)",
  skeletonHighlight: "rgba(255,255,255,0.03)",
  switchTrackFalse: "#262626",
  switchTrackTrue: "#0066FF",
  switchThumb: "#FFFFFF",
  checkboxBorder: "rgba(255, 255, 255, 0.25)",
  checkboxFill: "#0066FF",
  pillActive: "#0066FF",
  pillInactive: "#0A0A0A",
  pillInactiveBorder: "rgba(255, 255, 255, 0.10)",
  pillInactiveText: "#F5F2EB",
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
    storedTheme === "dark" ? true : storedTheme === "light" ? false : storedTheme === "system" ? systemColorScheme === "dark" : false;

  const baseTheme = isDark ? darkTheme : lightTheme;

  // Preview override: allow temporary previewing of premium themes without persisting
  const [previewPremiumThemeId, setPreviewPremiumThemeId] = React.useState<
    string | null
  >(null);

  // Resolve premium theme surface overrides (preview takes precedence)
  // Business logic gate: fall back to default if user is not Pro and theme requires it
  const resolvedPremiumId = previewPremiumThemeId ?? premiumThemeId ?? 'default';
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
