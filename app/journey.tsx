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
import { BrandHeader } from "@/components/ui/BrandHeader";
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
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
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

export default function JourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { profile, session, getUserId } = useAuthStore();
  const userId = getUserId();

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
  const entryScale = useRef(new Animated.Value(0.96)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entryScale, {
        toValue: 1,
        tension: 24,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
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

  // Generate share asset pipeline
  const handlePlatformShare = (platform: string) => {
    hapticLight();
    setSimStep(0);
    setSimulating(true);

    setTimeout(() => {
      setSimStep(1);
      setTimeout(() => {
        setSimStep(2);
        setTimeout(() => {
          hapticSuccess();
          setSimStep(3);

          setTimeout(async () => {
            setSimulating(false);
            setShareModalVisible(false);
            try {
              await Share.share({
                message: `Groundwork Journey Showcase\n\nRank: ${journeyStatus} (Lvl ${currentLevel})\nActive Streak: ${stats.longestStreak} Days\nFocused Time: ${(stats.totalFocusMinutes / 60).toFixed(1)} Hours\nIdentity Quote: "${motto}"\n\nShared via Groundwork.`,
                title: "My Groundwork Journey",
              });
            } catch (_) {}
          }, 800);
        }, 600);
      }, 600);
    }, 600);
  };

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      {confettiActive && (
        <Confetti onComplete={() => setConfettiActive(false)} />
      )}

      {/* Main Page Scroll */}
      <Animated.ScrollView
        style={[styles.scroll, { opacity: entryOpacity }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader title="groundwork." onBack={() => router.back()} />

        {/* Heading */}
        <View style={styles.headerBlock}>
          <Text style={styles.mainTitle}>Growth showcase.</Text>
          <Text style={styles.subTitle}>Personal journey & progression</Text>
        </View>

        {/* HERO IDENTITY CARD */}
        <Animated.View
          style={[styles.heroCard, { transform: [{ scale: entryScale }] }]}
        >
          {/* Avatar Ring */}
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.heroAvatar}
              />
            ) : (
              <View
                style={[
                  styles.heroAvatar,
                  {
                    backgroundColor: theme.cardSolid,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: theme.accent,
                  }}
                >
                  {(
                    profile?.full_name ||
                    profile?.username ||
                    session?.user?.email ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarStatusDot} />
          </View>

          {/* User Meta Name */}
          <Text style={styles.heroNameText}>
            {profile?.full_name || profile?.username || (session?.user?.email ? session.user.email.split("@")[0] : "Learner")}
          </Text>

          {/* Evolving Progression Journey Title */}
          <View style={styles.journeyStatusBadge}>
            <Compass size={14} color={theme.accent} style={{ marginRight: 6 }} />
            <Text style={styles.journeyStatusText}>{journeyStatus}</Text>
          </View>

          {/* Identity Motto Quote Block */}
          <View style={styles.mottoWrapper}>
            {isEditingMotto ? (
              <View style={styles.mottoEditBox}>
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
                  <Check size={18} color={theme.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditingMotto(true)}
                style={styles.mottoTextPress}
                activeOpacity={0.7}
              >
                <Text style={styles.mottoQuoteText}>“{motto}”</Text>
                <Edit2 size={12} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Legacy Summary Row */}
          <View style={styles.legacyHeaderRow}>
            <View style={styles.legacyHeaderItem}>
              <Text style={styles.legacyHeaderVal}>{currentLevel}</Text>
              <Text style={styles.legacyHeaderLabel}>LEVEL</Text>
            </View>
            <View style={styles.legacyHeaderDivider} />
            <View style={styles.legacyHeaderItem}>
              <Text style={[styles.legacyHeaderVal, { color: "#FF9500" }]}>
                {stats.longestStreak}
              </Text>
              <Text style={styles.legacyHeaderLabel}>STREAK</Text>
            </View>
            <View style={styles.legacyHeaderDivider} />
            <View style={styles.legacyHeaderItem}>
              <Text style={styles.legacyHeaderVal}>
                {currentXP.toLocaleString()}
              </Text>
              <Text style={styles.legacyHeaderLabel}>TOTAL XP</Text>
            </View>
          </View>
        </Animated.View>

        {/* PROGRESSION CONSTELLATION TRACK */}
        <View style={styles.sectionSpacer}>
          <Text style={styles.sectionTitleText}>Progression Constellation</Text>
          <View style={styles.constellationCard}>
            <View style={styles.constellationGrid}>
              {[1, 2, 3, 4, 5].map((step) => {
                const stepRequiredXp = getXPRequiredForLevel(step * 3);
                const stepUnlocked = currentXP >= stepRequiredXp;
                return (
                  <View key={step} style={styles.constellationStepWrap}>
                    <View
                      style={[
                        styles.constellationNode,
                        stepUnlocked && styles.constellationNodeActive,
                      ]}
                    >
                      <Sparkles
                        size={16}
                        color={stepUnlocked ? theme.accent : theme.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.constellationStepLabel,
                        stepUnlocked ? styles.stepLabelActive : styles.stepLabelInactive,
                      ]}
                    >
                      Lvl {step * 3}
                    </Text>
                    {step < 5 && (
                      <View
                        style={[
                          styles.constellationStepLine,
                          stepUnlocked && { backgroundColor: theme.accent },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            <Text style={styles.constellationTip}>
              Progression unlocks organically through focused execution and habits.
            </Text>
          </View>
        </View>

        {/* ACHIEVEMENTS CAROUSEL */}
        <View style={styles.sectionSpacer}>
          <Text style={styles.sectionTitleText}>Achievements Showcase</Text>
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
                  a.isUnlocked && { borderColor: theme.accent },
                ]}
              >
                <Trophy size={20} color={a.isUnlocked ? theme.accent : theme.textMuted} />
                <Text style={styles.achieveTileName} numberOfLines={1}>
                  {a.name}
                </Text>
                <View
                  style={[
                    styles.achieveRarityBadge,
                    {
                      backgroundColor: a.isUnlocked
                        ? `${theme.accent}1A`
                        : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.achieveRarityText,
                      { color: a.isUnlocked ? theme.accent : theme.textMuted },
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
          <Text style={styles.sectionTitleText}>Discipline Metrics</Text>
          <View style={styles.insightsRow}>
            <View style={styles.insightCard}>
              <Flame size={18} color="#FF9500" />
              <Text style={styles.insightLabel}>Most Consistent Habit</Text>
              <Text style={styles.insightVal}>Daily Ritual</Text>
            </View>

            <View style={styles.insightCard}>
              <Award size={18} color={theme.accent} />
              <Text style={styles.insightLabel}>Current Title</Text>
              <Text style={styles.insightVal}>{levelTitle}</Text>
            </View>
          </View>
        </View>

        {/* JOURNEY MILESTONE TIMELINE */}
        <View style={styles.sectionSpacer}>
          <Text style={styles.sectionTitleText}>Journey Milestones</Text>
          <View style={styles.timelineContainer}>
            <View style={styles.timelineTrack} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, { backgroundColor: theme.accent }]} />
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>First Goal Completed</Text>
                <Text style={styles.timelineDesc}>
                  Built a consistent foundation of daily habits.
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, { backgroundColor: "#FF9500" }]} />
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>First 7 Day Streak</Text>
                <Text style={styles.timelineDesc}>
                  Sustained daily review sessions.
                </Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, { backgroundColor: theme.accent }]} />
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>
                  Level {currentLevel} Reached
                </Text>
                <Text style={styles.timelineDesc}>
                  Advanced into the {levelTitle} rank status.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* LEGACY CUMULATIVE SECTION */}
        <View style={styles.sectionSpacer}>
          <Text style={styles.sectionTitleText}>Total Lifetime Output</Text>
          <View style={styles.legacyContainer}>
            <View style={styles.legacyGridRow}>
              <View style={styles.legacyGridItem}>
                <Clock size={20} color={theme.accent} />
                <Text style={styles.legacyVal}>
                  {(stats.totalFocusMinutes / 60).toFixed(1)}h
                </Text>
                <Text style={styles.legacyLabel}>Focused Time</Text>
              </View>
              <View style={styles.legacyGridItem}>
                <Flame size={20} color={theme.accent} />
                <Text style={styles.legacyVal}>{stats.totalHabitsCompleted || stats.longestStreak || 0}</Text>
                <Text style={styles.legacyLabel}>Habit Check-ins</Text>
              </View>
              <View style={styles.legacyGridItem}>
                <Crown size={20} color={theme.accent} />
                <Text style={styles.legacyVal}>{stats.totalTasksCompleted}</Text>
                <Text style={styles.legacyLabel}>Tasks Completed</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SHARE MY JOURNEY BUTTON */}
        <View style={styles.shareBtnBox}>
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              setShareModalVisible(true);
            }}
            activeOpacity={0.8}
            style={styles.shareJourneyBtn}
          >
            <Share2 size={18} color="#FFFFFF" />
            <Text style={styles.shareJourneyBtnText}>Share My Journey</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* ACHIEVEMENT DETAIL MODAL */}
      <Modal transparent visible={!!selectedAchievement} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              onPress={() => setSelectedAchievement(null)}
              style={styles.modalCloseBtn}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            {selectedAchievement && (
              <View style={styles.modalInner}>
                <Trophy
                  size={44}
                  color={selectedAchievement.isUnlocked ? theme.accent : theme.textMuted}
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
                      {
                        backgroundColor: selectedAchievement.isUnlocked
                          ? `${theme.accent}1A`
                          : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalMetaBadgeText,
                        { color: selectedAchievement.isUnlocked ? theme.accent : theme.textMuted },
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

      {/* SHARE MODAL */}
      <Modal transparent visible={shareModalVisible} animationType="slide">
        <View style={styles.shareOverlay}>
          <View style={styles.shareContentBox}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitleText}>Journey Exporter</Text>
              <TouchableOpacity
                onPress={() => setShareModalVisible(false)}
                style={styles.shareModalClose}
              >
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.shareModalScroll} showsVerticalScrollIndicator={false}>
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
                      shareRatio === ratio && styles.ratioBtnActive,
                    ]}
                  >
                    {ratio === "9:16" ? (
                      <Smartphone size={14} color={shareRatio === ratio ? "#FFF" : theme.textSecondary} />
                    ) : ratio === "1:1" ? (
                      <SquareIcon size={12} color={shareRatio === ratio ? "#FFF" : theme.textSecondary} />
                    ) : (
                      <BookOpen size={13} color={shareRatio === ratio ? "#FFF" : theme.textSecondary} />
                    )}
                    <Text
                      style={[
                        styles.ratioBtnText,
                        shareRatio === ratio && { color: "#FFF" },
                      ]}
                    >
                      {ratio === "9:16"
                        ? "Story"
                        : ratio === "1:1"
                          ? "Square"
                          : "Portrait"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* CARD PREVIEW */}
              <View style={styles.cardPreviewContainer}>
                <View
                  style={[
                    styles.wrappedCard,
                    shareRatio === "1:1" && { aspectRatio: 1 },
                    shareRatio === "4:5" && { aspectRatio: 4 / 5 },
                    { width: SCREEN_WIDTH * 0.76 },
                  ]}
                >
                  <View style={styles.wrappedCardPadding}>
                    <View style={styles.wrappedCardHeader}>
                      <Text style={styles.wrappedBranding}>GROUNDWORK</Text>
                      <Text style={styles.wrappedDate}>{todayDateStr}</Text>
                    </View>

                    <View style={styles.wrappedCardBody}>
                      {profile?.avatar_url ? (
                        <Image
                          source={{ uri: profile.avatar_url }}
                          style={styles.wrappedAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.wrappedAvatar,
                            {
                              backgroundColor: theme.cardSolid,
                              alignItems: "center",
                              justifyContent: "center",
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 22,
                              fontWeight: "700",
                              color: theme.accent,
                            }}
                          >
                            {(
                              profile?.full_name ||
                              profile?.username ||
                              session?.user?.email ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.wrappedName}>
                        {profile?.full_name || profile?.username || (session?.user?.email ? session.user.email.split("@")[0] : "Learner")}
                      </Text>
                      <Text style={styles.wrappedStatus}>
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
                          <Text style={styles.wrappedGridLabel}>CUMULATIVE XP</Text>
                          <Text style={styles.wrappedGridVal}>
                            {currentXP.toLocaleString()}
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
                <Text style={styles.exportTitleText}>Share to Social</Text>
              </View>
              <View style={styles.socialRow}>
                {["Instagram", "TikTok", "X / Twitter", "Telegram"].map(
                  (net) => (
                    <TouchableOpacity
                      key={net}
                      onPress={() => handlePlatformShare(net)}
                      style={styles.socialBtn}
                    >
                      <View style={styles.socialBlob}>
                        <Share2 size={16} color={theme.accent} />
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
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.simText}>
                {simStep === 0
                  ? "Initializing connection..."
                  : simStep === 1
                    ? "Synthesizing highlights..."
                    : simStep === 2
                      ? "Formatting share sheet..."
                      : "Opening share utility..."}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    headerBlock: {
      marginBottom: 24,
      marginTop: 8,
    },
    mainTitle: {
      fontSize: 34,
      fontFamily: "Inter_700Bold",
      color: theme.text,
      letterSpacing: -1,
    },
    subTitle: {
      fontSize: 15,
      fontFamily: "PlayfairDisplay_600SemiBold_Italic",
      color: theme.textSecondary,
      marginTop: 4,
    },
    heroCard: {
      alignItems: "center",
      backgroundColor: theme.cardSolid,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.separator,
      padding: 24,
      marginBottom: 28,
    },
    avatarContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2,
      borderColor: theme.separator,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      position: "relative",
    },
    heroAvatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
    },
    avatarStatusDot: {
      position: "absolute",
      bottom: 2,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.background,
      backgroundColor: theme.accent,
    },
    heroNameText: {
      color: theme.text,
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    journeyStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 16,
    },
    journeyStatusText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: theme.accent,
      letterSpacing: 0.3,
    },
    mottoWrapper: {
      width: "100%",
      paddingHorizontal: 10,
      alignItems: "center",
      marginBottom: 20,
    },
    mottoTextPress: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    mottoQuoteText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontFamily: "PlayfairDisplay_600SemiBold_Italic",
      textAlign: "center",
      lineHeight: 18,
    },
    mottoEditBox: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 12,
      backgroundColor: theme.background,
      paddingLeft: 12,
      paddingRight: 4,
      height: 38,
      width: "100%",
    },
    mottoInput: {
      color: theme.text,
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
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.separator,
    },
    legacyHeaderItem: {
      flex: 1,
      alignItems: "center",
    },
    legacyHeaderVal: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: theme.text,
      marginBottom: 2,
    },
    legacyHeaderLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
    },
    legacyHeaderDivider: {
      width: 1,
      height: 20,
      backgroundColor: theme.separator,
    },
    sectionSpacer: {
      marginBottom: 28,
    },
    sectionTitleText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      color: theme.textSecondary,
      letterSpacing: 1,
      marginBottom: 12,
    },
    constellationCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
      padding: 20,
      alignItems: "center",
    },
    constellationGrid: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 16,
    },
    constellationStepWrap: {
      alignItems: "center",
      position: "relative",
      flex: 1,
    },
    constellationNode: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.5,
      borderColor: theme.separator,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    constellationNodeActive: {
      borderColor: theme.accent,
      backgroundColor: `${theme.accent}15`,
    },
    constellationStepLabel: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
    },
    stepLabelActive: {
      color: theme.text,
    },
    stepLabelInactive: {
      color: theme.textMuted,
    },
    constellationStepLine: {
      position: "absolute",
      top: 18,
      left: 26,
      width: SCREEN_WIDTH * 0.11,
      height: 1.5,
      backgroundColor: theme.separator,
      zIndex: -1,
    },
    constellationTip: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: theme.textSecondary,
      textAlign: "center",
    },
    achieveCarousel: {
      gap: 10,
      paddingRight: 20,
    },
    achievementTile: {
      width: 130,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
      padding: 14,
      alignItems: "center",
      gap: 8,
    },
    achieveTileName: {
      color: theme.text,
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    achieveRarityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    achieveRarityText: {
      fontSize: 8,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    insightsRow: {
      flexDirection: "row",
      gap: 10,
    },
    insightCard: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
      padding: 16,
      gap: 6,
    },
    insightLabel: {
      color: theme.textSecondary,
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    insightVal: {
      color: theme.text,
      fontSize: 14,
      fontFamily: "Inter_700Bold",
    },
    timelineContainer: {
      position: "relative",
      paddingLeft: 18,
    },
    timelineTrack: {
      position: "absolute",
      top: 6,
      bottom: 6,
      left: 3,
      width: 1.5,
      backgroundColor: theme.separator,
    },
    timelineItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    timelineNode: {
      position: "absolute",
      left: -18,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    timelineCard: {
      flex: 1,
      marginLeft: 8,
      backgroundColor: theme.cardSolid,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    timelineTitle: {
      color: theme.text,
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      marginBottom: 2,
    },
    timelineDesc: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: theme.textSecondary,
    },
    legacyContainer: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
      padding: 20,
    },
    legacyGridRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    legacyGridItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    legacyVal: {
      color: theme.text,
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    legacyLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
    },
    shareBtnBox: {
      alignItems: "center",
      marginTop: 12,
    },
    shareJourneyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 50,
      borderRadius: 25,
      paddingHorizontal: 32,
      backgroundColor: theme.accent,
    },
    shareJourneyBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Inter_700Bold",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.cardSolid,
      borderRadius: 24,
      padding: 24,
      width: "100%",
      maxWidth: 340,
      position: "relative",
      borderWidth: 1,
      borderColor: theme.separator,
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
      marginBottom: 12,
    },
    modalTitle: {
      color: theme.text,
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      marginBottom: 6,
      textAlign: "center",
    },
    modalDesc: {
      color: theme.textSecondary,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 18,
    },
    modalMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      borderTopWidth: 1,
      borderTopColor: theme.separator,
      paddingTop: 12,
    },
    modalMetaBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    modalMetaBadgeText: {
      fontSize: 9,
      fontFamily: "Inter_700Bold",
    },
    modalUnlockDate: {
      color: theme.textSecondary,
      fontSize: 10,
      fontFamily: "Inter_500Medium",
    },
    shareOverlay: {
      flex: 1,
      backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    shareContentBox: {
      backgroundColor: theme.cardSolid,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      height: SCREEN_HEIGHT * 0.84,
      paddingHorizontal: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderColor: theme.separator,
    },
    shareModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    shareModalTitleText: {
      color: theme.text,
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    shareModalClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      alignItems: "center",
      justifyContent: "center",
    },
    shareModalScroll: {
      paddingBottom: 40,
    },
    ratioRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      marginBottom: 18,
    },
    ratioBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    ratioBtnActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    ratioBtnText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontFamily: "Inter_700Bold",
    },
    cardPreviewContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    wrappedCard: {
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.background,
    },
    wrappedCardPadding: {
      flex: 1,
      padding: 18,
      justifyContent: "space-between",
    },
    wrappedCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    wrappedBranding: {
      color: theme.text,
      fontSize: 9,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
    },
    wrappedDate: {
      color: theme.textSecondary,
      fontSize: 9,
      fontFamily: "Inter_500Medium",
    },
    wrappedCardBody: {
      alignItems: "center",
      marginVertical: 10,
    },
    wrappedAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: theme.separator,
    },
    wrappedName: {
      color: theme.text,
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      marginBottom: 2,
    },
    wrappedStatus: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: theme.accent,
      marginBottom: 14,
    },
    wrappedGrid: {
      flexDirection: "row",
      gap: 8,
      width: "100%",
      justifyContent: "center",
      marginBottom: 10,
    },
    wrappedGridItem: {
      width: "46%",
      backgroundColor: theme.cardSolid,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.separator,
      padding: 8,
      alignItems: "center",
    },
    wrappedGridLabel: {
      color: theme.textSecondary,
      fontSize: 8,
      fontFamily: "Inter_700Bold",
      marginBottom: 2,
    },
    wrappedGridVal: {
      color: theme.text,
      fontSize: 11,
      fontFamily: "Inter_700Bold",
    },
    wrappedMotto: {
      width: "100%",
      paddingHorizontal: 8,
      marginTop: 2,
    },
    wrappedMottoText: {
      color: theme.textSecondary,
      fontSize: 10,
      fontFamily: "PlayfairDisplay_600SemiBold_Italic",
      textAlign: "center",
    },
    wrappedFooter: {
      alignItems: "center",
    },
    wrappedLink: {
      color: theme.textMuted,
      fontSize: 8,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    exportNetworksTitle: {
      marginBottom: 10,
    },
    exportTitleText: {
      color: theme.text,
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
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
      backgroundColor: `${theme.accent}15`,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    socialLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      fontFamily: "Inter_500Medium",
    },
    simOverlay: {
      flex: 1,
      backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    simBox: {
      backgroundColor: theme.cardSolid,
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      gap: 14,
      width: 240,
    },
    simText: {
      color: theme.text,
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
  });
}
