/**
 * Reports Screen — Pro Feature
 *
 * Auto-generated weekly and monthly productivity reports derived entirely
 * from the AnalyticsEngine. Nothing is hardcoded or UI-calculated.
 */
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { ProPaywall } from "@/components/ProPaywall";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AppText as Text } from "@/components/ui/AppText";
import { TabHeader } from "@/components/ui/TabHeader";
import {
    generateMonthlyReport,
    generateWeeklyReport,
    type MonthlyReport,
    type WeeklyReport,
} from "@/lib/analytics/AnalyticsEngine";
import { isPro } from "@/lib/subscriptionService";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import {
    Brain,
    ChevronLeft,
    ChevronRight,
    Crown,
    Flame,
    Star,
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
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMinutes = (mins: number) => {
  if (!mins || mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
};

// ─── Weekly Report Card ───────────────────────────────────────────────────────

const WeeklyReportCard = ({
  report,
  theme,
  offset,
  onPrev,
  onNext,
}: {
  report: WeeklyReport;
  theme: any;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <Animated.View entering={FadeInDown.duration(400)}>
    {/* Week Navigation */}
    <View style={styles.weekNav}>
      <TouchableOpacity onPress={onPrev} style={styles.weekNavBtn}>
        <ChevronLeft size={20} color={theme.accent} />
      </TouchableOpacity>
      <Text style={[styles.weekNavLabel, { color: theme.primaryText }]}>
        {formatDate(report.weekStart)} — {formatDate(report.weekEnd)}
        {offset === 0 && (
          <Text style={{ color: theme.accent }}> (This Week)</Text>
        )}
      </Text>
      <TouchableOpacity
        onPress={onNext}
        style={styles.weekNavBtn}
        disabled={offset >= 0}
      >
        <ChevronRight
          size={20}
          color={offset >= 0 ? theme.tertiaryText : theme.accent}
        />
      </TouchableOpacity>
    </View>

    {/* Key Stats */}
    <View style={styles.statsGrid}>
      {[
        {
          icon: Target,
          label: "TASKS",
          value: report.tasksCompleted,
          color: "#34C759",
        },
        {
          icon: Flame,
          label: "HABIT %",
          value: `${report.habitsConsistency}%`,
          color: "#FF9500",
        },
        {
          icon: Brain,
          label: "FOCUS",
          value: formatMinutes(report.totalFocusTime),
          color: "#AF52DE",
        },
        {
          icon: Zap,
          label: "XP",
          value: `+${report.xpEarned}`,
          color: "#FFD60A",
        },
      ].map((stat, i) => (
        <Animated.View
          key={stat.label}
          entering={FadeInDown.duration(350).delay(i * 60)}
          style={{ flex: 1 }}
        >
          <View
            style={[
              styles.statBox,
              { backgroundColor: stat.color + "18", borderColor: stat.color + "33" },
            ]}
          >
            <stat.icon size={16} color={stat.color} />
            <Text style={[styles.statValue, { color: theme.primaryText }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              {stat.label}
            </Text>
          </View>
        </Animated.View>
      ))}
    </View>

    {/* Best / Weakest Day */}
    {(report.bestDay?.date || report.weakestDay?.date) && (
      <AnimatedCard style={styles.bestDayCard}>
        <View style={styles.bestDayRow}>
          <View style={styles.bestDayItem}>
            <TrendingUp size={16} color="#34C759" />
            <View>
              <Text style={[styles.bestDayLabel, { color: theme.secondaryText }]}>
                BEST DAY
              </Text>
              <Text style={[styles.bestDayValue, { color: theme.primaryText }]}>
                {report.bestDay?.date ? format(parseISO(report.bestDay.date), "EEEE") : "—"}
              </Text>
            </View>
          </View>
          <View style={[styles.bestDayDivider, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.bestDayItem}>
            <TrendingDown size={16} color="#FF3B30" />
            <View>
              <Text style={[styles.bestDayLabel, { color: theme.secondaryText }]}>
                WEAKEST DAY
              </Text>
              <Text style={[styles.bestDayValue, { color: theme.primaryText }]}>
                {report.weakestDay?.date
                  ? format(parseISO(report.weakestDay.date), "EEEE")
                  : "—"}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedCard>
    )}

    {/* Insights */}
    {report.insights?.length > 0 && (
      <View style={styles.insightsSection}>
        <Text style={[styles.insightsSectionTitle, { color: theme.secondaryText }]}>
          INSIGHTS
        </Text>
        {report.insights.map((insight, i) => (
          <Animated.View
            key={i}
            entering={FadeInLeft.duration(300).delay(i * 80)}
          >
            <View
              style={[
                styles.insightRow,
                { borderLeftColor: theme.accent, backgroundColor: theme.card },
              ]}
            >
              <Text style={[styles.insightText, { color: theme.primaryText }]}>
                {insight}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    )}
  </Animated.View>
);

// ─── Monthly Report Card ──────────────────────────────────────────────────────

const MonthlyReportCard = ({
  report,
  theme,
  offset,
  onPrev,
  onNext,
}: {
  report: MonthlyReport;
  theme: any;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <Animated.View entering={FadeInDown.duration(400)}>
    <View style={styles.weekNav}>
      <TouchableOpacity onPress={onPrev} style={styles.weekNavBtn}>
        <ChevronLeft size={20} color={theme.accent} />
      </TouchableOpacity>
      <Text style={[styles.weekNavLabel, { color: theme.primaryText }]}>
        {report.month} {report.year}
        {offset === 0 && <Text style={{ color: theme.accent }}> (This Month)</Text>}
      </Text>
      <TouchableOpacity
        onPress={onNext}
        style={styles.weekNavBtn}
        disabled={offset >= 0}
      >
        <ChevronRight
          size={20}
          color={offset >= 0 ? theme.tertiaryText : theme.accent}
        />
      </TouchableOpacity>
    </View>

    <View style={styles.statsGrid}>
      {[
        {
          icon: Target,
          label: "TASKS",
          value: report.totalTasksCompleted,
          color: "#34C759",
        },
        {
          icon: Flame,
          label: "HABITS",
          value: report.totalHabitsCompleted,
          color: "#FF9500",
        },
        {
          icon: Brain,
          label: "FOCUS",
          value: `${report.totalFocusHours}h`,
          color: "#AF52DE",
        },
        {
          icon: Zap,
          label: "XP",
          value: `+${report.totalXpEarned}`,
          color: "#FFD60A",
        },
      ].map((stat, i) => (
        <Animated.View
          key={stat.label}
          entering={FadeInDown.duration(350).delay(i * 60)}
          style={{ flex: 1 }}
        >
          <View
            style={[
              styles.statBox,
              { backgroundColor: stat.color + "18", borderColor: stat.color + "33" },
            ]}
          >
            <stat.icon size={16} color={stat.color} />
            <Text style={[styles.statValue, { color: theme.primaryText }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              {stat.label}
            </Text>
          </View>
        </Animated.View>
      ))}
    </View>

    {/* Best Week */}
    {report.bestWeek?.weekStart && (
      <AnimatedCard style={styles.bestDayCard}>
        <View style={styles.bestWeekRow}>
          <Star size={18} color="#FFD60A" />
          <View>
            <Text style={[styles.bestDayLabel, { color: theme.secondaryText }]}>
              BEST WEEK
            </Text>
            <Text style={[styles.bestDayValue, { color: theme.primaryText }]}>
              Week of {formatDate(report.bestWeek.weekStart)} ·{" "}
              {report.bestWeek.tasksCompleted} tasks
            </Text>
          </View>
        </View>
      </AnimatedCard>
    )}

    {/* Insights */}
    {report.insights?.length > 0 && (
      <View style={styles.insightsSection}>
        <Text style={[styles.insightsSectionTitle, { color: theme.secondaryText }]}>
          MONTHLY INSIGHTS
        </Text>
        {report.insights.map((insight, i) => (
          <Animated.View
            key={i}
            entering={FadeInLeft.duration(300).delay(i * 80)}
          >
            <View
              style={[
                styles.insightRow,
                { borderLeftColor: theme.accent, backgroundColor: theme.card },
              ]}
            >
              <Text style={[styles.insightText, { color: theme.primaryText }]}>
                {insight}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    )}
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = "weekly" | "monthly";

export default function ReportsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const userId = session?.user?.id || "guest";
  const userIsPro = isPro();

  const [activeTab, setActiveTab] = useState<Tab>("weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const loadReports = useCallback(() => {
    if (!userIsPro) return;
    try {
      setWeeklyReport(generateWeeklyReport(userId, weekOffset));
      setMonthlyReport(generateMonthlyReport(userId, monthOffset));
    } catch (e) {
      console.error("[Reports] Load failed:", e);
    }
  }, [userId, userIsPro, weekOffset, monthOffset]);

  useFocusEffect(useCallback(() => { loadReports(); }, [loadReports]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadReports();
    setRefreshing(false);
  }, [loadReports]);

  return (
    <BackgroundGradient>
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
        <TabHeader title="Reports" subtitle="Generated from your activity" showBack />

        {!userIsPro ? (
          <Pressable onPress={() => setPaywallVisible(true)}>
            <View
              style={[
                styles.proGate,
                { backgroundColor: theme.accent + "15", borderColor: theme.accent + "44" },
              ]}
            >
              <Crown size={32} color={theme.accent} />
              <Text style={[styles.proGateTitle, { color: theme.primaryText }]}>
                Reports — Pro Feature
              </Text>
              <Text style={[styles.proGateText, { color: theme.secondaryText }]}>
                Get auto-generated weekly and monthly summaries with AI-driven insights, best days, XP earned, and focus analytics.
              </Text>
              <View style={[styles.proGateBtn, { backgroundColor: theme.accent }]}>
                <Text style={styles.proGateBtnText}>Upgrade to Pro</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <>
            {/* Tab Switcher */}
            <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
              {(["weekly", "monthly"] as Tab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabBtn,
                    activeTab === tab && { backgroundColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: activeTab === tab ? "#fff" : theme.secondaryText },
                    ]}
                  >
                    {tab === "weekly" ? "Weekly" : "Monthly"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === "weekly" && weeklyReport && (
              <WeeklyReportCard
                report={weeklyReport}
                theme={theme}
                offset={weekOffset}
                onPrev={() => setWeekOffset((o) => o - 1)}
                onNext={() => setWeekOffset((o) => Math.min(0, o + 1))}
              />
            )}

            {activeTab === "monthly" && monthlyReport && (
              <MonthlyReportCard
                report={monthlyReport}
                theme={theme}
                offset={monthOffset}
                onPrev={() => setMonthOffset((o) => o - 1)}
                onNext={() => setMonthOffset((o) => Math.min(0, o + 1))}
              />
            )}

            {/* Generated timestamp */}
            {weeklyReport && activeTab === "weekly" && (
              <Text style={[styles.generatedAt, { color: theme.tertiaryText }]}>
                Report generated {format(new Date(weeklyReport.generatedAt), "MMM d, h:mm a")}
              </Text>
            )}
            {monthlyReport && activeTab === "monthly" && (
              <Text style={[styles.generatedAt, { color: theme.tertiaryText }]}>
                Report generated {format(new Date(monthlyReport.generatedAt), "MMM d, h:mm a")}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <ProPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        featureName="Reports"
        featureDescription="Unlock weekly and monthly auto-generated productivity reports with AI insights."
        source="reports_screen"
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekNavBtn: {
    padding: 8,
  },
  weekNavLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    flex: 1,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bestDayCard: {
    padding: 18,
    marginBottom: 16,
  },
  bestDayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bestDayItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bestDayDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  bestDayLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  bestDayValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  bestWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  insightsSection: {
    marginBottom: 20,
  },
  insightsSectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  insightRow: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 12,
    paddingRight: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  generatedAt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  proGate: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginTop: 16,
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
