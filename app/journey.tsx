import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Award,
    BookOpen,
    Check,
    ChevronLeft,
    Clock,
    Compass,
    Crown,
    Edit2,
    Flame,
    Share2,
    Smartphone,
    Sparkles,
    Square as SquareIcon,
    Trophy,
    Lock,
    X
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "@/components/ui/AppText";
import { Confetti } from "@/components/ui/Confetti";
import {
    ACHIEVEMENTS,
    getUserStats
} from "@/lib/connect/achievementEngine";
import {
    getLevelFromXP,
    getLevelTitle,
    getXPRequiredForLevel,
} from "@/lib/connect/xpSystem";
import { db } from "@/lib/db";
import { hapticLight, hapticSelection, hapticSuccess } from "@/lib/haptics";
import { PREMIUM_THEMES, getThemeById } from "@/lib/premiumThemes";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Evolving Journey Status Ranks
const getJourneyStatus = (level: number) => {
  if (level <= 3) return "Novice Explorer";
  if (level <= 7) return "Habit Builder";
  if (level <= 12) return "Focus Scholar";
  if (level <= 20) return "Discipline Strategist";
  if (level <= 35) return "Mind Architect";
  return "Productivity Grandmaster";
};

/**
 * Converts a PremiumTheme into the shape journey.tsx internally uses.
 * The journey screen is always dark/cinematic so we use previewGradient + previewAccent.
 */
const toJourneyTheme = (pt: (typeof PREMIUM_THEMES)[0]) => ({
  id: pt.id,
  name: pt.name,
  isPro: pt.isPro,
  colors: pt.previewGradient as [string, string, ...string[]],
  accent: pt.previewAccent,
  glow: pt.previewAccent,
  secondaryText: pt.previewAccent + "AA",
});

