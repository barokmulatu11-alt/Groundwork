import { BackgroundGradient } from "@/components/BackgroundGradient";
import { ProBadge } from "@/components/ProBadge";
import { AppText as Text } from "@/components/ui/AppText";
import {
    FREE_LIMITS,
    getPlan,
    isPro,
    restorePurchases,
    trackProEvent
} from "@/lib/subscriptionService";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/store/useStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    BarChart3,
    Bell,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronLeft,
    Cloud,
    Crown,
    FileOutput,
    Flame,
    LayoutGrid,
    Link2,
    Lock,
    Mic,
    Moon,
    Palette,
    RefreshCw,
    Sparkles,
    Tag,
    Timer,
    TrendingUp,
    Trophy,
    Users,
    Zap
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Pro feature list ─────────────────────────────────────────────────────────

const PRO_SECTIONS = [
  {
    title: "PRODUCTIVITY",
    features: [
      { icon: CheckCircle2, title: "Unlimited Tasks", desc: "No cap on tasks or projects" },
      { icon: Flame, title: "Unlimited Habits", desc: "Track every routine that matters" },
      { icon: Tag, title: "Categories & Labels", desc: "Custom tags for tasks and notes" },
      { icon: Bell, title: "Advanced Reminders", desc: "Custom sounds, snooze, and repeats" },
      { icon: BarChart3, title: "Deep Analytics", desc: "Weekly insights and trend reports" },
      { icon: Timer, title: "Custom Focus Presets", desc: "Your timer, your rules" },
    ],
  },
  {
    title: "NOTES & STUDY",
    features: [
      { icon: BookOpen, title: "Unlimited Study Spaces", desc: "More folders and subjects" },
      { icon: Mic, title: "Longer Voice Notes", desc: "Extended recording limits" },
      { icon: Lock, title: "Note Security", desc: "Lock notes and folders with biometrics" },
      { icon: FileOutput, title: "Export PDF & Markdown", desc: "Share notes anywhere" },
      { icon: TrendingUp, title: "Revision Analytics", desc: "Weak topics and review schedules" },
    ],
  },
  {
    title: "CONNECT & SOCIAL",
    features: [
      { icon: Users, title: "Unlimited Social Links", desc: "More platforms on your profile" },
      { icon: Trophy, title: "Pro XP Boost", desc: "Earn more XP from daily actions" },
      { icon: Crown, title: "Pro Profile Flair", desc: "Badge, ring, and leaderboard highlight" },
      { icon: Sparkles, title: "Pro Achievements", desc: "Exclusive premium badge lane" },
      { icon: Link2, title: "Referral Rewards", desc: "Invite friends for Pro perks" },
    ],
  },
  {
    title: "APPEARANCE & PLATFORM",
    features: [
      { icon: Moon, title: "7 Premium Themes", desc: "Cinematic surfaces across the app" },
      { icon: Palette, title: "Custom App Icons", desc: "Personalize your home screen" },
      { icon: Cloud, title: "Backup & Restore", desc: "Scheduled export and cloud safety" },
      { icon: LayoutGrid, title: "Widgets", desc: "Tasks and habits at a glance" },
      { icon: Zap, title: "Early Access", desc: "Try new features before everyone else" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionSettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { tasks, habits } = useStore();

  const [selectedPlan, setSelectedPlan] = useState<"pro_1month" | "pro_1year">("pro_1year");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const userIsPro = isPro();
  const plan = getPlan();

  // Usage stats for free users
  const taskCount = tasks.length;
  const habitCount = habits.filter((h) => !h.deleted_at).length;

  const handleUpgrade = async () => {
    trackProEvent("upgrade_tap", { source: "subscription_settings" });
    router.push("/upgrade" as any);
  };

  const handleRestore = async () => {
    trackProEvent("restore_tap", { source: "subscription_settings" });
    setRestoring(true);
    try {
      await restorePurchases();
      Alert.alert("Restore Complete", userIsPro ? "Your Pro subscription is active." : "No active subscription found.");
    } catch {
      Alert.alert("Restore Failed", "Could not restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  let featureIndex = 0;

  return (
    <BackgroundGradient>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroWrap}>
          <LinearGradient
            colors={isDark ? ["#1C1C1E", "#2C2C2E"] : ["#FFFFFF", "#F2F2F7"]}
            style={[styles.heroCard, { borderColor: theme.cardBorder }]}
          >
            <LinearGradient
              colors={[theme.accent, theme.accent + "CC"]}
              style={styles.heroIcon}
            >
              <Crown size={32} color="white" />
            </LinearGradient>

            {userIsPro ? (
              <>
                <View style={styles.proBadgeWrap}>
                  <ProBadge variant="pro" size="md" />
                </View>
                <Text style={[styles.heroTitle, { color: theme.primaryText }]}>
                  You're on Pro ✦
                </Text>
                <Text style={[styles.heroSubtitle, { color: theme.secondaryText }]}>
                  {profile?.pro_until
                    ? `Renews on ${new Date(profile.pro_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                    : "All Pro features are unlocked."}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.heroTitle, { color: theme.primaryText }]}>
                  Groundwork Pro
                </Text>
                <Text style={[styles.heroSubtitle, { color: theme.secondaryText }]}>
                  Master your time with advanced tools designed for deep focus.
                </Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Free usage limits (free users only) ── */}
        {!userIsPro && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
              YOUR USAGE
            </Text>
            <View style={[styles.usageCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <UsageBar
                label="Tasks"
                value={taskCount}
                limit={FREE_LIMITS.TASKS_LIFETIME}
                accent={theme.accent}
                textColor={theme.primaryText}
                subColor={theme.secondaryText}
              />
              <View style={[styles.usageDivider, { backgroundColor: theme.cardBorder }]} />
              <UsageBar
                label="Habits"
                value={habitCount}
                limit={FREE_LIMITS.HABITS}
                accent={theme.accent}
                textColor={theme.primaryText}
                subColor={theme.secondaryText}
              />
            </View>
          </Animated.View>
        )}

        {/* ── Plan selector (free users only) ── */}
        {!userIsPro && (
          <Animated.View entering={FadeInDown.delay(160).duration(500)}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
              CHOOSE PLAN
            </Text>
            <PlanOption
              title="Monthly"
              price="ETB 49.99 / month"
              description="Billed monthly, cancel any time"
              selected={selectedPlan === "pro_1month"}
              onSelect={() => setSelectedPlan("pro_1month")}
              accent={theme.accent}
              textColor={theme.primaryText}
              subColor={theme.secondaryText}
              cardColor={theme.card}
              borderColor={theme.cardBorder}
            />
            <PlanOption
              title="Yearly"
              price="ETB 499.99 / year"
              description="Save 17% — best value"
              selected={selectedPlan === "pro_1year"}
              onSelect={() => setSelectedPlan("pro_1year")}
              accent={theme.accent}
              textColor={theme.primaryText}
              subColor={theme.secondaryText}
              cardColor={theme.card}
              borderColor={theme.cardBorder}
              badge="BEST VALUE"
            />
          </Animated.View>
        )}

        {/* ── CTA ── */}
        {!userIsPro && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.ctaWrap}>
            <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.85} disabled={loading} style={styles.ctaBtn}>
              <LinearGradient
                colors={[theme.accent, theme.accent + "CC"]}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Crown size={18} color="#FFF" />
                    <Text style={styles.ctaText}>
                      Upgrade to Pro
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestore}
              activeOpacity={0.7}
              style={styles.restoreBtn}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={theme.secondaryText} />
              ) : (
                <>
                  <RefreshCw size={13} color={theme.secondaryText} />
                  <Text style={[styles.restoreText, { color: theme.secondaryText }]}>
                    Restore Purchases
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/payment-history" as any)}
              activeOpacity={0.7}
              style={styles.restoreBtn}
            >
              <Text style={[styles.restoreText, { color: theme.tertiaryText }]}>
                View payment history
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── What's included ── */}
        <Animated.View entering={FadeInRight.delay(240).duration(500)}>
          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
            WHAT'S INCLUDED
          </Text>
        </Animated.View>

        {PRO_SECTIONS.map((section) => (
          <View key={section.title} style={styles.featureSection}>
            <Text style={[styles.groupLabel, { color: theme.tertiaryText }]}>
              {section.title}
            </Text>
            {section.features.map((f) => {
              const idx = featureIndex++;
              return (
                <Animated.View
                  key={f.title}
                  entering={FadeInDown.delay(300 + idx * 30).duration(400)}
                  style={[styles.featureRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={[styles.featureIconBox, { backgroundColor: theme.accent + "18" }]}>
                    <f.icon size={18} color={theme.accent} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: theme.primaryText }]}>{f.title}</Text>
                    <Text style={[styles.featureDesc, { color: theme.secondaryText }]}>{f.desc}</Text>
                  </View>
                  {userIsPro ? (
                    <Check size={16} color={theme.accent} />
                  ) : (
                    <Crown size={14} color={theme.accent} style={{ opacity: 0.6 }} />
                  )}
                </Animated.View>
              );
            })}
          </View>
        ))}

        <Text style={[styles.footer, { color: theme.tertiaryText }]}>
          Thank you for being part of the Groundwork journey. ✦
        </Text>

        {/* Payment history — visible to all users */}
        <TouchableOpacity
          onPress={() => router.push("/payment-history" as any)}
          activeOpacity={0.7}
          style={[styles.restoreBtn, { marginTop: 4 }]}
        >
          <Text style={[styles.restoreText, { color: theme.tertiaryText }]}>
            View payment history
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BackgroundGradient>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsageBar({ label, value, limit, accent, textColor, subColor }: any) {
  const pct = Math.min((value / limit) * 100, 100);
  const isNearLimit = pct >= 80;
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageLabelRow}>
        <Text style={[styles.usageLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.usageCount, { color: isNearLimit ? "#FF3B30" : subColor }]}>
          {value} / {limit}
        </Text>
      </View>
      <View style={[styles.usageTrack, { backgroundColor: "rgba(120,120,128,0.15)" }]}>
        <View
          style={[
            styles.usageFill,
            { width: `${pct}%` as any, backgroundColor: isNearLimit ? "#FF3B30" : accent },
          ]}
        />
      </View>
    </View>
  );
}

function PlanOption({ title, price, description, selected, onSelect, accent, textColor, subColor, cardColor, borderColor, badge }: any) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        styles.planCard,
        {
          backgroundColor: cardColor,
          borderColor: selected ? accent : borderColor,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={[styles.planRadio, { borderColor: selected ? accent : borderColor }]}>
        {selected && <View style={[styles.planRadioInner, { backgroundColor: accent }]} />}
      </View>
      <View style={styles.planInfo}>
        <View style={styles.planTitleRow}>
          <Text style={[styles.planTitle, { color: textColor }]}>{title}</Text>
          {badge && (
            <View style={[styles.planBadge, { backgroundColor: accent + "22" }]}>
              <Text style={[styles.planBadgeText, { color: accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.planPrice, { color: accent }]}>{price}</Text>
        <Text style={[styles.planDesc, { color: subColor }]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    marginLeft: -4,
    paddingVertical: 8,
  },
  backText: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginLeft: 4 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  heroWrap: {
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 4 },
    }),
  },
  heroCard: {
    width: "100%",
    padding: 28,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  proBadgeWrap: { marginBottom: 10 },
  heroTitle: { fontSize: 26, fontFamily: "Inter_800ExtraBold", textAlign: "center", marginBottom: 8 },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 22, opacity: 0.85 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 2,
  },
  usageCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 4 },
  usageDivider: { height: 1, marginVertical: 12 },
  usageRow: { gap: 8 },
  usageLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  usageLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  usageCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  usageTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  usageFill: { height: "100%", borderRadius: 3 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    gap: 14,
  },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  planRadioInner: { width: 10, height: 10, borderRadius: 5 },
  planInfo: { flex: 1 },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  planTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  planBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  planBadgeText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.5 },
  planPrice: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  planDesc: { fontSize: 12, fontFamily: "Inter_500Medium" },
  ctaWrap: { marginBottom: 8 },
  ctaBtn: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_800ExtraBold", color: "#FFF" },
  restoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  restoreText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  featureSection: { marginBottom: 8 },
  groupLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  featureIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  featureDesc: { fontSize: 12, fontFamily: "Inter_500Medium", opacity: 0.8 },
  footer: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 24, opacity: 0.5, lineHeight: 18 },
});

