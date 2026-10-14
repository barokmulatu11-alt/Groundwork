/**
 * Analytics Dashboard — Pro Feature
 *
 * Central hub for all productivity intelligence. All data is derived
 * from the centralized event-driven AnalyticsEngine — zero UI-level calculations.
 */
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AppText as Text } from "@/components/ui/AppText";
import {
    generateWeeklyReport,
    getFocusMetrics,
    getHabitConsistency,
    getLimitedFocusMetrics,
    getLimitedProductivityMetrics,
    getProductivityMetrics,
    getTrendAnalysis,
} from "@/lib/analytics/AnalyticsEngine";
import { isPro } from "@/lib/subscriptionService";
import { isRewardUnlocked } from "@/lib/rewardsService";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
    Activity,
    Award,
    BarChart2,
    Brain,
    ChevronRight,
    Clock,
    Flame,
    Minus,
    Target,
    TrendingDown,
    TrendingUp,
    Zap
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMinutes = (mins: number): string => {
  if (!mins || mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const TrendIcon = ({
  direction,
  size = 16,
  color,
}: {
  direction: "improving" | "declining" | "stable";
  size?: number;
  color: string;
}) => {
  if (direction === "improving") return <TrendingUp size={size} color="#34C759" />;
  if (direction === "declining") return <TrendingDown size={size} color="#FF3B30" />;
  return <Minus size={size} color={color} />;
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const MetricCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  accent,
  delay = 0,
  theme,
  onPress,
}: any) => (
  <Animated.View entering={FadeInDown.duration(350).delay(delay)} style={{ flex: 1 }}>
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <AnimatedCard style={[styles.metricCard, { borderColor: theme.separator }]}>
        <View style={[styles.metricIcon, { backgroundColor: accent + "22" }]}>
          <Icon size={18} color={accent} />
        </View>
        <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.metricTitle, { color: theme.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.metricSub, { color: theme.textMuted }]}>{subtitle}</Text>
        )}
        {trend && (
          <View style={styles.trendRow}>
            <TrendIcon direction={trend} size={12} color={theme.textMuted} />
          </View>
        )}
      </AnimatedCard>
    </Pressable>
  </Animated.View>
);

const ProGate = ({
  theme,
  onUpgrade,
}: {
  theme: any;
  onUpgrade: () => void;
}) => (
  <Animated.View entering={FadeInDown.duration(400)}>
    <Pressable onPress={onUpgrade}>
      <View
        style={[
          styles.proGate,
          { backgroundColor: theme.accent + "15", borderColor: theme.accent + "44" },
        ]}
      >
        <Award size={28} color={theme.accent} />
        <Text style={[styles.proGateTitle, { color: theme.text }]}>
          Milestone Reward
        </Text>
        <Text style={[styles.proGateText, { color: theme.textSecondary }]}>
          Unlock deep analytics, heatmaps, focus scores, and weekly reports by completing 10 focus sessions and 10 habit check-in days.
        </Text>
        <View style={[styles.proGateBtn, { backgroundColor: theme.accent }]}>
          <Text style={styles.proGateBtnText}>View Milestone Progress</Text>
        </View>
      </View>
    </Pressable>
  </Animated.View>
);

const SectionTitle = ({ title, theme }: any) => (
  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
);

