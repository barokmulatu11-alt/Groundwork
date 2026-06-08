import { useRouter } from "expo-router";
import {
    Award,
    ChevronLeft,
    Flame,
    Settings,
    TrendingUp,
    User,
    Zap
} from "lucide-react-native";
import React, { useMemo } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JourneyShowcaseCard } from "@/components/JourneyShowcaseCard";
import { AppText as Text } from "@/components/ui/AppText";
import { getUserStats } from "@/lib/connect/achievementEngine";
import { getLevelFromXP, getLevelTitle } from "@/lib/connect/xpSystem";
import { hapticLight, hapticSelection } from "@/lib/haptics";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { profile, session, getUserId } = useAuthStore();
  const userId = getUserId();

  // Simple and highly performant query for basic stats
  const stats = useMemo(() => getUserStats(userId), [userId, profile?.xp]);
  const currentXP = profile?.xp || stats.xp || 0;
  const currentLevel = getLevelFromXP(currentXP);
  const levelTitle = getLevelTitle(currentLevel);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Fast, basic title bar */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            router.back();
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            router.push("/settings");
          }}
          style={styles.settingsBtn}
          activeOpacity={0.7}
        >
          <Settings size={22} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple Utility Header card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <Image
            source={{
              uri:
                profile?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/png?seed=${session?.user?.email || "Barok"}`,
            }}
            style={styles.avatar}
          />
          <View style={styles.details}>
            <Text style={[styles.name, { color: theme.primaryText }]}>
              {profile?.full_name || "Groundwork Explorer"}
            </Text>
            <Text style={[styles.handle, { color: theme.secondaryText }]}>
              @{profile?.username || "guest"}
            </Text>
          </View>
        </View>

        {/* JOURNEY SHOWCASE CARD */}
        <JourneyShowcaseCard userId={userId} profile={profile} />

        {/* Quick Utility Stats Grid */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
          Quick Stats
        </Text>
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statTile,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <TrendingUp size={20} color={theme.accent} />
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Current Rank
            </Text>
            <Text style={[styles.statValue, { color: theme.primaryText }]}>
              {levelTitle}
            </Text>
          </View>

          <View
            style={[
              styles.statTile,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Zap size={20} color={theme.success || "#34C759"} />
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              XP Progress
            </Text>
            <Text style={[styles.statValue, { color: theme.primaryText }]}>
              Level {currentLevel}
            </Text>
            <Text style={[styles.statSubText, { color: theme.tertiaryText }]}>
              {currentXP.toLocaleString()} total XP
            </Text>
          </View>

          <View
            style={[
              styles.statTile,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Flame size={20} color="#FF9500" />
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Active Streak
            </Text>
            <Text style={[styles.statValue, { color: theme.primaryText }]}>
              {stats.longestStreak} Days
            </Text>
            <Text style={[styles.statSubText, { color: theme.tertiaryText }]}>
              Consistency Score
            </Text>
          </View>

          <View
            style={[
              styles.statTile,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Award size={20} color="#AF52DE" />
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Focus Time
            </Text>
            <Text style={[styles.statValue, { color: theme.primaryText }]}>
              {(stats.totalFocusMinutes / 60).toFixed(1)}h
            </Text>
            <Text style={[styles.statSubText, { color: theme.tertiaryText }]}>
              {stats.totalFocusSessions} Sessions
            </Text>
          </View>
        </View>

        {/* Edit account settings */}
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            router.push("/edit-profile");
          }}
          activeOpacity={0.7}
          style={[
            styles.editBtn,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <User size={18} color={theme.accent} />
          <Text style={[styles.editBtnText, { color: theme.accent }]}>
            Edit Profile Details
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  settingsBtn: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 16,
  },
  details: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  handle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  statTile: {
    width: (Dimensions.get("window").width - 52) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
  },
  statSubText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  buttonStack: {
    gap: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
