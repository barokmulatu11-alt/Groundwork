/**
 * Revision Insights — Pro Feature
 *
 * Spaced repetition engine: shows weak topics, overdue notes, and
 * prioritized revision schedule. All data derived from AnalyticsEngine.
 */
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { ProPaywall } from "@/components/ProPaywall";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AppText as Text } from "@/components/ui/AppText";
import { TabHeader } from "@/components/ui/TabHeader";
import { getRevisionInsights, type RevisionInsight } from "@/lib/analytics/AnalyticsEngine";
import { trackNote } from "@/lib/analytics/AnalyticsTracker";
import { isPro } from "@/lib/subscriptionService";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useRouter } from "expo-router";
import {
    AlertCircle,
    BookOpen,
    Brain,
    CheckCircle2,
    ChevronRight,
    Clock,
    Crown,
    Star,
    Tag,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPriorityColor = (score: number) => {
  if (score >= 150) return "#FF3B30";
  if (score >= 80) return "#FF9500";
  if (score >= 40) return "#FFD60A";
  return "#34C759";
};

const getPriorityLabel = (score: number) => {
  if (score >= 150) return "Critical";
  if (score >= 80) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const formatLastSeen = (timestamp: string | null): string => {
  if (!timestamp) return "Never reviewed";
  try {
    return `${formatDistanceToNow(parseISO(timestamp))} ago`;
  } catch {
    return "Unknown";
  }
};

// ─── Insight Card ─────────────────────────────────────────────────────────────

const InsightCard = ({
  insight,
  theme,
  onPress,
  delay = 0,
}: {
  insight: RevisionInsight;
  theme: any;
  onPress: () => void;
  delay?: number;
}) => {
  const priorityColor = getPriorityColor(insight.priorityScore);
  const priorityLabel = getPriorityLabel(insight.priorityScore);

  return (
    <Animated.View entering={FadeInLeft.duration(350).delay(delay)}>
      <Pressable onPress={onPress}>
        <AnimatedCard style={styles.insightCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              {insight.isOverdue ? (
                <AlertCircle size={18} color="#FF3B30" />
              ) : (
                <BookOpen size={18} color={theme.accent} />
              )}
              <Text
                style={[styles.noteTitle, { color: theme.primaryText }]}
                numberOfLines={2}
              >
                {insight.noteTitle || "Untitled Note"}
              </Text>
            </View>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColor + "22" },
              ]}
            >
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {priorityLabel}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Clock size={13} color={theme.tertiaryText} />
              <Text style={[styles.statText, { color: theme.secondaryText }]}>
                {formatLastSeen(insight.lastViewed)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Brain size={13} color={theme.tertiaryText} />
              <Text style={[styles.statText, { color: theme.secondaryText }]}>
                {insight.viewCount} {insight.viewCount === 1 ? "review" : "reviews"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Star size={13} color={theme.tertiaryText} />
              <Text style={[styles.statText, { color: theme.secondaryText }]}>
                Every {insight.suggestedInterval}d
              </Text>
            </View>
          </View>

          {/* Tags */}
          {insight.tags && insight.tags.length > 0 && (
            <View style={styles.tagsRow}>
              <Tag size={12} color={theme.tertiaryText} />
              {insight.tags.slice(0, 3).map((tag: string, i: number) => (
                <View
                  key={i}
                  style={[styles.tag, { backgroundColor: theme.accent + "22" }]}
                >
                  <Text style={[styles.tagText, { color: theme.accent }]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {insight.tags.length > 3 && (
                <Text style={[styles.tagMore, { color: theme.tertiaryText }]}>
                  +{insight.tags.length - 3}
                </Text>
              )}
            </View>
          )}

          {/* Overdue Banner */}
          {insight.isOverdue && (
            <View style={[styles.overdueBanner, { backgroundColor: "#FF3B3015" }]}>
              <AlertCircle size={12} color="#FF3B30" />
              <Text style={styles.overdueText}>
                Overdue — review now to stay on track
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={[styles.footerText, { color: theme.accent }]}>
              Open note
            </Text>
            <ChevronRight size={14} color={theme.accent} />
          </View>
        </AnimatedCard>
      </Pressable>
    </Animated.View>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ theme }: { theme: any }) => (
  <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
    <CheckCircle2 size={56} color={theme.accent} />
    <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
      All caught up!
    </Text>
    <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
      No notes are overdue for review. Keep taking and reviewing notes to build your spaced repetition schedule.
    </Text>
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RevisionInsightsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const userId = session?.user?.id || "guest";
  const userIsPro = isPro();

  const [insights, setInsights] = useState<RevisionInsight[]>([]);
  const [filter, setFilter] = useState<"all" | "overdue">("overdue");
  const [refreshing, setRefreshing] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const loadInsights = useCallback(() => {
    if (!userIsPro) return;
    try {
      const data = getRevisionInsights(userId, 60);
      setInsights(data);
    } catch (e) {
      console.error("[RevisionInsights] Load failed:", e);
    }
  }, [userId, userIsPro]);

  useFocusEffect(useCallback(() => { loadInsights(); }, [loadInsights]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadInsights();
    setRefreshing(false);
  }, [loadInsights]);

  const filteredInsights = filter === "overdue"
    ? insights.filter((i) => i.isOverdue)
    : insights;

  const overdueCount = insights.filter((i) => i.isOverdue).length;

  const handleNotePress = useCallback(
    (insight: RevisionInsight) => {
      // Track the view event so spaced rep updates
      try {
        trackNote.viewed(insight.noteId, insight.noteTitle || "", insight.tags as string[]);
      } catch (_) {}
      router.push(`/notes/${insight.noteId}` as any);
    },
    [router],
  );

  if (!userIsPro) {
    return (
      <BackgroundGradient>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
          }}
        >
          <TabHeader title="Revision Insights" subtitle="Pro Feature" showBack />
          <Pressable onPress={() => setPaywallVisible(true)}>
            <View
              style={[
                styles.proGate,
                {
                  backgroundColor: theme.accent + "15",
                  borderColor: theme.accent + "44",
                },
              ]}
            >
              <Crown size={32} color={theme.accent} />
              <Text style={[styles.proGateTitle, { color: theme.primaryText }]}>
                Revision Insights
              </Text>
              <Text style={[styles.proGateText, { color: theme.secondaryText }]}>
                Detect weak topics, track overdue revisions, and get a personalized spaced repetition schedule powered by your note history.
              </Text>
              <View style={[styles.proGateBtn, { backgroundColor: theme.accent }]}>
                <Text style={styles.proGateBtnText}>Upgrade to Pro</Text>
              </View>
            </View>
          </Pressable>
        </View>
        <ProPaywall
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          featureName="Revision Insights"
          featureDescription="Spaced repetition scheduling, weak topic detection, and overdue revision tracking."
          source="revision_insights"
        />
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <FlatList
        data={filteredInsights}
        keyExtractor={(item) => item.noteId}
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
        ListHeaderComponent={() => (
          <>
            <TabHeader
              title="Revision Insights"
              subtitle="Spaced repetition schedule"
              showBack
            />

            {/* Summary Bar */}
            <Animated.View entering={FadeInDown.duration(350)}>
              <View style={styles.summaryRow}>
                <View
                  style={[
                    styles.summaryBadge,
                    { backgroundColor: "#FF3B3020", borderColor: "#FF3B3040" },
                  ]}
                >
                  <AlertCircle size={14} color="#FF3B30" />
                  <Text style={[styles.summaryText, { color: "#FF3B30" }]}>
                    {overdueCount} overdue
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryBadge,
                    { backgroundColor: theme.accent + "20", borderColor: theme.accent + "40" },
                  ]}
                >
                  <BookOpen size={14} color={theme.accent} />
                  <Text style={[styles.summaryText, { color: theme.accent }]}>
                    {insights.length} tracked
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Filter Tabs */}
            <View style={[styles.filterBar, { backgroundColor: theme.card }]}>
              {(["overdue", "all"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[
                    styles.filterBtn,
                    filter === f && { backgroundColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: filter === f ? "#fff" : theme.secondaryText },
                    ]}
                  >
                    {f === "overdue" ? `Overdue (${overdueCount})` : `All (${insights.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        ListEmptyComponent={() => <EmptyState theme={theme} />}
        renderItem={({ item, index }) => (
          <InsightCard
            insight={item}
            theme={theme}
            onPress={() => handleNotePress(item)}
            delay={index * 50}
          />
        )}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  filterBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  filterBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  insightCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    flex: 1,
    lineHeight: 22,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  priorityText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  tagMore: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  overdueText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FF3B30",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 22,
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
