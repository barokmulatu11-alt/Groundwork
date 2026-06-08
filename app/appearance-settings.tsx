import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import { ProPaywall } from "@/components/ProPaywall";
import { hapticLight, hapticSelection } from "@/lib/haptics";
import { PREMIUM_THEMES } from "@/lib/premiumThemes";
import { canUsePremiumTheme, trackProEvent } from "@/lib/subscriptionService";
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
} from "lucide-react-native";
import React, { useRef } from "react";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AppearanceSettingsScreen() {
  const { theme, isDark, showAlert, previewTheme, clearPreview } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

  const isPro =
    profile?.pro_status || session?.user?.user_metadata?.is_pro || false;

  const [paywallVisible, setPaywallVisible] = React.useState(false);

  const handlePremiumThemeSelect = (themeId: string) => {
    const themeItem = PREMIUM_THEMES.find(t => t.id === themeId);
    if (themeItem?.isPro) {
      const gate = canUsePremiumTheme();
      if (!gate.allowed) {
        trackProEvent('feature_lock_encounter', { feature: 'premium_theme', source: 'appearance_settings' });
        setPaywallVisible(true);
        return;
      }
    }
    setPremiumThemeId(themeId);
  };

  const handleThemeChange = (value: string) => {
    setThemeMode(value as "light" | "dark" | "system");
  };

  const handleLockedThemePress = () => {
    trackProEvent('feature_lock_encounter', { feature: 'premium_theme', source: 'appearance_settings' });
    setPaywallVisible(true);
  };

  return (
    <BackgroundGradient>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>
            Settings
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>
          Appearance
        </Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Personalise your experience
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
              { backgroundColor: theme.cardBorder + "30" },
            ]}
          >
            <View style={[styles.previewDot, { backgroundColor: "#FDFBD4" }]} />
            <Text style={[styles.previewLabel, { color: theme.secondaryText }]}>
              Currently:{" "}
              <Text style={{ color: accentColor, fontFamily: "Inter_700Bold" }}>
                {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </Text>
            </Text>
            <View style={[styles.previewDot, { backgroundColor: "#080C14" }]} />
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
              onPress={() => router.push("/subscription-settings" as any)}
              activeOpacity={0.75}
              style={[styles.unlockProBtn, { backgroundColor: accentColor }]}
            >
              <Crown size={11} color="#FFF" />
              <Text style={styles.unlockProBtnText}>Upgrade</Text>
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
                  title: "Previewing True Black",
                  message:
                    "You are previewing True Black temporarily. To permanently unlock True Black, upgrade to Groundwork Pro.",
                  primaryButton: {
                    text: "Upgrade to Pro",
                    onPress: () => router.push("/subscription-settings" as any),
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

        {/* ── APP ICON ──────────────────────────── */}
        <SectionLabel label="APP ICON" theme={theme} />
        <Card theme={theme}>
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Inter_600SemiBold",
                color: theme.secondaryText,
              }}
            >
              Coming real soon...
            </Text>
          </View>
        </Card>
      </ScrollView>

      <ProPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        featureName="Premium Themes"
        featureDescription="Transform every surface of Groundwork with cinematic themes."
        source="appearance_settings"
      />
    </BackgroundGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