export default function JourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: appTheme, showAlert } = useTheme();
  const { profile, session, getUserId } = useAuthStore();
  const { premiumThemeId, setPremiumThemeId } = useSettingsStore();
  const userId = getUserId();

  const isPro =
    profile?.pro_status || session?.user?.user_metadata?.is_pro || false;

  // Derive the journey theme from the app-wide selected premium theme
  const selectedTheme = toJourneyTheme(
    getThemeById(premiumThemeId ?? "default"),
  );

  // Tagline & Motto
  const [motto, setMotto] = useState("Building discipline one day at a time.");
  const [isEditingMotto, setIsEditingMotto] = useState(false);

  // Dynamic user statistics
  const stats = useMemo(() => getUserStats(userId), [userId, profile?.xp]);
  const currentXP = profile?.xp || stats.xp || 0;
  const currentLevel = getLevelFromXP(currentXP);
  const journeyStatus = getJourneyStatus(currentLevel);
  const levelTitle = getLevelTitle(currentLevel);

  // Celebration system
  const [confettiActive, setConfettiActive] = useState(false);

  // Sharing Card Modal states
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareRatio, setShareRatio] = useState<"9:16" | "1:1" | "4:5">("9:16");
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Active Selected Achievement state for detailed story sheet
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

  // Motion animation states
  const entryScale = useRef(new Animated.Value(0.92)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const bgTranslateX = useRef(new Animated.Value(0)).current;
  const bgTranslateY = useRef(new Animated.Value(0)).current;

  // Background drift and Entry triggers
  useEffect(() => {
    // Cinematic Entry
    Animated.parallel([
      Animated.spring(entryScale, {
        toValue: 1,
        tension: 18,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Background Drift
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bgTranslateX, {
            toValue: 35,
            duration: 16000,
            useNativeDriver: true,
          }),
          Animated.timing(bgTranslateY, {
            toValue: 25,
            duration: 16000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(bgTranslateX, {
            toValue: 0,
            duration: 16000,
            useNativeDriver: true,
          }),
          Animated.timing(bgTranslateY, {
            toValue: 0,
            duration: 16000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  // Fetch local motto state
  useEffect(() => {
    AsyncStorage.getItem(`journey_motto_${userId}`).then((saved) => {
      if (saved) setMotto(saved);
    });
  }, [userId]);

  const handleSaveMotto = async () => {
    hapticLight();
    setIsEditingMotto(false);
    try {
      await AsyncStorage.setItem(`journey_motto_${userId}`, motto);
    } catch (_) {}
  };

  // Build Unlocked Achievements set
  const dbAchievements = useMemo(() => {
    try {
      const records =
        db.getAllSync<{ achievement_key: string }>(
          "SELECT achievement_key FROM connect_achievements WHERE user_id = ?",
          [userId],
        ) || [];
      return new Set(records.map((r) => r.achievement_key));
    } catch (_) {
      return new Set<string>();
    }
  }, [userId, profile?.xp]);

  const achievementList = useMemo(() => {
    return ACHIEVEMENTS.map((item) => ({
      ...item,
      isUnlocked: dbAchievements.has(item.key),
    }));
  }, [dbAchievements]);

  // Determine top unlock badge
  const topAchievement = useMemo(() => {
    const unlocked = achievementList.filter((a) => a.isUnlocked);
    return unlocked.length > 0 ? unlocked[0] : null;
  }, [achievementList]);

  // Generate share asset pipeline
  const handlePlatformShare = (platform: string) => {
    hapticLight();
    setSimStep(0);
    setSimulating(true);

    setTimeout(() => {
      setSimStep(1); // formatting assets
      setTimeout(() => {
        setSimStep(2); // final glow effects
        setTimeout(() => {
          hapticSuccess();
          setSimStep(3); // success

          setTimeout(async () => {
            setSimulating(false);
            setShareModalVisible(false);
            try {
              await Share.share({
                message: `Groundwork Journey Showcase\n\nRank: ${journeyStatus} (Lvl ${currentLevel})\nActive Streak: ${stats.longestStreak} Days\nFocused Time: ${(stats.totalFocusMinutes / 60).toFixed(1)} Hours\nIdentity Quote: "${motto}"\n\nShared via Groundwork.`,
                title: "My Groundwork Journey",
              });
            } catch (_) {}
          }, 1100);
        }, 900);
      }, 800);
    }, 800);
  };

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      {confettiActive && (
        <Confetti onComplete={() => setConfettiActive(false)} />
      )}

      {/* Cinematic Layered Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={selectedTheme.colors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.15, y: 0.15 }}
          end={{ x: 0.85, y: 0.85 }}
        />
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: selectedTheme.accent + "15",
              transform: [
                { translateX: bgTranslateX },
                { translateY: bgTranslateY },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glowCircleSecondary,
            {
              backgroundColor: selectedTheme.accent + "0A",
              transform: [
                { translateX: Animated.multiply(bgTranslateX, -1) },
                { translateY: Animated.multiply(bgTranslateY, -1.2) },
              ],
            },
          ]}
        />
      </View>

      {/* Vertically Scrolling Premium Page Content */}
      <Animated.ScrollView
        style={[styles.scroll, { opacity: entryOpacity }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              router.back();
            }}
            style={[
              styles.backBtnWrap,
              { borderColor: selectedTheme.accent + "20" },
            ]}
          >
            <ChevronLeft size={22} color={selectedTheme.accent} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: selectedTheme.accent }]}>
            Growth Showcase
          </Text>
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              setShareModalVisible(true);
            }}
            style={[
              styles.backBtnWrap,
              { borderColor: selectedTheme.accent + "20" },
            ]}
          >
            <Share2 size={20} color={selectedTheme.accent} />
          </TouchableOpacity>
        </View>

        {/* FULL SCREEN HERO IDENTITY CARD */}
        <Animated.View
          style={[styles.heroCard, { transform: [{ scale: entryScale }] }]}
        >
          {/* Avatar Ring */}
          <View
            style={[
              styles.avatarGlowContainer,
              { shadowColor: selectedTheme.accent },
            ]}
          >
            <Image
              source={{
                uri:
                  profile?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${session?.user?.email || "Barok"}`,
              }}
              style={styles.heroAvatar}
            />
            <View
              style={[
                styles.avatarStatusDot,
                { backgroundColor: selectedTheme.accent },
              ]}
            />
          </View>

          {/* User Meta Name */}
          <Text style={styles.heroNameText}>
            {profile?.full_name || "Groundwork Explorer"}
          </Text>

          {/* Evolving Progression Journey Title */}
          <View
            style={[
              styles.journeyStatusBadge,
              {
                backgroundColor: selectedTheme.accent + "1E",
                borderColor: selectedTheme.accent + "35",
              },
            ]}
          >
            <Compass
              size={14}
              color={selectedTheme.accent}
              style={styles.badgeIcon}
            />
            <Text
              style={[
                styles.journeyStatusText,
                { color: selectedTheme.accent },
              ]}
            >
              {journeyStatus}
            </Text>
          </View>

          {/* Identity Motto Quote Block */}
          <View style={styles.mottoWrapper}>
            {isEditingMotto ? (
              <View
                style={[
                  styles.mottoEditBox,
                  { borderColor: selectedTheme.accent },
                ]}
              >
                <TextInput
                  value={motto}
                  onChangeText={setMotto}
                  maxLength={75}
                  style={styles.mottoInput}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleSaveMotto}
                  style={styles.saveMottoBtn}
                >
                  <Check size={18} color={selectedTheme.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditingMotto(true)}
                style={styles.mottoTextPress}
                activeOpacity={0.7}
              >
                <Text style={styles.mottoQuoteText}>“{motto}”</Text>
                <Edit2
                  size={12}
                  color={selectedTheme.accent}
                  style={styles.editMottoIcon}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Legacy Summary Row */}
          <View
            style={[
              styles.legacyHeaderRow,
              { borderColor: selectedTheme.accent + "15" },
            ]}
          >
            <View style={styles.legacyHeaderItem}>
              <Text
                style={[
                  styles.legacyHeaderVal,
                  { color: selectedTheme.accent },
                ]}
              >
                {currentLevel}
              </Text>
              <Text style={styles.legacyHeaderLabel}>LEVEL</Text>
            </View>
            <View
              style={[
                styles.legacyHeaderDivider,
                { backgroundColor: selectedTheme.accent + "20" },
              ]}
            />
            <View style={styles.legacyHeaderItem}>
              <Text style={[styles.legacyHeaderVal, { color: "#FF9500" }]}>
                {stats.longestStreak}
              </Text>
              <Text style={styles.legacyHeaderLabel}>STREAK</Text>
            </View>
            <View
              style={[
                styles.legacyHeaderDivider,
                { backgroundColor: selectedTheme.accent + "20" },
              ]}
            />
            <View style={styles.legacyHeaderItem}>
              <Text
                style={[
                  styles.legacyHeaderVal,
                  { color: selectedTheme.accent },
                ]}
              >
                {currentXP.toLocaleString()}
              </Text>
              <Text style={styles.legacyHeaderLabel}>TOTAL XP</Text>
            </View>
          </View>
        </Animated.View>

        {/* PROGRESSION CONSTELLATION TRACK */}
        <View style={styles.sectionSpacer}>
          <Text
            style={[styles.sectionTitleText, { color: selectedTheme.accent }]}
          >
            Progression Constellation
          </Text>
          <View
            style={[
              styles.constellationCard,
              {
                backgroundColor: selectedTheme.accent + "05",
                borderColor: selectedTheme.accent + "20",
              },
            ]}
          >
            <View style={styles.constellationGrid}>
              {[1, 2, 3, 4, 5].map((step) => {
                const stepRequiredXp = getXPRequiredForLevel(step * 3);
                const stepUnlocked = currentXP >= stepRequiredXp;
                return (
                  <View key={step} style={styles.constellationStepWrap}>
                    <View
                      style={[
                        styles.constellationNode,
                        {
                          borderColor: stepUnlocked
                            ? selectedTheme.accent
                            : "rgba(255,255,255,0.06)",
                          backgroundColor: stepUnlocked
                            ? selectedTheme.accent + "20"
                            : "rgba(255,255,255,0.02)",
                        },
                      ]}
                    >
                      <Sparkles
                        size={16}
                        color={stepUnlocked ? selectedTheme.accent : "#555"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.constellationStepLabel,
                        {
                          color: stepUnlocked
                            ? "#FFF"
                            : "rgba(255,255,255,0.4)",
                        },
                      ]}
                    >
                      Lvl {step * 3}
                    </Text>
                    {step < 5 && (
                      <View
                        style={[
                          styles.constellationStepLine,
                          {
                            backgroundColor: stepUnlocked
                              ? selectedTheme.accent + "40"
                              : "rgba(255,255,255,0.04)",
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            <Text
              style={[
                styles.constellationTip,
                { color: selectedTheme.secondaryText },
              ]}
            >
              Explore nodes of productivity unlocked through continuous
              discipline.
            </Text>
          </View>
        </View>

        {/* INTERACTIVE achievements carousel */}
        <View style={styles.sectionSpacer}>
          <Text
            style={[styles.sectionTitleText, { color: selectedTheme.accent }]}
          >
            Achievements Showcase
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achieveCarousel}
          >
            {achievementList.map((a) => (
              <TouchableOpacity
                key={a.key}
                onPress={() => {
                  hapticLight();
                  setSelectedAchievement(a);
                }}
                activeOpacity={0.8}
                style={[
                  styles.achievementTile,
                  {
                    borderColor: a.isUnlocked
                      ? a.color
                      : "rgba(255,255,255,0.06)",
                    backgroundColor: a.isUnlocked
                      ? a.color + "0B"
                      : "rgba(255,255,255,0.02)",
                  },
                ]}
              >
                <Trophy size={20} color={a.isUnlocked ? a.color : "#555"} />
                <Text style={styles.achieveTileName} numberOfLines={1}>
                  {a.name}
                </Text>
                <View
                  style={[
                    styles.achieveRarityBadge,
                    {
                      backgroundColor: a.isUnlocked
                        ? a.color + "20"
                        : "rgba(255,255,255,0.05)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.achieveRarityText,
                      {
                        color: a.isUnlocked ? a.color : "rgba(255,255,255,0.4)",
                      },
                    ]}
                  >
                    {a.category.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* PERSONAL LIFE INSIGHTS */}
        <View style={styles.sectionSpacer}>
          <Text
            style={[styles.sectionTitleText, { color: selectedTheme.accent }]}
          >
            Life Insights
          </Text>
          <View style={styles.insightsRow}>
            <View
              style={[
                styles.insightCard,
                {
                  borderColor: selectedTheme.accent + "15",
                  backgroundColor: selectedTheme.accent + "05",
                },
              ]}
            >
              <Flame size={18} color="#FF9500" />
              <Text style={styles.insightLabel}>Most Consistent Habit</Text>
              <Text style={styles.insightVal}>Study Review</Text>
            </View>

            <View
              style={[
                styles.insightCard,
                {
                  borderColor: selectedTheme.accent + "15",
                  backgroundColor: selectedTheme.accent + "05",
                },
              ]}
            >
              <Award size={18} color={selectedTheme.accent} />
              <Text style={styles.insightLabel}>Strongest Skill</Text>
              <Text style={styles.insightVal}>STEM Focus</Text>
            </View>
          </View>
        </View>

        {/* JOURNEY MILESTONE TIMELINE */}
        <View style={styles.sectionSpacer}>
          <Text
            style={[styles.sectionTitleText, { color: selectedTheme.accent }]}
          >
            Journey Timeline
          </Text>
          <View style={styles.timelineContainer}>
            <View
              style={[
                styles.timelineTrack,
                { backgroundColor: selectedTheme.accent + "30" },
              ]}
            />

            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineNode,
                  { backgroundColor: selectedTheme.accent },
                ]}
              />
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>First Goal Completed</Text>
                <Text
                  style={[
                    styles.timelineDesc,
                    { color: selectedTheme.secondaryText },
                  ]}
                >
                  Created a baseline library of active notes.
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View
                style={[styles.timelineNode, { backgroundColor: "#FF9500" }]}
              />
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>First 7 Day Streak</Text>
                <Text
                  style={[
                    styles.timelineDesc,
                    { color: selectedTheme.secondaryText },
                  ]}
                >
                  Sustained daily review sessions.
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineNode,
                  { backgroundColor: selectedTheme.accent },
                ]}
              />
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>
                  Level {currentLevel} Unlocked
                </Text>
                <Text
                  style={[
                    styles.timelineDesc,
                    { color: selectedTheme.secondaryText },
                  ]}
                >
                  Advanced into the {levelTitle} rank status.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* LEGACY CUMULATIVE SECTION */}
        <View style={styles.sectionSpacer}>
          <Text
            style={[styles.sectionTitleText, { color: selectedTheme.accent }]}
          >
            Profile Legacy
          </Text>
          <View
            style={[
              styles.legacyContainer,
              {
                borderColor: selectedTheme.accent + "20",
                backgroundColor: selectedTheme.accent + "05",
              },
            ]}
          >
            <View style={styles.legacyGridRow}>
              <View style={styles.legacyGridItem}>
                <Clock size={20} color={selectedTheme.accent} />
                <Text style={styles.legacyVal}>
                  {(stats.totalFocusMinutes / 60).toFixed(1)}h
                </Text>
                <Text style={styles.legacyLabel}>Focused Time</Text>
              </View>
              <View style={styles.legacyGridItem}>
                <BookOpen size={20} color={selectedTheme.accent} />
                <Text style={styles.legacyVal}>{stats.totalNotesCreated}</Text>
                <Text style={styles.legacyLabel}>Notes Created</Text>
              </View>
              <View style={styles.legacyGridItem}>
                <Crown size={20} color={selectedTheme.accent} />
                <Text style={styles.legacyVal}>
                  {stats.totalTasksCompleted}
                </Text>
                <Text style={styles.legacyLabel}>Tasks Completed</Text>
              </View>
            </View>
          </View>
        </View>

        {/* STYLE CUSTOMIZATION */}
        <View style={styles.sectionSpacer}>
          <Text
            style={[styles.sectionTitleText, { color: selectedTheme.accent }]}
          >
            Showcase Theme Skins
          </Text>
          <Text
            style={[
              styles.themeSkinSubtitle,
              { color: selectedTheme.secondaryText },
            ]}
          >
            Changes apply across the entire app
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themesCarousel}
          >
            {PREMIUM_THEMES.map((pt) => {
              const jt = toJourneyTheme(pt);
              const locked = pt.isPro && !isPro;
              const active = selectedTheme.id === jt.id;
              return (
                <TouchableOpacity
                  key={jt.id}
                  onPress={() => {
                    if (locked) {
                      hapticLight();
                      showAlert({
                        title: "Milestone Reward",
                        message:
                          "This premium theme is unlocked through Milestone Rewards by hitting focus and habit goals.",
                        primaryButton: {
                          text: "View Milestones",
                          onPress: () =>
                            router.push("/rewards" as any),
                        },
                        secondaryButton: { text: "Not Now", onPress: () => {} },
                      });
                      return;
                    }
                    hapticSelection();
                    setPremiumThemeId(jt.id);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.themePill,
                    active && { borderColor: jt.accent, borderWidth: 2 },
                    locked && { opacity: 0.6 },
                  ]}
                >
                  <LinearGradient
                    colors={jt.colors}
                    style={styles.themePreviewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  {locked && (
                    <View style={styles.themePillLockOverlay}>
                      <Lock size={12} color="rgba(255,255,255,0.8)" />
                    </View>
                  )}
                  {active && (
                    <View
                      style={[
                        styles.themePillCheck,
                        { backgroundColor: jt.accent },
                      ]}
                    >
                      <Check size={9} color="#FFF" strokeWidth={3} />
                    </View>
                  )}
                  <Text style={styles.themePillText}>{jt.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SHARE MY JOURNEY BUTTON */}
        <View style={styles.shareBtnBox}>
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              setShareModalVisible(true);
            }}
            activeOpacity={0.8}
            style={[
              styles.shareJourneyBtn,
              { backgroundColor: selectedTheme.accent },
            ]}
          >
            <Share2 size={18} color="#FFFFFF" />
            <Text style={styles.shareJourneyBtnText}>Share My Journey</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* DETAILED ACHIEVEMENT CONSTELLATION STORY MODAL */}
      <Modal transparent visible={!!selectedAchievement} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              onPress={() => setSelectedAchievement(null)}
              style={styles.modalCloseBtn}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedAchievement && (
              <View style={styles.modalInner}>
                <Trophy
                  size={48}
                  color={selectedAchievement.color}
                  style={styles.modalTrophy}
                />
                <Text style={styles.modalTitle}>
                  {selectedAchievement.name}
                </Text>
                <Text style={styles.modalDesc}>
                  {selectedAchievement.description}
                </Text>
                <View style={styles.modalMetaRow}>
                  <View
                    style={[
                      styles.modalMetaBadge,
                      { backgroundColor: selectedAchievement.color + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalMetaBadgeText,
                        { color: selectedAchievement.color },
                      ]}
                    >
                      {selectedAchievement.isUnlocked ? "UNLOCKED" : "LOCKED"}
                    </Text>
                  </View>
                  <Text style={styles.modalUnlockDate}>
                    {selectedAchievement.isUnlocked
                      ? `Earned on ${todayDateStr}`
                      : "Not completed"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* SPOTIFY WRAPPED JOURNEY SOCIAL SHARE modal */}
      <Modal transparent visible={shareModalVisible} animationType="slide">
        <View style={styles.shareOverlay}>
          <View style={styles.shareContentBox}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitleText}>Journey Exporter</Text>
              <TouchableOpacity
                onPress={() => setShareModalVisible(false)}
                style={styles.shareModalClose}
              >
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.shareModalScroll}>
              {/* Aspect Ratio pills */}
              <View style={styles.ratioRow}>
                {["9:16", "1:1", "4:5"].map((ratio) => (
                  <TouchableOpacity
                    key={ratio}
                    onPress={() => {
                      hapticLight();
                      setShareRatio(ratio as any);
                    }}
                    style={[
                      styles.ratioBtn,
                      shareRatio === ratio && {
                        backgroundColor: selectedTheme.accent,
                        borderColor: selectedTheme.accent,
                      },
                    ]}
                  >
                    {ratio === "9:16" ? (
                      <Smartphone size={14} color="#FFF" />
                    ) : ratio === "1:1" ? (
                      <SquareIcon size={12} color="#FFF" />
                    ) : (
                      <BookOpen size={13} color="#FFF" />
                    )}
                    <Text style={styles.ratioBtnText}>
                      {ratio === "9:16"
                        ? "Story"
                        : ratio === "1:1"
                          ? "Square"
                          : "Portrait"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* CARD EXPORT */}
              <View style={styles.cardPreviewContainer}>
                <View
                  style={[
                    styles.wrappedCard,
                    shareRatio === "1:1" && { aspectRatio: 1 },
                    shareRatio === "4:5" && { aspectRatio: 4 / 5 },
                    { width: SCREEN_WIDTH * 0.75 },
                  ]}
                >
                  <LinearGradient
                    colors={selectedTheme.colors}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.1, y: 0.1 }}
                    end={{ x: 0.9, y: 0.9 }}
                  />
                  <View style={styles.wrappedCardPadding}>
                    <View style={styles.wrappedCardHeader}>
                      <Text style={styles.wrappedBranding}>GROWTH JOURNAL</Text>
                      <Text style={styles.wrappedDate}>{todayDateStr}</Text>
                    </View>

                    <View style={styles.wrappedCardBody}>
                      <Image
                        source={{
                          uri:
                            profile?.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/png?seed=${session?.user?.email || "Barok"}`,
                        }}
                        style={styles.wrappedAvatar}
                      />
                      <Text style={styles.wrappedName}>
                        {profile?.full_name || "Groundwork Explorer"}
                      </Text>
                      <Text
                        style={[
                          styles.wrappedStatus,
                          { color: selectedTheme.accent },
                        ]}
                      >
                        {journeyStatus}
                      </Text>

                      <View style={styles.wrappedGrid}>
                        <View style={styles.wrappedGridItem}>
                          <Text style={styles.wrappedGridLabel}>STREAK</Text>
                          <Text style={styles.wrappedGridVal}>
                            {stats.longestStreak} Days
                          </Text>
                        </View>
                        <View style={styles.wrappedGridItem}>
                          <Text style={styles.wrappedGridLabel}>
                            CUMULATIVE XP
                          </Text>
                          <Text style={styles.wrappedGridVal}>
                            {currentXP.toLocaleString()} XP
                          </Text>
                        </View>
                      </View>

                      <View style={styles.wrappedMotto}>
                        <Text style={styles.wrappedMottoText}>“{motto}”</Text>
                      </View>
                    </View>

                    <View style={styles.wrappedFooter}>
                      <Text style={styles.wrappedLink}>groundwork.app</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Export networks */}
              <View style={styles.exportNetworksTitle}>
                <Text style={styles.exportTitleText}>Share My Journey</Text>
              </View>
              <View style={styles.socialRow}>
                {["Instagram", "TikTok", "X / Twitter", "Telegram"].map(
                  (net) => (
                    <TouchableOpacity
                      key={net}
                      onPress={() => handlePlatformShare(net)}
                      style={styles.socialBtn}
                    >
                      <View
                        style={[
                          styles.socialBlob,
                          { backgroundColor: selectedTheme.accent + "25" },
                        ]}
                      >
                        <Share2 size={16} color={selectedTheme.accent} />
                      </View>
                      <Text style={styles.socialLabel} numberOfLines={1}>
                        {net}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Simulator Modal */}
      {simulating && (
        <Modal transparent visible={simulating} animationType="fade">
          <View style={styles.simOverlay}>
            <View style={styles.simBox}>
              <ActivityIndicator size="large" color={selectedTheme.accent} />
              <Text style={styles.simText}>
                {simStep === 0
                  ? `Initializing Connection...`
                  : simStep === 1
                    ? "Synthesizing lifetime highlights..."
                    : simStep === 2
                      ? "Structuring premium layout details..."
                      : "Done! Opening share utility..."}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  glowCircle: {
    position: "absolute",
    top: -120,
    right: -120,
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_WIDTH * 0.95,
    borderRadius: (SCREEN_WIDTH * 0.95) / 2,
  },
  glowCircleSecondary: {
    position: "absolute",
    bottom: -160,
    left: -160,
    width: SCREEN_WIDTH * 1.3,
    height: SCREEN_WIDTH * 1.3,
    borderRadius: (SCREEN_WIDTH * 1.3) / 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtnWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  navTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  heroCard: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarGlowContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 0.35,
  },
  heroAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#000",
  },
  heroNameText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  journeyStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeIcon: {
    marginRight: 6,
  },
  journeyStatusText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  mottoWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 28,
  },
  mottoTextPress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mottoQuoteText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
  },
  editMottoIcon: {
    opacity: 0.6,
  },
  mottoEditBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingLeft: 12,
    paddingRight: 4,
    height: 38,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  mottoInput: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    paddingVertical: 0,
  },
  saveMottoBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  legacyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  legacyHeaderItem: {
    flex: 1,
    alignItems: "center",
  },
  legacyHeaderVal: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 4,
  },
  legacyHeaderLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  legacyHeaderDivider: {
    width: 1,
    height: 24,
    opacity: 0.5,
  },
  sectionSpacer: {
    marginBottom: 28,
  },
  sectionTitleText: {
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  constellationCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  constellationGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 18,
  },
  constellationStepWrap: {
    alignItems: "center",
    position: "relative",
    flex: 1,
  },
  constellationNode: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  constellationStepLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  constellationStepLine: {
    position: "absolute",
    top: 20,
    left: 28,
    width: SCREEN_WIDTH * 0.12,
    height: 2,
    zIndex: -1,
  },
  constellationTip: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  achieveCarousel: {
    gap: 12,
    paddingRight: 20,
  },
  achievementTile: {
    width: 130,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  achieveTileName: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  achieveRarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  achieveRarityText: {
    fontSize: 8,
    fontFamily: "Inter_800ExtraBold",
  },
  insightsRow: {
    flexDirection: "row",
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  insightLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  insightVal: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: 20,
  },
  timelineTrack: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 4,
    width: 2,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timelineNode: {
    position: "absolute",
    left: -20,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineCard: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  timelineTitle: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  legacyContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  legacyGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legacyGridItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  legacyVal: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  legacyLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  themesCarousel: {
    gap: 12,
    paddingRight: 20,
  },
  themePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  themePreviewGradient: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themePillText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  shareBtnBox: {
    alignItems: "center",
    marginTop: 20,
  },
  shareJourneyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 32,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  shareJourneyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 24,
    padding: 24,
    width: SCREEN_WIDTH * 0.8,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 5,
  },
  modalInner: {
    alignItems: "center",
  },
  modalTrophy: {
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 14,
  },
  modalMetaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalMetaBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
  },
  modalUnlockDate: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  shareContentBox: {
    backgroundColor: "#141416",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: SCREEN_HEIGHT * 0.82,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  shareModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  shareModalTitleText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  shareModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareModalScroll: {
    paddingBottom: 40,
  },
  ratioRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  ratioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ratioBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  cardPreviewContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  wrappedCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  wrappedCardPadding: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  wrappedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wrappedBranding: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.8,
  },
  wrappedDate: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  wrappedCardBody: {
    alignItems: "center",
    marginVertical: 12,
  },
  wrappedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  wrappedName: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 2,
  },
  wrappedStatus: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  wrappedGrid: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    justifyContent: "center",
    marginBottom: 14,
  },
  wrappedGridItem: {
    width: "45%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  wrappedGridLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  wrappedGridVal: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
  },
  wrappedMotto: {
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 4,
  },
  wrappedMottoText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontStyle: "italic",
    textAlign: "center",
  },
  wrappedFooter: {
    alignItems: "center",
  },
  wrappedLink: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  exportNetworksTitle: {
    marginBottom: 12,
  },
  exportTitleText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  socialBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  socialBlob: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabel: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  simOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  simBox: {
    backgroundColor: "#1E1E22",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 16,
    width: 250,
  },
  simText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  themeSkinSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
  },
  themePillLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  themePillCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
