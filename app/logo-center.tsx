/**
 * logo-center.tsx — Groundwork Pro Logo Center
 *
 * ISOLATED MODULE — reads from logoStore only.
 * Does NOT modify navigation, auth, backend, or any shared state.
 * Safe to remove without affecting any other system.
 */

import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AppText as Text } from '@/components/ui/AppText';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import {
    LOGO_VARIANTS,
    LogoVariant,
    LogoVariantId,
    useLogoStore,
} from '@/lib/logoStore';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { canUseLogoVariants } from '@/lib/subscriptionService';
import { initializeAccountRewards } from '@/lib/rewardsService';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Check,
    ChevronLeft,
    Crown,
    Lock,
    Sparkles,
    Award,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Logo Mark Component ──────────────────────────────────────────────────────
// Renders the "g." branding mark using React Native primitives.
// No image assets — fully resolution-independent.

interface LogoMarkProps {
  variant: LogoVariant;
  size?: 'sm' | 'md' | 'lg';
}

// Renders the "g." logo icon as pure RN views (no images) — supports gradients, glow, and 3 sizes
function LogoMark({ variant, size = 'md' }: LogoMarkProps) {
  const dim = size === 'sm' ? 48 : size === 'md' ? 80 : 120;
  const fontSize = size === 'sm' ? 22 : size === 'md' ? 38 : 58;
  const borderRadius = size === 'sm' ? 13 : size === 'md' ? 22 : 32;

  const textStyle = {
    fontSize,
    fontFamily: 'Inter_800ExtraBold' as const,
    letterSpacing: -1 as const,
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
    lineHeight: dim * 0.75,
    height: dim,
    textAlign: 'center' as const,
  };

  return (
    <View
      style={[
        styles.logoMark,
        {
          width: dim,
          height: dim,
          borderRadius,
          backgroundColor: variant.background,
          shadowColor: variant.glowColor ?? variant.letterColor,
          shadowOpacity: variant.glowColor ? 0.7 : 0.2,
          shadowRadius: variant.glowColor ? 20 : 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: variant.glowColor ? 12 : 4,
        },
      ]}
    >
      {variant.isGradient ? (
        <LinearGradient
          colors={[variant.letterColor, variant.letterColorSecondary]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ width: dim, height: dim, borderRadius, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...textStyle, color: '#FFFFFF' }}>g.</Text>
        </LinearGradient>
      ) : (
        <Text
          style={{
            ...textStyle,
            color: variant.letterColor,
            textShadowColor: variant.glowColor ?? 'transparent',
            textShadowRadius: variant.glowColor ? 16 : 0,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          g.
        </Text>
      )}
    </View>
  );
}

// ─── Inline Logo Text Component ───────────────────────────────────────────────
// Renders "groundwork." text branding with the active variant colors.

interface LogoTextProps {
  variant: LogoVariant;
  fontSize?: number;
}

// Renders the "groundwork." wordmark with the active variant's letter and dot colors
function LogoText({ variant, fontSize = 22 }: LogoTextProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={{
          fontSize,
          fontFamily: 'Inter_800ExtraBold',
          color: variant.letterColor,
          letterSpacing: -0.5,
        }}
      >
        g
      </Text>
      <Text
        style={{
          fontSize,
          fontFamily: 'Inter_800ExtraBold',
          color: variant.letterColor,
          letterSpacing: -0.5,
          opacity: 0.75,
        }}
      >
        roundwork
      </Text>
      <Text
        style={{
          fontSize,
          fontFamily: 'Inter_800ExtraBold',
          color: variant.dotColor,
        }}
      >
        .
      </Text>
    </View>
  );
}

// ─── Logo Card Component ──────────────────────────────────────────────────────

interface LogoCardProps {
  variant: LogoVariant;
  isSelected: boolean;
  isPro: boolean;
  onPress: () => void;
  accentColor: string;
  theme: any;
}

