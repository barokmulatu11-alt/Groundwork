import { AppText as Text } from "@/components/ui/AppText";
import { useTheme } from "@/lib/ThemeContext";
import { getUserStats } from "@/lib/connect/achievementEngine";
import { getLevelFromXP, getLevelTitle } from "@/lib/connect/xpSystem";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    Award,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Clock,
    Compass,
    Flame,
    Share2,
    Sparkles,
    Star,
    Target,
    TrendingUp,
    Zap,
} from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;

// Journey Status Titles
const JOURNEY_TITLES = [
  { range: [0, 10], title: "Explorer", Icon: Sparkles },
  { range: [11, 25], title: "Builder", Icon: Target },
  { range: [26, 40], title: "Scholar", Icon: BookOpen },
  { range: [41, 60], title: "Strategist", Icon: TrendingUp },
  { range: [61, 80], title: "Architect", Icon: Compass },
  { range: [81, 100], title: "Master", Icon: Award },
];

const getJourneyStatus = (level: number) => {
  const status = JOURNEY_TITLES.find(
    (s) => level >= s.range[0] && level <= s.range[1],
  );
  return status || { title: "Legend", Icon: Star };
};

interface JourneyShowcaseCardProps {
  userId: string;
  profile: any;
  onShare?: () => void;
}

