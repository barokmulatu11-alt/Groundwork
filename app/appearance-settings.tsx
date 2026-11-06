import { BackgroundGradient } from "@/components/BackgroundGradient";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { AppText as Text } from "@/components/ui/AppText";
import { hapticLight, hapticSelection, hapticSuccess } from "@/lib/haptics";
import { LOGO_VARIANTS, LogoVariant, LogoVariantId, useLogoStore } from "@/lib/logoStore";
import { PREMIUM_THEMES } from "@/lib/premiumThemes";
import { canUsePremiumTheme, trackProEvent } from "@/lib/subscriptionService";
import { isRewardUnlocked, initializeAccountRewards } from "@/lib/rewardsService";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Check,
    ChevronLeft,
    Crown,
    Lock,
    Monitor,
    Moon,
    Sparkles,
    Sun,
    Award,
    AlertCircle,
    RotateCw,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { name: "Blue", color: "#007AFF" },
  { name: "Sky Blue", color: "#00B4D8" },
  { name: "Cyan", color: "#00D9FF" },
  { name: "Teal", color: "#0BA084" },
  { name: "Mint", color: "#56E5D2" },
  { name: "Emerald", color: "#10B981" },
  { name: "Green", color: "#34C759" },
  { name: "Lime", color: "#BFFF00" },
  { name: "Yellow", color: "#FFD60A" },
  { name: "Amber", color: "#FCA311" },
  { name: "Orange", color: "#FF9500" },
  { name: "Deep Orange", color: "#FF6B35" },
  { name: "Coral", color: "#FF6B6B" },
  { name: "Red", color: "#FF3B30" },
  { name: "Rose", color: "#F43F5E" },
  { name: "Pink", color: "#EC4899" },
  { name: "Magenta", color: "#D946EF" },
  { name: "Purple", color: "#AF52DE" },
  { name: "Violet", color: "#8B5CF6" },
  { name: "Indigo", color: "#5856D6" },
  { name: "Lavender", color: "#A78BFA" },
  { name: "Gold", color: "#D4AF37" },
  { name: "Bronze", color: "#CD7F32" },
  { name: "Silver", color: "#C0C0C0" },
  { name: "Slate", color: "#64748B" },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

// Renders an uppercase section header label
function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
      {label}
    </Text>
  );
}

interface SegmentedControlProps {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  theme: any;
  accentColor: string;
}

// A row of pressable segments where only one can be active at a time (like a tab bar)
function SegmentedControl({
  options,
  value,
  onChange,
  theme,
  accentColor,
}: SegmentedControlProps) {
  return (
    <View style={[styles.segmentedTrack, { backgroundColor: "transparent" }]}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            testID={`theme-segment-${opt.value}`}
            accessibilityRole="button"
            accessibilityLabel={`${opt.label} theme`}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segmentButton,
              active && { backgroundColor: "transparent" },
            ]}
          >
            {opt.icon && (
              <View style={{ marginBottom: 4 }}>
                {React.cloneElement(opt.icon as any, {
                  size: 16,
                  color: active ? accentColor : theme.tertiaryText,
                })}
              </View>
            )}
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? accentColor : theme.tertiaryText },
                active && { fontFamily: "Inter_700Bold" },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// A rounded container card used to group related settings
function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.cardSolid, borderWidth: 1, borderColor: theme.separator }]}>
      {children}
    </View>
  );
}

// ─── Compact Accent Color Pill ────────────────────────────────────────────────

interface AccentColorPillProps {
  color: string;
  name: string;
  isActive: boolean;
  onPress: () => void;
}

// A circular color swatch with a spring scale animation. Tapping selects the accent color.
function AccentColorPill({
  color,
  name,
  isActive,
  onPress,
}: AccentColorPillProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
    hapticSelection();
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.accentPillContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        testID={`accent-color-${name.toLowerCase().replace(/\s+/g, '-')}`}
        accessibilityRole="button"
        accessibilityLabel={`Accent color ${name}`}
        onPress={handlePress}
        style={[
          styles.accentPill,
          {
            backgroundColor: color,
            borderWidth: isActive ? 3 : 0,
            borderColor: isActive ? color : "transparent",
          },
        ]}
      >
        {isActive && (
          <View style={styles.accentPillCheckmark}>
            <Check size={9} color="#FFF" strokeWidth={4} />
          </View>
        )}
      </Pressable>
      <Text
        style={[styles.accentPillLabel, { opacity: isActive ? 1 : 0.6 }]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Animated.View>
  );
}

