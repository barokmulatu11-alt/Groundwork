import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/connect/useProfile';
import { useXP } from '@/hooks/connect/useXP';
import { useFriends } from '@/hooks/connect/useFriends';
import { useProfileStats } from '@/hooks/connect/useProfileStats';
import { useFocusEffect, useRouter } from 'expo-router';
import { Edit3, Check, Trophy, Users, Flame, ArrowRight, Shield, Award } from 'lucide-react-native';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import { hapticSelection } from '@/lib/haptics';

interface ProfileScreenProps {
  onSwitchToFriendsTab?: () => void;
  onSwitchToAchievementsTab?: () => void;
}

export default function ProfileScreen({
  onSwitchToFriendsTab,
  onSwitchToAchievementsTab,
}: ProfileScreenProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { session, profile: authProfile } = useAuthStore();
  const isAuthenticated = Boolean(session?.user);

  const {
    profile,
    levelTitle,
    followersCount,
    followingCount,
    unlockedAchievements,
    socialLinks,
    refresh: refreshProfile,
  } = useProfile();

  const {
    xp,
    level,
    progress,
    refresh: refreshXP,
  } = useXP();

  const { friends, refresh: refreshFriends } = useFriends();
  const { stats, refresh: refreshStats } = useProfileStats();

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshProfile();
        refreshXP();
        refreshFriends();
        refreshStats();
      }
    }, [isAuthenticated, refreshProfile, refreshXP, refreshFriends, refreshStats])
  );

  const handleRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await Promise.all([
      refreshProfile(),
      refreshXP(),
      refreshFriends(),
      refreshStats(),
    ]);
    setRefreshing(false);
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // ─── Signed-Out Honest Invitation ──────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.signedOutContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.signedOutTitle}>Your Groundwork profile.</Text>
        <Text style={styles.signedOutSub}>
          Sign in or create an account to track your milestones, build streaks, and connect with your circle.
        </Text>

        <View style={styles.signedOutBtnCol}>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={styles.signInPrimaryBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.signInPrimaryBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/signup')}
            style={styles.signUpSecondaryBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            <Text style={styles.signUpSecondaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signedOutFeatures}>
          <View style={styles.featureItem}>
            <Trophy size={20} color={theme.accent} strokeWidth={2} />
            <View style={styles.featureItemTextCol}>
              <Text style={styles.featureItemTitle}>Real Milestones</Text>
              <Text style={styles.featureItemDesc}>
                Earn XP for consistent habits and completed work.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Users size={20} color={theme.accent} strokeWidth={2} />
            <View style={styles.featureItemTextCol}>
              <Text style={styles.featureItemTitle}>Connected Circle</Text>
              <Text style={styles.featureItemDesc}>
                Find friends and follow each other&rsquo;s journey.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Flame size={20} color={theme.accent} strokeWidth={2} />
            <View style={styles.featureItemTextCol}>
              <Text style={styles.featureItemTitle}>Personal Momentum</Text>
              <Text style={styles.featureItemDesc}>
                Build daily streaks with clean, distractions-free focus.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ─── Signed-In Real Profile ────────────────────────────────────────────────
  const username = authProfile?.username || profile?.username || session?.user?.email?.split('@')[0] || 'User';
  const fullName = authProfile?.full_name || (profile as any)?.full_name || username;
  const bio = authProfile?.bio || profile?.bio || 'No bio added yet.';
  const avatarUrl = resolveAvatarUrl(authProfile?.avatar_url || profile?.avatar_url);

  const joinDate = profile?.joined_at || session?.user?.created_at
    ? new Date(profile?.joined_at || session?.user?.created_at!).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const filteredAchievements = React.useMemo(() => {
    return unlockedAchievements.filter((ach) => {
      const cat = (ach.category || '').toLowerCase();
      if (cat === 'notes' || cat === 'study' || cat === 'pro') return false;
      if (
        ach.key.includes('note') ||
        ach.key.includes('revision') ||
        ach.key.includes('formula') ||
        ach.key.includes('folder') ||
        ach.key.includes('tag')
      ) {
        return false;
      }
      return true;
    });
  }, [unlockedAchievements]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.accent}
          colors={[theme.accent]}
        />
      }
    >
      {/* ── User Header ────────────────────────────────────────────────────── */}
      <View style={styles.profileHeaderBlock}>
        <View style={styles.avatarRow}>
          <View style={styles.profileAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} />
            ) : (
              <Text style={styles.profileAvatarInitial}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={styles.editProfileBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Edit3 size={15} color={theme.primaryText} strokeWidth={2} />
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.profileFullName}>{fullName}</Text>
        <Text style={styles.profileHandle}>@{username}</Text>

        <Text style={styles.profileBio}>{bio}</Text>

        {joinDate && (
          <Text style={styles.joinDateText}>Member since {joinDate}</Text>
        )}
      </View>

      {/* ── Real Stats Row ─────────────────────────────────────────────────── */}
      <View style={styles.statsCardGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{level || 1}</Text>
          <Text style={styles.statLabel}>LEVEL</Text>
          <Text style={styles.statSub}>{levelTitle || 'Learner'}</Text>
        </View>

        <View style={styles.statCell}>
          <Text style={styles.statValue}>{(xp || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>TOTAL XP</Text>
          <Text style={styles.statSub}>Level progress {progress}%</Text>
        </View>

        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats?.longestStreak || 0}d</Text>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={styles.statSub}>Best consistency</Text>
        </View>

        <View style={styles.statCell}>
          <Text style={styles.statValue}>{friends.length}</Text>
          <Text style={styles.statLabel}>CIRCLE</Text>
          <Text style={styles.statSub}>Connections</Text>
        </View>
      </View>

      {/* ── Milestones Showcase ────────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionIndex}>01</Text>
          <Text style={styles.sectionTitle}>ACHIEVEMENTS EARNED</Text>
        </View>

        {onSwitchToAchievementsTab && (
          <TouchableOpacity
            onPress={onSwitchToAchievementsTab}
            style={styles.sectionActionLink}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionActionText}>View all →</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredAchievements.length === 0 ? (
        <View style={styles.emptySectionBox}>
          <Text style={styles.emptySectionTitle}>No milestones earned yet.</Text>
          <Text style={styles.emptySectionSub}>
            Complete tasks, build daily habits, and add friends to earn your first milestone.
          </Text>
        </View>
      ) : (
        <View style={styles.achievementsList}>
          {filteredAchievements.slice(0, 5).map((ach) => (
            <View key={ach.key} style={styles.achievementRow}>
              <View style={styles.achIconCircle}>
                <Award size={18} color={theme.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.achTextCol}>
                <Text style={styles.achName}>{ach.name}</Text>
                <Text style={styles.achDesc}>{ach.description}</Text>
              </View>
              <View style={styles.achXpBadge}>
                <Text style={styles.achXpText}>+{ach.xpReward} XP</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Circle & Social Network ────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionIndex}>02</Text>
          <Text style={styles.sectionTitle}>YOUR CIRCLE</Text>
        </View>

        {onSwitchToFriendsTab && (
          <TouchableOpacity
            onPress={onSwitchToFriendsTab}
            style={styles.sectionActionLink}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionActionText}>Manage →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.networkCard}>
        <View style={styles.networkStatsRow}>
          <View style={styles.networkStatCol}>
            <Text style={styles.networkStatNum}>{friends.length}</Text>
            <Text style={styles.networkStatLabel}>Connections</Text>
          </View>
          <View style={styles.networkDivider} />
          <View style={styles.networkStatCol}>
            <Text style={styles.networkStatNum}>{followersCount || friends.length}</Text>
            <Text style={styles.networkStatLabel}>Followers</Text>
          </View>
          <View style={styles.networkDivider} />
          <View style={styles.networkStatCol}>
            <Text style={styles.networkStatNum}>{followingCount || friends.length}</Text>
            <Text style={styles.networkStatLabel}>Following</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 150, // Space above bottom navigation bar
    },

    // Signed Out State
    signedOutContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 150,
    },
    signedOutTitle: {
      fontSize: 38,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.8,
      lineHeight: 44,
      marginBottom: 10,
    },
    signedOutSub: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 24,
      marginBottom: 32,
    },
    signedOutBtnCol: {
      gap: 12,
      marginBottom: 40,
    },
    signInPrimaryBtn: {
      height: 50,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInPrimaryBtnText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    signUpSecondaryBtn: {
      height: 50,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    signUpSecondaryBtnText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
    },
    signedOutFeatures: {
      borderTopWidth: 1,
      borderTopColor: theme.separator,
      paddingTop: 28,
      gap: 22,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    featureItemTextCol: {
      flex: 1,
    },
    featureItemTitle: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
      marginBottom: 3,
    },
    featureItemDesc: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 20,
    },

    // Signed In Profile Header
    profileHeaderBlock: {
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.separator,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    profileAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.cardSolid,
      borderWidth: 1.5,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    profileAvatarImg: {
      width: '100%',
      height: '100%',
    },
    profileAvatarInitial: {
      fontSize: 28,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    editProfileBtnText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
    },
    profileFullName: {
      fontSize: 28,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.5,
      marginBottom: 3,
    },
    profileHandle: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 14,
    },
    profileBio: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.primaryText,
      lineHeight: 22,
      marginBottom: 12,
    },
    joinDateText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },

    // Stats Grid
    statsCardGrid: {
      flexDirection: 'row',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      paddingVertical: 14,
      marginBottom: 32,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.2,
      color: theme.secondaryText,
      marginBottom: 2,
    },
    statSub: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      textAlign: 'center',
    },

    // Sections
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sectionTitleGroup: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    sectionIndex: {
      fontSize: 18,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.accent,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'PlayfairDisplay_600SemiBold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
    },
    sectionActionLink: {
      paddingVertical: 2,
    },
    sectionActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Empty section
    emptySectionBox: {
      paddingVertical: 18,
      paddingHorizontal: 4,
      marginBottom: 28,
    },
    emptySectionTitle: {
      fontSize: 18,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 6,
    },
    emptySectionSub: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 20,
    },

    // Achievements list
    achievementsList: {
      width: '100%',
      marginBottom: 32,
    },
    achievementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    achIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    achTextCol: {
      flex: 1,
      paddingRight: 10,
    },
    achName: {
      fontSize: 15,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    achDesc: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    achXpBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.accentLight,
    },
    achXpText: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },

    // Network Card
    networkCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    networkStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    networkStatCol: {
      alignItems: 'center',
      flex: 1,
    },
    networkStatNum: {
      fontSize: 22,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    networkStatLabel: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    networkDivider: {
      width: 1,
      height: 28,
      backgroundColor: theme.separator,
    },
  });
}