// A single selectable logo card in the gallery — shows the logo, name, PRO tag, and selection state with animation
function LogoCard({ variant, isSelected, isPro, onPress, accentColor, theme }: LogoCardProps) {
  const isLocked = variant.isPro && !isPro;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isSelected]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
    ]).start();
    hapticSelection();
    onPress();
  };

  const borderColorInterpolated = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.cardBorder, accentColor],
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable onPress={handlePress} style={{ flex: 1 }}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: borderColorInterpolated,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          {/* Logo preview */}
          <View style={styles.cardLogoArea}>
            <LogoMark variant={variant} size="md" />
          </View>

          {/* Card footer */}
          <View style={[styles.cardFooter, { borderTopColor: theme.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: theme.primaryText }]} numberOfLines={1}>
                {variant.name}
              </Text>
              {isLocked && (
                <View style={styles.proTagRow}>
                  <Crown size={9} color={accentColor} />
                  <Text style={[styles.proTag, { color: accentColor }]}>PRO</Text>
                </View>
              )}
            </View>

            {/* State indicator */}
            {isSelected ? (
              <View style={[styles.checkBadge, { backgroundColor: accentColor }]}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
            ) : isLocked ? (
              <View style={[styles.lockBadge, { backgroundColor: theme.accentLight }]}>
                <Lock size={12} color={accentColor} />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

interface PreviewPanelProps {
  variant: LogoVariant;
  theme: any;
  isDark: boolean;
}

// Shows a live preview of the selected logo — app icon mockup, toolbar mockup, branding text, and variant info
function PreviewPanel({ variant, theme, isDark }: PreviewPanelProps) {
  return (
    <View style={[styles.previewPanel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={[styles.previewLabel, { color: theme.tertiaryText }]}>LIVE PREVIEW</Text>

      {/* App icon preview */}
      <View style={styles.previewRow}>
        <View style={styles.previewItem}>
          <LogoMark variant={variant} size="lg" />
          <Text style={[styles.previewItemLabel, { color: theme.tertiaryText }]}>App Icon</Text>
        </View>

        <View style={styles.previewItem}>
          {/* Toolbar mockup */}
          <View style={[styles.toolbarMock, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: theme.cardBorder }]}>
            <LogoMark variant={variant} size="sm" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={[styles.mockLine, { backgroundColor: theme.secondaryText + '40', width: '70%' }]} />
              <View style={[styles.mockLine, { backgroundColor: theme.secondaryText + '20', width: '40%', marginTop: 5 }]} />
            </View>
          </View>
          <Text style={[styles.previewItemLabel, { color: theme.tertiaryText }]}>Header</Text>
        </View>
      </View>

      {/* Branding text preview */}
      <View style={[styles.brandingMock, { backgroundColor: isDark ? '#111' : '#F8F8F8', borderColor: theme.cardBorder }]}>
        <LogoText variant={variant} fontSize={20} />
      </View>

      {/* Variant info */}
      <View style={styles.variantInfo}>
        <Text style={[styles.variantName, { color: theme.primaryText }]}>{variant.name}</Text>
        <Text style={[styles.variantTagline, { color: theme.secondaryText }]}>{variant.tagline}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

// Logo Center screen — shows current logo, preview panel, logo gallery grid, and apply button
export default function LogoCenterScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, session } = useAuthStore();
  const { selectedLogoId, setSelectedLogo, loadSavedLogo, isLoaded } = useLogoStore();
  const [previewId, setPreviewId] = useState<LogoVariantId>(selectedLogoId);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [, setRewardsReady] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id || 'guest';
    initializeAccountRewards(userId).then(() => setRewardsReady(true));
  }, [session?.user?.id]);

  const isPro = Boolean(
    profile?.pro_status ||
    session?.user?.user_metadata?.is_pro ||
    canUseLogoVariants().allowed
  );

  // Load persisted selection on mount
  useEffect(() => {
    if (!isLoaded) {
      loadSavedLogo();
    }
  }, []);

  // Keep preview in sync when loaded selection changes
  useEffect(() => {
    setPreviewId(selectedLogoId);
  }, [selectedLogoId]);

  const previewVariant = LOGO_VARIANTS.find((v) => v.id === previewId) ?? LOGO_VARIANTS[0];
  const selectedVariant = LOGO_VARIANTS.find((v) => v.id === selectedLogoId) ?? LOGO_VARIANTS[0];

  const isDesktop = Platform.OS === 'web' && width >= 768;
  const numColumns = isDesktop ? 3 : 2;
  const cardWidth = isDesktop
    ? (Math.min(width - 320, 860) - 48 - (numColumns - 1) * 12) / numColumns
    : (width - 40 - 12) / 2;

  const handleCardPress = (variant: LogoVariant) => {
    if (variant.isPro && !isPro) {
      // Just preview, don't apply
      setPreviewId(variant.id);
      return;
    }
    setPreviewId(variant.id);
  };

  const handleApply = async () => {
    if (previewVariant.isPro && !isPro) {
      router.push('/rewards' as any);
      return;
    }
    await setSelectedLogo(previewId);
    hapticSuccess();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const isApplyDisabled = previewId === selectedLogoId;

  return (
    <BackgroundGradient>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Appearance</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>Logo Center</Text>
        <View style={styles.headerBadge}>
          <Sparkles size={11} color={theme.accent} />
          <Text style={[styles.headerBadgeText, { color: theme.accent }]}>PRO</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Current Logo ── */}
        <View style={styles.currentSection}>
          <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>CURRENT LOGO</Text>
          <View style={[styles.currentCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <LogoMark variant={selectedVariant} size="sm" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.currentName, { color: theme.primaryText }]}>{selectedVariant.name}</Text>
              <Text style={[styles.currentTagline, { color: theme.secondaryText }]}>{selectedVariant.tagline}</Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '40' }]}>
              <Text style={[styles.activeBadgeText, { color: theme.accent }]}>Active</Text>
            </View>
          </View>
        </View>

        {/* ── Preview Panel ── */}
        <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>PREVIEW</Text>
        <PreviewPanel variant={previewVariant} theme={theme} isDark={isDark} />

        {/* ── Gallery ── */}
        <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>LOGO GALLERY</Text>
        {!isPro && (
          <View style={[styles.proHint, { backgroundColor: theme.accentLight, borderColor: theme.accentBorder }]}>
            <Crown size={13} color={theme.accent} />
            <Text style={[styles.proHintText, { color: theme.accent }]}>
              Pro variants are available with Groundwork Pro. Tap to preview.
            </Text>
          </View>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          {LOGO_VARIANTS.map((variant) => (
            <View key={variant.id} style={{ width: cardWidth }}>
              <LogoCard
                variant={variant}
                isSelected={variant.id === previewId}
                isPro={isPro}
                onPress={() => handleCardPress(variant)}
                accentColor={theme.accent}
                theme={theme}
              />
            </View>
          ))}
        </View>

        {/* ── Apply Button ── */}
        <View style={styles.applySection}>
          {saveSuccess ? (
            <View style={[styles.successBanner, { backgroundColor: theme.successLight ?? '#34C75920', borderColor: theme.success + '40' }]}>
              <Check size={16} color={theme.success} />
              <Text style={[styles.successText, { color: theme.success }]}>Logo applied successfully</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleApply}
              activeOpacity={0.85}
              disabled={isApplyDisabled && !(previewVariant.isPro && !isPro)}
              style={[
                styles.applyBtn,
                {
                  backgroundColor: (isApplyDisabled && !(previewVariant.isPro && !isPro))
                    ? theme.accent + '60'
                    : theme.accent,
                },
              ]}
            >
              {previewVariant.isPro && !isPro ? (
                <>
                  <Award size={16} color="#fff" />
                  <Text style={styles.applyBtnText}>View Milestone to Unlock</Text>
                </>
              ) : (
                <Text style={styles.applyBtnText}>
                  {isApplyDisabled ? 'Already Applied' : `Apply ${previewVariant.name}`}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={[styles.applyHint, { color: theme.tertiaryText }]}>
            Your logo preference is saved locally on this device.
          </Text>
        </View>
      </ScrollView>
    </BackgroundGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 2,
  },

  // Current logo card
  currentSection: {},
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  currentName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  currentTagline: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 17,
  },
  activeBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },

  // Preview panel
  previewPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  previewItem: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  previewItemLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  toolbarMock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  mockLine: {
    height: 8,
    borderRadius: 4,
  },
  brandingMock: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  variantInfo: {
    alignItems: 'center',
    gap: 4,
  },
  variantName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  variantTagline: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Pro hint
  proHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  proHintText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    lineHeight: 17,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
    minWidth: 140,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardLogoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  proTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  proTag: {
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Logo mark
  logoMark: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Apply section
  applySection: {
    marginTop: 24,
    gap: 12,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  successText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  applyHint: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 17,
  },
});