const InsightRow = ({
  text,
  theme,
  delay = 0,
}: {
  text: string;
  theme: any;
  delay?: number;
}) => (
  <Animated.View entering={FadeInLeft.duration(300).delay(delay)}>
    <View style={[styles.insightRow, { borderLeftColor: theme.accent }]}>
      <Text style={[styles.insightText, { color: theme.text }]}>{text}</Text>
    </View>
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const userId = session?.user?.id || "guest";
  const userIsPro = isPro() || isRewardUnlocked('deep_analytics');

  const [refreshing, setRefreshing] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [productivityMetrics, setProductivityMetrics] = useState<any>(null);
  const [focusMetrics, setFocusMetrics] = useState<any>(null);
  const [habitConsistency, setHabitConsistency] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);

  const loadData = useCallback(() => {
    try {
      if (userIsPro) {
        setProductivityMetrics(getProductivityMetrics(userId, 30));
        setFocusMetrics(getFocusMetrics(userId, 30));
        setHabitConsistency(getHabitConsistency(userId).slice(0, 5));
        setTrends(getTrendAnalysis(userId));
        setWeeklyReport(generateWeeklyReport(userId));
      } else {
        setProductivityMetrics(getLimitedProductivityMetrics(userId));
        setFocusMetrics(getLimitedFocusMetrics(userId));
      }
    } catch (e) {
      console.error("[Analytics] Load failed:", e);
    }
  }, [userId, userIsPro]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        <BrandHeader title="groundwork." onBack={() => router.back()} />

        <View style={{ marginBottom: 28, marginTop: 8 }}>
          <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -1 }}>
            Analytics.
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            Trends and progress insights.
          </Text>
        </View>

        <SectionTitle title="PRODUCTIVITY OVERVIEW" theme={theme} />
        <View style={styles.metricsGrid}>
          <MetricCard
            icon={Target}
            title="TODAY"
            value={productivityMetrics?.tasksCompletedToday ?? "—"}
            subtitle="tasks done"
            accent="#34C759"
            delay={0}
            theme={theme}
          />
          <MetricCard
            icon={BarChart2}
            title="THIS WEEK"
            value={productivityMetrics?.tasksCompletedThisWeek ?? "—"}
            subtitle="tasks done"
            accent={theme.accent}
            delay={60}
            theme={theme}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon={Activity}
            title="COMPLETION"
            value={`${productivityMetrics?.completionRate ?? 0}%`}
            subtitle="rate"
            accent="#FF9500"
            delay={120}
            theme={theme}
          />
          <MetricCard
            icon={Clock}
            title="FOCUS TODAY"
            value={formatMinutes(focusMetrics?.totalFocusTimeToday ?? 0)}
            subtitle="focused"
            accent="#AF52DE"
            delay={180}
            theme={theme}
          />
        </View>

        {/* ─── Pro: Focus Score ─── */}
        {userIsPro && focusMetrics && (
          <>
            <SectionTitle title="FOCUS ANALYTICS" theme={theme} />
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <AnimatedCard style={styles.focusCard}>
                <View style={styles.focusScoreRow}>
                  <View style={styles.focusScoreCircle}>
                    <Text style={[styles.focusScoreNumber, { color: theme.text }]}>
                      {focusMetrics.focusScore ?? 0}
                    </Text>
                    <Text style={[styles.focusScoreLabel, { color: theme.textSecondary }]}>
                      /100
                    </Text>
                  </View>
                  <View style={styles.focusDetails}>
                    <Text style={[styles.focusDetailLabel, { color: theme.textSecondary }]}>
                      Focus Score
                    </Text>
                    <View style={styles.focusStatRow}>
                      <Text style={[styles.focusStat, { color: theme.text }]}>
                        {formatMinutes(focusMetrics.totalFocusTimeThisWeek ?? 0)}
                      </Text>
                      <Text style={[styles.focusStatSub, { color: theme.textMuted }]}>
                        {" "}this week
                      </Text>
                    </View>
                    <View style={styles.focusStatRow}>
                      <Text style={[styles.focusStat, { color: theme.text }]}>
                        {formatMinutes(focusMetrics.averageSessionLength ?? 0)}
                      </Text>
                      <Text style={[styles.focusStatSub, { color: theme.textMuted }]}>
                        {" "}avg session
                      </Text>
                    </View>
                    <View style={styles.focusStatRow}>
                      <Text style={[styles.focusStat, { color: theme.text }]}>
                        {focusMetrics.distractionRate ?? 0}%
                      </Text>
                      <Text style={[styles.focusStatSub, { color: theme.textMuted }]}>
                        {" "}distraction rate
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Best Focus Hours */}
                {focusMetrics.bestFocusHours?.length > 0 && (
                  <View style={styles.peakHoursSection}>
                    <Text style={[styles.peakHoursLabel, { color: theme.textSecondary }]}>
                      PEAK FOCUS HOURS
                    </Text>
                    <View style={styles.peakHoursRow}>
                      {focusMetrics.bestFocusHours.slice(0, 4).map((h: any, i: number) => (
                        <View
                          key={i}
                          style={[styles.peakHourBadge, { backgroundColor: theme.accent + "22" }]}
                        >
                          <Text style={[styles.peakHourText, { color: theme.accent }]}>
                            {h.hour < 12
                              ? `${h.hour === 0 ? 12 : h.hour}AM`
                              : `${h.hour === 12 ? 12 : h.hour - 12}PM`}
                          </Text>
                          <Text style={[styles.peakHourMins, { color: theme.textMuted }]}>
                            {formatMinutes(h.minutes)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </AnimatedCard>
            </Animated.View>
          </>
        )}

        {/* ─── Pro: Trend Engine ─── */}
        {userIsPro && trends && (
          <>
            <SectionTitle title="30-DAY TRENDS" theme={theme} />
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <AnimatedCard style={styles.trendsCard}>
                {[
                  {
                    label: "Productivity",
                    data: trends.productivity,
                    icon: Target,
                    color: "#34C759",
                  },
                  {
                    label: "Habit Consistency",
                    data: trends.habitConsistency,
                    icon: Flame,
                    color: "#FF9500",
                  },
                  {
                    label: "Focus",
                    data: trends.focus,
                    icon: Brain,
                    color: "#AF52DE",
                  },
                ].map((item, idx) => (
                  <View
                    key={item.label}
                    style={[
                      styles.trendItem,
                      idx < 2 && { borderBottomWidth: 1, borderBottomColor: theme.separator },
                    ]}
                  >
                    <View style={styles.trendLeft}>
                      <item.icon size={16} color={item.color} />
                      <Text style={[styles.trendLabel, { color: theme.text }]}>
                        {item.label}
                      </Text>
                    </View>
                    <View style={styles.trendRight}>
                      <View style={styles.rollingAverages}>
                        <Text style={[styles.rollingAvg, { color: theme.textMuted }]}>
                          7d:{" "}
                          <Text style={{ color: theme.textSecondary }}>{item.data.rolling7Day}</Text>
                        </Text>
                        <Text style={[styles.rollingAvg, { color: theme.textMuted }]}>
                          30d:{" "}
                          <Text style={{ color: theme.textSecondary }}>{item.data.rolling30Day}</Text>
                        </Text>
                      </View>
                      <TrendIcon direction={item.data.direction} size={18} color={theme.textMuted} />
                    </View>
                  </View>
                ))}
              </AnimatedCard>
            </Animated.View>
          </>
        )}

        {/* ─── Pro: Habit Consistency ─── */}
        {userIsPro && habitConsistency.length > 0 && (
          <>
            <SectionTitle title="HABIT CONSISTENCY" theme={theme} />
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <AnimatedCard style={styles.habitConsistencyCard}>
                {habitConsistency.map((h: any, idx: number) => (
                  <View
                    key={h.habitId}
                    style={[
                      styles.habitRow,
                      idx < habitConsistency.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.separator,
                      },
                    ]}
                  >
                    <View style={styles.habitInfo}>
                      <Text
                        style={[styles.habitTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {h.habitTitle}
                      </Text>
                      <Text style={[styles.habitSubtext, { color: theme.textMuted }]}>
                        {h.completedDays} / {h.totalDays} days · streak {h.currentStreak}
                      </Text>
                    </View>
                    <View style={styles.habitScoreWrap}>
                      <View
                        style={[
                          styles.consistencyBar,
                          { backgroundColor: theme.separator },
                        ]}
                      >
                        <View
                          style={[
                            styles.consistencyFill,
                            {
                              width: `${h.consistencyScore}%` as any,
                              backgroundColor:
                                h.consistencyScore >= 70
                                  ? "#34C759"
                                  : h.consistencyScore >= 40
                                  ? "#FF9500"
                                  : "#FF3B30",
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.consistencyScore, { color: theme.text }]}>
                        {h.consistencyScore}%
                      </Text>
                    </View>
                  </View>
                ))}
              </AnimatedCard>
            </Animated.View>
          </>
        )}

        {/* ─── Pro: Weekly Report Insights ─── */}
        {userIsPro && weeklyReport && weeklyReport.insights?.length > 0 && (
          <>
            <SectionTitle title="THIS WEEK'S INSIGHTS" theme={theme} />
            {weeklyReport.insights.map((insight: string, idx: number) => (
              <InsightRow key={idx} text={insight} theme={theme} delay={idx * 60} />
            ))}
            <Pressable
              onPress={() => router.push("/reports" as any)}
              style={[styles.viewReportsBtn, { borderColor: theme.accent }]}
            >
              <Zap size={16} color={theme.accent} />
              <Text style={[styles.viewReportsBtnText, { color: theme.accent }]}>
                View full reports
              </Text>
              <ChevronRight size={16} color={theme.accent} />
            </Pressable>
          </>
        )}

        {/* ─── Milestone Reward Gate ─── */}
        {!userIsPro && (
          <ProGate theme={theme} onUpgrade={() => router.push('/rewards' as any)} />
        )}

        {/* ─── Pro: Navigation Cards ─── */}
        {userIsPro && (
          <>
            <SectionTitle title="DEEP ANALYTICS" theme={theme} />
            <View style={styles.navCardsRow}>
              {[
                {
                  label: "Reports",
                  icon: BarChart2,
                  route: "/reports",
                  color: theme.accent,
                },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.route as any)}
                  style={{ flex: 1 }}
                >
                  <Animated.View entering={FadeInDown.duration(350).delay(250)}>
                    <AnimatedCard
                      style={[styles.navCard, { borderColor: theme.separator }]}
                    >
                      <item.icon size={22} color={item.color} />
                      <Text style={[styles.navCardText, { color: theme.text }]}>
                        {item.label}
                      </Text>
                      <ChevronRight size={14} color={theme.textMuted} />
                    </AnimatedCard>
                  </Animated.View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    minHeight: 100,
    justifyContent: "center",
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricSub: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  trendRow: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 20,
    textTransform: "uppercase",
  },
  focusCard: {
    padding: 20,
    marginBottom: 0,
  },
  focusScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 16,
  },
  focusScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(175,82,222,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    alignContent: "center",
  },
  focusScoreNumber: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
  },
  focusScoreLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
  },
  focusDetails: {
    flex: 1,
    gap: 6,
  },
  focusDetailLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  focusStatRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  focusStat: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  focusStatSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  peakHoursSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  peakHoursLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  peakHoursRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  peakHourBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  peakHourText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  peakHourMins: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  trendsCard: {
    padding: 0,
    overflow: "hidden",
  },
  trendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  trendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  trendLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  trendRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rollingAverages: {
    alignItems: "flex-end",
    gap: 2,
  },
  rollingAvg: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  habitConsistencyCard: {
    padding: 0,
    overflow: "hidden",
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  habitSubtext: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  habitScoreWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  consistencyBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  consistencyFill: {
    height: "100%",
    borderRadius: 2,
  },
  consistencyScore: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  insightRow: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  viewReportsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  viewReportsBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "center",
  },
  navCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  navCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  navCardText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  proGate: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 24,
  },
  proGateTitle: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    marginTop: 8,
  },
  proGateText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 22,
  },
  proGateBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  proGateBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});