// ─── Compact Theme Pill ──────────────────────────────────────────────────────

interface CompactThemePillProps {
  themeItem: (typeof PREMIUM_THEMES)[0];
  isSelected: boolean;
  isPro: boolean;
  accentColor: string;
  theme: any;
  onPress: () => void;
  onLockedPress: () => void;
  onPreviewPress?: () => void;
}

// A compact pill for premium themes — shows a gradient preview, lock icon for Pro-gated items,
// and handles tap-to-unlock or preview flows depending on subscription status
function CompactThemePill({
  themeItem,
  isSelected,
  isPro,
  accentColor,
  theme,
  onPress,
  onLockedPress,
  onPreviewPress,
}: CompactThemePillProps) {
  const locked = themeItem.isPro && !isPro;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    if (locked) {
      if (themeItem.id === "true_black" && onPreviewPress) {
        hapticSelection();
        onPreviewPress();
      } else {
        hapticLight();
        onLockedPress();
      }
    } else {
      hapticSelection();
      onPress();
    }
  };

  return (
    <Animated.View
      style={[styles.themePillContainer, { transform: [{ scale: scaleAnim }] }]}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.themePill,
          {
            borderColor: isSelected ? accentColor : theme.cardBorder,
            borderWidth: isSelected ? 2 : 1,
            opacity: locked && !isSelected ? 0.65 : 1,
          },
        ]}
      >
        {/* Mini gradient preview */}
        <LinearGradient
          colors={themeItem.previewGradient}
          style={styles.themePillPreview}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
        />

        {/* Active check */}
        {isSelected && (
          <View
            style={[styles.themePillCheck, { backgroundColor: accentColor }]}
          >
            <Check size={10} color="#FFF" strokeWidth={3} />
          </View>
        )}

        {/* Lock icon */}
        {locked && (
          <View style={styles.themePillLock}>
            <Lock size={12} color="#FFF" />
          </View>
        )}
      </Pressable>

      {/* Pill label */}
      <View style={styles.themePillMeta}>
        <Text
          style={[styles.themePillName, { color: theme.primaryText }]}
          numberOfLines={1}
        >
          {themeItem.name}
        </Text>
        {locked && (
          <Lock size={10} color={accentColor} style={{ marginLeft: 4 }} />
        )}
        {themeItem.isPro && !locked && (
          <Crown size={10} color={accentColor} style={{ marginLeft: 4 }} />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Logo Mark (inline renderer, no image assets) ────────────────────────────

// Renders the "g." logo mark as pure RN primitives — no image files needed.
// Supports gradient backgrounds, glow effects, and responsive sizing.
function LogoMark({ variant, size = "md" }: { variant: LogoVariant; size?: "sm" | "md" }) {
  const dim = size === "sm" ? 52 : 72;
  const fontSize = size === "sm" ? 24 : 34;
  const radius = size === "sm" ? 14 : 20;

  const textStyle = {
    fontSize,
    fontFamily: "Inter_800ExtraBold" as const,
    letterSpacing: -1,
    includeFontPadding: false,
    textAlignVertical: "center" as const,
    lineHeight: dim * 0.75,
    height: dim,
    textAlign: "center" as const,
  };

  return (
    <View
      style={{
        width: dim, height: dim, borderRadius: radius,
        backgroundColor: variant.background,
        alignItems: "center", justifyContent: "center",
        shadowColor: variant.glowColor ?? variant.letterColor,
        shadowOpacity: variant.glowColor ? 0.65 : 0.18,
        shadowRadius: variant.glowColor ? 18 : 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: variant.glowColor ? 10 : 3,
      }}
    >
      {variant.isGradient ? (
        <LinearGradient
          colors={[variant.letterColor, variant.letterColorSecondary]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={{ width: dim, height: dim, borderRadius: radius, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ ...textStyle, color: "#fff" }}>g.</Text>
        </LinearGradient>
      ) : (
        <Text style={{
          ...textStyle,
          color: variant.letterColor,
          textShadowColor: variant.glowColor ?? "transparent",
          textShadowRadius: variant.glowColor ? 14 : 0,
          textShadowOffset: { width: 0, height: 0 },
        }}>g.</Text>
      )}
    </View>
  );
}

// ─── Logo Center Inline Component ────────────────────────────────────────────

// Embedded launcher icon picker — lets users browse, preview, and apply launcher icon variants
function LogoCenterInline({ theme, isDark, accentColor, isPro, router }: {
  theme: any; isDark: boolean; accentColor: string; isPro: boolean; router: any;
}) {
  const { selectedLogoId, setSelectedLogo, loadSavedLogo, isLoaded, isApplying, error, clearError } = useLogoStore();
  const [previewId, setPreviewId] = useState<LogoVariantId>(selectedLogoId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      loadSavedLogo();
    }
  }, [isLoaded, loadSavedLogo]);

  useEffect(() => {
    setPreviewId(selectedLogoId);
  }, [selectedLogoId]);

  const previewVariant = LOGO_VARIANTS.find((v) => v.id === previewId) ?? LOGO_VARIANTS[0];
  const isApplied = previewId === selectedLogoId;
  const isWeb = Platform.OS === 'web';

  const handleApply = async () => {
    if (isApplying) return;
    clearError();
    setSuccessMessage(null);

    if (previewVariant.isPro && !isPro) {
      router.push("/rewards" as any);
      return;
    }

    if (isWeb) {
      return;
    }

    try {
      await setSelectedLogo(previewId);
      hapticSuccess();
      setSuccessMessage("Launcher icon changed. Your home screen may take a moment to refresh.");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      hapticLight();
    }
  };

  return (
    <View>
      {/* Milestone hint for locked variants */}
      {!isPro && (
        <View style={[lcStyles.proHint, { backgroundColor: accentColor + "14", borderColor: accentColor + "33" }]}>
          <Award size={13} color={accentColor} />
          <Text style={[lcStyles.proHintText, { color: accentColor }]}>
            Exclusive launcher icons unlock through Milestone Rewards. Tap any card to preview.
          </Text>
        </View>
      )}

      {/* Gallery grid */}
      <View style={lcStyles.grid}>
        {LOGO_VARIANTS.map((variant) => (
          <LogoVariantCard
            key={variant.id}
            variant={variant}
            isPreviewed={variant.id === previewId}
            isApplied={variant.id === selectedLogoId}
            isLocked={variant.isPro && !isPro}
            isApplying={isApplying}
            accentColor={accentColor}
            theme={theme}
            onPress={() => {
              if (isApplying) return;
              clearError();
              setSuccessMessage(null);
              hapticSelection();
              setPreviewId(variant.id);
            }}
          />
        ))}
      </View>

      {/* Preview strip */}
      <View style={[lcStyles.previewStrip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <LogoMark variant={previewVariant} size="md" />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[lcStyles.previewName, { color: theme.primaryText }]}>{previewVariant.name}</Text>
          <Text style={[lcStyles.previewTagline, { color: theme.secondaryText }]}>{previewVariant.tagline}</Text>
        </View>
        {previewVariant.isPro && !isPro ? (
          <View style={[lcStyles.lockedBadge, { backgroundColor: accentColor + "14", borderColor: accentColor + "33" }]}>
            <Award size={11} color={accentColor} />
            <Text style={[lcStyles.lockedBadgeText, { color: accentColor }]}>Reward</Text>
          </View>
        ) : previewVariant.id === selectedLogoId ? (
          <View style={[lcStyles.activeBadge, { backgroundColor: "#34C75918", borderColor: "#34C75940" }]}>
            <Check size={11} color="#34C759" />
            <Text style={[lcStyles.activeBadgeText, { color: "#34C759" }]}>Applied</Text>
          </View>
        ) : (
          <View style={[lcStyles.previewBadge, { backgroundColor: accentColor + "14", borderColor: accentColor + "33" }]}>
            <Text style={[lcStyles.previewBadgeText, { color: accentColor }]}>Previewing</Text>
          </View>
        )}
      </View>

      {/* Feedback & Error States */}
      {successMessage && (
        <View style={[lcStyles.feedbackRow, { backgroundColor: "#34C75918", borderColor: "#34C75940" }]}>
          <Check size={16} color="#34C759" />
          <Text style={[lcStyles.feedbackText, { color: "#34C759" }]}>{successMessage}</Text>
        </View>
      )}

      {error && !successMessage && (
        <View style={[lcStyles.feedbackRow, { backgroundColor: "#FF3B3018", borderColor: "#FF3B3040" }]}>
          <AlertCircle size={16} color="#FF3B30" />
          <View style={{ flex: 1 }}>
            <Text style={[lcStyles.feedbackText, { color: "#FF3B30" }]}>{error}</Text>
          </View>
          <TouchableOpacity
            onPress={handleApply}
            disabled={isApplying}
            style={[lcStyles.retryBtn, { borderColor: "#FF3B3060" }]}
          >
            <RotateCw size={12} color="#FF3B30" />
            <Text style={[lcStyles.retryBtnText, { color: "#FF3B30" }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action button */}
      {isWeb ? (
        <View style={[lcStyles.applyBtn, { backgroundColor: theme.cardBorder }]}>
          <Text style={[lcStyles.applyBtnText, { color: theme.secondaryText }]}>
            Android App Only
          </Text>
        </View>
      ) : previewVariant.isPro && !isPro ? (
        <TouchableOpacity
          testID="unlock-milestone-btn"
          accessibilityRole="button"
          accessibilityLabel="View Milestones to Unlock"
          onPress={() => router.push("/rewards" as any)}
          activeOpacity={0.85}
          style={[lcStyles.applyBtn, { backgroundColor: accentColor }]}
        >
          <Award size={16} color="#fff" />
          <Text style={lcStyles.applyBtnText}>View Milestone to Unlock</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          testID="apply-logo-btn"
          accessibilityRole="button"
          accessibilityLabel="Apply Launcher Icon"
          onPress={handleApply}
          disabled={isApplied || isApplying}
          activeOpacity={0.85}
          style={[
            lcStyles.applyBtn,
            {
              backgroundColor: isApplied ? theme.cardBorder : accentColor,
              opacity: isApplying ? 0.7 : 1,
            },
          ]}
        >
          {isApplying ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={lcStyles.applyBtnText}>Updating launcher icon...</Text>
            </>
          ) : isApplied ? (
            <>
              <Check size={16} color={theme.secondaryText} />
              <Text style={[lcStyles.applyBtnText, { color: theme.secondaryText }]}>Already Applied</Text>
            </>
          ) : (
            <Text style={lcStyles.applyBtnText}>Apply to Android Home Screen</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={[lcStyles.hint, { color: theme.tertiaryText }]}>
        {isWeb
          ? "Home screen launcher icons require the installed Android app."
          : "Changes the Groundwork icon on this Android device. Some launchers may take a few seconds to refresh."}
      </Text>
    </View>
  );
}

// ─── Logo Variant Card ────────────────────────────────────────────────────────

// A single logo option in the gallery grid — distinguishes previewed, applied, and locked states
function LogoVariantCard({
  variant,
  isPreviewed,
  isApplied,
  isLocked,
  isApplying,
  accentColor,
  theme,
  onPress,
}: {
  variant: LogoVariant;
  isPreviewed: boolean;
  isApplied: boolean;
  isLocked: boolean;
  isApplying: boolean;
  accentColor: string;
  theme: any;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (isApplying) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={[lcStyles.variantCardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        testID={`logo-variant-${variant.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Logo variant ${variant.name}`}
        onPress={handlePress}
        style={[
          lcStyles.variantCard,
          {
            backgroundColor: theme.card,
            borderColor: isPreviewed ? accentColor : isApplied ? "#34C75980" : theme.cardBorder,
            borderWidth: isPreviewed ? 2 : isApplied ? 1.5 : 1,
            opacity: isLocked ? 0.75 : 1,
          },
        ]}
      >
        {/* Logo preview area */}
        <View style={lcStyles.variantLogoArea}>
          <LogoMark variant={variant} size="sm" />
        </View>

        {/* Footer */}
        <View style={[lcStyles.variantFooter, { borderTopColor: theme.cardBorder }]}>
          <Text style={[lcStyles.variantName, { color: theme.primaryText }]} numberOfLines={1}>
            {variant.name.replace("Groundwork ", "")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            {isLocked ? (
              <>
                <Award size={10} color={accentColor} />
                <Text style={[lcStyles.variantTag, { color: accentColor }]}>Reward</Text>
              </>
            ) : isApplied ? (
              <Text style={[lcStyles.variantTag, { color: "#34C759" }]}>Applied</Text>
            ) : null}
          </View>
        </View>

        {/* Selection check */}
        {isPreviewed && (
          <View style={[lcStyles.checkBadge, { backgroundColor: accentColor }]}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </View>
        )}

        {/* Applied dot */}
        {isApplied && !isPreviewed && (
          <View style={[lcStyles.appliedDot, { backgroundColor: "#34C759" }]} />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Logo Center Styles ───────────────────────────────────────────────────────

const lcStyles = StyleSheet.create({
  proHint: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  proHintText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 17 },

  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14,
  },
  variantCardWrap: { width: "47%", flexGrow: 1 },
  variantCard: {
    borderRadius: 16, overflow: "hidden", borderWidth: 1, position: "relative",
  },
  variantLogoArea: {
    alignItems: "center", justifyContent: "center", paddingVertical: 20,
  },
  variantFooter: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  variantName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  variantTag: { fontSize: 9, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.5 },
  checkBadge: {
    position: "absolute", top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  appliedDot: {
    position: "absolute", top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
  },

  previewStrip: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14,
  },
  previewName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  previewTagline: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  lockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  lockedBadgeText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.5 },
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  activeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  previewBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  previewBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16, marginBottom: 10,
  },
  applyBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  feedbackRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  feedbackText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 18 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  retryBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 4, lineHeight: 16 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

// Main appearance settings screen — theme mode, accent color, premium themes, font size, and logo picker
export default function AppearanceSettingsScreen() {
  const { theme, isDark, showAlert, previewTheme, clearPreview } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop, contentMaxWidth, horizontalPadding } = useResponsive();

  const {
    theme: themeMode,
    setTheme: setThemeMode,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    premiumThemeId,
    setPremiumThemeId,
  } = useSettingsStore();
  const { profile, session } = useAuthStore();
  const [, setRewardsReady] = React.useState(false);

  React.useEffect(() => {
    const userId = session?.user?.id || 'guest';
    initializeAccountRewards(userId).then(() => setRewardsReady(true));
  }, [session?.user?.id]);

  const isPro =
    profile?.pro_status || session?.user?.user_metadata?.is_pro || isRewardUnlocked('premium_themes') || false;

  const handlePremiumThemeSelect = (themeId: string) => {
    const themeItem = PREMIUM_THEMES.find(t => t.id === themeId);
    if (themeItem?.isPro) {
      const gate = canUsePremiumTheme();
      if (!gate.allowed) {
        handleLockedThemePress();
        return;
      }
    }
    setPremiumThemeId(themeId);
  };

  const handleThemeChange = (value: string) => {
    setThemeMode(value as "light" | "dark" | "system");
  };

  const handleLockedThemePress = () => {
    showAlert({
      title: "Milestone Reward",
      message: "Unlock cinematic themes by completing milestones in daily focus and consistency.",
      primaryButton: {
        text: "View Milestones",
        onPress: () => router.push('/rewards' as any),
      },
      secondaryButton: {
        text: "Cancel",
        onPress: () => {},
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 90,
            maxWidth: isDesktop ? contentMaxWidth : undefined,
            alignSelf: isDesktop ? 'center' : undefined,
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isDesktop ? styles.desktopTwoColLayout : undefined}>
          {/* Main Column */}
          <View style={isDesktop ? styles.desktopMainCol : undefined}>
            <View style={{ marginBottom: 24, marginTop: 4 }}>
              <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -0.5 }}>
                Appearance.
              </Text>
              <Text style={{ fontSize: 14, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
                Type, colour, atmosphere.
              </Text>
            </View>
            {/* ── THEME ─────────────────────────────── */}
        <SectionLabel label="THEME" theme={theme} />
        <Card theme={theme}>
          <SegmentedControl
            theme={theme}
            accentColor={accentColor}
            value={themeMode}
            onChange={handleThemeChange}
            options={[
              {
                label: "Light",
                value: "light",
                icon: <Sun size={16} color="" />,
              },
              {
                label: "Dark",
                value: "dark",
                icon: <Moon size={16} color="" />,
              },
              {
                label: "System",
                value: "system",
                icon: <Monitor size={16} color="" />,
              },
            ]}
          />
          {/* Live preview strip */}
          <View
            style={[
              styles.previewStrip,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: theme.separator, borderWidth: 1 },
            ]}
          >
            <View style={[styles.previewDot, { backgroundColor: "#FAF9F6", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }]} />
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
              Currently:{" "}
              <Text style={{ color: theme.accent, fontFamily: "Inter_700Bold" }}>
                {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </Text>
            </Text>
            <View style={[styles.previewDot, { backgroundColor: "#000000", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }]} />
          </View>
        </Card>

        {/* ── ACCENT COLOR ──────────────────────── */}
        <SectionLabel label="ACCENT COLOR" theme={theme} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.accentColorScrollContent}
          style={styles.accentColorScroll}
        >
          {ACCENT_COLORS.map((item) => (
            <AccentColorPill
              key={item.color}
              color={item.color}
              name={item.name}
              isActive={accentColor === item.color}
              onPress={() => setAccentColor(item.color)}
            />
          ))}
        </ScrollView>

        {/* ── PREMIUM THEMES ─────────────────────── */}
        <SectionLabel label="PREMIUM THEMES" theme={theme} />
        {/* Header row with Pro badge */}
        <View style={styles.premiumHeaderRow}>
          <View style={styles.premiumHeaderLeft}>
            <Sparkles size={13} color={accentColor} />
            <Text
              style={[styles.premiumHeaderText, { color: theme.secondaryText }]}
            >
              Transform every surface across Groundwork
            </Text>
          </View>
          {!isPro && (
            <TouchableOpacity
              onPress={() => router.push("/rewards" as any)}
              activeOpacity={0.75}
              style={[styles.unlockProBtn, { backgroundColor: accentColor }]}
            >
              <Award size={11} color="#FFF" />
              <Text style={styles.unlockProBtnText}>Milestones</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.themePillsScrollContent}
          style={styles.themePillsScroll}
        >
          {PREMIUM_THEMES.map((themeItem) => (
            <CompactThemePill
              key={themeItem.id}
              themeItem={themeItem}
              isSelected={premiumThemeId === themeItem.id}
              isPro={isPro}
              accentColor={accentColor}
              theme={theme}
              onPress={() => handlePremiumThemeSelect(themeItem.id)}
              onLockedPress={handleLockedThemePress}
              onPreviewPress={() => {
                previewTheme(themeItem.id);
                showAlert({
                  title: `Previewing ${themeItem.name}`,
                  message:
                    `You are previewing ${themeItem.name} temporarily. Unlock all premium themes through Milestone Rewards.`,
                  primaryButton: {
                    text: "View Rewards",
                    onPress: () => router.push("/rewards" as any),
                  },
                  secondaryButton: {
                    text: "Close Preview",
                    onPress: () => clearPreview(),
                  },
                });
              }}
            />
          ))}
        </ScrollView>

        {/* Selected theme description */}
        {(() => {
          const activePremiumTheme = PREMIUM_THEMES.find(
            (t) => t.id === premiumThemeId,
          );
          if (!activePremiumTheme) return null;
          return (
            <View
              style={[
                styles.activeThemeDesc,
                {
                  backgroundColor: accentColor + "0E",
                  borderColor: accentColor + "25",
                },
              ]}
            >
              <Text
                style={[styles.activeThemeDescName, { color: accentColor }]}
              >
                {activePremiumTheme.name}
              </Text>
              <Text
                style={[
                  styles.activeThemeDescText,
                  { color: theme.secondaryText },
                ]}
              >
                {activePremiumTheme.description}
              </Text>
            </View>
          );
        })()}

        {/* ── FONT SIZE ─────────────────────────── */}
        <SectionLabel label="FONT SIZE" theme={theme} />
        <Card theme={theme}>
          <SegmentedControl
            theme={theme}
            accentColor={accentColor}
            value={fontSize}
            onChange={(v) => setFontSize(v as any)}
            options={[
              { label: "Small", value: "small" },
              { label: "Medium", value: "medium" },
              { label: "Large", value: "large" },
            ]}
          />
          {/* Font size preview */}
          <View style={styles.fontPreview}>
            <Text
              style={[
                styles.fontPreviewText,
                { color: theme.primaryText },
                fontSize === "small" && { fontSize: 13 },
                fontSize === "medium" && { fontSize: 16 },
                fontSize === "large" && { fontSize: 20 },
              ]}
            >
              The quick brown fox jumps over the lazy dog.
            </Text>
          </View>
        </Card>

            {/* ── APP ICON (Mobile & Tablet) ──────────────────────────── */}
            {!isDesktop && (
              <>
                <SectionLabel label="APP ICON & BRANDING" theme={theme} />
                <LogoCenterInline theme={theme} isDark={isDark} accentColor={accentColor} isPro={isPro} router={router} />
              </>
            )}
          </View>

          {/* Desktop Right Column: Live Atmosphere & Branding Panel */}
          {isDesktop && (
            <View style={styles.desktopSideCol}>
              <View style={[styles.desktopCard, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={[styles.sectionLabel, { color: theme.secondaryText, marginVertical: 0, marginLeft: 0 }]}>
                    ATMOSPHERE PREVIEW
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: accentColor + '20' }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: accentColor }}>
                      LIVE
                    </Text>
                  </View>
                </View>

                {/* Mini Groundwork Preview Surface */}
                <View style={[styles.miniAppSurface, { backgroundColor: theme.background, borderColor: theme.separator }]}>
                  {/* Mini Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_800ExtraBold', color: theme.text }}>
                      groundwork<Text style={{ color: accentColor }}>.</Text>
                    </Text>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
                  </View>

                  {/* Mini Greeting Card */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: theme.text }}>
                      Make space.
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary }}>
                      Today's rhythm
                    </Text>
                  </View>

                  {/* Sample Task Row */}
                  <View style={[styles.miniTaskCard, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
                    <View style={[styles.miniCheckbox, { borderColor: accentColor, backgroundColor: accentColor + '25' }]}>
                      <Check size={11} color={accentColor} strokeWidth={3} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: theme.text }}>
                        Deep focus block
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: theme.textSecondary }}>
                        High priority · 45 mins
                      </Text>
                    </View>
                  </View>

                  {/* Mini Focus Timer Bar */}
                  <View style={[styles.miniTimerBar, { borderColor: theme.separator }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={12} color={accentColor} />
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: accentColor }}>
                        25:00
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: theme.textSecondary }}>
                      {themeMode.toUpperCase()} · {ACCENT_COLORS.find(c => c.color === accentColor)?.name || 'Custom'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Branding and App Icon on Desktop */}
              <View style={[styles.desktopCard, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
                <Text style={[styles.sectionLabel, { color: theme.secondaryText, marginTop: 0, marginBottom: 12, marginLeft: 0 }]}>
                  APP ICON & BRANDING
                </Text>
                <LogoCenterInline theme={theme} isDark={isDark} accentColor={accentColor} isPro={isPro} router={router} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  desktopTwoColLayout: {
    flexDirection: 'row',
    gap: 36,
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopMainCol: {
    flex: 1.35,
    maxWidth: 720,
  },
  desktopSideCol: {
    flex: 0.95,
    gap: 20,
  },
  desktopCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  miniAppSurface: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  miniTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  miniCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTimerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -4,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    borderRadius: 22,
    padding: 16,
  },
  // ── Segmented Control ────────
  segmentedTrack: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  // ── Preview strip ────────────
  previewStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  previewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  // ── Accent Color Pills ────────────
  accentColorScroll: {
    marginBottom: 8,
  },
  accentColorScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 4,
  },
  accentPillContainer: {
    alignItems: "center",
    gap: 6,
  },
  accentPill: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  accentPillCheckmark: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    bottom: -4,
    right: -4,
  },
  accentPillLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    maxWidth: 56,
    textAlign: "center",
  },
  // ── Theme Pills ─────────────────
  themePillsScroll: {
    marginBottom: 8,
  },
  themePillsScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 4,
  },
  themePillContainer: {
    alignItems: "center",
    gap: 8,
  },
  themePill: {
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  themePillPreview: {
    width: "100%",
    height: "100%",
  },
  themePillCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  themePillLock: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  themePillMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  themePillName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    maxWidth: 72,
    textAlign: "center",
  },
  // ── Premium Themes Header ──────
  premiumHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  premiumHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  premiumHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  unlockProBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  unlockProBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  // ── Active theme description ──
  activeThemeDesc: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeThemeDescName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  activeThemeDescText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
  },
  // ── Font preview ─────────────
  fontPreview: {
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  fontPreviewText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
});