export function JourneyShowcaseCard({
  userId,
  profile,
  onShare,
}: JourneyShowcaseCardProps) {
  const { theme } = useTheme();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 10,
      onPanResponderRelease: (_, { dx }) => {
        if (dx > 50 && activeCardIndex > 0) {
          setActiveCardIndex(activeCardIndex - 1);
          hapticLight();
        } else if (dx < -50 && activeCardIndex < 4) {
          setActiveCardIndex(activeCardIndex + 1);
          hapticLight();
        }
      },
    }),
  ).current;

  const stats = useMemo(() => {
    if (!userId)
      return {
        longestStreak: 0,
        xp: 0,
        totalFocusSessions: 0,
        totalFocusMinutes: 0,
        totalNotesCreated: 0,
        totalStudyHours: 0,
      };
    try {
      return getUserStats(userId);
    } catch (error) {
      console.warn("Error getting user stats:", error);
      return {
        longestStreak: 0,
        xp: 0,
        totalFocusSessions: 0,
        totalFocusMinutes: 0,
        totalNotesCreated: 0,
        totalStudyHours: 0,
      };
    }
  }, [userId]);

  // Guard clause AFTER all hooks
  if (!userId || !profile) {
    return null;
  }

  const currentLevel = getLevelFromXP(profile?.xp || stats.xp || 0);
  const levelTitle = getLevelTitle(currentLevel);
  const journeyStatus = getJourneyStatus(currentLevel);

  const handleShare = async () => {
    hapticLight();
    try {
      const shareMessage = `My Groundwork Journey: ${journeyStatus.title} (Level ${currentLevel})\n${currentLevel > 0 ? `Streak: ${stats.longestStreak} days\nXP: ${(profile?.xp || stats.xp || 0).toLocaleString()}\n` : ""}Join me on this learning adventure.`;
      await Share.share({
        message: Platform.OS === "ios" ? shareMessage : shareMessage,
        title: "My Groundwork Journey",
        url: "https://groundwork.app",
      });
      hapticSuccess();
    } catch (err) {
      console.warn("Share failed:", err);
    }
  };

  // Card 1: Journey Overview
  const OverviewCard = () => (
    <View style={styles.cardContent}>
      <View style={styles.centerContent}>
        <View style={styles.avatarLarge}>
          {theme.background === "#000000" && (
            <View
              style={[
                styles.avatarGlow,
                { backgroundColor: theme.accent + "12" },
              ]}
            />
          )}
          {profile?.avatar_url ? (
            <Animated.Image
              source={{ uri: profile.avatar_url }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 60,
              }}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: theme.accent + "20" },
              ]}
            >
              <Star size={48} color={theme.accent} />
            </View>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
          {profile?.full_name || "Explorer"}
        </Text>

        <View style={styles.statusBadge}>
          {journeyStatus.Icon &&
            React.createElement(journeyStatus.Icon, {
              size: 16,
              color: theme.accent,
              style: { marginRight: 8 },
            })}
          <Text style={[styles.statusTitle, { color: theme.primaryText }]}>
            {journeyStatus.title}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Zap size={16} color={theme.accent} />
            <Text style={[styles.statText, { color: theme.secondaryText }]}>
              Level {currentLevel}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Flame size={16} color="#FF9500" />
            <Text style={[styles.statText, { color: theme.secondaryText }]}>
              {stats.longestStreak}d Streak
            </Text>
          </View>
        </View>

        <View style={styles.xpContainer}>
          <Text style={[styles.xpLabel, { color: theme.secondaryText }]}>
            TOTAL XP
          </Text>
          <Text style={[styles.xpValue, { color: theme.accent }]}>
            {(profile?.xp || stats.xp || 0).toLocaleString()}
          </Text>
        </View>

        {profile?.bio && (
          <Text
            style={[styles.bio, { color: theme.secondaryText }]}
            numberOfLines={2}
          >
            "{profile.bio}"
          </Text>
        )}

        <View style={styles.nextMilestone}>
          <Target size={14} color={theme.accent} />
          <Text style={[styles.milestoneText, { color: theme.secondaryText }]}>
            Next Level:{" "}
            {Math.round(
              (currentLevel + 1) * 1000 - (profile?.xp || stats.xp || 0),
            )}{" "}
            XP
          </Text>
        </View>
      </View>
    </View>
  );

  // Card 2: Achievements
  const AchievementsCard = () => {
    const milestones = [
      {
        Icon: Award,
        label: "Champion",
        value: "Level " + currentLevel,
        color: "#FFD60A",
      },
      {
        Icon: Flame,
        label: "Best Streak",
        value: stats.longestStreak + " days",
        color: "#FF6B35",
      },
      {
        Icon: Clock,
        label: "Focus Time",
        value: (stats.totalFocusMinutes / 60).toFixed(1) + "h",
        color: "#AF52DE",
      },
      {
        Icon: BookOpen,
        label: "Notes",
        value: stats.totalNotesCreated + "",
        color: "#34C759",
      },
    ];

    return (
      <View style={styles.cardContent}>
        {/* Title */}
        <Text style={[styles.sectionHeading, { color: theme.primaryText }]}>
          Milestones
        </Text>
        <Text style={[styles.sectionSub, { color: theme.tertiaryText }]}>
          Your progress at a glance
        </Text>

        {/* 2×2 grid — two explicit rows */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {milestones.slice(0, 2).map((m, idx) => (
              <View
                key={idx}
                style={[
                  styles.milestoneCell,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <View style={[styles.milestoneIconBox, { backgroundColor: m.color + "22" }]}>
                  <m.Icon size={18} color={m.color} />
                </View>
                <Text style={[styles.milestoneCellValue, { color: theme.primaryText }]}>
                  {m.value}
                </Text>
                <Text style={[styles.milestoneCellLabel, { color: theme.tertiaryText }]}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {milestones.slice(2, 4).map((m, idx) => (
              <View
                key={idx}
                style={[
                  styles.milestoneCell,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <View style={[styles.milestoneIconBox, { backgroundColor: m.color + "22" }]}>
                  <m.Icon size={18} color={m.color} />
                </View>
                <Text style={[styles.milestoneCellValue, { color: theme.primaryText }]}>
                  {m.value}
                </Text>
                <Text style={[styles.milestoneCellLabel, { color: theme.tertiaryText }]}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* XP footer */}
        <View style={[styles.xpFooter, { backgroundColor: theme.accent + "12", borderColor: theme.accent + "30" }]}>
          <Zap size={13} color={theme.accent} />
          <Text style={[styles.xpFooterLabel, { color: theme.secondaryText }]}>
            Total XP
          </Text>
          <Text style={[styles.xpFooterValue, { color: theme.accent }]}>
            {(profile?.xp || stats.xp || 0).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  // Card 3: Learning Statistics
  const StatsCard = () => (
    <View style={styles.cardContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsSection}>
          <Text style={[styles.sectionHeading, { color: theme.primaryText }]}>
            Learning Stats
          </Text>

          {[
            {
              icon: BookOpen,
              label: "Notes Created",
              value: stats.totalNotesCreated,
            },
            {
              icon: Target,
              label: "Goals Completed",
              value: stats.totalTasksCompleted,
            },
            {
              icon: Zap,
              label: "Focus Sessions",
              value: stats.totalFocusSessions,
            },
            {
              icon: TrendingUp,
              label: "Study Hours",
              value: (stats.totalStudyHours || 0).toFixed(1),
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <View
                key={idx}
                style={[
                  styles.statRow2,
                  { borderBottomColor: theme.cardBorder },
                ]}
              >
                <View style={styles.statRowLeft}>
                  <Icon size={18} color={theme.accent} />
                  <Text
                    style={[
                      styles.statRowLabel,
                      { color: theme.secondaryText },
                    ]}
                  >
                    {stat.label}
                  </Text>
                </View>
                <Text
                  style={[styles.statRowValue, { color: theme.primaryText }]}
                >
                  {stat.value}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // Card 4: Personal Insights
  const InsightsCard = () => (
    <View style={styles.cardContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.insightSection}>
          <Text style={[styles.sectionHeading, { color: theme.primaryText }]}>
            Your Insights
          </Text>

          {[
            {
              title: "Strongest Habit",
              value: stats.longestStreak + " day streak",
              icon: Flame,
            },
            {
              title: "Most Productive",
              value: stats.recentEarlyBirdSession
                ? "Early Bird 🌅"
                : "Night Owl 🌙",
              icon: Sparkles,
            },
            {
              title: "Consistency Score",
              value:
                Math.min(100, Math.round((stats.longestStreak / 100) * 100)) +
                "%",
              icon: TrendingUp,
            },
            {
              title: "Total XP Earned",
              value: (profile?.xp || stats.xp || 0).toLocaleString(),
              icon: Zap,
            },
          ].map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <View
                key={idx}
                style={[
                  styles.insightItem,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.insightHeader}>
                  <Icon size={16} color={theme.accent} />
                  <Text
                    style={[
                      styles.insightTitle,
                      { color: theme.secondaryText },
                    ]}
                  >
                    {insight.title}
                  </Text>
                </View>
                <Text
                  style={[styles.insightValue, { color: theme.primaryText }]}
                >
                  {insight.value}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // Card 5: Share Preview
  const SharePreviewCard = () => (
    <View style={styles.cardContent}>
      <View style={styles.centerContent}>
        <Text style={[styles.previewLabel, { color: theme.secondaryText }]}>
          Your Shareable Card
        </Text>

        <View
          style={[
            styles.sharePreview,
            { backgroundColor: theme.card, borderColor: theme.accent },
          ]}
        >
          <View style={styles.previewContent}>
            <Text style={[styles.previewTitle, { color: theme.primaryText }]}>
              {journeyStatus.Icon &&
                React.createElement(journeyStatus.Icon, {
                  size: 16,
                  color: theme.accent,
                  style: { marginRight: 8 },
                })}
              {journeyStatus.title}
            </Text>
            <Text style={[styles.previewName, { color: theme.primaryText }]}>
              {profile?.full_name || "Explorer"}
            </Text>
            <View style={styles.previewStats}>
              <Text
                style={[styles.previewStat, { color: theme.secondaryText }]}
              >
                Level {currentLevel}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Flame size={12} color={theme.accent} />
                <Text
                  style={[styles.previewStat, { color: theme.secondaryText }]}
                >
                  {" "}
                  {stats.longestStreak}d
                </Text>
              </View>
              <Text
                style={[styles.previewStat, { color: theme.secondaryText }]}
              >
                {(profile?.xp || stats.xp || 0).toLocaleString()} XP
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          style={[styles.shareBtn, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}
        >
          <Share2 size={16} color="#FFFFFF" />
          <Text style={styles.shareBtnText}>Share My Journey</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const cards = [
    <OverviewCard key="overview" />,
    <AchievementsCard key="achievements" />,
    <StatsCard key="stats" />,
    <InsightsCard key="insights" />,
    <SharePreviewCard key="share" />,
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.accent + "15", theme.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      />

      <View
        {...panResponder.panHandlers}
        style={[
          styles.cardContainer,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Sparkles size={16} color={theme.accent} />
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
              My Journey
            </Text>
          </View>
          <View style={styles.indicatorDots}>
            {[0, 1, 2, 3, 4].map((dot) => (
              <View
                key={dot}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      dot === activeCardIndex ? theme.accent : theme.cardBorder,
                    width: dot === activeCardIndex ? 24 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardsWrapper}>{cards[activeCardIndex]}</View>

        {/* Navigation Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            onPress={() => {
              if (activeCardIndex > 0) {
                setActiveCardIndex(activeCardIndex - 1);
                hapticLight();
              }
            }}
            disabled={activeCardIndex === 0}
            style={styles.navBtn}
          >
            <ChevronLeft
              size={20}
              color={activeCardIndex === 0 ? theme.cardBorder : theme.accent}
            />
          </TouchableOpacity>

          <Text style={[styles.cardIndicator, { color: theme.secondaryText }]}>
            {activeCardIndex + 1} / 5
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (activeCardIndex < 4) {
                setActiveCardIndex(activeCardIndex + 1);
                hapticLight();
              }
            }}
            disabled={activeCardIndex === 4}
            style={styles.navBtn}
          >
            <ChevronRight
              size={20}
              color={activeCardIndex === 4 ? theme.cardBorder : theme.accent}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    marginHorizontal: 20,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    zIndex: 0,
  },
  cardContainer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 480,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  indicatorDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  cardsWrapper: {
    height: 440,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "visible",
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  avatarGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    zIndex: -1,
    top: -20,
    left: -20,
    opacity: 0.9,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusEmoji: {
    fontSize: 18,
  },
  statusTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  xpContainer: {
    alignItems: "center",
    gap: 4,
  },
  xpLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  xpValue: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
  },
  bio: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
  nextMilestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  milestoneText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  achievementSection: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 14,
  },
  milestoneGrid: {
    gap: 10,
  },
  milestoneCell: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  milestoneIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  milestoneCellValue: {
    fontSize: 17,
    fontFamily: "Inter_800ExtraBold",
  },
  milestoneCellLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  xpFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  xpFooterLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  xpFooterValue: {
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  achievementItem: {
    width: (CARD_WIDTH - 70) / 2,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  achievementValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  achievementItem: {
    width: (CARD_WIDTH - 70) / 2,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  achievementValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statsSection: {
    gap: 8,
  },
  statRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statRowLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  statRowValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  insightSection: {
    gap: 12,
  },
  insightItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  insightValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginLeft: 24,
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sharePreview: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  previewContent: {
    alignItems: "center",
    gap: 6,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  previewName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  previewStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  previewStat: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  navBtn: {
    padding: 8,
  },
  cardIndicator: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
